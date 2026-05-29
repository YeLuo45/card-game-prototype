// ============================================================================
// Card Arcane Sanctum — V230 Direction I
// Arcane sanctum with arcane libraries, spell research, and magic resonance
// chatdev role specialization + nanobot distributed mesh
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // ArcaneLibrary: A library of arcane knowledge
  // -----------------------------------------------------------------------
  function ArcaneLibrary(libId, name, bookCount, knowledgeBase) {
    this.libId = libId;
    this.name = name || libId;
    this.bookCount = (bookCount !== undefined) ? bookCount : 20; // nullish coalescing
    this.knowledgeBase = (knowledgeBase !== undefined) ? knowledgeBase : 30; // nullish coalescing
    this.consulted = false;
    this.knowledgeGain = 0;
  }

  ArcaneLibrary.prototype.consult = function (hours) {
    if (this.consulted) return { error: 'already_consulted' };
    this.knowledgeGain = hours * this.bookCount / 5;
    this.consulted = true;
    return { success: true, gain: this.knowledgeGain };
  };

  ArcaneLibrary.prototype.getLibraryPower = function () {
    if (!this.consulted) return 0;
    return Math.floor(this.knowledgeBase + this.knowledgeGain);
  };

  // -----------------------------------------------------------------------
  // SpellResearch: Ongoing spell research
  // -----------------------------------------------------------------------
  function SpellResearch(resId, name, researchPoints, maxPoints) {
    this.resId = resId;
    this.name = name || resId;
    this.researchPoints = (researchPoints !== undefined) ? researchPoints : 0; // nullish coalescing
    this.maxPoints = maxPoints || 100;
    this.discoveredSpells = [];
  }

  SpellResearch.prototype.addPoints = function (points) {
    this.researchPoints = Math.min(this.maxPoints, this.researchPoints + points);
    return { success: true, points: this.researchPoints };
  };

  SpellResearch.prototype.discoverSpell = function (spellName) {
    for (var i = 0; i < this.discoveredSpells.length; i++) {
      if (this.discoveredSpells[i] === spellName) return { error: 'spell_known' };
    }
    this.discoveredSpells.push(spellName);
    return { success: true, count: this.discoveredSpells.length };
  };

  SpellResearch.prototype.getResearchPower = function () {
    return this.researchPoints + this.discoveredSpells.length * 20;
  };

  // -----------------------------------------------------------------------
  // MagicResonance: Resonance of magic energy
  // -----------------------------------------------------------------------
  function MagicResonance(resId, name, resonanceStrength, harmonicLevel) {
    this.resId = resId;
    this.name = name || resId;
    this.resonanceStrength = (resonanceStrength !== undefined) ? resonanceStrength : 50; // nullish coalescing
    this.harmonicLevel = (harmonicLevel !== undefined) ? harmonicLevel : 1; // nullish coalescing
    this.resonanceActive = false;
    this.resonanceCount = 0;
  }

  MagicResonance.prototype.harmonize = function (frequency) {
    this.harmonicLevel = Math.min(10, this.harmonicLevel + Math.floor(frequency / 30));
    this.resonanceCount++;
    return { success: true, level: this.harmonicLevel };
  };

  MagicResonance.prototype.getResonancePower = function () {
    if (!this.resonanceActive) return 0;
    return this.resonanceStrength * this.harmonicLevel;
  };

  // -----------------------------------------------------------------------
  // ArcaneSanctum: Main sanctum system
  // -----------------------------------------------------------------------
  function ArcaneSanctum(sanctumId, name, sanctumRank) {
    this.sanctumId = sanctumId;
    this.name = name || 'Arcane Sanctum';
    this.sanctumRank = sanctumRank || 1;
    this.libraries = {};
    this.research = {};
    this.resonances = {};
  }

  ArcaneSanctum.prototype.addLibrary = function (l) {
    this.libraries[l.libId] = l;
    return { success: true, count: Object.keys(this.libraries).length };
  };

  ArcaneSanctum.prototype.addResearch = function (r) {
    this.research[r.resId] = r;
    return { success: true, count: Object.keys(this.research).length };
  };

  ArcaneSanctum.prototype.addResonance = function (r) {
    this.resonances[r.resId] = r;
    return { success: true, count: Object.keys(this.resonances).length };
  };

  ArcaneSanctum.prototype.getSanctumPower = function () {
    var total = 0;
    for (var id in this.libraries) total += this.libraries[id].getLibraryPower();
    for (var id in this.research) total += this.research[id].getResearchPower();
    for (var id in this.resonances) total += this.resonances[id].getResonancePower();
    total += this.sanctumRank * 20;
    return total;
  };

  window.ArcaneLibrary = ArcaneLibrary;
  window.SpellResearch = SpellResearch;
  window.MagicResonance = MagicResonance;
  window.ArcaneSanctum = ArcaneSanctum;
})();