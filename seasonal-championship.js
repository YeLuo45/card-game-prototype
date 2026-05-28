// ============================================================================
// Card Seasonal Championship — V134 Direction B
// ============================================================================
// Multi-season tournament with leaderboards, rewards, division climbs.
// thunderbolt pipeline (season progression) + generic-agent L0-L4 (history).
// ============================================================================

'use strict';

class SeasonalPlayer {
  constructor(playerId, seasonId) {
    this.playerId = playerId;
    this.seasonId = seasonId;
    this.rank = 0;
    this.rating = 1000;
    this.wins = 0;
    this.losses = 0;
    this.division = 'bronze'; // bronze, silver, gold, platinum, diamond, champion
    this.divisionRank = 5; // 1-5 within division
    this.matches = [];
    this.rewards = [];
    this.isQualified = false;
    this.registeredAt = Date.now();
  }

  recordMatch(againstId, myScore, theirScore, ratingDelta) {
    this.matches.push({
      againstId, myScore, theirScore,
      ratingDelta, timestamp: Date.now()
    });
    this.rating += ratingDelta;
    if (myScore > theirScore) this.wins++;
    else this.losses++;
    if (this.matches.length > 100) this.matches.shift();
    this._updateDivision();
    return this;
  }

  _updateDivision() {
    const d = this.division;
    const r = this.rank;
    if (r <= 10) this.division = 'champion';
    else if (r <= 50) this.division = 'diamond';
    else if (r <= 200) this.division = 'platinum';
    else if (r <= 500) this.division = 'gold';
    else this.division = 'silver';

    // Division rank based on rating
    if (this.rating >= 1800) this.divisionRank = 1;
    else if (this.rating >= 1600) this.divisionRank = 2;
    else if (this.rating >= 1400) this.divisionRank = 3;
    else if (this.rating >= 1200) this.divisionRank = 4;
    else this.divisionRank = 5;
  }

  serialize() {
    return {
      playerId: this.playerId, seasonId: this.seasonId, rank: this.rank,
      rating: this.rating, wins: this.wins, losses: this.losses,
      division: this.division, divisionRank: this.divisionRank,
      winRate: this.matches.length > 0 ? (this.wins / this.matches.length * 100).toFixed(1) + '%' : '0%',
      isQualified: this.isQualified
    };
  }
}

class Season {
  constructor(seasonId, name) {
    this.seasonId = seasonId;
    this.name = name;
    this.status = 'upcoming'; // upcoming, active, completed
    this.startTime = Date.now();
    this.endTime = null;
    this.leaderboard = new Map(); // playerId → SeasonalPlayer
    this.rewards = [];
    this.championId = null;
    this.topPlayers = [];
  }

  addPlayer(playerId) {
    if (!this.leaderboard.has(playerId)) {
      this.leaderboard.set(playerId, new SeasonalPlayer(playerId, this.seasonId));
    }
    return this.leaderboard.get(playerId);
  }

  recordMatch(playerId, againstId, myScore, theirScore, ratingDelta) {
    const player = this.addPlayer(playerId);
    player.recordMatch(againstId, myScore, theirScore, ratingDelta);
  }

  finalize() {
    this.status = 'completed';
    this.endTime = Date.now();

    // Sort by rating
    const sorted = Array.from(this.leaderboard.values())
      .sort((a, b) => b.rating - a.rating);

    sorted.forEach((p, i) => { p.rank = i + 1; });

    this.championId = sorted[0]?.playerId || null;
    this.topPlayers = sorted.slice(0, 10).map(p => p.serialize());

    // Mark qualified
    sorted.slice(0, 50).forEach(p => { p.isQualified = true; });

    return { champion: this.championId, topPlayers: this.topPlayers };
  }
}

