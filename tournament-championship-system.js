// ============================================================================
// Card Tournament Championship System — V117 Direction K
// ============================================================================
// Championship mode: multi-stage tournaments with brackets, seeding,
// prize distribution. Integrates: chatdev multi-agent bracket simulation
// + nanobot tool registry + thunderbolt offline-first.
// ============================================================================

'use strict';

class TournamentConfig {
  constructor(configId, name, options = {}) {
    this.configId = configId;
    this.name = name;
    this.maxPlayers = options.maxPlayers || 16;
    this.stages = options.stages || ['group', 'quarter', 'semi', 'final'];
    this.prizePool = options.prizePool || { gold: 1000, xp: 500 };
    this.entryFee = options.entryFee || { gold: 100 };
    this.bestOfRounds = options.bestOfRounds || 3;
    this.doubleElim = options.doubleElim || false;
  }
}

class TournamentRegistration {
  constructor(playerId, deckId, registeredAt) {
    this.playerId = playerId;
    this.deckId = deckId;
    this.registeredAt = registeredAt;
    this.seed = null;
    this.eliminated = false;
    this.finalRank = null;
  }
}

class Match {
  constructor(matchId, round, player1Id, player2Id) {
    this.matchId = matchId;
    this.round = round;
    this.player1Id = player1Id;
    this.player2Id = player2Id;
    this.score1 = 0;
    this.score2 = 0;
    this.winner = null;
    this.bestOf = 3;
    this.status = 'pending'; // pending | in_progress | completed
    this.scheduledAt = null;
  }
}

class Stage {
  constructor(stageId, name, order) {
    this.stageId = stageId;
    this.name = name;
    this.order = order;
    this.matches = [];
    this.status = 'upcoming'; // upcoming | active | completed
  }

  addMatch(m) { this.matches.push(m); }
  getMatch(matchId) { return this.matches.find(m => m.matchId === matchId) || null; }
  getPendingMatches() { return this.matches.filter(m => m.status === 'pending'); }
}

class Tournament {
  constructor(tournamentId, config) {
    this.tournamentId = tournamentId;
    this.config = config; // TournamentConfig
    this.registrations = []; // TournamentRegistration[]
    this.stages = []; // Stage[]
    this.status = 'draft'; // draft | registration | in_progress | completed
    this.createdAt = Date.now();
    this.startedAt = null;
    this.completedAt = null;
    this.winnerId = null;
    this.hooks = [];
  }

  openRegistration() {
    if (this.status !== 'draft') return { error: 'must_be_draft' };
    this.status = 'registration';
    return { success: true };
  }

  register(playerId, deckId) {
    if (this.status !== 'registration') return { error: 'not_open_for_registration' };
    if (this.registrations.some(r => r.playerId === playerId)) return { error: 'already_registered' };
    if (this.registrations.length >= this.config.maxPlayers) return { error: 'full' };
    const reg = new TournamentRegistration(playerId, deckId, Date.now());
    this.registrations.push(reg);
    return reg;
  }

  start() {
    if (this.status !== 'registration') return { error: 'must_be_in_registration' };
    if (this.registrations.length < 2) return { error: 'not_enough_players' };
    this.status = 'in_progress';
    this.startedAt = Date.now();
    this._buildBracket();
    if (this._emit) this._emit('started', { tournamentId: this.tournamentId, playerCount: this.registrations.length });
    return { success: true };
  }

  _buildBracket() {
    // Shuffle and seed
    const regs = [...this.registrations].sort(() => Math.random() - 0.5);
    regs.forEach((r, i) => { r.seed = i + 1; });

    // Build stages
    this.stages = [];
    const stages = this.config.stages;
    for (let i = 0; i < stages.length; i++) {
      const stageName = stages[i];
      const stage = new Stage(`${this.tournamentId}_${stageName}`, stageName, i);

      if (i === 0) {
        // Group stage: each player plays multiple matches
        // For simplicity, split into groups of 4, round-robin
        const groupSize = 4;
        let matchId = 1;
        for (let g = 0; g < Math.ceil(regs.length / groupSize); g++) {
          const group = regs.slice(g * groupSize, (g + 1) * groupSize);
          if (group.length < 2) continue;
          // Round robin within group
          for (let a = 0; a < group.length; a++) {
            for (let b = a + 1; b < group.length; b++) {
              const m = new Match(`${this.tournamentId}_G${g+1}_M${matchId++}`, stageName, group[a].playerId, group[b].playerId);
              m.bestOf = 1;
              stage.addMatch(m);
            }
          }
        }
      } else {
        // Single elimination bracket
        const prevStage = this.stages[i - 1];
        const qualifiers = prevStage.matches.filter(m => m.status === 'completed')
          .sort((a, b) => {
            // Sort by winner then by seed
            const aWon = a.winner === a.player1Id ? a.player1Id : a.player2Id;
            const bWon = b.winner === b.player1Id ? b.player1Id : b.player2Id;
            return 0;
          }).map(m => m.winner);

        const pairings = [];
        for (let j = 0; j + 1 < qualifiers.length; j += 2) {
          const m = new Match(`${this.tournamentId}_${stageName}_M${j/2+1}`, stageName, qualifiers[j], qualifiers[j + 1]);
          stage.addMatch(m);
        }
      }

      this.stages.push(stage);
    }
  }

