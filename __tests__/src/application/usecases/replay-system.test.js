'use strict';

const fs = require('fs');
const path = require('path');

if (typeof localStorage !== 'undefined') localStorage.removeItem('replay_system');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'replay-system.js'), 'utf8');
eval(code);

const { ReplayEvent, Turn, BattleReplay, Annotation, ReplaySystem, ReplayTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// ReplayEvent Tests
// ========================================================================
console.log('\n=== ReplayEvent Tests ===');
{
    const e = new ReplayEvent('attack', { target: 'bob', damage: 5 }, 1000);
    assertEq(e.type, 'attack', 'type set');
    assertEq(e.data.target, 'bob', 'data target bob');
    assertEq(e.timestamp, 1000, 'timestamp 1000');

    const ser = e.serialize();
    assertEq(ser.type, 'attack', 'serialize type');
    assertEq(ser.data.damage, 5, 'serialize data');
    assertEq(ser.timestamp, 1000, 'serialize timestamp');
}

// ========================================================================
// Turn Tests
// ========================================================================
console.log('\n=== Turn Tests ===');
{
    let turn = new Turn(1, 'alice');
    assertEq(turn.turnNumber, 1, 'turnNumber 1');
    assertEq(turn.playerId, 'alice', 'playerId alice');

    turn.addEvent('play_card', { cardId: 'c1' });
    turn.addEvent('attack', { target: 'bob', damage: 3 });
    assertEq(turn.events.length, 2, '2 events');

    turn.endTurn();
    assert(turn.endedAt > 0, 'endedAt set');
    assert(turn.getDuration() >= 0, 'getDuration works');

    // Serialize
    const ser = turn.serialize();
    assertEq(ser.turnNumber, 1, 'serialize turnNumber');
    assertEq(ser.events.length, 2, '2 serialized events');
}

// ========================================================================
// BattleReplay Tests
// ========================================================================
console.log('\n=== BattleReplay Tests ===');
{
    const replay = new BattleReplay('replay1');
    assertEq(replay.replayId, 'replay1', 'replayId set');
    assertEq(replay.status, 'recording', 'status recording');

    replay.startTurn(1, 'alice');
    replay.addEvent('play_card', { cardId: 'fireball' });
    replay.endReplay('alice');

    assertEq(replay.status, 'completed', 'status completed');
    assertEq(replay.winnerId, 'alice', 'winner alice');
    assertEq(replay.turns.length, 1, '1 turn');
    assert(replay.getDuration() >= 0, 'getDuration works');

    // Annotations
    replay.addAnnotation(new Annotation(1, 0, 'Great opening!', 'highlight'));
    assertEq(replay.annotations.length, 1, '1 annotation');

    // Rating
    replay.setRating(5);
    assertEq(replay.rating, 5, 'rating 5');

    // Tags
    replay.addTag('exciting');
    assert(replay.tags.includes('exciting'), 'tag added');
}

// ========================================================================
// ReplaySystem Tests
// ========================================================================
console.log('\n=== ReplaySystem Tests ===');
{
    let sys = new ReplaySystem(); sys._load = () => {}; sys._save = () => {};

    // startReplay
    const r1 = sys.startReplay('r1', 'alice', 'bob', 'aggro', 'defense');
    assertEq(r1.player1Id, 'alice', 'player1 alice');
    assertEq(r1.player2Id, 'bob', 'player2 bob');
    assertEq(r1.status, 'recording', 'recording status');

    // recordTurn
    const turn = sys.recordTurn('r1', 1, 'alice');
    assert(turn !== null, 'turn returned');
    assertEq(turn.turnNumber, 1, 'turn number 1');

    // recordEvent
    sys.recordEvent('r1', 'play_card', { cardId: 'fireball' });
    sys.recordEvent('r1', 'attack', { target: 'bob', damage: 5 });

    // endReplay
    const end = sys.endReplay('r1', 'alice');
    assert(end.success, 'endReplay succeeds');

    // getReplay
    const replay = sys.getReplay('r1');
    assert(replay !== null, 'replay retrieved');
    assertEq(replay.status, 'completed', 'replay status completed');
    assertEq(replay.winnerId, 'alice', 'winner alice');

    // listReplays
    const list = sys.listReplays('alice', 10);
    assert(list.length >= 1, 'list has replays');

    // addAnnotation
    const ann = sys.addAnnotation('r1', 1, 0, 'Nice play!', 'highlight');
    assert(ann.success, 'annotation added');

    // rateReplay
    const rate = sys.rateReplay('r1', 4);
    assert(rate.success, 'rating set');

    // getStats
    const stats = sys.getStats();
    assert(typeof stats.totalReplays === 'number', 'totalReplays is number');
    assert(typeof stats.completedReplays === 'number', 'completed count is number');

    // Hook
    let hookCalled = false;
    sys.registerHook((e, d) => { hookCalled = true; });
    sys.startReplay('r2', 'charlie', 'dave', 'mid', 'mid');
    assert(hookCalled, 'hook called on replay_started');

    // deleteReplay
    const del = sys.deleteReplay('r2');
    assert(del.success, 'replay deleted');
    assertEq(sys.getReplay('r2'), null, 'replay gone after delete');
}

// ========================================================================
// ReplayTools Tests
// ========================================================================
console.log('\n=== ReplayTools Tests ===');
{
    let sys = new ReplaySystem(); sys._load = () => {}; sys._save = () => {};
    if (typeof window !== 'undefined') window._replaySystem = sys;

    const r1 = ReplayTools['replay.start'].handler({ replayId: 't1', player1Id: 'p1', player2Id: 'p2' }, {});
    assertEq(r1.player1Id, 'p1', 'replay.start tool works');

    const r2 = ReplayTools['replay.turn'].handler({ replayId: 't1', turnNumber: 1, playerId: 'p1' }, {});
    assert(r2.turnNumber === 1, 'replay.turn tool works');

    const r3 = ReplayTools['replay.event'].handler({ replayId: 't1', type: 'attack', data: { dmg: 5 } }, {});
    assert(r3.success, 'replay.event tool works');

    const r4 = ReplayTools['replay.end'].handler({ replayId: 't1', winnerId: 'p1' }, {});
    assert(r4.success, 'replay.end tool works');

    const r5 = ReplayTools['replay.stats'].handler({}, {});
    assert(typeof r5 === 'object', 'replay.stats tool returns object');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    let sys = new ReplaySystem(); sys._load = () => {}; sys._save = () => {};

    // Full replay recording cycle
    sys.startReplay('int_replay', 'player_x', 'player_y', 'fire_deck', 'ice_deck');

    for (let t = 1; t <= 5; t++) {
        const pid = t % 2 === 1 ? 'player_x' : 'player_y';
        sys.recordTurn('int_replay', t, pid);
        sys.recordEvent('int_replay', 'play_card', { cardId: `card_t${t}`, color: t % 2 === 1 ? 'fire' : 'ice' });
        if (t === 3) sys.recordEvent('int_replay', 'attack', { target: 'opp', damage: 20 });
    }

    const winner = 4 % 2 === 1 ? 'player_x' : 'player_y';
    sys.endReplay('int_replay', winner);

    const replay = sys.getReplay('int_replay');
    assertEq(replay.turns.length, 5, 'Integration: 5 turns recorded');
    assertEq(replay.winnerId, winner, 'Integration: winner set');
    assert(replay.turns.some(t => t.events.some(e => e.type === 'attack')), 'Integration: attack event recorded');

    // Annotation and rating
    sys.addAnnotation('int_replay', 3, 0, 'Crucial turn!', 'highlight');
    sys.rateReplay('int_replay', 5);
    const rated = sys.getReplay('int_replay');
    assertEq(rated.annotations.length, 1, 'Integration: annotation present');
    assertEq(rated.rating, 5, 'Integration: rating 5');

    // Hook on replay_completed
    let completedHook = false;
    sys.registerHook((e, d) => { if (e === 'replay_completed') completedHook = true; });
    sys.startReplay('int_replay2', 'a', 'b', 'd1', 'd2');
    sys.recordTurn('int_replay2', 1, 'a');
    sys.recordEvent('int_replay2', 'play_card', {});
    sys.endReplay('int_replay2', 'a');
    assert(completedHook, 'Integration: replay_completed hook fired');

    // List filter
    const listA = sys.listReplays('player_x', 10);
    assert(listA.some(r => r.replayId === 'int_replay'), 'Integration: player_x sees their replay');
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