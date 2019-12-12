var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('songlist');
});

router.get('/:songId', function(req, res, next) {
  res.render('chart', { songId: req.params.songId });
});

module.exports = router;
