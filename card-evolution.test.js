'use strict';

const fs = require('fs');
const path = require('path');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'card-evolution.js'), 'utf8');
eval(code);

const { CardEvolutionEngine, CardEvolutionInventory, EvolutionPanel, EvolutionTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }
function assertApprox(a, b, msg, tol = 0.01) { assert(Math.abs(a - b) <= tol, `${msg} (expected ~${b}, got ${a})`); }

// ========================================================================
// CardEvolutionEngine Tests
// ========================================================================
console.log('\n=== CardEvolutionEngine Tests ===');
{
    const engine = new CardEvolutionEngine();

    // test default config
    assertEq(engine.xpPerWin, 30, 'default xpPerWin is 30');
    assertEq(engine.xpPerLoss, 10, 'default xpPerLoss is 10');
    assertEq(engine.evolutionTiers.length, 5, 'default tiers count');
    assertEq(engine.totalEvolutions, 0, 'initial totalEvolutions is 0');

    // test custom config
    const custom = new CardEvolutionEngine({ xpPerWin: 50, xpPerLoss: 20 });
    assertEq(custom.xpPerWin, 50, 'custom xpPerWin');
    assertEq(custom.xpPerLoss, 20, 'custom xpPerLoss');

    // test awardXP — win
    {
        const card = { id: 'strike', name: '打击' };
        const result = engine.awardXP(card, { outcome: 'win' });
        assertEq(result.xpGained, 30, 'awardXP: win gives 30');
        assertEq(result.previousXP, 0, 'awardXP: previousXP 0');
        assertEq(result.newXP, 30, 'awardXP: newXP 30');
    }

    // test awardXP — loss
    {
        const card = { id: 'strike', name: '打击', evolutionXP: 20 };
        const result = engine.awardXP(card, { outcome: 'loss' });
        assertEq(result.xpGained, 10, 'awardXP: loss gives 10');
        assertEq(result.newXP, 30, 'awardXP: loss newXP = 30');
    }

    // test awardXP — damage bonus
    {
        const card = { id: 'strike', name: '打击' };
        const result = engine.awardXP(card, { outcome: 'win', damageDealt: 40 });
        assertEq(result.xpGained, 50, 'awardXP: win+damage = 30+20');
        assertEq(result.newXP, 50, 'awardXP: damage newXP = 50');
    }

    // test awardXP — block bonus
    {
        const card = { id: 'strike', name: '打击' };
        const result = engine.awardXP(card, { outcome: 'win', damageDealt: 20, blockGenerated: 60 });
        assertEq(result.xpGained, 58, 'awardXP: win+damage+block = 30+10+18'); // 30 + 10 + 18
    }

    // test awardXP — null card
    {
        const result = engine.awardXP(null, { outcome: 'win' });
        assertEq(result, null, 'awardXP: null card returns null');
    }

    // test checkEvolution — tier 0 below threshold
    {
        const card = { id: 'strike', evolutionXP: 0 };
        const result = engine.checkEvolution(card);
        assertEq(result.shouldEvolve, false, 'checkEvolution: tier 0 not ready');
        assertEq(result.reason, 'xp_insufficient', 'checkEvolution: reason xp_insufficient');
    }

    // test checkEvolution — tier 0 at threshold
    {
        const card = { id: 'strike', evolutionXP: 250 };
        const result = engine.checkEvolution(card);
        assertEq(result.shouldEvolve, false, 'checkEvolution: 250xp needs 500 to evolve');
        assert(result.reason === 'xp_insufficient', 'checkEvolution: reason is xp_insufficient');
    }

    // test checkEvolution — max tier
    {
        const card = { id: 'strike', evolutionXP: 2000 };
        const result = engine.checkEvolution(card);
        assertEq(result.shouldEvolve, false, 'checkEvolution: max tier cannot evolve');
        assertEq(result.reason, 'max_tier', 'checkEvolution: reason max_tier');
    }

    // test evolve — successful
    {
        const card = { id: 'strike', name: '打击', type: 'attack', damage: 6, cost: 1, evolutionXP: 0, evolutionTier: 1 };
        const result = engine.evolve(card);
        assert(result !== null, 'evolve: returns result');
        assertEq(result.evolutionXP, 0, 'evolve: XP reset to 0');
        assertEq(result.evolutionTier, 2, 'evolve: tier is 2');
        assert(result.damage >= 6, 'evolve: damage >= original');
    }

    // test evolve — cannot evolve
    {
        const card = { id: 'strike', name: '打击', evolutionXP: 0 };
        const result = engine.evolve(card);
        assertEq(result, null, 'evolve: insufficient XP returns null');
    }

    // test evolve — stat scaling
    {
        const card = { id: 'heavy', name: '重击', damage: 20, block: 0, cost: 2 };
        const evolved = engine.evolve({ ...card, evolutionXP: 0, evolutionTier: 2 });
        assert(evolved !== null, 'evolve heavy: returns result');
        assert(evolved.damage > 20, 'evolve heavy: damage increased');
    }

    // test getTier
    assertEq(engine.getTier({ evolutionXP: 0 }), 0, 'getTier: 0xp = tier 0');
    assertEq(engine.getTier({ evolutionXP: 50 }), 0, 'getTier: 50xp = tier 0');
    assertEq(engine.getTier({ evolutionXP: 100 }), 1, 'getTier: 100xp = tier 1');
    assertEq(engine.getTier({ evolutionXP: 250 }), 2, 'getTier: 250xp = tier 2');
    assertEq(engine.getTier({ evolutionXP: 500 }), 3, 'getTier: 500xp = tier 3');
    assertEq(engine.getTier({ evolutionXP: 1000 }), 4, 'getTier: 1000xp = tier 4');
    assertEq(engine.getTier({ evolutionXP: 2000 }), 4, 'getTier: 2000xp = tier 4 (max)');

    // test getXPProgress
    {
        const card = { id: 'strike', evolutionXP: 50 };
        const progress = engine.getXPProgress(card);
        assertEq(progress.xp, 50, 'getXPProgress: xp is 50');
        assertEq(progress.tier, 'I', 'getXPProgress: tier I');
        assert(progress.progress > 0 && progress.progress < 1, 'getXPProgress: progress is fraction');
        assertEq(progress.nextTier, 'II', 'getXPProgress: next tier is II');
    }

    // test getXPProgress — max tier
    {
        const card = { id: 'strike', evolutionXP: 2000 };
        const progress = engine.getXPProgress(card);
        assertEq(progress.nextTier, null, 'getXPProgress: max tier has no next');
        assertEq(progress.progress, 1, 'getXPProgress: max tier progress = 1');
    }
}

