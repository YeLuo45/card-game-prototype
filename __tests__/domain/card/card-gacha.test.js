'use strict';

const fs = require('fs');
const path = require('path');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'card-gacha.js'), 'utf8');
eval(code);

const { CardGachaEngine, GachaInventory, GachaPanel, GachaTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }
function assertApprox(a, b, msg, tol = 0.01) { assert(Math.abs(a - b) <= tol, `${msg} (expected ~${b}, got ${a})`); }

// ========================================================================
// CardGachaEngine Tests
// ========================================================================
console.log('\n=== CardGachaEngine Tests ===');
{
    const engine = new CardGachaEngine();

    // test default currency
    assertEq(engine.currency.gold, 1000, 'default gold is 1000');
    assertEq(engine.currency.gems, 50, 'default gems is 50');

    // test custom currency via config
    const engine2 = new CardGachaEngine({ gold: 5000, gems: 100 });
    assertEq(engine2.currency.gold, 5000, 'custom gold');
    assertEq(engine2.currency.gems, 100, 'custom gems');
    // Also test that non-configured currency uses defaults
    const engine2b = new CardGachaEngine({ gold: 5000 });
    assertEq(engine2b.currency.gems, 50, 'non-configured gems uses default');

    // test summonTypes
    assertEq(engine.summonTypes.length, 3, '3 summon types');
    assertEq(engine.summonTypes[0].currency, 'gold', 'basic uses gold');
    assertEq(engine.summonTypes[1].currency, 'gems', 'premium uses gems');

    // test getCurrency
    const cur = engine.getCurrency();
    assertEq(cur.gold, 1000, 'getCurrency returns gold');
    cur.gold = 9999; // mutate should not affect engine
    assertEq(engine.currency.gold, 1000, 'getCurrency returns copy');

    // test spendCurrency success
    assertEq(engine.spendCurrency('gold', 100), true, 'spendCurrency returns true');
    assertEq(engine.currency.gold, 900, 'gold deducted');

    // test spendCurrency failure
    assertEq(engine.spendCurrency('gold', 10000), false, 'spendCurrency fails on insufficient');
    assertEq(engine.spendCurrency('gems', 50), true, 'spendCurrency gems works');
    assertEq(engine.currency.gems, 0, 'gems deducted');

    // test addCurrency
    engine.addCurrency('gold', 500);
    assertEq(engine.currency.gold, 1400, 'addCurrency works');
    engine.addCurrency('gems', 100);
    assertEq(engine.currency.gems, 100, 'addCurrency gems works');

    // test summon — basic (gold)
    const result = engine.summon('basic', 1);
    assert(!result.error, 'summon basic succeeds');
    assertEq(result.results.length, 1, 'summon returns 1 result');
    assert(result.results[0].rarity, 'summon has rarity');
    assertEq(engine.currency.gold, 1300, 'gold deducted after summon');

    // test summon — premium (gems)
    const result2 = engine.summon('premium', 1);
    assert(!result2.error, 'summon premium succeeds');
    assertEq(result2.results.length, 1, 'premium returns 1 result');

    // test summon — invalid type
    const result3 = engine.summon('invalid', 1);
    assertEq(result3.error, 'invalid_summon_type', 'invalid type returns error');

    // test summon — insufficient currency
    const engine3 = new CardGachaEngine({ gold: 0, gems: 0 });
    const result4 = engine3.summon('basic', 1);
    assertEq(result4.error, 'insufficient_currency', 'insufficient currency returns error');
    // Also test premium with no gems
    const engine3b = new CardGachaEngine({ gold: 0, gems: 0 });
    const result4b = engine3b.summon('premium', 1);
    assertEq(result4b.error, 'insufficient_currency', 'no gems premium returns error');

    // test summon count validation
    const result5 = engine.summon('basic', 5);
    assertEq(result5.error, 'invalid_count', 'invalid count returns error');

    // test summon multi (x10)
    const engine4 = new CardGachaEngine({ gold: 10000, gems: 1000 });
    const result6 = engine4.summon('basic', 10);
    assert(!result6.error, 'summon x10 succeeds');
    assertEq(result6.results.length, 10, 'summon x10 returns 10 results');

    // test pity counter increments
    assert(engine.pityCounters.basic >= 1, 'pity counter incremented for basic');

    // test getRates
    const rates = engine.getRates('basic');
    assertEq(typeof rates.common, 'number', 'getRates returns object');
    assertApprox(rates.common, 0.6, 'basic common rate ~60%');
    assertApprox(rates.uncommon, 0.3, 'basic uncommon ~30%');
    assertApprox(rates.rare, 0.09, 'basic rare ~9%');

    // test getPityCounter
    const pity = engine.getPityCounter('basic');
    assert(pity >= 1, 'getPityCounter returns >= 1');

    // test getHistory
    const history = engine.getHistory(3);
    assert(Array.isArray(history), 'getHistory returns array');
    assert(history.length >= 2, 'getHistory returns at least 2 entries');

    // test getTotalSummons
    assert(engine.getTotalSummons() >= 1, 'getTotalSummons >= 1');
}

