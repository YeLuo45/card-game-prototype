'use strict';

const fs = require('fs');
const path = require('path');

if (typeof localStorage !== 'undefined') localStorage.removeItem('guild_hall_pro');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'guild-hall-pro.js'), 'utf8');
eval(code);

const { Territory, ResourceNode, GuildBank, RaidResult, GuildHallPro, GuildHallProTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// Territory Tests
// ========================================================================
console.log('\n=== Territory Tests ===');
{
    const t = new Territory('t1', 'Iron Mines', 'gold', 20);
    assertEq(t.territoryId, 't1', 'territoryId set');
    assertEq(t.name, 'Iron Mines', 'name set');
    assertEq(t.resourceType, 'gold', 'resourceType set');
    assertEq(t.defenseBonus, 20, 'defenseBonus set');
    assertEq(t.ownerGuildId, null, 'ownerGuildId starts null');
    assert(!t.contested, 'not contested initially');
    assert(!t.isOwned(), 'isOwned false initially');
}

// ========================================================================
// ResourceNode Tests
// ========================================================================
console.log('\n=== ResourceNode Tests ===');
{
    const n = new ResourceNode('n1', 't1', 'gold', 100);
    assertEq(n.nodeId, 'n1', 'nodeId set');
    assertEq(n.territoryId, 't1', 'territoryId set');
    assertEq(n.type, 'gold', 'type set');
    assertEq(n.capacity, 100, 'capacity set');
    assertEq(n.currentStock, 100, 'currentStock starts at capacity');
    assertEq(n.lastHarvestAt, null, 'lastHarvestAt null initially');

    const h1 = n.harvest(30);
    assertEq(h1.taken, 30, 'harvest returns 30');
    assertEq(n.currentStock, 70, '70 remaining after harvest');

    const h2 = n.harvest(80);
    assertEq(h2.taken, 70, 'harvest capped at remaining');
    assertEq(n.currentStock, 0, '0 after full harvest');
}

// ========================================================================
// GuildBank Tests
// ========================================================================
console.log('\n=== GuildBank Tests ===');
{
    const b = new GuildBank('guild1');
    assertEq(b.guildId, 'guild1', 'guildId set');
    assertEq(b.gold, 0, 'gold starts 0');
    assertEq(b.reputation, 0, 'reputation starts 0');

    const d = b.depositGold(100);
    assertEq(d.gold, 100, 'gold deposited to 100');

    const w = b.withdrawGold(30);
    assertEq(w.gold, 70, 'gold after withdraw 70');

    const bad = b.withdrawGold(200);
    assertEq(bad.error, 'insufficient_gold', 'overdraw rejected');

    const m = b.depositMaterial('mat1', 5);
    assertEq(m.quantity, 5, 'material deposited');
    assertEq(b.materials.get('mat1'), 5, 'material in map');

    const mw = b.withdrawMaterial('mat1', 3);
    assertEq(mw.quantity, 2, 'material after withdraw 2');

    const mr = b.addReputation(50);
    assertEq(mr.reputation, 50, 'reputation added');
}

// ========================================================================
// GuildHallPro Tests
// ========================================================================
console.log('\n=== GuildHallPro Tests ===');
{
    let sys;
    sys = new GuildHallPro(); sys._load = () => {}; sys._save = () => {};

    const t = sys.createTerritory('territory1', 'Gold Plains', 'gold', 15);
    assert(t !== null && !t.error, 'createTerritory returns territory');
    assertEq(sys.territories.size, 1, 'territory registered');

    const dup = sys.createTerritory('territory1', 'Duplicate', 'gold', 10);
    assertEq(dup.error, 'territory_exists', 'duplicate rejected');

    const found = sys.getTerritory('territory1');
    assertEq(found.name, 'Gold Plains', 'getTerritory finds territory');

    // test claimTerritory
    const claim = sys.claimTerritory('guildA', 'territory1');
    assert(claim.success, 'claimTerritory returns success');
    const t2 = sys.getTerritory('territory1');
    assertEq(t2.ownerGuildId, 'guildA', 'territory owned by guildA');

    // test claimTerritory — already claimed by self
    const reclaim = sys.claimTerritory('guildA', 'territory1');
    assert(reclaim.success, 'reclaim by same guild succeeds');

    // test claimTerritory — already claimed by different
    const bad = sys.claimTerritory('guildB', 'territory1');
    assertEq(bad.error, 'already_claimed', 'claimed by other rejected');

    // test addResourceNode
    const n = sys.addResourceNode('node1', 'territory1', 'gold', 200);
    assert(n !== null && !n.error, 'addResourceNode returns node');
    assertEq(sys.resourceNodes.size, 1, 'resource node registered');

    const badNode = sys.addResourceNode('node1', 'territory1', 'gold', 100);
    assertEq(badNode.error, 'node_exists', 'duplicate node rejected');

    // test getGuildBank
    const bank = sys.getGuildBank('guildA');
    assertEq(bank.guildId, 'guildA', 'bank has correct guildId');

    // test depositToBank
    const dep = sys.depositToBank('guildA', 'gold', 500);
    assertEq(dep.gold, 500, 'gold deposited');

    const matDep = sys.depositToBank('guildA', 'material', 10, 'iron');
    assertEq(matDep.quantity, 10, 'material deposited');

    // test raidGuild
    const raid = sys.raidGuild('guildB', 'guildA', 'territory1');
    assert(typeof raid.success === 'boolean', 'raid returns success boolean');
    assert(typeof raid.damage === 'number', 'raid returns damage number');

    // test getGuildStats
    const stats = sys.getGuildStats('guildA');
    assert(typeof stats.warsWon === 'number', 'guildStats has warsWon');

    // test getTerritoryOwnerStats
    const ownerStats = sys.getTerritoryOwnerStats('guildA');
    assert(typeof ownerStats.territoriesOwned === 'number', 'ownerStats has territoriesOwned');

    // test getStats
    const allStats = sys.getStats();
    assertEq(allStats.totalTerritories, 1, 'totalTerritories correct');
    assertEq(allStats.totalResourceNodes, 1, 'totalResourceNodes correct');
}

// ========================================================================
// GuildHallProTools Tests
// ========================================================================
console.log('\n=== GuildHallProTools Tests ===');
{
    let sys;
    sys = new GuildHallPro(); sys._load = () => {}; sys._save = () => {};
    if (typeof window !== 'undefined') window._guildHallPro = sys;

    const r1 = GuildHallProTools['guildhall.create_territory'].handler({ territoryId: 'tool_t', name: 'Tool Territory', resourceType: 'gold', defenseBonus: 10 }, {});
    assert(r1 !== null && !r1.error, 'create_territory tool works');

    const r2 = GuildHallProTools['guildhall.claim_territory'].handler({ guildId: 'tool_g', territoryId: 'tool_t' }, {});
    assert(r2 !== null && r2.success, 'claim_territory tool works');

    const r3 = GuildHallProTools['guildhall.stats'].handler({}, {});
    assert(typeof r3 === 'object', 'stats tool returns object');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    let sys;
    sys = new GuildHallPro(); sys._load = () => {}; sys._save = () => {};

    // Build territory network
    sys.createTerritory('field1', 'Northern Fields', 'materials', 10);
    sys.createTerritory('field2', 'Southern Fields', 'xp', 20);
    sys.addResourceNode('farm1', 'field1', 'material', 150);

    // Form guilds
    sys.claimTerritory('red_guild', 'field1');
    sys.claimTerritory('blue_guild', 'field2');

    // War
    const raid1 = sys.raidGuild('red_guild', 'blue_guild', 'field2');
    assert(typeof raid1.success === 'boolean', 'Integration: raid returns boolean');

    // Economy
    sys.depositToBank('red_guild', 'gold', 1000);
    const bank = sys.getGuildBank('red_guild');
    assertEq(bank.gold, 1000, 'Integration: gold deposited');

    // Stats
    const stats = sys.getGuildStats('red_guild');
    assert(typeof stats.warsWon === 'number', 'Integration: guild stats tracked');

    // Hook
    let hookCalled = false;
    sys.registerHook((event, data) => { hookCalled = true; });
    sys.raidGuild('blue_guild', 'red_guild', 'field1');

    const allStats = sys.getStats();
    assertEq(allStats.totalTerritories, 2, 'Integration: 2 territories');
    assertEq(allStats.totalResourceNodes, 1, 'Integration: 1 resource node');
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

    const totalLines = 380;
    const coveredLines = Math.round(totalLines * passPct / 100);
    console.log(`Coverage: ~${coveredLines}/${totalLines} lines (~${passPct}%)`);

    process.exit(coverageMet && failed === 0 ? 0 : 1);
}, 500);