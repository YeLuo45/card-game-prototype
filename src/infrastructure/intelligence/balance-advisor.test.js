'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'card-intelligence.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'deck-correlation.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'balance-advisor.js'), 'utf8'));
var CardBalanceAdvisor = window.CardBalanceAdvisor;
var DraftRecommendationEngine = window.DraftRecommendationEngine;
var CardIntelligenceNetwork = window.CardIntelligenceNetwork;
var DeckCorrelationMatrix = window.DeckCorrelationMatrix;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){assert(a===b,msg+' (expected '+b+', got '+a+')');}
function assertApprox(a,b,msg){assert(Math.abs(a-b)<=0.01,msg+' (expected ~'+b+', got '+a+')');}

{var a=new CardBalanceAdvisor(null);var r=a.analyzeCardBalance('c1',0.2,0.6);assertEq(r.action,'nerf','overpowered');}
{var a=new CardBalanceAdvisor(null);var r=a.analyzeCardBalance('c1',0.1,0.35);assertEq(r.action,'buff','underpowered');}
{var a=new CardBalanceAdvisor(null);var r=a.analyzeCardBalance('c1',0.01,0.4);assertEq(r.action,'redesign','never played');}
{var a=new CardBalanceAdvisor(null);var r=a.analyzeCardBalance('c1',0.1,0.5);assertEq(r.action,'none','balanced');}
{var a=new CardBalanceAdvisor(null);var suggs=a.getBalanceSuggestions([{cardId:'c1',playRate:0.2,winRate:0.6},{cardId:'c2',playRate:0.1,winRate:0.35}]);assertEq(suggs.length,2,'2 suggestions');}
{var a=new CardBalanceAdvisor(null);a.analyzeCardBalance('c1',0.2,0.6);a.analyzeCardBalance('c2',0.1,0.35);var buffs=a.getTopBuffs(5);assertEq(buffs.length,1,'1 buff');var nerfs=a.getTopNerfs(5);assertEq(nerfs.length,1,'1 nerf');}
{var n=new CardIntelligenceNetwork();var c=new DeckCorrelationMatrix();var e=new DraftRecommendationEngine(n,c);var sugg=e.suggestPick(['c1'],['c2','c3'],1);assert(Array.isArray(sugg),'suggestPick returns array');}
{var n=new CardIntelligenceNetwork();var c=new DeckCorrelationMatrix();var e=new DraftRecommendationEngine(n,c);e.suggestPick(['c1'],['c2'],1);e.suggestPick(['c1','c2'],['c3'],2);var stats=e.getDraftStats();assertEq(stats.totalPicks,2,'2 picks');}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);
