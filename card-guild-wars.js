// ============================================================================
// Card Guild Wars — V171 Direction A
// Guild vs guild competitive battles with territory control
// nanobot distributed mesh: guild nodes form competitive network
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // Guild: A competitive guild
  // ========================================================================
  function Guild(guildId, name, leaderId) {
    this.guildId = guildId;
    this.name = name || guildId;
    this.leaderId = leaderId;
    this.members = []; // [{playerId, rank, contributedPower}]
    this.memberMap = {};
    this.power = 0;
    this.territory = 0; // number of territories controlled
    this.wins = 0;
    this.losses = 0;
    this.rank = 0;
    this._memberIdSet = {};
  }

  Guild.prototype.addMember = function (playerId, rank) {
    if (this._memberIdSet[playerId]) return { error: 'already_member' };
    var entry = { playerId: playerId, rank: rank || 'member', contributedPower: 0 };
    this.members.push(entry);
    this.memberMap[playerId] = entry;
    this._memberIdSet[playerId] = true;
    this._recalcPower();
    return { success: true, memberCount: this.members.length };
  };

  Guild.prototype.removeMember = function (playerId) {
    if (!this._memberIdSet[playerId]) return { error: 'not_member' };
    delete this._memberIdSet[playerId];
    delete this.memberMap[playerId];
    this.members = this.members.filter(function (m) { return m.playerId !== playerId; });
    this._recalcPower();
    return { success: true };
  };

  Guild.prototype.contributePower = function (playerId, amount) {
    var entry = this.memberMap[playerId];
    if (!entry) return { error: 'not_member' };
    entry.contributedPower += amount;
    this._recalcPower();
    return { success: true, totalPower: this.power };
  };

  Guild.prototype._recalcPower = function () {
    var total = 0;
    for (var i = 0; i < this.members.length; i++) {
      total += this.members[i].contributedPower;
    }
    this.power = total;
  };

  Guild.prototype.setRank = function (rank) {
    this.rank = rank;
    return { success: true };
  };

  Guild.prototype.recordWin = function () {
    this.wins++;
    return { success: true };
  };

  Guild.prototype.recordLoss = function () {
    this.losses++;
    return { success: true };
  };

  Guild.prototype.getMemberCount = function () {
    return this.members.length;
  };

  Guild.prototype.getWinRate = function () {
    var total = this.wins + this.losses;
    if (total === 0) return 0;
    return Math.round((this.wins / total) * 100);
  };

  // --------------------------------------------------------------------===
  // Territory: A controllable territory
  // ========================================================================
  function Territory(territoryId, name, resourceType, difficulty) {
    this.territoryId = territoryId;
    this.name = name || territoryId;
    this.resourceType = resourceType || 'gold';
    this.difficulty = difficulty || 1;
    this.controllingGuildId = null;
    this.rewardRate = difficulty || 1;
  }

  Territory.prototype.isControlled = function () {
    return this.controllingGuildId !== null;
  };

  Territory.prototype.capture = function (guildId) {
    this.controllingGuildId = guildId;
    return { success: true, territoryId: this.territoryId };
  };

  Territory.prototype.release = function () {
    this.controllingGuildId = null;
    return { success: true };
  };

  // --------------------------------------------------------------------===
  // GuildWar: A single guild vs guild war event
  // ========================================================================
  function GuildWar(warId, attackerId, defenderId, territoryId) {
    this.warId = warId;
    this.attackerId = attackerId;
    this.defenderId = defenderId;
    this.territoryId = territoryId;
    this.attackerPower = 0;
    this.defenderPower = 0;
    this.winnerId = null;
    this.status = 'pending'; // pending, resolved
    this.warStartTime = null;
    this.warEndTime = null;
  }

  GuildWar.prototype.commit = function (attackerPower, defenderPower) {
    this.attackerPower = attackerPower;
    this.defenderPower = defenderPower;
    this.winnerId = attackerPower > defenderPower ? this.attackerId : this.defenderId;
    this.status = 'resolved';
    this.warStartTime = Date.now();
    this.warEndTime = Date.now() + 1000;
    return { success: true, winnerId: this.winnerId };
  };

  GuildWar.prototype.getResult = function () {
    if (this.status !== 'resolved') return null;
    return {
      warId: this.warId,
      winnerId: this.winnerId,
      attackerId: this.attackerId,
      defenderId: this.defenderId,
      attackerPower: this.attackerPower,
      defenderPower: this.defenderPower
    };
  };

  // --------------------------------------------------------------------===
  // GuildWarManager: Manages guilds, territories and wars
  // ========================================================================
  function GuildWarManager(storageKey) {
    this.storageKey = storageKey || 'guild_war_manager';
    this._guilds = {};
    this._territories = {};
    this._wars = {};
    this._warIdCounter = 0;
    this._init();
  }

  GuildWarManager.prototype._init = function () {
    this._load();
    if (Object.keys(this._territories).length === 0) {
      this._createDefaultTerritories();
    }
  };

  GuildWarManager.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._warIdCounter = data.warIdCounter || 0;
        }
      }
    } catch (e) {}
  };

  GuildWarManager.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          warIdCounter: this._warIdCounter
        }));
      }
    } catch (e) {}
  };

  GuildWarManager.prototype._createDefaultTerritories = function () {
    var def = [
      new Territory('t1', 'Gold Plains', 'gold', 1),
      new Territory('t2', 'Silver Hills', 'silver', 2),
      new Territory('t3', 'Diamond Summit', 'diamond', 3),
      new Territory('t4', 'Crystal Valley', 'crystal', 2),
      new Territory('t5', 'Ruby Canyon', 'ruby', 1)
    ];
    for (var i = 0; i < def.length; i++) {
      this._territories[def[i].territoryId] = def[i];
    }
  };

  GuildWarManager.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[GuildWarManager] ' + msg);
    }
  };

  GuildWarManager.prototype.createGuild = function (guildId, name, leaderId) {
    if (this._guilds[guildId]) return { error: 'guild_exists' };
    this._guilds[guildId] = new Guild(guildId, name, leaderId);
    return { success: true };
  };

  GuildWarManager.prototype.getGuild = function (guildId) {
    return this._guilds[guildId] || null;
  };

  GuildWarManager.prototype.getAllGuilds = function () {
    return Object.keys(this._guilds).map(function (k) { return this._guilds[k]; }.bind(this));
  };

  GuildWarManager.prototype.addMemberToGuild = function (guildId, playerId, rank) {
    var guild = this._guilds[guildId];
    if (!guild) return { error: 'guild_not_found' };
    return guild.addMember(playerId, rank);
  };

  GuildWarManager.prototype.removeMemberFromGuild = function (guildId, playerId) {
    var guild = this._guilds[guildId];
    if (!guild) return { error: 'guild_not_found' };
    return guild.removeMember(playerId);
  };

  GuildWarManager.prototype.contributeGuildPower = function (guildId, playerId, amount) {
    var guild = this._guilds[guildId];
    if (!guild) return { error: 'guild_not_found' };
    return guild.contributePower(playerId, amount);
  };

  GuildWarManager.prototype.getTerritories = function () {
    return Object.keys(this._territories).map(function (k) { return this._territories[k]; }.bind(this));
  };

  GuildWarManager.prototype.getTerritory = function (territoryId) {
    return this._territories[territoryId] || null;
  };

  GuildWarManager.prototype.captureTerritory = function (guildId, territoryId) {
    var territory = this._territories[territoryId];
    if (!territory) return { error: 'territory_not_found' };
    var result = territory.capture(guildId);
    if (result.success) {
      var guild = this._guilds[guildId];
      if (guild) guild.territory++;
    }
    return result;
  };

  GuildWarManager.prototype.getGuildTerritories = function (guildId) {
    var result = [];
    var self = this;
    Object.keys(this._territories).forEach(function (k) {
      var t = self._territories[k];
      if (t.controllingGuildId === guildId) result.push(t);
    });
    return result;
  };

  GuildWarManager.prototype.declareWar = function (attackerId, defenderId, territoryId) {
    if (!this._guilds[attackerId]) return { error: 'attacker_not_found' };
    if (!this._guilds[defenderId]) return { error: 'defender_not_found' };
    var territory = this._territories[territoryId];
    if (!territory) return { error: 'territory_not_found' };
    var warId = 'war_' + (++this._warIdCounter);
    var war = new GuildWar(warId, attackerId, defenderId, territoryId);
    this._wars[warId] = war;
    return { success: true, warId: warId };
  };

  GuildWarManager.prototype.resolveWar = function (warId, attackerPower, defenderPower) {
    var war = this._wars[warId];
    if (!war) return { error: 'war_not_found' };
    if (war.status === 'resolved') return { error: 'already_resolved' };
    var result = war.commit(attackerPower, defenderPower);
    if (result.success) {
      var attacker = this._guilds[war.attackerId];
      var defender = this._guilds[war.defenderId];
      if (attacker && war.winnerId === war.attackerId) attacker.recordWin();
      if (attacker && war.winnerId !== war.attackerId) attacker.recordLoss();
      if (defender && war.winnerId === war.defenderId) defender.recordWin();
      if (defender && war.winnerId !== war.defenderId) defender.recordLoss();
      this._save();
    }
    return result;
  };

  GuildWarManager.prototype.getWar = function (warId) {
    return this._wars[warId] || null;
  };

  GuildWarManager.prototype.getWarResult = function (warId) {
    var war = this._wars[warId];
    if (!war) return null;
    return war.getResult();
  };

  GuildWarManager.prototype.getGuildRankings = function () {
    var self = this;
    return Object.keys(this._guilds).map(function (k) { return self._guilds[k]; })
      .sort(function (a, b) {
        if (b.power !== a.power) return b.power - a.power;
        return b.getWinRate() - a.getWinRate();
      });
  };

  // ----------------------------------------------------------------=======
  // Exports
  // ----------------------------------------------------------------=======
  window.Guild = Guild;
  window.Territory = Territory;
  window.GuildWar = GuildWar;
  window.GuildWarManager = GuildWarManager;
})();