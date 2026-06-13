// V336 MemoryEvolve: schema/策略自适应
'use strict';
(function () {
  function MemoryEvolve() {
    this.schema = {};
    this.generation = 0;
    this.history = [];
  }
  MemoryEvolve.prototype.learnSchema = function (entries) {
    if (!Array.isArray(entries) || entries.length === 0) return null;
    var fieldCounts = {};
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (e && typeof e === 'object') {
        for (var k in e) {
          if (typeof e[k] !== 'object') fieldCounts[k] = (fieldCounts[k] || 0) + 1;
        }
      }
    }
    var schema = {};
    for (var f in fieldCounts) {
      if (fieldCounts[f] >= entries.length * 0.5) schema[f] = { required: fieldCounts[f] === entries.length, count: fieldCounts[f] };
    }
    this.generation++;
    var snap = { generation: this.generation, fields: Object.keys(schema).length, at: Date.now() };
    this.history.push(snap);
    this.schema = schema;
    return schema;
  };
  MemoryEvolve.prototype.getSchema = function () { return this.schema; };
  MemoryEvolve.prototype.getStats = function () {
    return { generation: this.generation, schemaFields: Object.keys(this.schema).length, historyCount: this.history.length };
  };
  window.MemoryEvolve = MemoryEvolve;
})();
