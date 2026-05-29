// ============================================================================
// Card Arena Ladder — V178 Direction C
// Competitive arena ladder with ranking, matchmaking and seasonal rewards
// thunderbolt pipeline + generic-agent autonomous goal pursuit
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // LadderSeason: A ranked season with MMR and rankings
  // ========================================================================
  function LadderSeason(seasonId, name, startTime, endTime) {
    this.seasonId = seasonId || ('season_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Season ' + this.seasonId;
    this.startTime = startTime || Date.now();
    this.endTime = endTime || (this.startTime + 30 * 24 * 60 * 60 * 1000); // 30 days
    this.players = {}; // playerId -> { mmr, rank, wins, losses, streak }
    this.matches = []; // array of match records
    this.status = 'active'; // active, completed, upcoming
    this.topRank = 0;
  }

  LadderSeason.prototype.getPlayerMMR = function (playerId) {
    return this.players[playerId] ? this.players[playerId].mmr : 1000;
  };

  LadderSeason.prototype.getPlayerRank = function (playerId) {
    return this.players[playerId] ? this.players[playerId].rank : null;
  };

  LadderSeason.prototype.registerPlayer = function (playerId) {
    if (this.players[playerId]) return { error: 'already_registered' };
    this.players[playerId] = { mmr: 1000, rank: null, wins: 0, losses: 0, streak: 0 };
    this._recalculateRanks();
    return { success: true, mmr: 1000 };
  };

  LadderSeason.prototype.recordMatch = function (playerId, opponentId, playerWon, mmrDelta) {
    if (!this.players[playerId]) return { error: 'player_not_found' };
    var p = this.players[playerId];
    var delta = mmrDelta || 25;
    if (playerWon) {
      p.mmr += delta;
      p.wins++;
      p.streak = p.streak > 0 ? p.streak + 1 : 1;
    } else {
      p.mmr = Math.max(100, p.mmr - delta);
      p.losses++;
      p.streak = p.streak < 0 ? p.streak - 1 : -1;
    }
    this.matches.push({
      playerId: playerId,
      opponentId: opponentId,
      playerWon: playerWon,
      mmrDelta: playerWon ? delta : -delta,
      timestamp: Date.now()
    });
    this._recalculateRanks();
    return { success: true, newMMR: p.mmr, newStreak: p.streak };
  };

  LadderSeason.prototype._recalculateRanks = function () {
    var sorted = Object.keys(this.players).sort(function (a, b) {
      return this.players[b].mmr - this.players[a].mmr;
    }.bind(this));
    for (var i = 0; i < sorted.length; i++) {
      this.players[sorted[i]].rank = i + 1;
      if (i === 0) this.topRank = sorted[i];
    }
  };

  LadderSeason.prototype.getTopPlayers = function (count) {
    var sorted = Object.keys(this.players).sort(function (a, b) {
      return this.players[b].mmr - this.players[a].mmr;
    }.bind(this));
    return sorted.slice(0, count || 10).map(function (pid) {
      var p = this.players[pid];
      p.playerId = pid;
      return p;
    }.bind(this));
  };

  LadderSeason.prototype.isActive = function () {
    return this.status === 'active' && Date.now() < this.endTime;
  };

  // --------------------------------------------------------------------===
  // ArenaLadder: Manages ladder seasons and rankings
  // ========================================================================
  function ArenaLadder(storageKey) {
    this.storageKey = storageKey || 'arena_ladder';
    this._currentSeason = null;
    this._pastSeasons = [];
    this._seasonIdCounter = 0;
    this._init();
  }

  ArenaLadder.prototype._init = function () {
    this._load();
    if (!this._currentSeason || !this._currentSeason.isActive()) {
      this.startNewSeason();
    }
  };

  ArenaLadder.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          if (data.currentSeason) {
            this._currentSeason = new LadderSeason(data.currentSeason.seasonId, data.currentSeason.name,
              data.currentSeason.startTime, data.currentSeason.endTime);
            this._currentSeason.players = data.currentSeason.players || {};
            this._currentSeason.status = data.currentSeason.status || 'active';
          }
          this._pastSeasons = data.pastSeasons || [];
          this._seasonIdCounter = data.seasonIdCounter || 0;
        }
      }
    } catch (e) {}
  };

  ArenaLadder.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          currentSeason: this._currentSeason,
          pastSeasons: this._pastSeasons,
          seasonIdCounter: this._seasonIdCounter
        }));
      }
    } catch (e) {}
  };

  ArenaLadder.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[ArenaLadder] ' + msg);
    }
  };

  ArenaLadder.prototype.startNewSeason = function (name) {
    if (this._currentSeason && this._currentSeason.status === 'active') {
      this._currentSeason.status = 'completed';
      this._pastSeasons.push(this._currentSeason);
    }
    var seasonId = 'season_' + (++this._seasonIdCounter);
    this._currentSeason = new LadderSeason(seasonId, name || ('Season ' + this._seasonIdCounter));
    this._save();
    return { success: true, seasonId: seasonId };
  };

  ArenaLadder.prototype.getCurrentSeason = function () {
    return this._currentSeason;
  };

  ArenaLadder.prototype.registerPlayer = function (playerId) {
    if (!this._currentSeason) return { error: 'no_active_season' };
    return this._currentSeason.registerPlayer(playerId);
  };

  ArenaLadder.prototype.recordMatch = function (playerId, opponentId, playerWon, mmrDelta) {
    if (!this._currentSeason) return { error: 'no_active_season' };
    return this._currentSeason.recordMatch(playerId, opponentId, playerWon, mmrDelta);
  };

  ArenaLadder.prototype.getPlayerMMR = function (playerId) {
    if (!this._currentSeason) return 1000;
    return this._currentSeason.getPlayerMMR(playerId);
  };

  ArenaLadder.prototype.getPlayerRank = function (playerId) {
    if (!this._currentSeason) return null;
    return this._currentSeason.getPlayerRank(playerId);
  };

  ArenaLadder.prototype.getTopPlayers = function (count) {
    if (!this._currentSeason) return [];
    return this._currentSeason.getTopPlayers(count);
  };

  ArenaLadder.prototype.getPastSeasons = function () {
    return this._pastSeasons.slice();
  };

  // --------------------------------------------------------------------===
  // Exports
  // ----------------------------------------------------------------=======
  window.LadderSeason = LadderSeason;
  window.ArenaLadder = ArenaLadder;
})();