// ============================================================================
// Card Tournament System — V107 Direction A
// ============================================================================
// Multi-player card tournament with elimination/swiss brackets, ELO matchmaking.
// Integrates: chatdev multi-agent + nanobot tool registry + generic-agent L0-L4 memory.
// ============================================================================

'use strict';

// ---- chatdev: Role-based tournament entities ----
class Tournament {
  constructor(tournamentId, name, format, maxPlayers) {
    this.tournamentId = tournamentId || 't_' + Date.now();
    this.name = name;
    this.format = format; // 'elimination' | 'swiss' | 'round_robin'
    this.maxPlayers = maxPlayers;
    this.players = new Map(); // playerId → { rank, elo, wins, losses, draws }
    this.matches = [];
    this.currentRound = 0;
    this.status = 'draft'; // draft | registration | running | completed
    this.bracket = null;
    this.hooks = [];
    this.tournamentMemory = this._loadMemory();
  }

  // ---- thunderbolt: localStorage persistence ----
  _loadMemory() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(`tourney_mem_${this.tournamentId}`) : null;
      return raw ? JSON.parse(raw) : { l0_meta: { name: this.name, createdAt: Date.now() }, l1_insight_index: [], l2_match_records: [], l3_elo_history: [] };
    } catch { return { l0_meta: { name: this.name, createdAt: Date.now() }, l1_insight_index: [], l2_match_records: [], l3_elo_history: [] }; }
  }

  _saveMemory() {
    if (typeof localStorage !== 'undefined') localStorage.setItem(`tourney_mem_${this.tournamentId}`, JSON.stringify(this.tournamentMemory));
  }

  // ---- ruflo: hook system ----
  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  // ---- Registration ----
  registerPlayer(playerId, playerName) {
    if (this.status !== 'draft' && this.status !== 'registration') return { error: 'tournament_not_open' };
    if (this.players.has(playerId)) return { error: 'already_registered' };
    if (this.maxPlayers && this.players.size >= this.maxPlayers) return { error: 'tournament_full' };
    this.players.set(playerId, { playerName, rank: 0, elo: 1500, wins: 0, losses: 0, draws: 0, registeredAt: Date.now() });
    this._emit('player_registered', { playerId, playerName });
    return { success: true, playerCount: this.players.size };
  }

  // ---- ELO calculation (generic-agent self-evolution inspired) ----
  _calcElo(winnerElo, loserElo, k = 32) {
    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
    return {
      winnerNew: Math.round(winnerElo + k * (1 - expectedWinner)),
      loserNew: Math.round(loserElo + k * (0 - expectedLoser))
    };
  }

  // ---- Match management ----
  createMatch(player1Id, player2Id, round) {
    if (!this.players.has(player1Id) || !this.players.has(player2Id)) return { error: 'invalid_player' };
    const match = {
      matchId: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      tournamentId: this.tournamentId,
      player1Id, player2Id,
      round,
      status: 'pending', // pending | completed | draw
      winnerId: null,
      loserId: null,
      score: null,
      completedAt: null
    };
    this.matches.push(match);
    this._emit('match_created', { matchId: match.matchId, player1Id, player2Id });
    return match;
  }

  reportMatchResult(matchId, winnerId, score) {
    const match = this.matches.find(m => m.matchId === matchId);
    if (!match) return { error: 'match_not_found' };
    if (match.status === 'completed') return { error: 'match_already_completed' };
    if (!this.players.has(winnerId)) return { error: 'invalid_winner' };

    const { player1Id, player2Id } = match;
    const loserId = winnerId === player1Id ? player2Id : player1Id;
    const pWinner = this.players.get(winnerId);
    const pLoser = this.players.get(loserId);

    const eloResult = this._calcElo(pWinner.elo, pLoser.elo);
    pWinner.elo = eloResult.winnerNew;
    pLoser.elo = eloResult.loserNew;
    pWinner.wins++;
    pLoser.losses++;

    match.status = 'completed';
    match.winnerId = winnerId;
    match.loserId = loserId;
    match.score = score;
    match.completedAt = Date.now();

    // Record in generic-agent L2 memory
    this.tournamentMemory.l2_match_records.push({
      matchId, winnerId, loserId, score,
      winnerElo: eloResult.winnerNew,
      loserElo: eloResult.loserNew,
      timestamp: Date.now()
    });
    this._saveMemory();

    this._emit('match_completed', { matchId, winnerId, loserId, eloChange: eloResult });
    return { success: true, eloResult };
  }

  reportDraw(matchId) {
    const match = this.matches.find(m => m.matchId === matchId);
    if (!match) return { error: 'match_not_found' };
    match.status = 'draw';
    match.completedAt = Date.now();
    const p1 = this.players.get(match.player1Id);
    const p2 = this.players.get(match.player2Id);
    if (p1) p1.draws++;
    if (p2) p2.draws++;
    this._emit('match_drawn', { matchId });
    return { success: true };
  }

  // ---- Ranking ----
  getStandings() {
    return Array.from(this.players.entries())
      .map(([id, p]) => ({ playerId: id, playerName: p.playerName, elo: p.elo, wins: p.wins, losses: p.losses, draws: p.draws }))
      .sort((a, b) => b.elo - a.elo);
  }

  // ---- Tournament lifecycle ----
  startTournament() {
    if (this.players.size < 2) return { error: 'not_enough_players' };
    this.status = 'running';
    this.currentRound = 1;
    this._emit('tournament_started', { playerCount: this.players.size });
    return { success: true };
  }

  // ---- Swiss round generation (chatdev multi-agent pipeline inspired) ----
  generateSwissPairings() {
    if (this.status !== 'running') return { error: 'tournament_not_running' };
    const standings = this.getStandings();
    const pairings = [];
    const used = new Set();
    for (let i = 0; i < standings.length; i++) {
      if (used.has(standings[i].playerId)) continue;
      for (let j = i + 1; j < standings.length; j++) {
        if (used.has(standings[j].playerId)) continue;
        // Check not already played
        const alreadyPlayed = this.matches.some(m =>
          m.round === this.currentRound && m.status !== 'completed' &&
          ((m.player1Id === standings[i].playerId && m.player2Id === standings[j].playerId) ||
           (m.player1Id === standings[j].playerId && m.player2Id === standings[i].playerId))
        );
        if (!alreadyPlayed) {
          pairings.push([standings[i].playerId, standings[j].playerId]);
          used.add(standings[i].playerId);
          used.add(standings[j].playerId);
          break;
        }
      }
    }
    return pairings;
  }

  // ---- Tournament insights (generic-agent L1) ----
  addInsight(playerId, insight) {
    this.tournamentMemory.l1_insight_index.push({ playerId, text: insight, timestamp: Date.now() });
    this._saveMemory();
  }

  // ---- Stats ----
  getStats() {
    return {
      tournamentId: this.tournamentId,
      name: this.name,
      format: this.format,
      status: this.status,
      playerCount: this.players.size,
      maxPlayers: this.maxPlayers,
      currentRound: this.currentRound,
      matchCount: this.matches.length,
      completedMatches: this.matches.filter(m => m.status === 'completed').length
    };
  }

  getTournamentMemory() { return this.tournamentMemory; }
}

