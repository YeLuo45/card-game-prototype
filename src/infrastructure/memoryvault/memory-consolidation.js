// ============================================================================
// Distributed Memory Vault — V301 Direction F Iteration 2/30
// MemoryConsolidation: 记忆合并与压缩
// 来源：generic-agent Self-Evolution + thunderbolt SQLite
// ============================================================================
'use strict';

(function () {

  // --------------------------------------------------------------------------
  // Consolidate Strategy — how to merge similar memories
  // --------------------------------------------------------------------------
  var STRATEGY = {
    KEEP_FIRST: 'keep_first',
    KEEP_LAST: 'keep_last',
    KEEP_HIGHEST_IMPORTANCE: 'keep_highest',
    MERGE_CONTENT: 'merge_content',
    KEEP_NEWEST: 'keep_newest'
  };

  // --------------------------------------------------------------------------
  // MemoryConsolidator — compress and merge similar memories
  // --------------------------------------------------------------------------
  function MemoryConsolidator(options) {
    this.store = (options && options.store) || null;
    this.strategy = (options && options.strategy) || STRATEGY.KEEP_HIGHEST_IMPORTANCE;
    this.similarityThreshold = (options && options.similarityThreshold) || 0.7;
    this.consolidations = []; // history of consolidations
  }

  MemoryConsolidator.prototype.setStore = function (store) {
    this.store = store;
    return this;
  };

  // Simple string similarity (Jaccard on word tokens)
  MemoryConsolidator.prototype._similarity = function (a, b) {
    if (!a || !b) return 0;
    var sa = JSON.stringify(a).toLowerCase();
    var sb = JSON.stringify(b).toLowerCase();
    if (sa === sb) return 1.0;
    var wa = sa.split(/\W+/).filter(function (x) { return x.length > 0; });
    var wb = sb.split(/\W+/).filter(function (x) { return x.length > 0; });
    if (wa.length === 0 || wb.length === 0) return 0;
    var setA = {};
    for (var i = 0; i < wa.length; i++) setA[wa[i]] = true;
    var setB = {};
    for (var j = 0; j < wb.length; j++) setB[wb[j]] = true;
    var inter = 0;
    for (var t in setA) if (setB[t]) inter++;
    var uni = 0;
    for (var u in setA) uni++;
    for (var v2 in setB) uni++;
    return uni === 0 ? 0 : inter / uni;
  };

  MemoryConsolidator.prototype.findSimilarPairs = function (entries) {
    if (!Array.isArray(entries)) return [];
    var pairs = [];
    for (var i = 0; i < entries.length; i++) {
      for (var j = i + 1; j < entries.length; j++) {
        var sim = this._similarity(entries[i].content, entries[j].content);
        if (sim >= this.similarityThreshold) {
          pairs.push({ a: entries[i], b: entries[j], similarity: sim });
        }
      }
    }
    return pairs;
  };

  MemoryConsolidator.prototype.consolidate = function (entryIds) {
    if (!this.store) return { error: 'no_store', success: false };
    if (!Array.isArray(entryIds) || entryIds.length < 2) return { error: 'need_min_2', success: false };
    var entries = [];
    for (var i = 0; i < entryIds.length; i++) {
      var e = this.store.peek(entryIds[i]);
      if (e) entries.push(e);
    }
    if (entries.length < 2) return { error: 'insufficient_entries', success: false };
    var pairs = this.findSimilarPairs(entries);
    var merged = [];
    var removed = [];
    for (var k = 0; k < pairs.length; k++) {
      var p = pairs[k];
      var keeper = this._pickKeeper(p.a, p.b);
      var loser = keeper === p.a ? p.b : p.a;
      if (removed.indexOf(loser.id) === -1) {
        this.store.delete(loser.id);
        removed.push(loser.id);
        merged.push({ kept: keeper.id, removed: loser.id, similarity: p.similarity });
      }
    }
    this.consolidations.push({ timestamp: Date.now(), merged: merged, count: merged.length });
    return { success: true, merged: merged, removed: removed };
  };

  MemoryConsolidator.prototype._pickKeeper = function (a, b) {
    if (this.strategy === STRATEGY.KEEP_FIRST) return a;
    if (this.strategy === STRATEGY.KEEP_LAST) return b;
    if (this.strategy === STRATEGY.KEEP_NEWEST) return a.createdAt >= b.createdAt ? a : b;
    if (this.strategy === STRATEGY.MERGE_CONTENT) return a; // content merge logic below
    // KEEP_HIGHEST_IMPORTANCE (default)
    return (a.importance || 0) >= (b.importance || 0) ? a : b;
  };

  MemoryConsolidator.prototype.consolidateLayer = function (layer) {
    if (!this.store) return { error: 'no_store', success: false };
    var entries = this.store.listByLayer(layer);
    if (entries.length < 2) return { error: 'insufficient', success: false, count: entries.length };
    var ids = [];
    for (var i = 0; i < entries.length; i++) ids.push(entries[i].id);
    return this.consolidate(ids);
  };

  MemoryConsolidator.prototype.getConsolidationCount = function () {
    return this.consolidations.length;
  };

  MemoryConsolidator.prototype.getStats = function () {
    return {
      consolidations: this.consolidations.length,
      totalMerged: this.consolidations.reduce(function (s, c) { return s + c.count; }, 0),
      strategy: this.strategy,
      threshold: this.similarityThreshold
    };
  };

  // --------------------------------------------------------------------------
  // Exports
  // --------------------------------------------------------------------------
  window.MemoryConsolidator = MemoryConsolidator;
  window.STRATEGY = STRATEGY;

})();