class SeasonalChampionshipSystem {
  constructor() {
    this.seasons = new Map(); // seasonId → Season
    this.activeSeasonId = null;
    this.hooks = [];
    this._load();
    if (!this.activeSeasonId) this.startNewSeason('season_1', 'Season 1');
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('seasonal_championship') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const [sid, sdata] of Object.entries(data.seasons || {})) {
          const season = new Season(sid, sdata.name);
          season.status = sdata.status;
          season.startTime = sdata.startTime;
          season.endTime = sdata.endTime;
          season.championId = sdata.championId;
          season.topPlayers = sdata.topPlayers || [];
          season.rewards = sdata.rewards || [];
          for (const [pid, pdata] of Object.entries(sdata.leaderboard || {})) {
            const sp = new SeasonalPlayer(pid, sid);
            Object.assign(sp, pdata);
            season.leaderboard.set(pid, sp);
          }
          this.seasons.set(sid, season);
        }
        this.activeSeasonId = data.activeSeasonId;
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        activeSeasonId: this.activeSeasonId,
        seasons: Object.fromEntries(Array.from(this.seasons.entries()).map(([k, v]) => {
          return [k, {
            name: v.name, status: v.status, startTime: v.startTime,
            endTime: v.endTime, championId: v.championId,
            topPlayers: v.topPlayers, rewards: v.rewards,
            leaderboard: Object.fromEntries(Array.from(v.leaderboard.entries()).map(([pk, pv]) => [pk, pv.serialize()]))
          }];
        }))
      };
      localStorage.setItem('seasonal_championship', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  startNewSeason(seasonId, name) {
    if (this.seasons.has(seasonId)) return { error: 'season_exists' };
    const season = new Season(seasonId, name);
    this.seasons.set(seasonId, season);
    this.activeSeasonId = seasonId;
    this._save();
    this._emit('season_started', { seasonId, name });
    return { success: true, seasonId };
  }

  registerPlayer(playerId) {
    if (!this.activeSeasonId) return { error: 'no_active_season' };
    const season = this.seasons.get(this.activeSeasonId);
    const player = season.addPlayer(playerId);
    this._save();
    return player.serialize();
  }

  recordMatchResult(playerId, againstId, myScore, theirScore, ratingDelta) {
    if (!this.activeSeasonId) return { error: 'no_active_season' };
    const season = this.seasons.get(this.activeSeasonId);
    season.recordMatch(playerId, againstId, myScore, theirScore, ratingDelta);
    this._save();
    this._emit('match_recorded', { playerId, ratingDelta });
    return { success: true };
  }

  getLeaderboard(seasonId, limit) {
    const sid = seasonId || this.activeSeasonId;
    if (!this.seasons.has(sid)) return [];
    const season = this.seasons.get(sid);
    return Array.from(season.leaderboard.values())
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit || 50)
      .map(p => p.serialize());
  }

  getPlayerSeason(playerId, seasonId) {
    const sid = seasonId || this.activeSeasonId;
    if (!this.seasons.has(sid)) return null;
    const season = this.seasons.get(sid);
    return season.leaderboard.get(playerId)?.serialize() || null;
  }

  endSeason(seasonId) {
    const sid = seasonId || this.activeSeasonId;
    if (!this.seasons.has(sid)) return { error: 'season_not_found' };
    const result = this.seasons.get(sid).finalize();
    this._save();
    this._emit('season_ended', result);
    return result;
  }

  getSeasonInfo(seasonId) {
    const sid = seasonId || this.activeSeasonId;
    if (!this.seasons.has(sid)) return null;
    const season = this.seasons.get(sid);
    return {
      seasonId: sid, name: season.name, status: season.status,
      championId: season.championId, playerCount: season.leaderboard.size
    };
  }

  getPlayerOverallStats(playerId) {
    let totalWins = 0, totalLosses = 0, seasonsPlayed = 0;
    for (const season of this.seasons.values()) {
      const sp = season.leaderboard.get(playerId);
      if (sp) { totalWins += sp.wins; totalLosses += sp.losses; seasonsPlayed++; }
    }
    return { playerId, totalWins, totalLosses, seasonsPlayed, totalMatches: totalWins + totalLosses };
  }
}

const SeasonalTools = {
  'season.register': {
    description: 'Register player for current season',
    parameters: { type: 'object', properties: { playerId: { type: 'string' } }, required: ['playerId'] },
    handler(args) {
      if (!window._seasonalSystem) window._seasonalSystem = new SeasonalChampionshipSystem();
      return window._seasonalSystem.registerPlayer(args.playerId);
    }
  },
  'season.match': {
    description: 'Record match result',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, againstId: { type: 'string' }, myScore: { type: 'number' }, theirScore: { type: 'number' }, ratingDelta: { type: 'number' } }, required: ['playerId', 'againstId', 'myScore', 'theirScore', 'ratingDelta'] },
    handler(args) {
      if (!window._seasonalSystem) return { error: 'not_init' };
      return window._seasonalSystem.recordMatchResult(args.playerId, args.againstId, args.myScore, args.theirScore, args.ratingDelta);
    }
  },
  'season.leaderboard': {
    description: 'Get season leaderboard',
    parameters: { type: 'object', properties: { seasonId: { type: 'string' }, limit: { type: 'number' } } },
    handler(args) {
      if (!window._seasonalSystem) window._seasonalSystem = new SeasonalChampionshipSystem();
      return window._seasonalSystem.getLeaderboard(args.seasonId, args.limit);
    }
  },
  'season.info': {
    description: 'Get season info',
    parameters: { type: 'object', properties: { seasonId: { type: 'string' } } },
    handler(args) {
      if (!window._seasonalSystem) window._seasonalSystem = new SeasonalChampionshipSystem();
      return window._seasonalSystem.getSeasonInfo(args.seasonId);
    }
  },
  'season.stats': {
    description: 'Get player overall stats',
    parameters: { type: 'object', properties: { playerId: { type: 'string' } } },
    handler(args) {
      if (!window._seasonalSystem) window._seasonalSystem = new SeasonalChampionshipSystem();
      return window._seasonalSystem.getPlayerOverallStats(args.playerId);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SeasonalPlayer, Season, SeasonalChampionshipSystem, SeasonalTools };
}
if (typeof window !== 'undefined') {
  window.SeasonalPlayer = SeasonalPlayer;
  window.Season = Season;
  window.SeasonalChampionshipSystem = SeasonalChampionshipSystem;
  window.SeasonalTools = SeasonalTools;
}