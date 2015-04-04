var db = require('./db.js');
var _ = require('lodash');
var marked = require('marked');
var indexer = require('./indexer.js');
var post_renderer = require('./post_renderer.js');

marked.setOptions({
  sanitize: false
});

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

var markup = function(posts) {
  return posts.map(function(post) {
    post.content = post.content.replace(/<br>/g, '\n');
    post.content = marked(post.content);
    return post;
  });
};

var upload;

var publish = function(num, cb) {
  all_posts(function(err, posts) {
    if (err) return cb(err);
    posts = markup(posts);
    compile_index(posts, function(err, index_doc) {
      posts = historian(posts);
      posts = render_posts(posts);
      posts.unshift(index_doc);
      if (num) num = num + 2;
      upload(posts.slice(0, num), onupdate, cb);
    });
  });
};

var historian = function(docs) {
  return docs.map(function(doc, i, arr) {
    var next = arr[i - 1];
    var previous = arr[i + 1];
    if (next) doc.next = next;
    if (previous) doc.previous = previous;
    return doc;
  });
};

var render_posts = function(docs) {
  return docs.map(function(doc) {
    doc.rendered = post_renderer(doc);
    return doc;
  });
};

var onupdate = null;
module.exports = function(local_onupdate) {
  onupdate = local_onupdate;
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
      all_posts(function(err, docs) {
        if (err) return cb(err);
        publish(undefined, barf);
      });
    },
    save_and_publish: function(doc, cb) {
      db.post(doc, function(err, stub) {
        if (err) return cb(err);
        doc._id = stub.id
        doc._rev = stub.rev
        publish(1, cb);
      });
    },
    historian: historian,
    compile_index: compile_index,
    markup: markup
  };
};
