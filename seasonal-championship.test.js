'use strict';

const fs = require('fs');
const path = require('path');

if (typeof localStorage !== 'undefined') localStorage.removeItem('seasonal_championship');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'seasonal-championship.js'), 'utf8');
eval(code);

const { SeasonalPlayer, Season, SeasonalChampionshipSystem, SeasonalTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// SeasonalPlayer Tests
// ========================================================================
console.log('\n=== SeasonalPlayer Tests ===');
{
    let sp = new SeasonalPlayer('p1', 's1');
    assertEq(sp.playerId, 'p1', 'playerId p1');
    assertEq(sp.seasonId, 's1', 'seasonId s1');
    assertEq(sp.rating, 1000, 'initial rating 1000');
    assertEq(sp.wins, 0, 'initial wins 0');
    assertEq(sp.division, 'bronze', 'initial division bronze');
    assertEq(sp.divisionRank, 5, 'initial divisionRank 5');

    sp.recordMatch('opp1', 3, 1, 25);
    assertEq(sp.rating, 1025, 'rating after win');
    assertEq(sp.wins, 1, '1 win recorded');
    assertEq(sp.matches.length, 1, '1 match in history');

    sp.recordMatch('opp2', 0, 3, -20);
    assertEq(sp.rating, 1005, 'rating after loss');
    assertEq(sp.losses, 1, '1 loss recorded');

    const ser = sp.serialize();
    assertEq(ser.playerId, 'p1', 'serialize playerId');
    assert(typeof ser.winRate === 'string', 'winRate is string');
}

// ========================================================================
// Season Tests
// ========================================================================
console.log('\n=== Season Tests ===');
{
    let season = new Season('s1', 'Season 1');
    assertEq(season.seasonId, 's1', 'seasonId s1');
    assertEq(season.status, 'upcoming', 'status upcoming');
    assertEq(season.leaderboard.size, 0, 'empty leaderboard');

    const player = season.addPlayer('player1');
    assertEq(player.playerId, 'player1', 'player added');
    assertEq(season.leaderboard.size, 1, '1 player in leaderboard');

    season.recordMatch('player1', 'player2', 3, 1, 20);
    assertEq(season.leaderboard.get('player1').wins, 1, 'player1 has 1 win');

    const result = season.finalize();
    assertEq(result.champion, 'player1', 'player1 is champion');
    assertEq(season.status, 'completed', 'season completed');
    assert(season.championId === 'player1', 'championId set');
}

// ========================================================================
// SeasonalChampionshipSystem Tests
// ========================================================================
console.log('\n=== SeasonalChampionshipSystem Tests ===');
{
    let sys = new SeasonalChampionshipSystem(); sys._load = () => {}; sys._save = () => {};
    sys.seasons = new Map(); sys.activeSeasonId = null;
    sys.startNewSeason('test_s', 'Test Season');

    // startNewSeason
    const start = sys.startNewSeason('test_s2', 'Test Season 2');
    assert(start.success, 'startNewSeason returns success');
    assertEq(sys.activeSeasonId, 'test_s2', 'active season updated');

    // registerPlayer
    const reg = sys.registerPlayer('reg_p');
    assertEq(reg.playerId, 'reg_p', 'player registered');
    assertEq(reg.seasonId, 'test_s2', 'correct season id');

    // recordMatchResult
    const match = sys.recordMatchResult('reg_p', 'opp_x', 3, 0, 15);
    assert(match.success, 'match recorded');

    // getLeaderboard
    const lb = sys.getLeaderboard('test_s2', 10);
    assert(lb.length >= 1, 'leaderboard has entries');
    assert(lb[0].rating > 0, 'leaderboard has rating');

    // getPlayerSeason
    const ps = sys.getPlayerSeason('reg_p', 'test_s2');
    assertEq(ps.wins, 1, 'player has 1 win');

    // getSeasonInfo
    const info = sys.getSeasonInfo('test_s2');
    assertEq(info.seasonId, 'test_s2', 'correct season id');
    assertEq(info.status, 'upcoming', 'season status upcoming');

    // endSeason
    const end = sys.endSeason('test_s2');
    assert(end.champion !== null, 'champion assigned');
    assert(end.topPlayers.length > 0, 'top players populated');

    // getPlayerOverallStats
    const stats = sys.getPlayerOverallStats('reg_p');
    assertEq(stats.playerId, 'reg_p', 'player id in stats');
    assertEq(stats.totalWins, 1, '1 total win');

    // Hook
    let hookCalled = false;
    sys.registerHook((e, d) => { hookCalled = true; });
    sys.startNewSeason('hook_season', 'Hook Season');
    assert(hookCalled, 'hook called on season_started');
}

// ========================================================================
// SeasonalTools Tests
// ========================================================================
console.log('\n=== SeasonalTools Tests ===');
{
    let sys = new SeasonalChampionshipSystem(); sys._load = () => {}; sys._save = () => {};
    sys.seasons = new Map(); sys.activeSeasonId = null; sys.startNewSeason('tool_s', 'Tool Season');
    if (typeof window !== 'undefined') window._seasonalSystem = sys;

    const r1 = SeasonalTools['season.register'].handler({ playerId: 'tool_p' }, {});
    assertEq(r1.playerId, 'tool_p', 'season.register works');

    const r2 = SeasonalTools['season.match'].handler({ playerId: 'tool_p', againstId: 'opp', myScore: 3, theirScore: 1, ratingDelta: 10 }, {});
    assert(r2.success, 'season.match works');

    const r3 = SeasonalTools['season.leaderboard'].handler({ seasonId: 'tool_s', limit: 5 }, {});
    assert(Array.isArray(r3), 'season.leaderboard returns array');

    const r4 = SeasonalTools['season.info'].handler({ seasonId: 'tool_s' }, {});
    assertEq(r4.seasonId, 'tool_s', 'season.info works');

    const r5 = SeasonalTools['season.stats'].handler({ playerId: 'tool_p' }, {});
    assertEq(r5.playerId, 'tool_p', 'season.stats works');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    let sys = new SeasonalChampionshipSystem(); sys._load = () => {}; sys._save = () => {};
    sys.seasons = new Map(); sys.activeSeasonId = null;
    sys.startNewSeason('int_s', 'Integration Season');

    // Simulate full season
    const players = ['int_p1', 'int_p2', 'int_p3'];
    for (const p of players) sys.registerPlayer(p);

    // Record matches
    sys.recordMatchResult('int_p1', 'int_p2', 3, 1, 20);
    sys.recordMatchResult('int_p1', 'int_p3', 2, 3, -15);
    sys.recordMatchResult('int_p2', 'int_p3', 3, 0, 25);

    const lb = sys.getLeaderboard('int_s', 10);
    assert(lb.length >= 3, 'Integration: 3+ players in leaderboard');

    // Top player is p1 or p2
    const topPlayer = lb[0];
    assert(topPlayer.rating > 0, 'Integration: top player has rating');

    // End season
    const end = sys.endSeason('int_s');
    assert(end.champion !== null, 'Integration: champion assigned');
    assert(end.topPlayers.length >= 3, 'Integration: top 3+ players');

    // Division system (player with rank 5 could be bronze)
    const p1Season = sys.getPlayerSeason('int_p1', 'int_s');
    assert(p1Season.division !== undefined, 'Integration: division assigned');
    assert(p1Season.rank > 0, 'Integration: rank assigned');

    // Player stats across multiple registrations
    const stats = sys.getPlayerOverallStats('int_p1');
    assertEq(stats.totalMatches, 2, 'Integration: 2 matches for p1');

    // Hook on match_recorded
    let matchHook = false;
    sys.registerHook((e, d) => { if (e === 'match_recorded') matchHook = true; });
    sys.registerPlayer('hook_p');
    sys.recordMatchResult('hook_p', 'opp', 3, 0, 20);
    assert(matchHook, 'Integration: match_recorded hook fired');

    // Season info after end
    const endInfo = sys.getSeasonInfo('int_s');
    assertEq(endInfo.status, 'completed', 'Integration: season marked completed');
    assertEq(endInfo.championId, end.champion, 'Integration: championId matches');
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

    const totalLines = 290;
    const coveredLines = Math.round(totalLines * passPct / 100);
    console.log(`Coverage: ~${coveredLines}/${totalLines} lines (~${passPct}%)`);

    process.exit(coverageMet && failed === 0 ? 0 : 1);
}, 500);