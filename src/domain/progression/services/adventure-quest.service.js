// ============================================================================
// Card Adventure Quest — V157 Direction D
// Adventure quest system with story missions and progression rewards
// chatdev multi-agent storytelling + thunderbolt offline-first + nanobot mesh
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // Quest: A single quest within an adventure
  // ========================================================================
  function Quest(id, title, description, objectives, difficulty, rewards, prerequisites) {
    this.id = id || '';
    this.title = title || '';
    this.description = description || '';
    this.objectives = objectives || []; // array of { id, description, completed }
    this.difficulty = difficulty || 1; // 1-5
    this.rewards = rewards || {}; // e.g. { gold: 100, experience: 50, cards: ['c1'] }
    this.prerequisites = prerequisites || []; // array of quest IDs
    this.status = 'locked'; // locked | available | in_progress | completed | failed
    this.startedAt = null;
    this.completedAt = null;
    this.progress = 0; // 0-100
    this.choices = []; // player's narrative choices
  }

  Quest.prototype.start = function () {
    if (this.status !== 'available') return false;
    this.status = 'in_progress';
    this.startedAt = Date.now();
    return true;
  };

  Quest.prototype.updateProgress = function (amount) {
    this.progress = Math.min(100, this.progress + (amount || 10));
  };

  Quest.prototype.isComplete = function () { return this.progress >= 100; };

  Quest.prototype.complete = function () {
    this.status = 'completed';
    this.completedAt = Date.now();
    this.progress = 100;
  };

  Quest.prototype.fail = function () {
    this.status = 'failed';
    this.completedAt = Date.now();
  };

  Quest.prototype.addChoice = function (choice) {
    this.choices.push({ choice: choice, madeAt: Date.now() });
  };

  Quest.prototype.getObjectiveStatus = function (objId) {
    for (var i = 0; i < this.objectives.length; i++) {
      if (this.objectives[i].id === objId) return this.objectives[i].completed;
    }
    return false;
  };

  // --------------------------------------------------------------------===
  // AdventureChapter: A chapter containing multiple quests
  // ========================================================================
  function AdventureChapter(id, title, description, questIds, unlockRequirement) {
    this.id = id || '';
    this.title = title || '';
    this.description = description || '';
    this.questIds = questIds || [];
    this.unlockRequirement = unlockRequirement || 0; // number of previous quests to complete
    this.status = 'locked'; // locked | available | completed
    this.unlockedAt = null;
  }

  AdventureChapter.prototype.unlock = function () {
    this.status = 'available';
    this.unlockedAt = Date.now();
  };

  // --------------------------------------------------------------------===
  // AdventureQuest: Main adventure quest system
  // ========================================================================
  function AdventureQuest(storageKey) {
    this.storageKey = storageKey || 'adventure_quest';
    this._chapters = {};
    this._quests = {};
    this._completedQuests = [];
    this._currentQuestId = null;
    this._totalQuestsCompleted = 0;
    this._totalGoldEarned = 0;
    this._init();
  }

  AdventureQuest.prototype._init = function () {
    this._load();
    if (Object.keys(this._quests).length === 0) this._generateDefaultAdventure();
  };

  AdventureQuest.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._chapters = data.chapters || {};
          this._quests = data.quests || {};
          this._completedQuests = data.completedQuests || [];
          this._currentQuestId = data.currentQuestId || null;
          this._totalQuestsCompleted = data.totalQuestsCompleted || 0;
          this._totalGoldEarned = data.totalGoldEarned || 0;
        }
      }
    } catch (e) {}
  };

  AdventureQuest.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          chapters: this._chapters,
          quests: this._quests,
          completedQuests: this._completedQuests,
          currentQuestId: this._currentQuestId,
          totalQuestsCompleted: this._totalQuestsCompleted,
          totalGoldEarned: this._totalGoldEarned
        }));
      }
    } catch (e) {}
  };

  AdventureQuest.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) console.log('[AdventureQuest] ' + msg);
  };

  AdventureQuest.prototype._generateDefaultAdventure = function () {
    var chapter1 = new AdventureChapter('ch1', 'The Beginning', 'Your journey starts here', ['q1', 'q2'], 0);
    chapter1.status = 'available';
    chapter1.unlockedAt = Date.now();
    this._chapters['ch1'] = chapter1;

    var q1 = new Quest('q1', 'First Steps', 'Begin your adventure', [{ id: 'o1', description: 'Meet the village elder', completed: false }], 1, { gold: 100, experience: 25 }, []);
    q1.status = 'available';
    this._quests['q1'] = q1;

    var q2 = new Quest('q2', 'The Forest Path', 'Venture into the dark forest', [{ id: 'o1', description: 'Cross the river', completed: false }, { id: 'o2', description: 'Defeat the wolf', completed: false }], 2, { gold: 200, experience: 50 }, ['q1']);
    this._quests['q2'] = q2;

    this._log('Generated default adventure with 2 chapters and 2 quests');
  };

  // Get current quest
  AdventureQuest.prototype.getCurrentQuest = function () {
    return this._quests[this._currentQuestId] || null;
  };

  // Set current quest
  AdventureQuest.prototype.setCurrentQuest = function (questId) {
    var q = this._quests[questId];
    if (!q) return { error: 'quest_not_found' };
    this._currentQuestId = questId;
    this._save();
    return { success: true };
  };

  // Start a quest
  AdventureQuest.prototype.startQuest = function (questId) {
    var q = this._quests[questId];
    if (!q) return { error: 'quest_not_found' };
    if (q.status !== 'available') return { error: 'quest_not_available' };

    // Check prerequisites
    for (var i = 0; i < q.prerequisites.length; i++) {
      var prereq = this._quests[q.prerequisites[i]];
      if (!prereq || prereq.status !== 'completed') return { error: 'prerequisites_not_met' };
    }

    q.start();
    this._currentQuestId = questId;
    this._save();
    return { success: true };
  };

  // Update quest progress
  AdventureQuest.prototype.updateQuestProgress = function (questId, amount) {
    var q = this._quests[questId];
    if (!q) return { error: 'quest_not_found' };
    if (q.status !== 'in_progress') return { error: 'quest_not_in_progress' };

    q.updateProgress(amount || 10);

    if (q.isComplete()) q.complete();
    this._save();
    return { success: true, progress: q.progress };
  };

  // Complete a quest
  AdventureQuest.prototype.completeQuest = function (questId) {
    var q = this._quests[questId];
    if (!q) return { error: 'quest_not_found' };

    q.complete();
    if (this._completedQuests.indexOf(questId) < 0) this._completedQuests.push(questId);
    this._totalQuestsCompleted++;

    // Award rewards
    if (q.rewards.gold) this._totalGoldEarned += q.rewards.gold;

    this._checkChapterUnlocks();
    this._save();
    return { success: true, rewards: q.rewards };
  };

  AdventureQuest.prototype._checkChapterUnlocks = function () {
    for (var cid in this._chapters) {
      var ch = this._chapters[cid];
      if (ch.status !== 'locked') continue;

      var completed = 0;
      for (var i = 0; i < ch.questIds.length; i++) {
        if (this._completedQuests.indexOf(ch.questIds[i]) >= 0) completed++;
      }
      if (completed >= ch.unlockRequirement) ch.unlock();
    }
  };

  // Make a narrative choice
  AdventureQuest.prototype.makeChoice = function (questId, choice) {
    var q = this._quests[questId];
    if (!q) return { error: 'quest_not_found' };
    q.addChoice(choice);
    this._save();
    return { success: true };
  };

  // List all chapters
  AdventureQuest.prototype.listChapters = function () {
    var result = [];
    for (var id in this._chapters) result.push(this._chapters[id]);
    return result;
  };

  // List available quests
  AdventureQuest.prototype.listAvailableQuests = function () {
    var result = [];
    for (var id in this._quests) {
      if (this._quests[id].status === 'available') result.push(this._quests[id]);
    }
    return result;
  };

  // Get quest by id
  AdventureQuest.prototype.getQuest = function (questId) {
    return this._quests[questId] || null;
  };

  // Get stats
  AdventureQuest.prototype.getStats = function () {
    return {
      totalQuestsCompleted: this._totalQuestsCompleted,
      totalGoldEarned: this._totalGoldEarned,
      chaptersUnlocked: Object.keys(this._chapters).length
    };
  };

  // Add a custom chapter
  AdventureQuest.prototype.addChapter = function (id, title, description, questIds, unlockRequirement) {
    if (this._chapters[id]) return { error: 'chapter_exists' };
    this._chapters[id] = new AdventureChapter(id, title, description, questIds, unlockRequirement);
    this._save();
    return { success: true };
  };

  // Add a custom quest
  AdventureQuest.prototype.addQuest = function (id, title, description, objectives, difficulty, rewards, prerequisites) {
    if (this._quests[id]) return { error: 'quest_exists' };
    var q = new Quest(id, title, description, objectives, difficulty, rewards, prerequisites);
    // Check if prerequisites are met to set status
    if (!prerequisites || prerequisites.length === 0) q.status = 'available';
    this._quests[id] = q;
    this._save();
    return { success: true };
  };

  // --------------------------------------------------------------------===
  // Exports
  // ----------------------------------------------------------------=======
  window.Quest = Quest;
  window.AdventureChapter = AdventureChapter;
  window.AdventureQuest = AdventureQuest;
})();