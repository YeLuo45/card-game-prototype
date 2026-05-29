// ============================================================================
// Card Riddle Tower — V202 Direction C
// Riddle tower with puzzle chambers, clue systems, and riddle mastery
// thunderbolt feedback loops + generic-agent autonomous goal pursuit
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // RiddleChamber: A single puzzle chamber
  // -----------------------------------------------------------------------
  function RiddleChamber(chamberId, name, difficulty, riddle, answer, rewards) {
    this.chamberId = chamberId;
    this.name = name || chamberId;
    this.difficulty = difficulty || 1; // 1-5
    this.riddle = riddle || 'What has keys but no locks?';
    this.answer = answer || 'keyboard';
    this.rewards = rewards || { gold: 10, xp: 5 };
    this.solved = false;
    this.solvedAt = null;
    this.attempts = 0;
    this.hintsUsed = 0;
    this.clues = [];
  }

  RiddleChamber.prototype.attempt = function (guess) {
    this.attempts++;
    if (guess.toLowerCase().trim() === this.answer.toLowerCase().trim()) {
      this.solved = true;
      this.solvedAt = Date.now();
      return { success: true, solved: true, rewards: this._computeRewards() };
    }
    return { success: false, solved: false, attempts: this.attempts };
  };

  RiddleChamber.prototype._computeRewards = function () {
    var base = this.rewards;
    var penalty = Math.max(0, this.attempts - 1) * 0.1;
    var hintPenalty = this.hintsUsed * 0.15;
    var mult = Math.max(0.1, 1 - penalty - hintPenalty);
    return {
      gold: Math.floor(base.gold * mult),
      xp: Math.floor(base.xp * mult)
    };
  };

  RiddleChamber.prototype.addClue = function (clue) {
    this.clues.push({ clue: clue, timestamp: Date.now() });
    return { success: true, clueCount: this.clues.length };
  };

  RiddleChamber.prototype.useHint = function () {
    if (this.clues.length === 0) return { error: 'no_clues' };
    if (this.solved) return { error: 'already_solved' };
    this.hintsUsed++;
    var hintData = this.clues.shift();
    return { success: true, hint: hintData.clue, hintsUsed: this.hintsUsed };
  };

  RiddleChamber.prototype.getAttempts = function () { return this.attempts; };
  RiddleChamber.prototype.isSolved = function () { return this.solved; };

  // -----------------------------------------------------------------------
  // RiddleTower: The tower containing multiple chambers
  // -----------------------------------------------------------------------
  function RiddleTower(towerId, name, maxFloors) {
    this.towerId = towerId;
    this.name = name || 'Riddle Tower';
    this.maxFloors = maxFloors || 10;
    this.currentFloor = 0;
    this.chambers = {}; // floor -> RiddleChamber
    this.solvedFloors = [];
    this.totalGold = 0;
    this.totalXp = 0;
    this.chamberCounter = 0;
  }

  RiddleTower.prototype.addChamber = function (floor, chamber) {
    if (floor > this.maxFloors) return { error: 'floor_exceeded' };
    this.chambers[floor] = chamber;
    return { success: true };
  };

  RiddleTower.prototype.enterFloor = function (floor) {
    if (floor > this.currentFloor + 1) return { error: 'floor_locked' };
    if (!this.chambers[floor]) return { error: 'chamber_not_found' };
    if (this.solvedFloors.indexOf(floor) !== -1) return { error: 'already_solved' };
    if (this.currentFloor < floor) this.currentFloor = floor;
    return { success: true, floor: floor };
  };

  RiddleTower.prototype.solveCurrentFloor = function (guess) {
    var chamber = this.chambers[this.currentFloor];
    if (!chamber) return { error: 'no_chamber' };
    var r = chamber.attempt(guess);
    if (r.solved) {
      this.solvedFloors.push(this.currentFloor);
      this.totalGold += r.rewards.gold;
      this.totalXp += r.rewards.xp;
    }
    return r;
  };

  RiddleTower.prototype.getCurrentFloor = function () { return this.currentFloor; };
  RiddleTower.prototype.getTotalGold = function () { return this.totalGold; };
  RiddleTower.prototype.getTotalXp = function () { return this.totalXp; };
  RiddleTower.prototype.getSolvedCount = function () { return this.solvedFloors.length; };

  // -----------------------------------------------------------------------
  // RiddleMaster: Master record of all riddle attempts
  // -----------------------------------------------------------------------
  function RiddleMaster(masterId, name) {
    this.masterId = masterId || ('master_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Riddle Master';
    this.towers = {};
    this.totalSolved = 0;
    this.totalAttempts = 0;
    this.masterXp = 0;
  }

  RiddleMaster.prototype.addTower = function (tower) {
    this.towers[tower.towerId] = tower;
    return { success: true, count: Object.keys(this.towers).length };
  };

  RiddleMaster.prototype.recordSolve = function (towerId, guess) {
    var tower = this.towers[towerId];
    if (!tower) return { error: 'tower_not_found' };
    var r = tower.solveCurrentFloor(guess);
    if (r.solved) {
      this.totalSolved++;
      this.totalAttempts += tower.chambers[tower.currentFloor].getAttempts();
      this.masterXp += r.rewards.xp;
    }
    return r;
  };

  RiddleMaster.prototype.getStats = function () {
    return {
      totalSolved: this.totalSolved,
      totalAttempts: this.totalAttempts,
      masterXp: this.masterXp
    };
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.RiddleChamber = RiddleChamber;
  window.RiddleTower = RiddleTower;
  window.RiddleMaster = RiddleMaster;
})();