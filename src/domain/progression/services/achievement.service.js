// ============================================================================
// Card Achievement System — V130 Direction X
// ============================================================================
// Achievement unlocks, badge display, mastery tiers, achievement categories.
// generic-agent L0-L4 (achievement history, unlock patterns) + nanobot registry.
// ============================================================================

'use strict';

class Achievement {
  constructor(achievementId, name, description, category, icon, threshold, xp) {
    this.achievementId = achievementId;
    this.name = name;
    this.description = description;
    this.category = category; // 'combat' | 'collection' | 'social' | 'exploration' | 'mastery'
    this.icon = icon || '🏆';
    this.threshold = threshold; // number of times needed to unlock
    this.xp = xp || 10;
    this.unlockedAt = null;
    this.progress = 0;
    this.tier = 0; // 0=locked, 1=bronze, 2=silver, 3=gold, 4=diamond
  }

  checkProgress(value) {
    if (this.tier >= 4) return; // maxed out
    this.progress = Math.min(value, this.threshold);
    if (this.progress >= this.threshold && this.tier === 0) {
      this.tier = 1; // bronze
      this.unlockedAt = Date.now();
    }
  }

  getTier() { return this.tier; }
  isUnlocked() { return this.tier > 0; }
}

class AchievementRegistry {
  constructor() {
    this.achievements = new Map(); // achievementId → Achievement
    this.hooks = [];
  }

  register(achievement) { this.achievements.set(achievement.achievementId, achievement); }
  get(achievementId) { return this.achievements.get(achievementId) || null; }

  getByCategory(category) {
    return Array.from(this.achievements.values()).filter(a => a.category === category);
  }

  getAll() { return Array.from(this.achievements.values()); }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }
}

class PlayerAchievementState {
  constructor(playerId) {
    this.playerId = playerId;
    this.unlocked = new Map(); // achievementId → { unlockedAt, tier, progress }
    this.totalXP = 0;
    this.masteryLevel = 1;
    this.unlockHistory = []; // { achievementId, unlockedAt, xp }
  }

  addXP(amount) {
    this.totalXP += amount;
    const levels = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500];
    for (let i = levels.length - 1; i >= 0; i--) {
      if (this.totalXP >= levels[i]) { this.masteryLevel = i + 1; break; }
    }
  }

  unlock(achievement) {
    if (this.unlocked.has(achievement.achievementId)) return false;
    this.unlocked.set(achievement.achievementId, { unlockedAt: Date.now(), tier: achievement.tier, progress: achievement.progress });
    this.addXP(achievement.xp);
    this.unlockHistory.push({ achievementId: achievement.achievementId, unlockedAt: Date.now(), xp: achievement.xp });
    return true;
  }

  getProgress(achievementId) { return this.unlocked.get(achievementId) || null; }
  isUnlocked(achievementId) { return this.unlocked.has(achievementId); }

  getMasteryLevel() { return this.masteryLevel; }
  getTotalXP() { return this.totalXP; }
}

class AchievementSystem {
  constructor() {
    this.registry = new AchievementRegistry();
    this.playerStates = new Map(); // playerId → PlayerAchievementState
    this._initAchievements();
    this._load();
  }

  _initAchievements() {
    const defs = [
      // Combat achievements
      { id: 'first_blood', name: 'First Blood', description: 'Win your first battle', category: 'combat', icon: '⚔️', threshold: 1, xp: 20 },
      { id: 'warrior_10', name: 'Warrior', description: 'Win 10 battles', category: 'combat', icon: '⚔️', threshold: 10, xp: 50 },
      { id: 'veteran_50', name: 'Veteran', description: 'Win 50 battles', category: 'combat', icon: '🛡️', threshold: 50, xp: 150 },
      { id: 'legend_100', name: 'Legend', description: 'Win 100 battles', category: 'combat', icon: '👑', threshold: 100, xp: 300 },
      // Collection achievements
      { id: 'collector_10', name: 'Card Collector', description: 'Collect 10 unique cards', category: 'collection', icon: '🃏', threshold: 10, xp: 30 },
      { id: 'collector_50', name: 'Card Hoarder', description: 'Collect 50 unique cards', category: 'collection', icon: '📚', threshold: 50, xp: 100 },
      { id: 'deck_builder', name: 'Deck Builder', description: 'Build 5 different decks', category: 'collection', icon: '🛠️', threshold: 5, xp: 40 },
      // Social achievements
      { id: 'friendly', name: 'Social Butterfly', description: 'Add 3 friends', category: 'social', icon: '🤝', threshold: 3, xp: 20 },
      { id: 'duelist', name: 'Duelist', description: 'Complete 10 duels', category: 'social', icon: '🎯', threshold: 10, xp: 50 },
      // Exploration achievements
      { id: 'journey_starter', name: 'Journey Starter', description: 'Complete your first journey', category: 'exploration', icon: '🗺️', threshold: 1, xp: 30 },
      { id: 'quester', name: 'Quester', description: 'Complete 20 quests', category: 'exploration', icon: '📜', threshold: 20, xp: 80 },
    ];
    for (const d of defs) {
      this.registry.register(new Achievement(d.id, d.name, d.description, d.category, d.icon, d.threshold, d.xp));
    }
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('achievement_system') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const [pid, pdata] of Object.entries(data.playerStates || {})) {
          const s = new PlayerAchievementState(pid);
          s.totalXP = pdata.totalXP || 0;
          s.masteryLevel = pdata.masteryLevel || 1;
          s.unlockHistory = pdata.unlockHistory || [];
          for (const [aid, udata] of Object.entries(pdata.unlocked || {})) {
            s.unlocked.set(aid, udata);
          }
          this.playerStates.set(pid, s);
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        playerStates: Object.fromEntries(Array.from(this.playerStates.entries()).map(([k, v]) => [k, { totalXP: v.totalXP, masteryLevel: v.masteryLevel, unlocked: Object.fromEntries(v.unlocked.entries()), unlockHistory: v.unlockHistory }]))
      };
      localStorage.setItem('achievement_system', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.registry.registerHook(cb); }
  _emit(event, data) { this.registry._emit(event, data); }

