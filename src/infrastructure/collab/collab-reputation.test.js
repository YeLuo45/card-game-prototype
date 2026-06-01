'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'collab-reputation.js'), 'utf8'));
var PlayerReputation = window.PlayerReputation;
var ContributionTracker = window.ContributionTracker;
var ReputationEvent = window.ReputationEvent;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){assert(a===b,msg+' (expected '+b+', got '+a+')');}
function assertApprox(a,b,msg){assert(Math.abs(a-b)<=0.01,msg+' (expected ~'+b+', got '+a+')');}

{var r=new PlayerReputation('p1');assertEq(r.playerId,'p1','player id');assertEq(r.level,'bronze','initial level');assertEq(r.totalScore,0,'0 score');}
{var r=new PlayerReputation('p1');r.addEvent(ReputationEvent.TEAMWORK_BONUS,50,'good play');assertEq(r.totalScore,50,'50 score');}
{var r=new PlayerReputation('p1');r.addEvent(ReputationEvent.TEAMWORK_BONUS,60,'good play');r.addEvent(ReputationEvent.LEADERSHIP,40,'led team');assertEq(r.totalScore,100,'100 score');assertEq(r.level,'silver','silver level');}
{var r=new PlayerReputation('p1');for(var i=0;i<5;i++)r.addEvent(ReputationEvent.TEAMWORK_BONUS,120,'x');r._recalculate();assertEq(r.level,'gold','gold at 1000');}
{var r=new PlayerReputation('p1');r.addEvent(ReputationEvent.AFK,-50,'afk');assertEq(r.totalScore,0,'0 from neg');}
{var r=new PlayerReputation('p1');r.addEvent(ReputationEvent.TEAMWORK_BONUS,300,'x');var rep=r.getReputation();assertEq(rep.playerId,'p1','player id');assertEq(rep.totalScore,300,'score 300');assertEq(rep.eventCount,1,'1 event');}
{var r=new PlayerReputation('p1');for(var i=0;i<10;i++)r.addEvent(ReputationEvent.TEAMWORK_BONUS,10,'x');var hist=r.getHistory(3);assertEq(hist.length,3,'last 3');var all=r.getHistory();assertEq(all.length,10,'all 10');}

{var c=new ContributionTracker();var p=c.getOrCreatePlayer('p1');assertEq(p.playerId,'p1','player id');}
{var c=new ContributionTracker();var p=c.getOrCreatePlayer('p1');p.damageDealt=1000;var p2=c.getOrCreatePlayer('p1');assertEq(p2.damageDealt,1000,'persisted');}
{var c=new ContributionTracker();c.recordAction('s1','p1','damage_dealt',500);var p=c.getPlayerStats('p1');assertEq(p.damageDealt,500,'500 damage');}
{var c=new ContributionTracker();c.recordAction('s1','p1','healing_done',200);var p=c.getPlayerStats('p1');assertEq(p.healingDone,200,'200 healing');}
{var c=new ContributionTracker();c.recordAction('s1','p1','damage_dealt',100);c.recordAction('s1','p1','damage_dealt',200);var p=c.getPlayerStats('p1');assertEq(p.damageDealt,300,'300 total');}
{var c=new ContributionTracker();c.recordGameResult('s1','p1',true);var p=c.getPlayerStats('p1');assertEq(p.gamesPlayed,1,'1 game played');assertEq(p.gamesWon,1,'1 win');}
{var c=new ContributionTracker();c.recordGameResult('s1','p1',true);c.recordGameResult('s1','p1',false);var p=c.getPlayerStats('p1');assertEq(p.gamesPlayed,2,'2 games');assertEq(p.gamesWon,1,'1 win');}
{var c=new ContributionTracker();c.recordAction('s1','p1','damage_dealt',100);c.recordAction('s1','p1','healing_done',50);var stats=c.getSessionStats('s1');assertEq(stats.p1.damageDealt,100,'session damage');assertEq(stats.p1.healingDone,50,'session healing');}
{var c=new ContributionTracker();c.recordAction('s1','p1','damage_dealt',1000);c.recordAction('s2','p2','damage_dealt',500);var lb=c.getLeaderboard(10);assert(lb.length<=10,'max 10');assertEq(lb[0].playerId,'p1','p1 first');}
{var c=new ContributionTracker();var empty=c.getSessionStats('s999');assertEq(Object.keys(empty).length,0,'empty session');}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);
