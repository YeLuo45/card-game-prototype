// ============================================================================
// Card Challenge System — V116 Direction J
// ============================================================================
// Daily/weekly challenges with rewards. Integrates: generic-agent L0-L4
// (challenge history, streaks) + thunderbolt offline-first.
// ============================================================================

'use strict';

class Challenge {
  constructor(challengeId, title, type, target, reward) {
    this.challengeId = challengeId;
    this.title = title;
    this.type = type; // 'daily' | 'weekly' | 'special'
    this.target = target; // number
    this.reward = reward; // { gold, xp, badge }
    this.progress = 0;
    this.completed = false;
    this.completedAt = null;
    this.createdAt = Date.now();
    this.expiresAt = null;
  }

  updateProgress(amount) {
    if (this.completed) return;
    this.progress = Math.min(this.progress + amount, this.target);
    if (this.progress >= this.target) {
      this.completed = true;
      this.completedAt = Date.now();
    }
  }

  setExpiry(msFromNow) {
    this.expiresAt = Date.now() + msFromNow;
  }
}

class ChallengeCategory {
  constructor(categoryId, name) {
    this.categoryId = categoryId;
    this.name = name;
    this.challenges = new Map();
  }

  addChallenge(c) {
    this.challenges.set(c.challengeId, c);
  }

  getChallenge(id) {
    return this.challenges.get(id) || null;
  }

  getActiveChallenges() {
    return Array.from(this.challenges.values()).filter(c => !c.completed && (!c.expiresAt || c.expiresAt > Date.now()));
  }
}

class ChallengePlayerState {
  constructor(playerId) {
    this.playerId = playerId;
    this.completedChallenges = []; // [{challengeId, completedAt}]
    this.currentStreak = 0;
    this.longestStreak = 0;
    this.lastCompletedDate = null;
    this.totalPoints = 0;
    this.badges = [];
  }

  recordCompletion(challengeId, points) {
    const now = Date.now();
    this.completedChallenges.push({ challengeId, completedAt: now });
    this.totalPoints += points;
    // Update streak
    const today = new Date().toDateString();
    if (this.lastCompletedDate !== today) {
      this.currentStreak++;
      this.lastCompletedDate = today;
    }
    this.longestStreak = Math.max(this.longestStreak, this.currentStreak);
  }
}

