// ============================================================================
// Card War Room — V182 Direction C
// Strategic war room with battle planning, unit deployments and tactics
// thunderbolt pipeline + generic-agent autonomous planning
// ============================================================================
'use strict';

(function () {
  // ----------------------------------------------------------------=======
  // UnitCard: A unit card for deployment
  // ========================================================================
  function UnitCard(cardId, name, unitClass, attack, defense, cost) {
    this.cardId = cardId;
    this.name = name || cardId;
    this.unitClass = unitClass || 'infantry'; // infantry, cavalry, artillery, commander
    this.attack = attack || 1;
    this.defense = defense || 1;
    this.cost = cost || 1;
  }

  UnitCard.prototype.getPower = function () {
    return this.attack + this.defense;
  };

  UnitCard.prototype.getBattlePower = function (terrainBonus) {
    var power = this.getPower();
    if (terrainBonus) power = Math.floor(power * 1.2);
    return power;
  };

  // ----------------------------------------------------------------=======
  // DeploymentZone: A zone where units are deployed
  // ========================================================================
  function DeploymentZone(zoneId, name, terrain) {
    this.zoneId = zoneId;
    this.name = name || zoneId;
    this.terrain = terrain || 'plains'; // plains, forest, mountain, river, city
    this.deployedUnits = []; // array of { unitCard, position }
    this.controlledBy = null; // 'player1' | 'player2' | null
    this.strength = 0;
  }

  DeploymentZone.prototype.deployUnit = function (unitCard, position) {
    this.deployedUnits.push({ unitCard: unitCard, position: position || 0 });
    this._recalculateStrength();
    return { success: true, unitCount: this.deployedUnits.length };
  };

  DeploymentZone.prototype.removeUnit = function (cardId) {
    for (var i = 0; i < this.deployedUnits.length; i++) {
      if (this.deployedUnits[i].unitCard.cardId === cardId) {
        this.deployedUnits.splice(i, 1);
        this._recalculateStrength();
        return { success: true };
      }
    }
    return { error: 'unit_not_found' };
  };

  DeploymentZone.prototype._recalculateStrength = function () {
    this.strength = 0;
    for (var i = 0; i < this.deployedUnits.length; i++) {
      this.strength += this.deployedUnits[i].unitCard.getPower();
    }
  };

  DeploymentZone.prototype.getStrength = function () {
    return this.strength;
  };

  DeploymentZone.prototype.setControl = function (playerId) {
    this.controlledBy = playerId;
    return { success: true };
  };

  DeploymentZone.prototype.capture = function (attackerId, attackerStrength) {
    if (attackerStrength > this.strength) {
      this.controlledBy = attackerId;
      this.strength = attackerStrength;
      return { captured: true, newController: attackerId };
    }
    return { captured: false };
  };

  // ----------------------------------------------------------------=======
  // WarPlan: A battle plan with deployments
  // ========================================================================
  function WarPlan(planId, playerId, name) {
    this.planId = planId || ('plan_' + Math.random().toString(36).substr(2, 6));
    this.playerId = playerId;
    this.name = name || 'Battle Plan ' + this.planId;
    this.zones = []; // array of DeploymentZone
    this.status = 'planning'; // planning, deployed, executed
    this.createdAt = Date.now();
  }

  WarPlan.prototype.addZone = function (zone) {
    this.zones.push(zone);
    return { success: true, zoneCount: this.zones.length };
  };

  WarPlan.prototype.getZone = function (zoneId) {
    for (var i = 0; i < this.zones.length; i++) {
      if (this.zones[i].zoneId === zoneId) return this.zones[i];
    }
    return null;
  };

  WarPlan.prototype.deployToZone = function (zoneId, unitCard, position) {
    var zone = this.getZone(zoneId);
    if (!zone) return { error: 'zone_not_found' };
    return zone.deployUnit(unitCard, position);
  };

  WarPlan.prototype.execute = function () {
    this.status = 'executed';
    return { success: true, executedAt: Date.now() };
  };

  WarPlan.prototype.getTotalStrength = function () {
    var total = 0;
    for (var i = 0; i < this.zones.length; i++) {
      total += this.zones[i].getStrength();
    }
    return total;
  };

  // ----------------------------------------------------------------=======
  // WarRoom: Manages war plans and battles
  // ========================================================================
  function WarRoom(storageKey) {
    this.storageKey = storageKey || 'war_room';
    this._plans = {}; // planId -> WarPlan
    this._planIdCounter = 0;
    this._init();
  }

  WarRoom.prototype._init = function () {
    this._load();
    if (Object.keys(this._plans).length === 0) {
      this._seedDefault();
    }
  };

  WarRoom.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._planIdCounter = data.counter || 0;
        }
      }
    } catch (e) {}
  };

  WarRoom.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({ counter: this._planIdCounter }));
      }
    } catch (e) {}
  };

  WarRoom.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[WarRoom] ' + msg);
    }
  };

  WarRoom.prototype._seedDefault = function () {
    var wp = new WarPlan('wp_default', 'player1', 'Default Battle Plan');
    wp.addZone(new DeploymentZone('z1', 'North Plains', 'plains'));
    wp.addZone(new DeploymentZone('z2', 'Forest Pass', 'forest'));
    this._plans['wp_default'] = wp;
  };

  WarRoom.prototype.createPlan = function (playerId, name) {
    var planId = 'plan_' + (++this._planIdCounter);
    this._plans[planId] = new WarPlan(planId, playerId, name);
    this._save();
    return { success: true, planId: planId };
  };

  WarRoom.prototype.getPlan = function (planId) {
    return this._plans[planId] || null;
  };

  WarRoom.prototype.getAllPlans = function () {
    return Object.keys(this._plans).map(function (k) { return this._plans[k]; }.bind(this));
  };

  WarRoom.prototype.getPlansByPlayer = function (playerId) {
    return Object.keys(this._plans).map(function (k) { return this._plans[k]; }.bind(this))
      .filter(function (p) { return p.playerId === playerId; });
  };

  WarRoom.prototype.resolveBattle = function (planId1, planId2) {
    var p1 = this._plans[planId1];
    var p2 = this._plans[planId2];
    if (!p1 || !p2) return { error: 'plan_not_found' };
    var str1 = p1.getTotalStrength();
    var str2 = p2.getTotalStrength();
    var winnerId = str1 > str2 ? p1.playerId : str2 > str1 ? p2.playerId : null;
    return { success: true, plan1Strength: str1, plan2Strength: str2, winnerId: winnerId };
  };

  // ----------------------------------------------------------------=======
  // Exports
  // ----------------------------------------------------------------=======
  window.UnitCard = UnitCard;
  window.DeploymentZone = DeploymentZone;
  window.WarPlan = WarPlan;
  window.WarRoom = WarRoom;
})();