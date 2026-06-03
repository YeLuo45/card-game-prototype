// ============================================================================
// Code Generation — V297 Direction E Iteration 7/9
// TypeInfer: 类型推断 (基本类型/对象/数组/函数签名/泛型)
// 来源：claude-code + generic-agent + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var PRIMITIVES = ['string', 'number', 'boolean', 'null', 'undefined', 'symbol', 'bigint'];

  function TypeInfer(options) {
    options = options || {};
    this.types = {};  // name -> {kind, fields, params, returns, ...}
    this.typeCounter = 0;
    this.metrics = {
      defined: 0,
      inferences: 0
    };
  }

  // ---- Define a type ----
  TypeInfer.prototype.define = function (name, definition) {
    if (typeof name !== 'string' || name.length === 0) return { error: 'invalid_name' };
    if (!definition || typeof definition !== 'object') return { error: 'invalid_definition' };
    var def = JSON.parse(JSON.stringify(definition));
    this.types[name] = { name: name, kind: def.kind || 'object', definition: def };
    this.metrics.defined++;
    return { success: true, name: name };
  };

  TypeInfer.prototype.remove = function (name) {
    if (!this.types[name]) return { error: 'not_found' };
    delete this.types[name];
    return { success: true };
  };

  TypeInfer.prototype.get = function (name) {
    return this.types[name] || null;
  };

  TypeInfer.prototype.list = function () {
    var arr = [];
    for (var k in this.types) {
      if (Object.prototype.hasOwnProperty.call(this.types, k)) arr.push(this.types[k]);
    }
    return arr;
  };

  // ---- Primitive inference ----
  TypeInfer.prototype.inferPrimitive = function (value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return 'integer';
      return 'number';
    }
    if (typeof value === 'string') return 'string';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'function') return 'function';
    if (typeof value === 'object') return 'object';
    return 'unknown';
  };

  // ---- Infer from a value (deep) ----
  TypeInfer.prototype.inferFromValue = function (value) {
    this.metrics.inferences++;
    var t = this.inferPrimitive(value);
    if (t === 'array') {
      var elementTypes = [];
      for (var i = 0; i < value.length; i++) {
        elementTypes.push(this.inferPrimitive(value[i]));
      }
      var unique = elementTypes.filter(function (v, i, a) { return a.indexOf(v) === i; });
      return { kind: 'array', element: unique.length === 1 ? unique[0] : unique.join('|'), length: value.length };
    }
    if (t === 'object') {
      var fields = {};
      for (var k in value) {
        if (Object.prototype.hasOwnProperty.call(value, k)) {
          fields[k] = this.inferFromValue(value[k]);
        }
      }
      return { kind: 'object', fields: fields };
    }
    if (t === 'function') {
      var fnStr = value.toString();
      var paramMatch = fnStr.match(/function[^(]*\(([^)]*)\)/);
      var params = paramMatch ? paramMatch[1].split(',').map(function (p) { return p.trim(); }).filter(function (x) { return x; }) : [];
      return { kind: 'function', params: params, length: value.length };
    }
    return { kind: t };
  };

  // ---- Infer from a function signature ----
  TypeInfer.prototype.inferFromFunction = function (fn) {
    if (typeof fn !== 'function') return { error: 'invalid_function' };
    this.metrics.inferences++;
    var fnStr = fn.toString();
    var paramMatch = fnStr.match(/function[^(]*\(([^)]*)\)/);
    var params = paramMatch ? paramMatch[1].split(',').map(function (p) { return p.trim(); }).filter(function (x) { return x; }) : [];
    // try to infer return by running
    var returns = 'unknown';
    try {
      if (params.length === 0) {
        var r = fn();
        if (r !== undefined) returns = this.inferPrimitive(r);
      }
    } catch (e) { /* ignore */ }
    return {
      kind: 'function',
      params: params,
      returns: returns,
      length: fn.length
    };
  };

  // ---- Compatibility check ----
  TypeInfer.prototype.compatible = function (type1, type2) {
    if (type1 === type2) return true;
    if (type1 === 'number' && type2 === 'integer') return true;
    if (type1 === 'integer' && type2 === 'number') return true;
    if (type1 === 'unknown' || type2 === 'unknown') return true;
    if (type1 === 'any' || type2 === 'any') return true;
    return false;
  };

  // ---- Validate value against type definition ----
  TypeInfer.prototype.validate = function (value, typeName) {
    var t = this.types[typeName];
    if (!t) return { error: 'type_not_found' };
    var inferred = this.inferFromValue(value);
    if (t.kind === 'object' && inferred.kind === 'object') {
      var missing = [];
      var extra = {};
      var valid = true;
      var fields = t.definition.fields || {};
      for (var fName in fields) {
        if (Object.prototype.hasOwnProperty.call(fields, fName)) {
          if (!inferred.fields[fName]) missing.push(fName);
        }
      }
      for (var f2 in inferred.fields) {
        if (Object.prototype.hasOwnProperty.call(inferred.fields, f2)) {
          if (!fields[f2]) extra[f2] = true;
        }
      }
      return { valid: missing.length === 0, missing: missing, extra: Object.keys(extra) };
    }
    return { valid: this.compatible(inferred.kind, t.kind) };
  };

  // ---- Generic type parameters ----
  TypeInfer.prototype.defineGeneric = function (name, typeParams, body) {
    if (typeof name !== 'string' || name.length === 0) return { error: 'invalid_name' };
    if (!Array.isArray(typeParams)) return { error: 'invalid_params' };
    if (!body || typeof body !== 'object') return { error: 'invalid_body' };
    this.types[name] = {
      name: name,
      kind: 'generic',
      typeParams: typeParams,
      body: body
    };
    this.metrics.defined++;
    return { success: true };
  };

  // ---- Schema validation (TypeScript-like interface) ----
  TypeInfer.prototype.defineInterface = function (name, schema) {
    if (typeof name !== 'string' || name.length === 0) return { error: 'invalid_name' };
    if (!schema || typeof schema !== 'object') return { error: 'invalid_schema' };
    var fields = {};
    for (var k in schema) {
      if (Object.prototype.hasOwnProperty.call(schema, k)) {
        var f = schema[k];
        if (typeof f === 'string') fields[k] = { type: f, optional: false };
        else if (f && typeof f === 'object') fields[k] = { type: f.type || 'any', optional: !!f.optional, default: f.default };
        else fields[k] = { type: typeof f, optional: false };
      }
    }
    this.types[name] = { name: name, kind: 'interface', fields: fields };
    this.metrics.defined++;
    return { success: true, name: name, fields: fields };
  };

  TypeInfer.prototype.validateInterface = function (value, interfaceName) {
    var t = this.types[interfaceName];
    if (!t) return { error: 'interface_not_found' };
    if (typeof value !== 'object' || value === null) return { valid: false, error: 'not_object' };
    var errors = [];
    for (var k in t.fields) {
      if (Object.prototype.hasOwnProperty.call(t.fields, k)) {
        var field = t.fields[k];
        var val = value[k];
        if (val === undefined) {
          if (!field.optional) errors.push({ field: k, error: 'missing' });
        } else {
          var actual = this.inferPrimitive(val);
          if (!this.compatible(actual, field.type)) {
            errors.push({ field: k, error: 'type_mismatch', expected: field.type, actual: actual });
          }
        }
      }
    }
    return { valid: errors.length === 0, errors: errors };
  };

  // ---- Union type check ----
  TypeInfer.prototype.matchUnion = function (value, types) {
    if (!Array.isArray(types)) return false;
    var t = this.inferPrimitive(value);
    return types.indexOf(t) !== -1;
  };

  TypeInfer.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  TypeInfer.prototype.getSummary = function () {
    return {
      totalTypes: Object.keys(this.types).length,
      metrics: this.metrics
    };
  };

  TypeInfer.prototype.clear = function () {
    this.types = {};
    this.metrics = { defined: 0, inferences: 0 };
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.TypeInfer = TypeInfer;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TypeInfer: TypeInfer };
  }
})();
