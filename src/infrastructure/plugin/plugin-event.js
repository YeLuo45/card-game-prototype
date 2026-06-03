// ============================================================================
// Plugin Marketplace — V280 Direction C Iteration 8/9
// PluginEvent: 事件总线 (pub/sub/通配符/历史/过滤器)
// 来源：claude-code tool system + nanobot mesh + thunderbolt PowerSync + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  function PluginEvent(options) {
    options = options || {};
    this.maxHistory = options.maxHistory || 1000;
    this.subscribers = {};  // pattern -> [fns]
    this.history = [];      // [{event, payload, ts}]
    this.wildcardSubs = []; // [fn]
    this.metrics = {
      publishes: 0,
      deliveries: 0,
      historyTruncated: 0
    };
  }

  function patternMatch(pattern, event) {
    if (pattern === '*' || pattern === '**') return true;
    if (pattern === event) return true;
    // wildcards
    if (pattern.indexOf('*') === -1) return false;
    var regex = '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
    return new RegExp(regex).test(event);
  }

  PluginEvent.prototype.subscribe = function (pattern, fn) {
    if (typeof pattern !== 'string') return { error: 'invalid_pattern' };
    if (typeof fn !== 'function') return { error: 'invalid_fn' };
    if (pattern === '*' || pattern === '**') {
      this.wildcardSubs.push(fn);
    } else {
      if (!this.subscribers[pattern]) this.subscribers[pattern] = [];
      this.subscribers[pattern].push(fn);
    }
    return { success: true };
  };

  PluginEvent.prototype.subscribeOnce = function (pattern, fn) {
    var self = this;
    var wrapper = function (event, payload) {
      self.unsubscribe(pattern, wrapper);
      fn(event, payload);
    };
    return this.subscribe(pattern, wrapper);
  };

  PluginEvent.prototype.unsubscribe = function (pattern, fn) {
    if (pattern === '*' || pattern === '**') {
      var idx = this.wildcardSubs.indexOf(fn);
      if (idx !== -1) {
        this.wildcardSubs.splice(idx, 1);
        return { success: true };
      }
      return { error: 'not_subscribed' };
    }
    if (!this.subscribers[pattern]) return { error: 'pattern_not_found' };
    var arr = this.subscribers[pattern];
    var idx2 = arr.indexOf(fn);
    if (idx2 !== -1) {
      arr.splice(idx2, 1);
      return { success: true };
    }
    return { error: 'not_subscribed' };
  };

  PluginEvent.prototype.unsubscribeAll = function (pattern) {
    if (pattern === '*' || pattern === '**') {
      this.wildcardSubs = [];
    } else {
      delete this.subscribers[pattern];
    }
    return { success: true };
  };

  PluginEvent.prototype.publish = function (event, payload) {
    if (typeof event !== 'string') return { error: 'invalid_event' };
    this.metrics.publishes++;
    var entry = { event: event, payload: payload, ts: Date.now() };
    this.history.push(entry);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
      this.metrics.historyTruncated++;
    }
    var delivered = 0;
    var errors = [];
    // exact match
    if (this.subscribers[event]) {
      for (var i = 0; i < this.subscribers[event].length; i++) {
        try {
          this.subscribers[event][i](event, payload);
          delivered++;
        } catch (e) {
          errors.push({ pattern: event, error: e.message });
        }
      }
    }
    // pattern matches
    for (var p in this.subscribers) {
      if (Object.prototype.hasOwnProperty.call(this.subscribers, p) && p !== event && p.indexOf('*') !== -1) {
        if (patternMatch(p, event)) {
          for (var j = 0; j < this.subscribers[p].length; j++) {
            try {
              this.subscribers[p][j](event, payload);
              delivered++;
            } catch (e) {
              errors.push({ pattern: p, error: e.message });
            }
          }
        }
      }
    }
    // wildcard subs
    for (var k = 0; k < this.wildcardSubs.length; k++) {
      try {
        this.wildcardSubs[k](event, payload);
        delivered++;
      } catch (e) {
        errors.push({ pattern: '*', error: e.message });
      }
    }
    this.metrics.deliveries += delivered;
    return { success: true, delivered: delivered, errors: errors };
  };

  PluginEvent.prototype.getHistory = function (event, limit) {
    var arr = this.history;
    if (event) {
      arr = arr.filter(function (e) { return e.event === event; });
    }
    if (typeof limit === 'number' && limit > 0) {
      return arr.slice(-limit);
    }
    return arr.slice();
  };

  PluginEvent.prototype.replay = function (event, fn) {
    if (typeof fn !== 'function') return { error: 'invalid_fn' };
    var arr = event ? this.history.filter(function (e) { return e.event === event; }) : this.history;
    var count = 0;
    for (var i = 0; i < arr.length; i++) {
      try {
        fn(arr[i].event, arr[i].payload, arr[i].ts);
        count++;
      } catch (e) { /* ignore */ }
    }
    return { success: true, replayed: count };
  };

  PluginEvent.prototype.subscriberCount = function (pattern) {
    if (pattern === '*' || pattern === '**') return this.wildcardSubs.length;
    return (this.subscribers[pattern] || []).length;
  };

  PluginEvent.prototype.totalSubscribers = function () {
    var count = this.wildcardSubs.length;
    for (var k in this.subscribers) {
      if (Object.prototype.hasOwnProperty.call(this.subscribers, k)) {
        count += this.subscribers[k].length;
      }
    }
    return count;
  };

  PluginEvent.prototype.patterns = function () {
    return Object.keys(this.subscribers);
  };

  PluginEvent.prototype.clearHistory = function () {
    var cleared = this.history.length;
    this.history = [];
    return { success: true, cleared: cleared };
  };

  PluginEvent.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  PluginEvent.prototype.getSummary = function () {
    return {
      subscribers: this.totalSubscribers(),
      patterns: this.patterns().length,
      historySize: this.history.length,
      maxHistory: this.maxHistory,
      metrics: this.metrics
    };
  };

  PluginEvent.prototype.clear = function () {
    this.subscribers = {};
    this.history = [];
    this.wildcardSubs = [];
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.PluginEvent = PluginEvent;
    window.patternMatch = patternMatch;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PluginEvent: PluginEvent, patternMatch: patternMatch };
  }
})();
