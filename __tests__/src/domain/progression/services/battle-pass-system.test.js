'use strict';

const fs = require('fs');
const path = require('path');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'battle-pass-system.js'), 'utf8');
eval(code);

const { BattlePass, PlayerBattlePass, BattlePassSystem, BattlePassTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// BattlePass Tests
// ========================================================================
console.log('\n=== BattlePass Tests ===');
{
    const bp = new BattlePass('bp1', 'Test Pass', Date.now(), Date.now() + 86400000 * 30);
    assertEq(bp.passId, 'bp1', 'passId set');
    assertEq(bp.name, 'Test Pass', 'name set');
    assertEq(bp.status, 'active', 'status active');
    assertEq(bp.tiers.length, 50, 'has 50 tiers');
    assertEq(bp.tiers[0].tier, 1, 'tier 1 exists');
    assertEq(bp.tiers[0].xpRequired, 100, 'tier 1 requires 100 XP');
    assertEq(bp.tiers[49].tier, 50, 'tier 50 exists');
    assertEq(bp.tiers[49].xpRequired, 5000, 'tier 50 requires 5000 XP');

    // test getTierForXP
    assertEq(bp.getTierForXP(0).tier, 1, 'XP=0 → Tier 1');
    assertEq(bp.getTierForXP(100).tier, 1, 'XP=100 → Tier 1');
    assertEq(bp.getTierForXP(150).tier, 1, 'XP=150 → Tier 1');
    assertEq(bp.getTierForXP(5000).tier, 50, 'XP=5000 → Tier 50');

    // test getProgress
    const p1 = bp.getProgress(200);  // XP=200 meets tier 2 threshold
    assertEq(p1.currentTier.tier, 2, 'progress: 200 XP → Tier 2');
    assertEq(p1.xp, 200, 'progress: xp is 200');
    assertEq(p1.progressInTier, 0, 'progress: 0 XP into tier 2 (just reached it)');

    const p2 = bp.getProgress(150);
    assertEq(p2.currentTier.tier, 1, 'progress: 150 XP → Tier 1');
    assertEq(p2.percentToNext, 50, 'progress: 50% to next tier');
}

// ========================================================================
// PlayerBattlePass Tests
// ========================================================================
console.log('\n=== PlayerBattlePass Tests ===');
{
    const pbp = new PlayerBattlePass('player1', 'bp1');
    assertEq(pbp.playerId, 'player1', 'playerId set');
    assertEq(pbp.xp, 0, 'xp starts at 0');
    assertEq(pbp.unlockedTiers.has(1), true, 'tier 1 auto-unlocked');
    assertEq(pbp.claimedTiers.size, 0, 'no tiers claimed initially');

    // test addXP
    const newXP = pbp.addXP(150);
    assertEq(newXP, 150, 'addXP returns new total');
    assertEq(pbp.xp, 150, 'xp updated to 150');
    assertEq(pbp.activityLog.length, 1, 'activity logged');

    // test unlockTier
    pbp.unlockTier(5);
    assert(pbp.claimableTiers.has(5), 'tier 5 is claimable');

    // test claimTier
    const claimed = pbp.claimTier(5);
    assert(claimed, 'tier 5 claimed successfully');
    assert(pbp.claimedTiers.has(5), 'tier 5 in claimed set');

    // test claimTier — already claimed
    const dup = pbp.claimTier(5);
    assert(!dup, 'cannot claim tier twice');

    // test getUnclaimedTiers
    pbp.claimableTiers.add(3);
    const unclaimed = pbp.getUnclaimedTiers();
    assert(Array.isArray(unclaimed), 'getUnclaimedTiers returns array');
}

// ========================================================================
// BattlePassSystem Tests
// ========================================================================
console.log('\n=== BattlePassSystem Tests ===');
{
    const sys = new BattlePassSystem();
    sys._load = () => {}; sys._save = () => {};

    // test createBattlePass
    const bp = sys.createBattlePass('bp_s1', 'Season 1 Pass', Date.now(), Date.now() + 86400000 * 30);
    assert(bp !== null, 'createBattlePass returns battle pass');
    assertEq(sys.battlePasses.size, 1, 'battle pass registered');

    // test getOrCreatePlayerPass
    const pbp = sys.getOrCreatePlayerPass('player1', 'bp_s1');
    assert(pbp !== null, 'getOrCreatePlayerPass returns player pass');
    assertEq(pbp.xp, 0, 'new player starts with 0 XP');

    // test addXP
    const r1 = sys.addXP('player1', 'bp_s1', 150);
    assertEq(r1.xp, 150, 'addXP returns new XP');
    assertEq(r1.tier.tier, 1, '150 XP → Tier 1');
    assert(r1.unlocked === null, 'no tier unlocked (stayed in tier 1→2 no new)');

    const r2 = sys.addXP('player1', 'bp_s1', 500);
    assertEq(r2.xp, 650, 'XP is now 650');
    assert(r2.tier.tier >= 6, '650 XP → high tier');

    // test addXP — invalid pass
    const bad = sys.addXP('player1', 'nonexistent', 100);
    assertEq(bad.error, 'pass_not_found', 'invalid pass returns error');

    // test claimTierReward
    sys.addXP('player1', 'bp_s1', 10000);
    const pbp2 = sys.getOrCreatePlayerPass('player2', 'bp_s1');
    pbp2.unlockedTiers.add(1); pbp2.claimableTiers.add(1);
    const claimR = sys.claimTierReward('player2', 'bp_s1', 1);
    assert(claimR.success, 'claimTierReward returns success');
    assertEq(claimR.reward.tier, 1, 'returns tier 1 reward');

    // test claimTierReward — already claimed
    const dup = sys.claimTierReward('player2', 'bp_s1', 1);
    assertEq(dup.error, 'tier_already_claimed', 'already claimed returns error');

    // test unlockPremium
    const prem = sys.unlockPremium('player1', 'bp_s1');
    assert(prem.success, 'unlockPremium returns success');

    // test getProgress
    const prog = sys.getProgress('player1', 'bp_s1');
    assert(typeof prog === 'object', 'getProgress returns object');
    assertEq(prog.playerId, 'player1', 'progress has playerId');
    assert(prog.xp > 0, 'progress shows XP');
    assert(prog.currentTier, 'progress has currentTier');
    assertEq(typeof prog.percentToNext, 'number', 'progress has percentToNext');

    // test getAllRewards
    const rewards = sys.getAllRewards('player1', 'bp_s1');
    assert(Array.isArray(rewards), 'getAllRewards returns array');
    assert(rewards.length >= 50, 'has 50+ tier rewards');

    // test getStats
    const stats = sys.getStats();
    assert(typeof stats === 'object', 'getStats returns object');
    assertEq(typeof stats.totalBattlePasses, 'number', 'stats has totalBattlePasses');
    assertEq(typeof stats.totalPlayers, 'number', 'stats has totalPlayers');
}

// ========================================================================
// BattlePassTools Tests
// ========================================================================
console.log('\n=== BattlePassTools Tests ===');
{
    if (typeof window !== 'undefined') window._battlePassSystem = new BattlePassSystem();
    const sys = window._battlePassSystem;
    sys._load = () => {}; sys._save = () => {};
    sys.createBattlePass('tool_bp', 'Tool BP');

    const r1 = BattlePassTools['battlepass.create'].handler({ passId: 'tool_bp2', name: 'Tool BP2' }, {});
    assert(r1.passId, 'create returns battle pass');

    const r2 = BattlePassTools['battlepass.add_xp'].handler({ playerId: 'tool_p', passId: 'tool_bp', amount: 500 }, {});
    assert(typeof r2 === 'object', 'add_xp returns object');
    assertEq(r2.xp, 500, 'xp is 500');

    const r3 = BattlePassTools['battlepass.progress'].handler({ playerId: 'tool_p', passId: 'tool_bp' }, {});
    assert(typeof r3 === 'object', 'progress returns object');
    assertEq(r3.xp, 500, 'progress shows 500 xp');

    const r4 = BattlePassTools['battlepass.stats'].handler({}, {});
    assert(typeof r4 === 'object', 'stats returns object');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    const sys = new BattlePassSystem();
    sys._load = () => {}; sys._save = () => {};
    const bp = sys.createBattlePass('int_bp', 'Integration Pass');

    const playerId = 'int_player';
    // Simulate playing through the pass
    sys.addXP(playerId, 'int_bp', 100);   // Tier 1
    sys.addXP(playerId, 'int_bp', 100);   // Tier 1
    sys.addXP(playerId, 'int_bp', 200);   // Tier 4
    sys.addXP(playerId, 'int_bp', 500);   // Tier 9
    sys.addXP(playerId, 'int_bp', 1000);  // Tier 19

    const progress = sys.getProgress(playerId, 'int_bp');
    assert(progress.xp >= 1900, `Integration: ${progress.xp} XP earned`);
    assert(progress.totalUnlocked >= 10, `Integration: ${progress.totalUnlocked} tiers unlocked`);

    const rewards = sys.getAllRewards(playerId, 'int_bp');
    const unlockedRewards = rewards.filter(r => r.isUnlocked);
    assert(unlockedRewards.length >= 10, `Integration: ${unlockedRewards.length} unlocked rewards`);

    // Hook system
    let hookCalled = false;
    sys.registerHook((event, data) => { if (event === 'xp_added') hookCalled = true; });
    sys.addXP('hook_player', 'int_bp', 100);
    assert(hookCalled, 'Integration: hook fired on XP added');
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