// ============================================================================
// Plugin Marketplace — V278 Direction C Iteration 6/9
// PluginDependency: 依赖解析 (声明/解析/冲突检测/拓扑排序/安装顺序)
// 来源：claude-code tool system + nanobot mesh + thunderbolt PowerSync + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  function PluginDependency(options) {
    options = options || {};
    this.registry = options.registry || null;
    this.versions = options.versions || null;
    this.dependencies = {};  // pluginId -> [{name, version}]
    this.installed = {};     // pluginId -> version
    this.installOrder = [];
    this.metrics = {
      resolves: 0,
      conflicts: 0,
      missing: 0
    };
  }

  PluginDependency.prototype.declare = function (pluginId, dependencies) {
    if (typeof pluginId !== 'string') return { error: 'invalid_id' };
    if (!Array.isArray(dependencies)) return { error: 'invalid_dependencies' };
    // normalize: {name, version}
    var deps = [];
    for (var i = 0; i < dependencies.length; i++) {
      var d = dependencies[i];
      if (typeof d === 'string') {
        deps.push({ name: d, version: '*' });
      } else if (d && typeof d === 'object' && d.name) {
        deps.push({ name: d.name, version: d.version || '*' });
      } else {
        return { error: 'invalid_dependency_format' };
      }
    }
    this.dependencies[pluginId] = deps;
    return { success: true, count: deps.length };
  };

  PluginDependency.prototype.getDependencies = function (pluginId) {
    return (this.dependencies[pluginId] || []).slice();
  };

  PluginDependency.prototype.getDependents = function (pluginName) {
    var dependents = [];
    for (var k in this.dependencies) {
      if (Object.prototype.hasOwnProperty.call(this.dependencies, k)) {
        for (var i = 0; i < this.dependencies[k].length; i++) {
          if (this.dependencies[k][i].name === pluginName) {
            dependents.push(k);
            break;
          }
        }
      }
    }
    return dependents;
  };

  PluginDependency.prototype.markInstalled = function (pluginId, version) {
    this.installed[pluginId] = version || '*';
    return { success: true };
  };

  PluginDependency.prototype.unmarkInstalled = function (pluginId) {
    if (!this.installed[pluginId]) return { error: 'not_installed' };
    delete this.installed[pluginId];
    return { success: true };
  };

  PluginDependency.prototype.isInstalled = function (pluginId) {
    return !!this.installed[pluginId];
  };

  // ---- Detect missing ----
  PluginDependency.prototype.findMissing = function (pluginId) {
    var deps = this.dependencies[pluginId] || [];
    var missing = [];
    for (var i = 0; i < deps.length; i++) {
      if (!this.installed[deps[i].name]) {
        missing.push(deps[i]);
      }
    }
    return missing;
  };

  PluginDependency.prototype.findAllMissing = function (pluginIds) {
    var ids = Array.isArray(pluginIds) ? pluginIds : Object.keys(this.dependencies);
    var visited = {};
    var missing = {};
    var self = this;
    function visit(id) {
      if (visited[id]) return;
      visited[id] = true;
      var deps = self.dependencies[id] || [];
      for (var i = 0; i < deps.length; i++) {
        var d = deps[i];
        if (!self.installed[d.name]) {
          missing[d.name] = d;
        }
        visit(d.name);  // recurse
      }
    }
    for (var i = 0; i < ids.length; i++) visit(ids[i]);
    return Object.keys(missing).map(function (k) { return missing[k]; });
  };

  // ---- Detect conflicts ----
  PluginDependency.prototype.findConflicts = function (pluginIds) {
    var ids = Array.isArray(pluginIds) ? pluginIds : Object.keys(this.dependencies);
    var conflicts = [];
    // For each plugin, check if its constraints on dependencies are met
    for (var i = 0; i < ids.length; i++) {
      var pid = ids[i];
      var deps = this.dependencies[pid] || [];
      for (var j = 0; j < deps.length; j++) {
        var d = deps[j];
        if (this.installed[d.name] && this.versions && typeof this.versions.satisfies === 'function') {
          var installedVer = this.installed[d.name];
          if (!this.versions.satisfies(d.name, d.version) && !this.versions._hasVersion(d.name, installedVer)) {
            // check against constraint
            if (window && window.satisfiesConstraint) {
              if (!window.satisfiesConstraint(installedVer, d.version)) {
                conflicts.push({ plugin: pid, dependency: d.name, required: d.version, installed: installedVer });
              }
            }
          }
        }
      }
    }
    if (conflicts.length > 0) this.metrics.conflicts++;
    return conflicts;
  };

  // ---- Topological sort ----
  PluginDependency.prototype.topologicalSort = function (pluginIds) {
    var ids = Array.isArray(pluginIds) ? pluginIds : Object.keys(this.dependencies);
    var visited = {};
    var stack = {};
    var result = [];
    var self = this;
    function visit(id) {
      if (visited[id]) return;
      if (stack[id]) {
        throw new Error('cycle_detected:' + id);
      }
      stack[id] = true;
      var deps = self.dependencies[id] || [];
      for (var i = 0; i < deps.length; i++) {
        visit(deps[i].name);
      }
      stack[id] = false;
      visited[id] = true;
      result.push(id);
    }
    for (var i = 0; i < ids.length; i++) {
      visit(ids[i]);
    }
    return result;
  };

  PluginDependency.prototype.detectCycle = function (pluginIds) {
    var ids = Array.isArray(pluginIds) ? pluginIds : Object.keys(this.dependencies);
    var visited = {};
    var stack = {};
    var self = this;
    function visit(id) {
      if (visited[id]) return null;
      if (stack[id]) return id;
      stack[id] = true;
      var deps = self.dependencies[id] || [];
      for (var i = 0; i < deps.length; i++) {
        var r = visit(deps[i].name);
        if (r) return r;
      }
      stack[id] = false;
      visited[id] = true;
      return null;
    }
    for (var i = 0; i < ids.length; i++) {
      var cycleNode = visit(ids[i]);
      if (cycleNode) return { cycle: true, node: cycleNode };
    }
    return { cycle: false };
  };

  // ---- Resolve ----
  PluginDependency.prototype.resolve = function (pluginId) {
    if (typeof pluginId !== 'string') return { error: 'invalid_id' };
    this.metrics.resolves++;
    var missing = this.findAllMissing([pluginId]);
    if (missing.length > 0) {
      this.metrics.missing++;
      return { success: false, error: 'missing_dependencies', missing: missing };
    }
    var cycle = this.detectCycle([pluginId]);
    if (cycle.cycle) {
      return { success: false, error: 'cycle_detected', node: cycle.node };
    }
    try {
      var order = this.topologicalSort([pluginId]);
      this.installOrder = order;
      return { success: true, installOrder: order };
    } catch (e) {
      if (e.message && e.message.indexOf('cycle_detected') === 0) {
        return { success: false, error: 'cycle_detected', node: e.message.split(':')[1] };
      }
      return { success: false, error: e.message };
    }
  };

  PluginDependency.prototype.resolveAll = function (pluginIds) {
    var ids = Array.isArray(pluginIds) ? pluginIds : Object.keys(this.dependencies);
    return ids.map(function (id) { return { pluginId: id, result: this.resolve(id) }; }, this);
  };

  PluginDependency.prototype.getInstallOrder = function () {
    return this.installOrder.slice();
  };

  PluginDependency.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  PluginDependency.prototype.getSummary = function () {
    return {
      declaredPlugins: Object.keys(this.dependencies).length,
      installedPlugins: Object.keys(this.installed).length,
      lastInstallOrder: this.installOrder.slice(),
      metrics: this.metrics
    };
  };

  PluginDependency.prototype.clear = function () {
    this.dependencies = {};
    this.installed = {};
    this.installOrder = [];
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.PluginDependency = PluginDependency;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PluginDependency: PluginDependency };
  }
})();
