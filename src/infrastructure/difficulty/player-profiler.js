// ============================================================================
// Adaptive Difficulty Engine — V339 Direction A Iter 1/30
// PlayerProfiler: 6维度玩家画像 (skill/aggression/caution/economy/exploration/social)
// 来源：thunderbolt 反馈循环（实时画像驱动难度适配）
// ============================================================================
'use strict';

(function () {

  // 6 dimensions of player radar
  var DIMENSIONS = ['skill', 'aggression', 'caution', 'economy', 'exploration', 'social'];
  var DEFAULT_SCORE = 50;

  // Event type → dimension deltas (each event shifts 1-3 dimensions)
  var EVENT_IMPACT = {
    battle_win:        { skill: +3, aggression: +1 },
    battle_loss:       { skill: -1, caution: +2 },
    elite_win:         { skill: +5, aggression: +3 },
    elite_loss:        { caution: +3, economy: +1 },
    boss_win:          { skill: +8, aggression: +4 },
    boss_loss:         { caution: +4, exploration: +1 },
    card_attack:       { aggression: +1 },
    card_skill:        { skill: +1 },
    card_defend:       { caution: +2 },
    card_curse:        { caution: +1, exploration: +1 },
    shop_visit:        { economy: +2 },
    shop_purchase:     { economy: +3 },
    shop_skip:         { caution: +1, economy: -1 },
    rest_use:          { caution: +2 },
    event_explore:     { exploration: +3 },
    event_skip:        { caution: +2 },
    npc_help:          { social: +2 },
    npc_refuse:        { caution: +1 },
    quit_early:        { caution: +3, social: -1 },
    fast_clear:        { skill: +2, aggression: +2 },
    long_grind:        { caution: +2, economy: +1 }
  };

  // Archetype classification by max dimension
  var ARCHETYPE_THRESHOLD = 65;  // dimension must exceed this to claim archetype

  // Player segment by engagement + skill
  var SEGMENT_THRESHOLDS = {
    hardcore:   { events: 200, skill: 75 },
    engaged:    { events: 100, skill: 60 },
    casual:     { events: 30,  skill: 0 },
    newcomer:   { events: 0,   skill: 0 }
  };

  function clamp(v, lo, hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  function PlayerProfiler(options) {
    this.playerId = (options && options.playerId) || 'player_' + Date.now();
    this.windowSize = (options && options.windowSize) || 50;
    this.events = [];
    this.totalRecorded = 0;
    this.radar = {};
    var i;
    for (i = 0; i < DIMENSIONS.length; i++) {
      this.radar[DIMENSIONS[i]] = DEFAULT_SCORE;
    }
    this.createdAt = Date.now();
    this.lastUpdate = Date.now();
  }

  PlayerProfiler.prototype._applyImpact = function (eventType) {
    var impact = EVENT_IMPACT[eventType];
    if (!impact) return null;
    var dim;
    for (dim in impact) {
      if (Object.prototype.hasOwnProperty.call(this.radar, dim)) {
        this.radar[dim] = clamp(this.radar[dim] + impact[dim], 0, 100);
      }
    }
    return impact;
  };

  PlayerProfiler.prototype.recordEvent = function (eventType, metadata) {
    if (!eventType || typeof eventType !== 'string') {
      return { success: false, error: 'invalid_event_type' };
    }
    if (!EVENT_IMPACT[eventType]) {
      return { success: false, error: 'unknown_event_type', eventType: eventType };
    }
    var impact = this._applyImpact(eventType);
    var entry = {
      type: eventType,
      ts: Date.now(),
      impact: impact,
      meta: metadata || null
    };
    this.events.push(entry);
    this.totalRecorded++;
    if (this.events.length > this.windowSize) {
      this.events.shift();
    }
    this.lastUpdate = Date.now();
    return { success: true, entry: entry, radar: this.radar };
  };

  PlayerProfiler.prototype.getRadar = function () {
    var copy = {};
    var dim;
    for (dim in this.radar) {
      if (Object.prototype.hasOwnProperty.call(this.radar, dim)) {
        copy[dim] = this.radar[dim];
      }
    }
    return copy;
  };

  PlayerProfiler.prototype.getMaxDimension = function () {
    var maxDim = null;
    var maxVal = -1;
    var dim;
    for (dim in this.radar) {
      if (this.radar[dim] > maxVal) {
        maxVal = this.radar[dim];
        maxDim = dim;
      }
    }
    return { dimension: maxDim, value: maxVal };
  };

  PlayerProfiler.prototype.classifyArchetype = function () {
    var max = this.getMaxDimension();
    if (!max.dimension || max.value < ARCHETYPE_THRESHOLD) {
      return 'balanced';
    }
    var archetypeMap = {
      skill: 'strategist',
      aggression: 'berserker',
      caution: 'guardian',
      economy: 'merchant',
      exploration: 'explorer',
      social: 'diplomat'
    };
    return archetypeMap[max.dimension] || 'balanced';
  };

  PlayerProfiler.prototype.getSegment = function () {
    var events = this.totalRecorded;
    var skill = this.radar.skill;
    if (events >= SEGMENT_THRESHOLDS.hardcore.events && skill >= SEGMENT_THRESHOLDS.hardcore.skill) {
      return 'hardcore';
    }
    if (events >= SEGMENT_THRESHOLDS.engaged.events && skill >= SEGMENT_THRESHOLDS.engaged.skill) {
      return 'engaged';
    }
    if (events >= SEGMENT_THRESHOLDS.casual.events) {
      return 'casual';
    }
    return 'newcomer';
  };

  PlayerProfiler.prototype.getMastery = function () {
    var values = [];
    var dim;
    for (dim in this.radar) {
      if (Object.prototype.hasOwnProperty.call(this.radar, dim)) {
        values.push(this.radar[dim]);
      }
    }
    if (values.length === 0) return 0;
    var sum = 0;
    var i;
    for (i = 0; i < values.length; i++) sum += values[i];
    return sum / values.length;
  };

  PlayerProfiler.prototype.getReport = function () {
    return {
      playerId: this.playerId,
      radar: this.getRadar(),
      archetype: this.classifyArchetype(),
      segment: this.getSegment(),
      mastery: this.getMastery(),
      eventCount: this.events.length,
      totalRecorded: this.totalRecorded,
      windowSize: this.windowSize,
      createdAt: this.createdAt,
      lastUpdate: this.lastUpdate
    };
  };

  PlayerProfiler.prototype.reset = function () {
    this.events = [];
    this.totalRecorded = 0;
    var dim;
    for (dim in this.radar) {
      this.radar[dim] = DEFAULT_SCORE;
    }
    this.createdAt = Date.now();
    this.lastUpdate = Date.now();
  };

  // Expose
  if (typeof window !== 'undefined') {
    window.PlayerProfiler = PlayerProfiler;
    window.PLAYER_PROFILER_DIMENSIONS = DIMENSIONS;
    window.PLAYER_PROFILER_EVENT_IMPACT = EVENT_IMPACT;
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PlayerProfiler: PlayerProfiler, DIMENSIONS: DIMENSIONS, EVENT_IMPACT: EVENT_IMPACT };
  }

})();
