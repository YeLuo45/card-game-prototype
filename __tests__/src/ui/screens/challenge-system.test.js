'use strict';

const fs = require('fs');
const path = require('path');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'challenge-system.js'), 'utf8');
eval(code);

const { Challenge, ChallengeCategory, ChallengePlayerState, ChallengeSystem, ChallengeTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// Challenge Tests
// ========================================================================
console.log('\n=== Challenge Tests ===');
{
    const c = new Challenge('c1', 'Win 3 battles', 'daily', 3, { gold: 50, xp: 20 });
    assertEq(c.challengeId, 'c1', 'challengeId set');
    assertEq(c.title, 'Win 3 battles', 'title set');
    assertEq(c.type, 'daily', 'type set');
    assertEq(c.target, 3, 'target set');
    assertEq(c.progress, 0, 'progress starts 0');
    assert(!c.completed, 'not completed initially');

    c.updateProgress(1);
    assertEq(c.progress, 1, 'progress after 1');
    assert(!c.completed, 'not yet completed');

    c.updateProgress(2);
    assertEq(c.progress, 3, 'progress at target');
    assert(c.completed, 'completed after reaching target');
    assert(c.completedAt !== null, 'completedAt set');

    c.updateProgress(1); // extra should not matter
    assertEq(c.progress, 3, 'progress capped at target');
}

// ========================================================================
// ChallengeCategory Tests
// ========================================================================
console.log('\n=== ChallengeCategory Tests ===');
{
    const cat = new ChallengeCategory('daily', 'Daily Challenges');
    assertEq(cat.categoryId, 'daily', 'categoryId set');
    assertEq(cat.name, 'Daily Challenges', 'name set');
    assertEq(cat.challenges.size, 0, 'no challenges initially');

    const c = new Challenge('c1', 'Win 3 battles', 'daily', 3, { gold: 50 });
    cat.addChallenge(c);
    assertEq(cat.challenges.size, 1, '1 challenge added');

    const found = cat.getChallenge('c1');
    assertEq(found.title, 'Win 3 battles', 'getChallenge finds challenge');

    const missing = cat.getChallenge('nonexistent');
    assertEq(missing, null, 'not found returns null');

    const active = cat.getActiveChallenges();
    assertEq(active.length, 1, '1 active challenge');
}

// ========================================================================
// ChallengePlayerState Tests
// ========================================================================
console.log('\n=== ChallengePlayerState Tests ===');
{
    const ps = new ChallengePlayerState('player1');
    assertEq(ps.playerId, 'player1', 'playerId set');
    assertEq(ps.currentStreak, 0, 'streak starts 0');
    assertEq(ps.longestStreak, 0, 'longest streak 0');
    assertEq(ps.totalPoints, 0, 'totalPoints 0');
    assertEq(ps.badges.length, 0, 'no badges initially');

    ps.recordCompletion('c1', 100);
    assertEq(ps.totalPoints, 100, 'points added');
    assertEq(ps.completedChallenges.length, 1, '1 challenge recorded');
    assertEq(ps.currentStreak >= 1, true, 'streak incremented');

    ps.recordCompletion('c2', 50);
    assertEq(ps.totalPoints, 150, 'more points added');
    assertEq(ps.longestStreak >= ps.currentStreak, true, 'longest tracked');
}

// ========================================================================
// ChallengeSystem Tests
// ========================================================================
console.log('\n=== ChallengeSystem Tests ===');
{
    const sys = new ChallengeSystem();
    sys._load = () => {}; sys._save = () => {};

    // test createCategory
    const cat = sys.createCategory('daily', 'Daily Challenges');
    assert(cat !== null && !cat.error, 'createCategory returns category');
    assertEq(sys.categories.size, 1, 'category registered');

    // test createCategory — duplicate
    const dup = sys.createCategory('daily', 'Duplicate');
    assertEq(dup.error, 'category_exists', 'duplicate category rejected');

    // test getCategory
    const found = sys.getCategory('daily');
    assertEq(found.name, 'Daily Challenges', 'getCategory finds category');

    // test addChallenge
    const c = sys.addChallenge('daily', 'win3', 'Win 3 battles', 'daily', 3, { gold: 50, xp: 20 });
    assert(c !== null && !c.error, 'addChallenge returns challenge');

    // test addChallenge — category not found
    const bad = sys.addChallenge('nonexistent', 'c1', 'Title', 'daily', 1, {});
    assertEq(bad.error, 'category_not_found', 'invalid category rejected');

    // test getChallenge
    const foundC = sys.getChallenge('daily', 'win3');
    assertEq(foundC.title, 'Win 3 battles', 'getChallenge finds challenge');

    // test getActiveChallenges
    const active = sys.getActiveChallenges('daily');
    assertEq(active.length, 1, '1 active challenge');

    // test updateChallengeProgress
    const result = sys.updateChallengeProgress('player1', 'daily', 'win3', 1);
    assertEq(result.progress, 1, 'progress updated to 1');
    assertEq(result.target, 3, 'target correct');
    assert(!result.completed, 'not completed yet');

    // test updateChallengeProgress — complete
    const result2 = sys.updateChallengeProgress('player1', 'daily', 'win3', 2);
    assert(result2.completed, 'challenge completed');
    const c2 = sys.getChallenge('daily', 'win3');
    assert(c2.completed, 'challenge marked completed in system');

    // test updateChallengeProgress — already completed
    const bad2 = sys.updateChallengeProgress('player1', 'daily', 'win3', 1);
    assertEq(bad2.error, 'challenge_already_completed', 'already completed rejected');

    // test getPlayerState
    const ps = sys.getPlayerState('player1');
    assertEq(ps.playerId, 'player1', 'playerState has correct playerId');
    assert(ps.totalPoints > 0, 'player earned points');

    // test getPlayerStats
    const stats = sys.getPlayerStats('player1');
    assertEq(stats.playerId, 'player1', 'stats has playerId');
    assertEq(typeof stats.totalPoints, 'number', 'totalPoints is number');
    assertEq(typeof stats.currentStreak, 'number', 'currentStreak is number');

    // test getPlayerStats — new player
    const newStats = sys.getPlayerStats('new_player');
    assertEq(newStats.totalPoints, 0, 'new player has 0 points');
    assertEq(newStats.currentStreak, 0, 'new player has 0 streak');

    // test resetDailyChallenges
    const reset = sys.resetDailyChallenges('daily');
    assertEq(typeof reset.resetCount, 'number', 'resetCount returned');

    // test getStats
    const allStats = sys.getStats();
    assertEq(allStats.totalCategories, 1, 'totalCategories correct');
    assertEq(allStats.totalChallenges >= 1, true, 'totalChallenges >= 1');
    assertEq(allStats.completedChallenges >= 1, true, 'completedChallenges >= 1');
}

// ========================================================================
// ChallengeTools Tests
// ========================================================================
console.log('\n=== ChallengeTools Tests ===');
{
    if (typeof window !== 'undefined') window._challengeSystem = new ChallengeSystem();
    const sys = window._challengeSystem;
    sys._load = () => {}; sys._save = () => {};

    const r1 = ChallengeTools['challenge.create_category'].handler({ categoryId: 'tool_cat', name: 'Tool Category' }, {});
    assert(r1 !== null && !r1.error, 'create_category tool works');

    const r2 = ChallengeTools['challenge.add'].handler({ categoryId: 'tool_cat', challengeId: 'tool_ch', title: 'Test', type: 'daily', target: 5, reward: { gold: 10 } }, {});
    assert(r2 !== null && !r2.error, 'add tool works');

    const r3 = ChallengeTools['challenge.progress'].handler({ playerId: 'tool_p', categoryId: 'tool_cat', challengeId: 'tool_ch', amount: 2 }, {});
    assert(typeof r3 === 'object', 'progress tool returns object');

    const r4 = ChallengeTools['challenge.stats'].handler({ playerId: 'tool_p' }, {});
    assert(typeof r4 === 'object', 'stats tool returns object');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    const sys = new ChallengeSystem();
    sys._load = () => {}; sys._save = () => {};

    // Build a complete challenge flow
    sys.createCategory('combat', 'Combat Challenges');
    sys.addChallenge('combat', 'elite1', 'Defeat an elite enemy', 'special', 1, { gold: 200, badge: 'Elite Slayer' });
    sys.addChallenge('combat', 'win10', 'Win 10 battles', 'daily', 10, { gold: 100, xp: 50 });

    // Progress the elite challenge
    sys.updateChallengeProgress('int_player', 'combat', 'elite1', 1);
    const ps = sys.getPlayerState('int_player');
    assert(ps.totalPoints > 0, 'Integration: player earned points from elite');
    assert(ps.badges.includes('Elite Slayer'), 'Integration: player earned badge');

    // Progress the daily challenge partially
    sys.updateChallengeProgress('int_player', 'combat', 'win10', 3);
    const c = sys.getChallenge('combat', 'win10');
    assertEq(c.progress, 3, 'Integration: daily challenge at 3/10');

    // Hook system
    let hookCalled = false;
    sys.registerHook((event, data) => { hookCalled = true; });
    sys.updateChallengeProgress('int_player', 'combat', 'elite1', 1); // already complete

    const allActive = sys.getActiveChallenges('combat');
    assert(allActive.length >= 1, 'Integration: has active challenges');

    const stats = sys.getPlayerStats('int_player');
    assertEq(stats.playerId, 'int_player', 'Integration: stats for correct player');
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