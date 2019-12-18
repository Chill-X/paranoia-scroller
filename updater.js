const axios = require('axios');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

require('dotenv').config();

var admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://paranoia-scroller.firebaseio.com'
});

function scrapeData() {
  listUrl = 'http://bemaniwiki.com/index.php?DanceDanceRevolution%20A20/%B5%EC%B6%CA%A5%EA%A5%B9%A5%C8';
  newListUrl = 'http://bemaniwiki.com/index.php?DanceDanceRevolution%20A20/%BF%B7%B6%CA%A5%EA%A5%B9%A5%C8';
  mainPageUrl = 'https://zenius-i-vanisher.com/v5.2/simfiles.php?category=simfiles';
  categoryPageUrl = 'https://zenius-i-vanisher.com/v5.2/viewsimfilecategory.php?categoryid=';
  songPageUrl = 'https://zenius-i-vanisher.com/v5.2/viewsimfile.php?simfileid=';
  newCategoryId = 1170;

  let rows = null;
  let newRows = null;

  // Get full song list and category list
  console.log('Scraping from main page...');
  axios.all([axios.get(listUrl), axios.get(newListUrl), axios.get(mainPageUrl)])
    .then(axios.spread((list, newList, mainPage) => {
      // full song listing from bemaniwiki
      const dom = new JSDOM(list.data);
      rows = dom.window.document
        .getElementsByClassName('style_table')[1]
        .querySelector('tbody')
        .getElementsByTagName('tr');
      // if titles require extraction for comparison do here

      // new song listing from bemaniwiki
      const newDom = new JSDOM(newList.data);
      newRows = newDom.window.document
        .querySelector('.style_table')
        .querySelector('tbody')
        .getElementsByTagName('tr');
      
      // main page with category listing from ZiV 
      // ADD CURRENT CATEGORY ID
      const mainDom = new JSDOM(mainPage.data);
      let options = mainDom.window.document
        .getElementsByTagName('tr')[1]
        .getElementsByTagName('option');
      getCategoryPages = [];
      for (let i = 1; i < options.length; i++) {
        let categoryId = options[i].getAttribute('value');
        getCategoryPages.push(axios.get(categoryPageUrl + categoryId));
      }
      // A20 category page
      getCategoryPages.push(axios.get(categoryPageUrl + newCategoryId));

      console.log('Scraping from category page...');
      return axios.all(getCategoryPages);
    }))
    .then(categoryPages => {
      
      let songPageBatches = [];
      for (let i = 0; i < categoryPages.length; i++) {
        let songPages = [];
        // song listing from ZiV
        const categoryDom = new JSDOM(categoryPages[i].data);
        // check for empty category
        let smCount = categoryDom.window.document
          .querySelector('th')
          .innerHTML
          .substring(0, 1);
        if (smCount > 0) {
          // song listing from ZiV
          let categoryRows = categoryDom.window.document
            .querySelector('table')
            .getElementsByTagName('tr');
          for (let j = 2; j < categoryRows.length; j++) {
            let songId = categoryRows[j]
              .querySelector('a')
              .getAttribute('name')
              .substring(3);
            songPages.push(songPageUrl + songId);
          }
        }
        songPageBatches.push(songPages);
      }

      // get song pages
      console.log('Scraping from song page...');
      // console.log(songPageBatches);
      // TRY REDUCE
      // return axios.all(getSongPages);
      songPageBatches.reduce((acc, batch) => {
        return acc.then(() => {
          let getSongPages = [];
          for (let i = 0; i < batch.length; i++) {
            getSongPages.push(axios.get(batch[i]));
          }
          return axios.all(getSongPages);
        }).then(songPages => {
          console.log(songPages);
        })
      }, Promise.resolve());
    })
    .catch (error => {
      console.log(error);
    });
}

// To upload to database:
// {
//   songId: 12345,
//   title: abcde,
//   categoryId: 67890,
//   series: DanceDanceRevolution ABC
//   artist: fghij,
//   min_bpm: 123,
//   max_bpm: 456,
//   single_beginner...
//   ...double_challenge 
// }

module.exports = scrapeData;