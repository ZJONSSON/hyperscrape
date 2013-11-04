var hyperquest = require("hyperquest"),
    cheerio = require("cheerio"),
    streamz = require("streamz");

function clone(d,e) {
  e = e || {};
  e.__proto__ = d;
  return e;
}

module.exports = clone;

module.exports = function(concurrent,opt) {
  return streamz(function(url,callback) {
    var self = this,
        buffer = "",
        res;

    if (url.url) res = (opt && opt.clone) ? clone(url) : url;
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

    hyperquest(res.url,opt)
      .on('error',function(e) { self.emit('error',e); })
      .pipe(bufferStream);
      
  },concurrent);
};