// ============================================================================
// Card Achievement Pursuit — V174 Direction D
// Achievement pursuit system with goals, milestones, and rewards tracking
// generic-agent autonomous goal pursuit + ruflo hierarchical decomposition
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // AchievementMilestone: A single milestone in an achievement
  // ========================================================================
  function AchievementMilestone(milestoneId, name, target, rewardType, rewardValue) {
    this.milestoneId = milestoneId;
    this.name = name || milestoneId;
    this.target = target || 1;
    this.current = 0;
    this.rewardType = rewardType || 'points';
    this.rewardValue = rewardValue || 0;
    this.completed = false;
    this.claimed = false;
  }

  AchievementMilestone.prototype.increment = function (amount) {
    if (this.completed) return { success: true, alreadyComplete: true };
    this.current = Math.min(this.current + (amount || 1), this.target);
    if (this.current >= this.target) {
      this.completed = true;
      this.current = this.target;
    }
    return { success: true, completed: this.completed };
  };

  AchievementMilestone.prototype.getProgress = function () {
    return { current: this.current, target: this.target, completed: this.completed };
  };

  AchievementMilestone.prototype.canClaim = function () {
    return this.completed && !this.claimed;
  };

  AchievementMilestone.prototype.claim = function () {
    if (!this.canClaim()) return { error: 'cannot_claim' };
    this.claimed = true;
    return { success: true, rewardType: this.rewardType, rewardValue: this.rewardValue };
  };

  AchievementMilestone.prototype.reset = function () {
    this.current = 0;
    this.completed = false;
    this.claimed = false;
    return { success: true };
  };

  // ----------------------------------------------------------------=======
  // Achievement: A multi-milestone achievement
  // ========================================================================
  function Achievement(achievementId, name, description, category, milestones) {
    this.achievementId = achievementId;
    this.name = name || achievementId;
    this.description = description || '';
    this.category = category || 'general';
    this.milestones = milestones || [];
    this.isSecret = false;
    this.tier = 'common'; // common, rare, epic, legendary
  }

  Achievement.prototype.getMilestone = function (milestoneId) {
    for (var i = 0; i < this.milestones.length; i++) {
      if (this.milestones[i].milestoneId === milestoneId) return this.milestones[i];
    }
    return null;
  };

  Achievement.prototype.getProgress = function () {
    var total = this.milestones.length;
    var completed = 0;
    for (var i = 0; i < this.milestones.length; i++) {
      if (this.milestones[i].completed) completed++;
    }
    return { totalMilestones: total, completedMilestones: completed };
  };

  Achievement.prototype.isComplete = function () {
    for (var i = 0; i < this.milestones.length; i++) {
      if (!this.milestones[i].completed) return false;
    }
    return true;
  };

  Achievement.prototype.getTotalRewardValue = function () {
    var total = 0;
    for (var i = 0; i < this.milestones.length; i++) {
      if (this.milestones[i].claimed) total += this.milestones[i].rewardValue;
    }
    return total;
  };

  Achievement.prototype.incrementMilestone = function (milestoneId, amount) {
    var m = this.getMilestone(milestoneId);
    if (!m) return { error: 'milestone_not_found' };
    return m.increment(amount);
  };

  Achievement.prototype.claimMilestone = function (milestoneId) {
    var m = this.getMilestone(milestoneId);
    if (!m) return { error: 'milestone_not_found' };
    return m.claim();
  };

  // ----------------------------------------------------------------=======
  // AchievementPursuitManager: Manages all achievements
  // ========================================================================
  function AchievementPursuitManager(storageKey) {
    this.storageKey = storageKey || 'achievement_pursuit';
    this._achievements = {};
    this._playerStats = {}; // playerId -> { points, achievements }
    this._playerIdSet = {};
    this._init();
  }

  AchievementPursuitManager.prototype._init = function () {
    this._load();
    if (Object.keys(this._achievements).length === 0) {
      this._createDefaultAchievements();
    }
  };

  AchievementPursuitManager.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._playerStats = data.playerStats || {};
        }
      }
    } catch (e) {}
  };

  AchievementPursuitManager.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          playerStats: this._playerStats
        }));
      }
    } catch (e) {}
  };

  AchievementPursuitManager.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[AchievementPursuitManager] ' + msg);
    }
  };

  AchievementPursuitManager.prototype._createDefaultAchievements = function () {
    var def = [
      new Achievement('first_battle', 'First Battle', 'Win your first battle', 'combat', [
        new AchievementMilestone('m1', 'Win 1 Battle', 1, 'points', 100)
      ]),
      new Achievement('rising_warrior', 'Rising Warrior', 'Win 10 battles', 'combat', [
        new AchievementMilestone('m1', 'Win 5 Battles', 5, 'points', 50),
        new AchievementMilestone('m2', 'Win 10 Battles', 10, 'points', 150)
      ]),
      new Achievement('collector', 'Card Collector', 'Collect 50 unique cards', 'collection', [
        new AchievementMilestone('m1', 'Collect 10', 10, 'points', 30),
        new AchievementMilestone('m2', 'Collect 25', 25, 'points', 75),
        new AchievementMilestone('m3', 'Collect 50', 50, 'points', 200)
      ]),
      new Achievement('guild_master', 'Guild Master', 'Lead your guild to victory', 'social', [
        new AchievementMilestone('m1', 'Win 1 Guild War', 1, 'points', 200),
        new AchievementMilestone('m2', 'Win 5 Guild Wars', 5, 'points', 500)
      ])
    ];
    for (var i = 0; i < def.length; i++) {
      this._achievements[def[i].achievementId] = def[i];
    }
  };

  AchievementPursuitManager.prototype.getPlayerStats = function (playerId) {
    return this._playerStats[playerId] || { points: 0, completedAchievements: [] };
  };

  AchievementPursuitManager.prototype.registerPlayer = function (playerId) {
    if (this._playerIdSet[playerId]) return { error: 'already_registered' };
    this._playerIdSet[playerId] = true;
    this._playerStats[playerId] = { points: 0, completedAchievements: [] };
    return { success: true };
  };

  AchievementPursuitManager.prototype.getAchievement = function (achievementId) {
    return this._achievements[achievementId] || null;
  };

  AchievementPursuitManager.prototype.getAllAchievements = function () {
    return Object.keys(this._achievements).map(function (k) { return this._achievements[k]; }.bind(this));
  };

  AchievementPursuitManager.prototype.getAchievementsByCategory = function (category) {
    var result = [];
    var self = this;
    Object.keys(this._achievements).forEach(function (k) {
      if (self._achievements[k].category === category) result.push(self._achievements[k]);
    });
    return result;
  };

  AchievementPursuitManager.prototype.incrementAchievement = function (playerId, achievementId, milestoneId, amount) {
    var achievement = this._achievements[achievementId];
    if (!achievement) return { error: 'achievement_not_found' };
    var result = achievement.incrementMilestone(milestoneId, amount);
    if (result.completed && achievement.isComplete()) {
      if (!this._playerStats[playerId]) this._playerStats[playerId] = { points: 0, completedAchievements: [] };
      var already = this._playerStats[playerId].completedAchievements.indexOf(achievementId);
      if (already < 0) {
        this._playerStats[playerId].completedAchievements.push(achievementId);
        this._playerStats[playerId].points += this._calculateAchievementPoints(achievement);
        this._save();
      }
    }
    return result;
  };

  AchievementPursuitManager.prototype._calculateAchievementPoints = function (achievement) {
    var total = 0;
    for (var i = 0; i < achievement.milestones.length; i++) {
      total += achievement.milestones[i].rewardValue;
    }
    return total;
  };

  AchievementPursuitManager.prototype.claimReward = function (playerId, achievementId, milestoneId) {
    var achievement = this._achievements[achievementId];
    if (!achievement) return { error: 'achievement_not_found' };
    var m = achievement.getMilestone(milestoneId);
    if (!m) return { error: 'milestone_not_found' };
    var r = m.claim();
    if (r.success) {
      this._playerStats[playerId].points += r.rewardValue;
      this._save();
    }
    return r;
  };

  AchievementPursuitManager.prototype.getPlayerPoints = function (playerId) {
    return this._playerStats[playerId] ? this._playerStats[playerId].points : 0;
  };

  AchievementPursuitManager.prototype.getPlayerCompletedAchievements = function (playerId) {
    return this._playerStats[playerId] ? this._playerStats[playerId].completedAchievements.slice() : [];
  };

  AchievementPursuitManager.prototype.getPlayerProgress = function (playerId) {
    var stats = this.getPlayerStats(playerId);
    var totalAch = this.getAllAchievements().length;
    var completed = stats.completedAchievements.length;
    var totalPoints = stats.points;
    return {
      totalAchievements: totalAch,
      completedAchievements: completed,
      completionRate: totalAch > 0 ? Math.round((completed / totalAch) * 100) : 0,
      totalPoints: totalPoints
    };
  };

  // ----------------------------------------------------------------=======
  // Exports
  // ----------------------------------------------------------------=======
  window.AchievementMilestone = AchievementMilestone;
  window.Achievement = Achievement;
  window.AchievementPursuitManager = AchievementPursuitManager;
})();