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
  mainPageUrl = 'https://zenius-i-vanisher.com/v5.2/simfiles.php?category=simfiles';
  categoryPageUrl = 'https://zenius-i-vanisher.com/v5.2/viewsimfilecategory.php?categoryid=';
  songPageUrl = 'https://zenius-i-vanisher.com/v5.2/viewsimfile.php?simfileid=';

  let rows = null;

  // Get full song list and category list
  axios.all([axios.get(listUrl), axios.get(mainPageUrl)])
    .then(axios.spread((list, mainPage) => {
      // full song listing from bemaniwiki
      const dom = new JSDOM(list.data);
      rows = dom.window.document
        .getElementsByClassName('style_table')[1]
        .querySelector('tbody')
        .getElementsByTagName('tr');
      // if titles require extraction for comparison do here

      // main page with category listing from ZiV
      const mainDom = new JSDOM(mainPage.data);
      let options = mainDom.window.document
        .getElementsByTagName('tr')[1]
        .getElementsByTagName('option');
      getCategoryPages = [];
      for (let i = 1; i < options.length; i++) {
        let categoryId = options[i].getAttribute('value');
        getCategoryPages.push(axios.get(categoryPageUrl + categoryId));
      }

      return axios.all(getCategoryPages);
    }))
    .then(categoryPages => {
      
      let getSongPages = [];
      for (let i = 0; i < categoryPages.length; i++) {
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
            getSongPages.push(axios.get(songPageUrl + songId));
          }
        }
      }

      // get song pages
      return axios.all(getSongPages);
    })
    .then(songPages => {
      console.log(songPages);
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