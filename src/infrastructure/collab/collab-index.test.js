'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'collab-index.js'), 'utf8'));
var CollabArena = window.CollabArena;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){assert(a===b,msg+' (expected '+b+', got '+a+')');}

{var a=new CollabArena();var r=a.createSession('s1');assert(r.success,'create session');}
{var a=new CollabArena();a.createSession('s1');var s=a.getSession('s1');assert(s!==null,'session not null');assertEq(s.sessionId,'s1','session id');}
{var a=new CollabArena();a.createSession('s1');a.createSession('s2');var active=a.getActiveSessions();assertEq(active.length,2,'2 active');}
{var a=new CollabArena();var r=a.assignRole('s1','p1','tank');assert(r.success,'assign role');}
{var a=new CollabArena();a.assignRole('s1','p1','tank');var role=a.getPlayerRole('s1','p1');assertEq(role,'tank','role tank');}
{var a=new CollabArena();a.assignRole('s1','p1','dps');a.assignRole('s1','p2','support');var team=a.getTeamComposition('s1');assertEq(team.dps.length,1,'1 dps');assertEq(team.support.length,1,'1 support');}
{var a=new CollabArena();var r=a.acquireResource('s1','p1','hp');assert(r.success,'acquire hp');}
{var a=new CollabArena();a.acquireResource('s1','p1','hp');a.acquireResource('s1','p2','hp');a.acquireResource('s1','p3','hp');var r=a.acquireResource('s1','p4','hp');assertEq(r.error,'depleted','depleted');}
{var a=new CollabArena();var r=a.subscribeToSession('s1','p1');assert(r.success,'subscribe success');assertEq(r.count,1,'1 subscriber');}
{var a=new CollabArena();a.subscribeToSession('s1','p1');a.subscribeToSession('s1','p2');var r=a.broadcast('s1','turn_start',{turn:1});assertEq(r.deliveredCount,2,'2 delivered');}
{var a=new CollabArena();var r=a.buildTournament('t1',['a','b','c','d']);assertEq(r.rounds,2,'2 rounds');assertEq(r.totalParticipants,4,'4 participants');}
{var a=new CollabArena();a.buildTournament('t1',['a','b','c','d']);var t=a.getTournament('t1');assert(t!==null,'tournament exists');assertEq(t.rounds,2,'2 rounds');}
{var a=new CollabArena();var r=a.recordReputation('p1','teamwork',100);assert(r.success,'record rep');assertEq(r.score,100,'score 100');}
{var a=new CollabArena();a.recordReputation('p1','teamwork',100);var rep=a.getPlayerReputation('p1');assertEq(rep.score,100,'score 100');assertEq(rep.level,'silver','silver level');}
{var a=new CollabArena();a.recordReputation('p1','teamwork',1000);var rep=a.getPlayerReputation('p1');assertEq(rep.level,'gold','gold at 1000');}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);
