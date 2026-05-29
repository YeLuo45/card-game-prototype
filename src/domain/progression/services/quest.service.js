// ============================================================================
// Card Quest System — V129 Direction W
// ============================================================================
// Daily/weekly quests with objectives, progress tracking, and tiered rewards.
// generic-agent L0-L4 (quest history, completion patterns) + thunderbolt offline-first.
// ============================================================================

'use strict';

class QuestObjective {
  constructor(type, target, targetId, progress) {
    this.type = type; // 'win_games' | 'play_cards' | 'use_color' | 'deal_damage' | 'heal' | 'craft_item'
    this.target = target;
    this.targetId = targetId || null;
    this.progress = progress || 0;
    this.completed = false;
  }

  addProgress(amount) {
    if (this.completed) return;
    this.progress += amount;
    if (this.progress >= this.target) { this.progress = this.target; this.completed = true; }
  }

  reset() { this.progress = 0; this.completed = false; }
}

class Quest {
  constructor(questId, title, description, objectives, rewards, expiresAt) {
    this.questId = questId;
    this.title = title;
    this.description = description;
    this.objectives = objectives; // QuestObjective[]
    this.rewards = rewards; // { gold, xp, items }
    this.status = 'active'; // 'active' | 'completed' | 'expired' | 'claimed'
    this.progress = 0; // overall 0-100
    this.createdAt = Date.now();
    this.expiresAt = expiresAt || (Date.now() + 7 * 24 * 3600 * 1000);
    this.completedAt = null;
    this.claimedAt = null;
  }

  updateProgress() {
    if (this.objectives.length === 0) { this.progress = 0; return; }
    const completed = this.objectives.filter(o => o.completed).length;
    this.progress = Math.round((completed / this.objectives.length) * 100);
    if (this.progress >= 100) { this.status = 'completed'; this.completedAt = Date.now(); }
  }

  isExpired() { return Date.now() > this.expiresAt && this.status === 'active'; }

  claim() {
    if (this.status !== 'completed') return { error: 'not_completed' };
    this.status = 'claimed';
    this.claimedAt = Date.now();
    return { success: true, rewards: this.rewards };
  }
}

class QuestSystem {
  constructor() {
    this.quests = new Map(); // questId → Quest
    this.questTemplates = []; // templates for generating daily quests
    this.playerQuestHistory = []; // { questId, playerId, status, completedAt, claimedAt }
    this.hooks = [];
    this._load();
    this._initTemplates();
  }

