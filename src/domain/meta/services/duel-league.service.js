// ============================================================================
// Card Duel League System — V115 Direction I
// ============================================================================
// A competitive league system where players form clubs, compete in seasons,
// and earn titles. Integrates: generic-agent L0-L4 + thunderbolt offline-first.
// ============================================================================

'use strict';

class LeagueSeason {
  constructor(seasonId, name) {
    this.seasonId = seasonId;
    this.name = name;
    this.status = 'upcoming'; // upcoming | active | completed
    this.startedAt = null;
    this.completedAt = null;
    this.minRankToJoin = 0;
    this.maxPlayers = 64;
  }

  start() {
    this.status = 'active';
    this.startedAt = Date.now();
  }

  complete() {
    this.status = 'completed';
    this.completedAt = Date.now();
  }
}

class Club {
  constructor(clubId, name, tag) {
    this.clubId = clubId;
    this.name = name;
    this.tag = tag;
    this.members = []; // [{playerId, rank, joinedAt}]
    this.wins = 0;
    this.losses = 0;
    this.createdAt = Date.now();
  }

  get totalMatches() { return this.wins + this.losses; }
  get winRate() { return this.totalMatches > 0 ? Math.round(this.wins / this.totalMatches * 100) : 0; }

  addMember(playerId) {
    if (!this.members.some(m => m.playerId === playerId)) {
      this.members.push({ playerId, rank: 1500, joinedAt: Date.now() });
    }
  }

  removeMember(playerId) {
    this.members = this.members.filter(m => m.playerId !== playerId);
  }

  updateRecord(won) {
    if (won) this.wins++;
    else this.losses++;
  }
}

class MatchRecord {
  constructor(homeClubId, awayClubId, homeScore, awayScore, seasonId) {
    this.homeClubId = homeClubId;
    this.awayClubId = awayClubId;
    this.homeScore = homeScore;
    this.awayScore = awayScore;
    this.seasonId = seasonId;
    this.playedAt = Date.now();
  }

  get winner() {
    if (this.homeScore > this.awayScore) return this.homeClubId;
    if (this.awayScore > this.homeScore) return this.awayClubId;
    return null;
  }
}

