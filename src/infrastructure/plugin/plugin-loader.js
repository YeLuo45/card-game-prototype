// ============================================================================
// Plugin Marketplace — V274 Direction C Iteration 2/9
// PluginLoader: 动态加载器 (lazy load + hot reload + factory + cache)
// 来源：claude-code tool system + nanobot mesh + thunderbolt PowerSync + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var LOAD_STATE = {
    UNLOADED: 'unloaded',
    LOADING: 'loading',
    LOADED: 'loaded',
    FAILED: 'failed'
  };

  function PluginLoader(options) {
    options = options || {};
    this.registry = options.registry || null;
    this.maxCached = options.maxCached || 50;
    this.hotReloadEnabled = options.hotReloadEnabled !== false;
    this.cache = {};
    this.cacheOrder = [];
    this.instances = {};
    this.loadState = {};
    this.factories = {};
    this.metrics = {
      loads: 0,
      unloads: 0,
      reloads: 0,
      failures: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    this.loadLog = [];
  }

  PluginLoader.prototype.registerFactory = function (pluginId, factoryFn) {
    if (typeof pluginId !== 'string') return { error: 'invalid_id' };
    if (typeof factoryFn !== 'function') return { error: 'invalid_factory' };
    this.factories[pluginId] = factoryFn;
    return { success: true };
  };

  PluginLoader.prototype.hasFactory = function (pluginId) {
    return typeof this.factories[pluginId] === 'function';
  };

  PluginLoader.prototype.load = function (pluginId, options) {
    if (typeof pluginId !== 'string') return { error: 'invalid_id' };
    if (this.loadState[pluginId] === LOAD_STATE.LOADING) return { error: 'already_loading' };
    // cache check
    if (this.cache[pluginId]) {
      this.metrics.cacheHits++;
      this.loadState[pluginId] = LOAD_STATE.LOADED;
      this.metrics.loads++;
      this.loadLog.push({ type: 'cache_hit', pluginId: pluginId, ts: Date.now() });
      return { success: true, instance: this.instances[pluginId], cached: true };
    }
    this.metrics.cacheMisses++;
    this.loadState[pluginId] = LOAD_STATE.LOADING;
    // factory invocation
    var factory = this.factories[pluginId];
    if (!factory) {
      this.loadState[pluginId] = LOAD_STATE.FAILED;
      this.metrics.failures++;
      this.loadLog.push({ type: 'failure', pluginId: pluginId, reason: 'no_factory', ts: Date.now() });
      return { error: 'no_factory' };
    }
    try {
      var result = factory(options || {});
      var instance;
      if (result && typeof result === 'object' && result.instance) {
        instance = result.instance;
      } else {
        instance = result;
      }
      // cache management
      this._addToCache(pluginId, instance);
      this.instances[pluginId] = instance;
      this.loadState[pluginId] = LOAD_STATE.LOADED;
      this.metrics.loads++;
      this.loadLog.push({ type: 'load', pluginId: pluginId, ts: Date.now() });
      return { success: true, instance: instance, cached: false };
    } catch (e) {
      this.loadState[pluginId] = LOAD_STATE.FAILED;
      this.metrics.failures++;
      this.loadLog.push({ type: 'failure', pluginId: pluginId, reason: e.message || 'unknown', ts: Date.now() });
      return { error: 'load_failed', message: e.message || 'unknown' };
    }
  };

  PluginLoader.prototype._addToCache = function (pluginId, instance) {
    if (this.cacheOrder.length >= this.maxCached) {
      var evict = this.cacheOrder.shift();
      delete this.cache[evict];
      delete this.instances[evict];
    }
    this.cache[pluginId] = { instance: instance, ts: Date.now() };
    this.cacheOrder.push(pluginId);
  };

  PluginLoader.prototype.unload = function (pluginId) {
    if (!this.instances[pluginId]) return { error: 'not_loaded' };
    var inst = this.instances[pluginId];
    if (inst && typeof inst.dispose === 'function') {
      try { inst.dispose(); } catch (e) { /* ignore */ }
    }
    delete this.instances[pluginId];
    delete this.cache[pluginId];
    var idx = this.cacheOrder.indexOf(pluginId);
    if (idx !== -1) this.cacheOrder.splice(idx, 1);
    this.loadState[pluginId] = LOAD_STATE.UNLOADED;
    this.metrics.unloads++;
    this.loadLog.push({ type: 'unload', pluginId: pluginId, ts: Date.now() });
    return { success: true };
  };

  PluginLoader.prototype.reload = function (pluginId, options) {
    if (!this.hotReloadEnabled) return { error: 'hot_reload_disabled' };
    if (this.instances[pluginId]) {
      this.unload(pluginId);
    }
    this.metrics.reloads++;
    return this.load(pluginId, options);
  };

  PluginLoader.prototype.getInstance = function (pluginId) {
    if (this.cache[pluginId]) {
      this.metrics.cacheHits++;
      return this.instances[pluginId];
    }
    this.metrics.cacheMisses++;
    return null;
  };

  PluginLoader.prototype.getState = function (pluginId) {
    return this.loadState[pluginId] || LOAD_STATE.UNLOADED;
  };

  PluginLoader.prototype.isLoaded = function (pluginId) {
    return this.loadState[pluginId] === LOAD_STATE.LOADED;
  };

  PluginLoader.prototype.precache = function (pluginIds) {
    if (!Array.isArray(pluginIds)) return { error: 'invalid_input' };
    var loaded = 0;
    for (var i = 0; i < pluginIds.length; i++) {
      var r = this.load(pluginIds[i]);
      if (r.success) loaded++;
    }
    return { success: true, loaded: loaded, requested: pluginIds.length };
  };

  PluginLoader.prototype.clearCache = function () {
    var cleared = this.cacheOrder.length;
    this.cache = {};
    this.cacheOrder = [];
    this.instances = {};
    this.loadState = {};
    return { success: true, cleared: cleared };
  };

  PluginLoader.prototype.getLoadLog = function (limit) {
    if (typeof limit === 'number' && limit > 0) return this.loadLog.slice(-limit);
    return this.loadLog.slice();
  };

  PluginLoader.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  PluginLoader.prototype.getSummary = function () {
    var stateCount = {};
    for (var k in this.loadState) {
      if (Object.prototype.hasOwnProperty.call(this.loadState, k)) {
        var s = this.loadState[k];
        stateCount[s] = (stateCount[s] || 0) + 1;
      }
    }
    return {
      cachedPlugins: this.cacheOrder.length,
      loadedInstances: Object.keys(this.instances).length,
      registeredFactories: Object.keys(this.factories).length,
      stateDistribution: stateCount,
      maxCached: this.maxCached,
      hotReloadEnabled: this.hotReloadEnabled,
      metrics: this.metrics
    };
  };

  PluginLoader.prototype.execute = function (pluginId, methodName, args) {
    var inst = this.getInstance(pluginId);
    if (!inst) {
      var r = this.load(pluginId);
      if (r.error) return r;
      inst = r.instance;
    }
    if (typeof inst[methodName] !== 'function') return { error: 'method_not_found' };
    try {
      var result = inst[methodName].apply(inst, args || []);
      return { success: true, result: result };
    } catch (e) {
      return { error: 'execution_failed', message: e.message };
    }
  };

  if (typeof window !== 'undefined') {
    window.PluginLoader = PluginLoader;
    window.LOAD_STATE = LOAD_STATE;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PluginLoader: PluginLoader, LOAD_STATE: LOAD_STATE };
  }
})();
