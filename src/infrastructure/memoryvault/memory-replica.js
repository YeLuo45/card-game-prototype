// V319 MemoryReplica: 多副本同步 (leader/follower/quorum)
'use strict';
(function () {
  var ROLE = { LEADER: 'leader', FOLLOWER: 'follower', CANDIDATE: 'candidate' };
  function MemoryReplica(options) {
    this.replicas = [];
    this.quorum = (options && options.quorum) || 2;
    this.version = 0;
    this.leader = null;
  }
  MemoryReplica.prototype.addReplica = function (id, role) {
    this.replicas.push({ id: id, role: role || ROLE.FOLLOWER, version: 0 });
    if (role === ROLE.LEADER) this.leader = id;
    return this.replicas[this.replicas.length - 1];
  };
  MemoryReplica.prototype.propose = function (value) {
    this.version++;
    var acks = 1; // leader counts as ack
    for (var i = 0; i < this.replicas.length; i++) {
      if (this.replicas[i].role === ROLE.FOLLOWER) {
        this.replicas[i].version = this.version;
        acks++;
      }
    }
    return { version: this.version, acks: acks, quorum: acks >= this.quorum, value: value };
  };
  MemoryReplica.prototype.getLeader = function () { return this.leader; };
  MemoryReplica.prototype.electLeader = function (id) {
    this.leader = id;
    for (var i = 0; i < this.replicas.length; i++) {
      this.replicas[i].role = (this.replicas[i].id === id) ? ROLE.LEADER : ROLE.FOLLOWER;
    }
    return id;
  };
  MemoryReplica.prototype.getStats = function () {
    var byRole = {};
    for (var i = 0; i < this.replicas.length; i++) {
      byRole[this.replicas[i].role] = (byRole[this.replicas[i].role] || 0) + 1;
    }
    return { replicaCount: this.replicas.length, version: this.version, leader: this.leader, byRole: byRole };
  };
  window.MemoryReplica = MemoryReplica;
  window.REPLICA_ROLE = ROLE;
})();
