// ============================================================================
// Plugin Marketplace — V276 Direction C Iteration 4/9
// PluginMarketplace: 插件市场 (搜索/分类/评分/作者主页/Trending)
// 来源：claude-code tool system + nanobot mesh + thunderbolt PowerSync + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  function PluginMarketplace(options) {
    options = options || {};
    this.registry = options.registry || null;
    this.installed = {};
    this.reviews = {};  // pluginId -> [reviews]
    this.downloads = {};  // pluginId -> count
    this.viewCounts = {};
    this.trendingScore = {};
    this.featured = [];
    this.metrics = {
      installations: 0,
      uninstallations: 0,
      reviews: 0,
      downloads: 0,
      searches: 0
    };
  }

  // ---- Listing ----
  PluginMarketplace.prototype.listAll = function () {
    if (!this.registry) return [];
    return this.registry.list();
  };

  PluginMarketplace.prototype.listByCategory = function (category) {
    if (!this.registry) return [];
    return this.registry.listByCategory(category);
  };

  PluginMarketplace.prototype.listByAuthor = function (author) {
    if (!this.registry) return [];
    return this.registry.listByAuthor(author);
  };

  PluginMarketplace.prototype.search = function (query, filters) {
    if (!this.registry) return [];
    this.metrics.searches++;
    var results;
    if (query && typeof query === 'string') {
      results = this.registry.search(query);
    } else {
      results = this.registry.list();
    }
    if (filters) {
      if (filters.category) results = results.filter(function (p) { return p.category === filters.category; });
      if (filters.minRating) results = results.filter(function (p) { return p.rating >= filters.minRating; });
      if (filters.tags && filters.tags.length) {
        results = results.filter(function (p) { return filters.tags.every(function (t) { return p.tags.indexOf(t) !== -1; }); });
      }
    }
    return results;
  };

  PluginMarketplace.prototype.listFeatured = function () {
    return this.featured.map(function (id) { return this.registry ? this.registry.get(id) : null; }, this).filter(function (p) { return p; });
  };

  PluginMarketplace.prototype.listTrending = function (limit) {
    var entries = [];
    for (var k in this.trendingScore) {
      if (Object.prototype.hasOwnProperty.call(this.trendingScore, k)) {
        entries.push({ pluginId: k, score: this.trendingScore[k] });
      }
    }
    entries.sort(function (a, b) { return b.score - a.score; });
    var ids = entries.slice(0, limit || 10).map(function (e) { return e.pluginId; });
    return ids.map(function (id) { return this.registry ? this.registry.get(id) : null; }, this).filter(function (p) { return p; });
  };

  // ---- Featured / Trending ----
  PluginMarketplace.prototype.setFeatured = function (pluginIds) {
    if (!Array.isArray(pluginIds)) return { error: 'invalid_input' };
    this.featured = pluginIds.slice();
    return { success: true, count: this.featured.length };
  };

  PluginMarketplace.prototype.addFeatured = function (pluginId) {
    if (typeof pluginId !== 'string') return { error: 'invalid_id' };
    if (this.featured.indexOf(pluginId) === -1) {
      this.featured.push(pluginId);
    }
    return { success: true };
  };

  PluginMarketplace.prototype.removeFeatured = function (pluginId) {
    var idx = this.featured.indexOf(pluginId);
    if (idx !== -1) this.featured.splice(idx, 1);
    return { success: true };
  };

  PluginMarketplace.prototype.bumpTrending = function (pluginId, score) {
    if (typeof pluginId !== 'string') return { error: 'invalid_id' };
    var s = typeof score === 'number' ? score : 1;
    this.trendingScore[pluginId] = (this.trendingScore[pluginId] || 0) + s;
    return { success: true, score: this.trendingScore[pluginId] };
  };

  // ---- Install / Uninstall ----
  PluginMarketplace.prototype.install = function (pluginId) {
    if (typeof pluginId !== 'string') return { error: 'invalid_id' };
    if (this.installed[pluginId]) return { error: 'already_installed' };
    this.installed[pluginId] = { installedAt: Date.now() };
    this.metrics.installations++;
    this.bumpTrending(pluginId, 5);
    return { success: true };
  };

  PluginMarketplace.prototype.uninstall = function (pluginId) {
    if (!this.installed[pluginId]) return { error: 'not_installed' };
    delete this.installed[pluginId];
    this.metrics.uninstallations++;
    return { success: true };
  };

  PluginMarketplace.prototype.isInstalled = function (pluginId) {
    return !!this.installed[pluginId];
  };

  PluginMarketplace.prototype.getInstalled = function () {
    var arr = [];
    for (var k in this.installed) {
      if (Object.prototype.hasOwnProperty.call(this.installed, k)) {
        arr.push(k);
      }
    }
    return arr;
  };

  // ---- Download tracking ----
  PluginMarketplace.prototype.trackDownload = function (pluginId) {
    if (typeof pluginId !== 'string') return { error: 'invalid_id' };
    this.downloads[pluginId] = (this.downloads[pluginId] || 0) + 1;
    this.metrics.downloads++;
    if (this.registry) {
      var p = this.registry.get(pluginId);
      if (p) p.downloadCount++;
    }
    this.bumpTrending(pluginId, 1);
    return { success: true, count: this.downloads[pluginId] };
  };

  PluginMarketplace.prototype.getDownloadCount = function (pluginId) {
    return this.downloads[pluginId] || 0;
  };

  PluginMarketplace.prototype.trackView = function (pluginId) {
    if (typeof pluginId !== 'string') return { error: 'invalid_id' };
    this.viewCounts[pluginId] = (this.viewCounts[pluginId] || 0) + 1;
    return { success: true };
  };

  PluginMarketplace.prototype.getViewCount = function (pluginId) {
    return this.viewCounts[pluginId] || 0;
  };

  // ---- Reviews & Ratings ----
  PluginMarketplace.prototype.addReview = function (pluginId, review) {
    if (typeof pluginId !== 'string') return { error: 'invalid_id' };
    if (!review || typeof review !== 'object') return { error: 'invalid_review' };
    if (typeof review.rating !== 'number' || review.rating < 1 || review.rating > 5) {
      return { error: 'invalid_rating' };
    }
    var entry = {
      id: 'r_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      author: review.author || 'anonymous',
      rating: review.rating,
      title: review.title || '',
      body: review.body || '',
      ts: Date.now()
    };
    if (!this.reviews[pluginId]) this.reviews[pluginId] = [];
    this.reviews[pluginId].push(entry);
    this.metrics.reviews++;
    // update plugin rating
    this._recomputeRating(pluginId);
    return { success: true, review: entry };
  };

  PluginMarketplace.prototype._recomputeRating = function (pluginId) {
    if (!this.registry) return;
    var reviews = this.reviews[pluginId] || [];
    if (reviews.length === 0) return;
    var sum = 0;
    for (var i = 0; i < reviews.length; i++) sum += reviews[i].rating;
    var avg = sum / reviews.length;
    var p = this.registry.get(pluginId);
    if (p) {
      p.rating = avg;
      p.ratingCount = reviews.length;
    }
  };

  PluginMarketplace.prototype.getReviews = function (pluginId, limit) {
    var arr = this.reviews[pluginId] || [];
    if (typeof limit === 'number' && limit > 0) return arr.slice(-limit);
    return arr.slice();
  };

  PluginMarketplace.prototype.getRating = function (pluginId) {
    var reviews = this.reviews[pluginId] || [];
    if (reviews.length === 0) return { average: 0, count: 0 };
    var sum = 0;
    for (var i = 0; i < reviews.length; i++) sum += reviews[i].rating;
    return { average: sum / reviews.length, count: reviews.length };
  };

  // ---- Author profile ----
  PluginMarketplace.prototype.getAuthorProfile = function (author) {
    if (!this.registry) return null;
    var plugins = this.registry.listByAuthor(author);
    var totalDownloads = 0;
    var ratings = [];
    for (var i = 0; i < plugins.length; i++) {
      totalDownloads += this.getDownloadCount(plugins[i].id);
      if (plugins[i].rating > 0) ratings.push(plugins[i].rating);
    }
    var avgRating = ratings.length > 0 ? ratings.reduce(function (a, b) { return a + b; }, 0) / ratings.length : 0;
    return {
      author: author,
      pluginCount: plugins.length,
      totalDownloads: totalDownloads,
      averageRating: avgRating,
      plugins: plugins
    };
  };

  // ---- Stats ----
  PluginMarketplace.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  PluginMarketplace.prototype.getSummary = function () {
    return {
      installedCount: Object.keys(this.installed).length,
      reviewedPluginCount: Object.keys(this.reviews).length,
      downloadTracked: Object.keys(this.downloads).length,
      featuredCount: this.featured.length,
      trendingTracked: Object.keys(this.trendingScore).length,
      metrics: this.metrics
    };
  };

  if (typeof window !== 'undefined') {
    window.PluginMarketplace = PluginMarketplace;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PluginMarketplace: PluginMarketplace };
  }
})();
