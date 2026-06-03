// ============================================================================
// Plugin Marketplace — V279 Direction C Iteration 7/9
// PluginLifecycle: 生命周期 (init/start/stop/destroy + 钩子)
// 来源：claude-code tool system + nanobot mesh + thunderbolt PowerSync + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var LIFECYCLE_STATE = {
    CREATED: 'created',
    INITIALIZED: 'initialized',
    RUNNING: 'running',
    PAUSED: 'paused',
    STOPPED: 'stopped',
    DESTROYED: 'destroyed',
    ERROR: 'error'
  };

  var LIFECYCLE_HOOK = {
    BEFORE_INIT: 'beforeInit',
    AFTER_INIT: 'afterInit',
    BEFORE_START: 'beforeStart',
    AFTER_START: 'afterStart',
    BEFORE_STOP: 'beforeStop',
    AFTER_STOP: 'afterStop',
    BEFORE_DESTROY: 'beforeDestroy',
    AFTER_DESTROY: 'afterDestroy',
    ON_PAUSE: 'onPause',
    ON_RESUME: 'onResume',
    ON_ERROR: 'onError'
  };

  function PluginLifecycle(options) {
    options = options || {};
    this.sandbox = options.sandbox || null;
    this.instances = {};
    this.hooks = {};  // pluginId -> {hookName: [fns]}
    this.history = {};
    this.metrics = {
      init: 0,
      start: 0,
      stop: 0,
      destroy: 0,
      pause: 0,
      resume: 0,
      errors: 0
    };
  }

  PluginLifecycle.prototype.register = function (pluginId, instance) {
    if (typeof pluginId !== 'string') return { error: 'invalid_id' };
    this.instances[pluginId] = {
      instance: instance,
      state: LIFECYCLE_STATE.CREATED,
      createdAt: Date.now(),
      stateChangedAt: Date.now()
    };
    this.hooks[pluginId] = {};
    this.history[pluginId] = [];
    this._logHistory(pluginId, 'register', null);
    return { success: true, state: LIFECYCLE_STATE.CREATED };
  };

  PluginLifecycle.prototype._logHistory = function (pluginId, event, detail) {
    if (!this.history[pluginId]) return;
    this.history[pluginId].push({ event: event, detail: detail, ts: Date.now() });
    if (this.history[pluginId].length > 100) this.history[pluginId] = this.history[pluginId].slice(-100);
  };

  PluginLifecycle.prototype._setState = function (pluginId, state) {
    var p = this.instances[pluginId];
    if (!p) return null;
    var old = p.state;
    p.state = state;
    p.stateChangedAt = Date.now();
    return old;
  };

  PluginLifecycle.prototype._callHook = function (pluginId, hookName) {
    var hooks = (this.hooks[pluginId] || {})[hookName];
    if (!hooks || hooks.length === 0) return { success: true, called: 0 };
    var errors = [];
    for (var i = 0; i < hooks.length; i++) {
      try {
        hooks[i]();
      } catch (e) {
        errors.push({ hook: hookName, error: e.message });
      }
    }
    return { success: errors.length === 0, called: hooks.length, errors: errors };
  };

  PluginLifecycle.prototype._callMethod = function (pluginId, methodName) {
    var p = this.instances[pluginId];
    if (!p || !p.instance) return { error: 'no_instance' };
    var inst = p.instance;
    if (typeof inst[methodName] !== 'function') return { skipped: true };
    try {
      inst[methodName]();
      return { success: true };
    } catch (e) {
      return { error: e.message };
    }
  };

  PluginLifecycle.prototype.addHook = function (pluginId, hookName, fn) {
    if (typeof pluginId !== 'string') return { error: 'invalid_id' };
    if (typeof fn !== 'function') return { error: 'invalid_fn' };
    if (!this.hooks[pluginId]) this.hooks[pluginId] = {};
    if (!this.hooks[pluginId][hookName]) this.hooks[pluginId][hookName] = [];
    this.hooks[pluginId][hookName].push(fn);
    return { success: true };
  };

  PluginLifecycle.prototype.removeHooks = function (pluginId, hookName) {
    if (!this.hooks[pluginId]) return { error: 'not_found' };
    if (hookName) {
      delete this.hooks[pluginId][hookName];
    } else {
      this.hooks[pluginId] = {};
    }
    return { success: true };
  };

  PluginLifecycle.prototype.init = function (pluginId) {
    var p = this.instances[pluginId];
    if (!p) return { error: 'not_registered' };
    if (p.state !== LIFECYCLE_STATE.CREATED) return { error: 'invalid_state', current: p.state };
    this._callHook(pluginId, LIFECYCLE_HOOK.BEFORE_INIT);
    var result = this._callMethod(pluginId, 'init');
    if (result.error) {
      this.metrics.errors++;
      this._setState(pluginId, LIFECYCLE_STATE.ERROR);
      this._logHistory(pluginId, 'init_error', result.error);
      return { error: 'init_failed', message: result.error };
    }
    this._setState(pluginId, LIFECYCLE_STATE.INITIALIZED);
    this._callHook(pluginId, LIFECYCLE_HOOK.AFTER_INIT);
    this.metrics.init++;
    this._logHistory(pluginId, 'init', null);
    return { success: true, state: LIFECYCLE_STATE.INITIALIZED };
  };

  PluginLifecycle.prototype.start = function (pluginId) {
    var p = this.instances[pluginId];
    if (!p) return { error: 'not_registered' };
    if (p.state !== LIFECYCLE_STATE.INITIALIZED && p.state !== LIFECYCLE_STATE.PAUSED) {
      return { error: 'invalid_state', current: p.state };
    }
    this._callHook(pluginId, LIFECYCLE_HOOK.BEFORE_START);
    var result = this._callMethod(pluginId, 'start');
    if (result.error) {
      this.metrics.errors++;
      this._setState(pluginId, LIFECYCLE_STATE.ERROR);
      this._logHistory(pluginId, 'start_error', result.error);
      return { error: 'start_failed', message: result.error };
    }
    this._setState(pluginId, LIFECYCLE_STATE.RUNNING);
    this._callHook(pluginId, LIFECYCLE_HOOK.AFTER_START);
    this.metrics.start++;
    this._logHistory(pluginId, 'start', null);
    return { success: true, state: LIFECYCLE_STATE.RUNNING };
  };

  PluginLifecycle.prototype.pause = function (pluginId) {
    var p = this.instances[pluginId];
    if (!p) return { error: 'not_registered' };
    if (p.state !== LIFECYCLE_STATE.RUNNING) return { error: 'invalid_state', current: p.state };
    this._callHook(pluginId, LIFECYCLE_HOOK.ON_PAUSE);
    this._callMethod(pluginId, 'pause');
    this._setState(pluginId, LIFECYCLE_STATE.PAUSED);
    this.metrics.pause++;
    this._logHistory(pluginId, 'pause', null);
    return { success: true, state: LIFECYCLE_STATE.PAUSED };
  };

  PluginLifecycle.prototype.resume = function (pluginId) {
    var p = this.instances[pluginId];
    if (!p) return { error: 'not_registered' };
    if (p.state !== LIFECYCLE_STATE.PAUSED) return { error: 'invalid_state', current: p.state };
    this._callHook(pluginId, LIFECYCLE_HOOK.ON_RESUME);
    this._callMethod(pluginId, 'resume');
    this._setState(pluginId, LIFECYCLE_STATE.RUNNING);
    this.metrics.resume++;
    this._logHistory(pluginId, 'resume', null);
    return { success: true, state: LIFECYCLE_STATE.RUNNING };
  };

  PluginLifecycle.prototype.stop = function (pluginId) {
    var p = this.instances[pluginId];
    if (!p) return { error: 'not_registered' };
    if (p.state === LIFECYCLE_STATE.STOPPED) return { error: 'already_stopped' };
    if (p.state !== LIFECYCLE_STATE.RUNNING && p.state !== LIFECYCLE_STATE.PAUSED) {
      return { error: 'invalid_state', current: p.state };
    }
    this._callHook(pluginId, LIFECYCLE_HOOK.BEFORE_STOP);
    this._callMethod(pluginId, 'stop');
    this._setState(pluginId, LIFECYCLE_STATE.STOPPED);
    this._callHook(pluginId, LIFECYCLE_HOOK.AFTER_STOP);
    this.metrics.stop++;
    this._logHistory(pluginId, 'stop', null);
    return { success: true, state: LIFECYCLE_STATE.STOPPED };
  };

  PluginLifecycle.prototype.destroy = function (pluginId) {
    var p = this.instances[pluginId];
    if (!p) return { error: 'not_registered' };
    if (p.state === LIFECYCLE_STATE.DESTROYED) return { error: 'already_destroyed' };
    if (p.state === LIFECYCLE_STATE.RUNNING) {
      // auto-stop first
      this.stop(pluginId);
    }
    this._callHook(pluginId, LIFECYCLE_HOOK.BEFORE_DESTROY);
    this._callMethod(pluginId, 'destroy');
    this._setState(pluginId, LIFECYCLE_STATE.DESTROYED);
    this._callHook(pluginId, LIFECYCLE_HOOK.AFTER_DESTROY);
    this.metrics.destroy++;
    this._logHistory(pluginId, 'destroy', null);
    return { success: true, state: LIFECYCLE_STATE.DESTROYED };
  };

  PluginLifecycle.prototype.getState = function (pluginId) {
    var p = this.instances[pluginId];
    return p ? p.state : null;
  };

  PluginLifecycle.prototype.getInstance = function (pluginId) {
    var p = this.instances[pluginId];
    return p ? p.instance : null;
  };

  PluginLifecycle.prototype.getHistory = function (pluginId) {
    return (this.history[pluginId] || []).slice();
  };

  PluginLifecycle.prototype.startAll = function () {
    var results = {};
    for (var k in this.instances) {
      if (Object.prototype.hasOwnProperty.call(this.instances, k)) {
        if (this.instances[k].state === LIFECYCLE_STATE.CREATED) this.init(k);
        if (this.instances[k].state === LIFECYCLE_STATE.INITIALIZED) this.start(k);
        results[k] = this.getState(k);
      }
    }
    return results;
  };

  PluginLifecycle.prototype.stopAll = function () {
    var results = {};
    for (var k in this.instances) {
      if (Object.prototype.hasOwnProperty.call(this.instances, k)) {
        this.stop(k);
        results[k] = this.getState(k);
      }
    }
    return results;
  };

  PluginLifecycle.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  PluginLifecycle.prototype.getSummary = function () {
    var dist = {};
    for (var k in this.instances) {
      if (Object.prototype.hasOwnProperty.call(this.instances, k)) {
        var s = this.instances[k].state;
        dist[s] = (dist[s] || 0) + 1;
      }
    }
    return {
      totalPlugins: Object.keys(this.instances).length,
      stateDistribution: dist,
      metrics: this.metrics
    };
  };

  PluginLifecycle.prototype.clear = function () {
    this.instances = {};
    this.hooks = {};
    this.history = {};
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.PluginLifecycle = PluginLifecycle;
    window.LIFECYCLE_STATE = LIFECYCLE_STATE;
    window.LIFECYCLE_HOOK = LIFECYCLE_HOOK;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PluginLifecycle: PluginLifecycle, LIFECYCLE_STATE: LIFECYCLE_STATE, LIFECYCLE_HOOK: LIFECYCLE_HOOK };
  }
})();
