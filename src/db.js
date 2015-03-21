var pouch = require('pouchdb');

var db = new pouch('blg');

[{
  _id: '_design/posts',
  views: {
    by_time: {
      map: ( function(doc) {
        if (doc.type !== 'post') return;
        emit(doc.created_at);
      }).toString()
    },
    unpublished: {
      map: ( function(doc) {
        if (doc.type !== 'post') return;
        if (doc.published) return;
        emit(doc.id);
      }).toString()
    }
  }
}].forEach(function(doc) {
  db.put(doc);
});

module.exports = db;
