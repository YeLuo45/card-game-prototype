// ============================================================================
// Card Spirit Realm — V215 Direction D
// Spirit realm with spirit召唤, spirit bonds, and ethereal passageways
// generic-agent autonomous goal pursuit + nanobot distributed mesh
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // Spirit: A summoned spirit entity
  // -----------------------------------------------------------------------
  function Spirit(spiritId, name, element, power, rank) {
    this.spiritId = spiritId;
    this.name = name || spiritId;
    this.element = element || 'spirit';
    this.power = power || 10;
    this.rank = rank || 'common'; // common, uncommon, rare, elite, legendary
    this.summonerId = null;
    this.bonded = false;
    this.active = true;
  }

  Spirit.prototype.bind = function (summonerId) {
    if (this.bonded) return { error: 'already_bound' };
    this.bonded = true;
    this.summonerId = summonerId;
    return { success: true };
  };

  Spirit.prototype.release = function () {
    if (!this.bonded) return { error: 'not_bound' };
    this.bonded = false;
    var prev = this.summonerId;
    this.summonerId = null;
    return { success: true, released: prev };
  };

  Spirit.prototype.setActive = function (state) {
    this.active = state;
    return { active: this.active };
  };

  Spirit.prototype.getEffectivePower = function () {
    var multipliers = { common: 1, uncommon: 2, rare: 4, elite: 8, legendary: 16 };
    var mult = multipliers[this.rank] || 1;
    return this.active ? this.power * mult : Math.floor(this.power * mult * 0.1);
  };

  // -----------------------------------------------------------------------
  // SummoningCircle: A summoning circle for spirits
  // -----------------------------------------------------------------------
  function SummoningCircle(circleId, name, maxSpirits) {
    this.circleId = circleId;
    this.name = name || circleId;
    this.maxSpirits = maxSpirits || 5;
    this.spirits = {}; // spiritId -> Spirit
    this.circlePower = 0;
    this.ritualProgress = 0;
  }

  SummoningCircle.prototype.summon = function (spirit) {
    if (Object.keys(this.spirits).length >= this.maxSpirits) return { error: 'max_spirits' };
    this.spirits[spirit.spiritId] = spirit;
    this.circlePower += spirit.getEffectivePower();
    return { success: true, count: Object.keys(this.spirits).length };
  };

  SummoningCircle.prototype.dismiss = function (spiritId) {
    var s = this.spirits[spiritId];
    if (!s) return { error: 'spirit_not_found' };
    this.circlePower -= s.getEffectivePower();
    delete this.spirits[spiritId];
    return { success: true };
  };

  SummoningCircle.prototype.addRitualProgress = function (amount) {
    this.ritualProgress += amount;
    return { progress: this.ritualProgress };
  };

  SummoningCircle.prototype.getSpiritsByElement = function (element) {
    var result = [];
    for (var sid in this.spirits) {
      if (this.spirits[sid].element === element) result.push(sid);
    }
    return result;
  };

  SummoningCircle.prototype.getCirclePower = function () { return this.circlePower; };

  // --------------------------------------------------------------------===
  // EtherealPassage: A passage between realms
  // ----------------------------------------------------------------=======
  function EtherealPassage(passageId, name, stability, realmA, realmB) {
    this.passageId = passageId;
    this.name = name || passageId;
    this.stability = stability || 50;
    this.realmA = realmA || 'mortal';
    this.realmB = realmB || 'spirit';
    this.open = false;
    this.linkedCircleId = null;
  }

  EtherealPassage.prototype.openPassage = function () {
    if (this.open) return { error: 'already_open' };
    if (this.stability < 20) return { error: 'unstable_passage' };
    this.open = true;
    return { success: true };
  };

  EtherealPassage.prototype.linkCircle = function (circleId) {
    if (!this.open) return { error: 'passage_not_open' };
    this.linkedCircleId = circleId;
    return { success: true, linkedCircleId: circleId };
  };

  EtherealPassage.prototype.close = function () {
    this.open = false;
    this.linkedCircleId = null;
    return { success: true };
  };

  // --------------------------------------------------------------------===
  // SpiritRealm: Main realm manager
  // ----------------------------------------------------------------=======
  function SpiritRealm(realmId, name, maxPassages) {
    this.realmId = realmId || ('realm_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Spirit Realm';
    this.circles = {};
    this.passages = {};
    this.summoners = {}; // summonerId -> {name, totalPower, spiritsBound}
    this.maxPassages = maxPassages || 15;
    this.realmPower = 0;
  }

  SpiritRealm.prototype.createCircle = function (circle) {
    this.circles[circle.circleId] = circle;
    return { success: true, count: Object.keys(this.circles).length };
  };

  SpiritRealm.prototype.createPassage = function (passage) {
    this.passages[passage.passageId] = passage;
    return { success: true, count: Object.keys(this.passages).length };
  };

  SpiritRealm.prototype.registerSummoner = function (summonerId, name) {
    this.summoners[summonerId] = { name: name || summonerId, totalPower: 0, spiritsBound: 0 };
    return { success: true };
  };

  SpiritRealm.prototype.getCircle = function (id) { return this.circles[id] || null; };
  SpiritRealm.prototype.getPassage = function (id) { return this.passages[id] || null; };
  SpiritRealm.prototype.getSummoner = function (id) { return this.summoners[id] || null; };
  SpiritRealm.prototype.getCircleCount = function () { return Object.keys(this.circles).length; };
  SpiritRealm.prototype.getPassageCount = function () { return Object.keys(this.passages).length; };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.Spirit = Spirit;
  window.SummoningCircle = SummoningCircle;
  window.EtherealPassage = EtherealPassage;
  window.SpiritRealm = SpiritRealm;
})();