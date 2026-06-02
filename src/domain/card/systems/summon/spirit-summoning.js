// ============================================================================
// Card Spirit Summoning — V190 Direction A
// Spirit summoning circle with ritual components, summoning odds, and spirit bonds
// nanobot distributed mesh + thunderbolt feedback loops
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // RitualComponent: A component used in summoning rituals
  // -----------------------------------------------------------------------
  function RitualComponent(componentId, name, element, rarity, power) {
    this.componentId = componentId;
    this.name = name || componentId;
    this.element = element || 'neutral';
    this.rarity = rarity || 'common'; // common, uncommon, rare, epic, legendary
    this.power = power || 1;
    this.consumed = false;
  }

  RitualComponent.prototype.consume = function () {
    if (this.consumed) return { error: 'already_consumed' };
    this.consumed = true;
    return { success: true, powerGained: this.power };
  };

  // -----------------------------------------------------------------------
  // SummoningCircle: A ritual circle for summoning spirits
  // -----------------------------------------------------------------------
  function SummoningCircle(circleId, name, size) {
    this.circleId = circleId;
    this.name = name || 'Summoning Circle ' + circleId;
    this.size = size || 3; // max components
    this.components = [];
    this.circlePower = 0;
    this.activated = false;
  }

  SummoningCircle.prototype.addComponent = function (component) {
    if (this.components.length >= this.size) return { error: 'circle_full' };
    if (this.activated) return { error: 'circle_already_activated' };
    this.components.push(component);
    this._recalculatePower();
    return { success: true, componentCount: this.components.length };
  };

  SummoningCircle.prototype._recalculatePower = function () {
    this.circlePower = 0;
    for (var i = 0; i < this.components.length; i++) {
      this.circlePower += this.components[i].power;
    }
  };

  SummoningCircle.prototype.activate = function () {
    if (this.activated) return { error: 'already_activated' };
    if (this.components.length === 0) return { error: 'no_components' };
    this.activated = true;
    return { success: true, totalPower: this.circlePower };
  };

  SummoningCircle.prototype.getAverageRarity = function () {
    var rarityValues = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
    if (this.components.length === 0) return 0;
    var total = 0;
    for (var i = 0; i < this.components.length; i++) {
      total += rarityValues[this.components[i].rarity] || 1;
    }
    return total / this.components.length;
  };

  // -----------------------------------------------------------------------
  // Spirit: A summoned spirit
  // -----------------------------------------------------------------------
  function Spirit(spiritId, name, element, tier, power) {
    this.spiritId = spiritId;
    this.name = name || 'Spirit ' + spiritId;
    this.element = element || 'neutral';
    this.tier = tier || 1;
    this.power = power || 1;
    this.bonded = false;
    this.summonerId = null;
  }

  Spirit.prototype.bindTo = function (summonerId) {
    this.bonded = true;
    this.summonerId = summonerId;
    return { success: true };
  };

  Spirit.prototype.getPowerRating = function () {
    return this.tier * this.power * (this.bonded ? 2 : 1);
  };

  // -----------------------------------------------------------------------
  // SummoningRitual: A summoning ritual with odds and outcomes
  // -----------------------------------------------------------------------
  function SummoningRitual(ritualId, name, minPower, tierRange) {
    this.ritualId = ritualId;
    this.name = name || 'Ritual ' + ritualId;
    this.minPower = minPower || 10;
    this.tierRange = tierRange || { min: 1, max: 5 };
    this.successCount = 0;
    this.failureCount = 0;
  }

  SummoningRitual.prototype.attempt = function (circle) {
    if (!circle.activated) return { error: 'circle_not_activated' };
    var success = circle.circlePower >= this.minPower;
    if (success) {
      this.successCount++;
      var tier = this._rollTier(circle.getAverageRarity());
      var spirit = new Spirit('spirit_' + (Date.now()), this.name + ' Spirit', circle.components[0].element, tier, circle.circlePower);
      return { success: true, spirit: spirit, tier: tier };
    } else {
      this.failureCount++;
      return { success: false, reason: 'insufficient_power' };
    }
  };

  SummoningRitual.prototype._rollTier = function (avgRarity) {
    var roll = Math.random() * 100;
    if (roll < 50 * avgRarity / 5) return this.tierRange.max;
    if (roll < 75 * avgRarity / 5) return Math.max(1, this.tierRange.max - 1);
    return this.tierRange.min;
  };

  SummoningRitual.prototype.getSuccessRate = function () {
    var total = this.successCount + this.failureCount;
    if (total === 0) return 0;
    return Math.floor((this.successCount / total) * 100);
  };

  // -----------------------------------------------------------------------
  // SummoningManager: Manages all summoning circles and rituals
  // -----------------------------------------------------------------------
  function SummoningManager(storageKey) {
    this.storageKey = storageKey || 'summoning_manager';
    this._circles = {};
    this._rituals = {};
    this._circleIdCounter = 0;
    this._init();
  }

  SummoningManager.prototype._init = function () {
    this._load();
    if (Object.keys(this._circles).length === 0) {
      this._seedDefault();
    }
  };

  SummoningManager.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._circleIdCounter = data.circleCounter || 0;
        }
      }
    } catch (e) {}
  };

  SummoningManager.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({ circleCounter: this._circleIdCounter }));
      }
    } catch (e) {}
  };

  SummoningManager.prototype._seedDefault = function () {
    this._circles['default'] = new SummoningCircle('default', 'Ancient Circle', 3);
  };

  SummoningManager.prototype.createCircle = function (name, size) {
    var circleId = 'circle_' + (++this._circleIdCounter);
    this._circles[circleId] = new SummoningCircle(circleId, name, size);
    this._save();
    return { success: true, circleId: circleId };
  };

  SummoningManager.prototype.getCircle = function (circleId) {
    return this._circles[circleId] || null;
  };

  SummoningManager.prototype.getAllCircles = function () {
    return Object.keys(this._circles).map(function (k) { return this._circles[k]; }.bind(this));
  };

  SummoningManager.prototype.addRitual = function (ritual) {
    this._rituals[ritual.ritualId] = ritual;
    return { success: true };
  };

  SummoningManager.prototype.getRitual = function (ritualId) {
    return this._rituals[ritualId] || null;
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.RitualComponent = RitualComponent;
  window.SummoningCircle = SummoningCircle;
  window.Spirit = Spirit;
  window.SummoningRitual = SummoningRitual;
  window.SummoningManager = SummoningManager;
})();