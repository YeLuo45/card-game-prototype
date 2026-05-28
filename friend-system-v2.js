// ============================================================================
// Card Friend System v2 — V128 Direction V
// ============================================================================
// Enhanced friend system: duel challenges, friend leaderboards, friend matches.
// chatdev multi-agent role specialization (duel observer, friend manager) +
// generic-agent L0-L4 (friend duel history).
// ============================================================================

'use strict';

class DuelChallenge {
  constructor(challengeId, challengerId, challengedId, stakes) {
    this.challengeId = challengeId;
    this.challengerId = challengerId;
    this.challengedId = challengedId;
    this.stakes = stakes || 50; // gold
    this.status = 'pending'; // 'pending' | 'accepted' | 'declined' | 'completed'
    this.result = null; // { winnerId, loserId, challengerScore, challengedScore }
    this.createdAt = Date.now();
    this.respondedAt = null;
    this.completedAt = null;
  }

  accept() {
    if (this.status !== 'pending') return false;
    this.status = 'accepted';
    this.respondedAt = Date.now();
    return true;
  }

  decline() {
    if (this.status !== 'pending') return false;
    this.status = 'declined';
    this.respondedAt = Date.now();
    return true;
  }

  complete(winnerId, loserId, challengerScore, challengedScore) {
    if (this.status !== 'accepted') return false;
    this.status = 'completed';
    this.result = { winnerId, loserId, challengerScore, challengedScore };
    this.completedAt = Date.now();
    return true;
  }

  isActive() { return this.status === 'pending' || this.status === 'accepted'; }
}

