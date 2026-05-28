// ============================================================================
// Card Seasonal League System — V125 Direction S
// ============================================================================
// Monthly/seasonal ranked ladder with division climbs, rewards, and leaderboards.
// thunderbolt offline-first + generic-agent L0-L4 (rank history, seasonal records).
// ============================================================================

'use strict';

class SeasonalPlayer {
  constructor(playerId) {
    this.playerId = playerId;
    this.rank = 'bronze'; // bronze, silver, gold, platinum, diamond, master
    this.division = 3; // 1-3 (3 = lowest, 1 = highest)
    this.rating = 1000; // MMR
    this.seasonWins = 0;
    this.seasonLosses = 0;
    this.peakRating = 1000;
    this.bestRank = 'bronze';
  }

  getRankTier() {
    const tiers = { bronze: 0, silver: 1, gold: 2, platinum: 3, diamond: 4, master: 5 };
    return tiers[this.rank] || 0;
  }

  getRankScore() { return this.getRankTier() * 3 + (4 - this.division); }

  recordWin(opponentStrength) {
    this.seasonWins++;
    const delta = Math.round(25 * opponentStrength);
    this.rating += delta;
    if (this.rating > this.peakRating) this.peakRating = this.rating;
    this._checkPromotion();
  }

  recordLoss() {
    this.seasonLosses++;
    this.rating = Math.max(0, this.rating - 20);
    this._checkDemotion();
  }

  _checkPromotion() {
    if (this.rating >= 1400 && this.rank === 'bronze') { this.rank = 'silver'; this.division = 3; }
    else if (this.rating >= 1600 && this.rank === 'silver') { this.rank = 'gold'; this.division = 3; }
    else if (this.rating >= 1800 && this.rank === 'gold') { this.rank = 'platinum'; this.division = 3; }
    else if (this.rating >= 2000 && this.rank === 'platinum') { this.rank = 'diamond'; this.division = 3; }
    else if (this.rating >= 2400 && this.rank === 'diamond') { this.rank = 'master'; this.division = 1; }
    else if (this.rank !== 'master' && this.division > 1 && this.rating >= 1300 + this.getRankTier() * 150) {
      this.division--;
    }
    if (this.getRankScore() > { bronze: 0, silver: 1, gold: 2, platinum: 3, diamond: 4, master: 5 }[this.bestRank]) {
      this.bestRank = this.rank;
    }
  }

  _checkDemotion() {
    if (this.rating < 1000 && this.rank === 'silver') { this.rank = 'bronze'; this.division = 1; }
    else if (this.rating < 1200 && this.rank === 'gold') { this.rank = 'silver'; this.division = 1; }
  }
}

class SeasonalLeagueSystem {
  constructor() {
    this.seasonId = 'season_1';
    this.players = new Map(); // playerId → SeasonalPlayer
    this.matches = []; // {seasonId, player1, player2, winner, timestamp}
    this.rewards = new Map(); // playerId → {chest, title}
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('seasonal_league') : null;
      if (raw) {
        const data = JSON.parse(raw);
        this.seasonId = data.seasonId || 'season_1';
        for (const [pid, pdata] of Object.entries(data.players || {})) {
          const p = new SeasonalPlayer(pid);
          Object.assign(p, pdata);
          this.players.set(pid, p);
        }
        this.matches = data.matches || [];
        for (const [pid, rdata] of Object.entries(data.rewards || {})) {
          this.rewards.set(pid, rdata);
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        seasonId: this.seasonId,
        players: Object.fromEntries(Array.from(this.players.entries()).map(([k, v]) => [k, { rank: v.rank, division: v.division, rating: v.rating, seasonWins: v.seasonWins, seasonLosses: v.seasonLosses, peakRating: v.peakRating, bestRank: v.bestRank }])),
        matches: this.matches,
        rewards: Object.fromEntries(this.rewards.entries())
      };
      localStorage.setItem('seasonal_league', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  getOrCreatePlayer(playerId) {
    if (!this.players.has(playerId)) this.players.set(playerId, new SeasonalPlayer(playerId));
    return this.players.get(playerId);
  }

  recordMatch(player1Id, player2Id, winnerId) {
    const p1 = this.getOrCreatePlayer(player1Id);
    const p2 = this.getOrCreatePlayer(player2Id);
    const opponentStrength = p2.rating / 1000;

    if (winnerId === player1Id) {
      p1.recordWin(opponentStrength);
      p2.recordLoss();
    } else if (winnerId === player2Id) {
      p2.recordWin(opponentStrength);
      p1.recordLoss();
    }

    this.matches.push({ seasonId: this.seasonId, player1: player1Id, player2: player2Id, winner: winnerId, timestamp: Date.now() });
    this._save();
    this._emit('match_recorded', { player1Id, player2Id, winnerId });
    return { p1: { rank: p1.rank, division: p1.division, rating: p1.rating }, p2: { rank: p2.rank, division: p2.division, rating: p2.rating } };
  }

  getPlayer(playerId) {
    const p = this.getOrCreatePlayer(playerId);
    return { playerId, rank: p.rank, division: p.division, rating: p.rating, seasonWins: p.seasonWins, seasonLosses: p.seasonLosses, peakRating: p.peakRating, bestRank: p.bestRank };
  }

  getLeaderboard(limit) {
    return Array.from(this.players.values()).sort((a, b) => b.rating - a.rating).slice(0, limit || 20).map(p => ({ playerId: p.playerId, rank: p.rank, division: p.division, rating: p.rating }));
  }

  getSeasonStats() {
    let totalMatches = this.matches.length;
    return { seasonId: this.seasonId, totalMatches, totalPlayers: this.players.size };
  }
}

const SeasonalTools = {
  'season.record': {
    description: 'Record seasonal match result',
    parameters: { type: 'object', properties: { player1: { type: 'string' }, player2: { type: 'string' }, winner: { type: 'string' } }, required: ['player1', 'player2', 'winner'] },
    handler(args) {
      if (!window._seasonalLeague) window._seasonalLeague = new SeasonalLeagueSystem();
      return window._seasonalLeague.recordMatch(args.player1, args.player2, args.winner);
    }
  },
  'season.get': {
    description: 'Get player season info',
    parameters: { type: 'object', properties: { playerId: { type: 'string' } }, required: ['playerId'] },
    handler(args) {
      if (!window._seasonalLeague) window._seasonalLeague = new SeasonalLeagueSystem();
      return window._seasonalLeague.getPlayer(args.playerId);
    }
  },
  'season.stats': {
    description: 'Get season stats',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._seasonalLeague) window._seasonalLeague = new SeasonalLeagueSystem();
      return window._seasonalLeague.getSeasonStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SeasonalPlayer, SeasonalLeagueSystem, SeasonalTools };
}
if (typeof window !== 'undefined') {
  window.SeasonalPlayer = SeasonalPlayer;
  window.SeasonalLeagueSystem = SeasonalLeagueSystem;
  window.SeasonalTools = SeasonalTools;
}