  recordMatchResult(matchId, winnerId, score1, score2) {
    // Find match across all stages
    let found = null;
    for (const stage of this.stages) {
      const m = stage.getMatch(matchId);
      if (m) { found = m; break; }
    }
    if (!found) return { error: 'match_not_found' };
    if (found.status === 'completed') return { error: 'already_completed' };
    if (![found.player1Id, found.player2Id].includes(winnerId)) return { error: 'invalid_winner' };

    found.winner = winnerId;
    found.score1 = score1;
    found.score2 = score2;
    found.status = 'completed';

    if (this._emit) this._emit('match_completed', { matchId, winner: winnerId, tournamentId: this.tournamentId });
    return { success: true };
  }

  getStage(stageName) { return this.stages.find(s => s.name === stageName) || null; }

  complete() {
    if (this.status !== 'in_progress') return { error: 'not_in_progress' };
    this.status = 'completed';
    this.completedAt = Date.now();
    if (this.registrations.length > 0) {
      const winners = this.registrations.filter(r => r.seed === 1);
      if (winners.length > 0) this.winnerId = winners[0].playerId;
    }
    if (this._emit) this._emit('completed', { tournamentId: this.tournamentId, winnerId: this.winnerId });
    return { success: true };
  }

  getBracket() {
    return this.stages.map(stage => ({
      stageName: stage.name,
      status: stage.status,
      matches: stage.matches.map(m => ({
        matchId: m.matchId,
        player1: m.player1Id,
        player2: m.player2Id,
        score1: m.score1,
        score2: m.score2,
        winner: m.winner,
        status: m.status
      }))
    }));
  }
}

