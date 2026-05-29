// ============================================================================
// Card Weekly Challenge — V168 Direction C
// Weekly rotating challenges with score multipliers and rewards
// thunderbolt feedback loops + generic-agent autonomous goal pursuit
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // Challenge: Individual challenge definition
  // ========================================================================
  function Challenge(id, title, description, category, targetValue, rewardPoints) {
    this.id = id;
    this.title = title || id;
    this.description = description || '';
    this.category = category || 'general';
    this.targetValue = (targetValue !== undefined && targetValue !== null) ? targetValue : 1;
    this.rewardPoints = rewardPoints || 10;
    this.currentValue = 0;
    this.completed = false;
    this.completedAt = null;
  }

  Challenge.prototype.updateProgress = function (value) {
    if (this.completed) return;
    this.currentValue = value;
    if (this.currentValue >= this.targetValue) {
      this.completed = true;
      this.completedAt = Date.now();
    }
  };

  Challenge.prototype.getProgressPercent = function () {
    if (this.targetValue <= 0) return 100;
    var pct = (this.currentValue / this.targetValue) * 100;
    return Math.min(100, Math.round(pct));
  };

  Challenge.prototype.reset = function () {
    this.currentValue = 0;
    this.completed = false;
    this.completedAt = null;
  };

  // --------------------------------------------------------------------===
  // WeeklyChallengeSet: Rotating weekly challenge set
  // ========================================================================
  function WeeklyChallengeSet(storageKey) {
    this.storageKey = storageKey || 'weekly_challenges';
    this._challenges = [];
    this._weekNumber = this._getWeekNumber();
    this._year = this._getYear();
    this._multiplier = 1.0;
    this._init();
  }

  WeeklyChallengeSet.prototype._init = function () {
    this._load();
    var currentWeek = this._getWeekNumber();
    var currentYear = this._getYear();
    if (currentWeek !== this._weekNumber || currentYear !== this._year || this._challenges.length === 0) {
      this._rotateChallenges();
    }
  };

  WeeklyChallengeSet.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._weekNumber = data.weekNumber || this._weekNumber;
          this._year = data.year || this._year;
          this._multiplier = data.multiplier || 1.0;
        }
      }
    } catch (e) {}
  };

  WeeklyChallengeSet.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          weekNumber: this._weekNumber,
          year: this._year,
          multiplier: this._multiplier
        }));
      }
    } catch (e) {}
  };

  WeeklyChallengeSet.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[WeeklyChallengeSet] ' + msg);
    }
  };

  WeeklyChallengeSet.prototype._getWeekNumber = function () {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 1);
    var days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  };

  WeeklyChallengeSet.prototype._getYear = function () {
    return new Date().getFullYear();
  };

  WeeklyChallengeSet.prototype._rotateChallenges = function () {
    this._weekNumber = this._getWeekNumber();
    this._year = this._getYear();
    this._challenges = this._generateChallenges();
    this._multiplier = 1.0;
    this._save();
  };

  WeeklyChallengeSet.prototype._generateChallenges = function () {
    var templates = [
      new Challenge('win_5_games', 'Win 5 Games', 'Win 5 games this week', 'combat', 5, 100),
      new Challenge('win_10_games', 'Win 10 Games', 'Win 10 games this week', 'combat', 10, 200),
      new Challenge('deal_100_damage', 'Damage Dealer', 'Deal 100 total damage', 'combat', 100, 150),
      new Challenge('heal_50_hp', 'Healer', 'Heal 50 HP total', 'combat', 50, 100),
      new Challenge('play_20_spell_cards', 'Spellcaster', 'Play 20 spell cards', 'spells', 20, 120),
      new Challenge('use_10_epic_cards', 'Epic Power', 'Use 10 epic cards', 'collection', 10, 180),
      new Challenge('collect_50_cards', 'Card Collector', 'Collect 50 cards', 'collection', 50, 150),
      new Challenge('build_3_decks', 'Deck Builder', 'Build 3 custom decks', 'collection', 3, 80),
      new Challenge('earn_500_points', 'High Scorer', 'Earn 500 total points', 'score', 500, 200),
      new Challenge('clear_tower_5_floors', 'Tower Climber', 'Clear 5 tower floors', 'special', 5, 160)
    ];
    // Select 5 random challenges
    var shuffled = templates.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
    }
    return shuffled.slice(0, 5);
  };

  WeeklyChallengeSet.prototype.getChallenges = function () {
    return this._challenges.slice();
  };

  WeeklyChallengeSet.prototype.updateChallenge = function (challengeId, value) {
    for (var i = 0; i < this._challenges.length; i++) {
      if (this._challenges[i].id === challengeId) {
        this._challenges[i].updateProgress(value);
        this._save();
        return { success: true, challenge: this._challenges[i] };
      }
    }
    return { error: 'challenge_not_found' };
  };

  WeeklyChallengeSet.prototype.setMultiplier = function (multiplier) {
    this._multiplier = multiplier;
    this._save();
    return { success: true, multiplier: this._multiplier };
  };

  WeeklyChallengeSet.prototype.getMultiplier = function () {
    return this._multiplier;
  };

  WeeklyChallengeSet.prototype.getCompletionCount = function () {
    var count = 0;
    for (var i = 0; i < this._challenges.length; i++) {
      if (this._challenges[i].completed) count++;
    }
    return count;
  };

  WeeklyChallengeSet.prototype.getTotalRewardPoints = function () {
    var total = 0;
    for (var i = 0; i < this._challenges.length; i++) {
      var c = this._challenges[i];
      total += c.completed ? c.rewardPoints : 0;
    }
    return Math.round(total * this._multiplier);
  };

  WeeklyChallengeSet.prototype.getWeekInfo = function () {
    return {
      year: this._year,
      weekNumber: this._weekNumber,
      challengeCount: this._challenges.length,
      completedCount: this.getCompletionCount(),
      multiplier: this._multiplier
    };
  };

  // ----------------------------------------------------------------=======
  // ChallengeEventManager: Manages challenge events and notifications
  // ========================================================================
  function ChallengeEventManager(storageKey) {
    this.storageKey = storageKey || 'challenge_events';
    this._notifications = []; // array of { message, type, timestamp, read }
    this._init();
  }

  ChallengeEventManager.prototype._init = function () {
    this._load();
  };

  ChallengeEventManager.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._notifications = data.notifications || [];
        }
      }
    } catch (e) {}
  };

  ChallengeEventManager.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          notifications: this._notifications
        }));
      }
    } catch (e) {}
  };

  ChallengeEventManager.prototype.addNotification = function (message, notifType) {
    this._notifications.push({
      message: message,
      type: notifType || 'info',
      timestamp: Date.now(),
      read: false
    });
    this._save();
    return { success: true, count: this._notifications.length };
  };

  ChallengeEventManager.prototype.markAllRead = function () {
    for (var i = 0; i < this._notifications.length; i++) {
      this._notifications[i].read = true;
    }
    this._save();
    return { success: true };
  };

  ChallengeEventManager.prototype.getUnreadCount = function () {
    var count = 0;
    for (var i = 0; i < this._notifications.length; i++) {
      if (!this._notifications[i].read) count++;
    }
    return count;
  };

  ChallengeEventManager.prototype.getNotifications = function (limit) {
    var notifs = this._notifications.slice();
    notifs.reverse();
    if (limit) notifs = notifs.slice(0, limit);
    return notifs;
  };

  // ----------------------------------------------------------------=======
  // Exports
  // ----------------------------------------------------------------=======
  window.Challenge = Challenge;
  window.WeeklyChallengeSet = WeeklyChallengeSet;
  window.ChallengeEventManager = ChallengeEventManager;
})();