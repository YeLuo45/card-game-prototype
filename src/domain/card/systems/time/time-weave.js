// ============================================================================
// Card Time Weave — V197 Direction B
// Time weaving with temporal threads, timeline branching and chronomancer abilities
// chatdev + generic-agent autonomous pursuit
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // TemporalThread: A thread of time
  // -----------------------------------------------------------------------
  function TemporalThread(threadId, name, era, strength, flexibility) {
    this.threadId = threadId;
    this.name = name || threadId;
    this.era = era || 'present'; // past, present, future, ancient, void
    this.strength = strength || 50; // 0-100
    this.flexibility = flexibility || 1; // multiplier for bends
    this.active = true;
    this.woven = false;
  }

  TemporalThread.prototype.bend = function (amount) {
    if (!this.active) return { error: 'thread_inactive' };
    this.strength = Math.max(0, this.strength - amount);
    if (this.strength <= 0) this.active = false;
    return { success: true, strength: this.strength, active: this.active };
  };

  TemporalThread.prototype.mend = function (amount) {
    this.strength = Math.min(100, this.strength + amount);
    this.active = true;
    return { success: true, strength: this.strength };
  };

  TemporalThread.prototype.weave = function () {
    if (this.woven) return { error: 'already_woven' };
    this.woven = true;
    return { success: true, strength: this.strength };
  };

  TemporalThread.prototype.getStability = function () {
    if (this.strength >= 80) return 'stable';
    if (this.strength >= 50) return 'fragile';
    if (this.strength >= 20) return 'cracking';
    return 'severed';
  };

  // -----------------------------------------------------------------------
  // TimelineBranch: A branching timeline
  // -----------------------------------------------------------------------
  function TimelineBranch(branchId, name, parentBranchId, era, stability) {
    this.branchId = branchId;
    this.name = name || branchId;
    this.parentBranchId = parentBranchId || null;
    this.era = era || 'present';
    this.stability = stability || 70;
    this.active = true;
    this.depth = 0;
    this.events = [];
  }

  TimelineBranch.prototype.addEvent = function (event) {
    this.events.push({ event: event, timestamp: Date.now() });
    return { success: true, eventCount: this.events.length };
  };

  TimelineBranch.prototype.getDepth = function () { return this.depth; };

  TimelineBranch.prototype.setDepth = function (d) { this.depth = d; };

  TimelineBranch.prototype.merge = function (targetBranch) {
    if (!this.active || !targetBranch.active) return { error: 'branch_inactive' };
    this.events = this.events.concat(targetBranch.events);
    targetBranch.active = false;
    return { success: true, eventsPreserved: this.events.length };
  };

  // -----------------------------------------------------------------------
  // ChronomancerAbility: Ability of a time mage
  // -----------------------------------------------------------------------
  function ChronomancerAbility(abilityId, name, timeCost, cooldown, power) {
    this.abilityId = abilityId;
    this.name = name || abilityId;
    this.timeCost = timeCost || 10;
    this.cooldown = cooldown || 0;
    this.power = power || 1;
    this.currentCooldown = 0;
    this.uses = 0;
  }

  ChronomancerAbility.prototype.use = function (availableTime) {
    if (this.currentCooldown > 0) return { error: 'on_cooldown', remaining: this.currentCooldown };
    if (availableTime < this.timeCost) return { error: 'insufficient_time' };
    this.currentCooldown = this.cooldown;
    this.uses++;
    return { success: true, timeSpent: this.timeCost, uses: this.uses };
  };

  ChronomancerAbility.prototype.tickCooldown = function () {
    if (this.currentCooldown > 0) this.currentCooldown--;
  };

  ChronomancerAbility.prototype.getCooldownRemaining = function () { return this.currentCooldown; };

  // -----------------------------------------------------------------------
  // TimeWeave: Main time weaving manager
  // -----------------------------------------------------------------------
  function TimeWeave(weaveId, name) {
    this.weaveId = weaveId || ('weave_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Time Weave';
    this.threads = {};
    this.branches = {};
    this.abilities = {};
    this.threadCounter = 0;
    this.branchCounter = 0;
    this.abilityCounter = 0;
    this._seedDefault();
  }

  TimeWeave.prototype._seedDefault = function () {
    var t = new TemporalThread('thread_default', 'Main Thread', 'present', 80, 2);
    this.threads['thread_default'] = t;
    var b = new TimelineBranch('branch_default', 'Prime Timeline', null, 'present', 90);
    this.branches['branch_default'] = b;
  };

  TimeWeave.prototype.addThread = function (thread) {
    this.threads[thread.threadId] = thread;
    return { success: true, count: Object.keys(this.threads).length };
  };

  TimeWeave.prototype.addBranch = function (branch) {
    this.branches[branch.branchId] = branch;
    return { success: true, count: Object.keys(this.branches).length };
  };

  TimeWeave.prototype.addAbility = function (ability) {
    this.abilities[ability.abilityId] = ability;
    return { success: true, count: Object.keys(this.abilities).length };
  };

  TimeWeave.prototype.getThread = function (id) { return this.threads[id] || null; };
  TimeWeave.prototype.getBranch = function (id) { return this.branches[id] || null; };
  TimeWeave.prototype.getAbility = function (id) { return this.abilities[id] || null; };

  TimeWeave.prototype.getAllBranches = function () {
    return Object.keys(this.branches).map(function (k) { return this.branches[k]; }.bind(this));
  };

  TimeWeave.prototype.tickAllCooldowns = function () {
    for (var aid in this.abilities) this.abilities[aid].tickCooldown();
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.TemporalThread = TemporalThread;
  window.TimelineBranch = TimelineBranch;
  window.ChronomancerAbility = ChronomancerAbility;
  window.TimeWeave = TimeWeave;
})();