class DuelLeagueSystem {
  constructor() {
    this.seasons = new Map(); // seasonId → LeagueSeason
    this.clubs = new Map();  // clubId → Club
    this.matches = [];       // MatchRecord[]
    this.currentSeason = null;
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('duel_league') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const [sid, sdata] of Object.entries(data.seasons || {})) {
          const s = new LeagueSeason(sid, sdata.name);
          s.status = sdata.status || 'upcoming';
          s.startedAt = sdata.startedAt || null;
          s.completedAt = sdata.completedAt || null;
          s.minRankToJoin = sdata.minRankToJoin || 0;
          s.maxPlayers = sdata.maxPlayers || 64;
          this.seasons.set(sid, s);
        }
        for (const [cid, cdata] of Object.entries(data.clubs || {})) {
          const c = new Club(cid, cdata.name, cdata.tag);
          c.wins = cdata.wins || 0;
          c.losses = cdata.losses || 0;
          c.members = cdata.members || [];
          c.createdAt = cdata.createdAt || Date.now();
          this.clubs.set(cid, c);
        }
        this.matches = data.matches || [];
        this.currentSeason = data.currentSeason || null;
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        seasons: Object.fromEntries(Array.from(this.seasons.entries()).map(([k, v]) => [k, {
          name: v.name, status: v.status, startedAt: v.startedAt,
          completedAt: v.completedAt, minRankToJoin: v.minRankToJoin, maxPlayers: v.maxPlayers
        }])),
        clubs: Object.fromEntries(Array.from(this.clubs.entries()).map(([k, v]) => [k, {
          name: v.name, tag: v.tag, wins: v.wins, losses: v.losses,
          members: v.members, createdAt: v.createdAt
        }])),
        matches: this.matches.map(m => ({ ...m })),
        currentSeason: this.currentSeason
      };
      localStorage.setItem('duel_league', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  createSeason(seasonId, name, options = {}) {
    if (this.seasons.has(seasonId)) return { error: 'season_exists' };
    const s = new LeagueSeason(seasonId, name);
    s.minRankToJoin = options.minRankToJoin || 0;
    s.maxPlayers = options.maxPlayers || 64;
    this.seasons.set(seasonId, s);
    this._save();
    return s;
  }

  getSeason(seasonId) {
    return this.seasons.get(seasonId) || null;
  }

  startSeason(seasonId) {
    const s = this.seasons.get(seasonId);
    if (!s) return { error: 'season_not_found' };
    if (s.status !== 'upcoming') return { error: 'season_not_upcoming' };
    if (this.currentSeason && this.currentSeason !== seasonId) {
      const curr = this.seasons.get(this.currentSeason);
      if (curr && curr.status === 'active') curr.complete();
    }
    s.start();
    this.currentSeason = seasonId;
    this._save();
    return { success: true };
  }

  completeSeason(seasonId) {
    const s = this.seasons.get(seasonId);
    if (!s) return { error: 'season_not_found' };
    s.complete();
    if (this.currentSeason === seasonId) this.currentSeason = null;
    this._save();
    return { success: true };
  }

  createClub(clubId, name, tag) {
    if (this.clubs.has(clubId)) return { error: 'club_exists' };
    if (tag.length > 5) return { error: 'tag_too_long' };
    const c = new Club(clubId, name, tag);
    this.clubs.set(clubId, c);
    this._save();
    return c;
  }

  getClub(clubId) {
    return this.clubs.get(clubId) || null;
  }

  joinClub(clubId, playerId) {
    const c = this.clubs.get(clubId);
    if (!c) return { error: 'club_not_found' };
    c.addMember(playerId);
    this._save();
    return { success: true };
  }

  leaveClub(clubId, playerId) {
    const c = this.clubs.get(clubId);
    if (!c) return { error: 'club_not_found' };
    c.removeMember(playerId);
    this._save();
    return { success: true };
  }

  recordMatch(homeClubId, awayClubId, homeScore, awayScore) {
    if (!this.currentSeason) return { error: 'no_active_season' };
    const homeClub = this.clubs.get(homeClubId);
    const awayClub = this.clubs.get(awayClubId);
    if (!homeClub || !awayClub) return { error: 'club_not_found' };
    if (homeClubId === awayClubId) return { error: 'same_club_match' };
    const record = new MatchRecord(homeClubId, awayClubId, homeScore, awayScore, this.currentSeason);
    this.matches.push(record);
    homeClub.updateRecord(homeScore > awayScore);
    awayClub.updateRecord(awayScore > homeScore);
    this._save();
    this._emit('match_recorded', { homeClubId, awayClubId, winner: record.winner });
    return { success: true };
  }

  getSeasonStandings(seasonId) {
    const clubRecords = new Map();
    for (const m of this.matches) {
      if (m.seasonId !== seasonId) continue;
      if (!clubRecords.has(m.homeClubId)) clubRecords.set(m.homeClubId, { wins: 0, losses: 0, draws: 0, played: 0 });
      if (!clubRecords.has(m.awayClubId)) clubRecords.set(m.awayClubId, { wins: 0, losses: 0, draws: 0, played: 0 });
      clubRecords.get(m.homeClubId).played++;
      clubRecords.get(m.awayClubId).played++;
      if (m.homeScore > m.awayScore) {
        clubRecords.get(m.homeClubId).wins++;
        clubRecords.get(m.awayClubId).losses++;
      } else if (m.awayScore > m.homeScore) {
        clubRecords.get(m.awayClubId).wins++;
        clubRecords.get(m.homeClubId).losses++;
      } else {
        clubRecords.get(m.homeClubId).draws++;
        clubRecords.get(m.awayClubId).draws++;
      }
    }
    const standings = [];
    for (const [clubId, rec] of clubRecords.entries()) {
      const club = this.clubs.get(clubId);
      const total = rec.wins + rec.losses + rec.draws;
      standings.push({
        clubId, name: club?.name || clubId, tag: club?.tag || '',
        wins: rec.wins, losses: rec.losses, draws: rec.draws, totalMatches: rec.played,
        winRate: rec.played > 0 ? Math.round(rec.wins / rec.played * 100) : 0
      });
    }
    standings.sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);
    return standings;
  }

  getStats() {
    return {
      totalSeasons: this.seasons.size,
      totalClubs: this.clubs.size,
      totalMatches: this.matches.length,
      activeSeason: this.currentSeason
    };
  }
}

