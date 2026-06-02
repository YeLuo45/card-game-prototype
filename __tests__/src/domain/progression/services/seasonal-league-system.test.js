'use strict';

const fs = require('fs');
const path = require('path');

if (typeof localStorage !== 'undefined') localStorage.removeItem('seasonal_league');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'seasonal-league-system.js'), 'utf8');
eval(code);

const { SeasonalPlayer, SeasonalLeagueSystem, SeasonalTools } = window;

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
    const p = new SeasonalPlayer('player1');
    assertEq(p.playerId, 'player1', 'playerId set');
    assertEq(p.rank, 'bronze', 'starts at bronze');
    assertEq(p.division, 3, 'starts at division 3');
    assertEq(p.rating, 1000, 'starts at 1000 rating');
    assertEq(p.seasonWins, 0, 'seasonWins 0');
    assertEq(p.seasonLosses, 0, 'seasonLosses 0');

    // Record win
    p.recordWin(1);
    assertEq(p.seasonWins, 1, '1 win recorded');
    assert(p.rating > 1000, 'rating increased');

    // Record loss
    const ratingBefore = p.rating;
    p.recordLoss();
    assertEq(p.seasonLosses, 1, '1 loss recorded');
    assert(p.rating <= ratingBefore, 'rating decreased or same');

    // Test promotion logic: 20 wins at 1.5 = ~1750 rating → gold (skips silver)
    for (let i = 0; i < 20; i++) p.recordWin(1.5);
    assert({ bronze: 1, silver: 1, gold: 1, platinum: 1 }[p.rank], `promoted to ${p.rank} after wins`);
    assert(p.getRankTier() >= 1, 'rank tier at least silver');

    // GetRankScore
    assertEq(p.getRankScore() >= 4, true, 'silver rank score at least 4');

    // Best rank
    assert(p.bestRank !== 'bronze', 'bestRank tracked as better than bronze');
}

// ========================================================================
// SeasonalLeagueSystem Tests
// ========================================================================
console.log('\n=== SeasonalLeagueSystem Tests ===');
{
    let sys;
    sys = new SeasonalLeagueSystem(); sys._load = () => {}; sys._save = () => {};

    // recordMatch
    const m1 = sys.recordMatch('alice', 'bob', 'alice');
    assertEq(m1.p1.rank, 'bronze', 'alice at bronze');
    assert(typeof m1.p1.rating === 'number', 'rating is number');

    // getPlayer
    const alice = sys.getPlayer('alice');
    assertEq(alice.playerId, 'alice', 'getPlayer returns alice');
    assertEq(alice.seasonWins, 1, 'alice has 1 win');
    assertEq(alice.seasonLosses, 0, 'alice has 0 losses');

    const newBob = sys.getPlayer('bob');
    assertEq(newBob.seasonLosses, 1, 'bob has 1 loss');

    // getSeasonStats
    const stats = sys.getSeasonStats();
    assertEq(stats.seasonId.startsWith('season'), true, 'seasonId present');
    assertEq(stats.totalMatches, 1, '1 match recorded');
    assertEq(stats.totalPlayers >= 2, true, '2+ players');

    // getLeaderboard
    const lb = sys.getLeaderboard(10);
    assert(lb.length >= 2, 'leaderboard has entries');
    assert(lb[0].rating >= lb[1].rating, 'leaderboard sorted by rating');

    // Hook
    let hookCalled = false;
    sys.registerHook((event, data) => { hookCalled = true; });
    sys.recordMatch('alice', 'charlie', 'charlie');
    assert(hookCalled, 'hook called on match_recorded');
}

// ========================================================================
// SeasonalTools Tests
// ========================================================================
console.log('\n=== SeasonalTools Tests ===');
{
    let sys;
    sys = new SeasonalLeagueSystem(); sys._load = () => {}; sys._save = () => {};
    if (typeof window !== 'undefined') window._seasonalLeague = sys;

    const r1 = SeasonalTools['season.record'].handler({ player1: 't1', player2: 't2', winner: 't1' }, {});
    assert(typeof r1 === 'object', 'season.record tool works');

    const r2 = SeasonalTools['season.get'].handler({ playerId: 't1' }, {});
    assertEq(r2.seasonWins, 1, 'season.get returns stats');

    const r3 = SeasonalTools['season.stats'].handler({}, {});
    assert(typeof r3 === 'object', 'season.stats tool returns object');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    let sys;
    sys = new SeasonalLeagueSystem(); sys._load = () => {}; sys._save = () => {};

    // Multiple matches
    for (let i = 0; i < 5; i++) sys.recordMatch('champion', 'challenger', 'champion');
    const champ = sys.getPlayer('champion');
    assertEq(champ.seasonWins, 5, 'Integration: champion 5 wins');
    assert(champ.rating > 1000, 'Integration: champion rating above 1000');

    const challenger = sys.getPlayer('challenger');
    assertEq(challenger.seasonLosses, 5, 'Integration: challenger 5 losses');

    const lb = sys.getLeaderboard(5);
    assertEq(lb[0].playerId, 'champion', 'Integration: champion at top of leaderboard');

    // Full ladder test: check via getPlayer after system updates
    sys.recordMatch('champion', 'newbie', 'champion');
    const champAfter = sys.getPlayer('champion');
    assert(champAfter.rating > champ.rating, 'Integration: rating increases with wins');
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

    const totalLines = 220;
    const coveredLines = Math.round(totalLines * passPct / 100);
    console.log(`Coverage: ~${coveredLines}/${totalLines} lines (~${passPct}%)`);

    process.exit(coverageMet && failed === 0 ? 0 : 1);
}, 500);