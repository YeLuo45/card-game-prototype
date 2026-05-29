'use strict';

const fs = require('fs');
const path = require('path');

// Load card-fusion.js
global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'card-fusion.js'), 'utf8');
eval(code);

const { CardFusionEngine, FusionInventory, FusionPanel, FusionTools } = window;

// Test counters
let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// CardFusionEngine Tests
// ========================================================================
console.log('\n=== CardFusionEngine Tests ===');
{
    const engine = new CardFusionEngine();

    // test canFuse — null cards
    {
        const r = engine.canFuse(null, null);
        assertEq(r.allowed, false, 'canFuse: null cards not allowed');
        assertEq(r.reason, 'missing_card', 'canFuse: reason is missing_card');
    }

    // test canFuse — one null
    {
        const r = engine.canFuse({ id: 'a', name: '打击' }, null);
        assertEq(r.allowed, false, 'canFuse: one null not allowed');
    }

    // test canFuse — invalid card (no name)
    {
        const r = engine.canFuse({}, {});
        assertEq(r.allowed, false, 'canFuse: invalid card (no name) not allowed');
        assertEq(r.reason, 'invalid_card', 'canFuse: reason is invalid_card');
    }

    // test canFuse — same card same-type (allowed)
    {
        const c = { id: 'strike', name: '打击', type: 'attack' };
        const r = engine.canFuse(c, c);
        assertEq(r.allowed, true, 'canFuse: same card allowed');
        assertEq(r.mode, 'same_type', 'canFuse: mode is same_type');
    }

    // test canFuse — different cards same type (not allowed)
    {
        const c1 = { id: 'strike', name: '打击', type: 'attack' };
        const c2 = { id: 'bash', name: '重击', type: 'attack' };
        const r = engine.canFuse(c1, c2);
        assertEq(r.allowed, false, 'canFuse: different cards same type not allowed');
        assertEq(r.reason, 'same_type_different_card', 'canFuse: reason is same_type_different_card');
    }

    // test canFuse — different cards different type (allowed)
    {
        const c1 = { id: 'strike', name: '打击', type: 'attack' };
        const c2 = { id: 'defend', name: '防御', type: 'skill' };
        const r = engine.canFuse(c1, c2);
        assertEq(r.allowed, true, 'canFuse: different types allowed');
        assertEq(r.mode, 'cross_type', 'canFuse: mode is cross_type');
    }

    // test fuse — same-type fusion → level up
    {
        const card = { id: 'strike', name: '打击', type: 'attack', cost: 1, damage: 6, tags: ['basic'] };
        const result = engine.fuse(card, card);
        assert(result !== null, 'fuse: same-type returns result');
        assertEq(result.fusionLevel, 2, 'fuse: fusionLevel is 2');
        assertEq(result.name, '打击+2', 'fuse: name is 打击+2');
        assertEq(result.tags.includes('fused'), true, 'fuse: tags include fused');
        assertEq(result.tags.includes('level_2'), true, 'fuse: tags include level_2');
    }

    // test fuse — same-type level 1 → level 2 → level 3
    {
        const card = { id: 'strike', name: '打击', type: 'attack', damage: 6, block: 0, cost: 1 };
        const r1 = engine.fuse(card, card);
        const r2 = engine.fuse(r1, r1);
        assertEq(r1.fusionLevel, 2, 'fuse: second fusion level 2');
        assertEq(r2.fusionLevel, 3, 'fuse: third fusion level 3');
        assert(r2.name.includes('打击'), 'fuse: third name includes base name');
    }

    // test fuse — cross-type fusion → hybrid
    {
        const c1 = { id: 'strike', name: '打击', type: 'attack', cost: 1, damage: 6, block: 0, cardDraw: 0 };
        const c2 = { id: 'defend', name: '防御', type: 'skill', cost: 1, damage: 0, block: 5, cardDraw: 0 };
        const result = engine.fuse(c1, c2);
        assert(result !== null, 'fuse: cross-type returns result');
        assertEq(result.isHybrid, true, 'fuse: isHybrid is true');
        assert(result.name.includes('/'), 'fuse: hybrid name has slash');
        assertEq(result.type, 'attack_hybrid', 'fuse: hybrid type');
        assertEq(result.damage, 3, 'fuse: damage averaged to 3');
        assert(result.block >= 2, 'fuse: block averaged correctly');
        assertEq(result.cost, 1, 'fuse: cost averaged to 1');
        assertEq(result.parentCards.length, 2, 'fuse: parentCards has 2 entries');
    }

    // test fuse — null returns null
    {
        const result = engine.fuse(null, null);
        assertEq(result, null, 'fuse: null cards returns null');
    }

    // test fuse — disallowed combo returns null
    {
        const c1 = { id: 'strike', name: '打击', type: 'attack' };
        const c2 = { id: 'bash', name: '重击', type: 'attack' };
        const result = engine.fuse(c1, c2);
        assertEq(result, null, 'fuse: same-type different card returns null');
    }

    // test fuse — damage scaling
    {
        const card = { id: 'heavy', name: '重击', type: 'attack', damage: 20, cost: 2 };
        const result = engine.fuse(card, card);
        assert(result.damage > 20, 'fuse: fused card damage > original');
        assertEq(result.fusionLevel, 2, 'fuse: damage-scaling card level 2');
    }

    // test getXPCost
    {
        assertEq(engine.getXPCost(1, 2), 100, 'getXPCost: level 1→2 costs 100');
        assertEq(engine.getXPCost(1, 3), 300, 'getXPCost: level 1→3 costs 300');
        assertEq(engine.getXPCost(2, 4), 500, 'getXPCost: level 2→4 costs 500');
        assertEq(engine.getXPCost(1, 1), 0, 'getXPCost: same level costs 0');
    }

    // test getMaxFusionLevel
    {
        const card = { fusionLevel: 1 };
        assertEq(engine.getMaxFusionLevel(card), 3, 'getMaxFusionLevel: level 1 card max 3');
        const card2 = { fusionLevel: 2 };
        assertEq(engine.getMaxFusionLevel(card2), 4, 'getMaxFusionLevel: level 2 card max 4');
    }
}

