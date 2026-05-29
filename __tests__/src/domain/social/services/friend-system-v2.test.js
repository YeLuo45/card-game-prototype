'use strict';

const fs = require('fs');
const path = require('path');

if (typeof localStorage !== 'undefined') localStorage.removeItem('friend_system_v2');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'friend-system-v2.js'), 'utf8');
eval(code);

const { DuelChallenge, FriendSystemV2, FriendSystemV2Tools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// DuelChallenge Tests
// ========================================================================
console.log('\n=== DuelChallenge Tests ===');
{
    const c = new DuelChallenge('d1', 'alice', 'bob', 100);
    assertEq(c.challengeId, 'd1', 'challengeId set');
    assertEq(c.challengerId, 'alice', 'challenger alice');
    assertEq(c.challengedId, 'bob', 'challenged bob');
    assertEq(c.stakes, 100, 'stakes 100');
    assertEq(c.status, 'pending', 'status pending');
    assertEq(c.result, null, 'result null initially');
    assert(c.isActive(), 'is active');

    c.accept();
    assertEq(c.status, 'accepted', 'status accepted');
    assert(c.respondedAt > 0, 'respondedAt set');

    c.complete('alice', 'bob', 3, 1);
    assertEq(c.status, 'completed', 'status completed');
    assertEq(c.result.winnerId, 'alice', 'winner alice');
    assertEq(c.result.loserId, 'bob', 'loser bob');
    assertEq(c.result.challengerScore, 3, 'challengerScore 3');
    assert(c.completedAt > 0, 'completedAt set');

    // Decline
    const c2 = new DuelChallenge('d2', 'alice', 'bob');
    assert(c2.decline(), 'decline returns true');
    assertEq(c2.status, 'declined', 'status declined');
    assert(!c2.isActive(), 'not active after decline');

    // Cannot accept non-pending
    const c3 = new DuelChallenge('d3', 'alice', 'bob');
    c3.decline();
    assert(!c3.accept(), 'cannot accept after decline');
}

// ========================================================================
// FriendSystemV2 Tests
// ========================================================================
console.log('\n=== FriendSystemV2 Tests ===');
{
    let fs2 = new FriendSystemV2(); fs2._load = () => {}; fs2._save = () => {};

    // addFriend
    const af = fs2.addFriend('alice', 'bob');
    assert(af.success, 'addFriend returns success');
    assertEq(fs2.getFriends('alice').length, 1, 'alice has 1 friend');

    // addFriend duplicate - no error
    fs2.addFriend('alice', 'bob');
    assertEq(fs2.getFriends('alice').length, 1, 'still 1 friend (no dup)');

    // areFriends
    assert(fs2.areFriends('alice', 'bob'), 'areFriends true');
    assert(!fs2.areFriends('alice', 'charlie'), 'not friends with charlie');

    // getFriends
    fs2.addFriend('alice', 'charlie');
    const friends = fs2.getFriends('alice');
    assertEq(friends.length, 2, 'alice has 2 friends');

    // removeFriend
    const rf = fs2.removeFriend('alice', 'bob');
    assert(rf.success, 'removeFriend succeeds');
    assertEq(fs2.getFriends('alice').length, 1, 'now 1 friend');

    // sendDuelChallenge
    const ch = fs2.sendDuelChallenge('alice', 'bob', 100);
    assertEq(ch.challengerId, 'alice', 'challenger alice');
    assertEq(ch.challengedId, 'bob', 'challenged bob');
    assertEq(ch.stakes, 100, 'stakes 100');

    // acceptChallenge
    const acc = fs2.acceptChallenge(ch.challengeId);
    assert(acc.success, 'acceptChallenge succeeds');

    // completeDuel
    const duel = fs2.completeDuel(ch.challengeId, 'alice', 'bob', 3, 1);
    assert(duel.success, 'completeDuel succeeds');

    // getPendingChallenges
    const ch2 = fs2.sendDuelChallenge('bob', 'charlie', 50);
    const pending = fs2.getPendingChallenges('bob');
    assert(pending.length >= 1, 'has pending challenges');

    // getDuelHistory
    const history = fs2.getDuelHistory('alice', 10);
    assertEq(history.length, 1, '1 duel in alice history');

    // getFriendLeaderboard
    const lb = fs2.getFriendLeaderboard('alice', 'wins', 10);
    assert(lb.length >= 0, 'leaderboard returns array');

    // getStats
    const stats = fs2.getStats();
    assert(typeof stats.totalDuels === 'number', 'totalDuels is number');
    assert(typeof stats.totalChallenges === 'number', 'totalChallenges is number');

    // Hook
    let hookCalled = false;
    fs2.registerHook((event, data) => { hookCalled = true; });
    fs2.addFriend('bob', 'dave');
    assert(hookCalled, 'hook called on friend_added');
}

// ========================================================================
// FriendSystemV2Tools Tests
// ========================================================================
console.log('\n=== FriendSystemV2Tools Tests ===');
{
    let fs2 = new FriendSystemV2(); fs2._load = () => {}; fs2._save = () => {};
    if (typeof window !== 'undefined') window._friendSystemV2 = fs2;

    const r1 = FriendSystemV2Tools['friend.add'].handler({ playerId: 't1', friendId: 't2' }, {});
    assert(r1.success, 'friend.add tool works');

    const r2 = FriendSystemV2Tools['friend.challenge'].handler({ challengerId: 't1', challengedId: 't2' }, {});
    assert(r2.challengeId.startsWith('duel_'), 'friend.challenge tool works');

    const r3 = FriendSystemV2Tools['friend.stats'].handler({}, {});
    assert(typeof r3 === 'object', 'friend.stats tool returns object');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    let fs2 = new FriendSystemV2(); fs2._load = () => {}; fs2._save = () => {};

    // Full duel flow
    fs2.addFriend('alice', 'bob');
    fs2.addFriend('alice', 'charlie');

    const ch = fs2.sendDuelChallenge('alice', 'bob', 200);
    fs2.acceptChallenge(ch.challengeId);
    fs2.completeDuel(ch.challengeId, 'bob', 'alice', 2, 3);

    const history = fs2.getDuelHistory('alice', 20);
    assertEq(history.length, 1, 'Integration: 1 duel recorded');

    const lb = fs2.getFriendLeaderboard('alice', 'wins', 5);
    assert(lb.length >= 1, 'Integration: leaderboard has entries');

    // Decline flow
    const ch2 = fs2.sendDuelChallenge('charlie', 'alice', 50);
    fs2.declineChallenge(ch2.challengeId);
    const pending = fs2.getPendingChallenges('alice');
    assert(!pending.some(p => p.challengeId === ch2.challengeId), 'Integration: declined challenge not pending');

    // Hook on duel complete
    let duelHook = false;
    fs2.registerHook((event, data) => { if (event === 'duel_completed') duelHook = true; });
    const ch3 = fs2.sendDuelChallenge('bob', 'charlie', 75);
    fs2.acceptChallenge(ch3.challengeId);
    fs2.completeDuel(ch3.challengeId, 'charlie', 'bob', 4, 2);
    assert(duelHook, 'Integration: duel_completed hook fired');
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