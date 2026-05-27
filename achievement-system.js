// ============================================================================
// Card Achievement System — V108 Direction B
// ============================================================================
// Unlockable achievement/badge system with progress tracking and rewards.
// Integrates: chatdev multi-agent + thunderbolt offline-first.
// ============================================================================

'use strict';

class Achievement {
  constructor(achievementId, name, description, category, icon, threshold) {
    this.achievementId = achievementId;
    this.name = name;
    this.description = description;
    this.category = category; // 'battle' | 'collection' | 'social' | 'special'
    this.icon = icon || '🏆';
    this.threshold = threshold; // number or object { type, value }
    this.unlockedAt = null;
    this.progress = 0;
    this.reward = null;
  }

  checkProgress(current) {
    if (this.unlockedAt) return { unlocked: true, progress: this.progress };
    if (typeof this.threshold === 'number') {
      this.progress = Math.min(current, this.threshold);
    } else if (this.threshold.type === 'win_streak') {
      this.progress = current;
    }
    const complete = typeof this.threshold === 'number'
      ? current >= this.threshold
      : current >= this.threshold.value;
    return { unlocked: complete, progress: this.progress };
  }
}

class AchievementSystem {
  constructor() {
    this.achievements = new Map();
    this.playerProgress = new Map(); // playerId → { achievementId → progress }
    this.unlockedCache = new Map(); // achievementId → Set of playerIds
    this.hooks = [];
    this._load();
  }

  // ---- thunderbolt: localStorage persistence ----
  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('achievement_system') : null;
      if (raw) {
        const data = JSON.parse(raw);
        this.unlockedCache = new Map(Object.entries(data.unlockedCache || {}).map(([k, v]) => [k, new Set(v)]));
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const serializable = {};
      for (const [k, v] of this.unlockedCache) serializable[k] = Array.from(v);
      localStorage.setItem('achievement_system', JSON.stringify({ unlockedCache: serializable }));
    }
  }

  // ---- ruflo hook system ----
  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  // ---- Achievement registration ----
  registerAchievement(achievement) {
    this.achievements.set(achievement.achievementId, achievement);
    if (!this.unlockedCache.has(achievement.achievementId)) {
      this.unlockedCache.set(achievement.achievementId, new Set());
    }
    return achievement;
  }

  // ---- Batch register default achievements ----
  registerDefaultAchievements() {
    const defaults = [
      new Achievement('first_win', '首胜', '赢得第一场战斗', 'battle', '🎖️', 1),
      new Achievement('win_10', '十连胜', '累计赢得10场战斗', 'battle', '🏅', 10),
      new Achievement('win_50', '五十杰', '累计赢得50场战斗', 'battle', '🎖️', 50),
      new Achievement('win_100', '百战百胜', '累计赢得100场战斗', 'battle', '👑', 100),
      new Achievement('lose_10', '屡败屡战', '累计输掉10场战斗', 'battle', '💪', 10),
      new Achievement('play_50', '老将', '累计进行50场战斗', 'battle', '⚔️', 50),
      new Achievement('fusion_first', '初次融合', '首次融合两张卡牌', 'collection', '🧬', 1),
      new Achievement('fusion_10', '融合者', '累计融合10次', 'collection', '🔬', 10),
      new Achievement('legendary_summon', '传奇召唤', '召唤一张传奇卡牌', 'collection', '⭐', 1),
      new Achievement('guild_join', '加入公会', '加入一个公会', 'social', '🏰', 1),
      new Achievement('guild_create', '创建公会', '创建一个公会', 'social', '👑', 1),
      new Achievement('tournament_win', '锦标赛冠军', '赢得锦标赛', 'special', '🏆', 1),
      new Achievement('perfect_game', '完美游戏', '零伤害通关', 'special', '💎', 1),
    ];
    for (const a of defaults) this.registerAchievement(a);
    return defaults.length;
  }

  // ---- Progress update ----
  updateProgress(playerId, achievementId, value) {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) return { error: 'achievement_not_found' };
    if (achievement.unlockedAt) return { unlocked: true, achievement };

    if (!this.playerProgress.has(playerId)) this.playerProgress.set(playerId, new Map());
    const progress = this.playerProgress.get(playerId);
    const prev = progress.get(achievementId) || 0;
    progress.set(achievementId, Math.max(prev, value));

    const result = achievement.checkProgress(value);
    if (result.unlocked && !achievement.unlockedAt) {
      achievement.unlockedAt = Date.now();
      this.unlockedCache.get(achievementId).add(playerId);
      this._save();
      this._emit('achievement_unlocked', { playerId, achievementId, achievement });
      return { unlocked: true, achievement };
    }
    return { unlocked: false, progress: result.progress };
  }

  // ---- Quick increment ----
  incrementProgress(playerId, achievementId, delta = 1) {
    if (!this.playerProgress.has(playerId)) this.playerProgress.set(playerId, new Map());
    const current = this.playerProgress.get(playerId).get(achievementId) || 0;
    return this.updateProgress(playerId, achievementId, current + delta);
  }

  // ---- Query ----
  getUnlocked(playerId) {
    const unlocked = [];
    for (const [id, achievement] of this.achievements) {
      if (this.unlockedCache.get(id)?.has(playerId)) {
        unlocked.push({ ...achievement, unlockedAt: achievement.unlockedAt });
      }
    }
    return unlocked;
  }

  getLocked(playerId) {
    const locked = [];
    for (const [id, achievement] of this.achievements) {
      if (!this.unlockedCache.get(id)?.has(playerId)) {
        locked.push({ ...achievement });
      }
    }
    return locked;
  }

  getProgress(playerId, achievementId) {
    const p = this.playerProgress.get(playerId)?.get(achievementId);
    return p || 0;
  }

  getPlayerStats(playerId) {
    const unlocked = this.getUnlocked(playerId);
    const byCategory = {};
    for (const a of unlocked) {
      byCategory[a.category] = (byCategory[a.category] || 0) + 1;
    }
    return {
      playerId,
      totalUnlocked: unlocked.length,
      totalAchievements: this.achievements.size,
      byCategory
    };
  }
}

