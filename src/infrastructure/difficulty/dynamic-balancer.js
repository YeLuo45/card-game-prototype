// ============================================================================
// Adaptive Difficulty Engine — V347 Direction A Iter 9/30
// DynamicBalancer: 实时调整 enemy HP/dmg/reward 系数 + 反熵增
// 来源：nanobot 分布式 mesh（多系数同步平衡）
// ============================================================================
'use strict';

(function () {

  function clamp(v, lo, hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  function DynamicBalancer(options) {
    this.targetDifficulty = (options && options.targetDifficulty) || 50;
    this.smoothingFactor = (options && options.smoothingFactor) || 0.3;  // EMA smoothing
    this.currentEnemyHpMult = 1.0;
    this.currentEnemyDmgMult = 1.0;
    this.currentRewardMult = 1.0;
    this.currentDropRateMult = 1.0;
    this.lastAdjustment = null;
  }

  DynamicBalancer.prototype.balance = function (playerDifficulty) {
    var pDiff = (typeof playerDifficulty === 'number') ? playerDifficulty : 50;
    var error = (pDiff - this.targetDifficulty) / 100;
    // If player finds it too easy (pDiff < target) → increase enemy, decrease reward
    // If player finds it too hard (pDiff > target) → decrease enemy, increase reward
    var adjustment = -error * this.smoothingFactor;
    var newHp = clamp(this.currentEnemyHpMult + adjustment, 0.5, 2.0);
    var newDmg = clamp(this.currentEnemyDmgMult + adjustment * 0.8, 0.5, 2.0);
    var newReward = clamp(this.currentRewardMult - adjustment, 0.5, 2.0);
    var newDrop = clamp(this.currentDropRateMult - adjustment * 0.5, 0.5, 2.0);
    this.currentEnemyHpMult = newHp;
    this.currentEnemyDmgMult = newDmg;
    this.currentRewardMult = newReward;
    this.currentDropRateMult = newDrop;
    this.lastAdjustment = {
      target: this.targetDifficulty,
      actual: pDiff,
      error: Math.round(error * 100) / 100,
      deltas: {
        enemyHpMult: Math.round((newHp - this.currentEnemyHpMult + adjustment) * 1000) / 1000 || adjustment,
        enemyDmgMult: Math.round(adjustment * 0.8 * 1000) / 1000,
        rewardMult: Math.round(-adjustment * 1000) / 1000,
        dropRateMult: Math.round(-adjustment * 0.5 * 1000) / 1000
      },
      ts: Date.now()
    };
    return this.getMultipliers();
  };

  DynamicBalancer.prototype.getMultipliers = function () {
    return {
      enemyHpMult: Math.round(this.currentEnemyHpMult * 1000) / 1000,
      enemyDmgMult: Math.round(this.currentEnemyDmgMult * 1000) / 1000,
      rewardMult: Math.round(this.currentRewardMult * 1000) / 1000,
      dropRateMult: Math.round(this.currentDropRateMult * 1000) / 1000
    };
  };

  DynamicBalancer.prototype.setTargetDifficulty = function (target) {
    if (typeof target !== 'number') return false;
    this.targetDifficulty = clamp(target, 0, 100);
    return true;
  };

  DynamicBalancer.prototype.applyToEnemy = function (enemy) {
    if (!enemy || typeof enemy !== 'object') return null;
    var scaled = Object.assign({}, enemy);
    if (typeof scaled.hp === 'number') scaled.hp = Math.round(scaled.hp * this.currentEnemyHpMult);
    if (typeof scaled.damage === 'number') scaled.damage = Math.round(scaled.damage * this.currentEnemyDmgMult);
    return scaled;
  };

  DynamicBalancer.prototype.applyToReward = function (reward) {
    if (!reward || typeof reward !== 'object') return null;
    var scaled = Object.assign({}, reward);
    if (typeof scaled.amount === 'number') scaled.amount = Math.round(scaled.amount * this.currentRewardMult);
    if (typeof scaled.dropChance === 'number') scaled.dropChance = clamp(scaled.dropChance * this.currentDropRateMult, 0, 1);
    return scaled;
  };

  DynamicBalancer.prototype.getReport = function () {
    return {
      targetDifficulty: this.targetDifficulty,
      smoothingFactor: this.smoothingFactor,
      multipliers: this.getMultipliers(),
      lastAdjustment: this.lastAdjustment
    };
  };

  DynamicBalancer.prototype.reset = function () {
    this.currentEnemyHpMult = 1.0;
    this.currentEnemyDmgMult = 1.0;
    this.currentRewardMult = 1.0;
    this.currentDropRateMult = 1.0;
    this.lastAdjustment = null;
  };

  if (typeof window !== 'undefined') {
    window.DynamicBalancer = DynamicBalancer;
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DynamicBalancer: DynamicBalancer };
  }

})();