// ---- Nanobot Tool Registry ----
const TournamentTools = {
  'tournament.create': {
    description: 'Create a new tournament',
    parameters: { type: 'object', properties: { tournamentId: { type: 'string' }, name: { type: 'string' }, format: { type: 'string' }, maxPlayers: { type: 'number' } }, required: ['name', 'format'] },
    handler(args) {
      const t = new Tournament(args.tournamentId, args.name, args.format, args.maxPlayers || 16);
      if (typeof window !== 'undefined' && window._sharedTournaments) window._sharedTournaments[t.tournamentId] = t;
      return { tournamentId: t.tournamentId, name: t.name, format: t.format };
    }
  },
  'tournament.register': {
    description: 'Register a player in tournament',
    parameters: { type: 'object', properties: { tournamentId: { type: 'string' }, playerId: { type: 'string' }, playerName: { type: 'string' } }, required: ['tournamentId', 'playerId', 'playerName'] },
    handler(args) {
      const t = window._sharedTournaments && window._sharedTournaments[args.tournamentId];
      if (!t) return { error: 'tournament_not_found' };
      return t.registerPlayer(args.playerId, args.playerName);
    }
  },
  'tournament.match_result': {
    description: 'Report match result',
    parameters: { type: 'object', properties: { matchId: { type: 'string' }, winnerId: { type: 'string' }, score: { type: 'string' } }, required: ['matchId', 'winnerId'] },
    handler(args) {
      for (const t of Object.values(window._sharedTournaments || {})) {
        const match = t.matches.find(m => m.matchId === args.matchId);
        if (match) return t.reportMatchResult(args.matchId, args.winnerId, args.score || '2-0');
      }
      return { error: 'match_not_found' };
    }
  },
  'tournament.standings': {
    description: 'Get tournament standings',
    parameters: { type: 'object', properties: { tournamentId: { type: 'string' } }, required: ['tournamentId'] },
    handler(args) {
      const t = window._sharedTournaments && window._sharedTournaments[args.tournamentId];
      if (!t) return { error: 'tournament_not_found' };
      return t.getStandings();
    }
  },
  'tournament.stats': {
    description: 'Get tournament stats',
    parameters: { type: 'object', properties: { tournamentId: { type: 'string' } }, required: ['tournamentId'] },
    handler(args) {
      const t = window._sharedTournaments && window._sharedTournaments[args.tournamentId];
      if (!t) return { error: 'tournament_not_found' };
      return t.getStats();
    }
  }
};