class FriendSystemV2 {
  constructor() {
    this.friends = new Map(); // playerId → Set of friendIds
    this.duelHistory = []; // DuelRecord[]
    this.challenges = new Map(); // challengeId → DuelChallenge
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('friend_system_v2') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const [pid, fdata] of Object.entries(data.friends || {})) {
          this.friends.set(pid, new Set(fdata));
        }
        this.duelHistory = data.duelHistory || [];
        for (const [cid, cdata] of Object.entries(data.challenges || {})) {
          const c = new DuelChallenge(cdata.challengeId, cdata.challengerId, cdata.challengedId, cdata.stakes);
          c.status = cdata.status;
          c.result = cdata.result;
          c.createdAt = cdata.createdAt;
          c.respondedAt = cdata.respondedAt || null;
          c.completedAt = cdata.completedAt || null;
          this.challenges.set(cid, c);
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        friends: Object.fromEntries(Array.from(this.friends.entries()).map(([k, v]) => [k, Array.from(v)])),
        duelHistory: this.duelHistory,
        challenges: Object.fromEntries(Array.from(this.challenges.entries()).map(([k, v]) => [k, { challengeId: v.challengeId, challengerId: v.challengerId, challengedId: v.challengedId, stakes: v.stakes, status: v.status, result: v.result, createdAt: v.createdAt, respondedAt: v.respondedAt, completedAt: v.completedAt }]))
      };
      localStorage.setItem('friend_system_v2', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  addFriend(playerId, friendId) {
    if (!this.friends.has(playerId)) this.friends.set(playerId, new Set());
    this.friends.get(playerId).add(friendId);
    this._save();
    this._emit('friend_added', { playerId, friendId });
    return { success: true };
  }

  removeFriend(playerId, friendId) {
    if (!this.friends.has(playerId)) return { error: 'not_found' };
    this.friends.get(playerId).delete(friendId);
    this._save();
    return { success: true };
  }

  getFriends(playerId) {
    return Array.from(this.friends.get(playerId) || []);
  }

  areFriends(playerId, otherId) {
    return (this.friends.get(playerId) || new Set()).has(otherId);
  }

  sendDuelChallenge(challengerId, challengedId, stakes) {
    const challengeId = `duel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const challenge = new DuelChallenge(challengeId, challengerId, challengedId, stakes);
    this.challenges.set(challengeId, challenge);
    this._save();
    this._emit('challenge_sent', { challengeId, challengerId, challengedId });
    return challenge;
  }

  acceptChallenge(challengeId) {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return { error: 'challenge_not_found' };
    if (!challenge.accept()) return { error: 'cannot_accept' };
    this._save();
    this._emit('challenge_accepted', { challengeId });
    return { success: true };
  }

  declineChallenge(challengeId) {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return { error: 'challenge_not_found' };
    if (!challenge.decline()) return { error: 'cannot_decline' };
    this._save();
    return { success: true };
  }

  completeDuel(challengeId, winnerId, loserId, challengerScore, challengedScore) {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return { error: 'challenge_not_found' };
    if (!challenge.complete(winnerId, loserId, challengerScore, challengedScore)) return { error: 'cannot_complete' };

    this.duelHistory.push({ challengeId, challengerId: challenge.challengerId, challengedId: challenge.challengedId, winnerId, loserId, challengerScore, challengedScore, stakes: challenge.stakes, timestamp: Date.now() });
    this._save();
    this._emit('duel_completed', { challengeId, winnerId, loserId });
    return { success: true };
  }

  getPendingChallenges(playerId) {
    return Array.from(this.challenges.values()).filter(c => c.isActive() && (c.challengedId === playerId || c.challengerId === playerId));
  }

  getDuelHistory(playerId, limit) {
    return this.duelHistory.filter(d => d.challengerId === playerId || d.challengedId === playerId).sort((a, b) => b.timestamp - a.timestamp).slice(0, limit || 20);
  }

  getFriendLeaderboard(playerId, metric, limit) {
    const friends = this.getFriends(playerId);
    const records = friends.map(fid => {
      const myDuels = this.duelHistory.filter(d => (d.challengerId === playerId && d.challengedId === fid) || (d.challengerId === fid && d.challengedId === playerId));
      const won = myDuels.filter(d => d.winnerId === playerId).length;
      const lost = myDuels.filter(d => d.loserId === playerId).length;
      return { friendId: fid, wins: won, losses: lost, duels: myDuels.length };
    });
    return records.sort((a, b) => metric === 'wins' ? b.wins - a.wins : metric === 'losses' ? b.losses - a.losses : b.duels - a.duels).slice(0, limit || 10);
  }

  getStats() {
    return { totalDuels: this.duelHistory.length, totalChallenges: this.challenges.size, totalFriendPairs: Math.floor(Array.from(this.friends.values()).reduce((sum, s) => sum + s.size, 0) / 2) };
  }
}

const FriendSystemV2Tools = {
  'friend.add': {
    description: 'Add a friend',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, friendId: { type: 'string' } }, required: ['playerId', 'friendId'] },
    handler(args) {
      if (!window._friendSystemV2) window._friendSystemV2 = new FriendSystemV2();
      return window._friendSystemV2.addFriend(args.playerId, args.friendId);
    }
  },
  'friend.challenge': {
    description: 'Send a duel challenge',
    parameters: { type: 'object', properties: { challengerId: { type: 'string' }, challengedId: { type: 'string' }, stakes: { type: 'number' } }, required: ['challengerId', 'challengedId'] },
    handler(args) {
      if (!window._friendSystemV2) window._friendSystemV2 = new FriendSystemV2();
      return window._friendSystemV2.sendDuelChallenge(args.challengerId, args.challengedId, args.stakes || 50);
    }
  },
  'friend.accept': {
    description: 'Accept a duel challenge',
    parameters: { type: 'object', properties: { challengeId: { type: 'string' } }, required: ['challengeId'] },
    handler(args) {
      if (!window._friendSystemV2) return { error: 'not_init' };
      return window._friendSystemV2.acceptChallenge(args.challengeId);
    }
  },
  'friend.history': {
    description: 'Get duel history',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, limit: { type: 'number' } } },
    handler(args) {
      if (!window._friendSystemV2) window._friendSystemV2 = new FriendSystemV2();
      return window._friendSystemV2.getDuelHistory(args.playerId, args.limit);
    }
  },
  'friend.stats': {
    description: 'Get friend system stats',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._friendSystemV2) window._friendSystemV2 = new FriendSystemV2();
      return window._friendSystemV2.getStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DuelChallenge, FriendSystemV2, FriendSystemV2Tools };
}
if (typeof window !== 'undefined') {
  window.DuelChallenge = DuelChallenge;
  window.FriendSystemV2 = FriendSystemV2;
  window.FriendSystemV2Tools = FriendSystemV2Tools;
}