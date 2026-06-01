'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'collab-tournament-bracket.js'), 'utf8'));
var TournamentBracket = window.TournamentBracket;
var MatchScheduler = window.MatchScheduler;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){assert(a===b,msg+' (expected '+b+', got '+a+')');}
function assertApprox(a,b,msg){assert(Math.abs(a-b)<=0.01,msg+' (expected ~'+b+', got '+a+')');}

{var t=new TournamentBracket('t1');var r=t.buildSingleElimination(['a','b','c','d']);assertEq(r.rounds,2,'2 rounds');assertEq(r.totalParticipants,4,'4 participants');}
{var t=new TournamentBracket('t1');t.buildSingleElimination(['a','b','c','d']);var root=t.getNode('root');assert(root!==null,'root node exists');assertEq(root.type,'stage','root is stage');}
{var t=new TournamentBracket('t1');t.buildSingleElimination(['a','b','c','d']);var up=t.getUpcomingMatches();assert(up.length>=2,'at least 2 upcoming');}
{var t=new TournamentBracket('t1');t.buildSingleElimination(['a','b']);var firstMatchId=Object.keys(t.allNodes).filter(function(id){return t.allNodes[id].type==='match';})[0];var r=t.advanceWinner(firstMatchId,'a');assert(r.success,'advance winner success');}
{var t=new TournamentBracket('t1');t.buildSingleElimination(['a','b']);var firstMatchId=Object.keys(t.allNodes).filter(function(id){return t.allNodes[id].type==='match';})[0];var r=t.advanceWinner(firstMatchId,'a');var node=t.getNode(firstMatchId);assertEq(node.winner,'a','winner is a');assertEq(node.state,'completed','node completed');}
{var t=new TournamentBracket('t1');t.buildSingleElimination(['a','b','c','d']);var firstMatchId=Object.keys(t.allNodes).filter(function(id){return t.allNodes[id].type==='match'&&id.indexOf('r0')!==-1;})[0];t.advanceWinner(firstMatchId,'a');var secondMatchId=Object.keys(t.allNodes).filter(function(id){return t.allNodes[id].type==='match'&&id.indexOf('r0')!==-1;})[1];t.advanceWinner(secondMatchId,'c');}
{var t=new TournamentBracket('t1');var inv=t.advanceWinner('invalid','a');assertEq(inv.error,'node_not_found','node not found');}
{var t=new TournamentBracket('t1');t.buildSingleElimination(['a','b']);var firstMatchId=Object.keys(t.allNodes).filter(function(id){return t.allNodes[id].type==='match';})[0];t.advanceWinner(firstMatchId,'a');var r2=t.advanceWinner(firstMatchId,'b');assertEq(r2.error,'node_not_pending','not pending');}
{var t=new TournamentBracket('t1');t.buildSingleElimination(['a','b','c','d']);var res=t.getResults();assert(Array.isArray(res),'results is array');}
{var t=new TournamentBracket('t1');t.buildSingleElimination(['a','b']);assertEq(t.totalRounds,1,'1 round for 2 players');}
{var t=new TournamentBracket('t1');t.buildSingleElimination(['a','b','c']);assertEq(t.totalRounds,2,'2 rounds for 3 players');}
{var s=new MatchScheduler();var r=s.scheduleMatch('m1',Date.now()+1000);assert(r.success,'schedule success');}
{var s=new MatchScheduler();s.scheduleMatch('m1',Date.now());var r=s.scheduleMatch('m1',Date.now());assertEq(r.error,'already_scheduled','already scheduled');}
{var s=new MatchScheduler();s.scheduleMatch('m1',Date.now());var r=s.cancelMatch('m1');assert(r.success,'cancel success');}
{var s=new MatchScheduler();var r=s.cancelMatch('invalid');assertEq(r.error,'match_not_found','not found');}
{var s=new MatchScheduler();s.scheduleMatch('m1',Date.now()-1000);s.scheduleMatch('m2',Date.now()+1000);var all=s.getScheduledMatches();assertEq(all.length,2,'2 scheduled');}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);
