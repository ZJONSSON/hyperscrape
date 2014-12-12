var request = require("request"),
    cheerio = require("cheerio"),
    streamz = require("streamz"),
    zlib = require('zlib'),
    http = require('http');

http.globalAgent.maxSockets = Infinity;

module.exports = function(cap,opt) {
  opt = opt || {};
  opt.cap = cap;

  function process(item,callback) {
    var self = this,
        buffer = "";

    if (typeof item === 'string')
      item = {url : item};

    // Make gzip,deflate a default encoding
    item.headers = item.headers || {};
    item.headers['Accept-Encoding'] = item.headers['Accept-Encoding'] || 'gzip,deflate';

    var bufferStream = streamz(function(d,cb) {
      buffer +=d;
      cb();
    })
    .on("finish",function() {
      setImmediate(callback);
    });

    bufferStream._flush = function(cb) {
      item.response = buffer;
      if (item.cheerio !== false)
        item.$ = cheerio.load(buffer);
      if (opt.transform)
        opt.transform.call(self,item);
      else
        if (item) self.push(item);
      setImmediate(cb);
    };

    request(item)
      .on('response', function (res) {
        if (res.statusCode !== 200) {
          self.emit('warning',{error:res.statusCode,data:item});
          return callback();
        }
        item.responseHeaders = res.headers;
        self.emit('response',res);
        var encoding = res.headers['content-encoding'];
        if (encoding === 'gzip') res = res.pipe(zlib.createGunzip());
        if (encoding == 'deflate') res = res.pipe(zlib.createInflate());
        res.pipe(bufferStream);
      })
      .on('error',function(e) {
        self.emit('warning',{error:e,data:item});
        callback();
      });
  }

  var s = streamz(process,opt);
  if (opt.url) s.write({url:opt.url});
  return s;
};