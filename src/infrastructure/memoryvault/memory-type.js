// V314 MemoryType: 类型系统
'use strict';
(function () {
  var TYPES = ['episodic', 'semantic', 'procedural', 'emotional', 'npc', 'strategic', 'meta'];
  var LAYERS = ['L0', 'L1', 'L2', 'L3', 'L4'];
  function MemoryType(options) {
    this.types = (options && options.types) || TYPES.slice();
    this.layers = (options && options.layers) || LAYERS.slice();
    this.assignments = {};
  }
  MemoryType.prototype.isValid = function (type) { return this.types.indexOf(type) !== -1; };
  MemoryType.prototype.isLayer = function (layer) { return this.layers.indexOf(layer) !== -1; };
  MemoryType.prototype.assign = function (id, type, layer) {
    if (!this.isValid(type)) return { error: 'invalid_type', success: false };
    if (!this.isLayer(layer)) return { error: 'invalid_layer', success: false };
    this.assignments[id] = { type: type, layer: layer, at: Date.now() };
    return { success: true, type: type, layer: layer };
  };
  MemoryType.prototype.getAssignment = function (id) { return this.assignments[id] || null; };
  MemoryType.prototype.filterByType = function (type, ids) {
    if (!this.isValid(type)) return [];
    var out = [];
    for (var i = 0; i < (ids || []).length; i++) {
      var a = this.assignments[ids[i]];
      if (a && a.type === type) out.push(ids[i]);
    }
    return out;
  };
  MemoryType.prototype.filterByLayer = function (layer, ids) {
    if (!this.isLayer(layer)) return [];
    var out = [];
    for (var i = 0; i < (ids || []).length; i++) {
      var a = this.assignments[ids[i]];
      if (a && a.layer === layer) out.push(ids[i]);
    }
    return out;
  };
  MemoryType.prototype.getStats = function () {
    var byType = {}, byLayer = {};
    for (var id in this.assignments) {
      var a = this.assignments[id];
      byType[a.type] = (byType[a.type] || 0) + 1;
      byLayer[a.layer] = (byLayer[a.layer] || 0) + 1;
    }
    return { total: Object.keys(this.assignments).length, byType: byType, byLayer: byLayer };
  };
  window.MemoryType = MemoryType;
})();