class ChallengeSystem {
  constructor() {
    this.categories = new Map(); // categoryId → ChallengeCategory
    this.playerStates = new Map(); // playerId → ChallengePlayerState
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('challenge_system') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const [cid, catData] of Object.entries(data.categories || {})) {
          const cat = new ChallengeCategory(cid, catData.name);
          for (const [chid, chData] of Object.entries(catData.challenges || {})) {
            const c = new Challenge(chid, chData.title, chData.type, chData.target, chData.reward);
            c.progress = chData.progress || 0;
            c.completed = chData.completed || false;
            c.completedAt = chData.completedAt || null;
            c.createdAt = chData.createdAt || Date.now();
            c.expiresAt = chData.expiresAt || null;
            cat.addChallenge(c);
          }
          this.categories.set(cid, cat);
        }
        for (const [pid, pdata] of Object.entries(data.playerStates || {})) {
          const ps = new ChallengePlayerState(pid);
          ps.completedChallenges = pdata.completedChallenges || [];
          ps.currentStreak = pdata.currentStreak || 0;
          ps.longestStreak = pdata.longestStreak || 0;
          ps.lastCompletedDate = pdata.lastCompletedDate || null;
          ps.totalPoints = pdata.totalPoints || 0;
          ps.badges = pdata.badges || [];
          this.playerStates.set(pid, ps);
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        categories: Object.fromEntries(Array.from(this.categories.entries()).map(([k, v]) => [k, {
          name: v.name,
          challenges: Object.fromEntries(Array.from(v.challenges.entries()).map(([ck, cv]) => [ck, {
            title: cv.title, type: cv.type, target: cv.target, reward: cv.reward,
            progress: cv.progress, completed: cv.completed, completedAt: cv.completedAt,
            createdAt: cv.createdAt, expiresAt: cv.expiresAt
          }]))
        }])),
        playerStates: Object.fromEntries(Array.from(this.playerStates.entries()).map(([k, v]) => [k, {
          completedChallenges: v.completedChallenges, currentStreak: v.currentStreak,
          longestStreak: v.longestStreak, lastCompletedDate: v.lastCompletedDate,
          totalPoints: v.totalPoints, badges: v.badges
        }]))
      };
      localStorage.setItem('challenge_system', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  createCategory(categoryId, name) {
    if (this.categories.has(categoryId)) return { error: 'category_exists' };
    const cat = new ChallengeCategory(categoryId, name);
    this.categories.set(categoryId, cat);
    this._save();
    return cat;
  }

  getCategory(categoryId) {
    return this.categories.get(categoryId) || null;
  }

  addChallenge(categoryId, challengeId, title, type, target, reward) {
    const cat = this.categories.get(categoryId);
    if (!cat) return { error: 'category_not_found' };
    if (cat.challenges.has(challengeId)) return { error: 'challenge_exists' };
    const c = new Challenge(challengeId, title, type, target, reward);
    cat.addChallenge(c);
    this._save();
    return c;
  }

  getChallenge(categoryId, challengeId) {
    const cat = this.categories.get(categoryId);
    if (!cat) return null;
    return cat.getChallenge(challengeId);
  }

  getActiveChallenges(categoryId) {
    const cat = this.categories.get(categoryId);
    if (!cat) return [];
    return cat.getActiveChallenges();
  }

  updateChallengeProgress(playerId, categoryId, challengeId, amount) {
    const cat = this.categories.get(categoryId);
    if (!cat) return { error: 'category_not_found' };
    const c = cat.getChallenge(challengeId);
    if (!c) return { error: 'challenge_not_found' };
    if (c.completed) return { error: 'challenge_already_completed' };

    const wasCompleted = c.completed;
    c.updateProgress(amount);

    // Create or get player state
    if (!this.playerStates.has(playerId)) {
      this.playerStates.set(playerId, new ChallengePlayerState(playerId));
    }
    const ps = this.playerStates.get(playerId);

    if (c.completed && !wasCompleted) {
      const points = (c.reward?.xp || 0) + (c.reward?.gold || 0) * 0.1;
      ps.recordCompletion(challengeId, Math.round(points));
      if (c.reward?.badge && !ps.badges.includes(c.reward.badge)) {
        ps.badges.push(c.reward.badge);
      }
      this._emit('challenge_completed', { playerId, challengeId, reward: c.reward });
    }

    this._save();
    return { progress: c.progress, target: c.target, completed: c.completed };
  }

  getPlayerState(playerId) {
    if (!this.playerStates.has(playerId)) {
      this.playerStates.set(playerId, new ChallengePlayerState(playerId));
    }
    return this.playerStates.get(playerId);
  }

  getPlayerStats(playerId) {
    const ps = this.playerStates.get(playerId);
    if (!ps) return { playerId, totalPoints: 0, currentStreak: 0, longestStreak: 0, badges: [] };
    return {
      playerId: ps.playerId,
      totalPoints: ps.totalPoints,
      currentStreak: ps.currentStreak,
      longestStreak: ps.longestStreak,
      totalCompleted: ps.completedChallenges.length,
      badges: ps.badges
    };
  }

  resetDailyChallenges(categoryId) {
    const cat = this.categories.get(categoryId);
    if (!cat) return { error: 'category_not_found' };
    let count = 0;
    for (const c of cat.challenges.values()) {
      if (c.type === 'daily' && !c.completed) {
        c.progress = 0;
        count++;
      }
    }
    this._save();
    return { resetCount: count };
  }

  getStats() {
    let totalChallenges = 0, completed = 0;
    for (const cat of this.categories.values()) {
      for (const c of cat.challenges.values()) {
        totalChallenges++;
        if (c.completed) completed++;
      }
    }
    return {
      totalCategories: this.categories.size,
      totalChallenges,
      completedChallenges: completed,
      totalPlayers: this.playerStates.size
    };
  }
}

const ChallengeTools = {
  'challenge.create_category': {
    description: 'Create a challenge category',
    parameters: { type: 'object', properties: { categoryId: { type: 'string' }, name: { type: 'string' } }, required: ['categoryId', 'name'] },
    handler(args) {
      if (!window._challengeSystem) window._challengeSystem = new ChallengeSystem();
      return window._challengeSystem.createCategory(args.categoryId, args.name);
    }
  },
  'challenge.add': {
    description: 'Add a challenge',
    parameters: { type: 'object', properties: { categoryId: { type: 'string' }, challengeId: { type: 'string' }, title: { type: 'string' }, type: { type: 'string' }, target: { type: 'number' }, reward: { type: 'object' } }, required: ['categoryId', 'challengeId', 'title', 'type', 'target'] },
    handler(args) {
      if (!window._challengeSystem) window._challengeSystem = new ChallengeSystem();
      return window._challengeSystem.addChallenge(args.categoryId, args.challengeId, args.title, args.type, args.target, args.reward || {});
    }
  },
  'challenge.progress': {
    description: 'Update challenge progress',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, categoryId: { type: 'string' }, challengeId: { type: 'string' }, amount: { type: 'number' } }, required: ['playerId', 'categoryId', 'challengeId', 'amount'] },
    handler(args) {
      if (!window._challengeSystem) return { error: 'system_not_initialized' };
      return window._challengeSystem.updateChallengeProgress(args.playerId, args.categoryId, args.challengeId, args.amount);
    }
  },
  'challenge.stats': {
    description: 'Get player challenge stats',
    parameters: { type: 'object', properties: { playerId: { type: 'string' } }, required: ['playerId'] },
    handler(args) {
      if (!window._challengeSystem) window._challengeSystem = new ChallengeSystem();
      return window._challengeSystem.getPlayerStats(args.playerId);
    }
  },
  'challenge.list': {
    description: 'List active challenges in category',
    parameters: { type: 'object', properties: { categoryId: { type: 'string' } }, required: ['categoryId'] },
    handler(args) {
      if (!window._challengeSystem) return { error: 'system_not_initialized' };
      return window._challengeSystem.getActiveChallenges(args.categoryId);
    }
  },
  'challenge.reset_daily': {
    description: 'Reset daily challenges in category',
    parameters: { type: 'object', properties: { categoryId: { type: 'string' } }, required: ['categoryId'] },
    handler(args) {
      if (!window._challengeSystem) return { error: 'system_not_initialized' };
      return window._challengeSystem.resetDailyChallenges(args.categoryId);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Challenge, ChallengeCategory, ChallengePlayerState, ChallengeSystem, ChallengeTools };
}
if (typeof window !== 'undefined') {
  window.Challenge = Challenge;
  window.ChallengeCategory = ChallengeCategory;
  window.ChallengePlayerState = ChallengePlayerState;
  window.ChallengeSystem = ChallengeSystem;
  window.ChallengeTools = ChallengeTools;
}