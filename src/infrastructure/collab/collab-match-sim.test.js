'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'collab-match-sim.js'), 'utf8'));
var MatchSimulator = window.MatchSimulator;
var AIAgent = window.AIAgent;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){assert(a===b,msg+' (expected '+b+', got '+a+')');}
function assertApprox(a,b,msg){assert(Math.abs(a-b)<=0.01,msg+' (expected ~'+b+', got '+a+')');}

{var s=new MatchSimulator();assert(s!==null,'simulator created');}
{var s=new MatchSimulator();var r=s.createAgent('ai1',{aggressionLevel:0.8});assert(r.success,'create agent');}
{var s=new MatchSimulator();var r=s.startSimulation('sim1',['p1','p2']);assert(r.success,'start simulation');assertEq(r.turn,0,'turn 0');}
{var s=new MatchSimulator();s.startSimulation('sim1',['p1','p2']);var r=s.startSimulation('sim1',['p1','p2']);assertEq(r.error,'simulation_exists','already exists');}
{var s=new MatchSimulator();s.startSimulation('sim1',['p1','p2']);var st=s.getSimulationState('sim1');assertEq(st.turn,0,'turn 0');assertEq(st.state,'in_progress','in progress');}
{var s=new MatchSimulator();s.startSimulation('sim1',['p1','p2']);var r=s.runTurn('sim1');assertEq(r.turn,1,'turn 1');assert(r.state==='in_progress'||r.state==='completed','state ok');}
{var s=new MatchSimulator();s.startSimulation('sim1',['p1','p2']);var r=s.runTurn('sim1');assert(Array.isArray(r.events),'events is array');assertEq(r.events.length,2,'2 events');}
{var s=new MatchSimulator();s.startSimulation('sim1',['p1','p2']);for(var i=0;i<50;i++){var r=s.runTurn('sim1');if(r.state==='completed')break;}assertEq(r.state,'completed','completed after max turns');}
{var s=new MatchSimulator();var r=s.runTurn('invalid');assertEq(r.error,'simulation_not_found','not found');}
{var a=new AIAgent({aggressionLevel:0.9});var r=a.selectAction({availableActions:['attack','defend','heal','special']});assert(r.action!==null,'has action');assert(r.confidence!==undefined,'has confidence');}
{var a=new AIAgent({aggressionLevel:0.9});a.recordResult(true);var stats=a.getStats();assertEq(stats.wins,1,'1 win');assertEq(stats.gamesPlayed,1,'1 game');}
{var a=new AIAgent({aggressionLevel:0.5});a.recordResult(true);a.recordResult(false);var stats=a.getStats();assertEq(stats.wins,1,'1 win');assertEq(stats.losses,1,'1 loss');assertApprox(stats.winRate,0.5,'50% win rate');}
{var s=new MatchSimulator();s.createAgent('ai1',{aggressionLevel:0.7});var stats=s.getAgentStats('ai1');assertEq(stats.aggressionLevel,0.7,'agg 0.7');}
{var s=new MatchSimulator();var stats=s.getAgentStats('unknown');assertEq(stats,null,'null for unknown');}
{var s=new MatchSimulator();s.startSimulation('sim1',['p1','p2']);s.runTurn('sim1');var log=s.getSimulationLog('sim1');assert(log.length>0,'log non-empty');}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);
