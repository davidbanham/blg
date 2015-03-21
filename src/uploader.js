var knox = require('knox');

module.exports = function(key, secret, bucket) {
  var client = knox.createClient({
    key: key,
    secret: secret,
    bucket: bucket
  });

  var upload = function(doc, cb) {
    var req = client.put(doc.title, {'x-amz-acl': 'public-read'});
    req.on('response', function(res) {
      if (res.statusCode === 200) return cb(null);
      return cb(new Error(res.statusCode));
    });
    req.end(doc.content);
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
