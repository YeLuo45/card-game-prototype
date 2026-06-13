// ============================================================================
// Distributed Memory Vault — V306 Direction F Iteration 7/30
// MemoryCompression: 上下文压缩/摘要（多策略+token预算+层级感知）
// 来源：generic-agent Self-Evolution (L0-L4 摘要) + chatdev Multi-Agent Compression
// ============================================================================
'use strict';

(function () {

  // --------------------------------------------------------------------------
  // COMPRESSION_STRATEGY — supported compression modes
  // --------------------------------------------------------------------------
  var COMPRESSION_STRATEGY = {
    TRUNCATE: 'truncate',         // 头部 N 字符
    HEAD_TAIL: 'head_tail',       // 头 N + 尾 M
    SENTENCE_RANK: 'sentence_rank', // 句子按权重排序保留
    KEYWORD: 'keyword',           // 抽取关键词
    LAYER_AWARE: 'layer_aware'    // 按 layer 重要度分配 token
  };

  // Default char-to-token ratio (rough estimate: 1 token ≈ 4 chars for English)
  var DEFAULT_CHAR_PER_TOKEN = 4;

  // --------------------------------------------------------------------------
  // MemoryCompression — compresses memory contents to fit token budget
  // --------------------------------------------------------------------------
  function MemoryCompression(options) {
    this.strategy = (options && options.strategy) || COMPRESSION_STRATEGY.HEAD_TAIL;
    this.charPerToken = (options && options.charPerToken) || DEFAULT_CHAR_PER_TOKEN;
    this.headRatio = (options && options.headRatio) || 0.6; // 60% head, 40% tail
    this.maxKeywords = (options && options.maxKeywords) || 15;
    this.layerBudget = (options && options.layerBudget) || {
      'L0': 1.0,  // 规则层保留全部
      'L1': 0.8,  // 索引层 80%
      'L2': 0.5,  // 全局层 50%
      'L3': 0.3,  // 技能层 30%
      'L4': 0.2   // 会话层 20%
    };
    this.compressed = []; // history
  }

  // Token-aware char budget
  MemoryCompression.prototype.budgetChars = function (tokenBudget) {
    return Math.max(0, Math.floor((tokenBudget || 0) * this.charPerToken));
  };

  // Layer-aware budget allocation
  MemoryCompression.prototype.budgetForLayer = function (layer, totalTokenBudget) {
    var ratio = this.layerBudget[layer];
    if (ratio == null) ratio = 0.3;
    return Math.floor(totalTokenBudget * ratio);
  };

  // TRUNCATE: first N chars
  MemoryCompression.prototype._truncate = function (content, maxChars) {
    if (typeof content !== 'string') content = String(content == null ? '' : content);
    if (content.length <= maxChars) return content;
    return content.substring(0, maxChars);
  };

  // HEAD_TAIL: head + tail
  MemoryCompression.prototype._headTail = function (content, maxChars) {
    if (typeof content !== 'string') content = String(content == null ? '' : content);
    if (content.length <= maxChars) return content;
    var headSize = Math.floor(maxChars * this.headRatio);
    var tailSize = maxChars - headSize;
    var tail = content.substring(content.length - tailSize);
    return content.substring(0, headSize) + '... ' + tail;
  };

  // SENTENCE_RANK: split by sentence, score by importance proxy (length + keyword density)
  MemoryCompression.prototype._sentenceRank = function (content, maxChars) {
    if (typeof content !== 'string') content = String(content == null ? '' : content);
    if (content.length <= maxChars) return content;
    var sentences = content.split(/(?<=[.!?])\s+/);
    if (sentences.length <= 1) return this._headTail(content, maxChars);
    var ranked = sentences.map(function (s) {
      var wordCount = s.split(/\s+/).length;
      var score = wordCount;
      // boost for keywords
      var keywords = ['dragon', 'attack', 'win', 'lose', 'battle', 'card', 'strategy'];
      for (var i = 0; i < keywords.length; i++) {
        if (s.toLowerCase().indexOf(keywords[i]) !== -1) score += 3;
      }
      return { s: s, score: score, len: s.length };
    });
    ranked.sort(function (a, b) { return b.score - a.score; });
    var out = '';
    for (var i = 0; i < ranked.length && out.length < maxChars; i++) {
      if (out.length + ranked[i].len <= maxChars) {
        out += (out ? ' ' : '') + ranked[i].s;
      }
    }
    return out;
  };

  // KEYWORD: extract top keywords
  MemoryCompression.prototype._keywordExtract = function (content, maxChars) {
    if (typeof content !== 'string') content = String(content == null ? '' : content);
    var words = content.toLowerCase().split(/\W+/).filter(function (w) { return w.length > 3; });
    var freq = {};
    var stopwords = ['the', 'and', 'but', 'for', 'with', 'from', 'this', 'that', 'have', 'has'];
    for (var i = 0; i < words.length; i++) {
      if (stopwords.indexOf(words[i]) === -1) {
        freq[words[i]] = (freq[words[i]] || 0) + 1;
      }
    }
    var entries = [];
    for (var k in freq) {
      if (Object.prototype.hasOwnProperty.call(freq, k)) entries.push({ w: k, c: freq[k] });
    }
    entries.sort(function (a, b) { return b.c - a.c; });
    var top = entries.slice(0, this.maxKeywords).map(function (e) { return e.w; });
    var result = top.join(', ');
    if (result.length > maxChars) result = result.substring(0, maxChars);
    return result;
  };

  // LAYER_AWARE: per-layer compression
  MemoryCompression.prototype._layerAware = function (entries, totalTokenBudget) {
    var groups = {};
    for (var i = 0; i < entries.length; i++) {
      var l = entries[i].layer || 'L4';
      if (!groups[l]) groups[l] = [];
      groups[l].push(entries[i]);
    }
    var result = [];
    var layers = Object.keys(groups);
    for (var li = 0; li < layers.length; li++) {
      var layer = layers[li];
      var tokenBudget = this.budgetForLayer(layer, totalTokenBudget);
      var charBudget = this.budgetChars(tokenBudget);
      var groupEntries = groups[layer];
      var perEntry = Math.floor(charBudget / Math.max(groupEntries.length, 1));
      for (var ei = 0; ei < groupEntries.length; ei++) {
        var compressed = this._headTail(groupEntries[ei].content, perEntry);
        result.push({
          id: groupEntries[ei].id,
          layer: layer,
          originalLength: groupEntries[ei].content.length,
          compressed: compressed
        });
      }
    }
    return result;
  };

  // Main entry: compress single content
  MemoryCompression.prototype.compress = function (content, options) {
    var strategy = (options && options.strategy) || this.strategy;
    var maxChars = (options && options.maxChars) || 200;
    var result;
    switch (strategy) {
      case COMPRESSION_STRATEGY.TRUNCATE:
        result = this._truncate(content, maxChars);
        break;
      case COMPRESSION_STRATEGY.SENTENCE_RANK:
        result = this._sentenceRank(content, maxChars);
        break;
      case COMPRESSION_STRATEGY.KEYWORD:
        result = this._keywordExtract(content, maxChars);
        break;
      case COMPRESSION_STRATEGY.HEAD_TAIL:
      case COMPRESSION_STRATEGY.LAYER_AWARE:
      default:
        result = this._headTail(content, maxChars);
        break;
    }
    var originalLen = (content && content.length) || 0;
    this.compressed.push({ at: Date.now(), strategy: strategy, originalLen: originalLen, compressedLen: result.length });
    return { content: result, originalLength: originalLen, compressedLength: result.length, ratio: originalLen > 0 ? result.length / originalLen : 0 };
  };

  // Compress a list of entries (layer-aware)
  MemoryCompression.prototype.compressEntries = function (entries, totalTokenBudget) {
    return this._layerAware(entries, totalTokenBudget || 500);
  };

  // Estimate token count from content
  MemoryCompression.prototype.estimateTokens = function (content) {
    if (!content) return 0;
    return Math.ceil(content.length / this.charPerToken);
  };

  // Compression ratio aggregate
  MemoryCompression.prototype.getStats = function () {
    if (this.compressed.length === 0) {
      return { count: 0, totalOriginal: 0, totalCompressed: 0, avgRatio: 0 };
    }
    var totalOrig = 0, totalComp = 0;
    for (var i = 0; i < this.compressed.length; i++) {
      totalOrig += this.compressed[i].originalLen;
      totalComp += this.compressed[i].compressedLen;
    }
    return {
      count: this.compressed.length,
      totalOriginal: totalOrig,
      totalCompressed: totalComp,
      avgRatio: totalOrig > 0 ? totalComp / totalOrig : 0
    };
  };

  // Exports
  window.MemoryCompression = MemoryCompression;
  window.COMPRESSION_STRATEGY = COMPRESSION_STRATEGY;

})();
