// ============================================================================
// Distributed Memory Vault — V309 Direction F Round 2 Iter 1/30
// MemoryEncoder: 文本/向量/结构化多模编码层
// 来源：thunderbolt PowerSync 序列化协议
// ============================================================================
'use strict';

(function () {

  var ENCODING = {
    PLAIN: 'plain',       // 原文
    BASE64: 'base64',     // 二进制→字符串
    HASH: 'hash',         // 内容哈希
    VECTOR: 'vector',     // 特征向量
    STRUCTURED: 'structured' // JSON 结构化
  };

  // Simple deterministic hash (djb2)
  function djb2(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
    return (h & 0x7fffffff).toString(36);
  }

  // Simple word-frequency vector (bag of words)
  function vectorize(text, dim) {
    dim = dim || 16;
    var v = new Array(dim);
    for (var i = 0; i < dim; i++) v[i] = 0;
    if (!text) return v;
    var words = String(text).toLowerCase().split(/\W+/).filter(function (w) { return w.length > 0; });
    for (var j = 0; j < words.length; j++) {
      var idx = djb2(words[j]);
      v[parseInt(idx, 36) % dim] += 1;
    }
    // normalize
    var norm = 0;
    for (var k = 0; k < dim; k++) norm += v[k] * v[k];
    norm = Math.sqrt(norm);
    if (norm > 0) for (var m = 0; m < dim; m++) v[m] = v[m] / norm;
    return v;
  }

  // Cosine similarity between two equal-length vectors
  function cosineSim(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    var dot = 0, na = 0, nb = 0;
    for (var i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  function MemoryEncoder(options) {
    this.dim = (options && options.dim) || 16;
    this.encodings = []; // history
  }

  MemoryEncoder.prototype.encode = function (content, mode) {
    if (content == null) return { encoding: ENCODING.PLAIN, value: '', length: 0 };
    var m = mode || ENCODING.PLAIN;
    var result;
    if (m === ENCODING.BASE64) {
      var s = String(content);
      if (typeof btoa !== 'undefined') {
        result = btoa(unescape(encodeURIComponent(s)));
      } else {
        result = Buffer.from(s, 'utf8').toString('base64');
      }
    } else if (m === ENCODING.HASH) {
      result = djb2(String(content));
    } else if (m === ENCODING.VECTOR) {
      result = vectorize(String(content), this.dim);
    } else if (m === ENCODING.STRUCTURED) {
      if (typeof content === 'object') {
        result = JSON.stringify(content);
      } else {
        result = JSON.stringify({ value: String(content) });
      }
    } else {
      result = String(content);
    }
    var entry = { encoding: m, value: result, length: typeof result === 'string' ? result.length : result.length, at: Date.now() };
    this.encodings.push(entry);
    if (this.encodings.length > 500) this.encodings = this.encodings.slice(-500);
    return entry;
  };

  MemoryEncoder.prototype.similarity = function (a, b) {
    var va = (typeof a === 'string') ? vectorize(a, this.dim) : a;
    var vb = (typeof b === 'string') ? vectorize(b, this.dim) : b;
    return cosineSim(va, vb);
  };

  MemoryEncoder.prototype.getStats = function () {
    var byMode = {};
    for (var i = 0; i < this.encodings.length; i++) {
      var m = this.encodings[i].encoding;
      byMode[m] = (byMode[m] || 0) + 1;
    }
    return { total: this.encodings.length, byMode: byMode, dim: this.dim };
  };

  // Exports
  window.MemoryEncoder = MemoryEncoder;
  window.ENCODING = ENCODING;

})();
