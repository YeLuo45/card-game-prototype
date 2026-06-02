// ============================================================================
// Card Lunar Sanctum — V233 Direction L
// Lunar sanctum with moon phases, silver light, and nocturnal rituals
// chatdev role specialization + generic-agent autonomous
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // MoonPhase: Current moon phase
  // -----------------------------------------------------------------------
  function MoonPhase(phaseId, name, lunarCycle, illumination) {
    this.phaseId = phaseId;
    this.name = name || phaseId;
    this.lunarCycle = (lunarCycle !== undefined) ? lunarCycle : 28; // nullish coalescing
    this.illumination = (illumination !== undefined) ? illumination : 50; // nullish coalescing
    this.phaseActive = false;
  }

  MoonPhase.prototype.bless = function () {
    if (this.phaseActive) return { error: 'already_blessed' };
    this.phaseActive = true;
    return { success: true, power: this.getPhasePower() };
  };

  MoonPhase.prototype.getPhasePower = function () {
    if (!this.phaseActive) return 0;
    return Math.floor(this.illumination * this.lunarCycle / 14);
  };

  // -----------------------------------------------------------------------
  // SilverLight: Light from the moon
  // -----------------------------------------------------------------------
  function SilverLight(lightId, name, lightIntensity, purity) {
    this.lightId = lightId;
    this.name = name || lightId;
    this.lightIntensity = (lightIntensity !== undefined) ? lightIntensity : 40; // nullish coalescing
    this.purity = (purity !== undefined) ? purity : 70; // nullish coalescing
    this.radiant = false;
  }

  SilverLight.prototype.radiate = function () {
    if (this.radiant) return { error: 'already_radiant' };
    this.radiant = true;
    return { success: true, power: this.getLightPower() };
  };

  SilverLight.prototype.getLightPower = function () {
    if (!this.radiant) return 0;
    return this.lightIntensity + this.purity * 2;
  };

  // -----------------------------------------------------------------------
  // NocturnalRitual: Ritual performed at night
  // -----------------------------------------------------------------------
  function NocturnalRitual(ritualId, name, ritualDepth, moonBond) {
    this.ritualId = ritualId;
    this.name = name || ritualId;
    this.ritualDepth = (ritualDepth !== undefined) ? ritualDepth : 30; // nullish coalescing
    this.moonBond = (moonBond !== undefined) ? moonBond : 50; // nullish coalescing
    this.ritualsCompleted = 0;
    this.ritualPower = 0;
  }

  NocturnalRitual.prototype.perform = function () {
    this.ritualsCompleted++;
    this.ritualPower = this.ritualDepth + this.moonBond + this.ritualsCompleted * 5;
    return { success: true, power: this.ritualPower };
  };

  NocturnalRitual.prototype.getRitualPower = function () {
    return this.ritualPower;
  };

  // -----------------------------------------------------------------------
  // LunarSanctum: Main sanctum
  // --------------------------------------------------------------------===
  function LunarSanctum(sanctumId, name, sanctumRank) {
    this.sanctumId = sanctumId;
    this.name = name || 'Lunar Sanctum';
    this.sanctumRank = sanctumRank || 1;
    this.phases = {};
    this.lights = {};
    this.rituals = {};
  }

  LunarSanctum.prototype.addPhase = function (p) {
    this.phases[p.phaseId] = p;
    return { success: true, count: Object.keys(this.phases).length };
  };

  LunarSanctum.prototype.addLight = function (l) {
    this.lights[l.lightId] = l;
    return { success: true, count: Object.keys(this.lights).length };
  };

  LunarSanctum.prototype.addRitual = function (r) {
    this.rituals[r.ritualId] = r;
    return { success: true, count: Object.keys(this.rituals).length };
  };

  LunarSanctum.prototype.getSanctumPower = function () {
    var total = 0;
    for (var id in this.phases) total += this.phases[id].getPhasePower();
    for (var id in this.lights) total += this.lights[id].getLightPower();
    for (var id in this.rituals) total += this.rituals[id].getRitualPower();
    total += this.sanctumRank * 20;
    return total;
  };

  window.MoonPhase = MoonPhase;
  window.SilverLight = SilverLight;
  window.NocturnalRitual = NocturnalRitual;
  window.LunarSanctum = LunarSanctum;
})();