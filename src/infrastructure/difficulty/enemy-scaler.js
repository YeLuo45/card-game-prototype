// ============================================================================
// Adaptive Difficulty Engine — V349 Direction A Iter 11/30
// EnemyScaler: difficultyScore → enemy.level/hp/ai.complexity 系数
// 来源：nanobot 分布式 mesh（多属性同步缩放）
// ============================================================================
'use strict';

(function () {

  function clamp(v, lo, hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  function EnemyScaler(options) {
    this.baseHp = (options && options.baseHp) || 30;
    this.baseDamage = (options && options.baseDamage) || 8;
    this.baseAiComplexity = (options && options.baseAiComplexity) || 1;
    this.difficultyCurve = (options && options.difficultyCurve) || 'linear';  // linear | quadratic
    this.scalingWindow = (options && options.scalingWindow) || 10;
  }

  EnemyScaler.prototype._difficultyMultiplier = function (difficulty) {
    var d = clamp(difficulty, 0, 100) / 100;  // 0..1
    if (this.difficultyCurve === 'quadratic') return 0.5 + 1.5 * d * d;
    return 0.5 + 1.5 * d;  // linear: 0.5x at d=0, 2x at d=100
  };

  EnemyScaler.prototype.scale = function (enemyType, difficulty, overrides) {
    var d = (typeof difficulty === 'number') ? difficulty : 50;
    var mult = this._difficultyMultiplier(d);
    var ovr = overrides || {};
    var hp = (typeof ovr.hp === 'number') ? ovr.hp : this.baseHp;
    var dmg = (typeof ovr.damage === 'number') ? ovr.damage : this.baseDamage;
    var ai = (typeof ovr.aiComplexity === 'number') ? ovr.aiComplexity : this.baseAiComplexity;
    var scaledHp = Math.round(hp * mult);
    var scaledDmg = Math.round(dmg * mult);
    var scaledAi = Math.min(5, Math.max(1, Math.round(ai * mult)));
    return {
      type: enemyType || 'basic',
      baseHp: hp,
      baseDamage: dmg,
      baseAiComplexity: ai,
      difficulty: d,
      multiplier: Math.round(mult * 100) / 100,
      hp: scaledHp,
      damage: scaledDmg,
      aiComplexity: scaledAi,
      totalThreat: scaledHp + scaledDmg * 3 + scaledAi * 10
    };
  };

  EnemyScaler.prototype.scaleBatch = function (enemies, difficulty) {
    if (!Array.isArray(enemies)) return [];
    return enemies.map(function (e) {
      return this.scale(e.type, difficulty, { hp: e.hp, damage: e.damage, aiComplexity: e.aiComplexity });
    }.bind(this));
  };

  EnemyScaler.prototype.getLevel = function (difficulty) {
    // Map 0-100 to 1-10 enemy level
    return Math.max(1, Math.min(10, Math.ceil(difficulty / 10)));
  };

  EnemyScaler.prototype.getReport = function () {
    return {
      baseHp: this.baseHp,
      baseDamage: this.baseDamage,
      baseAiComplexity: this.baseAiComplexity,
      difficultyCurve: this.difficultyCurve,
      scalingSamples: {
        easy: this.scale('goblin', 20),
        medium: this.scale('goblin', 50),
        hard: this.scale('goblin', 80),
        extreme: this.scale('dragon', 100, { hp: 100, damage: 25, aiComplexity: 3 })
      }
    };
  };

  if (typeof window !== 'undefined') {
    window.EnemyScaler = EnemyScaler;
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnemyScaler: EnemyScaler };
  }

})();
