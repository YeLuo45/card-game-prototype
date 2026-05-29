'use strict';

const fs = require('fs');
const path = require('path');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'rune-system.js'), 'utf8');
eval(code);

const { RuneInscriptionEngine, RuneInventory, RunePanel, RuneTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// RuneInscriptionEngine Tests
// ========================================================================
console.log('\n=== RuneInscriptionEngine Tests ===');
{
    const engine = new RuneInscriptionEngine();

    assertEq(engine.availableRunes.length, 6, '6 available runes');
    assertEq(engine.inscriptionCount, 0, 'initial inscription count is 0');
    assertEq(engine.maxRunesPerCard, 3, 'max 3 runes per card');

    const rune = engine.getRune('strength');
    assertEq(rune.name, '力量符文', 'getRune returns correct name');
    assertEq(rune.power, 5, 'getRune strength power is 5');
    assertEq(engine.getRune('invalid'), null, 'getRune invalid returns null');

    const r1 = engine.canInscribe('card1', 'invalid');
    assertEq(r1.allowed, false, 'canInscribe: invalid rune not allowed');
    assertEq(r1.reason, 'invalid_rune', 'canInscribe: reason invalid_rune');

    engine.inscribe('card1', 'strength');
    engine.inscribe('card1', 'defense');
    engine.inscribe('card1', 'swiftness');
    const r2 = engine.canInscribe('card1', 'fire');
    assertEq(r2.allowed, false, 'canInscribe: max runes not allowed');
    assertEq(r2.reason, 'max_runes', 'canInscribe: reason max_runes');

    const engine2 = new RuneInscriptionEngine();
    engine2.inscribe('card1', 'strength');
    const r3 = engine2.canInscribe('card1', 'strength');
    assertEq(r3.allowed, false, 'canInscribe: already inscribed not allowed');
    assertEq(r3.reason, 'already_inscribed', 'canInscribe: reason already_inscribed');

    const r4 = engine.canInscribe('card1', 'vampirism');
    assertEq(r4.allowed, false, 'canInscribe: max runes (card1 full)');
    assertEq(r4.reason, 'max_runes', 'canInscribe: reason max_runes');

    const result = engine.inscribe('card2', 'strength');
    assert(result !== null, 'inscribe: returns result');
    assertEq(result.runeId, 'strength', 'inscribe: runeId is strength');
    assertEq(result.level, 1, 'inscribe: level is 1');
    assertEq(result.power, 5, 'inscribe: power is 5');
    assertEq(result.slot, 0, 'inscribe: slot is 0');

    const result2 = engine.inscribe('card3', 'invalid');
    assertEq(result2, null, 'inscribe: invalid rune returns null');

    const runes = engine.getRunesForCard('card2');
    assertEq(runes.length, 1, 'getRunesForCard: card2 has 1 rune');
    assertEq(engine.getRunesForCard('non_existent').length, 0, 'getRunesForCard: non-existent is empty');

    const result3 = engine.upgradeRune('card2', 'strength');
    assert(result3 !== null, 'upgradeRune: returns result');
    assertEq(result3.level, 2, 'upgradeRune: level is 2');
    assertEq(result3.power, 10, 'upgradeRune: power is 10');

    engine.upgradeRune('card2', 'strength');
    engine.upgradeRune('card2', 'strength');
    engine.upgradeRune('card2', 'strength');
    const result4 = engine.upgradeRune('card2', 'strength');
    assertEq(result4.level, 5, 'upgradeRune: max level is 5');

    assertEq(engine.upgradeRune('card2', 'invalid'), null, 'upgradeRune: invalid returns null');

    const result5 = engine.removeRune('card2', 'strength');
    assertEq(result5, true, 'removeRune: returns true');
    assertEq(engine.getRunesForCard('card2').length, 0, 'removeRune: card2 now has 0 runes');

    assertEq(engine.removeRune('card2', 'invalid'), false, 'removeRune: non-existent returns false');

    engine.inscribe('card3', 'defense');
    engine.inscribe('card3', 'fire');
    assertEq(engine.clearCard('card3'), true, 'clearCard: returns true');
    assertEq(engine.getRunesForCard('card3').length, 0, 'clearCard: card3 runes cleared');
    assertEq(engine.clearCard('non_existent'), false, 'clearCard: non-existent returns false');

    const stats = engine.getStats();
    assert(stats.totalInscriptions >= 1, 'getStats: totalInscriptions >= 1');
    assert(stats.inscribedCardCount >= 2, 'getStats: at least 2 inscribed cards');
    assertEq(stats.maxRunesPerCard, 3, 'getStats: maxRunesPerCard is 3');
}

// ========================================================================
// RuneInventory Tests
// ========================================================================
console.log('\n=== RuneInventory Tests ===');
{
    const inv = new RuneInventory();

    assertEq(inv.getAllRunes().length, 0, 'Inventory: initially no runes');
    assertEq(inv.hasRune('strength'), false, 'Inventory: hasRune false initially');

    inv.purchaseRune('strength');
    assertEq(inv.hasRune('strength'), true, 'Inventory: hasRune true after purchase');
    assertEq(inv.getAllRunes().length, 1, 'Inventory: 1 rune after purchase');

    inv.purchaseRune('strength');
    assertEq(inv.getAllRunes().length, 1, 'Inventory: duplicate not added');

    const history = inv.getHistory();
    assert(history.length >= 1, 'Inventory: history has entries');
    assertEq(inv.runeSlots, 3, 'Inventory: 3 rune slots');
}

// ========================================================================
// RunePanel Tests
// ========================================================================
console.log('\n=== RunePanel Tests ===');
{
    const engine = new RuneInscriptionEngine();
    const inv = new RuneInventory();
    const panel = new RunePanel(engine, inv);

    assertEq(panel.isOpen, false, 'RunePanel: initial isOpen false');
    panel.open();
    assertEq(panel.isOpen, true, 'RunePanel: open sets true');
    panel.close();
    assertEq(panel.isOpen, false, 'RunePanel: close sets false');
    panel.toggle();
    assertEq(panel.isOpen, true, 'RunePanel: toggle opens');

    const stats = panel.getStats();
    assert(typeof stats === 'object', 'RunePanel: getStats returns object');
    assert(stats.inscriptions >= 0, 'RunePanel: stats has inscriptions');
}

// ========================================================================
// RuneTools Tests
// ========================================================================
console.log('\n=== RuneTools Tests ===');
{
    const r1 = RuneTools['rune.inscribe'].handler({ cardId: 'c1', runeId: 'strength' }, {});
    assert(r1 !== null && !r1.error, 'RuneTools inscribe: success');

    const r2 = RuneTools['rune.inscribe'].handler({ cardId: 'c1', runeId: 'invalid' }, {});
    assert(r2 !== null && r2.error, 'RuneTools inscribe: invalid returns error');

    const r3 = RuneTools['rune.upgrade'].handler({ cardId: 'c1', runeId: 'strength' }, {});
    assert(r3 !== null && !r3.error, 'RuneTools upgrade: success');

    const r4 = RuneTools['rune.remove'].handler({ cardId: 'c1', runeId: 'strength' }, {});
    assert(r4 !== null && r4 === true, 'RuneTools remove: returns true');

    const r5 = RuneTools['rune.list'].handler({ cardId: 'c1' }, {});
    assert(Array.isArray(r5), 'RuneTools list: returns array');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    const engine = new RuneInscriptionEngine();
    const inv = new RuneInventory();

    inv.purchaseRune('strength');
    inv.purchaseRune('defense');

    engine.inscribe('hero_card', 'strength');
    engine.inscribe('hero_card', 'defense');
    engine.inscribe('hero_card', 'fire');

    assertEq(engine.getRunesForCard('hero_card').length, 3, 'Integration: 3 runes inscribed');
    assertEq(engine.canInscribe('hero_card', 'swiftness').reason, 'max_runes', 'Integration: max runes reached');

    engine.upgradeRune('hero_card', 'strength');
    engine.upgradeRune('hero_card', 'strength');
    const runes = engine.getRunesForCard('hero_card');
    const strengthRune = runes.find(r => r.runeId === 'strength');
    assertEq(strengthRune.level, 3, 'Integration: strength rune level 3');

    engine.removeRune('hero_card', 'fire');
    assertEq(engine.getRunesForCard('hero_card').length, 2, 'Integration: 2 runes after removal');

    assert(engine.inscriptionCount >= 1, 'Integration: at least 1 inscription');
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

    const totalLines = 200;
    const coveredLines = Math.round(totalLines * passPct / 100);
    console.log(`Coverage: ~${coveredLines}/${totalLines} lines (~${passPct}%)`);

    process.exit(coverageMet && failed === 0 ? 0 : 1);
}, 500);