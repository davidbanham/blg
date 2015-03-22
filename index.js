var _ = require('lodash');
var db = require('./src/db.js');
var upload = null;

window.db = db;

var barf = function(err) {
  if (!err) return;
  alert(err);
  throw(err);
};

db.get('s3_credentials', function(err, doc) {
  if (err && err.status != 404) {
    barf(err);
  };
  var doc = doc || {_id: 's3_credentials'};
  ['key', 'bucket', 'secret'].forEach(function(prop) {
    if (!doc[prop]) {
      var input = prompt('Please enter your S3 ' + prop);
      doc[prop] = input;
    }
  });
  upload = require('./src/uploader.js')(doc.key, doc.secret, doc.bucket);
  db.post(doc, barf);
});

db.query('posts/by_time', {
  include_docs: true,
  descending: true
}, function(err, res) {
  barf(err);
  res.rows.forEach(function(post) {
    var container = document.createElement('div');

    [{prop: 'title', elem: 'h2'}, {prop: 'content', elem: 'p'}].forEach(function(item) {
      var cur = document.createElement(item.elem);
      cur.textContent = post.doc[item.prop];
      container.appendChild(cur);
    });

    document.getElementById('old_posts').appendChild(container);
  });
});

window.post_from_dom = function() {
  var title_node = document.getElementById('new_post_title');
  var content_node = document.getElementById('new_post');

  var new_title = title_node.textContent;
  var new_content = content_node.textContent;

  var new_post = create_post(new_title, new_content);

  save_and_publish(new_post, function(err) {
    barf(err);
    title_node.textContent = '';
    content_node.textContent = '';
  });
};

var create_post = function(title, content) {
  var now = new Date().toISOString();
  return {
    created_at: now,
    updated_at: now,
    title: title,
    content: content,
    type: 'post'
  };
};

var save_and_publish = function(doc, cb) {
  db.post(doc, function(err, stub) {
    barf(err);
    doc._id = stub.id
    doc._rev = stub.rev
    upload([doc], function(errs, docs) {
      barf(errs[0]);
      var marked_doc = marker(errs, docs)[0];
      db.post(marked_doc, cb);
    });
  });
};

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