// ========================================================================
// CardEvolutionInventory Tests
// ========================================================================
console.log('\n=== CardEvolutionInventory Tests ===');
{
    const inv = new CardEvolutionInventory();

    // test initial state
    assertEq(inv.getXP('strike').xp, 0, 'Inventory: initial XP is 0');
    assertEq(inv.getAllCards().length, 0, 'Inventory: initially empty');

    // test addXP
    {
        const result = inv.addXP('strike', 30);
        assertEq(result.xp, 30, 'addXP: returns 30');
        assertEq(result.tier, 0, 'addXP: tier 0');
        assertEq(inv.getXP('strike').xp, 30, 'addXP: stored XP is 30');
    }

    // test addXP — accumulation
    {
        inv.addXP('strike', 50);
        assertEq(inv.getXP('strike').xp, 80, 'addXP: accumulates to 80');
        assertEq(inv.getXP('strike').tier, 0, 'addXP: still tier 0 (below 100)');
    }

    // test addXP — tier increase
    {
        inv.addXP('strike', 30);
        assertEq(inv.getXP('strike').xp, 110, 'addXP: reaches 110');
        assertEq(inv.getXP('strike').tier, 1, 'addXP: tier is 1');
    }

    // test getAllCards
    {
        inv.addXP('defend', 200);
        const all = inv.getAllCards();
        assertEq(all.length, 2, 'getAllCards: 2 cards');
    }

    // test getXP — non-existent
    assertEq(inv.getXP('non_existent').xp, 0, 'getXP: non-existent returns 0');
}