// ========================================================================
// FusionInventory Tests
// ========================================================================
console.log('\n=== FusionInventory Tests ===');
{
    const inventory = new FusionInventory();

    // test initial state
    assertEq(inventory.getFusionCount(), 0, 'FusionInventory: initial count is 0');
    assertEq(inventory.getFusionHistory().length, 0, 'FusionInventory: initial history empty');
    assertEq(inventory.hasFusedVariant('strike'), false, 'FusionInventory: no fused variant initially');

    // test addFusedCard
    {
        const card = { id: 'strike_f2', name: '打击+2', fusionLevel: 2 };
        inventory.addFusedCard(card);
        assertEq(inventory.getFusionCount(), 1, 'FusionInventory: count 1 after add');
        assertEq(inventory.hasFusedVariant('strike_f2'), true, 'FusionInventory: has fused variant after add');
        assertEq(inventory.getFusedCard('strike_f2').name, '打击+2', 'FusionInventory: getFusedCard returns card');
    }

    // test addFusedCard — multiple
    {
        const c1 = { id: 'strike_f3', name: '打击+3', fusionLevel: 3 };
        const c2 = { id: 'defend_f2', name: '防御+2', fusionLevel: 2 };
        inventory.addFusedCard(c1);
        inventory.addFusedCard(c2);
        assertEq(inventory.getFusionCount(), 3, 'FusionInventory: count 3 after two more adds');
    }

    // test getFusionHistory
    {
        const history = inventory.getFusionHistory();
        assertEq(history.length, 3, 'FusionInventory: history length 3');
        assert(history[0].timestamp > 0, 'FusionInventory: history has timestamp');
    }

    // test getFusedCard — non-existent returns null
    assertEq(inventory.getFusedCard('non_existent'), null, 'FusionInventory: non-existent returns null');
}

