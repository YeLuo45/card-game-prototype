'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'collab-broadcast.js'), 'utf8'));
var BroadcastChannel = window.BroadcastChannel;
var TurnNotificationSystem = window.TurnNotificationSystem;
var CollabBroadcastManager = window.CollabBroadcastManager;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){assert(a===b,msg+' (expected '+b+', got '+a+')');}
function assertApprox(a,b,msg){assert(Math.abs(a-b)<=0.01,msg+' (expected ~'+b+', got '+a+')');}

{var m=new CollabBroadcastManager();var ch=m.getOrCreateChannel('s1',null);assert(ch!==null,'channel created');assertEq(ch.sessionId,'s1','session id');}
{var m=new CollabBroadcastManager();var ch1=m.getOrCreateChannel('s1',null);var ch2=m.getOrCreateChannel('s1',null);assert(ch1===ch2,'same channel');}
{var m=new CollabBroadcastManager();var ch=m.getOrCreateChannel('s1',null);var r=ch.subscribe('p1',function(){});assert(r.success,'subscribe success');assertEq(r.listenerCount,1,'1 listener');}
{var m=new CollabBroadcastManager();var ch=m.getOrCreateChannel('s1',null);var r=ch.subscribe('p1',function(){});var r2=ch.unsubscribe(r.subscriptionId);assert(r2.success,'unsubscribe success');assertEq(r2.listenerCount,0,'0 listeners');}
{var m=new CollabBroadcastManager();var ch=m.getOrCreateChannel('s1',null);var delivered=0;ch.subscribe('p1',function(msg){delivered++;});var r=ch.broadcast('test_event',{data:'hello'},null);assertEq(r.deliveredCount,1,'1 delivered');assertEq(r.totalListeners,1,'1 total');}
{var m=new CollabBroadcastManager();var ch=m.getOrCreateChannel('s1',null);var delivered=0;ch.subscribe('p1',function(msg){delivered++;});var r=ch.broadcast('test',{data:'x'},'p1');assertEq(r.deliveredCount,0,'0 delivered to excluded');}
{var m=new CollabBroadcastManager();var ch=m.getOrCreateChannel('s1',null);var listeners=ch.getListeners();assertEq(listeners.length,0,'0 listeners initially');ch.subscribe('p1',function(){});ch.subscribe('p2',function(){});assertEq(ch.getListeners().length,2,'2 listeners');}
{var m=new CollabBroadcastManager();var ch=m.getOrCreateChannel('s1',null);ch.subscribe('p1',function(){});ch.subscribe('p2',function(){});var r=ch.broadcast('test',{},null);assertEq(r.broadcastId.indexOf('bc_'),0,'has broadcast id');}
{var m=new CollabBroadcastManager();var ch=m.getOrCreateChannel('s1',null);var r=ch.unsubscribe('invalid');assertEq(r.error,'subscription_not_found','not found');}
{var m=new CollabBroadcastManager();m.getOrCreateChannel('s1',null);var ns=m.getNotificationSystem('s1');var r=ns.notifyTurnStart('s1','p1',1);assertEq(r.deliveredCount,0,'0 without listeners');}
{var m=new CollabBroadcastManager();var ch=m.getOrCreateChannel('s1',null);ch.subscribe('p1',function(){});var ns=m.getNotificationSystem('s1');var r=ns.notifyTurnStart('s1','p1',1);assertEq(r.deliveredCount,1,'1 delivered');}
{var m=new CollabBroadcastManager();var ch=m.getOrCreateChannel('s1',null);ch.subscribe('p1',function(){});var ns=m.getNotificationSystem('s1');ns.notifyTurnStart('s1','p1',1);ns.notifyTurnEnd('s1','p1',1,'attack');var hist=ns.getNotificationHistory('s1');assertEq(hist.length,2,'2 history entries');}
{var m=new CollabBroadcastManager();var ch=m.getOrCreateChannel('s1',null);ch.subscribe('p1',function(){});var ns=m.getNotificationSystem('s1');ns.notifyPhaseChange('s1','combat',{round:2});var r=ns.notifyGameEnd('s1','victory',['p1','p2']);assertEq(r.deliveredCount,1,'1 delivered game end');}
{var m=new CollabBroadcastManager();m.getOrCreateChannel('s1',null);var ns=m.getNotificationSystem('s1');var r=ns.getNotificationHistory('s999');assertEq(r.length,0,'empty for unknown session');}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);
