'use strict';
var fs = require('fs'), path = require('path');
global.localStorage = { getItem: function(k){return null;}, setItem: function(k,v){}, removeItem: function(k){}, clear: function(){} };
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'card-intelligence.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'opponent-model.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'strategy-engine.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'deck-correlation.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'meta-tracker.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'balance-advisor.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8'));
var CardIntelligenceIndex = window.CardIntelligenceIndex;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){assert(a===b,msg+' (expected '+b+', got '+a+')');}

{var idx=new CardIntelligenceIndex();assert(!idx.initialized,'not init initially');}
{var idx=new CardIntelligenceIndex();var r=idx.initialize('test');assert(r.success,'init success');assert(idx.initialized,'initialized');assert(idx.graph instanceof window.CardRelationshipGraph,'has graph');assert(idx.network instanceof window.CardIntelligenceNetwork,'has network');}
{var idx=new CardIntelligenceIndex();idx.initialize('test');var stats=idx.getStats();assertEq(typeof stats,'object','stats object');assert(typeof stats.graph==='object','graph stats');}
{var idx=new CardIntelligenceIndex();idx.initialize('test');idx.graph.addRelationship('c1','c2','combo',1.5);var r=idx.exportData();assert(r.success,'export success');}
{var idx=new CardIntelligenceIndex();idx.initialize('test');idx.graph.addRelationship('c1','c2','combo',1.5);idx.exportData();var r2=idx.importData('intel_export');assert(r2.success,'import success');}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);
