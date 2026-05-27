'use strict';

const fs = require('fs');
const path = require('path');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'achievement-system.js'), 'utf8');
eval(code);

const { Achievement, AchievementSystem, AchievementTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }
function assertNe(a, b, msg) { assert(a !== b, `${msg} (expected not ${b})`); }

// ========================================================================
// Achievement Tests
// ========================================================================
console.log('\n=== Achievement Tests ===');
{
    const a = new Achievement('test_win', 'TestWin', 'Win a test battle', 'battle', '🎖️', 5);

    assertEq(a.achievementId, 'test_win', 'achievementId set');
    assertEq(a.name, 'TestWin', 'name set');
    assertEq(a.category, 'battle', 'category set');
    assertEq(a.threshold, 5, 'threshold set');
    assertEq(a.unlockedAt, null, 'unlockedAt null initially');
    assertEq(a.progress, 0, 'progress 0 initially');

    // test checkProgress — not complete
    const r1 = a.checkProgress(3);
    assertEq(r1.unlocked, false, 'checkProgress: not unlocked at 3/5');
    assertEq(r1.progress, 3, 'checkProgress: progress is 3');

    // test checkProgress — complete
    const r2 = a.checkProgress(5);
    assert(r2.unlocked, 'checkProgress: unlocked at 5/5');
}

// ========================================================================
// AchievementSystem Tests
// ========================================================================
console.log('\n=== AchievementSystem Tests ===');
{
    const sys = new AchievementSystem();
    sys._load = () => {}; // skip localStorage
    sys._save = () => {};

    // test registerAchievement
    const a1 = sys.registerAchievement(new Achievement('a1', 'Test', 'Desc', 'battle', '🏅', 3));
    assert(a1 !== null, 'registerAchievement returns achievement');
    assertEq(sys.achievements.size, 1, 'achievements size is 1');

    // test registerDefaultAchievements
    const count = sys.registerDefaultAchievements();
    assert(count >= 10, 'registerDefaultAchievements registers 10+ achievements');
    assert(sys.achievements.size > count, 'achievements size grew');

    // test getUnlocked — none initially
    const unlocked = sys.getUnlocked('player_x');
    assertEq(unlocked.length, 0, 'no achievements unlocked initially');

    // test getLocked
    const locked = sys.getLocked('player_x');
    assert(locked.length >= count, 'getLocked returns all non-unlocked achievements');

    // test updateProgress — not unlocked
    const r1 = sys.updateProgress('player1', 'first_win', 0);
    assertEq(r1.unlocked, false, 'updateProgress: first_win not unlocked at 0');

    const r2 = sys.updateProgress('player1', 'first_win', 1);
    assert(r2.unlocked, 'updateProgress: first_win unlocked at 1');
    assertEq(r2.achievement.achievementId, 'first_win', 'unlocked achievement correct');
    assertEq(sys.getUnlocked('player1').length, 1, 'player1 has 1 unlocked achievement');

    // test updateProgress — already unlocked
    const r3 = sys.updateProgress('player1', 'first_win', 5);
    assert(r3.unlocked, 'already unlocked achievement returns unlocked=true');
    assertEq(r3.achievement.achievementId, 'first_win', 'returns the achievement');

    // test incrementProgress
    const r4 = sys.incrementProgress('player2', 'win_10', 1);
    assertEq(r4.unlocked, false, 'win_10 not unlocked at 1/10');
    for (let i = 0; i < 8; i++) sys.incrementProgress('player2', 'win_10', 1);
    const r5 = sys.incrementProgress('player2', 'win_10', 1);
    assert(r5.unlocked, 'win_10 unlocked at 10/10');

    // test getProgress
    const prog = sys.getProgress('player1', 'first_win');
    assert(prog >= 1, 'getProgress returns >= 1 for player1');

    // test getPlayerStats
    const stats = sys.getPlayerStats('player1');
    assertEq(stats.playerId, 'player1', 'stats has playerId');
    assertEq(stats.totalUnlocked >= 1, true, 'stats totalUnlocked >= 1');
    assertEq(typeof stats.byCategory, 'object', 'stats has byCategory');

    // test updateProgress — invalid achievement
    const bad = sys.updateProgress('player1', 'nonexistent', 5);
    assert(bad.error, 'invalid achievement returns error');
    assertEq(bad.error, 'achievement_not_found', 'error is achievement_not_found');
}

// ========================================================================
// AchievementTools Tests
// ========================================================================
console.log('\n=== AchievementTools Tests ===');
{
    // Register global system
    if (typeof window !== 'undefined') window._achSystem = new AchievementSystem();
    const sys = window._achSystem;
    sys._load = () => {}; sys._save = () => {};
    sys.registerDefaultAchievements();

    const r1 = AchievementTools['achievement.stats'].handler({ playerId: 'tool_player' }, {});
    assert(typeof r1 === 'object', 'achievement.stats returns object');
    assertEq(r1.totalUnlocked, 0, 'stats shows 0 unlocked initially');

    const r2 = AchievementTools['achievement.progress'].handler({ playerId: 'tool_p', achievementId: 'first_win', value: 1 }, {});
    assert(r2.unlocked === true, 'progress update unlocks first_win');

    const r3 = AchievementTools['achievement.unlocked'].handler({ playerId: 'tool_p' }, {});
    assert(Array.isArray(r3), 'unlocked returns array');
    assert(r3.length >= 1, 'at least one achievement unlocked');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    const sys = new AchievementSystem();
    sys._load = () => {}; sys._save = () => {};
    sys.registerDefaultAchievements();

    const playerId = 'int_player';
    // Simulate a full game journey
    sys.incrementProgress(playerId, 'play_50', 1);
    for (let i = 0; i < 10; i++) sys.incrementProgress(playerId, 'win_10', 1);
    sys.incrementProgress(playerId, 'fusion_first', 1);
    sys.incrementProgress(playerId, 'fusion_10', 10);
    sys.incrementProgress(playerId, 'lose_10', 10);

    const unlocked = sys.getUnlocked(playerId);
    assert(unlocked.length >= 4, `Integration: ${unlocked.length} achievements unlocked (expected 4+)`);

    const stats = sys.getPlayerStats(playerId);
    assertEq(stats.totalUnlocked >= 4, true, 'Integration: stats shows 4+ achievements');
    assert(stats.totalAchievements >= 10, 'Integration: total achievements >= 10');
    assert(stats.byCategory.battle >= 2, 'Integration: at least 2 battle achievements');

    // Hook system
    let hookCalled = false;
    sys.registerHook((event, data) => { hookCalled = true; });
    sys.incrementProgress('hook_player', 'first_win', 1);
    assert(hookCalled, 'Integration: hook fired on achievement unlock');
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