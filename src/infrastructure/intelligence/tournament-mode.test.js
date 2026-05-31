'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'card-intelligence.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'opponent-model.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'strategy-engine.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'tournament-mode.js'), 'utf8'));
var TournamentModeSupport = window.TournamentModeSupport;
var MatchSimulator = window.MatchSimulator;
var CardIntelligenceNetwork = window.CardIntelligenceNetwork;
var PlayHistoryTracker = window.PlayHistoryTracker;
var AdaptiveStrategyEngine = window.AdaptiveStrategyEngine;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){assert(a===b,msg+' (expected '+b+', got '+a+')');}
function assertApprox(a,b,msg){assert(Math.abs(a-b)<=0.01,msg+' (expected ~'+b+', got '+a+')');}

{var n=new CardIntelligenceNetwork();var t=new PlayHistoryTracker();var e=new AdaptiveStrategyEngine(n,t);var s=new TournamentModeSupport(n,t,e);assert(s instanceof TournamentModeSupport,'tournament created');}
{var n=new CardIntelligenceNetwork();var t=new PlayHistoryTracker();var e=new AdaptiveStrategyEngine(n,t);var s=new TournamentModeSupport(n,t,e);var r=s.createTournament('Test Cup','single_elimination',['p1','p2']);assert(r.success,'create success');assert(r.tournamentId.indexOf('t_')===0,'tournament id');}
{var n=new CardIntelligenceNetwork();var t=new PlayHistoryTracker();var e=new AdaptiveStrategyEngine(n,t);var s=new TournamentModeSupport(n,t,e);var r=s.createTournament('Test');var tid=r.tournamentId;s.recordTournamentMatch(tid,'p1','p2','win',3);var stats=s.getTournamentStats(tid);assertEq(stats.matchCount,1,'1 match');}
{var n=new CardIntelligenceNetwork();var t=new PlayHistoryTracker();var e=new AdaptiveStrategyEngine(n,t);var s=new TournamentModeSupport(n,t,e);var r=s.createTournament('Test');var tid=r.tournamentId;s.recordTournamentMatch(tid,'p1','p2','win');s.recordTournamentMatch(tid,'p2','p1','loss');var stand=s.getTournamentStandings(tid);assertEq(stand.length,2,'2 players');assertEq(stand[0].wins,1,'p1 has 1 win');}
{var n=new CardIntelligenceNetwork();var t=new PlayHistoryTracker();var s=new MatchSimulator(n,t);assert(s instanceof MatchSimulator,'simulator created');}
{var n=new CardIntelligenceNetwork();var t=new PlayHistoryTracker();var s=new MatchSimulator(n,t);var r=s.simulateMatch(['c1','c2'],['c3','c4'],10);assertEq(typeof r.wins,'number','wins number');assertEq(typeof r.losses,'number','losses number');assertApprox(r.winRate,r.wins/10,'winRate');}
{var n=new CardIntelligenceNetwork();var t=new PlayHistoryTracker();var s=new MatchSimulator(n,t);s.simulateMatch(['c1'],['c2'],5);s.simulateMatch(['c3'],['c4'],5);var hist=s.getSimulationHistory(5);assert(hist.length<=2,'history limited');}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);
