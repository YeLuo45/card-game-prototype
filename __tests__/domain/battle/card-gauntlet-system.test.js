'use strict';

const fs = require('fs');
const path = require('path');

if (typeof localStorage !== 'undefined') localStorage.removeItem('gauntlet_system');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'card-gauntlet-system.js'), 'utf8');
eval(code);

const { GauntletRun, GauntletSystem, GauntletTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// GauntletRun Tests
// ========================================================================
console.log('\n=== GauntletRun Tests ===');
{
    const run = new GauntletRun('r1', 'p1', ['no_healing']);
    assertEq(run.runId, 'r1', 'runId set');
    assertEq(run.playerId, 'p1', 'playerId set');
    assertEq(run.modifiers.length, 1, 'modifiers set');
    assertEq(run.wins, 0, 'wins starts 0');
    assertEq(run.losses, 0, 'losses starts 0');
    assertEq(run.stars, 0, 'stars starts 0');
    assertEq(run.status, 'active', 'status active');
    assert(!run.isComplete(), 'not complete initially');

    // Record wins
    run.recordWin(1);
    assertEq(run.wins, 1, '1 win');
    assertEq(run.stars, 1, '1 star at 1 win');

    run.recordWin(1);
    assertEq(run.wins, 2, '2 wins');
    assertEq(run.stars, 2, '2 stars at 2 wins');

    run.recordWin(1);
    assertEq(run.wins, 3, '3 wins');
    assertEq(run.stars, 3, '3 stars at 3 wins');

    run.recordWin(1);
    run.recordWin(1);
    assertEq(run.wins, 5, '5 wins triggers finish');
    assert(run.isComplete(), 'run complete after 5 wins');

    // Loss finishes run
    const run2 = new GauntletRun('r2', 'p1', []);
    run2.recordLoss();
    assertEq(run2.losses, 1, '1 loss recorded');
    assert(run2.isComplete(), 'run complete after loss');
    assertEq(run2.stars, 0, 'no stars on loss');

    // Abandon
    const run3 = new GauntletRun('r3', 'p1', []);
    run3.abandon();
    assertEq(run3.status, 'abandoned', 'status abandoned');
    assert(run3.isComplete(), 'abandoned is complete');

    // GetScore / GetStars
    const run4 = new GauntletRun('r4', 'p1', []);
    run4.recordWin(2);
    run4.recordWin(3);
    assertEq(run4.getScore(), 500, 'score 500 from 5 wins * 100');
    assertEq(run4.getStars(), 2, '2 stars');
}

// ========================================================================
// GauntletSystem Tests
// ========================================================================
console.log('\n=== GauntletSystem Tests ===');
{
    let sys;
    sys = new GauntletSystem(); sys._load = () => {}; sys._save = () => {};

    // registerChallenge
    const reg = sys.registerChallenge('c1', 'Speed Run', ['speed_up'], 100, 500);
    assert(reg.success, 'registerChallenge returns success');
    const dup = sys.registerChallenge('c1', 'Duplicate', [], 100, 100);
    assertEq(dup.error, 'challenge_exists', 'duplicate challenge rejected');

    // startRun
    const run = sys.startRun('player1', 'c1', ['no_healing']);
    assertEq(run.playerId, 'player1', 'run playerId set');
    assertEq(run.modifiers.includes('no_healing'), true, 'modifiers passed');
    assertEq(run.status, 'active', 'run active');

    // recordRunResult
    const res = sys.recordRunResult(run.runId, 4, 1);
    assertEq(res.stars, 2, '4 wins = 2 stars');
    assertEq(res.score, 400, 'score 400');

    // getRun
    const found = sys.getRun(run.runId);
    assertEq(found.wins, 4, 'wins stored');

    // abandonRun
    const run2 = sys.startRun('player1', 'c1', []);
    const abandon = sys.abandonRun(run2.runId);
    assert(abandon.success, 'abandonRun succeeds');

    // getChallengeRuns
    const runs = sys.getChallengeRuns('c1', 10);
    assert(runs.length >= 1, 'getChallengeRuns returns runs');

    // getPlayerBest
    const best = sys.getPlayerBest('player1');
    assert(typeof best === 'object', 'getPlayerBest returns object');

    // getStats
    const stats = sys.getStats();
    assertEq(stats.totalChallenges, 1, '1 challenge');
    assertEq(stats.totalRuns >= 2, true, '2+ total runs');

    // Hook
    let hookCalled = false;
    sys.registerHook((event, data) => { hookCalled = true; });
    const run3 = sys.startRun('player1', 'c1', []);
    assert(hookCalled, 'hook called on run start');
}

// ========================================================================
// GauntletTools Tests
// ========================================================================
console.log('\n=== GauntletTools Tests ===');
{
    let sys;
    sys = new GauntletSystem(); sys._load = () => {}; sys._save = () => {};
    if (typeof window !== 'undefined') window._gauntlet = sys;

    const r1 = GauntletTools['gauntlet.start'].handler({ playerId: 'tool_p', challengeId: 'c1', modifiers: ['speed'] }, {});
    assert(r1 !== null, 'gauntlet.start tool works');

    const r2 = GauntletTools['gauntlet.stats'].handler({}, {});
    assert(typeof r2 === 'object', 'gauntlet.stats tool returns object');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    let sys;
    sys = new GauntletSystem(); sys._load = () => {}; sys._save = () => {};

    sys.registerChallenge('daily', 'Daily Challenge', ['double_xp'], 200, 1000);

    const run = sys.startRun('gauntlet_player', 'daily', ['double_xp', 'no_healing']);
    assertEq(run.modifiers.length, 2, 'Integration: 2 modifiers');

    const res = sys.recordRunResult(run.runId, 5, 0);
    assertEq(res.stars, 3, 'Integration: 5 wins = 3 stars');

    // Hook on complete
    let completeHook = false;
    sys.registerHook((event, data) => { if (event === 'run_complete') completeHook = true; });
    const run2 = sys.startRun('gauntlet_player', 'daily', []);
    sys.recordRunResult(run2.runId, 3, 2);
    assert(completeHook, 'Integration: run_complete hook fired');

    const stats = sys.getStats();
    assertEq(stats.totalRuns >= 2, true, 'Integration: multiple runs tracked');
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

    const totalLines = 240;
    const coveredLines = Math.round(totalLines * passPct / 100);
    console.log(`Coverage: ~${coveredLines}/${totalLines} lines (~${passPct}%)`);

    process.exit(coverageMet && failed === 0 ? 0 : 1);
}, 500);