var pouch = require('pouchdb');
var semver = require('semver');
var _ = require('lodash');

var barf = function(err) {
  if (!_.compact(_.flatten([err])).length) return;
  alert(err);
  throw(err);
};

var db = new pouch('blg');

[{
  _id: '_design/posts',
  version: '1.1.0',
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
    },
    all: {
      map: ( function(doc) {
        if (doc.type === 'post') emit(doc.id);
      }).toString()
    }
  }
}].forEach(function(doc) {
  var putDoc = function (doc, existing) {
    doc._rev = existing._rev;
    db.put(doc);
  };
  db.get(doc._id, function(err, existing) {
    barf(err);
    console.log('existing', existing);
    if (!existing || !existing.version) return putDoc(doc, existing);

    var existing_major = parseInt(existing.version.split('.')[0]);
    var new_major = parseInt(doc.version.split('.')[0]);

    if (existing_major > new_major) barf(new Error('Database is a newer incompatible version than your local application. Try reloading the page'));

    if (semver.gt(doc.version, existing.version)) {
      doc._rev = existing._rev;
      putDoc(doc, existing);
    };
  });
});

module.exports = db;
