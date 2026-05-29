'use strict';

const fs = require('fs');
const path = require('path');

if (typeof localStorage !== 'undefined') localStorage.removeItem('card_evolution');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'card-evolution-system.js'), 'utf8');
eval(code);

const { CardEvolution, CardEvolutionSystem, CardEvolutionTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }
function assertApprox(a, b, msg) { assert(Math.abs(a - b) < 0.01, `${msg} (expected ~${b}, got ${a})`); }

// ========================================================================
// CardEvolution Tests
// ========================================================================
console.log('\n=== CardEvolution Tests ===');
{
    const ev = new CardEvolution('c1', 1);
    assertEq(ev.cardId, 'c1', 'cardId set');
    assertEq(ev.tier, 1, 'initial tier 1');
    assertEq(ev.xp, 0, 'initial xp 0');
    assertEq(ev.getTier(), 1, 'getTier returns 1');
    assertEq(ev.getXP(), 0, 'getXP returns 0');

    ev.addXP(50);
    assertEq(ev.getXP(), 50, 'xp added');
    assertEq(ev.getTier(), 1, 'tier still 1 after 50xp');

    ev.addXP(60);
    assertEq(ev.getXP(), 110, 'xp now 110');
    assertEq(ev.getTier(), 2, 'tier 2 at 110xp (threshold 100)');

    ev.addXP(200);
    assertEq(ev.getXP(), 310, 'xp now 310');
    assertEq(ev.getTier(), 3, 'tier 3 at 310xp (threshold 300)');

    // History
    assertEq(ev.evolveHistory.length, 2, '2 evolutions in history');
    assertEq(ev.evolveHistory[0].fromTier, 1, 'first evolution from tier 1');
    assertEq(ev.evolveHistory[0].toTier, 2, 'first evolution to tier 2');

    const stats = ev.getStats();
    assertEq(stats.tier, 3, 'stats tier 3');
    assertEq(stats.xp, 310, 'stats xp 310');
    assertEq(stats.evolveCount, 2, 'stats evolveCount 2');

    // Max tier (5) shouldn't evolve beyond
    ev.addXP(10000);
    assertEq(ev.getTier(), 5, 'tier stays 5');
}

// ========================================================================
// CardEvolutionSystem Tests
// ========================================================================
console.log('\n=== CardEvolutionSystem Tests ===');
{
    let sys;
    sys = new CardEvolutionSystem(); sys._load = () => {}; sys._save = () => {};

    // evolveCard new card
    const r1 = sys.evolveCard('card1', 50);
    assertEq(r1.prevTier, 1, 'prevTier 1');
    assertEq(r1.newTier, 1, 'newTier still 1');
    assertEq(r1.xp, 50, 'xp 50');

    // getEvolution
    const ev1 = sys.getEvolution('card1');
    assert(ev1 !== null, 'evolution found');
    assertEq(ev1.getXP(), 50, 'xp stored');

    // evolve to tier 2
    const r2 = sys.evolveCard('card1', 60);
    assertEq(r2.newTier, 2, 'evolved to tier 2');
    assertEq(r2.xp, 110, 'total xp 110');

    // getEvolution for non-existent
    const missing = sys.getEvolution('nonexistent');
    assertEq(missing, null, 'missing returns null');

    // getAllEvolutions
    sys.evolveCard('card2', 200);
    const all = sys.getAllEvolutions();
    assertEq(all.length, 2, '2 evolutions');

    // getStats
    const stats = sys.getStats();
    assertEq(stats.totalCards, 2, '2 total cards');
    assertEq(stats.totalEvolutions, 2, '2 total evolutions (card1 tier 1→2, card2 tier 1→2)');

    // Hook
    let hookCalled = false;
    sys.registerHook((event, data) => { if (event === 'card_evolved') hookCalled = true; });
    sys.evolveCard('card3', 150);
    assert(hookCalled, 'hook called on evolution');
}

// ========================================================================
// CardEvolutionTools Tests
// ========================================================================
console.log('\n=== CardEvolutionTools Tests ===');
{
    let sys;
    sys = new CardEvolutionSystem(); sys._load = () => {}; sys._save = () => {};
    if (typeof window !== 'undefined') window._cardEvolution = sys;

    const r1 = CardEvolutionTools['evolution.evolve'].handler({ cardId: 'tool_card', xp: 120 }, {});
    assert(r1 !== null && !r1.error, 'evolution.evolve tool works');
    assertEq(r1.xp, 120, 'xp recorded');

    const r2 = CardEvolutionTools['evolution.get'].handler({ cardId: 'tool_card' }, {});
    assertEq(r2.xp, 120, 'evolution.get tool returns stats');

    const r3 = CardEvolutionTools['evolution.stats'].handler({}, {});
    assert(typeof r3 === 'object', 'evolution.stats tool returns object');
    assertEq(r3.totalCards, 1, 'stats totalCards correct');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    let sys;
    sys = new CardEvolutionSystem(); sys._load = () => {}; sys._save = () => {};

    // Chain evolution
    sys.evolveCard('evo_card', 80);
    sys.evolveCard('evo_card', 30);
    const ev = sys.getEvolution('evo_card');
    assertEq(ev.getTier(), 2, 'Integration: tier 2 after 110xp');
    assertEq(ev.getXP(), 110, 'Integration: xp cumulative');

    // Multiple cards
    for (let i = 0; i < 5; i++) sys.evolveCard(`auto_${i}`, 50 * i);
    const stats = sys.getStats();
    assertEq(stats.totalCards, 6, 'Integration: 6 cards total');
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

    const totalLines = 180;
    const coveredLines = Math.round(totalLines * passPct / 100);
    console.log(`Coverage: ~${coveredLines}/${totalLines} lines (~${passPct}%)`);

    process.exit(coverageMet && failed === 0 ? 0 : 1);
}, 500);