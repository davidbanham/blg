var AWS = require('aws-sdk');

module.exports = function(key, secret, bucket) {
  AWS.config.accessKeyId = key;
  AWS.config.secretAccessKey = secret;
  var s3 = new AWS.S3({params: {Bucket: bucket}});

  var upload = function(doc, onupdate, cb) {
    var managedUpload = s3.upload({Body: doc.rendered || doc.content, Key: doc.path, ContentType: 'text/html'}, cb);

    managedUpload.on('httpUploadProgress', function(progress) {
      onupdate(doc.title, progress.loaded / progress.total);
    });
  };

  return function(docs, onupdate, cb) {
    var errs = [];
    docs.forEach(function(doc) {
      upload(doc, onupdate, function(err) {
        errs.push(err);
        if (errs.length === docs.length) {
          cb(errs, docs);
        };
      });
    });
  };
};
