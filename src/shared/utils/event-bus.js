// ============================================================================
// shared/utils/event-bus.js — 事件总线（发布订阅）
// 各模块通过它解耦，禁止跨模块直接调用
// ============================================================================
'use strict';

var _listeners = {};

var EventBus = {
  on: function(event, callback) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(callback);
  },

  off: function(event, callback) {
    if (!_listeners[event]) return;
    _listeners[event] = _listeners[event].filter(function(cb) { return cb !== callback; });
  },

  emit: function(event, data) {
    if (!_listeners[event]) return;
    _listeners[event].forEach(function(cb) {
      try { cb(data); } catch(e) { console.error('EventBus error:', e); }
    });
  },

  once: function(event, callback) {
    var self = this;
    this.on(event, function handler(data) {
      self.off(event, handler);
      callback(data);
    });
  },

  clear: function(event) {
    if (event) {
      delete _listeners[event];
    } else {
      _listeners = {};
    }
  }
};

module.exports = EventBus;
window.EventBus = EventBus;