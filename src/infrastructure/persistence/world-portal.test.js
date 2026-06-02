'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'world-portal.js'), 'utf8'));
var WorldPortal = window.WorldPortal;
var InterWorldBridge = window.InterWorldBridge;
var PortalState = window.PortalState;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){if(a===b){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg+' (expected '+b+', got '+a+')');}}

{var p=new WorldPortal('p1','w1','w2',{x:10,y:20});assertEq(p.portalId,'p1','portal id');assertEq(p.state,PortalState.INACTIVE,'inactive');}
{var p=new WorldPortal('p1','w1','w2');var r=p.activate();assert(r.success,'activate success');assertEq(p.state,PortalState.ACTIVE,'active after activate');}
{var p=new WorldPortal('p1','w1','w2');p.activate();var r=p.activate();assertEq(r.error,'already_active','already active error');}
{var p=new WorldPortal('p1','w1','w2');p.activate();var r=p.deactivate();assert(r.success,'deactivate success');assertEq(p.state,PortalState.INACTIVE,'inactive');}
{var p=new WorldPortal('p1','w1','w2',{},1000);p.activate();p.startCooldown();assertEq(p.state,PortalState.COOLDOWN,'in cooldown');}
{var p=new WorldPortal('p1','w1','w2',{},1000);p.activate();p.startCooldown();var r=p.checkCooldown();assert(r.inCooldown===true,'in cooldown');}
{var p=new WorldPortal('p1','w1','w2',{},1000);p.startCooldown();p.cooldownUntil=Date.now()-1;var r=p.checkCooldown();assert(r.inCooldown===false,'not in cooldown after expiry');}
{var p=new WorldPortal('p1','w1','w2');var r=p.linkTo('p2');assert(r.success,'link success');assertEq(p.linkedPortalId,'p2','linked to p2');}
{var b=new InterWorldBridge('b1');assertEq(b.bridgeId,'b1','bridge id');}
{var b=new InterWorldBridge('b1');var p=new WorldPortal('p1','w1','w2');var r=b.registerPortal(p);assert(r.success,'portal registered');assertEq(r.registeredPortals,1,'1 portal');}
{var b=new InterWorldBridge('b1');var p1=new WorldPortal('p1','w1','w2');var p2=new WorldPortal('p2','w2','w1');b.registerPortal(p1);b.registerPortal(p2);var portals=b.getPortalsForWorld('w1');assertEq(portals.length,1,'1 portal for w1');}
{var b=new InterWorldBridge('b1');var p1=new WorldPortal('p1','w1','w2');b.registerPortal(p1);p1.activate();var r=b.initiateTransition('player1','p1','p2');assert(r.success,'transition started');assert(r.transitionId.startsWith('trans_'),'transition id');}
{var b=new InterWorldBridge('b1');var p1=new WorldPortal('p1','w1','w2');var p2=new WorldPortal('p2','w2','w1');b.registerPortal(p1);b.registerPortal(p2);p1.activate();var r=b.initiateTransition('player1','p1','p2');var adv=b.advanceTransition(r.transitionId,50);assertEq(adv.transition.progress,50,'progress 50');}
{var b=new InterWorldBridge('b1');var p1=new WorldPortal('p1','w1','w2');var p2=new WorldPortal('p2','w2','w1');b.registerPortal(p1);b.registerPortal(p2);p1.activate();var r=b.initiateTransition('player1','p1','p2');var comp=b.completeTransition(r.transitionId);assert(comp.success,'completed');assertEq(comp.transition.phase,'completed','completed phase');}
{var b=new InterWorldBridge('b1');var p1=new WorldPortal('p1','w1','w2');var p2=new WorldPortal('p2','w2','w1');b.registerPortal(p1);b.registerPortal(p2);p1.activate();var r=b.initiateTransition('player1','p1','p2');var count=b.getActiveTransitionCount();assertEq(count,1,'1 active transition');}
{var b=new InterWorldBridge('b1');var p1=new WorldPortal('p1','w1','w2');var p2=new WorldPortal('p2','w2','w1');b.registerPortal(p1);b.registerPortal(p2);p1.activate();var r=b.initiateTransition('player1','p1','p2');b.completeTransition(r.transitionId);var hist=b.getTransitionHistory();assertEq(hist.length,1,'1 history');}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);