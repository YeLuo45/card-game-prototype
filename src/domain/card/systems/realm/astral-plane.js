// ============================================================================
// Card Astral Plane — V193 Direction C
// Astral plane exploration with constellation maps, astral paths and cosmic energy
// thunderbolt + generic-agent autonomous pursuit
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // Constellation: A star constellation in the astral plane
  // -----------------------------------------------------------------------
  function Constellation(constId, name, stars, brightness, power) {
    this.constId = constId;
    this.name = name || constId;
    this.stars = stars || []; // array of { x, y } coordinates
    this.brightness = brightness || 50; // 0-100
    this.power = power || 1;
    this.activated = false;
  }

  Constellation.prototype.getStarCount = function () { return this.stars.length; };

  Constellation.prototype.activate = function () {
    if (this.activated) return { error: 'already_activated' };
    this.activated = true;
    return { success: true, brightness: this.brightness };
  };

  Constellation.prototype.getEffectivePower = function () {
    return Math.floor(this.power * (this.brightness / 100) * (this.activated ? 2 : 1));
  };

  // -----------------------------------------------------------------------
  // AstralPath: A path connecting constellations
  // -----------------------------------------------------------------------
  function AstralPath(pathId, fromConst, toConst, length, difficulty) {
    this.pathId = pathId;
    this.fromConst = fromConst || null;
    this.toConst = toConst || null;
    this.length = length || 10;
    this.difficulty = difficulty || 1;
    this.traversed = false;
    this.traverseCount = 0;
  }

  AstralPath.prototype.traverse = function () {
    this.traverseCount++;
    this.traversed = true;
    return { success: true, length: this.length, powerCost: Math.floor(this.length * this.difficulty) };
  };

  AstralPath.prototype.reset = function () {
    this.traversed = false;
    this.traverseCount = 0;
    return { success: true };
  };

  // --------------------------------------------------------------------===
  // CosmicEnergy: Cosmic energy source in the astral plane
  // --------------------------------------------------------------------===
  function CosmicEnergy(energyId, name, energyType, amount, rechargeRate) {
    this.energyId = energyId;
    this.name = name || energyId;
    this.energyType = energyType || 'stellar'; // stellar, nebula, void, solar
    this.amount = amount || 100;
    this.maxAmount = amount || 100;
    this.rechargeRate = rechargeRate || 5;
  }

  CosmicEnergy.prototype.consume = function (amount) {
    if (this.amount < amount) return { error: 'insufficient_energy', available: this.amount };
    this.amount = Math.max(0, this.amount - amount);
    return { success: true, consumed: amount, remaining: this.amount };
  };

  CosmicEnergy.prototype.recharge = function () {
    this.amount = Math.min(this.maxAmount, this.amount + this.rechargeRate);
    return { success: true, amount: this.amount };
  };

  CosmicEnergy.prototype.getEnergyLevel = function () {
    var pct = (this.amount / this.maxAmount) * 100;
    if (pct >= 75) return 'full';
    if (pct >= 50) return 'high';
    if (pct >= 25) return 'low';
    return 'depleted';
  };

  // --------------------------------------------------------------------===
  // AstralPlane: The main astral plane manager
  // --------------------------------------------------------------------===
  function AstralPlane(planeId, name) {
    this.planeId = planeId || ('plane_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Astral Plane';
    this.constellations = {};
    this.paths = {};
    this.energySources = {};
    this.visitedConstellations = [];
    this.constCounter = 0;
    this.pathCounter = 0;
    this.energyCounter = 0;
    this._seedDefault();
  }

  AstralPlane.prototype._seedDefault = function () {
    var c = new Constellation('const_default', 'North Star', [{ x: 0, y: 0 }, { x: 1, y: 1 }], 80, 10);
    this.constellations['const_default'] = c;
    var e = new CosmicEnergy('energy_default', 'Star Core', 'stellar', 100, 10);
    this.energySources['energy_default'] = e;
  };

  AstralPlane.prototype.addConstellation = function (constellation) {
    this.constellations[constellation.constId] = constellation;
    return { success: true, constCount: Object.keys(this.constellations).length };
  };

  AstralPlane.prototype.addPath = function (path) {
    this.paths[path.pathId] = path;
    return { success: true, pathCount: Object.keys(this.paths).length };
  };

  AstralPlane.prototype.addEnergySource = function (source) {
    this.energySources[source.energyId] = source;
    return { success: true, energyCount: Object.keys(this.energySources).length };
  };

  AstralPlane.prototype.getConstellation = function (id) { return this.constellations[id] || null; };
  AstralPlane.prototype.getPath = function (id) { return this.paths[id] || null; };
  AstralPlane.prototype.getEnergySource = function (id) { return this.energySources[id] || null; };

  AstralPlane.prototype.navigateTo = function (constId) {
    var c = this.constellations[constId];
    if (!c) return { error: 'constellation_not_found' };
    this.visitedConstellations.push(constId);
    return { success: true, constellation: c };
  };

  AstralPlane.prototype.getAllConstellations = function () {
    return Object.keys(this.constellations).map(function (k) { return this.constellations[k]; }.bind(this));
  };

  AstralPlane.prototype.getVisitCount = function () { return this.visitedConstellations.length; };

  // --------------------------------------------------------------------===
  // Exports
  // --------------------------------------------------------------------===
  window.Constellation = Constellation;
  window.AstralPath = AstralPath;
  window.CosmicEnergy = CosmicEnergy;
  window.AstralPlane = AstralPlane;
})();