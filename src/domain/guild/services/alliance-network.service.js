// ============================================================================
// Card Alliance Network — V180 Direction A
// Inter-guild alliance system with diplomatic relations and joint events
// nanobot distributed mesh architecture
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // Alliance: A guild alliance with members and relations
  // ========================================================================
  function Alliance(allianceId, name, guildIds, prestige) {
    this.allianceId = allianceId || ('alliance_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Alliance ' + this.allianceId;
    this.guildIds = guildIds || []; // array of guildIds
    this.prestige = prestige || 0;
    this.relations = {}; // otherAllianceId -> 'ally'|'neutral'|'rival'
    this.jointEvents = []; // array of { eventId, name, status }
    this.joinedAt = Date.now();
  }

  Alliance.prototype.addGuild = function (guildId) {
    if (this.guildIds.indexOf(guildId) >= 0) return { error: 'already_member' };
    this.guildIds.push(guildId);
    return { success: true, guildCount: this.guildIds.length };
  };

  Alliance.prototype.removeGuild = function (guildId) {
    var idx = this.guildIds.indexOf(guildId);
    if (idx < 0) return { error: 'guild_not_found' };
    this.guildIds.splice(idx, 1);
    return { success: true, guildCount: this.guildIds.length };
  };

  Alliance.prototype.getRelation = function (otherAllianceId) {
    return this.relations[otherAllianceId] || 'neutral';
  };

  Alliance.prototype.setRelation = function (otherAllianceId, relation) {
    if (['ally', 'neutral', 'rival'].indexOf(relation) < 0) return { error: 'invalid_relation' };
    this.relations[otherAllianceId] = relation;
    return { success: true };
  };

  Alliance.prototype.addJointEvent = function (eventId, name) {
    this.jointEvents.push({ eventId: eventId, name: name, status: 'active' });
    return { success: true };
  };

  Alliance.prototype.getPrestige = function () {
    return this.prestige;
  };

  // --------------------------------------------------------------------===
  // AllianceNetwork: Manages all alliances
  // ========================================================================
  function AllianceNetwork(storageKey) {
    this.storageKey = storageKey || 'alliance_network';
    this._alliances = {}; // allianceId -> Alliance
    this._allianceIdCounter = 0;
    this._init();
  }

  AllianceNetwork.prototype._init = function () {
    this._load();
    if (Object.keys(this._alliances).length === 0) {
      this._seedDefault();
    }
  };

  AllianceNetwork.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._allianceIdCounter = data.counter || 0;
        }
      }
    } catch (e) {}
  };

  AllianceNetwork.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({ counter: this._allianceIdCounter }));
      }
    } catch (e) {}
  };

  AllianceNetwork.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[AllianceNetwork] ' + msg);
    }
  };

  AllianceNetwork.prototype._seedDefault = function () {
    var a1 = new Alliance('a1', 'Iron Crown Alliance', ['g1', 'g2'], 500);
    a1.addJointEvent('je1', 'Iron Crown Championship');
    this._alliances['a1'] = a1;
  };

  AllianceNetwork.prototype.createAlliance = function (name, guildIds, prestige) {
    var allianceId = 'alliance_' + (++this._allianceIdCounter);
    this._alliances[allianceId] = new Alliance(allianceId, name, guildIds, prestige);
    this._save();
    return { success: true, allianceId: allianceId };
  };

  AllianceNetwork.prototype.getAlliance = function (allianceId) {
    return this._alliances[allianceId] || null;
  };

  AllianceNetwork.prototype.getAllAlliances = function () {
    return Object.keys(this._alliances).map(function (k) { return this._alliances[k]; }.bind(this));
  };

  AllianceNetwork.prototype.getAllianceByGuild = function (guildId) {
    for (var allianceId in this._alliances) {
      if (this._alliances[allianceId].guildIds.indexOf(guildId) >= 0) {
        return this._alliances[allianceId];
      }
    }
    return null;
  };

  AllianceNetwork.prototype.addPrestige = function (allianceId, amount) {
    var a = this._alliances[allianceId];
    if (!a) return { error: 'alliance_not_found' };
    a.prestige += amount;
    return { success: true, prestige: a.prestige };
  };

  AllianceNetwork.prototype.getTopAlliances = function (count) {
    var sorted = Object.keys(this._alliances).sort(function (a, b) {
      return this._alliances[b].prestige - this._alliances[a].prestige;
    }.bind(this));
    return sorted.slice(0, count || 10).map(function (k) { return this._alliances[k]; }.bind(this));
  };

  AllianceNetwork.prototype.disbandAlliance = function (allianceId) {
    if (!this._alliances[allianceId]) return { error: 'alliance_not_found' };
    delete this._alliances[allianceId];
    this._save();
    return { success: true };
  };

  // --------------------------------------------------------------------===
  // Exports
  // ----------------------------------------------------------------=======
  window.Alliance = Alliance;
  window.AllianceNetwork = AllianceNetwork;
})();