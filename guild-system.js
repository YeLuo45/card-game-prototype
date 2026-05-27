// ============================================================================
// Guild System — V105 Direction Y
// ============================================================================
// Multi-player clan/guild system with shared clan memory archive.
// Integrates generic-agent L0-L4 memory + chatdev multi-agent + ruflo hook.
// ============================================================================

'use strict';

class Guild {
  constructor(guildId, name, leaderId) {
    this.guildId = guildId || 'guild_' + Date.now();
    this.name = name;
    this.leaderId = leaderId;
    this.members = new Map(); // memberId → { role, joinedAt, rank, contributions }
    this.memberOrder = []; // ordered array of memberIds (leader first)
    this.clanMemory = this._loadMemory();
    this.clanArchives = [];
    this.activities = [];
    this.missionQueue = [];
    this.invitations = new Map(); // inviteeId → { guildId, expiresAt }
    this.hooks = [];
  }

  // ---- thunderbolt offline-first: localStorage persistence ----
  _loadMemory() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(`guild_mem_${this.guildId}`) : null;
      return raw ? JSON.parse(raw) : this._createEmptyMemory();
    } catch {
      return this._createEmptyMemory();
    }
  }

  _createEmptyMemory() {
    return {
      l0_meta: { name: this.name, createdAt: Date.now(), totalBattles: 0, winRate: 0 },
      l1_insight_index: [],
      l2_battle_records: [],
      l3_skill_archive: [],
      l4_session_log: []
    };
  }

  _saveMemory() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`guild_mem_${this.guildId}`, JSON.stringify(this.clanMemory));
    }
  }

  // ---- ruflo hook system ----
  registerHook(callback) { this.hooks.push(callback); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  // ---- Generic-agent L0-L4 memory integration ----
  recordBattle(guildId, playerId, opponentId, result, cardXP) {
    const record = {
      timestamp: Date.now(),
      playerId,
      opponentId,
      result, // 'win' or 'loss'
      cardXP
    };
    this.clanMemory.l2_battle_records.push(record);
    if (record.result === 'win') {
      this.clanMemory.l0_meta.totalBattles++;
    }
    // Keep only last 100 records
    if (this.clanMemory.l2_battle_records.length > 100) {
      this.clanMemory.l2_battle_records = this.clanMemory.l2_battle_records.slice(-100);
    }
    this._saveMemory();
    return record;
  }

  addInsight(playerId, insight) {
    this.clanMemory.l1_insight_index.push({
      playerId,
      text: insight,
      timestamp: Date.now()
    });
    this._saveMemory();
  }

  archiveSkill(cardId, skillName, description, contributorId) {
    this.clanMemory.l3_skill_archive.push({
      cardId,
      skillName,
      description,
      contributorId,
      archivedAt: Date.now()
    });
    this._saveMemory();
  }

  // ---- Multi-agent (chatdev) role-based actions ----
  addMember(memberId, role = 'member') {
    if (this.members.has(memberId)) return null;
    const member = { role, joinedAt: Date.now(), rank: this.members.size + 1, contributions: 0 };
    this.members.set(memberId, member);
    this.memberOrder.push(memberId);
    this._emit('member_added', { memberId, role });
    return member;
  }

  removeMember(memberId) {
    if (memberId === this.leaderId) return false;
    const removed = this.members.delete(memberId);
    this.memberOrder = this.memberOrder.filter(id => id !== memberId);
    if (removed) this._emit('member_removed', { memberId });
    return removed;
  }

  assignRole(memberId, role) {
    const member = this.members.get(memberId);
    if (!member) return false;
    if (role === 'leader' && memberId !== this.leaderId) return false;
    member.role = role;
    this._emit('role_changed', { memberId, role });
    return true;
  }

  invitePlayer(playerId) {
    const invite = { guildId: this.guildId, expiresAt: Date.now() + 86400000 };
    this.invitations.set(playerId, invite);
    this._emit('invitation_sent', { playerId });
    return invite;
  }

  acceptInvitation(playerId) {
    const invite = this.invitations.get(playerId);
    if (!invite) return { error: 'no_invitation' };
    if (Date.now() > invite.expiresAt) {
      this.invitations.delete(playerId);
      return { error: 'invitation_expired' };
    }
    this.invitations.delete(playerId);
    return this.addMember(playerId);
  }

  // ---- Mission system (chatdev multi-agent pipeline) ----
  createMission(missionId, description, reward) {
    const mission = { missionId, description, reward, status: 'available', assignedTo: null, progress: 0 };
    this.missionQueue.push(mission);
    this._emit('mission_created', mission);
    return mission;
  }

  assignMission(missionId, memberId) {
    const mission = this.missionQueue.find(m => m.missionId === missionId);
    if (!mission || mission.status !== 'available') return false;
    mission.assignedTo = memberId;
    mission.status = 'assigned';
    this._emit('mission_assigned', { missionId, memberId });
    return true;
  }

  completeMission(missionId, memberId) {
    const mission = this.missionQueue.find(m => m.missionId === missionId);
    if (!mission || mission.assignedTo !== memberId) return false;
    mission.status = 'completed';
    const member = this.members.get(memberId);
    if (member) member.contributions += mission.reward;
    this._emit('mission_completed', { missionId, memberId, reward: mission.reward });
    return true;
  }

  // ---- Activity tracking ----
  logActivity(type, actorId, details) {
    this.activities.push({ type, actorId, details, timestamp: Date.now() });
    if (this.activities.length > 200) this.activities = this.activities.slice(-200);
    this._emit('activity_logged', { type, actorId });
  }

  // ---- Analytics ----
  getStats() {
    return {
      guildId: this.guildId,
      name: this.name,
      memberCount: this.members.size,
      leaderId: this.leaderId,
      totalBattles: this.clanMemory.l0_meta.totalBattles,
      skillArchiveCount: this.clanMemory.l3_skill_archive.length,
      missionCount: this.missionQueue.filter(m => m.status !== 'completed').length,
      completedMissions: this.missionQueue.filter(m => m.status === 'completed').length
    };
  }

  getClanMemory() { return this.clanMemory; }
}

