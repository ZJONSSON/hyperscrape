var request = require("request"),
    cheerio = require("cheerio"),
    streamz = require("streamz"),
    zlib = require('zlib'),
    http = require('http');

http.globalAgent.maxSockets = Infinity;

function clone(d,e) {
  e = e || {};
  e.__proto__ = d;
  return e;
}

module.exports = function(cap,opt) {
  opt = opt || {};
  opt.cap = cap;

  return streamz(function(item,callback) {
    var self = this,
        buffer = "";

    if (item.url && !opt.noClone) item = clone(item);
    else item = {url:item};

    // Hardcode the url just in case it was cloned (request requires this)
    item.url = item.url ;

    // Make gzip,deflate a default encoding
    item.headers = item.headers || {};
    item.headers['Accept-Encoding'] = item.headers['Accept-Encoding'] || 'gzip,deflate';

    var bufferStream = streamz(function(d,cb) {
      buffer +=d;
      cb();
    })
    .on("finish",callback);

    bufferStream._flush = function(cb) {
      item.response = buffer;
      item.$ = cheerio.load(buffer);
      if (opt.transform) {
        opt.transform(item,cb);
      } else {
        self.push(item);
        cb();
      }
    };

    request(item)
      .on('response', function (res) {
        if (res.statusCode !== 200) return self.emit('error',res.statusCode);
        item.responseHeaders = res.headers;
        var encoding = res.headers['content-encoding'];
        if (encoding === 'gzip') res = res.pipe(zlib.createGunzip());
        if (encoding == 'deflate') res = res.pipe(zlib.createInflate());
        res.pipe(bufferStream);
      })
      .on('error',function(e) { self.emit('error',e); });
  },opt);
};