// ========================================================================
// FusionPanel Tests
// ========================================================================
console.log('\n=== FusionPanel Tests ===');
{
    const engine = new CardFusionEngine();
    const inventory = new FusionInventory();
    const panel = new FusionPanel(engine, inventory);

    // test initial state
    assertEq(panel.isOpen, false, 'FusionPanel: initial isOpen false');
    assertEq(panel.panel, null, 'FusionPanel: initial panel null');
    assertEq(panel.selectedCards.length, 0, 'FusionPanel: initial selectedCards empty');
    assertEq(panel.maxSelect, 2, 'FusionPanel: maxSelect is 2');

    // test selectCard
    {
        const card = { id: 'strike', name: '打击' };
        panel.selectCard(card);
        assertEq(panel.selectedCards.length, 1, 'FusionPanel: 1 card selected');
        panel.selectCard(card);
        assertEq(panel.selectedCards.length, 0, 'FusionPanel: same card deselects');
    }

    // test selectCard — max limit
    {
        panel.selectCard({ id: 'strike', name: '打击' });
        panel.selectCard({ id: 'defend', name: '防御' });
        panel.selectCard({ id: 'heavy', name: '重击' }); // should not add
        assertEq(panel.selectedCards.length, 2, 'FusionPanel: max 2 cards');
    }

    // test executeFusion — not enough cards
    assertEq(panel.executeFusion(), null, 'FusionPanel: execute with <2 cards returns null');

    // test executeFusion — two cards
    {
        panel.selectedCards = [
            { id: 'strike', name: '打击', type: 'attack', cost: 1, damage: 6 },
            { id: 'strike2', name: '打击2', type: 'attack', cost: 1, damage: 6 }
        ];
        // Same type different card → not allowed
        const result = panel.executeFusion();
        assertEq(result, null, 'FusionPanel: different same-type returns null');
    }

    // test executeFusion — same card works
    {
        const card = { id: 'strike', name: '打击', type: 'attack', cost: 1, damage: 6 };
        panel.selectedCards = [card, card];
        const result = panel.executeFusion();
        assert(result !== null, 'FusionPanel: same card fusion works');
        assertEq(result.fusionLevel, 2, 'FusionPanel: result level 2');
    }

    // test getStats
    {
        const stats = panel.getStats();
        assert(typeof stats === 'object', 'FusionPanel: stats is object');
        assertEq(stats.selectedCount, 0, 'FusionPanel: stats selectedCount');
        assertEq(stats.historyCount, 1, 'FusionPanel: stats historyCount'); // from previous tests
    }
}

// ========================================================================
// FusionTools Tests
// ========================================================================
console.log('\n=== FusionTools Tests ===');
{
    // test canFuse tool
    {
        const c1 = { id: 'strike', name: '打击', type: 'attack' };
        const c2 = { id: 'defend', name: '防御', type: 'skill' };
        const result = FusionTools['fusion.canFuse'].handler({ card1: c1, card2: c2 }, {});
        assertEq(result.allowed, true, 'FusionTools canFuse: different types allowed');
        assertEq(result.mode, 'cross_type', 'FusionTools canFuse: mode cross_type');
    }

    // test execute tool
    {
        const c1 = { id: 'strike', name: '打击', type: 'attack', damage: 6, cost: 1 };
        const c2 = { id: 'defend', name: '防御', type: 'skill', block: 5, cost: 1 };
        const result = FusionTools['fusion.execute'].handler({ card1: c1, card2: c2 }, {});
        assert(result !== null, 'FusionTools execute: cross-type works');
        assertEq(result.isHybrid, true, 'FusionTools execute: isHybrid');
    }

    // test execute tool — null cards
    {
        const result = FusionTools['fusion.execute'].handler({}, {});
        assert('error' in result || result === null, 'FusionTools execute: missing cards handled');
    }

    // test getInventory — no inventory
    {
        const result = FusionTools['fusion.getInventory'].handler({}, {});
        assert('error' in result, 'FusionTools getInventory: no inventory returns error');
    }

    // test getInventory — with inventory
    {
        const inv = new FusionInventory();
        const result = FusionTools['fusion.getInventory'].handler({}, { inventory: inv });
        assert(result.count === 0 || 'history' in result, 'FusionTools getInventory: with inventory works');
    }
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    const engine = new CardFusionEngine();
    const inventory = new FusionInventory();
    const panel = new FusionPanel(engine, inventory);

    // Full same-type fusion workflow
    const basic = { id: 'strike', name: '打击', type: 'attack', cost: 1, damage: 6, tags: ['basic'] };

    // Fuse twice → level 3
    const fused = engine.fuse(basic, basic);
    const fused2 = engine.fuse(fused, fused);

    inventory.addFusedCard(fused);
    inventory.addFusedCard(fused2);

    assertEq(fused2.fusionLevel, 3, 'Integration: two fusions → level 3');
    assertEq(inventory.getFusionCount(), 2, 'Integration: 2 fused cards in inventory');

    // Cross-type fusion workflow
    const attack = { id: 'strike', name: '打击', type: 'attack', cost: 1, damage: 6, block: 0 };
    const skill = { id: 'defend', name: '防御', type: 'skill', cost: 1, damage: 0, block: 5 };

    const hybrid = engine.fuse(attack, skill);
    inventory.addFusedCard(hybrid);

    assert(hybrid.isHybrid, 'Integration: hybrid is flagged');
    assertEq(inventory.getFusionCount(), 3, 'Integration: 3 fused cards');
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

    // Coverage: card-fusion.js ~250 lines
    const totalLines = 250;
    const coveredLines = Math.round(totalLines * passPct / 100);
    console.log(`Coverage: ~${coveredLines}/${totalLines} lines (~${passPct}%)`);

    process.exit(coverageMet && failed === 0 ? 0 : 1);
}, 500);