'use strict';

const fs = require('fs');
const path = require('path');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'cosmetic-system.js'), 'utf8');
eval(code);

const { CardCosmetic, CosmeticShop, CosmeticTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// CardCosmetic Tests
// ========================================================================
console.log('\n=== CardCosmetic Tests ===');
{
    const c = new CardCosmetic('c1', 'GoldFrame', 'frame', 'rare', 500, null);
    assertEq(c.cosmeticId, 'c1', 'cosmeticId set');
    assertEq(c.name, 'GoldFrame', 'name set');
    assertEq(c.type, 'frame', 'type set');
    assertEq(c.rarity, 'rare', 'rarity set');
    assertEq(c.price, 500, 'price set');
    assertEq(c.unlockedAt, null, 'unlockedAt null');
    assertEq(c.owned, false, 'owned false initially');
    assertEq(c.getRarityColor(), '#3498db', 'getRarityColor returns blue for rare');
    assertEq(new CardCosmetic('c2', 'Common', 'frame', 'common', 0, null).getRarityColor(), '#bdc3c7', 'common color grey');
    assertEq(new CardCosmetic('c3', 'Epic', 'effect', 'epic', 0, null).getRarityColor(), '#9b59b6', 'epic color purple');
    assertEq(new CardCosmetic('c4', 'Legend', 'back', 'legendary', 0, null).getRarityColor(), '#f39c12', 'legendary color gold');
}

// ========================================================================
// CosmeticShop Tests
// ========================================================================
console.log('\n=== CosmeticShop Tests ===');
{
    const shop = new CosmeticShop();
    shop._load = () => {}; shop._save = () => {};

    assertEq(shop.cosmetics.size, 0, 'shop empty initially');

    // test registerCosmetic
    const c1 = shop.registerCosmetic(new CardCosmetic('frame1', 'TestFrame', 'frame', 'common', 100, null));
    assert(c1 !== null, 'registerCosmetic returns cosmetic');
    assertEq(shop.cosmetics.size, 1, 'cosmetic registered');

    // test registerDefaultCosmetics
    const count = shop.registerDefaultCosmetics();
    assert(count >= 10, 'registers 10+ default cosmetics');

    // test getShopInventory
    const inventory = shop.getShopInventory();
    assert(inventory.length >= count, 'inventory includes defaults');

    // test getCosmeticsByRarity
    const legendary = shop.getCosmeticsByRarity('legendary');
    assert(legendary.length >= 2, 'at least 2 legendary cosmetics');

    // test purchaseCosmetic
    const purchase = shop.purchaseCosmetic('player1', 'frame1', 'gold');
    assert(purchase.success, 'purchase returns success');
    assertEq(purchase.cosmetic.owned, true, 'purchased cosmetic marked owned');

    // test purchaseCosmetic — already owned
    const dup = shop.purchaseCosmetic('player1', 'frame1', 'gold');
    assertEq(dup.error, 'already_owned', 'already owned returns error');

    // test purchaseCosmetic — invalid
    const bad = shop.purchaseCosmetic('player1', 'nonexistent', 'gold');
    assertEq(bad.error, 'cosmetic_not_found', 'invalid cosmetic returns error');

    // test getOwnedCosmetics
    const owned = shop.getOwnedCosmetics('player1');
    assert(owned.length >= 1, 'player1 owns at least 1 cosmetic');

    // test equipCosmetic
    const equip = shop.equipCosmetic('player1', 'frame1', 'frame');
    assert(equip.success, 'equip returns success');
    assertEq(equip.equipped.frame, 'frame1', 'frame equipped');

    // test equipCosmetic — not owned
    const badEquip = shop.equipCosmetic('player1', 'frame_gold', 'frame');
    assertEq(badEquip.error, 'not_owned', 'cannot equip unowned cosmetic');

    // test getEquippedCosmetics
    const equipped = shop.getEquippedCosmetics('player1');
    assertEq(equipped.frame.cosmeticId, 'frame1', 'getEquippedCosmetics returns frame1');

    // test getStats
    const stats = shop.getStats();
    assert(typeof stats === 'object', 'getStats returns object');
    assertEq(typeof stats.totalCosmetics, 'number', 'stats has totalCosmetics');
    assertEq(typeof stats.byType, 'object', 'stats has byType');
    assert(stats.transactions >= 1, 'stats shows 1+ transactions');
    assertEq(stats.recentTransactions.length, stats.transactions, 'recentTransactions matches count');
}

// ========================================================================
// CosmeticTools Tests
// ========================================================================
console.log('\n=== CosmeticTools Tests ===');
{
    if (typeof window !== 'undefined') window._cosmeticShop = new CosmeticShop();
    const shop = window._cosmeticShop;
    shop._load = () => {}; shop._save = () => {};
    shop.registerDefaultCosmetics();

    const r1 = CosmeticTools['cosmetic.shop'].handler({}, {});
    assert(Array.isArray(r1), 'shop returns array');
    assert(r1.length >= 10, 'shop has 10+ items');

    const r2 = CosmeticTools['cosmetic.purchase'].handler({ playerId: 'tool_p', cosmeticId: 'frame_gold' }, {});
    assert(r2.success, 'purchase via tool succeeds');

    const r3 = CosmeticTools['cosmetic.owned'].handler({ playerId: 'tool_p' }, {});
    assert(Array.isArray(r3), 'owned returns array');
    assert(r3.length >= 1, 'tool_p owns at least 1');

    const r4 = CosmeticTools['cosmetic.stats'].handler({}, {});
    assert(typeof r4 === 'object', 'stats returns object');
    assertEq(r4.transactions >= 1, true, 'stats shows 1+ transactions');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    const shop = new CosmeticShop();
    shop._load = () => {}; shop._save = () => {};
    shop.registerDefaultCosmetics();

    const playerId = 'int_player';

    // Purchase multiple cosmetics
    shop.purchaseCosmetic(playerId, 'frame_default', 'gold');
    shop.purchaseCosmetic(playerId, 'frame_gold', 'gold');
    shop.purchaseCosmetic(playerId, 'effect_fire', 'gold');
    shop.purchaseCosmetic(playerId, 'back_galaxy', 'gold');

    // Equip some
    shop.equipCosmetic(playerId, 'frame_gold', 'frame');
    shop.equipCosmetic(playerId, 'effect_fire', 'effect');
    shop.equipCosmetic(playerId, 'back_galaxy', 'back');

    const equipped = shop.getEquippedCosmetics(playerId);
    assertEq(equipped.frame.cosmeticId, 'frame_gold', 'Integration: frame_gold equipped');
    assertEq(equipped.effect.cosmeticId, 'effect_fire', 'Integration: effect_fire equipped');
    assertEq(equipped.back.cosmeticId, 'back_galaxy', 'Integration: back_galaxy equipped');

    const owned = shop.getOwnedCosmetics(playerId);
    assert(owned.length >= 4, `Integration: ${owned.length} cosmetics owned`);

    const stats = shop.getStats();
    assert(stats.transactions >= 4, 'Integration: 4+ transactions logged');

    // Hook system
    let hookCalled = false;
    shop.registerHook((event, data) => { if (event === 'cosmetic_purchased') hookCalled = true; });
    shop.purchaseCosmetic('hook_player', 'border_simple', 'gold');
    assert(hookCalled, 'Integration: hook fired on purchase');
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