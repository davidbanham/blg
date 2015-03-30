var _ = require('lodash');
var db = require('./src/db.js');
var util = require('./src/util.js')();
var indexer = require('./src/indexer.js');
var upload = null;

window.db = db;

var gen_index = function(cb) {
  util.all_posts(function(err, posts) {
    if (err) return cb(err);
    util.compile_index(posts, function(err, index_doc) {
      if (err) return cb(err);
      var index_content = indexer(posts);
      return cb(null, {title: 'index', content: index_content, path: 'index.html'});
    });
  });
};

var show_past_blogs = function() {
  gen_index(function(err, index_doc) {
    util.barf(err);
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

  var new_post = util.create_post(new_title, new_content);

  util.save_and_publish(new_post, function(err) {
    util.barf(err);
    title_node.textContent = 'Title';
    content_node.textContent = 'New Post';
    show_past_blogs();
  });
};

window.publish_all = util.publish_all;
