// V315 MemoryRelation: 关系类型 + 验证
'use strict';
(function () {
  var RELATIONS = ['causal', 'temporal', 'semantic', 'entity', 'hierarchy', 'contradicts', 'reinforces', 'triggers'];
  function MemoryRelation(options) {
    this.relations = (options && options.relations) || RELATIONS.slice();
    this.relations2D = {};
    this.relationsCount = 0;
  }
  MemoryRelation.prototype.isValid = function (rel) { return this.relations.indexOf(rel) !== -1; };
  MemoryRelation.prototype.allowTypePair = function (fromType, toType, allowed) {
    if (!this.relations2D[fromType]) this.relations2D[fromType] = {};
    this.relations2D[fromType][toType] = allowed !== false;
  };
  MemoryRelation.prototype.validate = function (fromType, toType, relation) {
    if (!this.isValid(relation)) return { valid: false, error: 'invalid_relation' };
    if (this.relations2D[fromType] && this.relations2D[fromType].hasOwnProperty(toType)) {
      if (!this.relations2D[fromType][toType]) return { valid: false, error: 'pair_not_allowed' };
    }
    return { valid: true, relation: relation };
  };
  MemoryRelation.prototype.add = function (fromId, toId, relation) {
    if (!this.isValid(relation)) return { error: 'invalid_relation' };
    this.relationsCount++;
    return { success: true, from: fromId, to: toId, relation: relation };
  };
  MemoryRelation.prototype.getStats = function () {
    return { relations: this.relations.length, pairsConfigured: Object.keys(this.relations2D).length, addCount: this.relationsCount };
  };
  window.MemoryRelation = MemoryRelation;
})();
