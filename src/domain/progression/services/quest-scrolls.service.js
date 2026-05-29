// ============================================================================
// Card Quest Scrolls — V177 Direction B
// Quest scroll system with procedurally generated missions and objectives
// chatdev role specialization + ruflo hierarchical decomposition
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // QuestObjective: A single objective within a quest
  // ========================================================================
  function QuestObjective(objId, type, target, description) {
    this.objId = objId || ('obj_' + Math.random().toString(36).substr(2, 6));
    this.type = type || 'collect'; // collect, defeat, win, craft, escort
    this.target = target || 1;
    this.current = 0;
    this.description = description || '';
    this.completed = false;
  }

  QuestObjective.prototype.increment = function (amount) {
    if (this.completed) return { success: true, alreadyComplete: true };
    this.current = Math.min(this.current + (amount || 1), this.target);
    if (this.current >= this.target) {
      this.current = this.target;
      this.completed = true;
    }
    return { success: true, completed: this.completed };
  };

  QuestObjective.prototype.getProgress = function () {
    return { current: this.current, target: this.target, completed: this.completed };
  };

  // --------------------------------------------------------------------===
  // QuestScroll: A single quest scroll with objectives
  // ========================================================================
  function QuestScroll(scrollId, name, description, difficulty, rewards) {
    this.scrollId = scrollId || ('scroll_' + Math.random().toString(36).substr(2, 6));
    this.name = name || scrollId;
    this.description = description || '';
    this.difficulty = difficulty || 'common'; // common, uncommon, rare, epic, legendary
    this.objectives = []; // array of QuestObjective
    this.rewards = rewards || { gold: 0, xp: 0 }; // { gold, xp, items }
    this.status = 'active'; // active, completed, abandoned
    this.isSecret = false;
  }

  QuestScroll.prototype.addObjective = function (obj) {
    this.objectives.push(obj);
    return { success: true, objectiveCount: this.objectives.length };
  };

  QuestScroll.prototype.getObjective = function (objId) {
    for (var i = 0; i < this.objectives.length; i++) {
      if (this.objectives[i].objId === objId) return this.objectives[i];
    }
    return null;
  };

  QuestScroll.prototype.incrementObjective = function (objId, amount) {
    var obj = this.getObjective(objId);
    if (!obj) return { error: 'objective_not_found' };
    return obj.increment(amount);
  };

  QuestScroll.prototype.isComplete = function () {
    for (var i = 0; i < this.objectives.length; i++) {
      if (!this.objectives[i].completed) return false;
    }
    return true;
  };

  QuestScroll.prototype.getProgress = function () {
    var total = this.objectives.length;
    var completed = 0;
    for (var i = 0; i < this.objectives.length; i++) {
      if (this.objectives[i].completed) completed++;
    }
    return { totalObjectives: total, completedObjectives: completed };
  };

  QuestScroll.prototype.complete = function () {
    this.status = 'completed';
    return { success: true, rewards: this.rewards };
  };

  QuestScroll.prototype.abandon = function () {
    this.status = 'abandoned';
    return { success: true };
  };

  QuestScroll.prototype.getTotalRewardValue = function () {
    return (this.rewards.gold || 0) + (this.rewards.xp || 0);
  };

  // --------------------------------------------------------------------===
  // QuestScrollManager: Manages all quest scrolls
  // ========================================================================
  function QuestScrollManager(storageKey) {
    this.storageKey = storageKey || 'quest_scrolls';
    this._scrolls = {};
    this._activeScrollId = null;
    this._scrollIdCounter = 0;
    this._init();
  }

  QuestScrollManager.prototype._init = function () {
    this._load();
    if (Object.keys(this._scrolls).length === 0) {
      this._createDefaultQuests();
    }
  };

  QuestScrollManager.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._activeScrollId = data.activeScrollId || null;
        }
      }
    } catch (e) {}
  };

  QuestScrollManager.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          activeScrollId: this._activeScrollId
        }));
      }
    } catch (e) {}
  };

  QuestScrollManager.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[QuestScrollManager] ' + msg);
    }
  };

  QuestScrollManager.prototype._createDefaultQuests = function () {
    var q1 = new QuestScroll('q1', 'First Steps', 'Complete your first quest', 'common', { gold: 50, xp: 20 });
    q1.addObjective(new QuestObjective('o1', 'win', 1, 'Win a battle'));
    this._scrolls['q1'] = q1;

    var q2 = new QuestScroll('q2', 'Collector', 'Gather materials', 'uncommon', { gold: 100, xp: 50 });
    q2.addObjective(new QuestObjective('o1', 'collect', 5, 'Collect 5 items'));
    q2.addObjective(new QuestObjective('o2', 'win', 3, 'Win 3 battles'));
    this._scrolls['q2'] = q2;

    var q3 = new QuestScroll('q3', 'Legendary Challenge', 'Face the ultimate trial', 'legendary', { gold: 1000, xp: 500 });
    q3.addObjective(new QuestObjective('o1', 'defeat', 10, 'Defeat 10 enemies'));
    q3.addObjective(new QuestObjective('o2', 'craft', 3, 'Craft 3 items'));
    q3.addObjective(new QuestObjective('o3', 'win', 5, 'Win 5 battles'));
    this._scrolls['q3'] = q3;
  };

  QuestScrollManager.prototype.createScroll = function (name, description, difficulty, rewards) {
    var scrollId = 'scroll_' + (++this._scrollIdCounter);
    this._scrolls[scrollId] = new QuestScroll(scrollId, name, description, difficulty, rewards);
    return { success: true, scrollId: scrollId };
  };

  QuestScrollManager.prototype.getScroll = function (scrollId) {
    return this._scrolls[scrollId] || null;
  };

  QuestScrollManager.prototype.getAllScrolls = function () {
    return Object.keys(this._scrolls).map(function (k) { return this._scrolls[k]; }.bind(this));
  };

  QuestScrollManager.prototype.getActiveScroll = function () {
    return this._activeScrollId ? this._scrolls[this._activeScrollId] : null;
  };

  QuestScrollManager.prototype.setActiveScroll = function (scrollId) {
    if (!this._scrolls[scrollId]) return { error: 'scroll_not_found' };
    this._activeScrollId = scrollId;
    this._save();
    return { success: true };
  };

  QuestScrollManager.prototype.getScrollsByDifficulty = function (difficulty) {
    var result = [];
    var self = this;
    Object.keys(this._scrolls).forEach(function (k) {
      if (self._scrolls[k].difficulty === difficulty) result.push(self._scrolls[k]);
    });
    return result;
  };

  QuestScrollManager.prototype.incrementObjectiveInScroll = function (scrollId, objId, amount) {
    var scroll = this._scrolls[scrollId];
    if (!scroll) return { error: 'scroll_not_found' };
    var result = scroll.incrementObjective(objId, amount);
    if (scroll.isComplete() && scroll.status === 'active') {
      scroll.complete();
    }
    return result;
  };

  QuestScrollManager.prototype.getAvailableQuests = function () {
    var result = [];
    var self = this;
    Object.keys(this._scrolls).forEach(function (k) {
      if (self._scrolls[k].status === 'active') result.push(self._scrolls[k]);
    });
    return result;
  };

  QuestScrollManager.prototype.abandonScroll = function (scrollId) {
    var scroll = this._scrolls[scrollId];
    if (!scroll) return { error: 'scroll_not_found' };
    return scroll.abandon();
  };

  // --------------------------------------------------------------------===
  // Exports
  // ----------------------------------------------------------------=======
  window.QuestObjective = QuestObjective;
  window.QuestScroll = QuestScroll;
  window.QuestScrollManager = QuestScrollManager;
})();