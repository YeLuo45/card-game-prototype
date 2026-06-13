// ============================================================================
// Adaptive Difficulty Engine — V342 Direction A Iter 4/30
// PlayStyleClassifier: 简单 KMeans 聚类 → 5 archetype
// 来源：thunderbolt 反馈循环（玩家风格→难度曲线适配）
// ============================================================================
'use strict';

(function () {

  // 5 archetype centroids in 6-dim radar space (skill/aggression/caution/economy/exploration/social)
  var ARCHETYPES = {
    aggressive: { name: 'aggressive', label: 'Aggressive Berserker', centroid: [40, 90, 30, 50, 60, 40] },
    defensive:  { name: 'defensive',  label: 'Defensive Guardian',  centroid: [60, 25, 90, 55, 40, 60] },
    economist:  { name: 'economist',  label: 'Resource Economist',  centroid: [55, 45, 55, 90, 50, 50] },
    explorer:   { name: 'explorer',   label: 'Curious Explorer',    centroid: [50, 60, 40, 45, 90, 70] },
    social:     { name: 'social',     label: 'Social Diplomat',     centroid: [45, 35, 55, 50, 55, 90] }
  };

  var ARCHETYPE_LIST = ['aggressive', 'defensive', 'economist', 'explorer', 'social'];

  function distance(a, b) {
    var sum = 0;
    var i;
    for (i = 0; i < a.length; i++) {
      var d = (a[i] || 0) - (b[i] || 0);
      sum += d * d;
    }
    return Math.sqrt(sum);
  }

  function PlayStyleClassifier(options) {
    this.samples = [];  // historical radar samples
    this.maxSamples = (options && options.maxSamples) || 50;
    this.lastAssigned = null;
  }

  PlayStyleClassifier.prototype.learn = function (radar) {
    if (!radar || typeof radar !== 'object') return null;
    var sample = [
      radar.skill || 50,
      radar.aggression || 50,
      radar.caution || 50,
      radar.economy || 50,
      radar.exploration || 50,
      radar.social || 50
    ];
    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) this.samples.shift();
    return sample;
  };

  PlayStyleClassifier.prototype.classify = function (radar) {
    var pt = radar ? [
      radar.skill || 50,
      radar.aggression || 50,
      radar.caution || 50,
      radar.economy || 50,
      radar.exploration || 50,
      radar.social || 50
    ] : [50, 50, 50, 50, 50, 50];
    var bestName = 'balanced';
    var bestDist = Infinity;
    var dists = {};
    var i;
    for (i = 0; i < ARCHETYPE_LIST.length; i++) {
      var name = ARCHETYPE_LIST[i];
      var d = distance(pt, ARCHETYPES[name].centroid);
      dists[name] = Math.round(d * 10) / 10;
      if (d < bestDist) {
        bestDist = d;
        bestName = name;
      }
    }
    this.lastAssigned = bestName;
    return {
      archetype: bestName,
      label: ARCHETYPES[bestName].label,
      confidence: bestDist === 0 ? 1 : Math.max(0, 1 - (bestDist / 100)),
      distances: dists,
      sampleSize: this.samples.length
    };
  };

  PlayStyleClassifier.prototype.getArchetypeProfile = function (name) {
    return ARCHETYPES[name] || null;
  };

  PlayStyleClassifier.prototype.listArchetypes = function () {
    return ARCHETYPE_LIST.slice();
  };

  PlayStyleClassifier.prototype.getReport = function () {
    var self = this;
    var distribution = {};
    ARCHETYPE_LIST.forEach(function (n) { distribution[n] = 0; });
    this.samples.forEach(function (s) {
      var cls = self.classify({ skill: s[0], aggression: s[1], caution: s[2], economy: s[3], exploration: s[4], social: s[5] });
      distribution[cls.archetype]++;
    });
    return {
      sampleSize: this.samples.length,
      lastAssigned: this.lastAssigned,
      distribution: distribution,
      archetypes: ARCHETYPE_LIST.map(function (n) {
        return { name: n, label: ARCHETYPES[n].label };
      })
    };
  };

  PlayStyleClassifier.prototype.reset = function () {
    this.samples = [];
    this.lastAssigned = null;
  };

  if (typeof window !== 'undefined') {
    window.PlayStyleClassifier = PlayStyleClassifier;
    window.PLAY_STYLE_ARCHETYPES = ARCHETYPES;
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PlayStyleClassifier: PlayStyleClassifier, ARCHETYPES: ARCHETYPES };
  }

})();
