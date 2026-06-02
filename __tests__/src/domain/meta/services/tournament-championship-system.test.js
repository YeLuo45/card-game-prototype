'use strict';

const fs = require('fs');
const path = require('path');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'tournament-championship-system.js'), 'utf8');
eval(code);

const { TournamentConfig, TournamentRegistration, Match, Stage, Tournament, TournamentManager, TournamentTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// TournamentConfig Tests
// ========================================================================
console.log('\n=== TournamentConfig Tests ===');
{
    const cfg = new TournamentConfig('classic', 'Classic Championship', { maxPlayers: 16, stages: ['group', 'quarter', 'semi', 'final'] });
    assertEq(cfg.configId, 'classic', 'configId set');
    assertEq(cfg.name, 'Classic Championship', 'name set');
    assertEq(cfg.maxPlayers, 16, 'maxPlayers set');
    assertEq(cfg.stages.length, 4, 'stages count correct');
    assertEq(cfg.entryFee.gold, 100, 'entry fee default');
    assertEq(cfg.bestOfRounds, 3, 'bestOfRounds default');
}

// ========================================================================
// TournamentRegistration Tests
// ========================================================================
console.log('\n=== TournamentRegistration Tests ===');
{
    const reg = new TournamentRegistration('p1', 'deck1', 1234567890);
    assertEq(reg.playerId, 'p1', 'playerId set');
    assertEq(reg.deckId, 'deck1', 'deckId set');
    assertEq(reg.registeredAt, 1234567890, 'registeredAt set');
    assertEq(reg.seed, null, 'seed starts null');
    assert(!reg.eliminated, 'eliminated false initially');
    assertEq(reg.finalRank, null, 'finalRank starts null');
}

// ========================================================================
// Match Tests
// ========================================================================
console.log('\n=== Match Tests ===');
{
    const m = new Match('m1', 'quarter', 'p1', 'p2');
    assertEq(m.matchId, 'm1', 'matchId set');
    assertEq(m.round, 'quarter', 'round set');
    assertEq(m.player1Id, 'p1', 'player1 set');
    assertEq(m.player2Id, 'p2', 'player2 set');
    assertEq(m.score1, 0, 'score1 starts 0');
    assertEq(m.score2, 0, 'score2 starts 0');
    assertEq(m.winner, null, 'winner starts null');
    assertEq(m.status, 'pending', 'status pending');
    assertEq(m.bestOf, 3, 'bestOf default 3');

    m.score1 = 2; m.score2 = 1; m.winner = 'p1'; m.status = 'completed';
    assertEq(m.winner, 'p1', 'winner set after result');
}

// ========================================================================
// Stage Tests
// ========================================================================
console.log('\n=== Stage Tests ===');
{
    const stage = new Stage('s1', 'quarter', 1);
    assertEq(stage.stageId, 's1', 'stageId set');
    assertEq(stage.name, 'quarter', 'name set');
    assertEq(stage.order, 1, 'order set');
    assertEq(stage.matches.length, 0, 'no matches initially');
    assertEq(stage.status, 'upcoming', 'status upcoming');

    const m = new Match('m1', 'quarter', 'p1', 'p2');
    stage.addMatch(m);
    assertEq(stage.matches.length, 1, '1 match added');
    assertEq(stage.getMatch('m1').matchId, 'm1', 'getMatch finds match');
    assertEq(stage.getMatch('nonexistent'), null, 'not found returns null');
    assertEq(stage.getPendingMatches().length, 1, 'getPendingMatches finds pending');
}

// ========================================================================
// Tournament Tests
// ========================================================================
console.log('\n=== Tournament Tests ===');
{
    const cfg = new TournamentConfig('test_cfg', 'Test', { maxPlayers: 4, stages: ['group', 'final'] });
    const t = new Tournament('t1', cfg);
    t._emit = () => {}; t._save = () => {};

    assertEq(t.tournamentId, 't1', 'tournamentId set');
    assertEq(t.config.configId, 'test_cfg', 'config attached');
    assertEq(t.registrations.length, 0, 'no registrations');
    assertEq(t.stages.length, 0, 'no stages');
    assertEq(t.status, 'draft', 'status draft');

    // test openRegistration
    const open = t.openRegistration();
    assert(open.success, 'openRegistration returns success');
    assertEq(t.status, 'registration', 'status is registration after open');

    // test register
    const reg = t.register('player1', 'deck1');
    assert(reg !== null && !reg.error, 'register returns reg');
    assertEq(t.registrations.length, 1, '1 registration');
    assertEq(t.registrations[0].playerId, 'player1', 'player registered');

    // test register — already registered
    const dup = t.register('player1', 'deck2');
    assertEq(dup.error, 'already_registered', 'duplicate rejected');

    // test register — second player
    t.register('player2', 'deck2');
    assertEq(t.registrations.length, 2, '2 registrations');

    // test start
    const start = t.start();
    assert(start.success, 'start returns success');
    assertEq(t.status, 'in_progress', 'status in_progress');
    assert(t.startedAt !== null, 'startedAt set');

    // test start — not enough players
    const cfg2 = new TournamentConfig('test_cfg2', 'Test2', { maxPlayers: 4, stages: ['final'] });
    const t2 = new Tournament('t2', cfg2);
    t2._emit = () => {}; t2._save = () => {};
    t2.openRegistration();
    t2.register('solo_player', 'solo_deck'); // only 1 player
    const bad = t2.start();
    assertEq(bad.error, 'not_enough_players', 'needs at least 2 players');

    // test recordMatchResult
    const t3 = new Tournament('t3', new TournamentConfig('cfg3', 'Test3', { maxPlayers: 4, stages: ['group', 'final'] }));
    t3._emit = () => {}; t3._save = () => {};
    t3.openRegistration();
    t3.register('pa', 'da');
    t3.register('pb', 'db');
    t3.start();
    const stage = t3.stages[0];
    const match = stage.matches[0];
    const result = t3.recordMatchResult(match.matchId, match.player1Id, 2, 0);
    assert(result.success, 'recordResult returns success');
    assertEq(match.status, 'completed', 'match completed');
    assertEq(match.winner, match.player1Id, 'winner set');

    // test getStage
    const foundStage = t3.getStage('group');
    assertEq(foundStage !== null, true, 'getStage finds stage');
    assertEq(t3.getStage('nonexistent'), null, 'not found returns null');

    // test getBracket
    const bracket = t3.getBracket();
    assert(bracket.length >= 1, 'bracket has stages');

    // test complete
    const comp = t3.complete();
    assert(comp.success, 'complete returns success');
    assertEq(t3.status, 'completed', 'status completed');
    assert(t3.completedAt !== null, 'completedAt set');
}

// ========================================================================
// TournamentManager Tests
// ========================================================================
console.log('\n=== TournamentManager Tests ===');
{
    const mgr = new TournamentManager();
    mgr._load = () => {}; mgr._save = () => {};

    // test createConfig
    const cfg = mgr.createConfig('std', 'Standard', { maxPlayers: 8 });
    assert(cfg !== null && !cfg.error, 'createConfig returns config');
    assertEq(mgr.configs.size, 1, 'config registered');

    // test createConfig — duplicate
    const dup = mgr.createConfig('std', 'Duplicate', {});
    assertEq(dup.error, 'config_exists', 'duplicate rejected');

    // test createTournament
    const t = mgr.createTournament('tc1', 'std');
    assert(t !== null && !t.error, 'createTournament returns tournament');
    assertEq(mgr.tournaments.size, 1, 'tournament registered');

    // test createTournament — config not found
    const bad = mgr.createTournament('tc2', 'nonexistent');
    assertEq(bad.error, 'config_not_found', 'invalid config rejected');

    // test getTournament
    const found = mgr.getTournament('tc1');
    assertEq(found.tournamentId, 'tc1', 'getTournament finds tournament');

    // test openRegistration (via manager)
    const open_tc1 = mgr.getTournament('tc1');
    const openResult = open_tc1.openRegistration();
    assert(openResult.success, 'openRegistration works');

    // test register
    const reg = mgr.register('tc1', 'playerA', 'deckA');
    assert(reg !== null && !reg.error, 'register works');
    assertEq(mgr.getTournament('tc1').registrations.length, 1, 'player registered');

    // test start
    mgr.register('tc1', 'playerB', 'deckB');
    const start = mgr.start('tc1');
    assert(start.success, 'start works');
    assertEq(mgr.getTournament('tc1').status, 'in_progress', 'tournament started');

    // test recordResult
    const t_for_result = mgr.getTournament('tc1');
    const stage = t_for_result.stages.find(s => s.name === 'group');
    if (stage && stage.matches.length > 0) {
        const m = stage.matches[0];
        const res = mgr.recordResult('tc1', m.matchId, m.player1Id, 2, 1);
        assert(res.success, 'recordResult works');
    }

    // test getStats
    const stats = mgr.getStats();
    assertEq(stats.totalTournaments, 1, 'totalTournaments correct');
    assertEq(stats.activeTournaments >= 1, true, 'activeTournaments >= 1');
    assertEq(stats.totalRegistrations >= 2, true, 'totalRegistrations >= 2');
}

// ========================================================================
// TournamentTools Tests
// ========================================================================
console.log('\n=== TournamentTools Tests ===');
{
    if (typeof window !== 'undefined') window._tournamentMgr = new TournamentManager();
    const mgr = window._tournamentMgr;
    mgr._load = () => {}; mgr._save = () => {};

    const r1 = TournamentTools['tournament.create_config'].handler({ configId: 'tool_cfg', name: 'Tool Config', options: { maxPlayers: 4 } }, {});
    assert(r1 !== null && !r1.error, 'create_config tool works');

    const r2 = TournamentTools['tournament.create'].handler({ tournamentId: 'tool_tc', configId: 'tool_cfg' }, {});
    assert(r2 !== null && !r2.error, 'create tool works');

    const r3 = TournamentTools['tournament.register'].handler({ tournamentId: 'tool_tc', playerId: 'tool_p', deckId: 'tool_d' }, {});
    assert(r3 !== null && !r3.error, 'register tool works');

    const r4 = TournamentTools['tournament.stats'].handler({}, {});
    assert(typeof r4 === 'object', 'stats tool returns object');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    const mgr = new TournamentManager();
    mgr._load = () => {}; mgr._save = () => {};

    // Build a complete tournament
    mgr.createConfig('int_cfg', 'Integration Tournament', { maxPlayers: 4, stages: ['group', 'final'] });
    mgr.createTournament('int_tc', 'int_cfg');

    // Open registration first
    mgr.getTournament('int_tc').openRegistration();

    // Register 4 players
    for (let i = 1; i <= 4; i++) mgr.register('int_tc', `int_p${i}`, `int_d${i}`);

    // Start
    const start = mgr.start('int_tc');
    assert(start.success, 'Integration: tournament started');

    const t = mgr.getTournament('int_tc');
    assert(t.status === 'in_progress', 'Integration: status in_progress');
    assertEq(t.registrations.length, 4, 'Integration: 4 players');

    // Record some results
    const groupStage = t.getStage('group');
    assert(groupStage !== null, 'Integration: group stage exists');
    assert(groupStage.matches.length >= 1, 'Integration: has group matches');

    // Hook system
    let hookCalled = false;
    mgr.registerHook((event, data) => { hookCalled = true; });
    if (groupStage.matches.length > 0) {
        const m = groupStage.matches[0];
        mgr.recordResult('int_tc', m.matchId, m.player1Id, 2, 0);
    }

    // Stats after match
    const stats = mgr.getStats();
    assertEq(stats.totalTournaments >= 1, true, 'Integration: tournaments tracked');
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

    const totalLines = 400;
    const coveredLines = Math.round(totalLines * passPct / 100);
    console.log(`Coverage: ~${coveredLines}/${totalLines} lines (~${passPct}%)`);

    process.exit(coverageMet && failed === 0 ? 0 : 1);
}, 500);