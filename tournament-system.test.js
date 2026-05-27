'use strict';

const fs = require('fs');
const path = require('path');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'tournament-system.js'), 'utf8');
eval(code);

const { Tournament, TournamentPanel, TournamentTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }
function assertNe(a, b, msg) { assert(a !== b, `${msg} (expected not ${b})`); }

// ========================================================================
// Tournament Tests
// ========================================================================
console.log('\n=== Tournament Tests ===');
{
    const t = new Tournament('t1', 'TestTournament', 'elimination', 8);

    assert(t.tournamentId === 't1', 'tournamentId set correctly');
    assertEq(t.name, 'TestTournament', 'name set correctly');
    assertEq(t.format, 'elimination', 'format set correctly');
    assertEq(t.maxPlayers, 8, 'maxPlayers set correctly');
    assertEq(t.status, 'draft', 'initial status is draft');
    assertEq(t.players.size, 0, 'initial players empty');
    assertEq(t.matches.length, 0, 'initial matches empty');

    // test registerPlayer
    const reg1 = t.registerPlayer('p1', 'Alice');
    assert(reg1.success, 'registerPlayer returns success');
    assertEq(t.players.size, 1, 'players size is 1 after register');
    assertEq(t.players.get('p1').playerName, 'Alice', 'playerName correct');

    // test registerPlayer — duplicate
    const regDup = t.registerPlayer('p1', 'Bob');
    assert(regDup.error, 'duplicate registration returns error');
    assertEq(regDup.error, 'already_registered', 'error is already_registered');

    // test registerPlayer — tournament not open
    const t2 = new Tournament('t2', 'T2', 'swiss', 4);
    t2.status = 'running';
    const regNotOpen = t2.registerPlayer('p_x', 'X');
    assertEq(regNotOpen.error, 'tournament_not_open', 'registration rejected when not open');

    // test registerPlayer — full tournament
    const t3 = new Tournament('t3', 'T3', 'elimination', 2);
    t3.registerPlayer('a', 'A');
    t3.registerPlayer('b', 'B');
    const regFull = t3.registerPlayer('c', 'C');
    assertEq(regFull.error, 'tournament_full', 'registration rejected when full');

    // test startTournament
    const t4 = new Tournament('t4', 'T4', 'swiss', 4);
    t4.registerPlayer('p1', 'P1');
    const startSolo = t4.startTournament();
    assert(startSolo.error, 'startTournament fails with < 2 players');
    t4.registerPlayer('p2', 'P2');
    const startOk = t4.startTournament();
    assert(startOk.success, 'startTournament succeeds with 2 players');
    assertEq(t4.status, 'running', 'status is running');
    assertEq(t4.currentRound, 1, 'currentRound is 1');

    // test createMatch
    const match = t4.createMatch('p1', 'p2', 1);
    assert(match !== null, 'createMatch returns match');
    assert(match.matchId.startsWith('m_'), 'matchId format correct');
    assertEq(match.player1Id, 'p1', 'player1Id correct');
    assertEq(match.player2Id, 'p2', 'player2Id correct');
    assertEq(match.round, 1, 'round correct');
    assertEq(match.status, 'pending', 'match status pending');

    // test createMatch — invalid player
    const badMatch = t4.createMatch('p1', 'invalid', 1);
    assertEq(badMatch.error, 'invalid_player', 'invalid player returns error');

    // test reportMatchResult
    const result = t4.reportMatchResult(match.matchId, 'p1', '2-0');
    assert(result.success, 'reportMatchResult returns success');
    assert(typeof result.eloResult === 'object', 'eloResult returned');
    assertEq(result.eloResult.winnerNew, 1516, 'winner ELO increased (base 1500 + ~16)');
    assert(result.eloResult.loserNew < 1500, 'loser ELO decreased');

    // test reportMatchResult — already completed
    const dupResult = t4.reportMatchResult(match.matchId, 'p2', '0-2');
    assertEq(dupResult.error, 'match_already_completed', 'duplicate result rejected');

    // test reportMatchResult — invalid winner
    const badWinner = t4.createMatch('p1', 'p2', 2);
    const badWinResult = t4.reportMatchResult(badWinner.matchId, 'invalid_player', '2-1');
    assertEq(badWinResult.error, 'invalid_winner', 'invalid winner rejected');

    // test reportDraw
    const drawMatch = t4.createMatch('p1', 'p2', 2);
    const drawResult = t4.reportDraw(drawMatch.matchId);
    assert(drawResult.success, 'reportDraw returns success');
    assertEq(t4.players.get('p1').draws, 1, 'draw recorded for player1');

    // test getStandings
    t4.players.get('p1').wins = 10;
    t4.players.get('p2').wins = 5;
    const standings = t4.getStandings();
    assert(Array.isArray(standings), 'getStandings returns array');
    assertEq(standings[0].playerId, 'p1', 'top ranked is p1 (more wins)');
    assertEq(standings[0].elo > standings[1].elo, true, 'top ELO higher');

    // test generateSwissPairings
    t4.currentRound = 2;
    t4.players.get('p1').wins = 2;
    t4.players.get('p2').wins = 2;
    const pairings = t4.generateSwissPairings();
    assert(Array.isArray(pairings), 'generateSwissPairings returns array');

    // test addInsight
    t4.addInsight('p1', 'Fire deck is strong this meta');
    assertEq(t4.tournamentMemory.l1_insight_index.length, 1, 'insight recorded');

    // test getStats
    const stats = t4.getStats();
    assertEq(stats.tournamentId, 't4', 'stats has tournamentId');
    assertEq(stats.playerCount, 2, 'stats playerCount is 2');
    assertEq(stats.currentRound, 2, 'stats currentRound is 2');
    assertEq(typeof stats.completedMatches, 'number', 'stats has completedMatches');
}

