// ============================================================================
// shared/utils/math.js — 游戏数学工具
// ============================================================================
'use strict';

var MathUtil = {
  clamp: function(val, min, max) {
    return Math.max(min, Math.min(max, val));
  },

  lerp: function(a, b, t) {
    return a + (b - a) * t;
  },

  // 等差数列求和
  sumArithmetic: function(a1, d, n) {
    return n * a1 + d * (n * (n - 1) / 2);
  },

  // 平均值
  avg: function(arr) {
    if (!arr || arr.length === 0) return 0;
    var sum = 0;
    for (var i = 0; i < arr.length; i++) sum += arr[i];
    return sum / arr.length;
  },

  // 标准差
  stddev: function(arr) {
    if (!arr || arr.length === 0) return 0;
    var avg = this.avg(arr);
    var sumSq = 0;
    for (var i = 0; i < arr.length; i++) sumSq += Math.pow(arr[i] - avg, 2);
    return Math.sqrt(sumSq / arr.length);
  },

  // 幂运算
  pow: function(base, exp) {
    return Math.pow(base, exp);
  },

  // 百分比转小数
  percentToDecimal: function(pct) {
    return pct / 100;
  }
};

module.exports = MathUtil;
window.MathUtil = MathUtil;