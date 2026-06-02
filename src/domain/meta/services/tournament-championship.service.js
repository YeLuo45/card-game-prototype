// ============================================================================
// Card Tournament Championship — V142 Direction D
// Competitive tournament system with Swiss bracket + elimination rounds
// chatdev multi-agent coordination + thunderbolt offline-first + nanobot tool registry
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // TournamentState: Persistent tournament state
  // -----------------------------------------------------------------------
  function TournamentState(storageKey) {
    this.storageKey = storageKey || 'tournament_state';
    this._data = null;
    this._load();
  }

  TournamentState.prototype._load = function () {
    this._data = { phase: 'none', rounds: [], participants: [], matches: {}, champion: null };
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) this._data = JSON.parse(raw);
      }
    } catch (e) {}
  };

  TournamentState.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify(this._data));
      }
    } catch (e) {}
  };

  TournamentState.prototype.get = function () { return this._data; };
  TournamentState.prototype.set = function (d) { this._data = d; this._save(); };

  // -----------------------------------------------------------------------
  // Match: Single match between two players
  // -----------------------------------------------------------------------
  function Match(id, p1, p2, round, stage) {
    this.id = id;
    this.player1 = p1;
    this.player2 = p2;
    this.round = round;
    this.stage = stage; // 'swiss' | 'quarter' | 'semi' | 'final'
    this.score1 = 0;
    this.score2 = 0;
    this.winner = null;
    this.status = 'pending'; // pending | active | completed
    this.timestamp = null;
  }

  Match.prototype.start = function () { this.status = 'active'; this.timestamp = Date.now(); };
  Match.prototype.finish = function (winner) {
    this.status = 'completed';
    this.winner = winner;
  };

  // -----------------------------------------------------------------------
  // SwissPairing: Swiss tournament pairing algorithm
  // -----------------------------------------------------------------------
  function SwissPairing() {}

  SwissPairing.prototype.pair = function (participants, round) {
    // Sort by wins descending, then by seed
    var sorted = participants.slice().sort(function (a, b) {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return (a.seed || 0) - (b.seed || 0);
    });

    var pairs = [];
    var used = {};
    for (var i = 0; i < sorted.length; i++) {
      if (used[sorted[i].id]) continue;
      for (var j = i + 1; j < sorted.length; j++) {
        if (used[sorted[j].id]) continue;
        // Don't pair same players
        if (sorted[i].id === sorted[j].id) continue;
        // Check not already played
        var alreadyPlayed = sorted[i].history && sorted[i].history.indexOf(sorted[j].id) >= 0;
        if (alreadyPlayed) continue;

        pairs.push({ p1: sorted[i], p2: sorted[j], table: pairs.length + 1 });
        used[sorted[i].id] = true;
        used[sorted[j].id] = true;
        break;
      }
    }
    return pairs;
  };

  // -----------------------------------------------------------------------
  // TournamentEngine: Core tournament logic
  // -----------------------------------------------------------------------
  function TournamentEngine() {
    this.state = new TournamentState('tournament_v2');
    this._init();
  }

  TournamentEngine.prototype._init = function () {
    var d = this.state.get();
    if (!d.phase) {
      d.phase = 'none';
      d.rounds = [];
      d.participants = [];
      d.matches = {};
      d.champion = null;
      this.state.set(d);
    }
  };

  TournamentEngine.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[Tournament] ' + msg);
    }
  };

  // Register new participant
  TournamentEngine.prototype.register = function (playerId, deck) {
    var d = this.state.get();
    if (d.phase !== 'registration') return { error: 'not_registration_phase' };
    if (d.participants.length >= 256) return { error: 'tournament_full' };

    var existing = d.participants.find(function (p) { return p.id === playerId; });
    if (existing) return { error: 'already_registered' };

    var player = {
      id: playerId,
      deck: deck,
      seed: d.participants.length + 1,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      history: []
    };
    d.participants.push(player);
    this.state.set(d);
    this._log('Registered: ' + playerId);
    return { success: true, seed: player.seed, totalParticipants: d.participants.length };
  };

  // Start tournament (switch to swiss phase)
  TournamentEngine.prototype.start = function () {
    var d = this.state.get();
    if (d.participants.length < 2) return { error: 'not_enough_participants', need: 2, have: d.participants.length };
    d.phase = 'swiss';
    d.currentRound = 0;
    d.rounds = [];
    this.state.set(d);
    this._log('Tournament started with ' + d.participants.length + ' players');
    return { success: true, phase: 'swiss', participants: d.participants.length };
  };

  // Generate next round
  TournamentEngine.prototype.generateRound = function () {
    var d = this.state.get();
    if (d.phase !== 'swiss' && d.phase !== 'elimination') return { error: 'invalid_phase' };

    var roundNum = d.currentRound || 0;
    var stage = roundNum < 3 ? 'swiss' : (roundNum === 3 ? 'quarter' : (roundNum === 4 ? 'semi' : 'final'));

    var activePlayers = d.participants.filter(function (p) { return p.wins >= roundNum && p.losses < 3; });

    if (activePlayers.length < 2) {
      // Move to elimination if swiss done
      if (d.phase === 'swiss' && roundNum >= 3) {
        d.phase = 'elimination';
        activePlayers = d.participants.filter(function (p) { return p.wins >= 3; });
        if (activePlayers.length < 2) return { error: 'not_enough_for_elimination' };
      } else {
        return { error: 'not_enough_players' };
      }
    }

    var pairing = new SwissPairing();
    var pairs = pairing.pair(activePlayers, roundNum);

    var matchId = 0;
    for (var i = 0; i < pairs.length; i++) {
      var match = new Match(matchId++, pairs[i].p1.id, pairs[i].p2.id, roundNum, stage);
      match.table = pairs[i].table;
      d.matches[match.id] = match;
    }

    d.rounds.push({ number: roundNum, stage: stage, matchIds: pairs.map(function (p) { return matchId - pairs.length + pairs.indexOf(p); }) });
    d.currentRound = roundNum + 1;
    this.state.set(d);
    this._log('Round ' + roundNum + ' (' + stage + ') generated with ' + pairs.length + ' matches');
    return { success: true, round: roundNum, stage: stage, matches: pairs.length };
  };

  // Submit match result
  TournamentEngine.prototype.submitResult = function (matchId, winnerId, score1, score2) {
    var d = this.state.get();
    var match = d.matches[matchId];
    if (!match) return { error: 'match_not_found' };
    if (match.status === 'completed') return { error: 'match_already_completed' };
    if (winnerId !== match.player1 && winnerId !== match.player2) return { error: 'invalid_winner' };

    match.score1 = score1 || 0;
    match.score2 = score2 || 0;
    match.finish(winnerId);
    match.status = 'completed';

    // Update participant records
    var p1 = d.participants.find(function (p) { return p.id === match.player1; });
    var p2 = d.participants.find(function (p) { return p.id === match.player2; });

    if (p1) {
      p1.history = p1.history || [];
      p1.history.push(p2.id);
      if (winnerId === p1.id) { p1.wins++; p1.points += 3; }
      else { p1.losses++; }
    }
    if (p2) {
      p2.history = p2.history || [];
      p2.history.push(p1.id);
      if (winnerId === p2.id) { p2.wins++; p2.points += 3; }
      else { p2.losses++; }
    }

    this.state.set(d);
    this._log('Match ' + matchId + ': ' + winnerId + ' won (' + match.score1 + '-' + match.score2 + ')');
    return { success: true, winner: winnerId };
  };

  // Get standings
  TournamentEngine.prototype.getStandings = function () {
    var d = this.state.get();
    return d.participants.slice().sort(function (a, b) {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return (a.seed || 0) - (b.seed || 0);
    });
  };

  // Get current round matches
  TournamentEngine.prototype.getRoundMatches = function (round) {
    var d = this.state.get();
    var matches = [];
    for (var id in d.matches) {
      var m = d.matches[id];
      if (m.round === round) matches.push(m);
    }
    return matches;
  };

  // Declare champion (when only one remains)
  TournamentEngine.prototype.declareChampion = function () {
    var d = this.state.get();
    var standings = this.getStandings();
    if (standings.length === 0) return { error: 'no_participants' };

    var top = standings[0];
    d.champion = top.id;
    d.phase = 'completed';
    this.state.set(d);
    this._log('Champion: ' + top.id);
    return { success: true, champion: top.id, points: top.points };
  };

  // Get tournament info
  TournamentEngine.prototype.getInfo = function () {
    var d = this.state.get();
    return {
      phase: d.phase,
      participants: d.participants.length,
      currentRound: d.currentRound || 0,
      roundsCompleted: d.rounds ? d.rounds.length : 0,
      champion: d.champion,
      totalMatches: Object.keys(d.matches).length,
      completedMatches: Object.keys(d.matches).filter(function (id) { return d.matches[id].status === 'completed'; }).length
    };
  };

  // Reset tournament
  TournamentEngine.prototype.reset = function () {
    this.state.set({ phase: 'none', rounds: [], participants: [], matches: {}, champion: null });
    this._log('Tournament reset');
    return { success: true };
  };

  // Open registration
  TournamentEngine.prototype.openRegistration = function () {
    var d = this.state.get();
    d.phase = 'registration';
    this.state.set(d);
    return { success: true, phase: 'registration' };
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.TournamentEngine = TournamentEngine;
  window.TournamentState = TournamentState;
  window.Match = Match;
  window.SwissPairing = SwissPairing;
})();