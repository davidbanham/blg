var mustache = require('mustache');
var template = `
<html>
<head>
  <style>
    img { width: 100% }
  </style>
</head>
<body>
  <a href="/">Home</a>
  <h2>{{title}}</h2>
  <p>{{{content}}}</p>
  <a href="/{{previous.path}}">{{previous.title}}</a>
  <a href="/{{next.path}}">{{next.title}}</a>
</body>
</html>
`

module.exports = function(post) {
  return mustache.render(template, post);
};
