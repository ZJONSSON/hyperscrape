var hyperquest = require("hyperquest"),
    cheerio = require("cheerio"),
    streamz = require("streamz");

function clone(d,e) {
  function C() {}
  C.prototype = d;
  return new C();
}

module.exports = clone;

module.exports = function(concurrent,opt) {
  return streamz(function(url,callback) {
    var self = this,
        buffer = "",
        res;

    if (url.url) res = clone(url);
    else res = {url:url};

    var bufferStream = streamz(function(d,cb) {
      buffer +=d;
      cb();
    })
    .on("finish",callback);

    bufferStream._flush = function(cb) {
      res.body = buffer;
      res.$ = cheerio.load(buffer);
      self.push(res);
      cb();
    };

    hyperquest(url.url,opt)
      .on('error',function(e) { self.emit('error',e); })
      .pipe(bufferStream);
      
  },concurrent);
};