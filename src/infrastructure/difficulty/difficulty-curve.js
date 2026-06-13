// ============================================================================
// Adaptive Difficulty Engine — V345 Direction A Iter 7/30
// DifficultyCurve: 心流理论 (flow = challenge/skill ratio) → 段位目标曲线
// 来源：thunderbolt 反馈循环（基于心流的难度推进）
// ============================================================================
'use strict';

(function () {

  // Flow channel: 0.8 <= challenge/skill <= 1.2
  var FLOW_LOW = 0.8;
  var FLOW_HIGH = 1.2;
  var BOREDOM_THRESHOLD = 0.6;   // challenge too low
  var FRUSTRATION_THRESHOLD = 1.5;  // challenge too high

  function clamp(v, lo, hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  function DifficultyCurve(options) {
    this.chapters = (options && options.chapters) || 10;
    this.curveType = (options && options.curveType) || 'linear';  // linear | exponential | sigmoid
    this.startDifficulty = (options && options.startDifficulty) || 25;
    this.endDifficulty = (options && options.endDifficulty) || 90;
    this.flowTarget = 1.0;  // ideal challenge/skill ratio
  }

  DifficultyCurve.prototype._baseDifficulty = function (chapter) {
    var t = (chapter - 1) / Math.max(1, this.chapters - 1);  // 0..1
    var d;
    if (this.curveType === 'exponential') {
      d = this.startDifficulty + (this.endDifficulty - this.startDifficulty) * Math.pow(t, 1.5);
    } else if (this.curveType === 'sigmoid') {
      var s = 1 / (1 + Math.exp(-6 * (t - 0.5)));
      d = this.startDifficulty + (this.endDifficulty - this.startDifficulty) * s;
    } else {
      d = this.startDifficulty + (this.endDifficulty - this.startDifficulty) * t;
    }
    return Math.round(d);
  };

  DifficultyCurve.prototype.getTargetDifficulty = function (chapter, skillScore) {
    var base = this._baseDifficulty(chapter);
    var skill = (typeof skillScore === 'number') ? skillScore : 50;
    var adjusted = Math.round(base * (skill / 50));
    return clamp(adjusted, 0, 100);
  };

  DifficultyCurve.prototype.computeFlow = function (skill, challenge) {
    var s = (typeof skill === 'number') ? skill : 50;
    var c = (typeof challenge === 'number') ? challenge : 50;
    var ratio = c / Math.max(1, s);
    var state;
    if (ratio < BOREDOM_THRESHOLD) state = 'boredom';
    else if (ratio < FLOW_LOW) state = 'relaxed';
    else if (ratio <= FLOW_HIGH) state = 'flow';
    else if (ratio <= FRUSTRATION_THRESHOLD) state = 'arousal';
    else state = 'frustration';
    var distance = Math.abs(ratio - this.flowTarget);
    return {
      ratio: Math.round(ratio * 100) / 100,
      state: state,
      distance: Math.round(distance * 100) / 100,
      isFlow: state === 'flow',
      recommendation: state === 'boredom' ? 'increase_difficulty'
                    : state === 'frustration' ? 'decrease_difficulty'
                    : 'maintain'
    };
  };

  DifficultyCurve.prototype.getFullCurve = function () {
    var arr = [];
    for (var c = 1; c <= this.chapters; c++) {
      arr.push({ chapter: c, base: this._baseDifficulty(c), targetForSkill50: this.getTargetDifficulty(c, 50) });
    }
    return arr;
  };

  DifficultyCurve.prototype.getReport = function () {
    return {
      curveType: this.curveType,
      chapters: this.chapters,
      startDifficulty: this.startDifficulty,
      endDifficulty: this.endDifficulty,
      flowTarget: this.flowTarget,
      fullCurve: this.getFullCurve(),
      flowAnalysis: this.computeFlow(50, 60)
    };
  };

  if (typeof window !== 'undefined') {
    window.DifficultyCurve = DifficultyCurve;
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DifficultyCurve: DifficultyCurve };
  }

})();
