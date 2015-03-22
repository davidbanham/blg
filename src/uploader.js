var AWS = require('aws-sdk');

var SUBFOLDER = 'articles/'

module.exports = function(key, secret, bucket) {
  AWS.config.accessKeyId = key;
  AWS.config.secretAccessKey = secret;
  var s3 = new AWS.S3({params: {Bucket: bucket}});

  var upload = function(doc, cb) {
    s3.upload({Body: doc.content, Key: SUBFOLDER + doc.title + '.html', ContentType: 'text/html'}, cb);
  };

  return function(docs, cb) {
    var errs = [];
    docs.forEach(function(doc) {
      upload(doc, function(err) {
        errs.push(err);
        if (errs.length === docs.length) {
          cb(errs, docs);
        };
      });
    });
  };
};
