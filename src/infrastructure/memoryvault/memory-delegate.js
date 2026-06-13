// V332 MemoryDelegate: 按 role 路由到 store
'use strict';
(function () {
  function MemoryDelegate() {
    this.routes = {}; // role -> store
    this.defaultStore = null;
  }
  MemoryDelegate.prototype.register = function (role, store) {
    this.routes[role] = store;
    return { success: true, role: role };
  };
  MemoryDelegate.prototype.setDefault = function (store) {
    this.defaultStore = store;
    return store;
  };
  MemoryDelegate.prototype.route = function (role, id, op, value) {
    var store = this.routes[role] || this.defaultStore;
    if (!store) return { error: 'no_route' };
    if (typeof store[op] !== 'function') return { error: 'invalid_op' };
    var args = (op === 'save' || op === 'put') ? [id, value] : [id];
    return store[op].apply(store, args);
  };
  MemoryDelegate.prototype.getStats = function () {
    return { roles: Object.keys(this.routes).length, hasDefault: !!this.defaultStore };
  };
  window.MemoryDelegate = MemoryDelegate;
})();
