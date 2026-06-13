// V331 MemoryConsensus: 简化版 Raft/Paxos
'use strict';
(function () {
  var PHASE = { FOLLOWER: 'follower', CANDIDATE: 'candidate', LEADER: 'leader' };
  function MemoryConsensus(options) {
    this.nodes = [];
    this.term = 0;
    this.leader = null;
    this.phase = PHASE.FOLLOWER;
    this.votes = {};
    this.log = [];
  }
  MemoryConsensus.prototype.addNode = function (id) {
    this.nodes.push(id);
    return id;
  };
  MemoryConsensus.prototype.startElection = function (candidateId) {
    if (this.nodes.indexOf(candidateId) === -1) return { error: 'unknown_candidate' };
    this.term++;
    this.phase = PHASE.CANDIDATE;
    this.votes = { [candidateId]: 1 };
    // Each other node votes yes
    for (var i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i] !== candidateId) this.votes[this.nodes[i]] = 1;
    }
    return this._tryElect(candidateId);
  };
  MemoryConsensus.prototype._tryElect = function (candidateId) {
    var total = Object.keys(this.votes).length;
    var yes = 0;
    for (var k in this.votes) if (this.votes[k] === 1) yes++;
    if (yes > this.nodes.length / 2) {
      this.phase = PHASE.LEADER;
      this.leader = candidateId;
      this.log.push({ at: Date.now(), event: 'elected', term: this.term, leader: candidateId });
      return { elected: true, leader: candidateId, term: this.term };
    }
    return { elected: false, votes: yes, total: total };
  };
  MemoryConsensus.prototype.appendLog = function (entry) {
    if (this.phase !== PHASE.LEADER) return { error: 'not_leader' };
    var e = Object.assign({ term: this.term, idx: this.log.length, at: Date.now() }, entry);
    this.log.push(e);
    return { success: true, entry: e };
  };
  MemoryConsensus.prototype.getLeader = function () { return this.leader; };
  MemoryConsensus.prototype.getStats = function () {
    return { nodes: this.nodes.length, term: this.term, leader: this.leader, phase: this.phase, logEntries: this.log.length };
  };
  window.MemoryConsensus = MemoryConsensus;
  window.CONSENSUS_PHASE = PHASE;
})();
