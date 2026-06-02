'use strict';
var fs = require('fs'), path = require('path');
if (typeof localStorage !== 'undefined') localStorage.clear();
var mockStorage = {};
global.localStorage = { getItem: function(k){return mockStorage[k]||null;}, setItem: function(k,v){mockStorage[k]=v;}, removeItem: function(k){delete mockStorage[k];}, clear: function(){mockStorage={};} };
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'card-intelligence.js'), 'utf8'));
var CardRelationshipGraph = window.CardRelationshipGraph;
var ComboRegistry = window.ComboRegistry;
var CardIntelligenceNetwork = window.CardIntelligenceNetwork;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){assert(a===b,msg+' (expected '+b+', got '+a+')');}
function assertApprox(a,b,msg){assert(Math.abs(a-b)<=0.01,msg+' (expected ~'+b+', got '+a+')');}

// Graph tests
{var g=new CardRelationshipGraph();assert(g.relationships.length===0,'empty graph');}
{var g=new CardRelationshipGraph();var r=g.addRelationship('c1','c2','combo',1.0,'works well');assert(r.success,'add combo');assert(g.relationships.length===1,'1 rel');}
{var g=new CardRelationshipGraph();var r=g.addRelationship('c1','c2','invalid',1.0);assertEq(r.error,'invalid_type','invalid type');}
{var g=new CardRelationshipGraph();var r=g.addRelationship('c1','c1','combo',1.0);assertEq(r.error,'self_reference','self ref');}
{var g=new CardRelationshipGraph();g.addRelationship('c1','c2','combo',1.5);var rels=g.getRelationships('c1');assertEq(rels.length,1,'1 rel for c1');assertEq(rels[0].cardId,'c2','partner c2');assertEq(rels[0].type,'combo','type combo');assertApprox(rels[0].weight,1.5,'weight');}
{var g=new CardRelationshipGraph();g.addRelationship('c1','c2','combo');g.addRelationship('c1','c3','counter');var combos=g.getComboCards('c1');assertEq(combos.length,1,'1 combo');assertEq(combos[0].cardId,'c2','combo partner');var counters=g.getCounterCards('c1');assertEq(counters.length,1,'1 counter');assertEq(counters[0].cardId,'c3','counter partner');}
{var g=new CardRelationshipGraph();g.addRelationship('c1','c2','combo');g.addRelationship('c1','c3','combo');var partners=g.getPartners('c1','combo');assertEq(partners.length,2,'2 partners');}
{var g=new CardRelationshipGraph();g.addRelationship('c1','c2','combo',0.5);g.addRelationship('c1','c3','combo',1.5);var partners=g.getPartners('c1','combo',1.0);assertEq(partners.length,1,'1 above threshold');assertEq(partners[0].cardId,'c3','only c3 above');}
{var g=new CardRelationshipGraph();g.addRelationship('c1','c2','combo');g.addRelationship('c2','c3','synergy');var stats=g.getGraphStats();assertEq(stats.total,2,'2 total');assertEq(stats.cardCount,3,'3 cards');assertEq(stats.byType.combo,1,'1 combo');assertEq(stats.byType.synergy,1,'1 synergy');}

// Registry tests
{var g=new CardRelationshipGraph();var r=new ComboRegistry(g);assert(r.getChainCount()===0,'0 chains');}
{var g=new CardRelationshipGraph();var r=new ComboRegistry(g);var cr=r.registerChain('Fire',['f1','f2','f3'],'damage');assert(cr.success,'chain reg');assertEq(cr.chainId,'chain_1','chain id');assertEq(r.getChainCount(),1,'1 chain');}
{var g=new CardRelationshipGraph();var r=new ComboRegistry(g);var cr=r.registerChain('Test',['c1'],'e');assertEq(cr.error,'min_2_cards','min 2');}
{var g=new CardRelationshipGraph();var r=new ComboRegistry(g);r.registerChain('A',['c1','c2'],'e');r.registerChain('B',['c1','c3'],'e');var ch=r.findChains('c1');assertEq(ch.length,2,'2 chains');}
{var g=new CardRelationshipGraph();var r=new ComboRegistry(g);r.registerChain('A',['c1','c2','c3'],'e');var res=r.isChainComplete('chain_1',['c1','c2','c3']);assert(res.complete,'complete');assertEq(res.remaining.length,0,'0 remaining');}
{var g=new CardRelationshipGraph();var r=new ComboRegistry(g);r.registerChain('A',['c1','c2','c3'],'e');var res=r.isChainComplete('chain_1',['c1','c2']);assert(!res.complete,'not complete');assertEq(res.remaining.length,1,'1 remaining');}
{var g=new CardRelationshipGraph();var r=new ComboRegistry(g);var res=r.isChainComplete('chain_X',[]);assertEq(res.error,'chain_not_found','not found');}
{var g=new CardRelationshipGraph();g.addRelationship('c1','c2','combo',1.5);var r=new ComboRegistry(g);var sugg=r.suggestNextCards(['c1'],3);assertEq(sugg.length,1,'1 sugg');assertEq(sugg[0].cardId,'c2','c2 sugg');}
{var g=new CardRelationshipGraph();g.addRelationship('c1','c2','combo',1.0);g.addRelationship('c1','c3','combo',2.0);var r=new ComboRegistry(g);var sugg=r.suggestNextCards(['c1'],3);assertEq(sugg.length,2,'2 suggs');assertEq(sugg[0].cardId,'c3','c3 first');}
{var g=new CardRelationshipGraph();g.addRelationship('c1','c2','combo',1.0);var r=new ComboRegistry(g);var sugg=r.suggestNextCards(['c1','c2'],3);assertEq(sugg.length,0,'no sugg played');}

// Network tests
{var n=new CardIntelligenceNetwork();assert(n.graph instanceof CardRelationshipGraph,'has graph');}
{var n=new CardIntelligenceNetwork();var r=n.recordGameplay('c1',true,{deck:'aggro'});assert(r.success,'record ok');assertEq(r.totalRecords,1,'1 record');}
{var n=new CardIntelligenceNetwork();n.recordGameplay('c1',true);n.recordGameplay('c1',false);n.recordGameplay('c1',true);var s=n.analyzeCardStrength('c1');assertApprox(s.winRate,0.667,'winRate 0.667');assertEq(s.feedbackCount,3,'3 feedbacks');}
{var n=new CardIntelligenceNetwork();var stats=n.getNetworkStats();assertEq(stats.graphStats.total,0,'0 rels');assertEq(stats.chainCount,0,'0 chains');assertEq(stats.feedbackCount,0,'0 feedback');}
{var n=new CardIntelligenceNetwork();g=new CardRelationshipGraph();g.addRelationship('c1','c2','combo',2.0);n.graph.addRelationship('c1','c2','combo',2.0);var sugg=n.suggestCard(['c1'],[],{});assert(sugg.length>0,'has sugg');}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);
