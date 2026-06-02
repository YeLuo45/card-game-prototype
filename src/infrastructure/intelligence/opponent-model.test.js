'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'opponent-model.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'card-intelligence.js'), 'utf8'));
var OpponentModel = window.OpponentModel;
var PlayHistoryTracker = window.PlayHistoryTracker;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){assert(a===b,msg+' (expected '+b+', got '+a+')');}
function assertApprox(a,b,msg){assert(Math.abs(a-b)<=0.01,msg+' (expected ~'+b+', got '+a+')');}

{var m=new OpponentModel('p1');assertEq(m.opponentId,'p1','opponent id');assertEq(m.observedPlays.length,0,'0 plays');}
{var m=new OpponentModel();assertEq(m.opponentId,'unknown','default unknown');}
{var m=new OpponentModel('p1');var r=m.recordPlay('c1',1,{isCombo:false});assert(r.success,'record play');assertEq(m.observedPlays.length,1,'1 play');}
{var m=new OpponentModel('p1');m.recordPlay('c1',1);m.recordPlay('c2',2);m.recordPlay('c1',3);var arch=m.inferArchetype();assert(arch!==null,'archetype not null');}
{var m=new OpponentModel('p1');m.recordPlay('c1',1);m.recordPlay('c1',2);m.recordPlay('c1',3);var arch=m.inferArchetype();assertEq(typeof arch,'string','archetype string');}
{var m=new OpponentModel('p1');m.recordPlay('c1',1);m.recordPlay('c1',2);m.recordPlay('c1',3);var prof=m.updateProfile();assert(prof.aggression>=0,'aggression valid');assert(prof.tempo>=0,'tempo valid');}
{var m=new OpponentModel('p1');m.recordPlay('c1',1);m.recordPlay('c1',2);m.recordPlay('c1',3);var preds=m.predictPlay(2,['c1','c2']);assert(preds.length>=0,'pred is array');}
{var m=new OpponentModel('p1');assertApprox(m.getStrengthEstimate(),0.5,'default strength');m.setStrengthEstimate(0.7);assertApprox(m.getStrengthEstimate(),0.7,'updated strength');m.setStrengthEstimate(1.5);assertApprox(m.getStrengthEstimate(),1,'clamped to 1');m.setStrengthEstimate(-0.5);assertApprox(m.getStrengthEstimate(),0,'clamped to 0');}
{var t=new PlayHistoryTracker();var m=t.getOrCreateModel('p1');assert(m instanceof OpponentModel,'get or create returns model');}
{var t=new PlayHistoryTracker();var m1=t.getOrCreateModel('p1');var m2=t.getOrCreateModel('p1');assert(m1===m2,'same model instance');}
{var t=new PlayHistoryTracker();var r=t.recordMatch('p1','myDeck','aggroDeck','win',10);assert(r.success,'record match');assertEq(r.totalMatches,1,'1 match');}
{var t=new PlayHistoryTracker();var r=t.recordMatch('p1','myDeck','aggroDeck','win',10);var r2=t.recordMatch('p1','myDeck','aggroDeck','loss',15);assertEq(r2.totalMatches,2,'2 matches');}
{var t=new PlayHistoryTracker();t.recordMatch('p1','myDeck','aggroDeck','win',10);var sum=t.getOpponentSummary('p1');assert(sum!==null,'summary not null');assertEq(sum.opponentId,'p1','correct id');assert(typeof sum.archetype==='string','archetype string');assert(typeof sum.profile==='object','profile object');}
{var t=new PlayHistoryTracker();t.recordMatch('p1','d1','aggro','win',10);var sum=t.getOpponentSummary('p2');assert(sum===null,'null for unknown');}
{var t=new PlayHistoryTracker();t.recordMatch('p1','d1','aggro','win',10);t.recordMatch('p1','d1','aggro','loss',12);t.recordMatch('p1','d1','aggro','win',8);var recent=t.getRecentMatches('p1',2);assertEq(recent.length,2,'2 recent');assertEq(recent[0].result,'win','most recent first');}
{var t=new PlayHistoryTracker();t.recordMatch('p1','d1','aggro','win',10);t.recordMatch('p2','d1','control','loss',15);var ops=t.getAllOpponents();assertEq(ops.length,2,'2 opponents');}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);