  getOrCreatePlayerState(playerId) {
    if (!this.playerStates.has(playerId)) this.playerStates.set(playerId, new PlayerAchievementState(playerId));
    return this.playerStates.get(playerId);
  }

  makeProgress(playerId, achievementId, value) {
    const achievement = this.registry.get(achievementId);
    if (!achievement) return { error: 'achievement_not_found' };
    const state = this.getOrCreatePlayerState(playerId);
    if (state.isUnlocked(achievementId)) return { alreadyUnlocked: true };

    const before = achievement.tier;
    achievement.checkProgress(value);
    if (before === 0 && achievement.tier > 0) {
      state.unlock(achievement);
      this._save();
      this._emit('achievement_unlocked', { playerId, achievementId, name: achievement.name });
      return { unlocked: true, achievement: { name: achievement.name, xp: achievement.xp, tier: achievement.tier } };
    }
    return { unlocked: false, progress: achievement.progress, threshold: achievement.threshold };
  }

  getPlayerAchievements(playerId) {
    const state = this.getOrCreatePlayerState(playerId);
    return this.registry.getAll().map(a => ({
      achievementId: a.achievementId,
      name: a.name,
      description: a.description,
      category: a.category,
      icon: a.icon,
      xp: a.xp,
      isUnlocked: state.isUnlocked(a.achievementId),
      tier: state.isUnlocked(a.achievementId) ? a.tier : 0,
      progress: state.isUnlocked(a.achievementId) ? a.threshold : 0
    }));
  }

  getPlayerStats(playerId) {
    const state = this.getOrCreatePlayerState(playerId);
    const all = this.registry.getAll();
    const unlocked = state.unlocked.size;
    return { totalXP: state.totalXP, masteryLevel: state.masteryLevel, unlockedCount: unlocked, totalCount: all.length };
  }

  getLeaderboard(limit) {
    return Array.from(this.playerStates.entries())
      .map(([pid, s]) => ({ playerId: pid, totalXP: s.totalXP, masteryLevel: s.masteryLevel }))
      .sort((a, b) => b.totalXP - a.totalXP)
      .slice(0, limit || 10);
  }
}

const AchievementTools = {
  'achievement.progress': {
    description: 'Make progress on an achievement',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, achievementId: { type: 'string' }, value: { type: 'number' } }, required: ['playerId', 'achievementId'] },
    handler(args) {
      if (!window._achievementSystem) window._achievementSystem = new AchievementSystem();
      return window._achievementSystem.makeProgress(args.playerId, args.achievementId, args.value || 1);
    }
  },
  'achievement.list': {
    description: 'List player achievements',
    parameters: { type: 'object', properties: { playerId: { type: 'string' } }, required: ['playerId'] },
    handler(args) {
      if (!window._achievementSystem) window._achievementSystem = new AchievementSystem();
      return window._achievementSystem.getPlayerAchievements(args.playerId);
    }
  },
  'achievement.stats': {
    description: 'Get player achievement stats',
    parameters: { type: 'object', properties: { playerId: { type: 'string' } }, required: ['playerId'] },
    handler(args) {
      if (!window._achievementSystem) window._achievementSystem = new AchievementSystem();
      return window._achievementSystem.getPlayerStats(args.playerId);
    }
  },
  'achievement.leaderboard': {
    description: 'Get achievement leaderboard',
    parameters: { type: 'object', properties: { limit: { type: 'number' } } },
    handler(args) {
      if (!window._achievementSystem) window._achievementSystem = new AchievementSystem();
      return window._achievementSystem.getLeaderboard(args.limit);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Achievement, AchievementRegistry, PlayerAchievementState, AchievementSystem, AchievementTools };
}
if (typeof window !== 'undefined') {
  window.Achievement = Achievement;
  window.AchievementRegistry = AchievementRegistry;
  window.PlayerAchievementState = PlayerAchievementState;
  window.AchievementSystem = AchievementSystem;
  window.AchievementTools = AchievementTools;
}