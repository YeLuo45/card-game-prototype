// ============================================================================
// Card Battle Tower — V162 Direction A
// Roguelike tower climbing with floor challenges and persistent buffs
// nanobot mesh + thunderbolt pipeline feedback loops
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // Floor: Single tower floor with enemy team
  // ========================================================================
  function Floor(floorNum, enemyTeam, bossFlag, reward) {
    this.floorNum = floorNum || 1;
    this.enemyTeam = enemyTeam || []; // array of card objects
    this.bossFlag = bossFlag || false;
    this.reward = reward || null; // { gold: 0, items: [], score: 0 }
    this.cleared = false;
    this.attemptCount = 0;
  }

  // --------------------------------------------------------------------===
  // TowerBuff: Persistent buff obtained during tower climb
  // ========================================================================
  function TowerBuff(id, name, description, attackBonus, healthBonus, specialEffect) {
    this.id = id || '';
    this.name = name || '';
    this.description = description || '';
    this.attackBonus = attackBonus || 0;
    this.healthBonus = healthBonus || 0;
    this.specialEffect = specialEffect || null;
  }

  TowerBuff.prototype.applyToCard = function (card) {
    var c = Object.assign({}, card);
    if (this.attackBonus) c.attack = (c.attack || 0) + this.attackBonus;
    if (this.healthBonus) c.health = (c.health || 0) + this.healthBonus;
    c.towerBuffs = c.towerBuffs || [];
    c.towerBuffs.push(this.id);
    return c;
  };

  // --------------------------------------------------------------------===
  // TowerShop: Shop between floors
  // ========================================================================
  function TowerShop(gold) {
    this.gold = gold || 0;
    this.items = []; // { buff: TowerBuff, cost: number }
    this.purchased = []; // item indices
  }

  TowerShop.prototype.generateItems = function (floorNum) {
    this.items = [];
    var allBuffs = [
      new TowerBuff('buff_atk', 'Attack Boost', '+5 attack', 5, 0, null),
      new TowerBuff('buff_hp', 'Vitality', '+10 health', 0, 10, null),
      new TowerBuff('buff_atk2', 'Fury', '+8 attack', 8, 0, null),
      new TowerBuff('buff_hp2', 'Fortitude', '+15 health', 0, 15, null),
      new TowerBuff('buff_mix', 'Balance', '+3 attack, +5 health', 3, 5, null),
      new TowerBuff('buff_crit', 'Precision', '+10% crit chance', 2, 0, 'crit'),
      new TowerBuff('buff_lifesteal', 'Vampirism', '+5 lifesteal', 0, 3, 'lifesteal'),
    ];
    // Pick 3 random items based on floor
    var count = Math.min(3, floorNum > 5 ? 4 : 3);
    for (var i = 0; i < count && i < allBuffs.length; i++) {
      var baseCost = 10 + floorNum * 3;
      this.items.push({
        buff: allBuffs[i],
        cost: baseCost + Math.floor(Math.random() * 5)
      });
    }
  };

  TowerShop.prototype.buyItem = function (itemIndex) {
    if (this.purchased.indexOf(itemIndex) >= 0) return { error: 'already_purchased' };
    if (itemIndex < 0 || itemIndex >= this.items.length) return { error: 'item_not_found' };
    var item = this.items[itemIndex];
    if (this.gold < item.cost) return { error: 'not_enough_gold' };
    this.gold -= item.cost;
    this.purchased.push(itemIndex);
    return { success: true, buff: item.buff };
  };

  // --------------------------------------------------------------------===
  // BattleTower: Main tower system
  // ========================================================================
  function BattleTower(storageKey) {
    this.storageKey = storageKey || 'battle_tower';
    this._currentFloor = 0;
    this._floors = []; // array of Floor
    this._activeBuffs = []; // array of TowerBuff
    this._gold = 0;
    this._score = 0;
    this._stats = { highestFloor: 0, totalClears: 0, totalAttempts: 0 };
    this._started = false;
    this._init();
  }

  BattleTower.prototype._init = function () {
    this._load();
    if (this._floors.length === 0) this._generateFloors();
  };

  BattleTower.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._currentFloor = data.currentFloor || 0;
          this._floors = data.floors || [];
          this._gold = data.gold || 0;
          this._score = data.score || 0;
          this._stats = data.stats || this._stats;
          this._started = data.started || false;
          // Reconstruct buffs
          this._activeBuffs = [];
          if (data.buffIds) {
            for (var i = 0; i < data.buffIds.length; i++) {
              var b = this._reconstructBuff(data.buffIds[i]);
              if (b) this._activeBuffs.push(b);
            }
          }
        }
      }
    } catch (e) {}
  };

  BattleTower.prototype._reconstructBuff = function (id) {
    var buffMap = {
      'buff_atk': new TowerBuff('buff_atk', 'Attack Boost', '+5 attack', 5, 0, null),
      'buff_hp': new TowerBuff('buff_hp', 'Vitality', '+10 health', 0, 10, null),
      'buff_atk2': new TowerBuff('buff_atk2', 'Fury', '+8 attack', 8, 0, null),
      'buff_hp2': new TowerBuff('buff_hp2', 'Fortitude', '+15 health', 0, 15, null),
      'buff_mix': new TowerBuff('buff_mix', 'Balance', '+3 attack, +5 health', 3, 5, null),
      'buff_crit': new TowerBuff('buff_crit', 'Precision', '+10% crit chance', 2, 0, 'crit'),
      'buff_lifesteal': new TowerBuff('buff_lifesteal', 'Vampirism', '+5 lifesteal', 0, 3, 'lifesteal'),
    };
    return buffMap[id] || null;
  };

  BattleTower.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          currentFloor: this._currentFloor,
          floors: this._floors,
          gold: this._gold,
          score: this._score,
          stats: this._stats,
          started: this._started,
          buffIds: this._activeBuffs.map(function (b) { return b.id; })
        }));
      }
    } catch (e) {}
  };

  BattleTower.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[BattleTower] ' + msg);
    }
  };

  BattleTower.prototype._generateFloors = function () {
    this._floors = [];
    for (var i = 1; i <= 20; i++) {
      var enemyTeam = [
        { id: 'e' + i, name: 'Enemy ' + i, attack: 3 + i, health: 5 + i * 2 },
        { id: 'e' + (i + 20), name: 'Enemy ' + (i + 20), attack: 4 + i, health: 4 + i * 2 }
      ];
      var isBoss = i % 5 === 0;
      if (isBoss) {
        enemyTeam = [
          { id: 'boss' + i, name: 'Boss ' + i, attack: 8 + i, health: 15 + i * 3 },
          { id: 'guard' + i, name: 'Guard ' + i, attack: 5 + i, health: 8 + i * 2 }
        ];
      }
      var reward = { gold: 5 + i * 2, score: i * 10, items: [] };
      if (isBoss) reward.gold *= 2;
      this._floors.push(new Floor(i, enemyTeam, isBoss, reward));
    }
    this._log('Generated 20 floors');
  };

  // Start/restart tower
  BattleTower.prototype.startTower = function () {
    this._currentFloor = 0;
    this._activeBuffs = [];
    this._gold = 0;
    this._score = 0;
    this._started = true;
    this._generateFloors();
    this._save();
    return { success: true, floor: this.getCurrentFloor() };
  };

  // Get current floor
  BattleTower.prototype.getCurrentFloor = function () {
    return this._floors[this._currentFloor] || null;
  };

  // Get active buffs
  BattleTower.prototype.getActiveBuffs = function () {
    return this._activeBuffs.slice();
  };

  // Apply buffs to a card team
  BattleTower.prototype.applyBuffsToTeam = function (team) {
    var self = this;
    return team.map(function (card) {
      var c = Object.assign({}, card);
      for (var i = 0; i < self._activeBuffs.length; i++) {
        c = self._activeBuffs[i].applyToCard(c);
      }
      return c;
    });
  };

  // Attempt current floor
  BattleTower.prototype.attemptFloor = function (playerTeam) {
    var floor = this.getCurrentFloor();
    if (!floor) return { error: 'no_floor' };
    if (floor.cleared) return { error: 'floor_already_cleared' };

    floor.attemptCount++;
    this._stats.totalAttempts++;

    // Simple battle: total attack vs total enemy health
    var playerAtk = 0;
    for (var i = 0; i < playerTeam.length; i++) {
      playerAtk += playerTeam[i].attack || 0;
    }

    var enemyHp = 0;
    for (var j = 0; j < floor.enemyTeam.length; j++) {
      enemyHp += floor.enemyTeam[j].health || 0;
    }

    var won = playerAtk >= enemyHp;

    if (won) {
      floor.cleared = true;
      this._gold += floor.reward.gold;
      this._score += floor.reward.score;
      if (floor.floorNum > this._stats.highestFloor) {
        this._stats.highestFloor = floor.floorNum;
      }
      this._stats.totalClears++;
      this._currentFloor++;
      this._save();
      return {
        success: true,
        floorCleared: floor.floorNum,
        reward: floor.reward,
        nextFloor: this._currentFloor
      };
    }

    return { success: false, error: 'battle_lost', floorNum: floor.floorNum };
  };

  // Get shop for current floor
  BattleTower.prototype.getShop = function () {
    var floor = this.getCurrentFloor();
    if (!floor || !floor.cleared) return { error: 'floor_not_cleared' };
    if (this._currentFloor >= this._floors.length) return { error: 'tower_complete' };

    var shop = new TowerShop(this._gold);
    shop.generateItems(floor.floorNum);
    return {
      shop: shop,
      gold: this._gold,
      floorNum: floor.floorNum
    };
  };

  // Buy shop item
  BattleTower.prototype.buyShopItem = function (itemIndex) {
    var floor = this.getCurrentFloor();
    if (!floor || !floor.cleared) return { error: 'floor_not_cleared' };
    if (this._currentFloor >= this._floors.length) return { error: 'tower_complete' };

    var shopData = this.getShop();
    var result = shopData.shop.buyItem(itemIndex);
    if (result.success) {
      this._activeBuffs.push(result.buff);
      this._gold = shopData.shop.gold;
      this._save();
    }
    return result;
  };

  // Get tower info
  BattleTower.prototype.getTowerInfo = function () {
    return {
      currentFloor: this._currentFloor,
      totalFloors: this._floors.length,
      gold: this._gold,
      score: this._score,
      highestFloor: this._stats.highestFloor,
      activeBuffs: this._activeBuffs.length,
      totalClears: this._stats.totalClears,
      totalAttempts: this._stats.totalAttempts,
      isStarted: this._started,
      isComplete: this._currentFloor >= this._floors.length
    };
  };

  // List floors
  BattleTower.prototype.listFloors = function () {
    return this._floors.map(function (f) {
      return {
        floorNum: f.floorNum,
        bossFlag: f.bossFlag,
        cleared: f.cleared,
        attemptCount: f.attemptCount
      };
    });
  };

  // Heal team (healing item between floors)
  BattleTower.prototype.healTeam = function (team, healAmount) {
    if (this._gold < 5) return { error: 'not_enough_gold' };
    this._gold -= 5;
    var healed = [];
    for (var i = 0; i < team.length; i++) {
      team[i].health = (team[i].health || 0) + (healAmount || 10);
      healed.push(team[i]);
    }
    this._save();
    return { success: true, team: healed };
  };

  // --------------------------------------------------------------------===
  // Exports
  // ----------------------------------------------------------------=======
  window.Floor = Floor;
  window.TowerBuff = TowerBuff;
  window.TowerShop = TowerShop;
  window.BattleTower = BattleTower;
})();