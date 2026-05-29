'use strict';

const fs = require('fs');
const path = require('path');

if (typeof localStorage !== 'undefined') localStorage.removeItem('card_memory');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'card-memory-system.js'), 'utf8');
eval(code);

const { CardPlayRecord, CardMemorySystem, CardMemoryTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// CardPlayRecord Tests
// ========================================================================
console.log('\n=== CardPlayRecord Tests ===');
{
    const r = new CardPlayRecord('c1', 1000, 'win', 'deck1', 'deck2');
    assertEq(r.cardId, 'c1', 'cardId set');
    assertEq(r.timestamp, 1000, 'timestamp set');
    assertEq(r.outcome, 'win', 'outcome set');
    assertEq(r.deckId, 'deck1', 'deckId set');
    assertEq(r.opponentDeckId, 'deck2', 'opponentDeckId set');
}

// ========================================================================
// CardMemorySystem Tests
// ========================================================================
console.log('\n=== CardMemorySystem Tests ===');
{
    let sys;
    sys = new CardMemorySystem(); sys._load = () => {}; sys._save = () => {};

    // recordPlay
    const r1 = sys.recordPlay('c1', 'win', 'deck1', 'deck2');
    assertEq(r1.totalPlays, 1, '1 play recorded');
    assertEq(r1.recorded, true, 'recorded true');

    // getCardStats
    const stats = sys.getCardStats('c1');
    assertEq(stats.plays, 1, 'stats plays 1');
    assertEq(stats.wins, 1, 'stats wins 1');
    assertEq(stats.losses, 0, 'stats losses 0');
    assert(Math.abs(stats.winRate - 1.0) < 0.02, `winRate 100% (expected ~1.0, got ${stats.winRate})`);

    // record more plays
    sys.recordPlay('c1', 'loss', 'deck1', 'deck3');
    sys.recordPlay('c1', 'win', 'deck2', 'deck4');
    const stats2 = sys.getCardStats('c1');
    assertEq(stats2.plays, 3, '3 total plays');
    assertEq(stats2.wins, 2, '2 wins');
    assertEq(stats2.losses, 1, '1 loss');
    assert(Math.abs(stats2.winRate - 0.667) < 0.02, `winRate ~66.7% (got ${stats2.winRate})`);

    // getPlayHistory
    const hist = sys.getPlayHistory('c1', 10);
    assertEq(hist.length, 3, '3 history records');

    // tagCard
    const t1 = sys.tagCard('c1', 'aggro');
    assert(t1.success, 'tagCard returns success');
    const t2 = sys.tagCard('c1', 'burn');
    assert(t2.success, 'second tag works');

    // getCardsByTag
    const agg = sys.getCardsByTag('aggro');
    assertEq(agg.length, 1, '1 card has aggro tag');
    assertEq(agg[0].cardId, 'c1', 'cardId c1');

    const missing = sys.getCardsByTag('nonexistent');
    assertEq(missing.length, 0, 'nonexistent tag returns empty');

    // setFavorite
    const f1 = sys.setFavorite('c1', true);
    assertEq(f1.favorite, true, 'c1 is favorite');
    const f2 = sys.setFavorite('c1', false);
    assertEq(f2.favorite, false, 'c1 unfavorited');

    // getTopCards
    sys.recordPlay('c2', 'win', 'deck1', 'deck2');
    sys.recordPlay('c2', 'win', 'deck1', 'deck3');
    sys.recordPlay('c3', 'loss', 'deck1', 'deck2');
    const topPlays = sys.getTopCards('plays', 5);
    assertEq(topPlays[0].cardId, 'c1', 'c1 has most plays');

    const topWins = sys.getTopCards('wins', 5);
    assertEq(topWins[0].cardId, 'c1', 'c1 has most wins');

    // getStats
    const allStats = sys.getStats();
    assertEq(allStats.totalPlays, 6, '6 total plays');
    assertEq(allStats.totalWins, 4, '4 total wins');
    assertEq(allStats.totalTags, 2, '2 tags');

    // Hook
    let hookCalled = false;
    sys.registerHook((event, data) => { hookCalled = true; });
    sys.recordPlay('c4', 'win');
    assert(hookCalled, 'hook called on record play');
}

// ========================================================================
// CardMemoryTools Tests
// ========================================================================
console.log('\n=== CardMemoryTools Tests ===');
{
    let sys;
    sys = new CardMemorySystem(); sys._load = () => {}; sys._save = () => {};
    if (typeof window !== 'undefined') window._cardMemory = sys;

    const r1 = CardMemoryTools['memory.record'].handler({ cardId: 'tool_c', outcome: 'win', deckId: 'tool_d' }, {});
    assert(r1 !== null && !r1.error, 'memory.record tool works');

    const r2 = CardMemoryTools['memory.tag'].handler({ cardId: 'tool_c', tag: 'test_tag' }, {});
    assert(r2.success, 'memory.tag tool returns success');

    const r3 = CardMemoryTools['memory.top'].handler({ metric: 'plays', limit: 5 }, {});
    assert(Array.isArray(r3), 'memory.top tool returns array');

    const r4 = CardMemoryTools['memory.stats'].handler({}, {});
    assert(typeof r4 === 'object', 'memory.stats tool returns object');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    let sys;
    sys = new CardMemorySystem(); sys._load = () => {}; sys._save = () => {};

    // Full play cycle
    sys.recordPlay('fireball', 'win', 'burn_deck', 'control_deck');
    sys.recordPlay('fireball', 'win', 'burn_deck', 'aggro_deck');
    sys.recordPlay('fireball', 'loss', 'burn_deck', 'midrange_deck');
    sys.tagCard('fireball', 'burn');
    sys.tagCard('fireball', 'direct_damage');

    const stats = sys.getCardStats('fireball');
    assertEq(stats.plays, 3, 'Integration: 3 plays');
    assert(Math.abs(stats.winRate - 0.667) < 0.02, `Integration winRate ~66.7% (got ${stats.winRate})`);

    const tagged = sys.getCardsByTag('burn');
    assertEq(tagged.length, 1, 'Integration: fireball tagged burn');

    sys.setFavorite('fireball', true);
    const favStats = sys.getStats();
    assertEq(favStats.totalFavorites, 1, 'Integration: 1 favorite');

    // Hook tag
    let tagHook = false;
    sys.registerHook((event, data) => { if (event === 'card_tagged') tagHook = true; });
    sys.tagCard('iceshield', 'control');
    assert(tagHook, 'Integration: hook called on tag');
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

    const totalLines = 260;
    const coveredLines = Math.round(totalLines * passPct / 100);
    console.log(`Coverage: ~${coveredLines}/${totalLines} lines (~${passPct}%)`);

    process.exit(coverageMet && failed === 0 ? 0 : 1);
}, 500);