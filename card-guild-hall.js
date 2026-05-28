// ============================================================================
// Card Guild Hall — V152 Direction D
// Guild/clan system with missions, leaderboards, and member management
// chatdev multi-agent collaboration + nanobot tool registry + thunderbolt offline-first
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // GuildMember: Member within a guild
  // -----------------------------------------------------------------------
  function GuildMember(userId, name, role) {
    this.userId = userId;
    this.name = name || 'Member';
    this.role = role || 'member'; // leader | officer | member
    this.joinedAt = Date.now();
    this.contribution = 0;
    this.lastActive = Date.now();
    this.rank = 1;
    this.achievements = [];
  }

  GuildMember.prototype.promote = function () {
    if (this.role === 'member') { this.role = 'officer'; return true; }
    if (this.role === 'officer') { this.role = 'leader'; return true; }
    return false; // leader cannot be promoted
  };

  GuildMember.prototype.demote = function () {
    if (this.role === 'officer') { this.role = 'member'; return true; }
    if (this.role === 'leader') { this.role = 'officer'; return true; }
    return false;
  };

  GuildMember.prototype.addContribution = function (amount) {
    this.contribution += amount;
    this.lastActive = Date.now();
  };

  GuildMember.prototype.achievement = function (badge) {
    if (this.achievements.indexOf(badge) < 0) this.achievements.push(badge);
  };

  // -----------------------------------------------------------------------
  // GuildMission: Guild cooperative mission
  // -----------------------------------------------------------------------
  function GuildMission(id, title, description, target, rewards, expiresAt) {
    this.id = id;
    this.title = title || '';
    this.description = description || '';
    this.target = target || 0;
    this.progress = 0;
    this.rewards = rewards || {};
    this.completed = false;
    this.claimed = false;
    this.expiresAt = expiresAt || (Date.now() + 604800000);
    this.contributors = {};
  }

  GuildMission.prototype.contribute = function (memberId, amount) {
    this.progress += amount;
    if (this.progress >= this.target) this.completed = true;
    if (!this.contributors[memberId]) this.contributors[memberId] = 0;
    this.contributors[memberId] += amount;
  };

  GuildMission.prototype.claim = function () { this.claimed = true; };
  GuildMission.prototype.isExpired = function () { return Date.now() > this.expiresAt; };

  // --------------------------------------------------------------------===
  // Guild: Main guild entity
  // ========================================================================
  function Guild(id, name, leaderId, description) {
    this.id = id || 'guild_' + Date.now();
    this.name = name || 'New Guild';
    this.description = description || '';
    this.leaderId = leaderId;
    this.members = {}; // userId -> GuildMember
    this.missions = {}; // missionId -> GuildMission
    this.minRank = 1;
    this.maxMembers = 50;
    this.level = 1;
    this.experience = 0;
    this.createdAt = Date.now();
    this.banner = '';
    this.tag = '';
  }

  Guild.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) console.log('[Guild] ' + msg);
  };

  Guild.prototype.addMember = function (userId, name, role) {
    if (Object.keys(this.members).length >= this.maxMembers) return { error: 'guild_full' };
    if (this.members[userId]) return { error: 'already_member' };
    this.members[userId] = new GuildMember(userId, name, role);
    this._log('Member ' + name + ' joined guild ' + this.name);
    return { success: true };
  };

  Guild.prototype.removeMember = function (userId) {
    if (userId === this.leaderId) return { error: 'cannot_remove_leader' };
    if (!this.members[userId]) return { error: 'member_not_found' };
    delete this.members[userId];
    return { success: true };
  };

  Guild.prototype.getMember = function (userId) { return this.members[userId] || null; };

  Guild.prototype.listMembers = function () {
    var result = [];
    for (var id in this.members) result.push(this.members[id]);
    return result.sort(function (a, b) {
      if (a.role === 'leader') return -1;
      if (b.role === 'leader') return 1;
      if (a.contribution !== b.contribution) return b.contribution - a.contribution;
      return 0;
    });
  };

  Guild.prototype.promoteMember = function (userId) {
    var m = this.members[userId];
    if (!m) return { error: 'member_not_found' };
    if (m.promote()) return { success: true, role: m.role };
    return { success: true, role: m.role };
  };

  Guild.prototype.addMission = function (id, title, description, target, rewards, expiresAt) {
    if (this.missions[id]) return { error: 'mission_exists' };
    this.missions[id] = new GuildMission(id, title, description, target, rewards, expiresAt);
    return { success: true };
  };

  Guild.prototype.contributeToMission = function (missionId, memberId, amount) {
    var m = this.missions[missionId];
    if (!m) return { error: 'mission_not_found' };
    if (!this.members[memberId]) return { error: 'member_not_found' };
    if (m.completed) return { error: 'mission_completed' };

    m.contribute(memberId, amount);
    this.members[memberId].addContribution(amount);
    return { success: true, progress: m.progress };
  };

  Guild.prototype.getMissions = function () {
    var result = [];
    for (var id in this.missions) result.push(this.missions[id]);
    return result.sort(function (a, b) { return b.expiresAt - a.expiresAt; });
  };

  Guild.prototype.guildExpForLevel = function (level) { return level * 1000; };

  Guild.prototype.addExperience = function (amount) {
    this.experience += amount;
    while (this.experience >= this.guildExpForLevel(this.level)) {
      this.experience -= this.guildExpForLevel(this.level);
      this.level++;
    }
  };

  // --------------------------------------------------------------------===
  // GuildManager: Orchestrates guild operations
  // ========================================================================
  function GuildManager(storageKey) {
    this.storageKey = storageKey || 'guild_manager';
    this._guilds = {};
    this._playerGuilds = {}; // userId -> guildId
    this._init();
  }

  GuildManager.prototype._init = function () { this._load(); };

  GuildManager.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._guilds = {};
          this._playerGuilds = data.playerGuilds || {};
          for (var gid in data.guilds) {
            var gd = data.guilds[gid];
            var g = new Guild(gd.id, gd.name, gd.leaderId, gd.description);
            g.level = gd.level || 1;
            g.experience = gd.experience || 0;
            g.banner = gd.banner || '';
            g.tag = gd.tag || '';
            g.createdAt = gd.createdAt || Date.now();
            g.minRank = gd.minRank || 1;
            g.maxMembers = gd.maxMembers || 50;
            for (var uid in gd.members) {
              var md = gd.members[uid];
              var m = new GuildMember(md.userId, md.name, md.role);
              m.contribution = md.contribution || 0;
              m.joinedAt = md.joinedAt || Date.now();
              m.lastActive = md.lastActive || Date.now();
              m.rank = md.rank || 1;
              m.achievements = md.achievements || [];
              g.members[uid] = m;
            }
            for (var mid in gd.missions) {
              var md2 = gd.missions[mid];
              var mission = new GuildMission(md2.id, md2.title, md2.description, md2.target, md2.rewards, md2.expiresAt);
              mission.progress = md2.progress || 0;
              mission.completed = md2.completed || false;
              mission.claimed = md2.claimed || false;
              mission.contributors = md2.contributors || {};
              g.missions[mid] = mission;
            }
            this._guilds[gid] = g;
          }
        }
      }
    } catch (e) {}
  };

  GuildManager.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({ guilds: this._guilds, playerGuilds: this._playerGuilds }));
      }
    } catch (e) {}
  };

  GuildManager.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) console.log('[GuildManager] ' + msg);
  };

  GuildManager.prototype.createGuild = function (id, name, leaderId, description) {
    if (this._guilds[id]) return { error: 'guild_id_exists' };
    this._guilds[id] = new Guild(id, name, leaderId, description);
    this._playerGuilds[leaderId] = id;
    // Leader joins their own guild
    this._guilds[id].addMember(leaderId, 'Leader', 'leader');
    this._log('Guild ' + name + ' created');
    return { success: true, guildId: id };
  };

  GuildManager.prototype.getGuild = function (guildId) { return this._guilds[guildId] || null; };

  GuildManager.prototype.joinGuild = function (guildId, userId, name) {
    var g = this._guilds[guildId];
    if (!g) return { error: 'guild_not_found' };
    if (this._playerGuilds[userId]) return { error: 'already_in_guild' };
    var r = g.addMember(userId, name);
    if (r.success) this._playerGuilds[userId] = guildId;
    this._save();
    return r;
  };

  GuildManager.prototype.leaveGuild = function (guildId, userId) {
    var g = this._guilds[guildId];
    if (!g) return { error: 'guild_not_found' };
    var r = g.removeMember(userId);
    if (r.success) delete this._playerGuilds[userId];
    return r;
  };

  GuildManager.prototype.getPlayerGuild = function (userId) {
    var gid = this._playerGuilds[userId];
    return gid ? this._guilds[gid] || null : null;
  };

  GuildManager.prototype.listGuilds = function (filters) {
    var result = [];
    for (var id in this._guilds) {
      var g = this._guilds[id];
      if (filters && filters.minLevel && g.level < filters.minLevel) continue;
      result.push({ id: g.id, name: g.name, level: g.level, memberCount: Object.keys(g.members).length });
    }
    return result.sort(function (a, b) { return b.level - a.level; });
  };

  // --------------------------------------------------------------------===
  // GuildLeaderboard: Guild rankings
  // -----------------------------------------------------------------------
  function GuildLeaderboard(manager) {
    this.manager = manager;
  }

  GuildLeaderboard.prototype.getTopGuilds = function (limit) {
    var guilds = [];
    for (var id in this.manager._guilds) guilds.push(this.manager._guilds[id]);
    guilds.sort(function (a, b) {
      if (b.level !== a.level) return b.level - a.level;
      if (b.experience !== a.experience) return b.experience - a.experience;
      return 0;
    });
    return guilds.slice(0, limit || 10);
  };

  GuildLeaderboard.prototype.getMemberRank = function (guildId, memberId) {
    var g = this.manager.getGuild(guildId);
    if (!g) return null;
    var members = g.listMembers();
    for (var i = 0; i < members.length; i++) {
      if (members[i].userId === memberId) return i + 1;
    }
    return null;
  };

  // --------------------------------------------------------------------===
  // Exports
  // -----------------------------------------------------------------------
  window.GuildMember = GuildMember;
  window.GuildMission = GuildMission;
  window.Guild = Guild;
  window.GuildManager = GuildManager;
  window.GuildLeaderboard = GuildLeaderboard;
})();