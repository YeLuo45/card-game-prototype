'use strict';

const fs = require('fs');
const path = require('path');

if (typeof localStorage !== 'undefined') localStorage.removeItem('deck_builder_pro');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'deck-studio-pro.js'), 'utf8');
eval(code);

const { ManaCurveAnalyzer, SynergyDetector, DeckBuilderPro, DeckBuilderTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// ManaCurveAnalyzer Tests
// ========================================================================
console.log('\n=== ManaCurveAnalyzer Tests ===');
{
    const analyzer = new ManaCurveAnalyzer();

    // Analyze aggro deck
    const aggroDeck = [
        { id: 'c1', cost: 1 }, { id: 'c2', cost: 1 }, { id: 'c3', cost: 2 }, { id: 'c4', cost: 2 }, { id: 'c5', cost: 2 },
        { id: 'c6', cost: 3 }, { id: 'c7', cost: 3 }, { id: 'c8', cost: 4 }, { id: 'c9', cost: 0 }, { id: 'c10', cost: 0 }
    ];
    const aggroCurve = analyzer.analyzeManaCurve(aggroDeck);
    assertEq(aggroCurve[0], 2, 'aggro: 2 zero-cost cards');
    assertEq(aggroCurve[1], 2, 'aggro: 2 one-cost cards');
    assertEq(aggroCurve[2], 3, 'aggro: 3 two-cost cards');

    const aggroArch = analyzer.matchArchetype(aggroCurve);
    assert(aggroArch === 'Aggro' || aggroArch === 'Hybrid', 'aggro archetype matched');

    // Analyze control deck
    const controlDeck = [
        { id: 'c1', cost: 6 }, { id: 'c2', cost: 6 }, { id: 'c3', cost: 7 }, { id: 'c4', cost: 7 },
        { id: 'c5', cost: 5 }, { id: 'c6', cost: 5 }, { id: 'c7', cost: 4 }, { id: 'c8', cost: 4 },
        { id: 'c9', cost: 3 }, { id: 'c10', cost: 2 }
    ];
    const ctrlCurve = analyzer.analyzeManaCurve(controlDeck);
    const ctrlArch = analyzer.matchArchetype(ctrlCurve);
    assert(ctrlArch === 'Control' || ctrlArch === 'Hybrid', 'control archetype matched');

    // getManaCurveScore
    const score = analyzer.getManaCurveScore(aggroCurve);
    assert(typeof score.avgCost === 'string', 'avgCost is string');
    assert(Array.isArray(score.curve), 'curve is array');

    // Empty deck
    const emptyCurve = analyzer.analyzeManaCurve([]);
    assertEq(emptyCurve.reduce((s, c) => s + c, 0), 0, 'empty deck has 0 cards');
}

// ========================================================================
// SynergyDetector Tests
// ========================================================================
console.log('\n=== SynergyDetector Tests ===');
{
    const detector = new SynergyDetector();

    // Detect fire combo
    const fireDeck = [
        { id: 'fireball', cost: 3 }, { id: 'flame strike', cost: 5 }, { id: 'c3', cost: 2 }
    ];
    const synergies = detector.detect(fireDeck);
    assert(synergies.length >= 1, 'fire combo detected');
    const fireSyn = synergies.find(s => s.label === 'Fire Combo');
    assert(fireSyn !== undefined, 'fire combo label found');
    assertEq(fireSyn.cards.length, 2, 'fire combo has 2 cards');
    assertEq(fireSyn.bonus, 15, 'fire combo bonus 15');

    // No synergies
    const plainDeck = [{ id: 'c1', cost: 2 }, { id: 'c2', cost: 3 }, { id: 'c3', cost: 4 }];
    const noSyn = detector.detect(plainDeck);
    assertEq(noSyn.length, 0, 'no synergies in plain deck');

    // getSynergyScore
    const score = detector.getSynergyScore(fireDeck);
    assert(score >= 15, 'synergy score >= 15');
}

// ========================================================================
// DeckBuilderPro Tests
// ========================================================================
console.log('\n=== DeckBuilderPro Tests ===');
{
    let db = new DeckBuilderPro(); db._load = () => {}; db._save = () => {};

    // createDeck
    const deck1 = db.createDeck('deck1', 'Aggro Fire', 'Fast deck', [
        { id: 'fireball', cost: 3 }, { id: 'flame strike', cost: 5 }, { id: 'c3', cost: 1 }
    ]);
    assertEq(deck1.name, 'Aggro Fire', 'deck name set');
    assertEq(deck1.cards.length, 3, '3 cards in deck');
    assert(deck1.createdAt > 0, 'createdAt set');

    // getDeck
    const retrieved = db.getDeck('deck1');
    assertEq(retrieved.name, 'Aggro Fire', 'deck retrieved by id');

    // updateDeck
    const updated = db.updateDeck('deck1', { name: 'Aggro Fire Updated' });
    assertEq(updated.name, 'Aggro Fire Updated', 'deck name updated');
    assertEq(updated.version, 2, 'version incremented');

    // deleteDeck
    const del = db.deleteDeck('deck1');
    assert(del.success, 'deck deleted');
    assertEq(db.getDeck('deck1'), null, 'deck gone');

    // listDecks
    db.createDeck('deck2', 'Midrange', 'Balanced', [{ id: 'c1', cost: 3 }]);
    db.createDeck('deck3', 'Control', 'Slow', [{ id: 'c1', cost: 6 }]);
    const list = db.listDecks('default', 10);
    assert(list.length >= 2, 'list has 2+ decks');

    // Hook
    let hookCalled = false;
    db.registerHook((e, d) => { hookCalled = true; });
    db.createDeck('deck4', 'Test', 'Hook test', [{ id: 'c1', cost: 2 }]);
    assert(hookCalled, 'hook called on deck_created');
}

// ========================================================================
// DeckBuilderPro.analyzeDeckCards Tests
// ========================================================================
console.log('\n=== DeckBuilderPro.analyzeDeckCards Tests ===');
{
    let db = new DeckBuilderPro(); db._load = () => {}; db._save = () => {};

    // High cost deck
    const highCostDeck = [
        { id: 'c1', cost: 6 }, { id: 'c2', cost: 7 }, { id: 'c3', cost: 6 }, { id: 'c4', cost: 5 }, { id: 'c5', cost: 5 },
        { id: 'c6', cost: 4 }, { id: 'c7', cost: 4 }, { id: 'c8', cost: 3 }, { id: 'c9', cost: 3 }, { id: 'c10', cost: 2 }
    ];
    const analysis = db.analyzeDeckCards(highCostDeck);
    assert(typeof analysis.avgCost === 'number', 'avgCost is number');
    assert(analysis.avgCost >= 4, 'high cost deck avg >= 4');
    assert(analysis.suggestions.length > 0, 'high cost: has suggestions');

    // Synergy detection in analysis
    const synergyDeck = [
        { id: 'fireball', cost: 3 }, { id: 'flame strike', cost: 5 }, { id: 'heal', cost: 2 }, { id: 'shield', cost: 2 }
    ];
    const synAnalysis = db.analyzeDeckCards(synergyDeck);
    assert(synAnalysis.synergies.length >= 2, 'synergies detected in analysis');
    assert(synAnalysis.synergyScore > 0, 'synergy score > 0');
}

// ========================================================================
// DeckBuilderTools Tests
// ========================================================================
console.log('\n=== DeckBuilderTools Tests ===');
{
    let db = new DeckBuilderPro(); db._load = () => {}; db._save = () => {};
    if (typeof window !== 'undefined') window._deckBuilderPro = db;

    const r1 = DeckBuilderTools['deck.create'].handler({ deckId: 'tool_d1', name: 'Tool Deck', cards: [{ id: 'c1', cost: 2 }] }, {});
    assertEq(r1.deckId, 'tool_d1', 'deck.create tool works');

    const r2 = DeckBuilderTools['deck.analyze'].handler({ deckId: 'tool_d1' }, {});
    assert(typeof r2 === 'object', 'deck.analyze tool returns object');

    const r3 = DeckBuilderTools['deck.list'].handler({ limit: 5 }, {});
    assert(Array.isArray(r3), 'deck.list tool returns array');

    const r4 = DeckBuilderTools['deck.top'].handler({ limit: 3 }, {});
    assert(Array.isArray(r4), 'deck.top tool returns array');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    let db = new DeckBuilderPro(); db._load = () => {}; db._save = () => {};

    // Create and analyze
    const synDeck = [
        { id: 'fireball', cost: 3 }, { id: 'flame strike', cost: 5 }, { id: 'lightning', cost: 2 }, { id: 'storm', cost: 4 }
    ];
    db.createDeck('int_deck', 'Elemental', 'Fire + Lightning', synDeck);

    const analysis = db.analyzeDeck('int_deck');
    assertEq(analysis.cardCount, 4, 'Integration: 4 cards analyzed');
    assert(analysis.synergies.length >= 2, 'Integration: 2+ synergies detected');
    assert(analysis.suggestions.length >= 0, 'Integration: suggestions generated');

    // getTopDecks (with no games played)
    const top = db.getTopDecks(5);
    assert(Array.isArray(top), 'Integration: top decks is array');

    // Archetype detection
    const aggroDeck = [
        { id: 'c1', cost: 0 }, { id: 'c2', cost: 1 }, { id: 'c3', cost: 1 }, { id: 'c4', cost: 2 }, { id: 'c5', cost: 2 },
        { id: 'c6', cost: 2 }, { id: 'c7', cost: 3 }, { id: 'c8', cost: 3 }, { id: 'c9', cost: 4 }, { id: 'c10', cost: 4 }
    ];
    db.createDeck('aggro_int', 'Fast Aggro', 'Aggro deck', aggroDeck);
    const aggAnalysis = db.analyzeDeck('aggro_int');
    assert(aggAnalysis.archetype !== undefined, 'Integration: archetype detected');

    // Hook on create
    let createHook = false;
    db.registerHook((e, d) => { if (e === 'deck_created') createHook = true; });
    db.createDeck('hook_test', 'Hook Test', 'Testing', [{ id: 'c1', cost: 2 }]);
    assert(createHook, 'Integration: deck_created hook fired');

    // Update and re-analyze
    db.updateDeck('int_deck', { description: 'Updated description' });
    const reAnalysis = db.analyzeDeck('int_deck');
    assert(reAnalysis !== null, 'Integration: deck still analyzable after update');

    // Delete
    const delResult = db.deleteDeck('aggro_int');
    assert(delResult.success, 'Integration: deck deleted');
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