  _initTemplates() {
    this.questTemplates = [
      { title: 'First Victory', description: 'Win 3 games', type: 'win_games', target: 3, rewards: { gold: 50, xp: 20 } },
      { title: 'Fire Starter', description: 'Play 5 fire cards', type: 'play_cards', target: 5, targetId: 'fire', rewards: { gold: 30, xp: 10 } },
      { title: 'Damage Dealer', description: 'Deal 100 damage', type: 'deal_damage', target: 100, rewards: { gold: 40, xp: 15 } },
      { title: 'Healer', description: 'Heal 50 HP', type: 'heal', target: 50, rewards: { gold: 30, xp: 10 } },
      { title: 'Craftsman', description: 'Craft 2 items', type: 'craft_item', target: 2, rewards: { gold: 60, xp: 25 } },
    ];
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('quest_system') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const [qid, qdata] of Object.entries(data.quests || {})) {
          const obj = (qdata.objectives || []).map(o => { const qo = new QuestObjective(o.type, o.target, o.targetId, o.progress); qo.completed = o.completed; return qo; });
          const q = new Quest(qdata.questId, qdata.title, qdata.description, obj, qdata.rewards, qdata.expiresAt);
          q.status = qdata.status;
          q.progress = qdata.progress || 0;
          q.createdAt = qdata.createdAt || Date.now();
          q.completedAt = qdata.completedAt || null;
          q.claimedAt = qdata.claimedAt || null;
          this.quests.set(qid, q);
        }
        this.playerQuestHistory = data.playerQuestHistory || [];
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        quests: Object.fromEntries(Array.from(this.quests.entries()).map(([k, v]) => [k, { questId: v.questId, title: v.title, description: v.description, objectives: v.objectives.map(o => ({ type: o.type, target: o.target, targetId: o.targetId, progress: o.progress, completed: o.completed })), rewards: v.rewards, status: v.status, progress: v.progress, createdAt: v.createdAt, expiresAt: v.expiresAt, completedAt: v.completedAt, claimedAt: v.claimedAt }])),
        playerQuestHistory: this.playerQuestHistory
      };
      localStorage.setItem('quest_system', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  generateDailyQuests(playerId, count) {
    const generated = [];
    const shuffled = [...this.questTemplates].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      const t = shuffled[i];
      const questId = `quest_${Date.now()}_${i}`;
      const obj = [new QuestObjective(t.type, t.target, t.targetId)];
      const expiresAt = Date.now() + 24 * 3600 * 1000;
      const quest = new Quest(questId, t.title, t.description, obj, t.rewards, expiresAt);
      this.quests.set(questId, quest);
      generated.push(quest);
    }
    this._save();
    this._emit('quests_generated', { playerId, count: generated.length });
    return generated;
  }

  makeProgress(playerId, objectiveType, targetId, amount) {
    const updated = [];
    for (const quest of this.quests.values()) {
      if (quest.status !== 'active') continue;
      for (const obj of quest.objectives) {
        if (obj.type === objectiveType && (obj.targetId === null || obj.targetId === targetId)) {
          const before = obj.completed;
          obj.addProgress(amount);
          if (!before && obj.completed) updated.push(quest.questId);
        }
      }
      quest.updateProgress();
      if (quest.isExpired()) quest.status = 'expired';
    }
    this._save();
    if (updated.length > 0) this._emit('quest_completed', { playerId, questIds: updated });
    return updated;
  }

  claimQuest(questId, playerId) {
    const quest = this.quests.get(questId);
    if (!quest) return { error: 'quest_not_found' };
    const result = quest.claim();
    if (result.error) return result;
    this.playerQuestHistory.push({ questId, playerId, status: 'claimed', claimedAt: Date.now() });
    this._save();
    this._emit('quest_claimed', { questId, playerId });
    return result;
  }

  getActiveQuests(playerId) {
    return Array.from(this.quests.values()).filter(q => q.status === 'active' || q.status === 'completed');
  }

  getQuestProgress(questId) {
    const quest = this.quests.get(questId);
    if (!quest) return null;
    return { questId, title: quest.title, progress: quest.progress, status: quest.status, objectives: quest.objectives.map(o => ({ type: o.type, progress: o.progress, target: o.target, completed: o.completed })) };
  }

  getPlayerStats(playerId) {
    const history = this.playerQuestHistory.filter(h => h.playerId === playerId);
    const completed = history.filter(h => h.status === 'claimed').length;
    return { totalQuests: history.length, completedQuests: completed };
  }
}

const QuestTools = {
  'quest.generate': {
    description: 'Generate daily quests for player',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, count: { type: 'number' } }, required: ['playerId'] },
    handler(args) {
      if (!window._questSystem) window._questSystem = new QuestSystem();
      return window._questSystem.generateDailyQuests(args.playerId, args.count || 3);
    }
  },
  'quest.progress': {
    description: 'Make progress on quests',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, type: { type: 'string' }, targetId: { type: 'string' }, amount: { type: 'number' } }, required: ['playerId', 'type'] },
    handler(args) {
      if (!window._questSystem) return { error: 'not_init' };
      return window._questSystem.makeProgress(args.playerId, args.type, args.targetId, args.amount || 1);
    }
  },
  'quest.claim': {
    description: 'Claim quest rewards',
    parameters: { type: 'object', properties: { questId: { type: 'string' }, playerId: { type: 'string' } }, required: ['questId', 'playerId'] },
    handler(args) {
      if (!window._questSystem) return { error: 'not_init' };
      return window._questSystem.claimQuest(args.questId, args.playerId);
    }
  },
  'quest.stats': {
    description: 'Get player quest stats',
    parameters: { type: 'object', properties: { playerId: { type: 'string' } } },
    handler(args) {
      if (!window._questSystem) window._questSystem = new QuestSystem();
      return window._questSystem.getPlayerStats(args.playerId || 'default');
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QuestObjective, Quest, QuestSystem, QuestTools };
}
if (typeof window !== 'undefined') {
  window.QuestObjective = QuestObjective;
  window.Quest = Quest;
  window.QuestSystem = QuestSystem;
  window.QuestTools = QuestTools;
}