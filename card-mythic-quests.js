// ============================================================================
// Card Mythic Quests — V183 Direction D
// Mythic quest system with epic storylines, lore, and legendary rewards
// generic-agent + ruflo hierarchical decomposition
// ============================================================================
'use strict';

(function () {
  // ----------------------------------------------------------------=======
  // LoreEntry: A piece of lore unlocked by completing quests
  // ========================================================================
  function LoreEntry(loreId, title, text, category, unlockedAt) {
    this.loreId = loreId;
    this.title = title || loreId;
    this.text = text || '';
    this.category = category || 'history'; // history, legend, myth, prophecy
    this.unlockedAt = unlockedAt || Date.now();
  }

  LoreEntry.prototype.getPreview = function (length) {
    var len = length || 50;
    if (this.text.length <= len) return this.text;
    return this.text.substring(0, len) + '...';
  };

  // ----------------------------------------------------------------=======
  // MythicQuest: A single mythic quest with chapters
  // ========================================================================
  function MythicQuest(questId, name, description, difficulty, loreReward) {
    this.questId = questId || ('mq_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Mythic Quest ' + questId;
    this.description = description || '';
    this.difficulty = difficulty || 'mythic'; // legendary, mythic, epic, rare
    this.loreReward = loreReward || null; // LoreEntry
    this.chapters = []; // array of { chapterId, title, objectives, completed }
    this.status = 'active'; // active, completed, abandoned
    this.startedAt = Date.now();
    this.completedAt = null;
  }

  MythicQuest.prototype.addChapter = function (chapterId, title, objectives) {
    this.chapters.push({
      chapterId: chapterId,
      title: title,
      objectives: objectives || [],
      completed: false
    });
    return { success: true, chapterCount: this.chapters.length };
  };

  MythicQuest.prototype.completeChapter = function (chapterId) {
    for (var i = 0; i < this.chapters.length; i++) {
      if (this.chapters[i].chapterId === chapterId) {
        this.chapters[i].completed = true;
        return { success: true, allComplete: this.isComplete() };
      }
    }
    return { error: 'chapter_not_found' };
  };

  MythicQuest.prototype.isComplete = function () {
    if (this.chapters.length === 0) return false;
    for (var i = 0; i < this.chapters.length; i++) {
      if (!this.chapters[i].completed) return false;
    }
    return true;
  };

  MythicQuest.prototype.complete = function () {
    this.status = 'completed';
    this.completedAt = Date.now();
    return { success: true, loreReward: this.loreReward };
  };

  MythicQuest.prototype.getProgress = function () {
    var total = this.chapters.length;
    var completed = 0;
    for (var i = 0; i < this.chapters.length; i++) {
      if (this.chapters[i].completed) completed++;
    }
    return { total: total, completed: completed, percent: total > 0 ? Math.floor((completed / total) * 100) : 0 };
  };

  // ----------------------------------------------------------------=======
  // MythicQuestManager: Manages all mythic quests
  // ========================================================================
  function MythicQuestManager(storageKey) {
    this.storageKey = storageKey || 'mythic_quest_manager';
    this._quests = {}; // questId -> MythicQuest
    this._unlockedLore = []; // array of LoreEntry
    this._questIdCounter = 0;
    this._loreIdCounter = 0;
    this._init();
  }

  MythicQuestManager.prototype._init = function () {
    this._load();
    if (Object.keys(this._quests).length === 0) {
      this._seedDefault();
    }
  };

  MythicQuestManager.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._questIdCounter = data.questCounter || 0;
          this._loreIdCounter = data.loreCounter || 0;
        }
      }
    } catch (e) {}
  };

  MythicQuestManager.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          questCounter: this._questIdCounter,
          loreCounter: this._loreIdCounter
        }));
      }
    } catch (e) {}
  };

  MythicQuestManager.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[MythicQuestManager] ' + msg);
    }
  };

  MythicQuestManager.prototype._seedDefault = function () {
    var lore = new LoreEntry('lore_dragon', 'The Dragon Awakening', 'Long ago, dragons ruled the world...', 'legend');
    this._unlockedLore.push(lore);
    var quest = new MythicQuest('mq_default', 'Dragon Hunt', 'Hunt the ancient dragon', 'legendary', lore);
    quest.addChapter('c1', 'Gather Allies', ['Find the fire mage', 'Recruit the knight']);
    quest.addChapter('c2', 'Dragon\'s Lair', ['Navigate the cavern', 'Defeat the guards']);
    this._quests['mq_default'] = quest;
  };

  MythicQuestManager.prototype.createQuest = function (name, description, difficulty, loreReward) {
    var questId = 'mq_' + (++this._questIdCounter);
    this._quests[questId] = new MythicQuest(questId, name, description, difficulty, loreReward);
    this._save();
    return { success: true, questId: questId };
  };

  MythicQuestManager.prototype.getQuest = function (questId) {
    return this._quests[questId] || null;
  };

  MythicQuestManager.prototype.getAllQuests = function () {
    return Object.keys(this._quests).map(function (k) { return this._quests[k]; }.bind(this));
  };

  MythicQuestManager.prototype.getActiveQuests = function () {
    return Object.keys(this._quests).map(function (k) { return this._quests[k]; }.bind(this))
      .filter(function (q) { return q.status === 'active'; });
  };

  MythicQuestManager.prototype.completeQuest = function (questId) {
    var q = this._quests[questId];
    if (!q) return { error: 'quest_not_found' };
    var r = q.complete();
    if (r.success && r.loreReward) {
      this._unlockedLore.push(r.loreReward);
    }
    return r;
  };

  MythicQuestManager.prototype.getUnlockedLore = function () {
    return this._unlockedLore.slice();
  };

  MythicQuestManager.prototype.getLoreByCategory = function (category) {
    return this._unlockedLore.filter(function (l) { return l.category === category; });
  };

  // ----------------------------------------------------------------=======
  // Exports
  // ----------------------------------------------------------------=======
  window.LoreEntry = LoreEntry;
  window.MythicQuest = MythicQuest;
  window.MythicQuestManager = MythicQuestManager;
})();