// ---- TournamentPanel UI ----
class TournamentPanel {
  constructor(tournament) {
    this.tournament = tournament;
    this.isOpen = false;
    this.panel = null;
  }

  open() { this.isOpen = true; this._render(); }
  close() { this.isOpen = false; if (this.panel) { this.panel.remove(); this.panel = null; } }
  toggle() { if (this.isOpen) this.close(); else this.open(); }

  _render() {
    if (typeof document === 'undefined') return;
    const stats = this.tournament.getStats();
    const standings = this.tournament.getStandings().slice(0, 5);
    this.panel = document.createElement('div');
    this.panel.id = 'tournament-panel';
    this.panel.style.cssText = [
      'position:fixed;bottom:80px;right:20px;width:320px;background:rgba(15,15,30,0.95);',
      'border:2px solid #9b59b6;border-radius:12px;padding:16px;z-index:9996;',
      'font-family:monospace;font-size:13px;color:#ecf0f1;'
    ].join('');
    const standingsHtml = standings.map((p, i) =>
      `<div style="color:${i===0?'#f1c40f':i===1?'#bdc3c7':i===2?'#cd7f32':'#999'};font-size:11px;">`
      + `${i+1}. ${p.playerName} (ELO:${p.elo} W:${p.wins} L:${p.losses})</div>`
    ).join('');
    this.panel.innerHTML = [
      `<div style="color:#9b59b6;font-weight:bold;margin-bottom:8px;">🏆 ${stats.name}</div>`,
      `<div style="color:#999;font-size:11px;margin-bottom:8px;">`,
      `  赛制: ${stats.format} | 状态: ${stats.status}<br/>`,
      `  玩家: ${stats.playerCount}/${stats.maxPlayers} | 轮次: ${stats.currentRound}`,
      `</div>`,
      `<div style="border-top:1px solid #333;padding-top:8px;margin-top:4px;">`,
      `<div style="color:#9b59b6;font-size:11px;margin-bottom:4px;">排名 (ELO)</div>`,
      standingsHtml,
      `</div>`
    ].join('');
    document.body.appendChild(this.panel);
  }

  getPanelState() { return { open: this.isOpen, stats: this.tournament.getStats() }; }
}

// Shared registry (nanobot pattern)
if (typeof window !== 'undefined') {
  if (!window._sharedTournaments) window._sharedTournaments = {};
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Tournament, TournamentPanel, TournamentTools };
}
if (typeof window !== 'undefined') {
  window.Tournament = Tournament;
  window.TournamentPanel = TournamentPanel;
  window.TournamentTools = TournamentTools;
}