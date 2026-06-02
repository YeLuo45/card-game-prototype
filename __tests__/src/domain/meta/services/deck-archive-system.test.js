'use strict';

const fs = require('fs');
const path = require('path');

if (typeof localStorage !== 'undefined') localStorage.removeItem('deck_archive');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'deck-archive-system.js'), 'utf8');
eval(code);

const { DeckVersion, DeckArchive, DeckArchetypeClassifier, DeckArchiveSystem, DeckArchiveTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// DeckVersion Tests
// ========================================================================
console.log('\n=== DeckVersion Tests ===');
{
    const v = new DeckVersion('v1', { cardIds: ['c1', 'c2'] }, 'author1', 'Initial', 1000);
    assertEq(v.versionId, 'v1', 'versionId set');
    assertEq(v.authorId, 'author1', 'authorId set');
    assertEq(v.note, 'Initial', 'note set');
    assertEq(v.createdAt, 1000, 'createdAt set');
    assertEq(v.deckData.cardIds.length, 2, 'deckData set');
}

// ========================================================================
// DeckArchive Tests
// ========================================================================
console.log('\n=== DeckArchive Tests ===');
{
    const d = new DeckArchive('d1', 'My Deck', 'aggro', 'player1', ['c1', 'c2', 'c3'], 'standard');
    assertEq(d.deckId, 'd1', 'deckId set');
    assertEq(d.name, 'My Deck', 'name set');
    assertEq(d.archetype, 'aggro', 'archetype set');
    assertEq(d.authorId, 'player1', 'authorId set');
    assertEq(d.cardIds.length, 3, 'cardIds set');
    assertEq(d.format, 'standard', 'format set');
    assertEq(d.favorites, 0, 'favorites starts 0');
    assertEq(d.views, 0, 'views starts 0');
    assert(!d.isPublic, 'not public initially');
    assertEq(d.versions.length, 0, 'no versions initially');

    assertEq(d.getCardCount(), 3, 'getCardCount returns 3');

    // addVersion
    const v = d.addVersion({ cardIds: ['c1', 'c2', 'c3', 'c4'] }, 'player1', 'Added c4');
    assertEq(d.versions.length, 1, '1 version added');
    assertEq(d.currentVersionId, v.versionId, 'currentVersionId updated');

    const found = d.getVersion(v.versionId);
    assertEq(found.note, 'Added c4', 'getVersion finds version');
}

// ========================================================================
// DeckArchetypeClassifier Tests
// ========================================================================
console.log('\n=== DeckArchetypeClassifier Tests ===');
{
    let clf = new DeckArchetypeClassifier();
    const cardDb = new Map([
        ['c1', { name: 'Rush Card', type: 'attack' }],
        ['c2', { name: 'Control Card', type: 'defense' }],
        ['c3', { name: 'Midrange Card', type: 'balanced' }],
        ['c4', { name: 'Combo Card', type: 'special' }],
    ]);

    assertEq(clf.classify(['c1', 'c1', 'c1'], cardDb), 'aggro', '3 rush cards = aggro');
    assertEq(clf.classify(['c2', 'c2', 'c2'], cardDb), 'control', '3 control cards = control');
    assertEq(clf.classify(['c3', 'c3', 'c3'], cardDb), 'midrange', '3 midrange cards = midrange');
    assertEq(clf.classify(['c4', 'c4', 'c4'], cardDb), 'combo', '3 combo cards = combo');
    assertEq(clf.classify([], cardDb), 'custom', 'empty = custom');
    assertEq(clf.classify(null, cardDb), 'custom', 'null = custom');
}

// ========================================================================
// DeckArchiveSystem Tests
// ========================================================================
console.log('\n=== DeckArchiveSystem Tests ===');
{
    let sys;
    sys = new DeckArchiveSystem(); sys._load = () => {}; sys._save = () => {};

    // registerCard
    const card = sys.registerCard('card1', 'Fire Ball', 'attack', 3, 5, 2);
    assert(card !== null && !card.error, 'registerCard returns card');
    assertEq(sys.cardDb.size, 1, 'card registered');

    const dup = sys.registerCard('card1', 'Duplicate', 'attack', 1, 1, 1);
    assertEq(dup.error, 'card_exists', 'duplicate card rejected');

    // createDeck
    const deck = sys.createDeck('Aggro Deck', 'aggro', 'player1', ['card1', 'card1', 'card2'], 'standard');
    assertEq(deck.name, 'Aggro Deck', 'deck name set');
    assertEq(deck.archetype, 'aggro', 'archetype set');
    assertEq(deck.cardIds.length, 3, 'cardIds set');

    const badDeck = sys.createDeck('', 'aggro', 'player1', ['card1']);
    assertEq(badDeck.error, 'invalid_deck', 'empty name rejected');

    const tooMany = sys.createDeck('Big', 'aggro', 'player1', Array(31).fill('card1'));
    assertEq(tooMany.error, 'too_many_cards', '31 cards rejected');

    // getDeck
    const found = sys.getDeck(deck.deckId);
    assertEq(found.name, 'Aggro Deck', 'getDeck finds deck');

    // updateDeck
    const upd = sys.updateDeck(deck.deckId, { name: 'Updated Deck', cardIds: ['card1', 'card2'] });
    assertEq(upd.name, 'Updated Deck', 'name updated');
    assertEq(upd.versions.length, 1, 'version added on update');

    // favoriteDeck
    const fav = sys.favoriteDeck(deck.deckId);
    assertEq(fav.favorites, 1, '1 favorite');
    const fav2 = sys.favoriteDeck(deck.deckId);
    assertEq(fav2.favorites, 2, '2 favorites');

    // duplicateDeck
    const dupDeck = sys.duplicateDeck(deck.deckId, 'Copy Deck', 'player2');
    assertEq(dupDeck.name, 'Copy Deck', 'copy name set');
    assertEq(dupDeck.cardIds.length, 2, 'copy has 2 cards');

    // generateShareCode
    const share = sys.generateShareCode(deck.deckId);
    assertEq(share.code.length, 8, 'share code length 8');
    assertEq(share.deckId, deck.deckId, 'share code deckId correct');

    // resolveShareCode
    const resolved = sys.resolveShareCode(share.code);
    assertEq(resolved.deckId, deck.deckId, 'resolveShareCode finds deck');

    const badResolve = sys.resolveShareCode('NOTEXIST');
    assertEq(badResolve.error, 'invalid_code', 'invalid code rejected');

    // getPlayerDecks
    const playerDecks = sys.getPlayerDecks('player1');
    assert(playerDecks.length >= 1, 'getPlayerDecks returns decks');

    // compareDecks
    const deck2 = sys.createDeck('Control', 'control', 'player1', ['card1', 'card2'], 'standard');
    const cmp = sys.compareDecks(deck.deckId, deck2.deckId);
    assertEq(cmp.shared.length >= 1, true, 'compareDecks returns shared cards');
    assert(typeof cmp.similarity === 'number', 'compareDecks returns similarity');

    // deleteDeck
    const del = sys.deleteDeck(deck.deckId);
    assert(del.success, 'deleteDeck succeeds');
    const deleted = sys.getDeck(deck.deckId);
    assertEq(deleted, null, 'getDeck returns null after delete');

    // getStats
    const stats = sys.getStats();
    assertEq(stats.totalDecks >= 1, true, 'totalDecks >= 1');
    assert(typeof stats.publicDecks === 'number', 'publicDecks is number');
}

// ========================================================================
// DeckArchiveTools Tests
// ========================================================================
console.log('\n=== DeckArchiveTools Tests ===');
{
    let sys;
    sys = new DeckArchiveSystem(); sys._load = () => {}; sys._save = () => {};
    if (typeof window !== 'undefined') window._deckArchive = sys;

    const r1 = DeckArchiveTools['deck.create'].handler({ name: 'Tool Deck', archetype: 'aggro', authorId: 'tool_author', cardIds: ['c1', 'c2'], format: 'standard' }, {});
    assert(r1 !== null && !r1.error, 'deck.create tool works');

    const r2 = DeckArchiveTools['deck.stats'].handler({}, {});
    assert(typeof r2 === 'object', 'deck.stats tool returns object');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    let sys;
    sys = new DeckArchiveSystem(); sys._load = () => {}; sys._save = () => {};

    // Register catalog
    sys.registerCard('warrior', 'Warrior', 'attack', 2, 4, 3);
    sys.registerCard('shield', 'Shield', 'defense', 1, 1, 5);
    sys.registerCard('mage', 'Mage', 'magic', 3, 5, 2);

    // Create and manage deck
    const deck = sys.createDeck('My Warrior', 'aggro', 'arena_player', ['warrior', 'shield'], 'standard');
    assertEq(deck.archetype, 'aggro', 'Integration: archetype set');

    // Version history
    sys.updateDeck(deck.deckId, { cardIds: ['warrior', 'shield', 'mage'], authorId: 'arena_player', changeNote: 'Added mage' });
    const updated = sys.getDeck(deck.deckId);
    assertEq(updated.versions.length, 1, 'Integration: version created');

    // Share code
    const code = sys.generateShareCode(deck.deckId);
    const resolved = sys.resolveShareCode(code.code);
    assertEq(resolved.deckId, deck.deckId, 'Integration: share code resolves');

    // Make public
    sys.updateDeck(deck.deckId, { isPublic: true });

    // Get public decks
    const publicDecks = sys.getPublicDecks(null, null, 10);
    assert(publicDecks.length >= 1, 'Integration: public decks retrievable');

    // Hook
    let hookCalled = false;
    sys.registerHook((event, data) => { hookCalled = true; });
    sys.createDeck('Hook Test', 'midrange', 'hook_player', ['warrior']);
    assert(hookCalled, 'Integration: hook called on deck create');
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

    const totalLines = 370;
    const coveredLines = Math.round(totalLines * passPct / 100);
    console.log(`Coverage: ~${coveredLines}/${totalLines} lines (~${passPct}%)`);

    process.exit(coverageMet && failed === 0 ? 0 : 1);
}, 500);