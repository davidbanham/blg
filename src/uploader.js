var AWS = require('aws-sdk');
var mimetype = require('mimetype');
var path = require('path');
var url = require('url');

module.exports = function(key, secret, bucket) {
  AWS.config.accessKeyId = key;
  AWS.config.secretAccessKey = secret;
  var s3 = new AWS.S3({params: {Bucket: bucket}});

  var upload = function(doc, onupdate, cb) {
    var mime = mimetype.lookup(path.basename(doc.path));
    var managedUpload = s3.upload({Body: doc.rendered || doc.content, Key: doc.path, ContentType: mime}, cb);

    managedUpload.on('httpUploadProgress', function(progress) {
      onupdate(doc.title, progress.loaded / progress.total);
    });
  };

  return function(docs, onupdate, cb) {
    var errs = [];
    docs.forEach(function(doc) {
      upload(doc, onupdate, function(err, returned) {
        var sub_path = url.parse(returned.Location).path;
        doc.uri = 'https:/' + sub_path;
        errs.push(err);
        if (errs.length === docs.length) {
          cb(errs, docs);
        };
      });
    });
  };
};
