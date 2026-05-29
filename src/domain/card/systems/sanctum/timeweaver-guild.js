// ============================================================================
// Card Timeweaver Guild — V224 Direction C
// Timeweaver guild with temporal weaving, age progression, and time echoes
// thunderbolt feedback loops + generic-agent autonomous pursuit
// ============================================================================
'use strict';

(function () {
  // ----------------------------------------------------------------=======
  // TemporalThread: A thread of time woven into a card
  // ----------------------------------------------------------------=======
  function TemporalThread(threadId, name, age, tension) {
    this.threadId = threadId;
    this.name = name || threadId;
    this.age = (age !== undefined) ? age : 1; // nullish coalescing
    this.tension = (tension !== undefined) ? tension : 50; // nullish coalescing
    this.echoes = [];
    this.active = true;
  }

  TemporalThread.prototype.weave = function () {
    if (!this.active) return { error: 'thread_inactive' };
    var echo = this.age * 5 + Math.floor(this.tension / 10);
    this.echoes.push(echo);
    return { success: true, echo: echo, total: this.echoes.length };
  };

  TemporalThread.prototype.ageForward = function (years) {
    this.age += years;
    return { success: true, age: this.age };
  };

  TemporalThread.prototype.getThreadPower = function () {
    if (!this.active) return 0;
    return this.age * 20 + this.tension + this.echoes.reduce(function (s, e) { return s + e; }, 0);
  };

  // ----------------------------------------------------------------=======
  // AgeProgression: Cards that age over time
  // ----------------------------------------------------------------=======
  function AgeProgression(progId, name, baseAge, maxAge) {
    this.progId = progId;
    this.name = name || progId;
    this.age = (baseAge !== undefined) ? baseAge : 1; // nullish coalescing
    this.maxAge = maxAge || 100;
    this.maturity = 0; // 0-10
    this.milestones = [];
  }

  AgeProgression.prototype.grow = function (years) {
    this.age = Math.min(this.maxAge, this.age + years);
    this.maturity = Math.min(10, Math.floor(this.age / 10));
    return { success: true, age: this.age, maturity: this.maturity };
  };

  AgeProgression.prototype.addMilestone = function (year) {
    if (this.age < year) return { error: 'milestone_future' };
    this.milestones.push(year);
    return { success: true, milestones: this.milestones.length };
  };

  AgeProgression.prototype.getProgressionPower = function () {
    return this.age * 5 + this.maturity * 10 + this.milestones.length * 15;
  };

  // ----------------------------------------------------------------=======
  // TimeEcho: A memory of past state
  // ----------------------------------------------------------------=======
  function TimeEcho(echoId, name, strength, copies) {
    this.echoId = echoId;
    this.name = name || echoId;
    this.strength = (strength !== undefined) ? strength : 40; // nullish coalescing
    this.copies = copies || [];
    this.rewound = false;
  }

  TimeEcho.prototype.addCopy = function (cardState) {
    if (this.copies.length >= 5) return { error: 'max_copies' };
    this.copies.push(cardState);
    return { success: true, count: this.copies.length };
  };

  TimeEcho.prototype.rewind = function () {
    if (this.copies.length === 0) return { error: 'no_copies' };
    this.rewound = true;
    return { success: true, copy: this.copies[this.copies.length - 1] };
  };

  TimeEcho.prototype.getEchoPower = function () {
    return this.rewound ? this.strength * this.copies.length * 2 : this.strength * this.copies.length;
  };

  // ----------------------------------------------------------------=======
  // TimeweaverGuild: Main guild system
  // ----------------------------------------------------------------=======
  function TimeweaverGuild(guildId, name, guildRank) {
    this.guildId = guildId;
    this.name = name || 'Timeweaver Guild';
    this.guildRank = guildRank || 1;
    this.threads = {};
    this.progressions = {};
    this.echoes = {};
  }

  TimeweaverGuild.prototype.addThread = function (t) {
    this.threads[t.threadId] = t;
    return { success: true, count: Object.keys(this.threads).length };
  };

  TimeweaverGuild.prototype.addProgression = function (p) {
    this.progressions[p.progId] = p;
    return { success: true, count: Object.keys(this.progressions).length };
  };

  TimeweaverGuild.prototype.addEcho = function (e) {
    this.echoes[e.echoId] = e;
    return { success: true, count: Object.keys(this.echoes).length };
  };

  TimeweaverGuild.prototype.getGuildPower = function () {
    var total = 0;
    for (var id in this.threads) total += this.threads[id].getThreadPower();
    for (var id in this.progressions) total += this.progressions[id].getProgressionPower();
    for (var id in this.echoes) total += this.echoes[id].getEchoPower();
    total += this.guildRank * 20;
    return total;
  };

  window.TemporalThread = TemporalThread;
  window.AgeProgression = AgeProgression;
  window.TimeEcho = TimeEcho;
  window.TimeweaverGuild = TimeweaverGuild;
})();