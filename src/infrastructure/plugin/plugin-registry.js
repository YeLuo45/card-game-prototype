// ============================================================================
// Plugin Marketplace — V273 Direction C Iteration 1/9
// PluginRegistry: 插件注册中心 (register/deregister/lookup/categories)
// 来源：claude-code tool system + nanobot mesh + thunderbolt PowerSync + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var PLUGIN_STATUS = {
    REGISTERED: 'registered',
    LOADED: 'loaded',
    ACTIVE: 'active',
    DISABLED: 'disabled',
    DEPRECATED: 'deprecated'
  };

  function PluginRegistry(options) {
    options = options || {};
    this.maxPlugins = options.maxPlugins || 1000;
    this.plugins = {};
    this.index = [];
    this.byCategory = {};
    this.byAuthor = {};
    this.history = [];
    this.metrics = {
      registrations: 0,
      deregistrations: 0,
      lookups: 0,
      statusChanges: 0
    };
  }

  PluginRegistry.prototype.register = function (plugin) {
    if (!plugin) return { error: 'invalid_plugin' };
    if (typeof plugin.id !== 'string' || plugin.id.length === 0) return { error: 'invalid_id' };
    if (this.plugins[plugin.id]) return { error: 'already_registered' };
    if (this.index.length >= this.maxPlugins) return { error: 'registry_full' };
    var entry = {
      id: plugin.id,
      name: plugin.name || plugin.id,
      version: plugin.version || '0.1.0',
      author: plugin.author || 'unknown',
      description: plugin.description || '',
      category: plugin.category || 'general',
      tags: plugin.tags || [],
      dependencies: plugin.dependencies || [],
      status: PLUGIN_STATUS.REGISTERED,
      registeredAt: Date.now(),
      lastUpdated: Date.now(),
      downloadCount: 0,
      rating: 0,
      ratingCount: 0,
      metadata: plugin.metadata || {}
    };
    this.plugins[plugin.id] = entry;
    this.index.push(plugin.id);
    // indexes
    if (!this.byCategory[entry.category]) this.byCategory[entry.category] = [];
    this.byCategory[entry.category].push(plugin.id);
    if (!this.byAuthor[entry.author]) this.byAuthor[entry.author] = [];
    this.byAuthor[entry.author].push(plugin.id);
    this.metrics.registrations++;
    this.history.push({ type: 'register', pluginId: plugin.id, ts: Date.now() });
    return { success: true, entry: entry };
  };

  PluginRegistry.prototype.deregister = function (pluginId) {
    var p = this.plugins[pluginId];
    if (!p) return { error: 'not_found' };
    delete this.plugins[pluginId];
    var idx = this.index.indexOf(pluginId);
    if (idx !== -1) this.index.splice(idx, 1);
    // remove from indexes
    if (this.byCategory[p.category]) {
      var ci = this.byCategory[p.category].indexOf(pluginId);
      if (ci !== -1) this.byCategory[p.category].splice(ci, 1);
      if (this.byCategory[p.category].length === 0) delete this.byCategory[p.category];
    }
    if (this.byAuthor[p.author]) {
      var ai = this.byAuthor[p.author].indexOf(pluginId);
      if (ai !== -1) this.byAuthor[p.author].splice(ai, 1);
      if (this.byAuthor[p.author].length === 0) delete this.byAuthor[p.author];
    }
    this.metrics.deregistrations++;
    this.history.push({ type: 'deregister', pluginId: pluginId, ts: Date.now() });
    return { success: true };
  };

  PluginRegistry.prototype.get = function (pluginId) {
    if (this.plugins[pluginId]) this.metrics.lookups++;
    return this.plugins[pluginId] || null;
  };

  PluginRegistry.prototype.has = function (pluginId) {
    return !!this.plugins[pluginId];
  };

  PluginRegistry.prototype.list = function (filter) {
    var arr = [];
    for (var i = 0; i < this.index.length; i++) {
      var p = this.plugins[this.index[i]];
      if (!p) continue;
      if (filter) {
        if (filter.category && p.category !== filter.category) continue;
        if (filter.author && p.author !== filter.author) continue;
        if (filter.status && p.status !== filter.status) continue;
        if (filter.tag && p.tags.indexOf(filter.tag) === -1) continue;
      }
      arr.push(p);
    }
    return arr;
  };

  PluginRegistry.prototype.listByCategory = function (category) {
    var ids = this.byCategory[category] || [];
    return ids.map(function (id) { return this.plugins[id]; }, this).filter(function (p) { return p; });
  };

  PluginRegistry.prototype.listByAuthor = function (author) {
    var ids = this.byAuthor[author] || [];
    return ids.map(function (id) { return this.plugins[id]; }, this).filter(function (p) { return p; });
  };

  PluginRegistry.prototype.setStatus = function (pluginId, status) {
    var p = this.plugins[pluginId];
    if (!p) return { error: 'not_found' };
    var valid = Object.keys(PLUGIN_STATUS).map(function (k) { return PLUGIN_STATUS[k]; });
    if (valid.indexOf(status) === -1) return { error: 'invalid_status' };
    var oldStatus = p.status;
    p.status = status;
    p.lastUpdated = Date.now();
    this.metrics.statusChanges++;
    this.history.push({ type: 'status_change', pluginId: pluginId, from: oldStatus, to: status, ts: Date.now() });
    return { success: true, previous: oldStatus };
  };

  PluginRegistry.prototype.updateMetadata = function (pluginId, metadata) {
    var p = this.plugins[pluginId];
    if (!p) return { error: 'not_found' };
    if (typeof metadata !== 'object') return { error: 'invalid_metadata' };
    for (var k in metadata) {
      if (Object.prototype.hasOwnProperty.call(metadata, k)) {
        p.metadata[k] = metadata[k];
      }
    }
    p.lastUpdated = Date.now();
    return { success: true };
  };

  PluginRegistry.prototype.search = function (query) {
    if (typeof query !== 'string') return [];
    var q = query.toLowerCase();
    var results = [];
    for (var i = 0; i < this.index.length; i++) {
      var p = this.plugins[this.index[i]];
      if (!p) continue;
      var hay = (p.id + ' ' + p.name + ' ' + p.description + ' ' + p.tags.join(' ')).toLowerCase();
      if (hay.indexOf(q) !== -1) results.push(p);
    }
    return results;
  };

  PluginRegistry.prototype.categories = function () {
    return Object.keys(this.byCategory);
  };

  PluginRegistry.prototype.authors = function () {
    return Object.keys(this.byAuthor);
  };

  PluginRegistry.prototype.size = function () {
    return this.index.length;
  };

  PluginRegistry.prototype.getHistory = function (limit) {
    if (typeof limit === 'number' && limit > 0) return this.history.slice(-limit);
    return this.history.slice();
  };

  PluginRegistry.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  PluginRegistry.prototype.getSummary = function () {
    var dist = {};
    for (var k in PLUGIN_STATUS) {
      dist[PLUGIN_STATUS[k]] = 0;
    }
    for (var i = 0; i < this.index.length; i++) {
      var p = this.plugins[this.index[i]];
      if (p && dist[p.status] !== undefined) dist[p.status]++;
    }
    return {
      totalPlugins: this.index.length,
      statusDistribution: dist,
      categoryCount: this.categories().length,
      authorCount: this.authors().length,
      metrics: this.metrics
    };
  };

  PluginRegistry.prototype.exportRegistry = function () {
    return JSON.stringify({
      format: 'plugin-registry-v1',
      plugins: this.plugins,
      exportedAt: Date.now()
    });
  };

  PluginRegistry.prototype.importRegistry = function (jsonString) {
    if (typeof jsonString !== 'string') return { error: 'invalid_input' };
    try {
      var parsed = JSON.parse(jsonString);
      if (parsed.format !== 'plugin-registry-v1') return { error: 'unknown_format' };
      for (var k in parsed.plugins) {
        if (Object.prototype.hasOwnProperty.call(parsed.plugins, k)) {
          if (!this.plugins[k]) this.register(parsed.plugins[k]);
        }
      }
      return { success: true, imported: Object.keys(parsed.plugins).length };
    } catch (e) {
      return { error: 'parse_error' };
    }
  };

  PluginRegistry.prototype.clear = function () {
    this.plugins = {};
    this.index = [];
    this.byCategory = {};
    this.byAuthor = {};
    this.history = [];
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.PluginRegistry = PluginRegistry;
    window.PLUGIN_STATUS = PLUGIN_STATUS;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PluginRegistry: PluginRegistry, PLUGIN_STATUS: PLUGIN_STATUS };
  }
})();
