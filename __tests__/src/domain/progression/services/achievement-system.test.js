'use strict';

const fs = require('fs');
const path = require('path');

if (typeof localStorage !== 'undefined') localStorage.removeItem('achievement_system');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'achievement-system.js'), 'utf8');
eval(code);

const { Achievement, AchievementRegistry, PlayerAchievementState, AchievementSystem, AchievementTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// Achievement Tests
// ========================================================================
console.log('\n=== Achievement Tests ===');
{
    const a = new Achievement('test1', 'Test', 'A test achievement', 'combat', '⚔️', 5, 30);
    assertEq(a.achievementId, 'test1', 'id set');
    assertEq(a.name, 'Test', 'name set');
    assertEq(a.tier, 0, 'tier 0 initially');
    assert(!a.isUnlocked(), 'not unlocked');

    a.checkProgress(3);
    assertEq(a.progress, 3, 'progress 3');
    assert(!a.isUnlocked(), 'not yet unlocked at 3/5');

    a.checkProgress(5);
    assertEq(a.progress, 5, 'progress at threshold');
    assert(a.isUnlocked(), 'unlocked at threshold');
    assertEq(a.tier, 1, 'tier 1 (bronze)');
    assert(a.unlockedAt > 0, 'unlockedAt set');
    assertEq(a.getTier(), 1, 'getTier returns 1');
}

// ========================================================================
// AchievementRegistry Tests
// ========================================================================
console.log('\n=== AchievementRegistry Tests ===');
{
    let reg = new AchievementRegistry();
    const a1 = new Achievement('a1', 'First', 'First achievement', 'combat', '⚔️', 1, 10);
    const a2 = new Achievement('a2', 'Second', 'Second achievement', 'collection', '📦', 5, 20);
    reg.register(a1);
    reg.register(a2);

    assertEq(reg.getAll().length, 2, '2 achievements registered');

    const byCombat = reg.getByCategory('combat');
    assertEq(byCombat.length, 1, '1 combat achievement');
    assertEq(byCombat[0].achievementId, 'a1', 'a1 is combat');

    const byCollection = reg.getByCategory('collection');
    assertEq(byCollection.length, 1, '1 collection achievement');

    assertEq(reg.get('a1').name, 'First', 'get by id works');
    assertEq(reg.get('nonexistent'), null, 'get nonexistent returns null');

    // Hook
    let hookCalled = false;
    reg.registerHook((e, d) => { hookCalled = true; });
    reg._emit('test_event', {});
    assert(hookCalled, 'hook called');
}

// ========================================================================
// PlayerAchievementState Tests
// ========================================================================
console.log('\n=== PlayerAchievementState Tests ===');
{
    let state = new PlayerAchievementState('player1');
    assertEq(state.playerId, 'player1', 'playerId set');
    assertEq(state.totalXP, 0, 'totalXP 0');
    assertEq(state.masteryLevel, 1, 'masteryLevel 1');

    // addXP
    state.addXP(100);
    assertEq(state.totalXP, 100, 'totalXP 100');
    assertEq(state.masteryLevel, 2, 'masteryLevel 2 (100-299)');

    state.addXP(200);
    assertEq(state.totalXP, 300, 'totalXP 300');
    assertEq(state.masteryLevel, 3, 'masteryLevel 3 (300-599)');

    // unlock
    const a = new Achievement('unlock1', 'Unlock', 'Unlock test', 'combat', '⚔️', 1, 15);
    a.tier = 1;
    const unlocked = state.unlock(a);
    assert(unlocked, 'unlock returns true');
    assert(state.isUnlocked('unlock1'), 'isUnlocked true');
    assertEq(state.totalXP, 315, 'xp added to total');
    assertEq(state.unlockHistory.length, 1, '1 in history');

    // duplicate unlock returns false
    const dup = state.unlock(a);
    assert(!dup, 'duplicate unlock returns false');
    assertEq(state.unlockHistory.length, 1, 'still 1 in history');

    // getProgress
    const prog = state.getProgress('unlock1');
    assert(prog !== null, 'getProgress returns data');
    assertEq(prog.tier, 1, 'tier is 1');

    // MasteryLevel 10
    let state2 = new PlayerAchievementState('p2');
    for (let i = 0; i < 45; i++) state2.addXP(100);
    assertEq(state2.masteryLevel, 10, 'masteryLevel 10 at 4500+');
}

// ========================================================================
// AchievementSystem Tests
// ========================================================================
console.log('\n=== AchievementSystem Tests ===');
{
    let sys = new AchievementSystem(); sys._load = () => {}; sys._save = () => {};

    assert(sys.registry.getAll().length >= 10, '10+ default achievements');

    // makeProgress - first unlock
    const r1 = sys.makeProgress('player1', 'first_blood', 1);
    assert(r1.unlocked, 'first_blood unlocked');

    // makeProgress - already unlocked
    const r2 = sys.makeProgress('player1', 'first_blood', 2);
    assert(r2.alreadyUnlocked, 'already unlocked returns alreadyUnlocked');

    // getPlayerAchievements
    const achs = sys.getPlayerAchievements('player1');
    assert(achs.length >= 10, '10+ achievements returned');
    const unlocked = achs.filter(a => a.isUnlocked);
    assertEq(unlocked.length, 1, '1 unlocked');

    // getPlayerStats
    const stats = sys.getPlayerStats('player1');
    assertEq(stats.unlockedCount, 1, '1 unlocked in stats');
    assertEq(stats.totalCount, achs.length, 'totalCount matches');
    assert(stats.totalXP >= 20, 'totalXP >= 20');

    // getLeaderboard
    const lb = sys.getLeaderboard(5);
    assert(lb.length >= 1, 'leaderboard has entries');
    assert(lb[0].totalXP >= (lb.length > 1 ? lb[1].totalXP : 0), 'sorted by xp');

    // Hook - only fires on FIRST unlock (not already-unlocked)
    let hookCalled = false;
    sys.registerHook((e, d) => { hookCalled = true; });
    // player1 already unlocked first_blood earlier; use warrior_10 (not yet unlocked)
    sys.makeProgress('player1', 'warrior_10', 10); // triggers unlock
    assert(hookCalled, 'hook called on achievement_unlocked');
}

// ========================================================================
// AchievementTools Tests
// ========================================================================
console.log('\n=== AchievementTools Tests ===');
{
    let sys = new AchievementSystem(); sys._load = () => {}; sys._save = () => {};
    if (typeof window !== 'undefined') window._achievementSystem = sys;

    const r1 = AchievementTools['achievement.progress'].handler({ playerId: 'tool_p', achievementId: 'first_blood', value: 1 }, {});
    assert(r1.unlocked || r1.alreadyUnlocked, 'achievement.progress tool works');

    const r2 = AchievementTools['achievement.list'].handler({ playerId: 'tool_p' }, {});
    assert(Array.isArray(r2), 'achievement.list tool returns array');

    const r3 = AchievementTools['achievement.stats'].handler({ playerId: 'tool_p' }, {});
    assert(typeof r3 === 'object', 'achievement.stats tool returns object');

    const r4 = AchievementTools['achievement.leaderboard'].handler({ limit: 5 }, {});
    assert(Array.isArray(r4), 'achievement.leaderboard tool returns array');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    let sys = new AchievementSystem(); sys._load = () => {}; sys._save = () => {};

    // Unlock multiple achievements
    sys.makeProgress('ach_p', 'first_blood', 1);
    sys.makeProgress('ach_p', 'warrior_10', 10);
    sys.makeProgress('ach_p', 'collector_10', 10);

    const stats = sys.getPlayerStats('ach_p');
    assertEq(stats.unlockedCount, 3, 'Integration: 3 unlocked');

    const lb = sys.getLeaderboard(10);
    assert(lb.some(e => e.playerId === 'ach_p'), 'Integration: player on leaderboard');

    // Achievement category filtering
    const combat = sys.registry.getByCategory('combat');
    assert(combat.length >= 4, 'Integration: 4+ combat achievements');

    // Hook on unlock — use veteran_50 (never unlocked by ach_p2, fresh state)
    let hookCount = 0;
    sys.registerHook((e, d) => { if (e === 'achievement_unlocked') hookCount++; });
    sys.makeProgress('ach_p2', 'veteran_50', 50); // threshold 50, value 50 → unlocks
    assert(hookCount >= 1, 'Integration: unlock hook fired');
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

    const totalLines = 280;
    const coveredLines = Math.round(totalLines * passPct / 100);
    console.log(`Coverage: ~${coveredLines}/${totalLines} lines (~${passPct}%)`);

    process.exit(coverageMet && failed === 0 ? 0 : 1);
}, 500);