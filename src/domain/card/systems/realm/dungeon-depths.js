// ============================================================================
// Card Dungeon Depths — V185 Direction A
// Roguelike dungeon exploration with procedural floors, traps, and loot
// nanobot distributed mesh architecture
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // Loot: A loot item dropped in dungeon
  // -----------------------------------------------------------------------
  function Loot(lootId, name, lootType, value) {
    this.lootId = lootId;
    this.name = name || lootId;
    this.lootType = lootType || 'gold'; // gold, item, scroll, potion
    this.value = value || 1;
    this.pickedUp = false;
  }

  Loot.prototype.pickUp = function () {
    if (this.pickedUp) return { error: 'already_picked_up' };
    this.pickedUp = true;
    return { success: true, value: this.value };
  };

  // -----------------------------------------------------------------------
  // Trap: A trap on a dungeon floor
  // -----------------------------------------------------------------------
  function Trap(trapId, name, damage, disarmCost) {
    this.trapId = trapId;
    this.name = name || trapId;
    this.damage = damage || 5;
    this.disarmCost = disarmCost || 2;
    this.active = true;
    this.triggered = false;
  }

  Trap.prototype.trigger = function (playerHP) {
    if (!this.active) return { triggered: false };
    this.triggered = true;
    var remaining = Math.max(0, playerHP - this.damage);
    return { triggered: true, damage: this.damage, remainingHP: remaining };
  };

  Trap.prototype.disarm = function () {
    if (!this.active) return { error: 'already_disarmed' };
    this.active = false;
    return { success: true, disarmCost: this.disarmCost };
  };

  // -----------------------------------------------------------------------
  // Floor: A single dungeon floor
  // -----------------------------------------------------------------------
  function Floor(floorId, level, theme) {
    this.floorId = floorId;
    this.level = level || 1;
    this.theme = theme || 'crypt'; // crypt, cave, castle, swamp
    this.traps = [];
    this.loots = [];
    this.cleared = false;
    this.monstersDefeated = false;
  }

  Floor.prototype.addTrap = function (trap) {
    this.traps.push(trap);
    return { success: true, trapCount: this.traps.length };
  };

  Floor.prototype.addLoot = function (loot) {
    this.loots.push(loot);
    return { success: true, lootCount: this.loots.length };
  };

  Floor.prototype.clear = function () {
    this.cleared = true;
    return { success: true };
  };

  Floor.prototype.getTotalLootValue = function () {
    var total = 0;
    for (var i = 0; i < this.loots.length; i++) {
      if (this.loots[i].pickedUp) total += this.loots[i].value;
    }
    return total;
  };

  // -----------------------------------------------------------------------
  // Dungeon: A roguelike dungeon with multiple floors
  // -----------------------------------------------------------------------
  function Dungeon(dungeonId, name, depth) {
    this.dungeonId = dungeonId;
    this.name = name || 'Dungeon ' + dungeonId;
    this.depth = depth || 5;
    this.floors = [];
    this.currentFloor = 0;
    this.explorerHP = 100;
    this.status = 'active'; // active, cleared, failed
  }

  Dungeon.prototype.addFloor = function (floor) {
    this.floors.push(floor);
    return { success: true, floorCount: this.floors.length };
  };

  Dungeon.prototype.enterNextFloor = function () {
    if (this.currentFloor >= this.floors.length - 1) {
      this.status = 'cleared';
      return { dungeonCleared: true, floorsExplored: this.floors.length };
    }
    this.currentFloor++;
    return { success: true, enteredFloor: this.currentFloor, floorLevel: this.floors[this.currentFloor].level };
  };

  Dungeon.prototype.getCurrentFloor = function () {
    return this.floors[this.currentFloor] || null;
  };

  Dungeon.prototype.takeTrapDamage = function (damage) {
    this.explorerHP = Math.max(0, this.explorerHP - damage);
    if (this.explorerHP <= 0) this.status = 'failed';
    return { remainingHP: this.explorerHP, status: this.status };
  };

  Dungeon.prototype.isCleared = function () {
    return this.status === 'cleared';
  };

  // -----------------------------------------------------------------------
  // DungeonManager: Manages dungeons and explorer state
  // -----------------------------------------------------------------------
  function DungeonManager(storageKey) {
    this.storageKey = storageKey || 'dungeon_manager';
    this._dungeons = {};
    this._dungeonIdCounter = 0;
    this._init();
  }

  DungeonManager.prototype._init = function () {
    this._load();
    if (Object.keys(this._dungeons).length === 0) {
      this._seedDefault();
    }
  };

  DungeonManager.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._dungeonIdCounter = data.counter || 0;
        }
      }
    } catch (e) {}
  };

  DungeonManager.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({ counter: this._dungeonIdCounter }));
      }
    } catch (e) {}
  };

  DungeonManager.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[DungeonManager] ' + msg);
    }
  };

    DungeonManager.prototype._seedDefault = function () {
    var d = new Dungeon('d_default', 'Dark Crypt', 3);
    for (var i = 0; i < 3; i++) {
      d.addFloor(new Floor('f' + i, i + 1, 'crypt'));
    }
    this._dungeons['d_default'] = d;
  };

  DungeonManager.prototype.createDungeon = function (name, depth) {
    var dungeonId = 'd' + (++this._dungeonIdCounter);
    this._dungeons[dungeonId] = new Dungeon(dungeonId, name, depth);
    for (var i = 0; i < depth; i++) {
      this._dungeons[dungeonId].addFloor(new Floor('f' + i, i + 1, 'cave'));
    }
    this._save();
    return { success: true, dungeonId: dungeonId };
  };

  DungeonManager.prototype.getDungeon = function (dungeonId) {
    return this._dungeons[dungeonId] || null;
  };

  DungeonManager.prototype.getAllDungeons = function () {
    return Object.keys(this._dungeons).map(function (k) { return this._dungeons[k]; }.bind(this));
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.Loot = Loot;
  window.Trap = Trap;
  window.Floor = Floor;
  window.Dungeon = Dungeon;
  window.DungeonManager = DungeonManager;
})();