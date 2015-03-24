var db = require('./db.js');

var barf = function(err) {
  if (!_.compact(_.flatten([err])).length) return;
  alert(err);
  throw(err);
};

var compile_index = function(posts, cb) {
  var index_content = indexer(posts);
  return cb(null, {title: 'index', content: index_content, path: 'index.html'});
};

var all_posts = function(cb) {
  db.query('posts/by_time', {
    include_docs: true,
    descending: true
  }, function(err, res) {
    if (err) return cb(err);
    var posts = res.rows.map(function(row) {
      return row.doc;
    });
    cb(null, posts);
  });
};

var upload;

var publish = function(docs, cb) {
  all_posts(function(err, posts) {
    if (err) return cb(err);
    compile_index(posts, function(err, index_doc) {
      docs.push(index_doc);
      upload(docs, cb);
    });
  });
};

module.exports = function() {
  db.get('s3_credentials', function(err, doc) {
    if (err && err.status != 404) {
      barf(err);
    };
    var doc = doc || {_id: 's3_credentials'};
    ['key', 'secret', 'bucket'].forEach(function(prop) {
      if (!doc[prop]) {
        var input = prompt('Please enter your S3 ' + prop);
        doc[prop] = input;
      }
    });
    upload = require('./uploader.js')(doc.key, doc.secret, doc.bucket);
    db.post(doc, barf);
  });

  return {
    all_posts: all_posts,
    barf: barf,
    create_post: function(title, content) {
      var now = new Date().toISOString();
      return {
        _id: title,
        created_at: now,
        updated_at: now,
        title: title,
        content: content,
        type: 'post',
        path: 'articles/'+encodeURIComponent(title.replace(/ /g, '_'))+'.html'
      };
    },
    marker: function(errs, docs) {
      var zipped = _.zip(errs, docs);
      return zipped.map(function(pair){
        var err = pair[0];
        var doc = pair[1];

        if (!err) {
          doc.published = true;
          doc.published_at = new Date().toISOString();
        }

        return doc;
      });
    },
    saver: function(docs) {
      var errs = [];
      var returned_docs = [];

      docs.forEach(function(doc) {
        db.post(doc, function(err, doc) {
          errs.push(err);
          returned_docs.push(doc);

          if (errs.length === docs.length) {
            return cb(errs, returned_docs);
          }
        });
      });
    },
    publish_all: function() {
      util.all_posts(function(err, docs) {
        if (err) return cb(err);
        publish(docs, barf);
      });
    },
    save_and_publish: function(doc, cb) {
      db.post(doc, function(err, stub) {
        if (err) return cb(err);
        doc._id = stub.id
        doc._rev = stub.rev
        publish([doc], cb);
      });
    }
  };
};
