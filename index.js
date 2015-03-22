var _ = require('lodash');
var db = require('./src/db.js');
var indexer = require('./src/indexer.js');
var upload = null;

window.db = db;

var barf = function(err) {
  if (!_.compact(_.flatten([err])).length) return;
  alert(err);
  throw(err);
};

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
  upload = require('./src/uploader.js')(doc.key, doc.secret, doc.bucket);
  db.post(doc, barf);
});

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

var gen_index = function(cb) {
  all_posts(function(err, posts) {
    if (err) return cb(err);
    var index_content = indexer(posts);
    return cb(null, {title: 'index', content: index_content, path: 'index.html'});
  });
};

var show_past_blogs = function() {
  gen_index(function(err, index_doc) {
    barf(err);
    var posts_container = document.getElementById('old_posts');
    posts_container.contentDocument.write(index_doc.content);
    posts_container.contentDocument.close();
  });
};

show_past_blogs();

window.post_from_dom = function() {
  var title_node = document.getElementById('new_post_title');
  var content_node = document.getElementById('new_post');

  var new_title = title_node.textContent;
  var new_content = content_node.textContent;

  var new_post = create_post(new_title, new_content);

  save_and_publish(new_post, function(err) {
    barf(err);
    title_node.textContent = 'Title';
    content_node.textContent = 'New Post';
    show_past_blogs();
  });
};

var create_post = function(title, content) {
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
};

var save_and_publish = function(doc, cb) {
  db.post(doc, function(err, stub) {
    barf(err);
    doc._id = stub.id
    doc._rev = stub.rev
    gen_index(function(err, index_doc) {
      barf(err);
      upload([doc, index_doc], function(errs, docs) {
        barf(errs);
        var marked_doc = marker(errs, docs)[0];
        db.post(marked_doc, cb);
      });
    });
  });
};

var publish_all = function(cb) {
  all_posts(function(err, docs) {
    barf(err);
    gen_index(function(err, index_doc) {
      docs.push(index_doc);
      upload(docs, function(errs, docs) {
        barf(errs);
      });
    });
  });
};

window.publish_all = publish_all;

var marker = function(errs, docs) {
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
};

var saver = function(docs) {
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
};
