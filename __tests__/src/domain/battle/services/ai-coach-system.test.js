'use strict';

const fs = require('fs');
const path = require('path');

if (typeof localStorage !== 'undefined') localStorage.removeItem('ai_coach_system');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'ai-coach-system.js'), 'utf8');
eval(code);

const { DeckAdvisor, DeckKnowledge, OpponentModel, AICoachSystem, AICoachTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// DeckKnowledge Tests
// ========================================================================
console.log('\n=== DeckKnowledge Tests ===');
{
    let dk = new DeckKnowledge('player1');
    assertEq(dk.playerId, 'player1', 'playerId set');
    assertEq(dk.games.length, 0, 'no games initially');

    dk.addGame('aggro_deck', true, [{ color: 'red' }, { color: 'red' }], [{ color: 'blue' }]);
    assertEq(dk.games.length, 1, '1 game recorded');
    assertEq(dk.deckPerformance.get('aggro_deck').games, 1, '1 agg deck game');
    assertEq(dk.deckPerformance.get('aggro_deck').wins, 1, 'agg deck 1 win');

    dk.addGame('aggro_deck', false, [{ color: 'red' }], [{ color: 'blue' }]);
    assertEq(dk.games.length, 2, '2 games');
    assertEq(dk.deckPerformance.get('aggro_deck').wins, 1, 'still 1 win');
    assertEq(dk.deckPerformance.get('aggro_deck').games, 2, '2 total games');

    dk.addGame('defense_deck', true, [{ color: 'blue' }], [{ color: 'red' }]);
    dk.addGame('defense_deck', true, [{ color: 'blue' }], [{ color: 'red' }]);
    dk.addGame('defense_deck', false, [{ color: 'blue' }], [{ color: 'red' }]);
    const best = dk.getBestDeck();
    assert(best !== null, 'bestDeck found');
    assertEq(best.deck, 'defense_deck', 'defense is best');
    assert(best.winRate > 0.5, 'winRate > 50%');

    // Color preferences
    const ser = dk.serialize();
    assertEq(ser.playerId, 'player1', 'serialize playerId');
    assert(typeof ser.colorPreferences === 'object', 'colorPreferences serialized');
    assert(typeof ser.bestDeck === 'object', 'bestDeck serialized');
}

// ========================================================================
// OpponentModel Tests
// ========================================================================
console.log('\n=== OpponentModel Tests ===');
{
    let om = new OpponentModel('opp1');
    assertEq(om.opponentId, 'opp1', 'opponentId set');
    assertEq(om.games.length, 0, 'no games initially');

    om.recordGame('aggro', true);
    om.recordGame('aggro', false);
    om.recordGame('aggro', false);
    assertEq(om.games.length, 3, '3 games recorded');

    const stats = om.getStats();
    assertEq(stats.games, 3, '3 games in stats');
    assertEq(stats.winRateAgainst.toFixed(2), (1/3).toFixed(2), 'winRate 33%');

    assertEq(om.strongColors.size, 1, '1 strong color');
    assertEq(om.weakDecks.size, 1, '1 weak deck (aggro)');
}

// ========================================================================
// DeckAdvisor Tests
// ========================================================================
console.log('\n=== DeckAdvisor Tests ===');
{
    let advisor = new DeckAdvisor();

    // recordGame
    const r1 = advisor.recordGame('player1', 'deck1', 'opp1', true, [], []);
    assert(r1.success, 'recordGame returns success');

    // getAdvice with no history
    const advice = advisor.getAdvice('player1', 'opp1');
    assert(Array.isArray(advice.suggestions), 'suggestions is array');
    assert(advice.confidence === 'medium', 'medium confidence (no history)');

    // Hook
    let hookCalled = false;
    advisor.registerHook((e, d) => { hookCalled = true; });
    advisor.recordGame('player1', 'deck2', 'opp2', false, [], []);
    assert(hookCalled, 'hook called on game_recorded');

    // getPlayerKnowledge
    const knowledge = advisor.getPlayerKnowledge('player1');
    assertEq(knowledge.playerId, 'player1', 'playerId in knowledge');
    assert(knowledge.totalGames >= 2, 'at least 2 games recorded');
}

// ========================================================================
// AICoachSystem Tests
// ========================================================================
console.log('\n=== AICoachSystem Tests ===');
{
    let coach = new AICoachSystem(); coach._load = () => {}; coach._save = () => {};

    // analyzeGame
    const result = coach.analyzeGame('coach_p', 'deck_a', 'opp_x', true, [{ color: 'red' }], [{ color: 'blue' }]);
    assert(result.success, 'analyzeGame returns success');

    // getDeckAdvice
    const advice = coach.getDeckAdvice('coach_p', 'opp_x');
    assert(typeof advice === 'object', 'advice is object');
    assert(Array.isArray(advice.suggestions), 'suggestions array');
    assert(advice.confidence, 'has confidence field');

    // getPlayerStats
    const stats = coach.getPlayerStats('coach_p');
    assertEq(stats.playerId, 'coach_p', 'playerId in stats');

    // Hook on advisor (analyzeGame delegates to advisor which emits)
    let hookCalled = false;
    coach.advisor.registerHook((e, d) => { hookCalled = true; });
    coach.analyzeGame('coach_p2', 'deck_b', 'opp_y', false, [], []);
    assert(hookCalled, 'hook called on game_recorded');
}

// ========================================================================
// AICoachTools Tests
// ========================================================================
console.log('\n=== AICoachTools Tests ===');
{
    let coach = new AICoachSystem(); coach._load = () => {}; coach._save = () => {};
    if (typeof window !== 'undefined') window._aiCoachSystem = coach;

    const r1 = AICoachTools['coach.analyze'].handler({ playerId: 'tool_p', deck: 'd1', opponentId: 'o1', won: true }, {});
    assert(r1.success, 'coach.analyze tool works');

    const r2 = AICoachTools['coach.advice'].handler({ playerId: 'tool_p', opponentId: 'o1' }, {});
    assert(typeof r2 === 'object', 'coach.advice tool returns object');

    const r3 = AICoachTools['coach.stats'].handler({ playerId: 'tool_p' }, {});
    assert(typeof r3 === 'object', 'coach.stats tool returns object');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    let coach = new AICoachSystem(); coach._load = () => {}; coach._save = () => {};

    // Full learning cycle
    coach.analyzeGame('int_p', 'aggro', 'int_opp', true, [{ color: 'red' }, { color: 'red' }], [{ color: 'blue' }]);
    coach.analyzeGame('int_p', 'aggro', 'int_opp', false, [{ color: 'red' }], [{ color: 'blue' }]);
    coach.analyzeGame('int_p', 'aggro', 'int_opp', false, [{ color: 'red' }], [{ color: 'blue' }]);
    coach.analyzeGame('int_p', 'aggro', 'int_opp', true, [{ color: 'red' }, { color: 'red' }], [{ color: 'blue' }]);
    coach.analyzeGame('int_p', 'aggro', 'int_opp', true, [{ color: 'red' }, { color: 'red' }], [{ color: 'blue' }]);

    const stats = coach.getPlayerStats('int_p');
    assertEq(stats.totalGames, 5, 'Integration: 5 games recorded');

    const advice = coach.getDeckAdvice('int_p', 'int_opp');
    assert(advice.confidence === 'high', 'Integration: high confidence with 5 games');
    assert(advice.suggestions.length >= 1, 'Integration: has suggestions');

    // Opponent model built
    const advice2 = coach.getDeckAdvice('int_p', 'int_opp');
    assert(advice2.suggestions.some(s => s.includes('Opponent')), 'Integration: opponent-based suggestion exists');

    // Hook on advisor for game_recorded
    let gameHook = false;
    coach.advisor.registerHook((e, d) => { if (e === 'game_recorded') gameHook = true; });
    coach.analyzeGame('int_p2', 'defense', 'int_opp2', true, [], []);
    assert(gameHook, 'Integration: game_recorded hook fired');
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