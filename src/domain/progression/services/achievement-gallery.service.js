// ============================================================================
// Card Achievement Gallery — V163 Direction B
// Achievement collection with milestones, unlocks, and showcase display
// chatdev role specialization + ruflo hierarchical decomposition
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // Achievement: Single achievement definition
  // ========================================================================
  function Achievement(id, name, description, category, rarity, icon, criteria) {
    this.id = id || '';
    this.name = name || '';
    this.description = description || '';
    this.category = category || 'general'; // general, combat, collection, social, special
    this.rarity = rarity || 'common'; // common, rare, epic, legendary
    this.icon = icon || '🏆';
    this.criteria = criteria || {}; // { type: 'win_games', value: 10, counter: 'wins' }
    this.unlocked = false;
    this.unlockedAt = null; // timestamp
    this.progress = 0;
    this.milestones = []; // [{ value: 5, bonus: 'item_1' }, { value: 10, bonus: 'item_2' }]
  }

  Achievement.prototype.getMaxProgress = function () {
    return this.criteria.value || 1;
  };

  Achievement.prototype.getProgressPercent = function () {
    var max = this.getMaxProgress();
    return max > 0 ? Math.min(100, (this.progress / max) * 100) : 0;
  };

  // --------------------------------------------------------------------===
  // AchievementCollection: Manages player's achievement collection
  // ========================================================================
  function AchievementCollection(storageKey) {
    this.storageKey = storageKey || 'achievement_collection';
    this._achievements = {}; // id -> Achievement
    this._unlockedIds = []; // array of achievement ids
    this._progress = {}; // counterName -> number
    this._stats = { totalUnlocked: 0, totalEarnedScore: 0, categoriesProgress: {} };
    this._init();
  }

  AchievementCollection.prototype._init = function () {
    this._load();
    if (Object.keys(this._achievements).length === 0) this._generateDefaultAchievements();
  };

  AchievementCollection.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._achievements = data.achievements || {};
          this._unlockedIds = data.unlockedIds || [];
          this._progress = data.progress || {};
          this._stats = data.stats || this._stats;
          // Rebuild achievements
          for (var id in this._achievements) {
            var rawA = this._achievements[id];
            // Restore prototype methods
            var a = new Achievement(rawA.id, rawA.name, rawA.description, rawA.category, rawA.rarity, rawA.icon, rawA.criteria);
            a.unlocked = rawA.unlocked;
            a.unlockedAt = rawA.unlockedAt;
            a.progress = rawA.progress;
            a.milestones = rawA.milestones || [];
            this._achievements[id] = a;
          }
        }
      }
    } catch (e) {}
  };

  AchievementCollection.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          achievements: this._achievements,
          unlockedIds: this._unlockedIds,
          progress: this._progress,
          stats: this._stats
        }));
      }
    } catch (e) {}
  };

  AchievementCollection.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[AchievementCollection] ' + msg);
    }
  };

  AchievementCollection.prototype._generateDefaultAchievements = function () {
    var defaults = [
      new Achievement('first_win', 'First Victory', 'Win your first game', 'combat', 'common', '🎯', { counter: 'wins', value: 1 }),
      new Achievement('win_10', 'Rising Star', 'Win 10 games', 'combat', 'rare', '⭐', { counter: 'wins', value: 10 }),
      new Achievement('win_50', 'Champion', 'Win 50 games', 'combat', 'epic', '🏅', { counter: 'wins', value: 50 }),
      new Achievement('win_100', 'Legend', 'Win 100 games', 'combat', 'legendary', '👑', { counter: 'wins', value: 100 }),
      new Achievement('first_loss', 'Learning', 'Lose your first game (everyone fails!)', 'combat', 'common', '📚', { counter: 'losses', value: 1 }),
      new Achievement('collect_10_cards', 'Card Collector', 'Collect 10 unique cards', 'collection', 'common', '🃏', { counter: 'cards_collected', value: 10 }),
      new Achievement('collect_50_cards', 'Card Hoarder', 'Collect 50 unique cards', 'collection', 'rare', '📦', { counter: 'cards_collected', value: 50 }),
      new Achievement('deck_master', 'Deck Master', 'Build 5 different decks', 'collection', 'epic', '🗂️', { counter: 'decks_built', value: 5 }),
      new Achievement('social_first', 'Social Butterfly', 'Add your first friend', 'social', 'common', '🤝', { counter: 'friends_added', value: 1 }),
      new Achievement('social_10', 'Popular', 'Have 10 friends', 'social', 'rare', '💝', { counter: 'friends_added', value: 10 }),
      new Achievement('guild_join', 'Guild Member', 'Join a guild', 'social', 'common', '🏠', { counter: 'guilds_joined', value: 1 }),
      new Achievement('first_legendary', 'Lucky', 'Unlock your first legendary item', 'special', 'epic', '✨', { counter: 'legendaries_unlocked', value: 1 }),
      new Achievement('tower_clear_5', 'Tower Climber', 'Clear 5 tower floors', 'combat', 'rare', '🗼', { counter: 'tower_floors_cleared', value: 5 }),
      new Achievement('tower_clear_20', 'Tower Master', 'Clear all 20 tower floors', 'combat', 'legendary', '🏔️', { counter: 'tower_floors_cleared', value: 20 }),
    ];
    for (var i = 0; i < defaults.length; i++) {
      this._achievements[defaults[i].id] = defaults[i];
    }
    this._log('Generated ' + defaults.length + ' default achievements');
  };

  // Increment a progress counter
  AchievementCollection.prototype.incrementCounter = function (counterName, amount) {
    if (amount === undefined) amount = 1;
    if (!this._progress[counterName]) this._progress[counterName] = 0;
    this._progress[counterName] += amount;
    return this._progress[counterName];
  };

  // Check and unlock achievements based on progress
  AchievementCollection.prototype.checkAchievements = function () {
    var newlyUnlocked = [];
    for (var id in this._achievements) {
      var ach = this._achievements[id];
      if (ach.unlocked) continue;
      var counterValue = this._progress[ach.criteria.counter] || 0;
      if (counterValue >= ach.criteria.value && !ach.unlocked) {
        this._unlock(ach.id);
        newlyUnlocked.push(ach);
      }
    }
    return newlyUnlocked;
  };

  AchievementCollection.prototype._unlock = function (achievementId) {
    var ach = this._achievements[achievementId];
    if (!ach || ach.unlocked) return false;
    ach.unlocked = true;
    ach.unlockedAt = Date.now();
    if (this._unlockedIds.indexOf(achievementId) < 0) {
      this._unlockedIds.push(achievementId);
    }
    this._stats.totalUnlocked++;
    var rarityScores = { common: 10, rare: 25, epic: 50, legendary: 100 };
    this._stats.totalEarnedScore += rarityScores[ach.rarity] || 10;
    this._save();
    this._log('Unlocked: ' + ach.name);
    return true;
  };

  // Get all achievements
  AchievementCollection.prototype.getAllAchievements = function () {
    var result = [];
    for (var id in this._achievements) result.push(this._achievements[id]);
    return result;
  };

  // Get achievements by category
  AchievementCollection.prototype.getByCategory = function (category) {
    var result = [];
    for (var id in this._achievements) {
      if (this._achievements[id].category === category) result.push(this._achievements[id]);
    }
    return result;
  };

  // Get unlocked achievements
  AchievementCollection.prototype.getUnlocked = function () {
    var result = [];
    for (var i = 0; i < this._unlockedIds.length; i++) {
      var ach = this._achievements[this._unlockedIds[i]];
      if (ach) result.push(ach);
    }
    return result;
  };

  // Get achievement by id
  AchievementCollection.prototype.get = function (id) {
    return this._achievements[id] || null;
  };

  // Get counter value
  AchievementCollection.prototype.getCounter = function (counterName) {
    return this._progress[counterName] || 0;
  };

  // Get stats
  AchievementCollection.prototype.getStats = function () {
    return {
      totalUnlocked: this._stats.totalUnlocked,
      totalAchievements: Object.keys(this._achievements).length,
      totalEarnedScore: this._stats.totalEarnedScore,
      categoriesProgress: this._getCategoriesProgress()
    };
  };

  AchievementCollection.prototype._getCategoriesProgress = function () {
    var cats = {};
    for (var id in this._achievements) {
      var ach = this._achievements[id];
      if (!cats[ach.category]) cats[ach.category] = { total: 0, unlocked: 0 };
      cats[ach.category].total++;
      if (ach.unlocked) cats[ach.category].unlocked++;
    }
    return cats;
  };

  // Unlock achievement directly (for testing/cheats)
  AchievementCollection.prototype.unlockDirect = function (achievementId) {
    return this._unlock(achievementId);
  };

  // Get leaderboard (sorted by score)
  AchievementCollection.prototype.getLeaderboard = function (allCollections) {
    var entries = [];
    for (var i = 0; i < allCollections.length; i++) {
      var stats = allCollections[i].getStats();
      entries.push({
        score: stats.totalEarnedScore,
        unlocked: stats.totalUnlocked,
        total: stats.totalAchievements
      });
    }
    entries.sort(function (a, b) { return b.score - a.score; });
    return entries;
  };

  // --------------------------------------------------------------------===
  // AchievementShowcase: Display unlocked achievements in a showcase
  // ========================================================================
  function AchievementShowcase(collection, maxSlots) {
    this.collection = collection;
    this.maxSlots = maxSlots || 6;
    this.slots = []; // array of achievement ids
  }

  AchievementShowcase.prototype.addToShowcase = function (achievementId) {
    var ach = this.collection.get(achievementId);
    if (!ach) return { error: 'achievement_not_found' };
    if (!ach.unlocked) return { error: 'achievement_not_unlocked' };
    if (this.slots.indexOf(achievementId) >= 0) return { error: 'already_in_showcase' };
    if (this.slots.length >= this.maxSlots) return { error: 'showcase_full' };
    this.slots.push(achievementId);
    return { success: true, showcase: this.slots.slice() };
  };

  AchievementShowcase.prototype.removeFromShowcase = function (achievementId) {
    var idx = this.slots.indexOf(achievementId);
    if (idx < 0) return { error: 'not_in_showcase' };
    this.slots.splice(idx, 1);
    return { success: true, showcase: this.slots.slice() };
  };

  AchievementShowcase.prototype.getShowcase = function () {
    var self = this;
    return this.slots.map(function (id) { return self.collection.get(id); }).filter(function (a) { return a !== null; });
  };

  AchievementShowcase.prototype.swapSlots = function (id1, id2) {
    var i1 = this.slots.indexOf(id1);
    var i2 = this.slots.indexOf(id2);
    if (i1 < 0 || i2 < 0) return { error: 'slot_not_found' };
    this.slots[i1] = id2;
    this.slots[i2] = id1;
    return { success: true, showcase: this.slots.slice() };
  };

  // --------------------------------------------------------------------===
  // Exports
  // ----------------------------------------------------------------=======
  window.Achievement = Achievement;
  window.AchievementCollection = AchievementCollection;
  window.AchievementShowcase = AchievementShowcase;
})();