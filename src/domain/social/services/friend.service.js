// ============================================================================
// Card Friend System — V114 Direction H
// ============================================================================
// Friend list, friend battles, and player profiles.
// Integrates: thunderbolt offline-first + ruflo hook system.
// ============================================================================

'use strict';

class PlayerProfile {
  constructor(playerId, displayName) {
    this.playerId = playerId;
    this.displayName = displayName;
    this.level = 1;
    this.joinedAt = Date.now();
    this.gamesPlayed = 0;
    this.wins = 0;
    this.bio = '';
    this.avatar = null;
    this.badges = [];
  }

  get winRate() {
    return this.gamesPlayed > 0 ? Math.round(this.wins / this.gamesPlayed * 100) : 0;
  }

  addBadge(badge) {
    if (!this.badges.includes(badge)) this.badges.push(badge);
  }
}

class FriendRelation {
  constructor(fromPlayerId, toPlayerId) {
    this.fromPlayerId = fromPlayerId;
    this.toPlayerId = toPlayerId;
    this.status = 'pending'; // pending | accepted | blocked
    this.createdAt = Date.now();
    this.acceptedAt = null;
  }

  accept() {
    this.status = 'accepted';
    this.acceptedAt = Date.now();
  }

  block() {
    this.status = 'blocked';
  }
}

