// ============================================================================
// Adaptive Difficulty Engine — V346 Direction A Iter 8/30
// AITuner: 在线学习 (LinUCB bandit) 难度参数自适应
// 来源：thunderbolt 反馈循环 + claude-code Budget Mode
// ============================================================================
'use strict';

(function () {

  function clamp(v, lo, hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  // 8 arms: each represents a difficulty adjustment preset
  var ARMS = [
    { id: 'much_easier', delta: -25, label: 'Much Easier' },
    { id: 'easier',      delta: -10, label: 'Easier' },
    { id: 'slight_easier', delta: -3, label: 'Slight Easier' },
    { id: 'maintain',    delta: 0,  label: 'Maintain' },
    { id: 'slight_harder', delta: 3, label: 'Slight Harder' },
    { id: 'harder',      delta: 10, label: 'Harder' },
    { id: 'much_harder', delta: 25, label: 'Much Harder' },
    { id: 'adaptive',    delta: 5,  label: 'Adaptive (default +5)' }
  ];

  function AITuner(options) {
    this.alpha = (options && options.alpha) || 1.0;  // exploration weight
    this.arms = ARMS.slice();
    // LinUCB state: each arm has A matrix (identity start) + b vector
    this.A = {};
    this.b = {};
    var self = this;
    this.arms.forEach(function (a) {
      self.A[a.id] = [[1, 0], [0, 1]];
      self.b[a.id] = [0, 0];
    });
    this.history = [];
    this.lastChosenArm = null;
  }

  AITuner.prototype._dot = function (vec, mat) {
    var row = mat[0];
    return vec[0] * row[0] + vec[1] * row[1];
  };

  AITuner.prototype._matVecMul = function (mat, vec) {
    return [
      mat[0][0] * vec[0] + mat[0][1] * vec[1],
      mat[1][0] * vec[0] + mat[1][1] * vec[1]
    ];
  };

  AITuner.prototype.chooseArm = function (context) {
    var ctx = context || [1.0, 1.0];  // [player_skill_norm, recent_winrate]
    var bestArm = null;
    var bestScore = -Infinity;
    var self = this;
    this.arms.forEach(function (a) {
      var Ainv_b = self._matVecMul(self.A[a.id], self.b[a.id]);
      var theta = [Ainv_b[0], Ainv_b[1]];
      var ucb = self._dot(theta, self.A[a.id]) + self.alpha * Math.sqrt(self._dot(ctx, self.A[a.id]));
      if (ucb > bestScore) {
        bestScore = ucb;
        bestArm = a;
      }
    });
    this.lastChosenArm = bestArm;
    return bestArm;
  };

  AITuner.prototype.update = function (armId, reward, context) {
    if (!this.A[armId]) return false;
    var r = (typeof reward === 'number') ? reward : 0;
    var ctx = context || [1.0, 1.0];
    this.b[armId][0] += ctx[0] * r;
    this.b[armId][1] += ctx[1] * r;
    // Update A with outer product ctx*ctx^T
    this.A[armId][0][0] += ctx[0] * ctx[0];
    this.A[armId][0][1] += ctx[0] * ctx[1];
    this.A[armId][1][0] += ctx[1] * ctx[0];
    this.A[armId][1][1] += ctx[1] * ctx[1];
    this.history.push({ arm: armId, reward: r, ctx: ctx, ts: Date.now() });
    if (this.history.length > 100) this.history.shift();
    return true;
  };

  AITuner.prototype.recommendDelta = function (context) {
    var arm = this.chooseArm(context);
    return { arm: arm.id, label: arm.label, delta: arm.delta };
  };

  AITuner.prototype.getReport = function () {
    var armStats = this.arms.map(function (a) {
      var Ainv_b = [0, 0];
      try {
        Ainv_b = [
          (a.id && arguments[0] ? 0 : 0)
        ];
      } catch (e) {}
      var rewards = 0, count = 0;
      return { id: a.id, label: a.label, delta: a.delta, count: 0, totalReward: 0 };
    });
    var self = this;
    this.history.forEach(function (h) {
      var s = armStats.find(function (x) { return x.id === h.arm; });
      if (s) { s.count++; s.totalReward += h.reward; }
    });
    return {
      alpha: this.alpha,
      lastChosen: this.lastChosenArm ? this.lastChosenArm.id : null,
      historySize: this.history.length,
      armStats: armStats
    };
  };

  AITuner.prototype.reset = function () {
    var self = this;
    this.arms.forEach(function (a) {
      self.A[a.id] = [[1, 0], [0, 1]];
      self.b[a.id] = [0, 0];
    });
    this.history = [];
    this.lastChosenArm = null;
  };

  if (typeof window !== 'undefined') {
    window.AITuner = AITuner;
    window.DIFFICULTY_ARMS = ARMS;
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AITuner: AITuner, ARMS: ARMS };
  }

})();
