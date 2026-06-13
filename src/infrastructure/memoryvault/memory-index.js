// V312 MemoryIndex: 倒排索引 + 正排索引
'use strict';
(function () {
  function MemoryIndex() {
    this.inverted = {};
    this.forward = {};
    this.docs = {};
    this.builds = 0;
  }
  MemoryIndex.prototype.add = function (doc) {
    if (!doc || !doc.id) return false;
    this.docs[doc.id] = doc;
    var terms = String(doc.content || '').toLowerCase().split(/\W+/).filter(function (x) { return x.length > 0; });
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      if (!this.inverted[t]) this.inverted[t] = {};
      this.inverted[t][doc.id] = true;
      if (!this.forward[doc.id]) this.forward[doc.id] = {};
      this.forward[doc.id][t] = true;
    }
    return true;
  };
  MemoryIndex.prototype.remove = function (docId) {
    if (!this.docs[docId]) return false;
    var terms = this.forward[docId] || {};
    for (var t in terms) if (this.inverted[t]) delete this.inverted[t][docId];
    delete this.forward[docId];
    delete this.docs[docId];
    return true;
  };
  MemoryIndex.prototype.query = function (term) {
    var ids = this.inverted[term] || {};
    var out = [];
    for (var id in ids) if (Object.prototype.hasOwnProperty.call(ids, id)) out.push(this.docs[id]);
    return out;
  };
  MemoryIndex.prototype.queryAll = function (terms) {
    if (!Array.isArray(terms)) return [];
    var scores = {};
    for (var i = 0; i < terms.length; i++) {
      var hits = this.inverted[terms[i]] || {};
      for (var id in hits) scores[id] = (scores[id] || 0) + 1;
    }
    var arr = [];
    for (var id2 in scores) arr.push({ doc: this.docs[id2], score: scores[id2] });
    arr.sort(function (a, b) { return b.score - a.score; });
    return arr;
  };
  MemoryIndex.prototype.getDoc = function (id) { return this.docs[id] || null; };
  MemoryIndex.prototype.build = function () { this.builds++; return Object.keys(this.docs).length; };
  MemoryIndex.prototype.getStats = function () {
    return { docs: Object.keys(this.docs).length, terms: Object.keys(this.inverted).length, builds: this.builds };
  };
  window.MemoryIndex = MemoryIndex;
})();