// ---- AchievementTools (nanobot pattern) ----
const AchievementTools = {
  'achievement.register': {
    description: 'Register an achievement',
    parameters: { type: 'object', properties: { achievementId: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, category: { type: 'string' }, threshold: { type: 'number' } }, required: ['achievementId', 'name', 'threshold'] },
    handler(args) {
      const a = new Achievement(args.achievementId, args.name, args.description || '', args.category || 'special', args.icon, args.threshold);
      return window._achSystem ? window._achSystem.registerAchievement(a) : { error: 'system_not_initialized' };
    }
  },
  'achievement.progress': {
    description: 'Update achievement progress',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, achievementId: { type: 'string' }, value: { type: 'number' } }, required: ['playerId', 'achievementId'] },
    handler(args) {
      if (!window._achSystem) return { error: 'system_not_initialized' };
      return window._achSystem.updateProgress(args.playerId, args.achievementId, args.value || 1);
    }
  },
  'achievement.unlocked': {
    description: 'Get unlocked achievements for player',
    parameters: { type: 'object', properties: { playerId: { type: 'string' } }, required: ['playerId'] },
    handler(args) {
      if (!window._achSystem) return { error: 'system_not_initialized' };
      return window._achSystem.getUnlocked(args.playerId);
    }
  },
  'achievement.stats': {
    description: 'Get achievement stats for player',
    parameters: { type: 'object', properties: { playerId: { type: 'string' } }, required: ['playerId'] },
    handler(args) {
      if (!window._achSystem) return { error: 'system_not_initialized' };
      return window._achSystem.getPlayerStats(args.playerId);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Achievement, AchievementSystem, AchievementTools };
}
if (typeof window !== 'undefined') {
  window.Achievement = Achievement;
  window.AchievementSystem = AchievementSystem;
  window.AchievementTools = AchievementTools;
}