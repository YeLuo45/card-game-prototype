// ============================================================================
// shared/utils/random.js — 随机数工具
// ============================================================================
'use strict';

var Random = {
  // 整数随机 [min, max]
  int: function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // 浮点随机 [min, max]
  float: function(min, max) {
    return Math.random() * (max - min) + min;
  },

  // 从数组随机选一个
  pick: function(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  },

  // 从数组随机选 N 个（不重复）
  pickN: function(arr, n) {
    var copy = arr.slice();
    var result = [];
    for (var i = 0; i < n && copy.length > 0; i++) {
      var idx = Math.floor(Math.random() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  },

  // 百分比概率 [0-100]
  chance: function(prob) {
    return Math.random() * 100 < prob;
  },

  // 打乱数组（洗牌）
  shuffle: function(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    return copy;
  }
};

module.exports = Random;
window.Random = Random;