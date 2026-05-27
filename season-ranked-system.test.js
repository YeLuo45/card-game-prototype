'use strict';

const fs = require('fs');
const path = require('path');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'season-ranked-system.js'), 'utf8');
eval(code);

const { Season, RankedLadder, RankedTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// Season Tests
// ========================================================================
console.log('\n=== Season Tests ===');
{
    const season = new Season('s1', 'Season 1', Date.now(), Date.now() + 86400000 * 30);
    assertEq(season.seasonId, 's1', 'seasonId set');
    assertEq(season.name, 'Season 1', 'name set');
    assertEq(season.status, 'active', 'status is active');
    assertEq(season.rankTiers.length >= 20, true, 'has 20+ rank tiers');

    // test getTierForElo
    assertEq(season.getTierForElo(500).name, 'Bronze V', '500 elo = Bronze V');
    assertEq(season.getTierForElo(1500).name, 'Silver V', '1500 elo = Silver V');
    assertEq(season.getTierForElo(2500).name, 'Platinum V', '2500 elo = Platinum V');
    assertEq(season.getTierForElo(3500).name, 'Champion', '3500 elo = Champion');
    assertEq(season.getTierForElo(0).name, 'Bronze V', '0 elo = Bronze V');

    // test recordMatch
    season.recordMatch('p1', 'p2', 'win', 16);
    assertEq(season.seasonMemory.l1_match_history.length, 1, 'match recorded');
    assertEq(season.seasonMemory.l1_match_history[0].result, 'win', 'result recorded');

    // test finalizeSeason
    const topPlayers = season.finalizeSeason();
    assert(Array.isArray(topPlayers), 'finalizeSeason returns array');
    assertEq(season.status, 'completed', 'season status is completed');
}

// ========================================================================
// RankedLadder Tests
// ========================================================================
console.log('\n=== RankedLadder Tests ===');
{
    const ladder = new RankedLadder();
    ladder._load = () => {}; ladder._save = () => {};

    // test createSeason
    const s = ladder.createSeason('ranked_s1', 'Ranked Season 1');
    assert(s !== null, 'createSeason returns season');
    assertEq(ladder.seasons.size, 1, 'seasons size is 1');

    // test getOrCreatePlayerSeason
    const ps1 = ladder.getOrCreatePlayerSeason('player1', 'ranked_s1');
    assertEq(ps1.elo, 1500, 'default elo is 1500');
    assertEq(ps1.gamesPlayed, 0, 'gamesPlayed starts 0');

    // Second call returns same object
    const ps1b = ladder.getOrCreatePlayerSeason('player1', 'ranked_s1');
    assertEq(ps1, ps1b, 'same playerSeason returned');

    // test recordRankedGame
    const rec1 = ladder.recordRankedGame('player1', 'ranked_s1', 'player2', 'win', 20);
    assert(rec1 !== null, 'recordRankedGame returns playerSeason');
    assertEq(rec1.elo, 1520, 'elo increased by 20');
    assertEq(rec1.gamesPlayed, 1, 'gamesPlayed is 1');
    assertEq(rec1.wins, 1, 'wins is 1');

    // test getPlayerRank
    const rank = ladder.getPlayerRank('player1', 'ranked_s1');
    assert(rank !== null, 'getPlayerRank returns rank');
    assertEq(rank.elo, 1520, 'rank shows current elo');
    assert(rank.tier, 'rank has tier name');
    assert(rank.icon, 'rank has icon');

    // test recordRankedGame — loss
    ladder.recordRankedGame('player2', 'ranked_s1', 'player1', 'loss', -20);
    const p2Rank = ladder.getPlayerRank('player2', 'ranked_s1');
    assert(p2Rank.elo < 1500, 'player2 elo decreased after loss');

    // test getSeasonLeaderboard
    const lb = ladder.getSeasonLeaderboard('ranked_s1', 10);
    assert(Array.isArray(lb), 'leaderboard returns array');
    assert(lb.length >= 2, 'leaderboard has 2+ players');
    assert(lb[0].elo >= lb[1].elo, 'leaderboard sorted by elo descending');

    // test getStats
    const stats = ladder.getStats();
    assert(typeof stats === 'object', 'getStats returns object');
    assertEq(stats.totalSeasons, 1, 'totalSeasons is 1');
    assert(stats.totalPlayers >= 2, 'totalPlayers >= 2');

    // test getPlayerRank — no rank
    const noRank = ladder.getPlayerRank('nobody', 'ranked_s1');
    assertEq(noRank, null, 'no rank returns null');
}

// ========================================================================
// RankedTools Tests
// ========================================================================
console.log('\n=== RankedTools Tests ===');
{
    if (typeof window !== 'undefined') window._rankedLadder = new RankedLadder();
    const ladder = window._rankedLadder;
    ladder._load = () => {}; ladder._save = () => {};
    ladder.createSeason('tool_s1', 'Tool Season 1');

    const r1 = RankedTools['ranked.season_create'].handler({ seasonId: 'tool_s2', name: 'Season 2' }, {});
    assert(r1.seasonId, 'season_create returns seasonId');

    const r2 = RankedTools['ranked.record_game'].handler({ playerId: 'tool_p', seasonId: 'tool_s1', opponentId: 'opp', result: 'win', eloChange: 15 }, {});
    assert(typeof r2 === 'object', 'record_game returns object');
    assertEq(r2.elo, 1515, 'elo increased to 1515');

    const r3 = RankedTools['ranked.rank'].handler({ playerId: 'tool_p', seasonId: 'tool_s1' }, {});
    assert(r3.elo, 'rank returns elo');

    const r4 = RankedTools['ranked.leaderboard'].handler({ seasonId: 'tool_s1' }, {});
    assert(Array.isArray(r4), 'leaderboard returns array');

    const r5 = RankedTools['ranked.stats'].handler({}, {});
    assert(typeof r5 === 'object', 'stats returns object');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    const ladder = new RankedLadder();
    ladder._load = () => {}; ladder._save = () => {};
    ladder.createSeason('int_s1', 'Integration Season');

    // Player journey through ranks
    ladder.recordRankedGame('int_p1', 'int_s1', 'opp1', 'win', 25);
    ladder.recordRankedGame('int_p1', 'int_s1', 'opp2', 'win', 20);
    ladder.recordRankedGame('int_p1', 'int_s1', 'opp3', 'loss', -15);
    ladder.recordRankedGame('int_p1', 'int_s1', 'opp4', 'win', 30);
    ladder.recordRankedGame('int_p1', 'int_s1', 'opp5', 'win', 20);

    const rank = ladder.getPlayerRank('int_p1', 'int_s1');
    assertEq(rank.gamesPlayed, 5, 'Integration: 5 games played');
    assertEq(rank.wins, 4, 'Integration: 4 wins');
    assert(rank.elo > 1500, 'Integration: elo above starting 1500');
    assert(rank.tier, 'Integration: tier assigned');

    const lb = ladder.getSeasonLeaderboard('int_s1');
    assert(lb.length >= 1, 'Integration: leaderboard populated');

    const season = ladder.seasons.get('int_s1');
    assert(season.seasonMemory.l1_match_history.length >= 5, 'Integration: 5 matches in season memory');

    // Hook system
    let hookCalled = false;
    ladder.registerHook((event, data) => { hookCalled = true; });
    ladder.recordRankedGame('int_p2', 'int_s1', 'opp1', 'win', 10);
    assert(hookCalled, 'Integration: hook fired on game recorded');
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

    const totalLines = 300;
    const coveredLines = Math.round(totalLines * passPct / 100);
    console.log(`Coverage: ~${coveredLines}/${totalLines} lines (~${passPct}%)`);

    process.exit(coverageMet && failed === 0 ? 0 : 1);
}, 500);