'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'deck-correlation.js'), 'utf8'));
var DeckCorrelationMatrix = window.DeckCorrelationMatrix;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){assert(a===b,msg+' (expected '+b+', got '+a+')');}
function assertApprox(a,b,msg){assert(Math.abs(a-b)<=0.01,msg+' (expected ~'+b+', got '+a+')');}

{var m=new DeckCorrelationMatrix();assert(Object.keys(m.matrix).length===0,'empty matrix');}
{var m=new DeckCorrelationMatrix();var sig=m.buildSignature(['c1','c2','c1']);assertEq(sig,'c1:2|c2:1','signature correct');}
{var m=new DeckCorrelationMatrix();m.recordDeckPerformance(['c1','c2'],'win',0.8);assertEq(Object.keys(m.matrix).length,1,'1 deck recorded');var wr=m.getWinRate(['c1','c2']);assertApprox(wr,1.0,'win rate 100%');}
{var m=new DeckCorrelationMatrix();m.recordDeckPerformance(['c1','c2'],'win');m.recordDeckPerformance(['c1','c2'],'loss');var wr=m.getWinRate(['c1','c2']);assertApprox(wr,0.5,'win rate 50%');}
{var m=new DeckCorrelationMatrix();m.recordDeckPerformance(['c1','c2'],'win');m.recordDeckPerformance(['c1','c2'],'win');m.recordDeckPerformance(['c1','c2'],'loss');var wr=m.getWinRate(['c1','c2']);assertApprox(wr,0.667,'win rate 66.7%');}
{var m=new DeckCorrelationMatrix();m.recordDeckPerformance(['c1','c2','c3'],'win');var similar=m.findSimilarDecks(['c1','c2'],3);assert(Array.isArray(similar),'similar is array');}
{var m=new DeckCorrelationMatrix();m.recordDeckPerformance(['c1','c2','c3'],'win');m.recordDeckPerformance(['c1','c2','c4'],'loss');var similar=m.findSimilarDecks(['c1','c2'],3);assert(similar.length>=0,'similar length valid');}
{var m=new DeckCorrelationMatrix();m.recordDeckPerformance(['a','b','c'],'win');m.recordDeckPerformance(['a','b','d'],'win');m.recordDeckPerformance(['x','y','z'],'loss');var top=m.getTopCards(['a','b'],2);assert(Array.isArray(top),'top is array');}
{var m=new DeckCorrelationMatrix();m.recordDeckPerformance(['c1','c2'],'win');m.recordDeckPerformance(['c1','c2'],'loss');var stats=m.getStats();assertEq(stats.deckCount,1,'1 deck');assertEq(stats.totalGames,2,'2 games');}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);
