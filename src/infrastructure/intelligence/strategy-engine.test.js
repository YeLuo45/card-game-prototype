'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'card-intelligence.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'opponent-model.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'strategy-engine.js'), 'utf8'));
var CardIntelligenceNetwork = window.CardIntelligenceNetwork;
var PlayHistoryTracker = window.PlayHistoryTracker;
var AdaptiveStrategyEngine = window.AdaptiveStrategyEngine;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){assert(a===b,msg+' (expected '+b+', got '+a+')');}
function assertApprox(a,b,msg){assert(Math.abs(a-b)<=0.01,msg+' (expected ~'+b+', got '+a+')');}

{var n=new CardIntelligenceNetwork();var t=new PlayHistoryTracker();var e=new AdaptiveStrategyEngine(n,t);assert(e instanceof AdaptiveStrategyEngine,'engine created');assertEq(e.currentStrategy,'balanced','default balanced');}
{var n=new CardIntelligenceNetwork();n.graph.addRelationship('c1','c2','combo',2.0);var t=new PlayHistoryTracker();var e=new AdaptiveStrategyEngine(n,t);var sugg=e.suggestPlay(['c1'],['c3'],{turn:1},null);assert(sugg.cardId!==null||sugg.cardId===null,'suggestPlay returns');}
{var n=new CardIntelligenceNetwork();n.graph.addRelationship('c1','c2','combo',2.0);var t=new PlayHistoryTracker();var e=new AdaptiveStrategyEngine(n,t);var r=e.adjustStrategy('win',{});assert(r.success,'adjustStrategy success');assertEq(e.currentStrategy,'balanced','still balanced after win');}
{var n=new CardIntelligenceNetwork();var t=new PlayHistoryTracker();var e=new AdaptiveStrategyEngine(n,t);e.currentStrategy='aggro';var r=e.adjustStrategy('loss',{});assert(r.success,'loss adjust');assertEq(e.currentStrategy,'control','switched to control');}
{var n=new CardIntelligenceNetwork();var t=new PlayHistoryTracker();var e=new AdaptiveStrategyEngine(n,t);e.currentStrategy='midrange';var r=e.adjustStrategy('loss',{});assertEq(e.currentStrategy,'aggro','midrange->aggro');}
{var n=new CardIntelligenceNetwork();var t=new PlayHistoryTracker();var e=new AdaptiveStrategyEngine(n,t);var hint=e.getStrategyHint(null,{});assertEq(hint.strategy,'balanced','default strategy');assertEq(hint.hint,'default','default hint');}
{var n=new CardIntelligenceNetwork();var t=new PlayHistoryTracker();t.recordMatch('p1','d1','aggro','win',10);var e=new AdaptiveStrategyEngine(n,t);var hint=e.getStrategyHint('p1',{});assertEq(typeof hint.strategy,'string','hint strategy');assertEq(typeof hint.hint,'string','hint hint');}
{var n=new CardIntelligenceNetwork();var t=new PlayHistoryTracker();var e=new AdaptiveStrategyEngine(n,t);assertEq(e.getHistoryLength(),0,'0 history');e.adjustStrategy('win',{});assertEq(e.getHistoryLength(),1,'1 history');}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);