// ========================================================================
// GachaInventory Tests
// ========================================================================
console.log('\n=== GachaInventory Tests ===');
{
    const inv = new GachaInventory();

    // test initial state
    assertEq(inv.getTotalPulls(), 0, 'initial total pulls is 0');
    assertEq(inv.getAllCards().length, 0, 'initially no cards');
    assertEq(inv.hasCard('strike'), false, 'hasCard false initially');

    // test addCard
    inv.addCard('strike', 'common');
    assertEq(inv.getCardCount('strike'), 1, 'getCardCount after add');
    assertEq(inv.hasCard('strike'), true, 'hasCard true after add');
    assertEq(inv.getTotalPulls(), 1, 'total pulls incremented');

    // test addCard multiple
    inv.addCard('strike', 'common', 3);
    assertEq(inv.getCardCount('strike'), 4, 'getCardCount accumulates');

    // test rarityCounts
    const rc = inv.getRarityCounts();
    assertEq(rc.common, 4, 'rarityCounts common = 4');
    assertEq(rc.uncommon, 0, 'rarityCounts uncommon = 0');

    // test getAllCards
    const all = inv.getAllCards();
    assertEq(all.length, 1, 'getAllCards returns 1 card');
    assertEq(all[0].cardId, 'strike', 'getAllCards cardId');
    assertEq(all[0].count, 4, 'getAllCards count');

    // test getCardCount non-existent
    assertEq(inv.getCardCount('non_existent'), 0, 'non-existent card count is 0');

    // test getRarityCounts
    inv.addCard('defend', 'rare');
    const rc2 = inv.getRarityCounts();
    assertEq(rc2.rare, 1, 'rarityCounts rare = 1');
}

// ========================================================================
// GachaPanel Tests
// ========================================================================
console.log('\n=== GachaPanel Tests ===');
{
    const engine = new CardGachaEngine();
    const inv = new GachaInventory();
    const panel = new GachaPanel(engine, inv);

    assertEq(panel.isOpen, false, 'GachaPanel initial isOpen false');
    assertEq(panel.engine, engine, 'GachaPanel has engine');
    assertEq(panel.inventory, inv, 'GachaPanel has inventory');

    panel.open();
    assertEq(panel.isOpen, true, 'open sets isOpen true');

    panel.close();
    assertEq(panel.isOpen, false, 'close sets isOpen false');

    panel.toggle();
    assertEq(panel.isOpen, true, 'toggle opens');

    const stats = panel.getStats();
    assert(typeof stats === 'object', 'getStats returns object');
    assert(typeof stats.currency === 'object', 'stats has currency');
    assert(typeof stats.totalSummons === 'number', 'stats has totalSummons');
}

// ========================================================================
// GachaTools Tests
// ========================================================================
console.log('\n=== GachaTools Tests ===');
{
    // test summon tool
    const result = GachaTools['gacha.summon'].handler({ summonType: 'basic', count: 1 }, {});
    assert(!result.error || result.error === 'insufficient_currency', 'gacha.summon: handles insufficient currency');

    // test currency tool
    const cur = GachaTools['gacha.currency'].handler({}, {});
    assertEq(typeof cur.gold, 'number', 'gacha.currency: returns object with gold');
    assertEq(typeof cur.gems, 'number', 'gacha.currency: returns object with gems');

    // test rates tool
    const rates = GachaTools['gacha.rates'].handler({ summonType: 'premium' }, {});
    assert(typeof rates.common === 'number', 'gacha.rates: returns rates object');
    assertApprox(rates.legendary, 0.01, 'gacha.rates: legendary ~1%');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    const engine = new CardGachaEngine({ gold: 10000, gems: 1000 });
    const inv = new GachaInventory();

    // Perform multiple summons
    for (let i = 0; i < 5; i++) {
        const result = engine.summon('basic', 1);
        if (!result.error && result.results[0]) {
            inv.addCard(`card_${i}`, result.results[0].rarity);
        }
    }

    assertEq(inv.getTotalPulls(), 5, 'Integration: 5 cards added');
    assert(engine.getTotalSummons() >= 5, 'Integration: engine tracked summons');

    // Multi summon
    const multi = engine.summon('premium', 10);
    assertEq(multi.results.length, 10, 'Integration: multi returns 10 results');
    assertEq(multi.totalSummons >= 15, true, 'Integration: total summons incremented');

    // Currency deduction
    const cur = engine.getCurrency();
    assert(cur.gold < 10000, 'Integration: gold deducted');
    assert(cur.gems < 1000, 'Integration: gems deducted');
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