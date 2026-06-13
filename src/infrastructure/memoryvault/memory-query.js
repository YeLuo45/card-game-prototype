// V317 MemoryQuery: 分布式查询 DSL
'use strict';
(function () {
  var OP = { EQ: 'eq', NE: 'ne', GT: 'gt', LT: 'lt', IN: 'in', CONTAINS: 'contains' };
  function MemoryQuery() {
    this.queries = [];
  }
  MemoryQuery.prototype.parse = function (queryStr) {
    if (typeof queryStr !== 'string') return null;
    // Simple parser: "field op value" e.g. "type eq episodic"
    var parts = queryStr.split(/\s+/);
    if (parts.length < 3) return null;
    return { field: parts[0], op: parts[1].toLowerCase(), value: parts.slice(2).join(' ') };
  };
  MemoryQuery.prototype._match = function (entry, q) {
    if (!q) return false;
    var v = entry && entry[q.field];
    if (v == null) return false;
    switch (q.op) {
      case 'eq': return String(v) === q.value;
      case 'ne': return String(v) !== q.value;
      case 'gt': return Number(v) > Number(q.value);
      case 'lt': return Number(v) < Number(q.value);
      case 'in': return String(q.value).split(',').indexOf(String(v)) !== -1;
      case 'contains': return String(v).indexOf(q.value) !== -1;
      default: return false;
    }
  };
  MemoryQuery.prototype.execute = function (entries, queryStr) {
    if (!Array.isArray(entries)) return [];
    var q = this.parse(queryStr);
    if (!q) return [];
    var out = [];
    for (var i = 0; i < entries.length; i++) if (this._match(entries[i], q)) out.push(entries[i]);
    this.queries.push({ at: Date.now(), str: queryStr, hits: out.length });
    return out;
  };
  MemoryQuery.prototype.and = function (entries, conditions) {
    if (!Array.isArray(entries) || !Array.isArray(conditions)) return [];
    return entries.filter(function (e) {
      for (var i = 0; i < conditions.length; i++) if (!this._match(e, conditions[i])) return false;
      return true;
    }.bind(this));
  };
  MemoryQuery.prototype.getStats = function () {
    return { queries: this.queries.length };
  };
  window.MemoryQuery = MemoryQuery;
  window.QOP = OP;
})();
