'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'world-seed.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'game-state.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'event-bus.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'world-migration.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'world-index.js'), 'utf8'));
var PersistentWorld = window.PersistentWorld;
var WorldSeed = window.WorldSeed;
var PersistentGameState = window.PersistentGameState;
var WorldEvent = window.WorldEvent;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){if(a===b){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg+' (expected '+b+', got '+a+')');}}

{var seed=new WorldSeed('w1',32,32).generate();var pw=new PersistentWorld(seed);assert(pw!==null,'pw created');}
{var seed=new WorldSeed('w1',32,32).generate();var pw=new PersistentWorld(seed);var r=pw.addPlayer('p1',{position:{x:10,y:20},health:100});assert(r.success,'player added');}
{var seed=new WorldSeed('w1',32,32).generate();var pw=new PersistentWorld(seed);pw.addPlayer('p1');var r=pw.updatePlayer('p1',{health:80});assert(r.success,'player updated');assertEq(pw.gameState.playerStates.p1.health,80,'health 80');}
{var seed=new WorldSeed('w1',32,32).generate();var pw=new PersistentWorld(seed);pw.addPlayer('p1');var p=pw.getPlayer('p1');assertEq(p.playerId,'p1','player id');}
{var seed=new WorldSeed('w1',32,32).generate();var pw=new PersistentWorld(seed);var tile=pw.getWorldTile(5,5);assert(tile!==null,'tile not null');}
{var seed=new WorldSeed('w1',32,32).generate();var pw=new PersistentWorld(seed);var chunk=pw.getChunk(0,0);assert(chunk!==null,'chunk loaded');}
{var seed=new WorldSeed('w1',32,32).generate();var pw=new PersistentWorld(seed);var delivered=0;pw.subscribe('test',function(){delivered++;},'h1');pw.publishEvent('test',{});pw.tick();assertEq(delivered,1,'1 event delivered');}
{var seed=new WorldSeed('w1',32,32).generate();var pw=new PersistentWorld(seed);pw.addPlayer('p1');var r=pw.createCheckpoint('manual');assert(r.id.startsWith('cp_'),'checkpoint created');}
{var seed=new WorldSeed('w1',32,32).generate();var pw=new PersistentWorld(seed);pw.addPlayer('p1',{position:{x:5,y:5}});var save=pw.save('save1');assert(save.success,'save success');}
{var seed=new WorldSeed('w1',32,32).generate();var pw=new PersistentWorld(seed);pw.addPlayer('p1',{position:{x:5,y:5}});pw.save('save1');pw.gameState.playerStates={};var r=pw.load('save1');assertEq(Object.keys(pw.gameState.playerStates).length,1,'player restored');}
{var seed=new WorldSeed('w1',32,32).generate();var pw=new PersistentWorld(seed);pw.addPlayer('p1');var stats=pw.getStatistics();assertEq(stats.worldId,'w1','world id');assert(stats.playerCount>=1,'player count');}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);