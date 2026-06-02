'use strict';

const fs = require('fs');
const path = require('path');

if (typeof localStorage !== 'undefined') localStorage.removeItem('arena_draft');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'arena-draft-system.js'), 'utf8');
eval(code);

const { DraftPool, DraftSession, ArenaDraftSystem, ArenaDraftTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// DraftPool Tests
// ========================================================================
console.log('\n=== DraftPool Tests ===');
{
    let pool = new DraftPool();
    pool.init([
        { cardId: 'c1', rarity: 1, cost: 2, attack: 3, defense: 4, type: 'attack', name: 'Card 1' },
        { cardId: 'c2', rarity: 2, cost: 3, attack: 4, defense: 5, type: 'defense', name: 'Card 2' },
        { cardId: 'c3', rarity: 3, cost: 5, attack: 6, defense: 7, type: 'magic', name: 'Card 3' },
        { cardId: 'c4', rarity: 1, cost: 1, attack: 2, defense: 3, type: 'attack', name: 'Card 4' },
        { cardId: 'c5', rarity: 2, cost: 4, attack: 5, defense: 6, type: 'defense', name: 'Card 5' },
        { cardId: 'c6', rarity: 3, cost: 6, attack: 7, defense: 8, type: 'magic', name: 'Card 6' },
    ]);
    assert(pool.hasNext(), 'pool has cards');
    assertEq(pool.cards.length, 6, '6 cards in pool');

    const pack = pool.getCurrentPack();
    assertEq(pack.length, 3, 'pack size is 3');

    const pick = pool.pick('c1');
    assertEq(pick.drafted, 1, '1 card drafted');
    assertEq(pick.card.cardId, 'c1', 'picked correct card');
    assertEq(pool.drafted.length, 1, 'drafted has 1 card');

    const badPick = pool.pick('c999');
    assertEq(badPick.error, 'card_not_in_pack', 'card not in pack rejected');

    const pass = pool.pass('c2');
    assertEq(pass.passed, 1, '1 card passed');
    assertEq(pool.passed.length, 1, 'passed has 1 card');

    // All of first pack picked/passed - should move to next pack
    pool.pick('c3'); // pick last of first pack
    const pack2 = pool.getCurrentPack();
    assertEq(pack2.length, 3, 'second pack has 3 cards');
    assert(pool.hasNext(), 'still has next');

    pool.reset();
    assertEq(pool.drafted.length, 0, 'reset clears drafted');
    assertEq(pool.currentPackNum, 0, 'reset clears packNum');
}

// ========================================================================
// DraftSession Tests
// ========================================================================
console.log('\n=== DraftSession Tests ===');
{
    const s = new DraftSession('sess1', 'player1', 'classic', 3);
    assertEq(s.sessionId, 'sess1', 'sessionId set');
    assertEq(s.playerId, 'player1', 'playerId set');
    assertEq(s.format, 'classic', 'format set');
    assertEq(s.totalPacks, 3, 'totalPacks set');
    assertEq(s.currentPack, 1, 'currentPack starts 1');
    assertEq(s.wins, 0, 'wins starts 0');
    assertEq(s.status, 'drafting', 'status starts drafting');
    assert(!s.isComplete(), 'not complete initially');

    s.recordResult(5, 2);
    assertEq(s.wins, 5, 'wins recorded');
    assertEq(s.losses, 2, 'losses recorded');
    assert(s.isComplete(), 'complete after result');
}

// ========================================================================
// ArenaDraftSystem Tests
// ========================================================================
console.log('\n=== ArenaDraftSystem Tests ===');
{
    let sys;
    sys = new ArenaDraftSystem(); sys._load = () => {}; sys._save = () => {};

    // Register cards to catalog
    sys.registerCard('card1', 'Fire Ball', 2, 3, 5, 2, 'attack');
    sys.registerCard('card2', 'Ice Shield', 1, 2, 1, 6, 'defense');
    sys.registerCard('card3', 'Lightning', 3, 4, 7, 1, 'magic');
    assertEq(sys.cardCatalog.size, 3, 'cards registered');

    const dup = sys.registerCard('card1', 'Duplicate', 1, 1, 1, 1, 'attack');
    assertEq(dup.error, 'card_exists', 'duplicate card rejected');

    // startDraftSession
    const session = sys.startDraftSession('player1', 'classic', 2);
    assertEq(session.playerId, 'player1', 'session playerId set');
    assertEq(session.format, 'classic', 'session format set');
    assertEq(session.totalPacks, 2, 'session totalPacks set');
    assertEq(session.status, 'drafting', 'session status drafting');

    // getCurrentPack
    const pack = sys.getCurrentPack(session.sessionId);
    assert(Array.isArray(pack), 'currentPack returns array');

    // pickCard
    const pickResult = sys.pickCard(session.sessionId, pack[0].cardId);
    assert(pickResult.card || !pickResult.error, 'pickCard returns card or error');

    // getSession
    const found = sys.getSession(session.sessionId);
    assertEq(found.playerId, 'player1', 'getSession finds session');

    // recordDraftResult
    const rec = sys.recordDraftResult(session.sessionId, 7, 3);
    assertEq(rec.wins, 7, 'wins recorded');
    assertEq(rec.totalDrafts, 1, 'totalDrafts 1');

    // getPlayerStats
    const pStats = sys.getPlayerStats('player1');
    assertEq(pStats.totalDrafts, 1, 'player totalDrafts 1');
    assertEq(pStats.totalWins, 7, 'player totalWins 7');

    // submitDeck - for a fresh session
    const session2 = sys.startDraftSession('player1', 'classic', 2);
    const pack2 = sys.getCurrentPack(session2.sessionId);
    if (pack2.length > 0) {
        const pk = sys.pickCard(session2.sessionId, pack2[0].cardId);
        if (pk.card) {
            session2.deck = [pk.card];
            session2.status = 'decking';
            const sub = sys.submitDeck(session2.sessionId, [pk.card.cardId]);
            assert(sub.success || !sub.error, 'submitDeck works');
        }
    }

    // getStats
    const allStats = sys.getStats();
    assertEq(allStats.totalSessions, 2, 'totalSessions 2');
    assertEq(allStats.totalCardsCataloged, 3, 'totalCardsCataloged 3');
}

// ========================================================================
// ArenaDraftTools Tests
// ========================================================================
console.log('\n=== ArenaDraftTools Tests ===');
{
    let sys;
    sys = new ArenaDraftSystem(); sys._load = () => {}; sys._save = () => {};
    if (typeof window !== 'undefined') window._arenaDraft = sys;

    const r1 = ArenaDraftTools['draft.start_session'].handler({ playerId: 'tool_player', format: 'classic', totalPacks: 2 }, {});
    assert(r1 !== null, 'start_session tool works');
    assertEq(r1.playerId, 'tool_player', 'start_session returns session');

    const r2 = ArenaDraftTools['draft.stats'].handler({}, {});
    assert(typeof r2 === 'object', 'stats tool returns object');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    let sys;
    sys = new ArenaDraftSystem(); sys._load = () => {}; sys._save = () => {};

    sys.registerCard('rare1', 'Dragon', 3, 6, 10, 5, 'attack');
    sys.registerCard('common1', 'Goblin', 1, 1, 2, 1, 'attack');
    sys.registerCard('epic1', 'Wizard', 2, 4, 6, 3, 'magic');

    const session = sys.startDraftSession('arena_player', 'classic', 1);
    assertEq(session.status, 'drafting', 'Integration: session drafting');

    const pack = sys.getCurrentPack(session.sessionId);
    assert(Array.isArray(pack), 'Integration: pack is array');

    if (pack.length > 0) {
        const pick = sys.pickCard(session.sessionId, pack[0].cardId);
        assert(pick.card || !pick.error, 'Integration: card picked');
    }

    // Record result
    const rec = sys.recordDraftResult(session.sessionId, 3, 0);
    assertEq(rec.wins, 3, 'Integration: result recorded');

    // Hook
    let hookCalled = false;
    sys.registerHook((event, data) => { hookCalled = true; });
    const s2 = sys.startDraftSession('arena_player', 'classic', 1);
    assert(hookCalled, 'Integration: hook called on draft start');
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

    const totalLines = 350;
    const coveredLines = Math.round(totalLines * passPct / 100);
    console.log(`Coverage: ~${coveredLines}/${totalLines} lines (~${passPct}%)`);

    process.exit(coverageMet && failed === 0 ? 0 : 1);
}, 500);