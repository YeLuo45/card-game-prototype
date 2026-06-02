// ============================================================================
// Card Challenge League — V146 Direction C
// Competitive challenge system with daily/weekly missions and rewards
// thunderbolt offline-first + generic-agent L0-L4 + nanobot tool registry
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // Challenge: Single challenge definition
  // -----------------------------------------------------------------------
  function Challenge(id, type, difficulty, description, requirements, rewards) {
    this.id = id;
    this.type = type || 'daily'; // daily | weekly | special | achievement
    this.difficulty = difficulty || 'normal'; // easy | normal | hard | extreme
    this.description = description || '';
    this.requirements = requirements || {};
    this.rewards = rewards || {};
    this.progress = 0;
    this.completed = false;
    this.claimed = false;
    this.startedAt = null;
    this.completedAt = null;
  }

  Challenge.prototype.start = function () { this.startedAt = Date.now(); };
  Challenge.prototype.updateProgress = function (amount) {
    this.progress += amount;
    if (this.requirements.target && this.progress >= this.requirements.target) {
      this.completed = true;
      this.completedAt = Date.now();
    }
  };
  Challenge.prototype.claim = function () { this.claimed = true; };
  Challenge.prototype.getProgress = function () {
    if (!this.requirements.target) return 0;
    return Math.min(this.progress / this.requirements.target, 1);
  };

  // --------------------------------------------------------------------===
  // ChallengeManager: Manages all challenges
  // --------------------------------------------------------------------===
  function ChallengeManager(storageKey) {
    this.storageKey = storageKey || 'challenge_league';
    this._challenges = {};
    this._activeChallenges = [];
    this._completedChallenges = [];
    this._stats = { started: 0, completed: 0, claimed: 0, streak: 0 };
    this._init();
  }

  ChallengeManager.prototype._init = function () {
    this._load();
  };

  ChallengeManager.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._challenges = data.challenges || {};
          this._stats = data.stats || this._stats;
        }
      }
    } catch (e) {}
    // Initialize with default challenges if empty
    if (Object.keys(this._challenges).length === 0) {
      this._generateDailyChallenges();
    }
  };

  ChallengeManager.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          challenges: this._challenges,
          stats: this._stats
        }));
      }
    } catch (e) {}
  };

  ChallengeManager.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) console.log('[ChallengeLeague] ' + msg);
  };

  ChallengeManager.prototype._generateDailyChallenges = function () {
    var daily = [
      { id: 'daily_win1', type: 'daily', difficulty: 'easy', desc: 'Win 1 battle', req: { type: 'wins', target: 1 }, rewards: { xp: 50, coins: 100 } },
      { id: 'daily_win3', type: 'daily', difficulty: 'normal', desc: 'Win 3 battles', req: { type: 'wins', target: 3 }, rewards: { xp: 150, coins: 300 } },
      { id: 'daily_cards10', type: 'daily', difficulty: 'easy', desc: 'Play 10 cards', req: { type: 'cards_played', target: 10 }, rewards: { xp: 30, coins: 80 } }
    ];

    var weekly = [
      { id: 'weekly_win20', type: 'weekly', difficulty: 'hard', desc: 'Win 20 battles', req: { type: 'wins', target: 20 }, rewards: { xp: 500, coins: 1000, card: 'rare_sword' } }
    ];

    for (var i = 0; i < daily.length; i++) {
      var d = daily[i];
      var c = new Challenge(d.id, d.type, d.difficulty, d.desc, d.req, d.rewards);
      this._challenges[d.id] = c;
    }

    for (var j = 0; j < weekly.length; j++) {
      var w = weekly[j];
      var c2 = new Challenge(w.id, w.type, w.difficulty, w.desc, w.req, w.rewards);
      this._challenges[w.id] = c2;
    }

    this._log('Generated ' + daily.length + ' daily + ' + weekly.length + ' weekly challenges');
  };

  // Get all challenges
  ChallengeManager.prototype.getAllChallenges = function () {
    var result = [];
    for (var id in this._challenges) {
      result.push(this._challenges[id]);
    }
    return result;
  };

  // Get active challenges
  ChallengeManager.prototype.getActive = function () {
    var result = [];
    for (var id in this._challenges) {
      var c = this._challenges[id];
      if (c.startedAt && !c.completed) result.push(c);
    }
    return result;
  };

  // Start a challenge
  ChallengeManager.prototype.startChallenge = function (challengeId) {
    var c = this._challenges[challengeId];
    if (!c) return { error: 'challenge_not_found' };
    if (c.startedAt) return { error: 'already_started' };

    c.start();
    this._stats.started++;
    this._save();
    this._log('Started challenge: ' + challengeId);
    return { success: true };
  };

  // Update challenge progress
  ChallengeManager.prototype.updateProgress = function (challengeId, amount) {
    var c = this._challenges[challengeId];
    if (!c) return { error: 'challenge_not_found' };
    if (!c.startedAt) return { error: 'not_started' };
    if (c.completed) return { error: 'already_completed' };

    c.updateProgress(amount);
    this._save();
    this._log('Updated ' + challengeId + ': +' + amount + ' -> ' + c.progress);
    return { success: true, progress: c.progress, completed: c.completed };
  };

  // Claim reward
  ChallengeManager.prototype.claimReward = function (challengeId) {
    var c = this._challenges[challengeId];
    if (!c) return { error: 'challenge_not_found' };
    if (!c.completed) return { error: 'not_completed' };
    if (c.claimed) return { error: 'already_claimed' };

    c.claim();
    this._stats.claimed++;
    this._stats.completed++;
    this._save();
    this._log('Claimed reward: ' + challengeId);
    return { success: true, rewards: c.rewards };
  };

  // Get challenge by ID
  ChallengeManager.prototype.getChallenge = function (challengeId) {
    return this._challenges[challengeId] || null;
  };

  // Get stats
  ChallengeManager.prototype.getStats = function () {
    return {
      started: this._stats.started,
      completed: this._stats.completed,
      claimed: this._stats.claimed,
      streak: this._stats.streak,
      totalChallenges: Object.keys(this._challenges).length,
      completedCount: Object.keys(this._challenges).filter(function (id) { return this._challenges[id].completed; }, this).length
    };
  };

  // Reset daily challenges (called when day changes)
  ChallengeManager.prototype.resetDaily = function () {
    var reset = 0;
    for (var id in this._challenges) {
      var c = this._challenges[id];
      if (c.type === 'daily' && !c.claimed) {
        c.progress = 0;
        c.completed = false;
        c.startedAt = null;
        c.completedAt = null;
        reset++;
      }
    }
    this._save();
    this._log('Reset ' + reset + ' daily challenges');
    return { success: true, reset: reset };
  };

  // Update streak
  ChallengeManager.prototype.updateStreak = function () {
    var allCompleted = true;
    for (var id in this._challenges) {
      var c = this._challenges[id];
      if (c.type === 'daily' && !c.completed) { allCompleted = false; break; }
    }
    if (allCompleted) {
      this._stats.streak++;
      this._log('Streak: ' + this._stats.streak + ' days');
    } else {
      this._stats.streak = 0;
    }
    this._save();
    return { streak: this._stats.streak };
  };

  // Add custom challenge
  ChallengeManager.prototype.addChallenge = function (id, type, difficulty, description, requirements, rewards) {
    if (this._challenges[id]) return { error: 'id_exists' };
    var c = new Challenge(id, type, difficulty, description, requirements, rewards);
    this._challenges[id] = c;
    this._save();
    return { success: true };
  };

  // --------------------------------------------------------------------===
  // RewardCalculator: Calculate reward multipliers
  // --------------------------------------------------------------------===
  function RewardCalculator() {}

  RewardCalculator.prototype.calculate = function (baseRewards, difficulty, streak) {
    var multiplier = 1.0;

    // Difficulty multiplier
    var diffMult = { easy: 0.8, normal: 1.0, hard: 1.5, extreme: 2.0 };
    multiplier *= diffMult[difficulty] || 1.0;

    // Streak multiplier
    if (streak > 0) {
      multiplier *= (1 + Math.min(streak * 0.1, 0.5)); // Cap at 50% bonus
    }

    var result = {};
    for (var key in baseRewards) {
      result[key] = Math.floor((baseRewards[key] || 0) * multiplier);
    }
    result.multiplier = multiplier;
    return result;
  };

  // --------------------------------------------------------------------===
  // Exports
  // -----------------------------------------------------------------------
  window.Challenge = Challenge;
  window.ChallengeManager = ChallengeManager;
  window.RewardCalculator = RewardCalculator;
})();