const LeagueTools = {
  'league.create_season': {
    description: 'Create a league season',
    parameters: { type: 'object', properties: { seasonId: { type: 'string' }, name: { type: 'string' }, options: { type: 'object' } }, required: ['seasonId', 'name'] },
    handler(args) {
      if (!window._duelLeague) window._duelLeague = new DuelLeagueSystem();
      return window._duelLeague.createSeason(args.seasonId, args.name, args.options || {});
    }
  },
  'league.start_season': {
    description: 'Start a league season',
    parameters: { type: 'object', properties: { seasonId: { type: 'string' } }, required: ['seasonId'] },
    handler(args) {
      if (!window._duelLeague) return { error: 'system_not_initialized' };
      return window._duelLeague.startSeason(args.seasonId);
    }
  },
  'league.create_club': {
    description: 'Create a club',
    parameters: { type: 'object', properties: { clubId: { type: 'string' }, name: { type: 'string' }, tag: { type: 'string' } }, required: ['clubId', 'name', 'tag'] },
    handler(args) {
      if (!window._duelLeague) window._duelLeague = new DuelLeagueSystem();
      return window._duelLeague.createClub(args.clubId, args.name, args.tag);
    }
  },
  'league.join_club': {
    description: 'Join a club',
    parameters: { type: 'object', properties: { clubId: { type: 'string' }, playerId: { type: 'string' } }, required: ['clubId', 'playerId'] },
    handler(args) {
      if (!window._duelLeague) return { error: 'system_not_initialized' };
      return window._duelLeague.joinClub(args.clubId, args.playerId);
    }
  },
  'league.record_match': {
    description: 'Record a match result',
    parameters: { type: 'object', properties: { homeClubId: { type: 'string' }, awayClubId: { type: 'string' }, homeScore: { type: 'number' }, awayScore: { type: 'number' } }, required: ['homeClubId', 'awayClubId', 'homeScore', 'awayScore'] },
    handler(args) {
      if (!window._duelLeague) return { error: 'system_not_initialized' };
      return window._duelLeague.recordMatch(args.homeClubId, args.awayClubId, args.homeScore, args.awayScore);
    }
  },
  'league.standings': {
    description: 'Get season standings',
    parameters: { type: 'object', properties: { seasonId: { type: 'string' } }, required: ['seasonId'] },
    handler(args) {
      if (!window._duelLeague) return { error: 'system_not_initialized' };
      return window._duelLeague.getSeasonStandings(args.seasonId);
    }
  },
  'league.stats': {
    description: 'Get league stats',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._duelLeague) window._duelLeague = new DuelLeagueSystem();
      return window._duelLeague.getStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LeagueSeason, Club, MatchRecord, DuelLeagueSystem, LeagueTools };
}
if (typeof window !== 'undefined') {
  window.LeagueSeason = LeagueSeason;
  window.Club = Club;
  window.MatchRecord = MatchRecord;
  window.DuelLeagueSystem = DuelLeagueSystem;
  window.LeagueTools = LeagueTools;
}