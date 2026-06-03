// ============================================================================
// Plugin Marketplace — V275 Direction C Iteration 3/9
// PluginSandbox: 沙箱执行 (权限/资源限制/超时/错误隔离)
// 来源：claude-code tool system + nanobot mesh + thunderbolt PowerSync + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var PERMISSIONS = {
    READ_STATE: 'read_state',
    WRITE_STATE: 'write_state',
    NETWORK: 'network',
    STORAGE: 'storage',
    EVENTS: 'events',
    TIMER: 'timer',
    EVAL: 'eval',
    DOM: 'dom'
  };

  function PluginSandbox(options) {
    options = options || {};
    this.maxExecutionTime = options.maxExecutionTime || 1000;  // ms
    this.maxMemoryMB = options.maxMemoryMB || 50;
    this.maxCalls = options.maxCalls || 10000;
    this.strictMode = options.strictMode !== false;
    this.grants = {};     // pluginId -> [permissions]
    this.quotas = {};     // pluginId -> {calls, lastReset}
    this.executionLog = [];
    this.metrics = {
      executions: 0,
      timeouts: 0,
      permissionDenied: 0,
      quotaExceeded: 0,
      errors: 0
    };
  }

  PluginSandbox.prototype.grant = function (pluginId, permissions) {
    if (typeof pluginId !== 'string') return { error: 'invalid_id' };
    if (!Array.isArray(permissions)) return { error: 'invalid_permissions' };
    this.grants[pluginId] = permissions.slice();
    this.quotas[pluginId] = { calls: 0, lastReset: Date.now() };
    return { success: true, granted: permissions.length };
  };

  PluginSandbox.prototype.revoke = function (pluginId) {
    if (!this.grants[pluginId]) return { error: 'not_granted' };
    delete this.grants[pluginId];
    delete this.quotas[pluginId];
    return { success: true };
  };

  PluginSandbox.prototype.hasPermission = function (pluginId, permission) {
    var grants = this.grants[pluginId];
    if (!grants) return false;
    return grants.indexOf(permission) !== -1;
  };

  PluginSandbox.prototype.requirePermission = function (pluginId, permission) {
    if (!this.hasPermission(pluginId, permission)) {
      this.metrics.permissionDenied++;
      return false;
    }
    return true;
  };

  PluginSandbox.prototype.resetQuota = function (pluginId) {
    if (!this.quotas[pluginId]) this.quotas[pluginId] = { calls: 0, lastReset: Date.now() };
    this.quotas[pluginId].calls = 0;
    this.quotas[pluginId].lastReset = Date.now();
    return { success: true };
  };

  PluginSandbox.prototype.checkQuota = function (pluginId) {
    if (!this.quotas[pluginId]) return false;
    return this.quotas[pluginId].calls < this.maxCalls;
  };

  PluginSandbox.prototype.incrementQuota = function (pluginId) {
    if (!this.quotas[pluginId]) this.quotas[pluginId] = { calls: 0, lastReset: Date.now() };
    this.quotas[pluginId].calls++;
  };

  PluginSandbox.prototype.execute = function (pluginId, fn, args, requiredPermission) {
    if (typeof fn !== 'function') return { error: 'invalid_function' };
    // permission check
    if (requiredPermission && !this.hasPermission(pluginId, requiredPermission)) {
      this.metrics.permissionDenied++;
      this.metrics.executions++;
      this._log(pluginId, 'permission_denied', requiredPermission);
      return { error: 'permission_denied', required: requiredPermission };
    }
    // quota check
    if (!this.checkQuota(pluginId)) {
      this.metrics.quotaExceeded++;
      this.metrics.executions++;
      this._log(pluginId, 'quota_exceeded');
      return { error: 'quota_exceeded' };
    }
    this.incrementQuota(pluginId);
    // execute with timeout
    var start = Date.now();
    var timedOut = false;
    var timeoutId = setTimeout(function () { timedOut = true; }, this.maxExecutionTime);
    try {
      var result = fn.apply(null, args || []);
      clearTimeout(timeoutId);
      if (timedOut) {
        this.metrics.timeouts++;
        this.metrics.errors++;
        this.metrics.executions++;
        this._log(pluginId, 'timeout', null, Date.now() - start);
        return { error: 'timeout' };
      }
      this.metrics.executions++;
      this._log(pluginId, 'success', null, Date.now() - start);
      return { success: true, result: result, duration: Date.now() - start };
    } catch (e) {
      clearTimeout(timeoutId);
      this.metrics.executions++;
      this.metrics.errors++;
      this._log(pluginId, 'error', e.message, Date.now() - start);
      return { error: 'execution_error', message: e.message || 'unknown' };
    }
  };

  PluginSandbox.prototype.executeAsync = function (pluginId, fn, args, requiredPermission) {
    if (typeof fn !== 'function') return Promise.resolve({ error: 'invalid_function' });
    if (requiredPermission && !this.hasPermission(pluginId, requiredPermission)) {
      this.metrics.permissionDenied++;
      return Promise.resolve({ error: 'permission_denied' });
    }
    if (!this.checkQuota(pluginId)) {
      this.metrics.quotaExceeded++;
      return Promise.resolve({ error: 'quota_exceeded' });
    }
    this.incrementQuota(pluginId);
    return new Promise(function (resolve) {
      var start = Date.now();
      try {
        var p = fn.apply(null, args || []);
        if (p && typeof p.then === 'function') {
          p.then(function (result) {
            resolve({ success: true, result: result, duration: Date.now() - start });
          }).catch(function (e) {
            resolve({ error: 'async_error', message: e.message || 'unknown' });
          });
        } else {
          resolve({ success: true, result: p, duration: Date.now() - start });
        }
      } catch (e) {
        resolve({ error: 'execution_error', message: e.message || 'unknown' });
      }
    });
  };

  PluginSandbox.prototype._log = function (pluginId, status, detail, duration) {
    this.executionLog.push({
      pluginId: pluginId,
      status: status,
      detail: detail || null,
      duration: duration || 0,
      ts: Date.now()
    });
    if (this.executionLog.length > 500) this.executionLog = this.executionLog.slice(-500);
  };

  PluginSandbox.prototype.getExecutionLog = function (limit) {
    if (typeof limit === 'number' && limit > 0) return this.executionLog.slice(-limit);
    return this.executionLog.slice();
  };

  PluginSandbox.prototype.getPluginStats = function (pluginId) {
    var entries = this.executionLog.filter(function (e) { return e.pluginId === pluginId; });
    var stats = { total: entries.length, success: 0, error: 0, timeout: 0, permissionDenied: 0, quotaExceeded: 0, totalDuration: 0 };
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var dur = e.duration || 0;
      stats.totalDuration += dur;
      if (e.status === 'success') stats.success++;
      else if (e.status === 'error') stats.error++;
      else if (e.status === 'timeout') stats.timeout++;
      else if (e.status === 'permission_denied') stats.permissionDenied++;
      else if (e.status === 'quota_exceeded') stats.quotaExceeded++;
    }
    stats.averageDuration = entries.length > 0 ? stats.totalDuration / entries.length : 0;
    stats.granted = (this.grants[pluginId] || []).slice();
    stats.quota = this.quotas[pluginId] || null;
    return stats;
  };

  PluginSandbox.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  PluginSandbox.prototype.getSummary = function () {
    return {
      maxExecutionTime: this.maxExecutionTime,
      maxMemoryMB: this.maxMemoryMB,
      maxCalls: this.maxCalls,
      strictMode: this.strictMode,
      grantedPlugins: Object.keys(this.grants).length,
      logSize: this.executionLog.length,
      metrics: this.metrics
    };
  };

  PluginSandbox.prototype.clear = function () {
    this.grants = {};
    this.quotas = {};
    this.executionLog = [];
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.PluginSandbox = PluginSandbox;
    window.SANDBOX_PERMISSIONS = PERMISSIONS;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PluginSandbox: PluginSandbox, SANDBOX_PERMISSIONS: PERMISSIONS };
  }
})();
