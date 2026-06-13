// ============================================================================
// Adaptive Difficulty Engine — V344 Direction A Iter 6/30
// BaselineDifficulty: 章节级默认难度 + 4 难度模式
// 来源：thunderbolt 反馈循环（章节初始难度锚点）
// ============================================================================
'use strict';

(function () {

  var MODES = {
    easy:   { mult: 0.65, label: 'Easy' },
    normal: { mult: 1.00, label: 'Normal' },
    hard:   { mult: 1.30, label: 'Hard' },
    expert: { mult: 1.65, label: 'Expert' }
  };

  // Chapter defaults (1-10): base difficulty score
  var CHAPTER_DEFAULTS = {
    1: 25, 2: 30, 3: 38, 4: 45, 5: 52,
    6: 60, 7: 68, 8: 75, 9: 82, 10: 90
  };

  function BaselineDifficulty(options) {
    this.mode = (options && options.mode) || 'normal';
    this.overrides = (options && options.overrides) || {};
    if (!MODES[this.mode]) this.mode = 'normal';
  }

  BaselineDifficulty.prototype.getChapterDifficulty = function (chapter) {
    var base = (this.overrides && this.overrides[chapter] !== undefined)
      ? this.overrides[chapter]
      : (CHAPTER_DEFAULTS[chapter] !== undefined ? CHAPTER_DEFAULTS[chapter] : 50);
    var mult = MODES[this.mode].mult;
    var score = Math.round(base * mult);
    return {
      chapter: chapter,
      base: base,
      mode: this.mode,
      multiplier: mult,
      score: Math.max(0, Math.min(100, score))
    };
  };

  BaselineDifficulty.prototype.setMode = function (mode) {
    if (!MODES[mode]) return false;
    this.mode = mode;
    return true;
  };

  BaselineDifficulty.prototype.setOverride = function (chapter, score) {
    if (typeof chapter !== 'number' || typeof score !== 'number') return false;
    this.overrides[chapter] = score;
    return true;
  };

  BaselineDifficulty.prototype.listModes = function () {
    return Object.keys(MODES).map(function (k) { return { key: k, label: MODES[k].label, mult: MODES[k].mult }; });
  };

  BaselineDifficulty.prototype.getReport = function () {
    var self = this;
    var chapters = {};
    Object.keys(CHAPTER_DEFAULTS).forEach(function (c) {
      chapters[c] = self.getChapterDifficulty(parseInt(c, 10));
    });
    return {
      mode: this.mode,
      modeLabel: MODES[this.mode].label,
      multiplier: MODES[this.mode].mult,
      chapters: chapters,
      overrides: this.overrides
    };
  };

  if (typeof window !== 'undefined') {
    window.BaselineDifficulty = BaselineDifficulty;
    window.DIFFICULTY_MODES = MODES;
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BaselineDifficulty: BaselineDifficulty, MODES: MODES };
  }

})();
