// ============================================================================
// Card Season Ranked System — V110 Direction D
// ============================================================================
// ELO-based ranked ladder with seasonal resets and rewards.
// Integrates: generic-agent L0-L4 memory + chatdev multi-agent + thunderbolt offline-first.
// ============================================================================

'use strict';

class Season {
  constructor(seasonId, name, startDate, endDate) {
    this.seasonId = seasonId;
    this.name = name;
    this.startDate = startDate;
    this.endDate = endDate;
    this.status = 'active'; // active | completed | upcoming
    this.rankTiers = [
      { name: 'Bronze V', minElo: 0, maxElo: 1099, icon: '🥉' },
      { name: 'Bronze IV', minElo: 1100, maxElo: 1199, icon: '🥉' },
      { name: 'Bronze III', minElo: 1200, maxElo: 1299, icon: '🥉' },
      { name: 'Bronze II', minElo: 1300, maxElo: 1399, icon: '🥉' },
      { name: 'Bronze I', minElo: 1400, maxElo: 1499, icon: '🥉' },
      { name: 'Silver V', minElo: 1500, maxElo: 1599, icon: '🥈' },
      { name: 'Silver IV', minElo: 1600, maxElo: 1699, icon: '🥈' },
      { name: 'Silver III', minElo: 1700, maxElo: 1799, icon: '🥈' },
      { name: 'Silver II', minElo: 1800, maxElo: 1899, icon: '🥈' },
      { name: 'Silver I', minElo: 1900, maxElo: 1999, icon: '🥈' },
      { name: 'Gold V', minElo: 2000, maxElo: 2099, icon: '🥇' },
      { name: 'Gold IV', minElo: 2100, maxElo: 2199, icon: '🥇' },
      { name: 'Gold III', minElo: 2200, maxElo: 2299, icon: '🥇' },
      { name: 'Gold II', minElo: 2300, maxElo: 2399, icon: '🥇' },
      { name: 'Gold I', minElo: 2400, maxElo: 2499, icon: '🥇' },
      { name: 'Platinum V', minElo: 2500, maxElo: 2599, icon: '💎' },
      { name: 'Platinum IV', minElo: 2600, maxElo: 2699, icon: '💎' },
      { name: 'Platinum III', minElo: 2700, maxElo: 2799, icon: '💎' },
      { name: 'Platinum II', minElo: 2800, maxElo: 2899, icon: '💎' },
      { name: 'Platinum I', minElo: 2900, maxElo: 2999, icon: '💎' },
      { name: 'Diamond V', minElo: 3000, maxElo: 3099, icon: '💠' },
      { name: 'Diamond IV', minElo: 3100, maxElo: 3199, icon: '💠' },
      { name: 'Diamond III', minElo: 3200, maxElo: 3299, icon: '💠' },
      { name: 'Diamond II', minElo: 3300, maxElo: 3399, icon: '💠' },
      { name: 'Diamond I', minElo: 3400, maxElo: 3499, icon: '💠' },
      { name: 'Champion', minElo: 3500, maxElo: 9999, icon: '👑' },
    ];
    this.seasonMemory = { l0_meta: { name, startDate, endDate }, l1_match_history: [], l2_top_players: [], l3_rewards: [] };
  }

  getTierForElo(elo) {
    for (let i = this.rankTiers.length - 1; i >= 0; i--) {
      if (elo >= this.rankTiers[i].minElo) return this.rankTiers[i];
    }
    return this.rankTiers[0];
  }

  recordMatch(playerId, opponentId, result, eloChange) {
    this.seasonMemory.l1_match_history.push({ playerId, opponentId, result, eloChange, timestamp: Date.now() });
  }

  finalizeSeason() {
    this.status = 'completed';
    const sorted = {};
    for (const record of this.seasonMemory.l1_match_history) {
      if (!sorted[record.playerId]) sorted[record.playerId] = { playerId: record.playerId, wins: 0, losses: 0, eloSum: 0, matches: 0 };
      sorted[record.playerId].eloSum += record.eloChange;
      sorted[record.playerId].matches++;
      if (record.result === 'win') sorted[record.playerId].wins++;
      else if (record.result === 'loss') sorted[record.playerId].losses++;
    }
    this.seasonMemory.l2_top_players = Object.values(sorted).sort((a, b) => b.eloSum - a.eloSum);
    return this.seasonMemory.l2_top_players;
  }

  getSeasonStats() {
    return {
      seasonId: this.seasonId,
      name: this.name,
      status: this.status,
      totalMatches: this.seasonMemory.l1_match_history.length,
      totalPlayers: new Set(this.seasonMemory.l1_match_history.map(m => m.playerId)).size,
      topPlayers: this.seasonMemory.l2_top_players.slice(0, 10)
    };
  }
}