class TournamentManager {
  constructor() {
    this.tournaments = new Map(); // tournamentId → Tournament
    this.configs = new Map(); // configId → TournamentConfig
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('tournament_championship') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const [tid, tdata] of Object.entries(data.tournaments || {})) {
          const cfg = this.configs.get(tdata.configId) || new TournamentConfig(tdata.configId, tid);
          const t = new Tournament(tid, cfg);
          t.status = tdata.status || 'draft';
          t.createdAt = tdata.createdAt || Date.now();
          t.startedAt = tdata.startedAt || null;
          t.completedAt = tdata.completedAt || null;
          t.winnerId = tdata.winnerId || null;
          // Reconstruct registrations
          t.registrations = (tdata.registrations || []).map(r =>
            Object.assign(new TournamentRegistration(r.playerId, r.deckId, r.registeredAt), { seed: r.seed, eliminated: r.eliminated, finalRank: r.finalRank })
          );
          // Reconstruct stages
          for (const sdata of (tdata.stages || [])) {
            const s = new Stage(sdata.stageId, sdata.name, sdata.order);
            s.status = sdata.status || 'upcoming';
            s.matches = (sdata.matches || []).map(m =>
              Object.assign(new Match(m.matchId, sdata.name, m.player1Id, m.player2Id), { score1: m.score1 || 0, score2: m.score2 || 0, winner: m.winner || null, status: m.status || 'pending' })
            );
            t.stages.push(s);
          }
          this.tournaments.set(tid, t);
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        tournaments: Object.fromEntries(Array.from(this.tournaments.entries()).map(([k, v]) => [k, {
          configId: v.config.configId, status: v.status, createdAt: v.createdAt,
          startedAt: v.startedAt, completedAt: v.completedAt, winnerId: v.winnerId,
          registrations: v.registrations.map(r => ({ playerId: r.playerId, deckId: r.deckId, registeredAt: r.registeredAt, seed: r.seed, eliminated: r.eliminated, finalRank: r.finalRank })),
          stages: v.stages.map(s => ({
            stageId: s.stageId, name: s.name, order: s.order, status: s.status,
            matches: s.matches.map(m => ({ matchId: m.matchId, player1Id: m.player1Id, player2Id: m.player2Id, score1: m.score1, score2: m.score2, winner: m.winner, status: m.status }))
          }))
        }]))
      };
      localStorage.setItem('tournament_championship', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  createConfig(configId, name, options = {}) {
    if (this.configs.has(configId)) return { error: 'config_exists' };
    const cfg = new TournamentConfig(configId, name, options);
    this.configs.set(configId, cfg);
    return cfg;
  }

  createTournament(tournamentId, configId) {
    if (this.tournaments.has(tournamentId)) return { error: 'tournament_exists' };
    const cfg = this.configs.get(configId);
    if (!cfg) return { error: 'config_not_found' };
    const t = new Tournament(tournamentId, cfg);
    this.tournaments.set(tournamentId, t);
    this._save();
    return t;
  }

  getTournament(tournamentId) {
    return this.tournaments.get(tournamentId) || null;
  }

  register(tournamentId, playerId, deckId) {
    const t = this.tournaments.get(tournamentId);
    if (!t) return { error: 'tournament_not_found' };
    return t.register(playerId, deckId);
  }

  start(tournamentId) {
    const t = this.tournaments.get(tournamentId);
    if (!t) return { error: 'tournament_not_found' };
    const result = t.start();
    if (result.success) this._save();
    return result;
  }

  recordResult(tournamentId, matchId, winnerId, score1, score2) {
    const t = this.tournaments.get(tournamentId);
    if (!t) return { error: 'tournament_not_found' };
    const result = t.recordMatchResult(matchId, winnerId, score1, score2);
    if (result.success) this._save();
    return result;
  }

  getStats() {
    let active = 0, completed = 0;
    for (const t of this.tournaments.values()) {
      if (t.status === 'in_progress') active++;
      else if (t.status === 'completed') completed++;
    }
    return {
      totalTournaments: this.tournaments.size,
      activeTournaments: active,
      completedTournaments: completed,
      totalRegistrations: Array.from(this.tournaments.values()).reduce((sum, t) => sum + t.registrations.length, 0)
    };
  }
}

const TournamentTools = {
  'tournament.create_config': {
    description: 'Create tournament config',
    parameters: { type: 'object', properties: { configId: { type: 'string' }, name: { type: 'string' }, options: { type: 'object' } }, required: ['configId', 'name'] },
    handler(args) {
      if (!window._tournamentMgr) window._tournamentMgr = new TournamentManager();
      return window._tournamentMgr.createConfig(args.configId, args.name, args.options || {});
    }
  },
  'tournament.create': {
    description: 'Create tournament',
    parameters: { type: 'object', properties: { tournamentId: { type: 'string' }, configId: { type: 'string' } }, required: ['tournamentId', 'configId'] },
    handler(args) {
      if (!window._tournamentMgr) window._tournamentMgr = new TournamentManager();
      return window._tournamentMgr.createTournament(args.tournamentId, args.configId) || { error: 'failed' };
    }
  },
  'tournament.register': {
    description: 'Register player in tournament',
    parameters: { type: 'object', properties: { tournamentId: { type: 'string' }, playerId: { type: 'string' }, deckId: { type: 'string' } }, required: ['tournamentId', 'playerId', 'deckId'] },
    handler(args) {
      if (!window._tournamentMgr) return { error: 'system_not_initialized' };
      const mgr = window._tournamentMgr;
      const t = mgr.getTournament(args.tournamentId);
      if (!t) return { error: 'tournament_not_found' };
      if (t.status === 'draft') {
        const openResult = t.openRegistration();
        if (!openResult.success) return openResult;
      }
      return mgr.register(args.tournamentId, args.playerId, args.deckId);
    }
  },
  'tournament.start': {
    description: 'Start tournament',
    parameters: { type: 'object', properties: { tournamentId: { type: 'string' } }, required: ['tournamentId'] },
    handler(args) {
      if (!window._tournamentMgr) return { error: 'system_not_initialized' };
      return window._tournamentMgr.start(args.tournamentId);
    }
  },
  'tournament.record_result': {
    description: 'Record match result',
    parameters: { type: 'object', properties: { tournamentId: { type: 'string' }, matchId: { type: 'string' }, winnerId: { type: 'string' }, score1: { type: 'number' }, score2: { type: 'number' } }, required: ['tournamentId', 'matchId', 'winnerId', 'score1', 'score2'] },
    handler(args) {
      if (!window._tournamentMgr) return { error: 'system_not_initialized' };
      return window._tournamentMgr.recordResult(args.tournamentId, args.matchId, args.winnerId, args.score1, args.score2);
    }
  },
  'tournament.bracket': {
    description: 'Get tournament bracket',
    parameters: { type: 'object', properties: { tournamentId: { type: 'string' } }, required: ['tournamentId'] },
    handler(args) {
      if (!window._tournamentMgr) return { error: 'system_not_initialized' };
      const t = window._tournamentMgr.getTournament(args.tournamentId);
      return t ? t.getBracket() : { error: 'tournament_not_found' };
    }
  },
  'tournament.stats': {
    description: 'Get tournament stats',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._tournamentMgr) window._tournamentMgr = new TournamentManager();
      return window._tournamentMgr.getStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TournamentConfig, TournamentRegistration, Match, Stage, Tournament, TournamentManager, TournamentTools };
}
if (typeof window !== 'undefined') {
  window.TournamentConfig = TournamentConfig;
  window.TournamentRegistration = TournamentRegistration;
  window.Match = Match;
  window.Stage = Stage;
  window.Tournament = Tournament;
  window.TournamentManager = TournamentManager;
  window.TournamentTools = TournamentTools;
}