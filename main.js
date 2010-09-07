/*
  proxy with pooling

  Copyright (c) 2010 Mikeal Rogers

  Permission is hereby granted, free of charge, to any person obtaining
  a copy of this software and associated documentation files (the
  "Software"), to deal in the Software without restriction, including
  without limitation the rights to use, copy, modify, merge, publish,
  distribute, sublicense, and/or sell copies of the Software, and to
  permit persons to whom the Software is furnished to do so, subject to
  the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
  LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
  WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/
 
var sys = require('sys')
  , http = require('http')
  , pool = require('pool')
  , events = require('events')
  , min = 0
  , max = 100
  ;

exports.createProxy = function (l) {
  var manager = pool.createPoolManager();
  manager.setMinClients(min);
  manager.setMaxClients(max);
  var server = http.createServer( function (req, res) {
    var buffers = []
      , b = function (chunk) {buffers.push(chunk)}
      , e = function () {e = false}
      ;
    
    req.on('data', b);
    req.on('end', e);
    
    server.emit('route', req, function (port, hostname) {
      var p = manager.getPool(port, hostname);    

      p.request(req.method, req.url, req.headers, function (reverse_proxy) {

        reverse_proxy.on('error', function (err) {
          res.writeHead(500, {'Content-Type': 'text/plain'});

          if (req.method !== 'HEAD') {
            res.write(sys.inspect(err))
          }

          res.end();
        });

        buffers.forEach(function (c) {reverse_proxy.write(c)});
        buffers = null; 
        req.removeListener('data', b)
        sys.pump(req, reverse_proxy)
        
        if (e) {
          req.removeListener('end', e); 
          req.addListener('end', function () {reverse_proxy.end()})
        } else {
          reverse_proxy.end()
        }

        reverse_proxy.addListener('response', function (response) {
          if (response.headers.connection) {
            if (req.headers.connection) response.headers.connection = req.headers.connection
            else response.headers.connection = 'close'
          }
          res.writeHead(response.statusCode, response.headers);
          sys.pump(response, res);
        });
      })

    });
  })
  if (l) server.on('route', l);
  return server;
};

if (require.main === module) {
  var url = require('url');
  var proxy = exports.createProxy();
  // proxy.on('route', function (req, callback) {
  //   var uri = url.parse(req.url);
  //   sys.puts(sys.inspect(uri))
  //   callback(uri.port ? uri.port : 80, uri.hostname);
  // })
  proxy.on('route', function (req, cb) {
    cb(80, 'www.google.com')
  })
  proxy.listen(8000)
}
