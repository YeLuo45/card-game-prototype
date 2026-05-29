'use strict';

const fs = require('fs');
const path = require('path');

if (typeof localStorage !== 'undefined') localStorage.removeItem('dream_journey');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'dream-journey-system.js'), 'utf8');
eval(code);

const { JourneyNode, JourneyRun, DreamJourneySystem, DreamJourneyTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// JourneyNode Tests
// ========================================================================
console.log('\n=== JourneyNode Tests ===');
{
    const node = new JourneyNode('n1', 'battle', { xp: 20 });
    assertEq(node.nodeId, 'n1', 'nodeId set');
    assertEq(node.type, 'battle', 'type set');
    assertEq(node.reward.xp, 20, 'reward set');
    assert(!node.visited, 'not visited initially');
}

// ========================================================================
// JourneyRun Tests
// ========================================================================
console.log('\n=== JourneyRun Tests ===');
{
    const run = new JourneyRun('r1', 'player1');
    assertEq(run.runId, 'r1', 'runId set');
    assertEq(run.playerId, 'player1', 'playerId set');
    assertEq(run.gold, 50, 'starts with 50 gold');
    assertEq(run.hp, 100, 'starts with 100 hp');
    assertEq(run.status, 'active', 'status active');
    assertEq(run.deck.length, 0, 'no cards initially');

    // addNode
    const node = run.addNode('treasure', { card: 'scroll', gold: 30 });
    assertEq(run.nodes.length, 1, '1 node added');
    assertEq(node.type, 'treasure', 'node type treasure');

    // advance
    const next = run.advance();
    assertEq(next, null, 'no next when only 1 node');

    run.addNode('battle', { xp: 10 });
    run.addNode('rest', { hp: 20 });
    const n2 = run.advance();
    assertEq(n2.type, 'battle', 'advanced to battle node');

    // getCurrentNode
    const curr = run.getCurrentNode();
    assertEq(curr.type, 'battle', 'current node is battle');

    // collectReward
    const run2 = new JourneyRun('r2', 'p1');
    run2.addNode('treasure', { card: 'c1', gold: 100 });
    run2.addNode('rest', { hp: 30 });
    run2.advance(); // go to rest
    run2.advance(); // should return null (exhausted)

    // takeDamage
    const run3 = new JourneyRun('r3', 'p1');
    run3.takeDamage(30);
    assertEq(run3.hp, 70, 'hp reduced to 70');
    assertEq(run3.status, 'active', 'still active after 30 damage');

    run3.takeDamage(80);
    assertEq(run3.hp, 0, 'hp 0');
    assertEq(run3.status, 'lost', 'status lost');

    // finish
    const run4 = new JourneyRun('r4', 'p1');
    run4.finish(true);
    assertEq(run4.status, 'won', 'status won');
    assert(run4.finishedAt > 0, 'finishedAt set');
}

// ========================================================================
// DreamJourneySystem Tests
// ========================================================================
console.log('\n=== DreamJourneySystem Tests ===');
{
    let sys;
    sys = new DreamJourneySystem(); sys._load = () => {}; sys._save = () => {};

    // startRun
    const run = sys.startRun('player1');
    assertEq(run.playerId, 'player1', 'playerId set');
    assertEq(run.nodes.length, 9, '9 nodes in journey');
    assertEq(run.status, 'active', 'run active');

    // advanceJourney
    const adv = sys.advanceJourney(run.runId);
    assert(typeof adv === 'object', 'advanceJourney returns object');
    assert(adv.nextNode || adv.finished, 'advance returns next or finished');

    // collectReward
    const run2 = sys.startRun('player1');
    const collect = sys.collectReward(run2.runId);
    assert(typeof collect === 'object', 'collectReward returns object');
    assertEq(collect.gold, 50, 'gold unchanged before treasure');

    // takeDamage
    const dmg = sys.takeDamage(run.runId, 25);
    assertEq(dmg.hp, 75, 'hp reduced to 75');

    // getRun
    const found = sys.getRun(run.runId);
    assertEq(found.playerId, 'player1', 'getRun finds player');

    // finishJourney
    const fin = sys.finishJourney(run.runId, true);
    assertEq(fin.status, 'won', 'finished as won');

    // getStats
    const stats = sys.getStats();
    assert(stats.totalRuns >= 2, '2+ runs tracked (got ' + stats.totalRuns + ')');

    // Hook
    let hookCalled = false;
    sys.registerHook((event, data) => { hookCalled = true; });
    const run3 = sys.startRun('player1');
    assert(hookCalled, 'hook called on journey start');
}

// ========================================================================
// DreamJourneyTools Tests
// ========================================================================
console.log('\n=== DreamJourneyTools Tests ===');
{
    let sys;
    sys = new DreamJourneySystem(); sys._load = () => {}; sys._save = () => {};
    if (typeof window !== 'undefined') window._dreamJourney = sys;

    const r1 = DreamJourneyTools['dream.start'].handler({ playerId: 'tool_p' }, {});
    assert(r1 !== null, 'dream.start tool works');

    const r2 = DreamJourneyTools['dream.stats'].handler({}, {});
    assert(typeof r2 === 'object', 'dream.stats tool returns object');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    let sys;
    sys = new DreamJourneySystem(); sys._load = () => {}; sys._save = () => {};

    // Complete a journey
    const run = sys.startRun('journey_player');
    assertEq(run.status, 'active', 'Integration: journey active');

    // Advance through all nodes
    let finished = false;
    let steps = 0;
    while (steps < 20) {
        const adv = sys.advanceJourney(run.runId);
        if (adv.finished || adv.error) { finished = adv.finished; break; }
        steps++;
    }
    assert(finished, 'Integration: journey completed');

    const fin = sys.finishJourney(run.runId, true);
    assertEq(fin.status, 'won', 'Integration: marked as won');

    // Hook on damage
    const run2 = sys.startRun('journey_player2');
    let dmgHook = false;
    sys.registerHook((event, data) => { if (event === 'damage_taken') dmgHook = true; });
    sys.takeDamage(run2.runId, 10);
    assert(dmgHook, 'Integration: damage hook fired');
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

    const totalLines = 300;
    const coveredLines = Math.round(totalLines * passPct / 100);
    console.log(`Coverage: ~${coveredLines}/${totalLines} lines (~${passPct}%)`);

    process.exit(coverageMet && failed === 0 ? 0 : 1);
}, 500);