class RankedLadder {
  constructor() {
    this.seasons = new Map();
    this.playerSeasons = new Map(); // playerId → seasonId → { elo, peakElo, gamesPlayed, wins, losses, rank }
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('ranked_ladder') : null;
      if (raw) {
        const data = JSON.parse(raw);
        this.seasons = new Map(data.seasons || []);
        try { this.playerSeasons = new Map(Object.entries(data.playerSeasons || {}).map(([k, v]) => [k, new Map(Object.entries(v || {}))])); } catch { this.playerSeasons = new Map(); }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const serializable = { seasons: Array.from(this.seasons.entries()), playerSeasons: Object.fromEntries(Array.from(this.playerSeasons.entries()).map(([k, v]) => [k, Object.fromEntries(v)])) };
      localStorage.setItem('ranked_ladder', JSON.stringify(serializable));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  createSeason(seasonId, name) {
    const season = new Season(seasonId, name, Date.now(), Date.now() + 30 * 86400000);
    this.seasons.set(seasonId, season);
    this._save();
    return season;
  }

  getOrCreatePlayerSeason(playerId, seasonId) {
    if (!this.playerSeasons.has(playerId)) this.playerSeasons.set(playerId, new Map());
    const ps = this.playerSeasons.get(playerId);
    if (!ps.has(seasonId)) ps.set(seasonId, { elo: 1500, peakElo: 1500, gamesPlayed: 0, wins: 0, losses: 0, draws: 0 });
    return ps.get(seasonId);
  }

  recordRankedGame(playerId, seasonId, opponentId, result, eloChange) {
    const ps = this.getOrCreatePlayerSeason(playerId, seasonId);
    ps.elo = Math.max(100, ps.elo + eloChange);
    ps.peakElo = Math.max(ps.peakElo, ps.elo);
    ps.gamesPlayed++;
    if (result === 'win') ps.wins++;
    else if (result === 'loss') ps.losses++;
    else ps.draws++;

    const season = this.seasons.get(seasonId);
    if (season) season.recordMatch(playerId, opponentId, result, eloChange);
    this._save();
    this._emit('ranked_game_recorded', { playerId, seasonId, result, eloChange, newElo: ps.elo });
    return ps;
  }

  getPlayerRank(playerId, seasonId) {
    const ps = this.playerSeasons.get(playerId)?.get(seasonId);
    if (!ps) return null;
    const season = this.seasons.get(seasonId);
    const tier = season ? season.getTierForElo(ps.elo) : null;
    return { ...ps, tier: tier ? tier.name : 'Unknown', icon: tier ? tier.icon : '❓' };
  }

  getSeasonLeaderboard(seasonId, limit = 20) {
    const season = this.seasons.get(seasonId);
    if (!season) return [];
    const players = [];
    for (const [playerId, psMap] of this.playerSeasons) {
      const ps = psMap.get(seasonId);
      if (ps) {
        const tier = season.getTierForElo(ps.elo);
        players.push({ playerId, elo: ps.elo, peakElo: ps.peakElo, gamesPlayed: ps.gamesPlayed, wins: ps.wins, losses: ps.losses, tier: tier.name, icon: tier.icon });
      }
    }
    return players.sort((a, b) => b.elo - a.elo).slice(0, limit);
  }

  getStats() {
    return {
      totalSeasons: this.seasons.size,
      totalPlayers: this.playerSeasons.size,
      currentSeason: Array.from(this.seasons.values()).filter(s => s.status === 'active')[0]?.seasonId || null
    };
  }
}

const RankedTools = {
  'ranked.season_create': {
    description: 'Create a new ranked season',
    parameters: { type: 'object', properties: { seasonId: { type: 'string' }, name: { type: 'string' } }, required: ['seasonId', 'name'] },
    handler(args) {
      const ladder = window._rankedLadder || new RankedLadder();
      if (window._rankedLadder === undefined) window._rankedLadder = ladder;
      return ladder.createSeason(args.seasonId, args.name);
    }
  },
  'ranked.record_game': {
    description: 'Record a ranked game result',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, seasonId: { type: 'string' }, opponentId: { type: 'string' }, result: { type: 'string' }, eloChange: { type: 'number' } }, required: ['playerId', 'seasonId', 'result'] },
    handler(args) {
      if (!window._rankedLadder) return { error: 'ladder_not_initialized' };
      return window._rankedLadder.recordRankedGame(args.playerId, args.seasonId, args.opponentId, args.result, args.eloChange || 0);
    }
  },
  'ranked.rank': {
    description: 'Get player rank for a season',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, seasonId: { type: 'string' } }, required: ['playerId', 'seasonId'] },
    handler(args) {
      if (!window._rankedLadder) return { error: 'ladder_not_initialized' };
      return window._rankedLadder.getPlayerRank(args.playerId, args.seasonId) || { error: 'no_rank' };
    }
  },
  'ranked.leaderboard': {
    description: 'Get season leaderboard',
    parameters: { type: 'object', properties: { seasonId: { type: 'string' } }, required: ['seasonId'] },
    handler(args) {
      if (!window._rankedLadder) return [];
      return window._rankedLadder.getSeasonLeaderboard(args.seasonId);
    }
  },
  'ranked.stats': {
    description: 'Get ranked ladder statistics',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._rankedLadder) return { error: 'ladder_not_initialized' };
      return window._rankedLadder.getStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Season, RankedLadder, RankedTools };
}
if (typeof window !== 'undefined') {
  window.Season = Season;
  window.RankedLadder = RankedLadder;
  window.RankedTools = RankedTools;
}