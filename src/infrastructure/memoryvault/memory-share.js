// V330 MemoryShare: 多 Agent 读写协调
'use strict';
(function () {
  var MODE = { READ: 'read', WRITE: 'write', DENY: 'deny' };
  function MemoryShare() {
    this.permissions = {}; // agentId -> {keys: {key: mode}}
    this.locked = {};
    this.shareLog = [];
  }
  MemoryShare.prototype.grant = function (agentId, key, mode) {
    if (!this.permissions[agentId]) this.permissions[agentId] = { keys: {} };
    this.permissions[agentId].keys[key] = mode;
    return { success: true, agent: agentId, key: key, mode: mode };
  };
  MemoryShare.prototype.revoke = function (agentId, key) {
    if (!this.permissions[agentId] || !this.permissions[agentId].keys[key]) return false;
    delete this.permissions[agentId].keys[key];
    return true;
  };
  MemoryShare.prototype.canAccess = function (agentId, key, op) {
    var p = this.permissions[agentId];
    if (!p) return false;
    var mode = p.keys[key] || p.keys['*'];
    if (mode === MODE.DENY) return false;
    if (mode === MODE.READ && op === 'write') return false;
    return mode === MODE.READ || mode === MODE.WRITE;
  };
  MemoryShare.prototype.lock = function (agentId, key) {
    if (this.locked[key] && this.locked[key] !== agentId) return { error: 'locked_by_other' };
    this.locked[key] = agentId;
    return { success: true, lockedBy: agentId };
  };
  MemoryShare.prototype.unlock = function (agentId, key) {
    if (this.locked[key] !== agentId) return { error: 'not_owner' };
    delete this.locked[key];
    return { success: true };
  };
  MemoryShare.prototype.getStats = function () {
    return { agents: Object.keys(this.permissions).length, locks: Object.keys(this.locked).length };
  };
  window.MemoryShare = MemoryShare;
  window.SHARE_MODE = MODE;
})();
