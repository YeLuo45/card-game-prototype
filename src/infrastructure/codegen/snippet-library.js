// ============================================================================
// Code Generation — V295 Direction E Iteration 5/9
// SnippetLibrary: 代码片段库 (添加/分类/搜索/标签/收藏/使用统计)
// 来源：claude-code + generic-agent + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  function SnippetLibrary(options) {
    options = options || {};
    this.snippets = {};
    this.categories = {};
    this.tags = {};
    this.usage = {};  // snippetId -> count
    this.favorites = {};  // snippetId -> true
    this.snippetCounter = 0;
    this.maxSnippets = options.maxSnippets || 10000;
    this.metrics = {
      added: 0,
      searches: 0,
      uses: 0
    };
  }

  SnippetLibrary.prototype.add = function (snippet) {
    if (!snippet || typeof snippet !== 'object') return { error: 'invalid_snippet' };
    if (typeof snippet.code !== 'string') return { error: 'code_required' };
    if (typeof snippet.title !== 'string' || snippet.title.length === 0) return { error: 'title_required' };
    if (Object.keys(this.snippets).length >= this.maxSnippets) return { error: 'max_reached' };
    var id = snippet.id || 's_' + (++this.snippetCounter) + '_' + Date.now();
    if (this.snippets[id]) return { error: 'duplicate_id' };
    var entry = {
      id: id,
      title: snippet.title,
      description: snippet.description || '',
      code: snippet.code,
      language: snippet.language || 'javascript',
      category: snippet.category || 'general',
      tags: Array.isArray(snippet.tags) ? snippet.tags : [],
      author: snippet.author || null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.snippets[id] = entry;
    this._addToCategory(entry.category, id);
    for (var i = 0; i < entry.tags.length; i++) this._addToTag(entry.tags[i], id);
    this.metrics.added++;
    return { success: true, id: id, entry: entry };
  };

  SnippetLibrary.prototype._addToCategory = function (cat, id) {
    if (!this.categories[cat]) this.categories[cat] = [];
    if (this.categories[cat].indexOf(id) === -1) this.categories[cat].push(id);
  };

  SnippetLibrary.prototype._addToTag = function (tag, id) {
    if (!this.tags[tag]) this.tags[tag] = [];
    if (this.tags[tag].indexOf(id) === -1) this.tags[tag].push(id);
  };

  SnippetLibrary.prototype.remove = function (id) {
    if (!this.snippets[id]) return { error: 'not_found' };
    var s = this.snippets[id];
    var catList = this.categories[s.category];
    if (catList) {
      var idx = catList.indexOf(id);
      if (idx !== -1) catList.splice(idx, 1);
    }
    for (var i = 0; i < s.tags.length; i++) {
      var tagList = this.tags[s.tags[i]];
      if (tagList) {
        var j = tagList.indexOf(id);
        if (j !== -1) tagList.splice(j, 1);
      }
    }
    delete this.snippets[id];
    delete this.usage[id];
    delete this.favorites[id];
    return { success: true };
  };

  SnippetLibrary.prototype.get = function (id) {
    return this.snippets[id] || null;
  };

  SnippetLibrary.prototype.update = function (id, updates) {
    var s = this.snippets[id];
    if (!s) return { error: 'not_found' };
    if (typeof updates.title === 'string') s.title = updates.title;
    if (typeof updates.description === 'string') s.description = updates.description;
    if (typeof updates.code === 'string') s.code = updates.code;
    if (typeof updates.language === 'string') s.language = updates.language;
    if (Array.isArray(updates.tags)) {
      // remove old tags
      for (var i = 0; i < s.tags.length; i++) {
        var tagList = this.tags[s.tags[i]];
        if (tagList) {
          var idx = tagList.indexOf(id);
          if (idx !== -1) tagList.splice(idx, 1);
        }
      }
      s.tags = updates.tags;
      for (var k = 0; k < s.tags.length; k++) this._addToTag(s.tags[k], id);
    }
    s.updatedAt = Date.now();
    return { success: true, entry: s };
  };

  SnippetLibrary.prototype.search = function (query, options) {
    options = options || {};
    this.metrics.searches++;
    var results = [];
    var q = (query || '').toLowerCase();
    for (var k in this.snippets) {
      if (Object.prototype.hasOwnProperty.call(this.snippets, k)) {
        var s = this.snippets[k];
        if (options.category && s.category !== options.category) continue;
        if (options.language && s.language !== options.language) continue;
        if (options.tag && s.tags.indexOf(options.tag) === -1) continue;
        if (q) {
          var titleMatch = s.title.toLowerCase().indexOf(q) !== -1;
          var descMatch = s.description.toLowerCase().indexOf(q) !== -1;
          var codeMatch = options.searchCode && s.code.toLowerCase().indexOf(q) !== -1;
          if (!titleMatch && !descMatch && !codeMatch) continue;
        }
        results.push(s);
      }
    }
    return results;
  };

  SnippetLibrary.prototype.use = function (id) {
    if (!this.snippets[id]) return { error: 'not_found' };
    this.usage[id] = (this.usage[id] || 0) + 1;
    this.metrics.uses++;
    return { success: true, count: this.usage[id] };
  };

  SnippetLibrary.prototype.getUsageCount = function (id) {
    return this.usage[id] || 0;
  };

  SnippetLibrary.prototype.getMostUsed = function (limit) {
    var arr = [];
    for (var k in this.usage) {
      if (Object.prototype.hasOwnProperty.call(this.usage, k)) {
        var s = this.snippets[k];
        if (s) arr.push({ id: k, title: s.title, count: this.usage[k] });
      }
    }
    arr.sort(function (a, b) { return b.count - a.count; });
    if (typeof limit === 'number' && limit > 0) return arr.slice(0, limit);
    return arr;
  };

  SnippetLibrary.prototype.favorite = function (id) {
    if (!this.snippets[id]) return { error: 'not_found' };
    this.favorites[id] = true;
    return { success: true };
  };

  SnippetLibrary.prototype.unfavorite = function (id) {
    delete this.favorites[id];
    return { success: true };
  };

  SnippetLibrary.prototype.isFavorite = function (id) {
    return !!this.favorites[id];
  };

  SnippetLibrary.prototype.listFavorites = function () {
    var arr = [];
    for (var k in this.favorites) {
      if (Object.prototype.hasOwnProperty.call(this.favorites, k) && this.snippets[k]) {
        arr.push(this.snippets[k]);
      }
    }
    return arr;
  };

  SnippetLibrary.prototype.listByCategory = function (cat) {
    var ids = this.categories[cat] || [];
    return ids.map(function (id) { return this.snippets[id]; }.bind(this)).filter(function (x) { return x; });
  };

  SnippetLibrary.prototype.listByTag = function (tag) {
    var ids = this.tags[tag] || [];
    return ids.map(function (id) { return this.snippets[id]; }.bind(this)).filter(function (x) { return x; });
  };

  SnippetLibrary.prototype.listCategories = function () {
    var arr = [];
    for (var k in this.categories) {
      if (Object.prototype.hasOwnProperty.call(this.categories, k)) {
        arr.push({ name: k, count: this.categories[k].length });
      }
    }
    return arr;
  };

  SnippetLibrary.prototype.listTags = function () {
    var arr = [];
    for (var k in this.tags) {
      if (Object.prototype.hasOwnProperty.call(this.tags, k)) {
        arr.push({ name: k, count: this.tags[k].length });
      }
    }
    return arr;
  };

  SnippetLibrary.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  SnippetLibrary.prototype.getSummary = function () {
    return {
      totalSnippets: Object.keys(this.snippets).length,
      categories: this.listCategories().length,
      tags: this.listTags().length,
      favorites: Object.keys(this.favorites).length,
      totalUses: this.metrics.uses,
      metrics: this.metrics
    };
  };

  SnippetLibrary.prototype.clear = function () {
    this.snippets = {};
    this.categories = {};
    this.tags = {};
    this.usage = {};
    this.favorites = {};
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.SnippetLibrary = SnippetLibrary;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SnippetLibrary: SnippetLibrary };
  }
})();
