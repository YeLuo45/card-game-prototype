// ============================================================================
// shared/utils/storage.js — localStorage 抽象层
// 所有模块通过此模块访问 localStorage，禁止直接操作 global.localStorage
// ============================================================================
'use strict';

var _storage = null;

function _getStorage() {
  if (_storage) return _storage;
  if (typeof localStorage !== 'undefined') {
    _storage = localStorage;
  } else {
    // Node.js 测试环境 mock
    _storage = {};
    global.localStorage = {
      getItem: function(k) { return _storage[k] || null; },
      setItem: function(k, v) { _storage[k] = v; },
      removeItem: function(k) { delete _storage[k]; },
      clear: function() { _storage = {}; }
    };
  }
  return _storage;
}

var Storage = {
  getItem: function(key, defaultVal) {
    var val = _getStorage().getItem(key);
    if (val === null) return defaultVal;
    try { return JSON.parse(val); } catch(e) { return val; }
  },

  setItem: function(key, value) {
    var val = typeof value === 'string' ? value : JSON.stringify(value);
    _getStorage().setItem(key, val);
  },

  removeItem: function(key) {
    _getStorage().removeItem(key);
  },

  clear: function() {
    _getStorage().clear();
  },

  // 批量读取
  getItems: function(keys) {
    var result = {};
    for (var i = 0; i < keys.length; i++) {
      result[keys[i]] = this.getItem(keys[i]);
    }
    return result;
  },

  // 批量写入
  setItems: function(obj) {
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) this.setItem(k, obj[k]);
    }
  },

  // 检查 key 是否存在
  has: function(key) {
    return _getStorage().getItem(key) !== null;
  }
};

module.exports = Storage;
window.Storage = Storage;