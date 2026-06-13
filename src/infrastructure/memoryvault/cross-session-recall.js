// ============================================================================
// Distributed Memory Vault — V302 Direction F Iteration 3/30
// CrossSessionRecall: 跨会话记忆召回
// 来源：nanobot Dream Memory + chatdev Multi-Agent
// ============================================================================
'use strict';

(function () {

  // CrossSessionRecall — search memories across sessions
  function CrossSessionRecall(store, options) {
    this.store = store;
    this.maxResults = (options && options.maxResults) || 20;
    this.minScore = (options && options.minScore) || 0.0;
  }

  CrossSessionRecall.prototype._tokenize = function (text) {
    if (!text) return [];
    return JSON.stringify(text).toLowerCase().split(/\W+/).filter(function (x) { return x.length > 0; });
  };

  CrossSessionRecall.prototype._score = function (queryTokens, entry) {
    var entryTokens = this._tokenize(entry.content);
    if (entryTokens.length === 0) return 0;
    var match = 0;
    for (var i = 0; i < queryTokens.length; i++) {
      if (entryTokens.indexOf(queryTokens[i]) !== -1) match++;
    }
    return match / Math.max(queryTokens.length, 1);
  };

  CrossSessionRecall.prototype.search = function (query, options) {
    if (!this.store) return [];
    if (!query) return [];
    var qTokens = this._tokenize(query);
    if (qTokens.length === 0) return [];
    var allEntries = this.store.listByLayer('L4').concat(this.store.listByLayer('L3'));
    var results = [];
    var limit = (options && options.limit) || this.maxResults;
    for (var i = 0; i < allEntries.length; i++) {
      var e = allEntries[i];
      var s = this._score(qTokens, e);
      if (s >= this.minScore) {
        results.push({ entry: e, score: s });
      }
    }
    results.sort(function (a, b) { return b.score - a.score; });
    return results.slice(0, limit);
  };

  CrossSessionRecall.prototype.searchBySession = function (query, sessionId) {
    if (!this.store || !sessionId) return [];
    var entries = this.store.listBySession(sessionId);
    var qTokens = this._tokenize(query);
    var results = [];
    for (var i = 0; i < entries.length; i++) {
      var s = this._score(qTokens, entries[i]);
      if (s > 0) results.push({ entry: entries[i], score: s });
    }
    results.sort(function (a, b) { return b.score - a.score; });
    return results;
  };

  CrossSessionRecall.prototype.searchByType = function (query, type) {
    if (!this.store) return [];
    var entries = this.store.listByType(type);
    var qTokens = this._tokenize(query);
    var results = [];
    for (var i = 0; i < entries.length; i++) {
      var s = this._score(qTokens, entries[i]);
      if (s > 0) results.push({ entry: entries[i], score: s });
    }
    results.sort(function (a, b) { return b.score - a.score; });
    return results;
  };

  CrossSessionRecall.prototype.getStats = function () {
    return { maxResults: this.maxResults, minScore: this.minScore };
  };

  // Exports
  window.CrossSessionRecall = CrossSessionRecall;

})();
