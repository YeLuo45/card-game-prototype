// ============================================================================
// Bot Swarm Arena — V270 Direction B Iteration 7/9
// BotTournament: 锦标赛 (单淘汰/双淘汰/循环赛/对阵生成)
// 来源：nanobot mesh + generic-agent L0-L4 + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var FORMAT = {
    SINGLE_ELIM: 'single_elim',
    DOUBLE_ELIM: 'double_elim',
    ROUND_ROBIN: 'round_robin'
  };

  var STATUS = {
    PENDING: 'pending',
    ACTIVE: 'active',
    COMPLETED: 'completed'
  };

  function BotTournament(options) {
    options = options || {};
    this.id = options.id || ('t_' + Date.now());
    this.name = options.name || 'Tournament';
    this.format = options.format || FORMAT.SINGLE_ELIM;
    this.maxParticipants = options.maxParticipants || 64;
    this.participants = [];
    this.matches = [];
    this.rounds = [];
    this.currentRound = 0;
    this.status = STATUS.PENDING;
    this.winner = null;
    this.createdAt = Date.now();
    this.matchmaker = options.matchmaker || null;  // optional
  }

  // ---- Registration ----
  BotTournament.prototype.register = function (participant) {
    if (!participant || !participant.id) return { error: 'invalid_participant' };
    if (this.participants.length >= this.maxParticipants) return { error: 'tournament_full' };
    if (this.status !== STATUS.PENDING) return { error: 'tournament_started' };
    for (var i = 0; i < this.participants.length; i++) {
      if (this.participants[i].id === participant.id) return { error: 'already_registered' };
    }
    this.participants.push({
      id: participant.id,
      name: participant.name || participant.id,
      seed: participant.seed || (this.participants.length + 1),
      rating: participant.rating || 1000,
      losses: 0,
      eliminated: false
    });
    return { success: true, participantCount: this.participants.length };
  };

  BotTournament.prototype.deregister = function (participantId) {
    if (this.status !== STATUS.PENDING) return { error: 'tournament_started' };
    for (var i = 0; i < this.participants.length; i++) {
      if (this.participants[i].id === participantId) {
        this.participants.splice(i, 1);
        return { success: true };
      }
    }
    return { error: 'not_found' };
  };

  BotTournament.prototype.listParticipants = function () {
    return this.participants.slice();
  };

  BotTournament.prototype.participantCount = function () {
    return this.participants.length;
  };

  // ---- Start ----
  BotTournament.prototype.start = function () {
    if (this.participants.length < 2) return { error: 'not_enough_participants' };
    if (this.status !== STATUS.PENDING) return { error: 'already_started' };
    this.status = STATUS.ACTIVE;
    if (this.format === FORMAT.SINGLE_ELIM) {
      return this._generateSingleElim();
    } else if (this.format === FORMAT.DOUBLE_ELIM) {
      return this._generateDoubleElim();
    } else if (this.format === FORMAT.ROUND_ROBIN) {
      return this._generateRoundRobin();
    }
    return { error: 'invalid_format' };
  };

  // ---- Single Elimination ----
  BotTournament.prototype._generateSingleElim = function () {
    // Seed and create first round
    var seeded = this.participants.slice().sort(function (a, b) { return a.seed - b.seed; });
    var n = seeded.length;
    // next power of 2
    var byes = this._nextPow2(n) - n;
    var bracketSize = n + byes;
    var matches = [];
    var firstRound = [];
    for (var i = 0; i < bracketSize / 2; i++) {
      var p1 = seeded[i] || null;
      var p2 = seeded[bracketSize - 1 - i] || null;
      var match = {
        matchId: 'm_r1_' + i,
        round: 1,
        p1: p1 ? p1.id : null,
        p2: p2 ? p2.id : null,
        winner: null,
        loser: null,
        status: STATUS.PENDING
      };
      firstRound.push(match);
      matches.push(match);
    }
    this.matches = matches;
    this.rounds = [firstRound];
    this.currentRound = 1;
    // handle byes
    for (var j = 0; j < firstRound.length; j++) {
      var m = firstRound[j];
      if (m.p1 && !m.p2) { this._recordResult(m.matchId, m.p1); }
      else if (!m.p1 && m.p2) { this._recordResult(m.matchId, m.p2); }
    }
    return { success: true, format: 'single_elim', firstRound: firstRound.length, totalRounds: this._log2(bracketSize) };
  };

  // ---- Double Elimination ----
  BotTournament.prototype._generateDoubleElim = function () {
    // Start with single elim, losers go to losers bracket
    var r = this._generateSingleElim();
    if (r.error) return r;
    // Add losers bracket (simplified: each round of losers)
    var totalRounds = this._log2(this._nextPow2(this.participants.length));
    for (var i = 1; i < totalRounds; i++) {
      this.rounds.push([]);  // placeholder for losers bracket round
    }
    return { success: true, format: 'double_elim', firstRound: r.firstRound };
  };

  // ---- Round Robin ----
  BotTournament.prototype._generateRoundRobin = function () {
    var n = this.participants.length;
    var matches = [];
    var roundIdx = 0;
    // circle method
    var arr = this.participants.slice();
    if (arr.length % 2 === 1) arr.push({ id: 'BYE' });
    var n2 = arr.length;
    var rounds = n2 - 1;
    var perRound = n2 / 2;
    var working = arr.slice();
    for (var r = 0; r < rounds; r++) {
      var round = [];
      for (var i = 0; i < perRound; i++) {
        var p1 = working[i];
        var p2 = working[n2 - 1 - i];
        if (p1.id !== 'BYE' && p2.id !== 'BYE') {
          var match = {
            matchId: 'm_rr_r' + r + '_' + i,
            round: r + 1,
            p1: p1.id,
            p2: p2.id,
            winner: null,
            loser: null,
            status: STATUS.PENDING
          };
          matches.push(match);
          round.push(match);
        }
      }
      this.rounds.push(round);
      // rotate
      var fixed = working[0];
      var rest = working.slice(1);
      rest.unshift(rest.pop());
      working = [fixed].concat(rest);
      roundIdx++;
    }
    this.matches = matches;
    this.currentRound = 1;
    this._rrStandings = {};
    for (var p = 0; p < this.participants.length; p++) {
      this._rrStandings[this.participants[p].id] = { wins: 0, losses: 0, draws: 0, points: 0 };
    }
    return { success: true, format: 'round_robin', rounds: rounds, matches: matches.length };
  };

  // ---- Match result ----
  BotTournament.prototype._recordResult = function (matchId, winnerId) {
    var m = null;
    for (var i = 0; i < this.matches.length; i++) {
      if (this.matches[i].matchId === matchId) { m = this.matches[i]; break; }
    }
    if (!m) return { error: 'match_not_found' };
    if (m.status === STATUS.COMPLETED) return { error: 'already_completed' };
    var loserId = m.p1 === winnerId ? m.p2 : m.p1;
    m.winner = winnerId;
    m.loser = loserId;
    m.status = STATUS.COMPLETED;
    if (this.format === FORMAT.ROUND_ROBIN) {
      if (this._rrStandings[winnerId]) this._rrStandings[winnerId].wins++;
      if (this._rrStandings[loserId]) this._rrStandings[loserId].losses++;
    } else {
      // increment losses
      var p = this._getParticipant(loserId);
      if (p) p.losses++;
      if (this.format === FORMAT.SINGLE_ELIM) {
        if (p) p.eliminated = true;
      } else if (this.format === FORMAT.DOUBLE_ELIM) {
        if (p && p.losses >= 2) p.eliminated = true;
      }
    }
    return { success: true, match: m };
  };

  BotTournament.prototype.reportResult = function (matchId, result) {
    if (!result) return { error: 'invalid_result' };
    if (result.winner) return this._recordResult(matchId, result.winner);
    if (result.draw && this.format === FORMAT.ROUND_ROBIN) {
      var m = this._findMatch(matchId);
      if (!m) return { error: 'match_not_found' };
      m.status = STATUS.COMPLETED;
      m.draw = true;
      if (this._rrStandings[m.p1]) this._rrStandings[m.p1].draws++;
      if (this._rrStandings[m.p2]) this._rrStandings[m.p2].draws++;
      return { success: true, match: m };
    }
    return { error: 'invalid_result' };
  };

  BotTournament.prototype._findMatch = function (matchId) {
    for (var i = 0; i < this.matches.length; i++) {
      if (this.matches[i].matchId === matchId) return this.matches[i];
    }
    return null;
  };

  // ---- Advance round ----
  BotTournament.prototype.advanceRound = function () {
    if (this.format === FORMAT.ROUND_ROBIN) {
      // compute standings
      this._computeRRStandings();
      this.winner = this._getRRWinner();
      this.status = STATUS.COMPLETED;
      return { success: true, winner: this.winner, standings: this._rrStandings };
    }
    // For single/double elim, check current round completion and generate next
    var currentRound = this.currentRound;
    var currentMatches = this.matches.filter(function (m) { return m.round === currentRound; });
    var allDone = currentMatches.every(function (m) { return m.status === STATUS.COMPLETED; });
    if (!allDone) return { error: 'current_round_incomplete' };
    // winners of current round
    var winners = currentMatches.map(function (m) { return m.winner; }).filter(function (w) { return w; });
    if (winners.length <= 1) {
      this.winner = winners[0] || null;
      this.status = STATUS.COMPLETED;
      return { success: true, winner: this.winner };
    }
    // generate next round
    var nextRound = currentRound + 1;
    var newMatches = [];
    for (var i = 0; i < winners.length; i += 2) {
      var m = {
        matchId: 'm_r' + nextRound + '_' + i,
        round: nextRound,
        p1: winners[i],
        p2: winners[i + 1] || null,
        winner: null,
        loser: null,
        status: STATUS.PENDING
      };
      if (!m.p2) {
        this._recordResult(m.matchId, m.p1);
      }
      newMatches.push(m);
      this.matches.push(m);
    }
    this.rounds.push(newMatches);
    this.currentRound = nextRound;
    return { success: true, nextRound: nextRound, newMatches: newMatches.length };
  };

  // ---- Round Robin standings ----
  BotTournament.prototype._computeRRStandings = function () {
    for (var k in this._rrStandings) {
      if (Object.prototype.hasOwnProperty.call(this._rrStandings, k)) {
        this._rrStandings[k].points = this._rrStandings[k].wins + (this._rrStandings[k].draws * 0.5);
      }
    }
  };

  BotTournament.prototype.getRRStandings = function () {
    var arr = [];
    for (var k in this._rrStandings) {
      if (Object.prototype.hasOwnProperty.call(this._rrStandings, k)) {
        arr.push({ participantId: k, ...this._rrStandings[k] });
      }
    }
    arr.sort(function (a, b) { return b.points - a.points; });
    return arr;
  };

  BotTournament.prototype._getRRWinner = function () {
    var standings = this.getRRStandings();
    return standings.length > 0 ? standings[0].participantId : null;
  };

  BotTournament.prototype._getParticipant = function (id) {
    for (var i = 0; i < this.participants.length; i++) {
      if (this.participants[i].id === id) return this.participants[i];
    }
    return null;
  };

  // ---- Helpers ----
  BotTournament.prototype._nextPow2 = function (n) {
    var p = 1;
    while (p < n) p *= 2;
    return p;
  };

  BotTournament.prototype._log2 = function (n) {
    var l = 0;
    while (n > 1) { n = Math.floor(n / 2); l++; }
    return l;
  };

  // ---- Queries ----
  BotTournament.prototype.getMatch = function (matchId) {
    return this._findMatch(matchId);
  };

  BotTournament.prototype.getCurrentMatches = function () {
    return this.matches.filter(function (m) { return m.round === this.currentRound && m.status === STATUS.PENDING; }, this);
  };

  BotTournament.prototype.getRound = function (round) {
    return this.matches.filter(function (m) { return m.round === (round || this.currentRound); }, this);
  };

  BotTournament.prototype.getWinner = function () {
    return this.winner;
  };

  BotTournament.prototype.getStatus = function () {
    return this.status;
  };

  BotTournament.prototype.getProgress = function () {
    var total = this.matches.length;
    var completed = this.matches.filter(function (m) { return m.status === STATUS.COMPLETED; }).length;
    return { total: total, completed: completed, percent: total > 0 ? (completed / total) : 0 };
  };

  BotTournament.prototype.getSummary = function () {
    return {
      id: this.id,
      name: this.name,
      format: this.format,
      status: this.status,
      currentRound: this.currentRound,
      totalRounds: this.rounds.length,
      participants: this.participants.length,
      matches: this.matches.length,
      winner: this.winner
    };
  };

  BotTournament.prototype.exportBracket = function () {
    return JSON.stringify({
      id: this.id,
      format: this.format,
      status: this.status,
      participants: this.participants,
      matches: this.matches,
      rounds: this.rounds.length,
      winner: this.winner,
      exportedAt: Date.now()
    });
  };

  if (typeof window !== 'undefined') {
    window.BotTournament = BotTournament;
    window.TOURNAMENT_FORMAT = FORMAT;
    window.TOURNAMENT_STATUS = STATUS;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BotTournament: BotTournament, TOURNAMENT_FORMAT: FORMAT, TOURNAMENT_STATUS: STATUS };
  }
})();
