'use strict';
var fs=require('fs'),path=require('path');
if(typeof localStorage!=='undefined')localStorage.clear();
var mockStorage={};
global.localStorage={getItem:function(k){return mockStorage[k]||null;},setItem:function(k,v){mockStorage[k]=v;},removeItem:function(k){delete mockStorage[k];},clear:function(){mockStorage={};}};
global.window=global;
eval(fs.readFileSync(path.join(__dirname,'ethereal-sanctum.js'),'utf8'));
var EtherealChannel=window.EtherealChannel,PhantomResonance=window.PhantomResonance,SpiritGate=window.SpiritGate,EtherealSanctum=window.EtherealSanctum;
var passed=0,failed=0;
function assert(c,msg){if(c){passed++;console.log('  ✓ '+msg);}else{failed++;console.log('  ✗ FAIL: '+msg);}}
function assertEq(a,b,msg){assert(a===b,msg+' (expected '+b+', got '+a+')');}
{var c=new EtherealChannel('ch1','W',70,60);assertEq(c.channelId,'ch1','id');assertEq(c.resonance,70,'70 resonance');assertEq(c.clarity,60,'60 clarity');assert(!c.active,'not active');}
{var c=new EtherealChannel('ch1','W',60,50);var r=c.activate();assert(r.success,'activate success');assert(c.active,'active');var r2=c.activate();assertEq(r2.error,'already_active','already_active');}
{var c=new EtherealChannel('ch1','W',60,50);assertEq(c.getChannelPower(),0,'0 not active');c.active=true;c.spectralGain=30;assertEq(c.getChannelPower(),120,'120 power');}
{var c=new EtherealChannel('ch1','W',50,40);c.active=true;var r=c.deactivate();assert(r.success,'deactivate success');assert(!c.active,'not active');assertEq(r.lost,0,'0 lost');}
{var p=new PhantomResonance('p1','W',80,60);assertEq(p.phantomId,'p1','id');assertEq(p.haunting,80,'80 haunting');assertEq(p.stability,60,'60 stability');assert(!p.bound,'not bound');}
{var p=new PhantomResonance('p1','W',70,50);var r=p.bind();assert(r.success,'bind success');assert(p.bound,'bound');var r2=p.bind();assertEq(r2.error,'already_bound','already_bound');}
{var p=new PhantomResonance('p1','W',70,50);assertEq(p.getPhantomPower(),0,'0 not bound');p.bound=true;p.echoBoost=40;assertEq(p.getPhantomPower(),130,'130 power');}
{var p=new PhantomResonance('p1','W',60,40);p.bound=true;var r=p.unbind();assert(r.success,'unbind success');assert(!p.bound,'not bound');assertEq(r.lost,0,'0 lost');}
{var g=new SpiritGate('g1','W',70,80);assertEq(g.gateId,'g1','id');assertEq(g.spectral,70,'70 spectral');assertEq(g.ethereal,80,'80 ethereal');assert(!g.open,'not open');}
{var g=new SpiritGate('g1','W',80,60);var r=g.openGate();assert(r.success,'open success');assert(g.open,'open');assertEq(g.dimension,'spectral','spectral dimension');var r2=g.openGate();assertEq(r2.error,'already_open','already_open');}
{var g=new SpiritGate('g1','W',60,80);var r=g.openGate();assert(r.success,'open success');assertEq(g.dimension,'ethereal','ethereal dimension');}
{var g=new SpiritGate('g1','W',70,60);assertEq(g.getGatePower(),0,'0 not open');g.open=true;g.dimension='spectral';assertEq(g.getGatePower(),169,'169 spectral power');}
{var g=new SpiritGate('g1','W',60,70);g.open=true;g.dimension='ethereal';assertEq(g.getGatePower(),143,'143 ethereal power');}
{var g=new SpiritGate('g1','W',60,50);g.open=true;var r=g.closeGate();assert(r.success,'close success');assert(!g.open,'not open');}
{var es=new EtherealSanctum('es1','W',4,5,3);assertEq(es.sanctumId,'es1','id');assertEq(es.channelLevel,4,'4 channel');assertEq(es.phantomLevel,5,'5 phantom');assertEq(es.gateLevel,3,'3 gate');assertEq(es.blessing,0,'0 blessing');}
{var es=new EtherealSanctum('es1','W',4,5,3);var r=es.advanceStage(3);assertEq(r.gained,1,'gained 1');assertEq(r.channel,5,'channel 5');assertEq(r.phantom,5,'phantom stays 5');assertEq(r.gate,3,'gate stays 3');}
{var es2=new EtherealSanctum('es1','W',5,6,4);var r2=es2.advanceStage(3);assertEq(r2.gained,1,'gained 1 at 3');assertEq(r2.channel,6,'channel 6');}
{var es3=new EtherealSanctum('es1','W',5,6,4);var r3=es3.advanceStage(5);assertEq(r3.gained,1,'gained 1 at 5');assertEq(r3.phantom,7,'phantom 7');}
{var es4=new EtherealSanctum('es1','W',5,6,4);var r4=es4.advanceStage(8);assertEq(r4.gained,1,'gained 1 at 8');assertEq(r4.gate,5,'gate 5');}
{var es=new EtherealSanctum('es1','W',5,6,4);es.blessing=80;var power=es.getSanctumPower();assertEq(power,100,'100 power');}
{var es=new EtherealSanctum('es1','W',10,10,10);es.blessing=100;assertEq(es.getSanctumPower(),150,'150 power');}
{var es=new EtherealSanctum('es1','W',8,7,6);var r=es.setBlessing(200);assertEq(r.blessing,200,'200 blessing capped');var r2=es.setBlessing(-50);assertEq(r2.blessing,0,'0 blessing floored');}
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed+failed) + ' = ' + (passed*100/(passed+failed)).toFixed(1) + '%');
console.log('Threshold 95%: ' + (passed/(passed+failed) >= 0.95 ? 'PASS ✓' : 'FAIL ✗'));
if (failed > 0) process.exit(1);