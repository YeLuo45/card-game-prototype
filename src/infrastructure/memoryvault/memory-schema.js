// V313 MemorySchema: JSON Schema 验证
'use strict';
(function () {
  function MemorySchema(schema) {
    this.schema = schema || {};
    this.validations = 0;
    this.failures = 0;
  }
  MemorySchema.prototype._checkType = function (val, expected) {
    if (expected === 'string') return typeof val === 'string';
    if (expected === 'number') return typeof val === 'number' && !isNaN(val);
    if (expected === 'boolean') return typeof val === 'boolean';
    if (expected === 'object') return val !== null && typeof val === 'object' && !Array.isArray(val);
    if (expected === 'array') return Array.isArray(val);
    return true;
  };
  MemorySchema.prototype.validate = function (obj) {
    this.validations++;
    var errors = [];
    if (!obj || typeof obj !== 'object') { this.failures++; return { valid: false, errors: ['not_an_object'] }; }
    for (var key in this.schema) {
      if (!Object.prototype.hasOwnProperty.call(this.schema, key)) continue;
      var rule = this.schema[key];
      var present = Object.prototype.hasOwnProperty.call(obj, key);
      if (rule.required && !present) { errors.push('missing_' + key); continue; }
      if (!present) continue;
      if (rule.type && !this._checkType(obj[key], rule.type)) errors.push('type_mismatch_' + key);
      if (rule.minLength != null && typeof obj[key] === 'string' && obj[key].length < rule.minLength) errors.push('min_length_' + key);
      if (rule.max != null && typeof obj[key] === 'number' && obj[key] > rule.max) errors.push('max_' + key);
      if (rule.min != null && typeof obj[key] === 'number' && obj[key] < rule.min) errors.push('min_' + key);
      if (rule.enum && rule.enum.indexOf(obj[key]) === -1) errors.push('enum_' + key);
    }
    if (errors.length > 0) this.failures++;
    return { valid: errors.length === 0, errors: errors };
  };
  MemorySchema.prototype.getStats = function () {
    return { validations: this.validations, failures: this.failures, successRate: this.validations > 0 ? 1 - this.failures / this.validations : 1 };
  };
  window.MemorySchema = MemorySchema;
})();