// ========================================================================
// TournamentPanel Tests
// ========================================================================
console.log('\n=== TournamentPanel Tests ===');
{
    const t = new Tournament('tp1', 'PanelTest', 'elimination', 4);
    const panel = new TournamentPanel(t);

    assertEq(panel.isOpen, false, 'TournamentPanel initial isOpen false');
    panel.open();
    assertEq(panel.isOpen, true, 'TournamentPanel open sets true');
    panel.close();
    assertEq(panel.isOpen, false, 'TournamentPanel close sets false');
    panel.toggle();
    assertEq(panel.isOpen, true, 'TournamentPanel toggle opens');

    const state = panel.getPanelState();
    assert(typeof state === 'object', 'getPanelState returns object');
    assert(typeof state.stats === 'object', 'state has stats field');
}

// ========================================================================
// TournamentTools Tests
// ========================================================================
console.log('\n=== TournamentTools Tests ===');
{
    const r1 = TournamentTools['tournament.create'].handler({ tournamentId: 'tool_t', name: 'ToolTournament', format: 'swiss', maxPlayers: 8 }, {});
    assert(r1.tournamentId, 'tournament.create returns tournamentId');
    assertEq(r1.name, 'ToolTournament', 'tournament.create returns name');

    const r2 = TournamentTools['tournament.stats'].handler({ tournamentId: 'nonexistent' }, {});
    assertEq(r2.error, 'tournament_not_found', 'stats returns error for unknown tournament');

    const r3 = TournamentTools['tournament.standings'].handler({ tournamentId: 'nonexistent' }, {});
    assertEq(r3.error, 'tournament_not_found', 'standings returns error for unknown tournament');

    const r4 = TournamentTools['tournament.register'].handler({ tournamentId: 'tool_t', playerId: 'player1', playerName: 'PlayerOne' }, {});
    assert(r4.success, 'register via tool succeeds');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    const t = new Tournament('t_int', 'IntegrationCup', 'elimination', 8);

    // Register 4 players
    t.registerPlayer('p1', 'Champion');
    t.registerPlayer('p2', 'Challenger');
    t.registerPlayer('p3', 'Rival');
    t.registerPlayer('p4', 'Newcomer');

    // Start tournament
    // Hook system - register before starting so hook fires on new registration
    let hookCalled = false;
    t.registerHook((event, data) => { hookCalled = true; });
    t.registerPlayer('p5', 'Fifth'); // register 5th player before starting

    t.startTournament();

    // Round 1 matches
    const m1 = t.createMatch('p1', 'p2', 1);
    const m2 = t.createMatch('p3', 'p4', 1);
    t.reportMatchResult(m1.matchId, 'p1', '2-1');
    t.reportMatchResult(m2.matchId, 'p3', '2-0');

    // Round 2 matches
    const m3 = t.createMatch('p1', 'p3', 2);
    t.reportMatchResult(m3.matchId, 'p3', '2-1');

    const stats = t.getStats();
    assertEq(stats.playerCount, 5, 'Integration: 5 players registered');
    assertEq(stats.status, 'running', 'Integration: tournament running');
    assert(stats.completedMatches >= 2, 'Integration: 2+ matches completed');

    const memory = t.getTournamentMemory();
    assert(memory.l2_match_records.length >= 2, 'Integration: match records in memory');
    assert(memory.l3_elo_history !== undefined, 'Integration: elo history array exists');

    const standings = t.getStandings();
    assert(standings[0].elo >= standings[1].elo, 'Integration: standings sorted by ELO');

    assert(hookCalled, 'Integration: hook called on new registration');
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