var proxypool = require('../main.js')
  , sys = require('sys')
  , http = require('http')
  ;


var s = http.createServer(function (req, res) {
  res.writeHead(200, {'content-type':'text/plain'});
  res.write('ok.');
  res.end();
})

s.listen(8080);

var p = proxypool.createProxy(function (req, cb) {
  cb(8080, 'localhost');
})

p.listen(8000);