// ---- GuildTools (nanobot tool registry) ----
const GuildTools = {
  'guild.create': {
    description: 'Create a new guild',
    parameters: { type: 'object', properties: { guildId: { type: 'string' }, name: { type: 'string' }, leaderId: { type: 'string' } }, required: ['name', 'leaderId'] },
    handler(args) {
      const guild = new Guild(args.guildId, args.name, args.leaderId);
      return { guildId: guild.guildId, name: guild.name };
    }
  },
  'guild.invite': {
    description: 'Invite a player to guild',
    parameters: { type: 'object', properties: { guildId: { type: 'string' }, playerId: { type: 'string' } }, required: ['guildId', 'playerId'] },
    handler(args) {
      const guild = window._sharedGuilds && window._sharedGuilds[args.guildId];
      if (!guild) return { error: 'guild_not_found' };
      return guild.invitePlayer(args.playerId);
    }
  },
  'guild.add_insight': {
    description: 'Add an insight to clan memory',
    parameters: { type: 'object', properties: { guildId: { type: 'string' }, playerId: { type: 'string' }, insight: { type: 'string' } }, required: ['guildId', 'playerId', 'insight'] },
    handler(args) {
      const guild = window._sharedGuilds && window._sharedGuilds[args.guildId];
      if (!guild) return { error: 'guild_not_found' };
      guild.addInsight(args.playerId, args.insight);
      return { success: true };
    }
  },
  'guild.archive_skill': {
    description: 'Archive a skill to clan memory',
    parameters: { type: 'object', properties: { guildId: { type: 'string' }, cardId: { type: 'string' }, skillName: { type: 'string' }, description: { type: 'string' }, contributorId: { type: 'string' } }, required: ['guildId', 'cardId', 'skillName', 'contributorId'] },
    handler(args) {
      const guild = window._sharedGuilds && window._sharedGuilds[args.guildId];
      if (!guild) return { error: 'guild_not_found' };
      guild.archiveSkill(args.cardId, args.skillName, args.description || '', args.contributorId);
      return { success: true };
    }
  },
  'guild.stats': {
    description: 'Get guild statistics',
    parameters: { type: 'object', properties: { guildId: { type: 'string' } }, required: ['guildId'] },
    handler(args) {
      const guild = window._sharedGuilds && window._sharedGuilds[args.guildId];
      if (!guild) return { error: 'guild_not_found' };
      return guild.getStats();
    }
  }
};

// ---- GuildPanel UI ----
class GuildPanel {
  constructor(guild) {
    this.guild = guild;
    this.isOpen = false;
    this.panel = null;
  }

  open() { this.isOpen = true; this._render(); }
  close() { this.isOpen = false; if (this.panel) { this.panel.remove(); this.panel = null; } }
  toggle() { if (this.isOpen) this.close(); else this.open(); }

  _render() {
    if (typeof document === 'undefined') return;
    const stats = this.guild.getStats();
    this.panel = document.createElement('div');
    this.panel.id = 'guild-panel';
    this.panel.style.cssText = [
      'position:fixed;bottom:80px;right:20px;width:300px;background:rgba(15,25,15,0.95);',
      'border:2px solid #27ae60;border-radius:12px;padding:16px;z-index:9996;',
      'font-family:monospace;font-size:13px;color:#ecf0f1;'
    ].join('');
    this.panel.innerHTML = [
      `<div style="color:#27ae60;font-weight:bold;margin-bottom:8px;">⚔️ 公会: ${stats.name}</div>`,
      `<div style="color:#999;font-size:11px;">`,
      `  成员: ${stats.memberCount} | 战斗: ${stats.totalBattles} | 技能库: ${stats.skillArchiveCount}<br/>`,
      `  任务: ${stats.missionCount}进行中 / ${stats.completedMissions}完成`,
      `</div>`
    ].join('');
    document.body.appendChild(this.panel);
  }

  getPanelState() { return { open: this.isOpen, stats: this.guild.getStats() }; }
}

// Shared guild registry (nanobot pattern for cross-instance access)
if (typeof window !== 'undefined') {
  if (!window._sharedGuilds) window._sharedGuilds = {};
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Guild, GuildPanel, GuildTools };
}
if (typeof window !== 'undefined') {
  window.Guild = Guild;
  window.GuildPanel = GuildPanel;
  window.GuildTools = GuildTools;
}