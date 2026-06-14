// ============================================================================
// Adaptive Difficulty Engine — V348 Direction A Iter 10/30
// ChallengeGenerator: L-system 约束求解 → 个性化关卡布局
// 来源：nanobot 分布式 mesh（多约束并行求解）
// ============================================================================
'use strict';

(function () {

  var ENCOUNTER_TYPES = ['battle', 'elite', 'rest', 'shop', 'event', 'treasure'];

  function clamp(v, lo, hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  function ChallengeGenerator(options) {
    this.minRooms = (options && options.minRooms) || 5;
    this.maxRooms = (options && options.maxRooms) || 12;
    this.targetDifficulty = (options && options.targetDifficulty) || 50;
    this.seed = (options && options.seed) || Date.now();
  }

  // Simple L-system: F = fill, B = battle, E = elite, R = rest, S = shop, V = event, T = treasure
  ChallengeGenerator.prototype.generate = function (difficulty, roomCount) {
    var diff = (typeof difficulty === 'number') ? difficulty : this.targetDifficulty;
    var n = (typeof roomCount === 'number' && roomCount >= this.minRooms)
      ? Math.min(roomCount, this.maxRooms)
      : this.minRooms + Math.floor((this.seed % (this.maxRooms - this.minRooms + 1)));
    var nodes = [];
    var eliteProb = clamp(diff / 200, 0.05, 0.35);
    var restProb = clamp((100 - diff) / 250, 0.05, 0.30);
    var shopProb = 0.15;
    var eventProb = 0.20;
    var treasureProb = 0.10;
    var battleProb = 1 - (eliteProb + restProb + shopProb + eventProb + treasureProb);
    for (var i = 0; i < n; i++) {
      var r = ((this.seed * (i + 1)) % 1000) / 1000;  // deterministic pseudo-random
      var type;
      if (i === n - 1) type = 'boss';  // last is always boss
      else if (r < battleProb) type = 'battle';
      else if (r < battleProb + eliteProb) type = 'elite';
      else if (r < battleProb + eliteProb + restProb) type = 'rest';
      else if (r < battleProb + eliteProb + restProb + shopProb) type = 'shop';
      else if (r < battleProb + eliteProb + restProb + shopProb + eventProb) type = 'event';
      else type = 'treasure';
      nodes.push({ index: i, type: type, difficulty: Math.round(diff + (i - n/2) * 2) });
    }
    return {
      seed: this.seed,
      length: n,
      difficulty: diff,
      nodes: nodes,
      counts: this._countTypes(nodes)
    };
  };

  ChallengeGenerator.prototype._countTypes = function (nodes) {
    var counts = {};
    ENCOUNTER_TYPES.forEach(function (t) { counts[t] = 0; });
    counts.boss = 0;
    nodes.forEach(function (n) { counts[n.type] = (counts[n.type] || 0) + 1; });
    return counts;
  };

  ChallengeGenerator.prototype.setSeed = function (seed) {
    this.seed = (typeof seed === 'number') ? seed : Date.now();
    return this.seed;
  };

  ChallengeGenerator.prototype.validateLayout = function (layout) {
    if (!layout || !layout.nodes) return { valid: false, reason: 'no_nodes' };
    var counts = this._countTypes(layout.nodes);
    var battles = (counts.battle || 0) + (counts.elite || 0);
    if (battles < 2) return { valid: false, reason: 'too_few_battles', counts: counts };
    if (layout.nodes.length < this.minRooms) return { valid: false, reason: 'too_short', counts: counts };
    if (layout.nodes[layout.nodes.length - 1].type !== 'boss') return { valid: false, reason: 'no_boss_end', counts: counts };
    return { valid: true, counts: counts };
  };

  ChallengeGenerator.prototype.getReport = function () {
    var layout = this.generate();
    return {
      seed: this.seed,
      targetDifficulty: this.targetDifficulty,
      minRooms: this.minRooms,
      maxRooms: this.maxRooms,
      sampleLayout: layout,
      validation: this.validateLayout(layout)
    };
  };

  if (typeof window !== 'undefined') {
    window.ChallengeGenerator = ChallengeGenerator;
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChallengeGenerator: ChallengeGenerator };
  }

})();
