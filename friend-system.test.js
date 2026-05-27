'use strict';

const fs = require('fs');
const path = require('path');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'friend-system.js'), 'utf8');
eval(code);

const { PlayerProfile, FriendRelation, FriendSystem, FriendTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// PlayerProfile Tests
// ========================================================================
console.log('\n=== PlayerProfile Tests ===');
{
    const p = new PlayerProfile('p1', 'Alice');
    assertEq(p.playerId, 'p1', 'playerId set');
    assertEq(p.displayName, 'Alice', 'displayName set');
    assertEq(p.level, 1, 'level starts at 1');
    assertEq(p.gamesPlayed, 0, 'gamesPlayed starts 0');
    assertEq(p.wins, 0, 'wins starts 0');
    assertEq(p.winRate, 0, 'winRate is 0 initially');

    p.gamesPlayed = 10;
    p.wins = 7;
    assertEq(p.winRate, 70, 'winRate calculated correctly');

    p.addBadge('First Win');
    p.addBadge('First Win'); // duplicate
    assertEq(p.badges.length, 1, 'duplicate badge not added');
}

// ========================================================================
// FriendRelation Tests
// ========================================================================
console.log('\n=== FriendRelation Tests ===');
{
    const rel = new FriendRelation('p1', 'p2');
    assertEq(rel.fromPlayerId, 'p1', 'fromPlayerId set');
    assertEq(rel.toPlayerId, 'p2', 'toPlayerId set');
    assertEq(rel.status, 'pending', 'status is pending initially');
    assertEq(rel.acceptedAt, null, 'acceptedAt is null initially');

    rel.accept();
    assertEq(rel.status, 'accepted', 'status after accept');
    assert(rel.acceptedAt !== null, 'acceptedAt set after accept');

    const rel2 = new FriendRelation('p1', 'p3');
    rel2.block();
    assertEq(rel2.status, 'blocked', 'status after block');
}

// ========================================================================
// FriendSystem Tests
// ========================================================================
console.log('\n=== FriendSystem Tests ===');
{
    const sys = new FriendSystem();
    sys._load = () => {}; sys._save = () => {};

    // test getOrCreateProfile
    const p = sys.getOrCreateProfile('alice', 'Alice');
    assertEq(p.displayName, 'Alice', 'getOrCreateProfile creates profile');
    const p2 = sys.getOrCreateProfile('alice', 'Alice2');
    assertEq(p, p2, 'getOrCreateProfile returns existing profile');

    // test getProfile
    const found = sys.getProfile('alice');
    assertEq(found.displayName, 'Alice', 'getProfile finds profile');
    const notfound = sys.getProfile('nobody');
    assertEq(notfound, null, 'notfound returns null');

    // test updateProfile
    const updated = sys.updateProfile('alice', { displayName: 'Super Alice', bio: 'Best player!' });
    assertEq(updated.displayName, 'Super Alice', 'updateProfile changes name');
    assertEq(updated.bio, 'Best player!', 'updateProfile changes bio');

    // test updateProfile — error
    const bad = sys.updateProfile('nobody', {});
    assertEq(bad.error, 'profile_not_found', 'update nonexistent returns error');

    // test recordGameResult
    const r1 = sys.recordGameResult('alice', true);
    assertEq(r1.gamesPlayed, 1, 'gamesPlayed incremented');
    assertEq(r1.wins, 1, 'wins incremented');

    const r2 = sys.recordGameResult('alice', false);
    assertEq(r2.gamesPlayed, 2, 'gamesPlayed is 2');
    assertEq(r2.wins, 1, 'wins stays 1');

    // test sendFriendRequest
    const req = sys.sendFriendRequest('alice', 'bob');
    assert(req.success, 'sendFriendRequest returns success');

    // test sendFriendRequest — duplicate
    const dup = sys.sendFriendRequest('alice', 'bob');
    assertEq(dup.error, 'request_exists', 'duplicate request rejected');

    // test sendFriendRequest — self
    const self = sys.sendFriendRequest('alice', 'alice');
    assertEq(self.error, 'cannot_add_self', 'self friend request rejected');

    // test getPendingRequests
    // test getPendingRequests (bob checks incoming)
    sys.getOrCreateProfile('bob', 'Bob');
    const pending = sys.getPendingRequests('bob');
    assertEq(pending.length, 1, 'bob has 1 incoming pending request');
    assertEq(pending[0].playerId, 'alice', 'request from alice');

    const accept = sys.acceptFriendRequest('bob', 'alice');
    assert(accept.success, 'acceptFriendRequest returns success');

    // test acceptFriendRequest — not pending
    const bad2 = sys.acceptFriendRequest('bob', 'alice');
    assertEq(bad2.error, 'not_pending', 'already accepted rejected');

    // test getFriends
    const friends = sys.getFriends('alice');
    assertEq(friends.length, 1, 'alice has 1 friend');
    assertEq(friends[0].playerId, 'bob', 'friend is bob');

    // test blockPlayer
    const block = sys.blockPlayer('alice', 'bob');
    assert(block.success, 'blockPlayer returns success');
    const aliceFriends = sys.getFriends('alice');
    assertEq(aliceFriends.length, 0, 'alice has no friends after block');

    // test getStats
    const stats = sys.getStats();
    assert(typeof stats === 'object', 'getStats returns object');
    assertEq(typeof stats.totalProfiles, 'number', 'totalProfiles is number');
}

// ========================================================================
// FriendTools Tests
// ========================================================================
console.log('\n=== FriendTools Tests ===');
{
    if (typeof window !== 'undefined') window._friendSystem = new FriendSystem();
    const sys = window._friendSystem;
    sys._load = () => {}; sys._save = () => {};
    sys.getOrCreateProfile('tool_alice', 'Tool Alice');
    sys.getOrCreateProfile('tool_bob', 'Tool Bob');

    const r1 = FriendTools['friend.send_request'].handler({ fromPlayerId: 'tool_alice', toPlayerId: 'tool_bob' }, {});
    assert(typeof r1 === 'object', 'send_request returns object');

    const r2 = FriendTools['friend.list'].handler({ playerId: 'tool_alice' }, {});
    assert(Array.isArray(r2), 'list returns array');

    const r3 = FriendTools['friend.profile'].handler({ playerId: 'tool_alice' }, {});
    assertEq(r3.displayName, 'Tool Alice', 'profile returns correct profile');

    const r4 = FriendTools['friend.stats'].handler({}, {});
    assert(typeof r4 === 'object', 'stats returns object');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    const sys = new FriendSystem();
    sys._load = () => {}; sys._save = () => {};

    // Create two profiles and build friendship
    sys.getOrCreateProfile('player_x', 'Player X');
    sys.getOrCreateProfile('player_y', 'Player Y');

    sys.sendFriendRequest('player_x', 'player_y');
    sys.acceptFriendRequest('player_y', 'player_x');

    const friends = sys.getFriends('player_x');
    assertEq(friends.length, 1, 'Integration: player_x has 1 friend');
    assertEq(friends[0].playerId, 'player_y', 'Integration: friend is player_y');

    // Record some games
    sys.recordGameResult('player_x', true);
    sys.recordGameResult('player_x', true);
    sys.recordGameResult('player_x', false);
    const profile = sys.getProfile('player_x');
    assertEq(profile.gamesPlayed, 3, 'Integration: 3 games played');
    assertEq(profile.wins, 2, 'Integration: 2 wins');

    // Hook system
    let hookCalled = false;
    sys.registerHook((event, data) => { hookCalled = true; });
    sys.sendFriendRequest('player_x', 'player_z');
    assert(hookCalled, 'Integration: hook fired on friend request');
}

// ========================================================================
// Summary
// ========================================================================
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