class FriendSystem {
  constructor() {
    this.profiles = new Map(); // playerId → PlayerProfile
    this.relations = new Map(); // playerId → Map(friendId → FriendRelation)
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('friend_system') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const [pid, pdata] of Object.entries(data.profiles || {})) {
          const p = new PlayerProfile(pid, pdata.displayName);
          p.level = pdata.level || 1;
          p.gamesPlayed = pdata.gamesPlayed || 0;
          p.wins = pdata.wins || 0;
          p.bio = pdata.bio || '';
          p.avatar = pdata.avatar;
          p.badges = pdata.badges || [];
          p.joinedAt = pdata.joinedAt || Date.now();
          this.profiles.set(pid, p);
        }
        for (const [pid, friends] of Object.entries(data.relations || {})) {
          const fMap = new Map();
          for (const [fid, rel] of Object.entries(friends)) {
            const fr = new FriendRelation(pid, fid);
            fr.status = rel.status || 'pending';
            fr.createdAt = rel.createdAt || Date.now();
            fr.acceptedAt = rel.acceptedAt || null;
            fMap.set(fid, fr);
          }
          this.relations.set(pid, fMap);
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const profiles = Object.fromEntries(Array.from(this.profiles.entries()).map(([k, v]) => [k, {
        displayName: v.displayName, level: v.level, gamesPlayed: v.gamesPlayed,
        wins: v.wins, bio: v.bio, avatar: v.avatar, badges: v.badges, joinedAt: v.joinedAt
      }]));
      const relations = Object.fromEntries(Array.from(this.relations.entries()).map(([k, v]) => [
        k, Object.fromEntries(Array.from(v.entries()).map(([fk, fv]) => [fk, {
          status: fv.status, createdAt: fv.createdAt, acceptedAt: fv.acceptedAt
        }]))
      ]));
      localStorage.setItem('friend_system', JSON.stringify({ profiles, relations }));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  getOrCreateProfile(playerId, displayName) {
    if (!this.profiles.has(playerId)) {
      this.profiles.set(playerId, new PlayerProfile(playerId, displayName || playerId));
      this._save();
    }
    return this.profiles.get(playerId);
  }

  getProfile(playerId) {
    return this.profiles.get(playerId) || null;
  }

  updateProfile(playerId, updates) {
    const p = this.profiles.get(playerId);
    if (!p) return { error: 'profile_not_found' };
    if (updates.displayName !== undefined) p.displayName = updates.displayName;
    if (updates.bio !== undefined) p.bio = updates.bio;
    if (updates.avatar !== undefined) p.avatar = updates.avatar;
    this._save();
    return p;
  }

  recordGameResult(playerId, won) {
    const p = this.profiles.get(playerId);
    if (!p) return { error: 'profile_not_found' };
    p.gamesPlayed++;
    if (won) p.wins++;
    this._save();
    return { gamesPlayed: p.gamesPlayed, wins: p.wins, winRate: p.winRate };
  }

  sendFriendRequest(fromPlayerId, toPlayerId) {
    if (fromPlayerId === toPlayerId) return { error: 'cannot_add_self' };
    if (!this.relations.has(toPlayerId)) this.relations.set(toPlayerId, new Map());
    const fMap = this.relations.get(toPlayerId);
    if (fMap.has(fromPlayerId)) return { error: 'request_exists' };
    const rel = new FriendRelation(fromPlayerId, toPlayerId);
    fMap.set(fromPlayerId, rel);
    this._save();
    this._emit('friend_request_sent', { from: fromPlayerId, to: toPlayerId });
    return { success: true };
  }

  acceptFriendRequest(toPlayerId, fromPlayerId) {
    const fMap = this.relations.get(toPlayerId);
    if (!fMap || !fMap.has(fromPlayerId)) return { error: 'request_not_found' };
    const rel = fMap.get(fromPlayerId);
    if (rel.status !== 'pending') return { error: 'not_pending' };
    rel.accept();
    // Add reverse relation
    if (!this.relations.has(fromPlayerId)) this.relations.set(fromPlayerId, new Map());
    const rev = new FriendRelation(toPlayerId, fromPlayerId);
    rev.status = 'accepted';
    rev.acceptedAt = Date.now();
    this.relations.get(fromPlayerId).set(toPlayerId, rev);
    this._save();
    this._emit('friend_request_accepted', { from: fromPlayerId, to: toPlayerId });
    return { success: true };
  }

  blockPlayer(playerId, targetPlayerId) {
    const fMap = this.relations.get(playerId);
    if (fMap && fMap.has(targetPlayerId)) {
      fMap.get(targetPlayerId).block();
    }
    const revMap = this.relations.get(targetPlayerId);
    if (revMap && revMap.has(playerId)) {
      revMap.get(playerId).block();
    }
    this._save();
    return { success: true };
  }

  getFriends(playerId) {
    const friends = [];
    for (const [pid, fMap] of this.relations.entries()) {
      for (const [fid, rel] of fMap.entries()) {
        if ((rel.fromPlayerId === playerId || rel.toPlayerId === playerId) && rel.status === 'accepted') {
          const friendId = rel.fromPlayerId === playerId ? rel.toPlayerId : rel.fromPlayerId;
          if (!friends.some(f => f.playerId === friendId)) {
            friends.push({ playerId: friendId, profile: this.profiles.get(friendId), since: rel.acceptedAt });
          }
        }
      }
    }
    return friends;
  }

  getPendingRequests(playerId) {
    const pending = [];
    for (const [pid, fMap] of this.relations.entries()) {
      for (const [fid, rel] of fMap.entries()) {
        if (rel.toPlayerId === playerId && rel.status === 'pending') {
          pending.push({ playerId: fid, profile: this.profiles.get(fid), sentAt: rel.createdAt });
        }
      }
    }
    return pending;
  }

  getStats() {
    return {
      totalProfiles: this.profiles.size,
      totalFriendships: Array.from(this.relations.values()).reduce((s, m) => s + Array.from(m.values()).filter(r => r.status === 'accepted').length, 0)
    };
  }
}

const FriendTools = {
  'friend.send_request': {
    description: 'Send a friend request',
    parameters: { type: 'object', properties: { fromPlayerId: { type: 'string' }, toPlayerId: { type: 'string' } }, required: ['fromPlayerId', 'toPlayerId'] },
    handler(args) {
      const sys = window._friendSystem || new FriendSystem();
      if (window._friendSystem === undefined) window._friendSystem = sys;
      return sys.sendFriendRequest(args.fromPlayerId, args.toPlayerId);
    }
  },
  'friend.accept': {
    description: 'Accept a friend request',
    parameters: { type: 'object', properties: { toPlayerId: { type: 'string' }, fromPlayerId: { type: 'string' } }, required: ['toPlayerId', 'fromPlayerId'] },
    handler(args) {
      if (!window._friendSystem) return { error: 'system_not_initialized' };
      return sys.acceptFriendRequest(args.toPlayerId, args.fromPlayerId);
    }
  },
  'friend.list': {
    description: 'List friends',
    parameters: { type: 'object', properties: { playerId: { type: 'string' } }, required: ['playerId'] },
    handler(args) {
      if (!window._friendSystem) return { error: 'system_not_initialized' };
      return window._friendSystem.getFriends(args.playerId);
    }
  },
  'friend.profile': {
    description: 'Get player profile',
    parameters: { type: 'object', properties: { playerId: { type: 'string' } }, required: ['playerId'] },
    handler(args) {
      if (!window._friendSystem) return { error: 'system_not_initialized' };
      return window._friendSystem.getProfile(args.playerId) || { error: 'profile_not_found' };
    }
  },
  'friend.stats': {
    description: 'Get friend system stats',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._friendSystem) return { error: 'system_not_initialized' };
      return window._friendSystem.getStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PlayerProfile, FriendRelation, FriendSystem, FriendTools };
}
if (typeof window !== 'undefined') {
  window.PlayerProfile = PlayerProfile;
  window.FriendRelation = FriendRelation;
  window.FriendSystem = FriendSystem;
  window.FriendTools = FriendTools;
}