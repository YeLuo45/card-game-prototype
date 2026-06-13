// V327 MemoryAudit: 不可变审计日志 + 完整性证明
'use strict';
(function () {
  function MemoryAudit() {
    this.entries = [];
    this.chain = []; // running hash chain
  }
  function hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
    return (h & 0x7fffffff).toString(36);
  }
  MemoryAudit.prototype.log = function (action, actor, data) {
    var prevHash = this.chain.length > 0 ? this.chain[this.chain.length - 1] : '0';
    var entry = { id: 'audit_' + this.entries.length, at: Date.now(), action: action, actor: actor, data: data, prevHash: prevHash };
    var entryStr = JSON.stringify(entry);
    var entryHash = hash(entryStr);
    entry.hash = entryHash;
    this.entries.push(entry);
    this.chain.push(entryHash);
    return entry;
  };
  MemoryAudit.prototype.verify = function () {
    var h = '0';
    for (var i = 0; i < this.entries.length; i++) {
      var e = this.entries[i];
      var str = JSON.stringify({ id: e.id, at: e.at, action: e.action, actor: e.actor, data: e.data, prevHash: h });
      var computed = hash(str);
      if (computed !== e.hash) return { valid: false, brokenAt: i };
      h = e.hash;
    }
    return { valid: true, count: this.entries.length };
  };
  MemoryAudit.prototype.filter = function (action) {
    return this.entries.filter(function (e) { return e.action === action; });
  };
  MemoryAudit.prototype.getStats = function () {
    var byAction = {};
    for (var i = 0; i < this.entries.length; i++) byAction[this.entries[i].action] = (byAction[this.entries[i].action] || 0) + 1;
    return { total: this.entries.length, byAction: byAction };
  };
  window.MemoryAudit = MemoryAudit;
})();
