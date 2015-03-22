var mustache = require('mustache');
var template = `
<html>
<body>
{{#posts}}
  <h2><a href="{{path}}">{{title}}</a></h2>
  <p>{{content}}</h2>
{{/posts}}
</body>
</html>
`

module.exports = function(posts) {
  return mustache.render(template, {posts: posts});
};
