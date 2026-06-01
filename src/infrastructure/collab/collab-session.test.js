'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'collab-session.js'), 'utf8'));
var SessionState = window.SessionState;
var CollabArenaManager = window.CollabArenaManager;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){assert(a===b,msg+' (expected '+b+', got '+a+')');}
function assertApprox(a,b,msg){assert(Math.abs(a-b)<=0.01,msg+' (expected ~'+b+', got '+a+')');}

{var s=new SessionState('test1');assertEq(s.sessionId,'test1','session id');assertEq(s.state,'waiting','initial state');assertEq(s.players.length,0,'0 players');}
{var s=new SessionState();assert(s.sessionId.indexOf('session_')===0,'auto id');}
{var s=new SessionState('s1');var r=s.addPlayer('p1');assert(r.success,'add player success');assertEq(s.players.length,1,'1 player');}
{var s=new SessionState('s1');s.addPlayer('p1');var r=s.addPlayer('p1');assertEq(r.error,'already_joined','already joined');}
{var s=new SessionState('s1');s.addPlayer('p1');s.addPlayer('p2');s.addPlayer('p3');s.addPlayer('p4');var r=s.addPlayer('p5');assertEq(r.error,'session_full','session full');}
{var s=new SessionState('s1');s.addPlayer('p1');s.addPlayer('p2');var r=s.setPlayerReady('p1',true);assert(r.success,'set ready');assertEq(r.readyCount,1,'1 ready');}
{var s=new SessionState('s1');s.addPlayer('p1');s.addPlayer('p2');var r=s.canStart();assert(!r,'cannot start not all ready');s.setPlayerReady('p1',true);s.setPlayerReady('p2',true);var r2=s.canStart();assert(r2,'can start all ready');}
{var s=new SessionState('s1');s.addPlayer('p1');s.addPlayer('p2');s.setPlayerReady('p1',true);s.setPlayerReady('p2',true);var r=s.startSession();assert(r.success,'start success');assertEq(s.state,'in_progress','state in_progress');assertEq(r.turnOrder.length,2,'2 in turn order');}
{var s=new SessionState('s1');s.addPlayer('p1');s.addPlayer('p2');s.setPlayerReady('p1',true);s.setPlayerReady('p2',true);s.startSession();var ap=s.getActivePlayer();assertEq(ap,'p1','p1 is active first');s.advanceTurn();var ap2=s.getActivePlayer();assertEq(ap2,'p2','p2 is active second');s.advanceTurn();var ap3=s.getActivePlayer();assertEq(ap3,'p1','back to p1');}
{var s=new SessionState('s1');s.addPlayer('p1');s.addPlayer('p2');s.setPlayerReady('p1',true);s.setPlayerReady('p2',true);s.startSession();var r=s.advanceTurn();assert(r.success,'advance success');assertEq(r.currentTurn,1,'turn 1');}
{var s=new SessionState('s1');s.addPlayer('p1');s.addPlayer('p2');s.setPlayerReady('p1',true);s.setPlayerReady('p2',true);s.startSession();s.advanceTurn();s.endSession('victory');assertEq(s.state,'completed','completed');}
{var m=new CollabArenaManager();var r=m.createSession('arena1');assert(r.success,'create session');assertEq(r.sessionId,'arena1','session id');}
{var m=new CollabArenaManager();m.createSession('arena1');var r=m.createSession('arena1');assertEq(r.error,'session_exists','session exists');}
{var m=new CollabArenaManager();m.createSession('a1');m.sessions.a1.addPlayer('p1');var act=m.getActiveSessions();assertEq(act.length,1,'1 active');}
{var m=new CollabArenaManager();m.createSession('a1');m.sessions.a1.addPlayer('p1');m.sessions.a1.addPlayer('p2');m.sessions.a1.setPlayerReady('p1',true);m.sessions.a1.setPlayerReady('p2',true);m.sessions.a1.startSession();m.endSession('a1','victory');var hist=m.sessionHistory;assertEq(hist.length,1,'1 in history');}
{var s=new SessionState('s1');s.addPlayer('p1');s.addPlayer('p2');s.removePlayer('p1');assertEq(s.players.length,1,'1 player after remove');assertEq(s.players[0].playerId,'p2','p2 remains');}
{var s=new SessionState('s1');s.addPlayer('p1');var r=s.removePlayer('p999');assertEq(r.error,'player_not_found','player not found');}
{var s=new SessionState('s1');s.addPlayer('p1');s.addPlayer('p2');s.setPlayerReady('p1',true);s.setPlayerReady('p2',true);s.startSession();var info=s.getSessionInfo();assertEq(info.playerCount,2,'2 players');assertEq(info.canStart,false,'cannot start in progress');}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);
