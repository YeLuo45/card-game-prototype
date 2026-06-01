'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'collab-session.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'role-system.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'shared-resource.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'collab-broadcast.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'collab-tournament-bracket.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'collab-reputation.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'collab-index.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'collab-match-sim.js'), 'utf8'));
var CollabArenaManager = window.CollabArenaManager;
var RoleAssignmentEngine = window.RoleAssignmentEngine;
var SharedResourceManager = window.SharedResourceManager;
var CollabBroadcastManager = window.CollabBroadcastManager;
var TournamentBracket = window.TournamentBracket;
var PlayerReputation = window.PlayerReputation;
var ContributionTracker = window.ContributionTracker;
var CollabArena = window.CollabArena;
var MatchSimulator = window.MatchSimulator;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){assert(a===b,msg+' (expected '+b+', got '+a+')');}

{var m=new CollabArenaManager();m.createSession('s1');m.sessions.s1.addPlayer('p1');m.sessions.s1.addPlayer('p2');m.sessions.s1.setPlayerReady('p1',true);m.sessions.s1.setPlayerReady('p2',true);m.sessions.s1.startSession();var ap=m.sessions.s1.getActivePlayer();assert(ap!==null,'active player not null');}
{var e=new RoleAssignmentEngine();e.assignRole('s1','p1','tank');e.assignRole('s1','p2','dps');var comp=e.getTeamComposition('s1');assertEq(Object.keys(comp).length,2,'2 roles in team');}
{var rm=new SharedResourceManager();rm.acquire('s1','p1',window.ResourceType.HEALTH_PACK);rm.acquire('s1','p2',window.ResourceType.SHIELD_CHARGE);var sr=rm.getSessionResources('s1');assertEq(sr[window.ResourceType.HEALTH_PACK].available,2,'2 hp left');}
{var bm=new CollabBroadcastManager();var ch=bm.getOrCreateChannel('s1',null);ch.subscribe('p1',function(){});ch.subscribe('p2',function(){});var r=bm.getNotificationSystem('s1').notifyTurnStart('s1','p1',1);assertEq(r.deliveredCount,2,'2 notified');}
{var t=new TournamentBracket('t1');t.buildSingleElimination(['a','b','c','d']);var up=t.getUpcomingMatches();assert(up.length>=2,'2+ matches');}
{var r=new PlayerReputation('p1');r.addEvent('teamwork_bonus',500,'good');var rep=r.getReputation();assert(rep.totalScore>=100,'score ok');}
{var c=new ContributionTracker();c.recordAction('s1','p1','damage_dealt',1000);c.recordGameResult('s1','p1',true);var p=c.getPlayerStats('p1');assertEq(p.gamesWon,1,'1 win');}
{var a=new CollabArena();a.createSession('s1');a.assignRole('s1','p1','tank');a.acquireResource('s1','p1','hp');a.subscribeToSession('s1','p1');var role=a.getPlayerRole('s1','p1');assertEq(role,'tank','role from collab arena');}
{var s=new MatchSimulator();s.createAgent('ai1',{aggressionLevel:0.8});s.startSimulation('sim1',['p1','p2']);var r=s.runTurn('sim1');assertEq(r.turn,1,'sim turn 1');}
{var m=new CollabArenaManager();m.createSession('s1');var r=m.endSession('s1','draw');assertEq(m.sessionHistory.length,1,'1 history');}
{var t=new TournamentBracket('t1');t.buildSingleElimination(['a','b','c','d']);var firstMatchId=Object.keys(t.allNodes).filter(function(id){return t.allNodes[id].type==='match'&&id.indexOf('r0')!==-1;})[0];t.advanceWinner(firstMatchId,'a');var node=t.getNode(firstMatchId);assertEq(node.state,'completed','match completed');}

console.log('\n===== Integration Tests =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);
