// V311 MemoryRetrieval: Top-K recall + multi-channel fusion
'use strict';
(function () {
  function MemoryRetrieval(options) {
    this.k = (options && options.k) || 10;
    this.minScore = (options && options.minScore) != null ? options.minScore : 0.01;
    this.weights = (options && options.weights) || { lexical: 0.5, semantic: 0.4, temporal: 0.1 };
    this.history = [];
  }
  MemoryRetrieval.prototype._score = function (query, doc) {
    var qTokens = String(query || '').toLowerCase().split(/\W+/).filter(function (x) { return x.length > 0; });
    var dTokens = String(doc && doc.content || '').toLowerCase().split(/\W+/).filter(function (x) { return x.length > 0; });
    if (dTokens.length === 0) return 0;
    var match = 0;
    for (var i = 0; i < qTokens.length; i++) if (dTokens.indexOf(qTokens[i]) !== -1) match++;
    return match / Math.max(qTokens.length, 1);
  };
  MemoryRetrieval.prototype.retrieve = function (query, docs) {
    if (!Array.isArray(docs)) return [];
    var scored = [];
    for (var i = 0; i < docs.length; i++) {
      var s = this._score(query, docs[i]);
      if (s >= this.minScore) scored.push({ doc: docs[i], score: s });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    var out = scored.slice(0, this.k);
    this.history.push({ at: Date.now(), query: query, returned: out.length });
    return out;
  };
  MemoryRetrieval.prototype.fuse = function (results) {
    var merged = {};
    for (var ch in results) {
      if (Object.prototype.hasOwnProperty.call(results, ch)) {
        var w = this.weights[ch] || 0.33;
        for (var i = 0; i < results[ch].length; i++) {
          var r = results[ch][i];
          var k = r.doc.id || (r.doc.content && r.doc.content.substring(0, 20));
          if (!merged[k]) merged[k] = { doc: r.doc, score: 0 };
          merged[k].score += r.score * w;
        }
      }
    }
    var arr = [];
    for (var k2 in merged) if (Object.prototype.hasOwnProperty.call(merged, k2)) arr.push(merged[k2]);
    arr.sort(function (a, b) { return b.score - a.score; });
    return arr.slice(0, this.k);
  };
  MemoryRetrieval.prototype.getStats = function () {
    return { k: this.k, queries: this.history.length, minScore: this.minScore };
  };
  window.MemoryRetrieval = MemoryRetrieval;
})();
