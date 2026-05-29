// ============================================================================
// Card Chaos Laboratory — V219 Direction C
// Chaos lab with experimental alchemy, unstable compounds, and reaction catalysis
// thunderbolt feedback loops
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // UnstableCompound: An unstable alchemical compound
  // -----------------------------------------------------------------------
  function UnstableCompound(compoundId, name, volatility, potency, stability) {
    this.compoundId = compoundId;
    this.name = name || compoundId;
    this.volatility = volatility || 50; // 0-100, higher = more dangerous
    this.potency = potency || 20;
    this.stability = stability || 50; // 0-100, starts declining
    this.amplified = false;
    this.catalyzed = false;
  }

  UnstableCompound.prototype.amplify = function () {
    if (this.amplified) return { error: 'already_amplified' };
    this.amplified = true;
    this.potency *= 2;
    return { success: true, potency: this.potency };
  };

  UnstableCompound.prototype.catalyze = function () {
    if (this.catalyzed) return { error: 'already_catalyzed' };
    this.catalyzed = true;
    this.stability = Math.min(100, this.stability + 30);
    return { success: true, stability: this.stability };
  };

  UnstableCompound.prototype.getDangerLevel = function () {
    var effective = this.volatility * (this.potency / 20);
    if (this.stability < 20) effective *= 2;
    return Math.floor(effective);
  };

  // --------------------------------------------------------------------===
  // AlchemicalReaction: A reaction between compounds
  // ----------------------------------------------------------------=======
  function AlchemicalReaction(reactionId, name, compoundA, compoundB, outputType) {
    this.reactionId = reactionId;
    this.name = name || reactionId;
    this.compoundA = compoundA;
    this.compoundB = compoundB;
    this.outputType = outputType || 'neutral'; // explosive, corrosive, toxic, neutral
    this.completed = false;
    this.output = null;
    this.yield = 0;
  }

  AlchemicalReaction.prototype.start = function () {
    if (this.completed) return { error: 'already_completed' };
    this.completed = true;
    this.yield = Math.floor((this.compoundA.potency + this.compoundB.potency) / 2);
    this.output = { type: this.outputType, strength: this.yield };
    return { success: true, yield: this.yield, output: this.output };
  };

  AlchemicalReaction.prototype.getReactionPower = function () {
    if (!this.completed) return 0;
    var base = this.yield;
    if (this.outputType === 'explosive') return base * 3;
    if (this.outputType === 'corrosive') return base * 2;
    return base;
  };

  // --------------------------------------------------------------------===
  // ChaosLaboratory: Main lab
  // ----------------------------------------------------------------=======
  function ChaosLaboratory(labId, name, safetyLevel) {
    this.labId = labId || ('lab_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Chaos Laboratory';
    this.safetyLevel = safetyLevel || 3; // 1-5, higher = safer
    this.compounds = {}; // compoundId -> UnstableCompound
    this.reactions = {}; // reactionId -> AlchemicalReaction
    this.totalExperiments = 0;
    this.totalYield = 0;
  }

  ChaosLaboratory.prototype.addCompound = function (compound) {
    this.compounds[compound.compoundId] = compound;
    return { success: true, count: Object.keys(this.compounds).length };
  };

  ChaosLaboratory.prototype.createReaction = function (r) {
    this.reactions[r.reactionId] = r;
    return { success: true, count: Object.keys(this.reactions).length };
  };

  ChaosLaboratory.prototype.getCompound = function (id) { return this.compounds[id] || null; };
  ChaosLaboratory.prototype.getReaction = function (id) { return this.reactions[id] || null; };

  ChaosLaboratory.prototype.getSafetyThreshold = function () {
    var thresholds = { 1: 20, 2: 35, 3: 50, 4: 65, 5: 80 };
    return thresholds[this.safetyLevel] || 50;
  };

  ChaosLaboratory.prototype.runExperiment = function (compoundA, compoundB) {
    var threshold = this.getSafetyThreshold();
    if (Math.max(compoundA.volatility, compoundB.volatility) > threshold) {
      return { error: 'safety_warning', threshold: threshold };
    }
    var r = new AlchemicalReaction(
      'r_' + Date.now(), 'Experiment ' + (this.totalExperiments + 1),
      compoundA, compoundB, 'neutral'
    );
    r.start();
    this.createReaction(r);
    this.totalExperiments++;
    this.totalYield += r.yield;
    return { success: true, yield: r.yield };
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.UnstableCompound = UnstableCompound;
  window.AlchemicalReaction = AlchemicalReaction;
  window.ChaosLaboratory = ChaosLaboratory;
})();