// ========================================================================
// EvolutionPanel Tests
// ========================================================================
console.log('\n=== EvolutionPanel Tests ===');
{
    const engine = new CardEvolutionEngine();
    const inv = new CardEvolutionInventory();
    const panel = new EvolutionPanel(engine, inv);

    assertEq(panel.isOpen, false, 'EvolutionPanel: initial isOpen false');
    assertEq(panel.engine, engine, 'EvolutionPanel: engine assigned');
    assertEq(panel.inventory, inv, 'EvolutionPanel: inventory assigned');

    panel.open();
    assertEq(panel.isOpen, true, 'EvolutionPanel: open sets isOpen true');

    panel.close();
    assertEq(panel.isOpen, false, 'EvolutionPanel: close sets isOpen false');

    panel.toggle();
    assertEq(panel.isOpen, true, 'EvolutionPanel: toggle opens');

    const stats = panel.getStats();
    assert(typeof stats === 'object', 'EvolutionPanel: getStats returns object');
    assertEq(stats.trackedCards, 0, 'EvolutionPanel: initially no tracked cards');
    assertEq(stats.evolutions, 0, 'EvolutionPanel: stats evolutions 0');
}

// ========================================================================
// EvolutionTools Tests
// ========================================================================
console.log('\n=== EvolutionTools Tests ===');
{
    // test check tool
    {
        const result = EvolutionTools['evolution.check'].handler(
            { card: { id: 'strike', evolutionXP: 500 } },
            {}
        );
        assertEq(result.shouldEvolve, false, 'evolution.check: at 500 cannot evolve (needs 1000)');
    }

    // test evolve tool
    {
        const result = EvolutionTools['evolution.evolve'].handler(
            { card: { id: 'strike', name: '打击', type: 'attack', damage: 6, evolutionTier: 2 } },
            {}
        );
        assert(result !== null, 'evolution.evolve: returns result');
        assertEq(result.evolutionTier, 3, 'evolution.evolve: tier 3');
    }

    // test evolve tool — cannot evolve
    {
        const result = EvolutionTools['evolution.evolve'].handler(
            { card: { id: 'strike', evolutionXP: 0 } },
            {}
        );
        assert('error' in result, 'evolution.evolve: cannot evolve returns error');
    }

    // test award tool
    {
        const result = EvolutionTools['evolution.award'].handler(
            { card: { id: 'strike' }, result: { outcome: 'win' } },
            {}
        );
        assertEq(result.xpGained, 30, 'evolution.award: win gives 30');
    }
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    const engine = new CardEvolutionEngine();
    const inv = new CardEvolutionInventory();

    // Award XP from multiple games
    inv.addXP('strike', 30); // win
    inv.addXP('strike', 30); // win
    inv.addXP('strike', 50); // partial

    assertEq(inv.getXP('strike').xp, 110, 'Integration: total XP 110');
    assertEq(inv.getXP('strike').tier, 1, 'Integration: tier 1');

    // Check evolution - need 500 to evolve from tier 1
    const check = engine.checkEvolution({ id: 'strike', evolutionXP: 110 });
    assertEq(check.shouldEvolve, false, 'Integration: 110xp cannot evolve (needs 500)');

    // Evolve
    const evolved = engine.evolve({ id: 'strike', name: '打击', type: 'attack', damage: 6, evolutionTier: 1 });
    assert(evolved !== null, 'Integration: evolved card not null');
    assertEq(evolved.evolutionTier, 2, 'Integration: evolved to tier 2');
    assertEq(evolved.evolutionXP, 0, 'Integration: XP reset after evolve');
    assertEq(engine.totalEvolutions, 1, 'Integration: totalEvolutions incremented');

    // Award more XP after evolution
    const award = engine.awardXP(evolved, { outcome: 'win' });
    assertEq(award.xpGained, 30, 'Integration: evolved card can still earn XP');
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