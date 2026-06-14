// ============================================================================
// Adaptive Difficulty Engine — V350 Direction A Iter 12/30
// RewardAdjuster: 难度↑ 时 reward↑ (补正) + 难度↓ 时 reward↓ (保挑战)
// 来源：nanobot 分布式 mesh（难度-奖励反向耦合）
// ============================================================================
'use strict';

(function () {

  function clamp(v, lo, hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  // Reward types
  var REWARD_TYPES = ['gold', 'card', 'relic', 'potion', 'xp'];

  function RewardAdjuster(options) {
    this.baseGold = (options && options.baseGold) || 50;
    this.baseCards = (options && options.baseCards) || 3;
    this.baseRelics = (options && options.baseRelics) || 0.2;  // probability
    this.basePotionChance = (options && options.basePotionChance) || 0.15;
    this.baseXp = (options && options.baseXp) || 30;
    this.compensationFactor = (options && options.compensationFactor) || 0.8;  // how strongly to compensate
    this.challengeFactor = (options && options.challengeFactor) || 0.4;  // how strongly to preserve challenge
    this.playerPerformance = 0.5;  // 0 = struggling, 1 = dominating
  }

  RewardAdjuster.prototype.setPlayerPerformance = function (winRate) {
    if (typeof winRate !== 'number') return false;
    this.playerPerformance = clamp(winRate, 0, 1);
    return true;
  };

  RewardAdjuster.prototype._compensation = function () {
    // Inverse of playerPerformance: struggling player gets MORE rewards
    return 1 + this.compensationFactor * (1 - this.playerPerformance);
  };

  RewardAdjuster.prototype._challengePreservation = function () {
    // Dominating player gets FEWER rewards (preserve challenge)
    return 1 - this.challengeFactor * this.playerPerformance;
  };

  RewardAdjuster.prototype.compute = function (difficulty) {
    var d = (typeof difficulty === 'number') ? difficulty : 50;
    var diffBoost = 1 + (d / 100);  // higher difficulty → more base rewards
    var comp = this._compensation();
    var chal = this._challengePreservation();
    return {
      gold: Math.round(this.baseGold * diffBoost * comp * chal),
      cards: Math.max(1, Math.round(this.baseCards * comp * chal)),
      relicChance: clamp(this.baseRelics * comp * chal, 0, 1),
      potionChance: clamp(this.basePotionChance * comp * chal, 0, 1),
      xp: Math.round(this.baseXp * diffBoost * comp * chal),
      compensation: Math.round(comp * 100) / 100,
      challengePreservation: Math.round(chal * 100) / 100,
      difficulty: d,
      playerPerformance: this.playerPerformance
    };
  };

  RewardAdjuster.prototype.computeForType = function (type, difficulty) {
    if (!REWARD_TYPES.includes(type)) return 0;
    var c = this.compute(difficulty);
    switch (type) {
      case 'gold': return c.gold;
      case 'card': return c.cards;
      case 'relic': return Math.round(c.relicChance * 100);
      case 'potion': return Math.round(c.potionChance * 100);
      case 'xp': return c.xp;
      default: return 0;
    }
  };

  RewardAdjuster.prototype.listRewardTypes = function () {
    return REWARD_TYPES.slice();
  };

  RewardAdjuster.prototype.getReport = function () {
    return {
      baseValues: {
        gold: this.baseGold,
        cards: this.baseCards,
        relicChance: this.baseRelics,
        potionChance: this.basePotionChance,
        xp: this.baseXp
      },
      compensationFactor: this.compensationFactor,
      challengeFactor: this.challengeFactor,
      samples: {
        struggling_d70: this.setPlayerPerformance(0.2) && this.compute(70),
        neutral_d50: this.setPlayerPerformance(0.5) && this.compute(50),
        dominating_d80: this.setPlayerPerformance(0.9) && this.compute(80)
      }
    };
  };

  if (typeof window !== 'undefined') {
    window.RewardAdjuster = RewardAdjuster;
    window.REWARD_TYPES = REWARD_TYPES;
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RewardAdjuster: RewardAdjuster, REWARD_TYPES: REWARD_TYPES };
  }

})();
