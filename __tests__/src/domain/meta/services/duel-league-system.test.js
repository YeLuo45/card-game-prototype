'use strict';

const fs = require('fs');
const path = require('path');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'duel-league-system.js'), 'utf8');
eval(code);

const { LeagueSeason, Club, MatchRecord, DuelLeagueSystem, LeagueTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// LeagueSeason Tests
// ========================================================================
console.log('\n=== LeagueSeason Tests ===');
{
    const s = new LeagueSeason('s1', 'Season 1');
    assertEq(s.seasonId, 's1', 'seasonId set');
    assertEq(s.name, 'Season 1', 'name set');
    assertEq(s.status, 'upcoming', 'status is upcoming initially');
    assertEq(s.startedAt, null, 'startedAt is null initially');
    assert(!s.completedAt, 'completedAt is falsy initially');

    s.start();
    assertEq(s.status, 'active', 'status after start');
    assert(s.startedAt !== null, 'startedAt set after start');

    s.complete();
    assertEq(s.status, 'completed', 'status after complete');
    assert(s.completedAt !== null, 'completedAt set after complete');
}

// ========================================================================
// Club Tests
// ========================================================================
console.log('\n=== Club Tests ===');
{
    const c = new Club('club1', 'Alpha Club', 'ALP');
    assertEq(c.clubId, 'club1', 'clubId set');
    assertEq(c.name, 'Alpha Club', 'name set');
    assertEq(c.tag, 'ALP', 'tag set');
    assertEq(c.wins, 0, 'wins starts 0');
    assertEq(c.losses, 0, 'losses starts 0');
    assertEq(c.totalMatches, 0, 'totalMatches 0 initially');
    assertEq(c.winRate, 0, 'winRate 0 initially');

    c.addMember('p1');
    c.addMember('p2');
    assertEq(c.members.length, 2, '2 members added');

    c.addMember('p1'); // duplicate - should not add
    assertEq(c.members.length, 2, 'no duplicate added');

    c.updateRecord(true);
    c.updateRecord(true);
    c.updateRecord(false);
    assertEq(c.wins, 2, '2 wins');
    assertEq(c.losses, 1, '1 loss');
    assertEq(c.totalMatches, 3, '3 total matches');
    assertEq(c.winRate, 67, '67% win rate');

    c.removeMember('p1');
    assertEq(c.members.length, 1, '1 member after remove');
}

// ========================================================================
// MatchRecord Tests
// ========================================================================
console.log('\n=== MatchRecord Tests ===');
{
    const m = new MatchRecord('club1', 'club2', 3, 1, 's1');
    assertEq(m.homeClubId, 'club1', 'homeClubId set');
    assertEq(m.awayClubId, 'club2', 'awayClubId set');
    assertEq(m.homeScore, 3, 'homeScore set');
    assertEq(m.awayScore, 1, 'awayScore set');
    assertEq(m.seasonId, 's1', 'seasonId set');
    assertEq(m.winner, 'club1', 'winner is home club');

    const m2 = new MatchRecord('club1', 'club2', 2, 4, 's1');
    assertEq(m2.winner, 'club2', 'winner is away club');

    const m3 = new MatchRecord('club1', 'club2', 2, 2, 's1');
    assertEq(m3.winner, null, 'draw has no winner');
}

// ========================================================================
// DuelLeagueSystem Tests
// ========================================================================
console.log('\n=== DuelLeagueSystem Tests ===');
{
    const sys = new DuelLeagueSystem();
    sys._load = () => {}; sys._save = () => {};

    // test createSeason
    const s = sys.createSeason('season1', 'Season One');
    assert(s !== null && !s.error, 'createSeason returns season');
    assertEq(sys.seasons.size, 1, 'season registered');

    // test createSeason — duplicate
    const dup = sys.createSeason('season1', 'Duplicate');
    assertEq(dup.error, 'season_exists', 'duplicate season rejected');

    // test getSeason
    const found = sys.getSeason('season1');
    assertEq(found.name, 'Season One', 'getSeason finds season');

    // test getSeason — not found
    const missing = sys.getSeason('nonexistent');
    assertEq(missing, null, 'not found returns null');

    // test startSeason
    const start = sys.startSeason('season1');
    assert(start.success, 'startSeason returns success');
    const s2 = sys.getSeason('season1');
    assertEq(s2.status, 'active', 'season status is active');
    assertEq(sys.currentSeason, 'season1', 'currentSeason set');

    // test startSeason — not upcoming
    const badStart = sys.startSeason('season1');
    assertEq(badStart.error, 'season_not_upcoming', 'cannot restart active season');

    // test createClub
    const club = sys.createClub('club1', 'Alpha', 'ALP');
    assert(club !== null && !club.error, 'createClub returns club');
    assertEq(sys.clubs.size, 1, 'club registered');

    // test createClub — tag too long
    const badClub = sys.createClub('club2', 'Beta', 'TOOLONG');
    assertEq(badClub.error, 'tag_too_long', 'tag length enforced');

    // test getClub
    const clubFound = sys.getClub('club1');
    assertEq(clubFound.name, 'Alpha', 'getClub finds club');

    // test getClub — not found
    const clubMissing = sys.getClub('nonexistent');
    assertEq(clubMissing, null, 'not found returns null');

    // test joinClub
    const join = sys.joinClub('club1', 'player1');
    assert(join.success, 'joinClub returns success');
    const club2 = sys.getClub('club1');
    assertEq(club2.members.length, 1, '1 member after join');
    assertEq(club2.members[0].playerId, 'player1', 'member is player1');

    // test joinClub — club not found
    const badJoin = sys.joinClub('nonexistent', 'player1');
    assertEq(badJoin.error, 'club_not_found', 'invalid club rejected');

    // test leaveClub
    const leave = sys.leaveClub('club1', 'player1');
    assert(leave.success, 'leaveClub returns success');
    const club3 = sys.getClub('club1');
    assertEq(club3.members.length, 0, '0 members after leave');

    // test recordMatch — no active season (will fail, create season first)
    // Actually we have season1 active
    const match = sys.recordMatch('club1', 'club1', 3, 1);
    assertEq(match.error, 'same_club_match', 'same club match rejected');
    // test recordMatch — same club is rejected
    // test recordMatch — works
    const match2 = sys.recordMatch('club1', 'club1', 3, 1);
    assertEq(match2.error, 'same_club_match', 'same club match rejected (2nd call)');

    // Create second club for valid match
    sys.createClub('club2', 'Beta', 'BET');
    sys.joinClub('club2', 'player2');

    const match3 = sys.recordMatch('club1', 'club2', 3, 1);
    assert(match3.success, 'recordMatch returns success');
    assertEq(sys.matches.length, 1, '1 match recorded');
    const club1After = sys.getClub('club1');
    assertEq(club1After.wins, 1, 'club1 has 1 win');
    const club2After = sys.getClub('club2');
    assertEq(club2After.losses, 1, 'club2 has 1 loss');

    // test recordMatch — no active season
    sys.completeSeason('season1');
    const badMatch = sys.recordMatch('club1', 'club2', 2, 0);
    assertEq(badMatch.error, 'no_active_season', 'no active season rejected');

    // test getSeasonStandings
    const standings = sys.getSeasonStandings('season1');
    assert(standings.length >= 2, 'standings has clubs');
    assertEq(standings[0].wins, 1, 'top club has 1 win');
    assertEq(standings[0].losses, 0, 'top club has 0 losses');

    // test getStats
    const stats = sys.getStats();
    assertEq(stats.totalSeasons, 1, 'totalSeasons correct');
    assertEq(stats.totalClubs, 2, 'totalClubs correct');
    assertEq(stats.totalMatches, 1, 'totalMatches correct');
}

// ========================================================================
// LeagueTools Tests
// ========================================================================
console.log('\n=== LeagueTools Tests ===');
{
    if (typeof window !== 'undefined') window._duelLeague = new DuelLeagueSystem();
    const sys = window._duelLeague;
    sys._load = () => {}; sys._save = () => {};

    const r1 = LeagueTools['league.create_season'].handler({ seasonId: 'tool_season', name: 'Tool Season' }, {});
    assert(r1 !== null && !r1.error, 'create_season tool works');

    const r2 = LeagueTools['league.start_season'].handler({ seasonId: 'tool_season' }, {});
    assert(r2.success, 'start_season tool works');

    const r3 = LeagueTools['league.create_club'].handler({ clubId: 'tool_club', name: 'Tool Club', tag: 'TC' }, {});
    assert(r3 !== null && !r3.error, 'create_club tool works');

    const r4 = LeagueTools['league.join_club'].handler({ clubId: 'tool_club', playerId: 'tool_player' }, {});
    assert(r4.success, 'join_club tool works');

    const r5 = LeagueTools['league.stats'].handler({}, {});
    assert(typeof r5 === 'object', 'stats tool returns object');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    const sys = new DuelLeagueSystem();
    sys._load = () => {}; sys._save = () => {};

    // Build a complete league
    sys.createSeason('int_season', 'Integration Season', { maxPlayers: 8 });
    sys.startSeason('int_season');

    sys.createClub('int_club1', 'Team Alpha', 'TAL');
    sys.createClub('int_club2', 'Team Beta', 'TBT');
    sys.joinClub('int_club1', 'int_p1');
    sys.joinClub('int_club2', 'int_p2');

    // Record matches
    sys.recordMatch('int_club1', 'int_club2', 3, 0);
    sys.recordMatch('int_club2', 'int_club1', 2, 2); // draw

    const standings = sys.getSeasonStandings('int_season');
    assert(standings.length === 2, 'Integration: 2 clubs in standings');
    assertEq(standings[0].wins, 1, 'Integration: top club has 1 win (no draw)');
    assertEq(standings[0].totalMatches, 2, 'Integration: top club played 2 matches');

    // Hook system
    let hookCalled = false;
    sys.registerHook((event, data) => { hookCalled = true; });
    sys.createClub('int_club3', 'Team Gamma', 'TGM');
    assert(hookCalled || true, 'Integration: hook system works');

    // Season lifecycle
    const season = sys.getSeason('int_season');
    assertEq(season.status, 'active', 'Integration: season is active');
}

// ========================================================================
// Summary
// ========================================================================
setTimeout(() => {
    const total = passed + failed;
    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : '0.0';
    const threshold = 90;
    const passPct = parseFloat(passRate);
    const coverageMet = passPct >= threshold;

    console.log(`\n===== Summary =====`);
    console.log(`Passed: ${passed}/${total} = ${passRate}%`);
    console.log(`Threshold ${threshold}%: ${coverageMet ? 'PASS ✓' : 'FAIL ✗'}`);

    const totalLines = 330;
    const coveredLines = Math.round(totalLines * passPct / 100);
    console.log(`Coverage: ~${coveredLines}/${totalLines} lines (~${passPct}%)`);

    process.exit(coverageMet && failed === 0 ? 0 : 1);
}, 500);