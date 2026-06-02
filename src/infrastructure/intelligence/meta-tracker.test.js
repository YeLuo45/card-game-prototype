'use strict';
var fs = require('fs'), path = require('path');
global.localStorage = { getItem: function(k){return null;}, setItem: function(k,v){}, removeItem: function(k){}, clear: function(){} };
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'meta-tracker.js'), 'utf8'));
var MetaGameTracker = window.MetaGameTracker;
var OfflinePersistenceLayer = window.OfflinePersistenceLayer;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){assert(a===b,msg+' (expected '+b+', got '+a+')');}
function assertApprox(a,b,msg){assert(Math.abs(a-b)<=0.01,msg+' (expected ~'+b+', got '+a+')');}

{var t=new MetaGameTracker();assertEq(t.globalStats.totalMatches,0,'0 matches');}
{var t=new MetaGameTracker();var r=t.recordGlobalMatch('aggro','control','win');assert(r.success,'record success');assertEq(t.globalStats.totalMatches,1,'1 match');}
{var t=new MetaGameTracker();for(var i=0;i<10;i++)t.recordGlobalMatch('t1','ctrl','win');var tier=t.getDeckTier('t1');assertEq(tier.tier,'S','tier S at 100%');}
{var t=new MetaGameTracker();for(var i=0;i<10;i++)t.recordGlobalMatch('t2','ctrl','loss');var tier=t.getDeckTier('t2');assertEq(tier.tier,'C','tier C at 0%');}
{var t=new MetaGameTracker();for(var i=0;i<7;i++)t.recordGlobalMatch('t3','ctrl','win');for(var j=0;j<3;j++)t.recordGlobalMatch('t3','ctrl','loss');var tier=t.getDeckTier('t3');assertEq(tier.tier,'S','tier S at 70%');}
{var t=new MetaGameTracker();for(var i=0;i<5;i++)t.recordGlobalMatch('t4','ctrl','win');for(var j=0;j<5;j++)t.recordGlobalMatch('t4','ctrl','loss');var tier=t.getDeckTier('t4');assertEq(tier.tier,'A','tier A at 50%');}
{var t=new MetaGameTracker();t.recordGlobalMatch('aggro','control','win');var snap=t.getMetaSnapshot();assertEq(typeof snap,'object','snapshot object');}
{var t=new MetaGameTracker();t.recordGlobalMatch('aggro','control','win');var trend=t.getTrend(5);assert(Array.isArray(trend),'trend is array');}
{var p=new OfflinePersistenceLayer('test');var r=p.set('key1','value1');assert(r.success,'set success');assertEq(p.get('key1'),'value1','get value');}
{var p=new OfflinePersistenceLayer('test2');p.set('k','v');p.clear();assertEq(p.get('k'),undefined,'cleared');}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);
