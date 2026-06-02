'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'world-seed.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'game-state.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'world-migration.js'), 'utf8'));
var ChunkLoader = window.ChunkLoader;
var WorldMigrationManager = window.WorldMigrationManager;
var WorldSeed = window.WorldSeed;
var PersistentGameState = window.PersistentGameState;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){if(a===b){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg+' (expected '+b+', got '+a+')');}}

{var seed=new WorldSeed('test',32,32).generate();var cl=new ChunkLoader(seed,16);assert(cl!==null,'chunkloader created');}
{var seed=new WorldSeed('test',32,32).generate();var cl=new ChunkLoader(seed,16);var chunk=cl.getChunk(0,0);assert(chunk!==null,'chunk loaded');assertEq(chunk.cx,0,'cx 0');assertEq(chunk.cy,0,'cy 0');}
{var seed=new WorldSeed('test',32,32).generate();var cl=new ChunkLoader(seed,16);var chunk=cl.getChunk(0,0);assert(chunk.tiles.length===16,'16 rows');assert(chunk.tiles[0].length===16,'16 cols');}
{var seed=new WorldSeed('test',32,32).generate();var cl=new ChunkLoader(seed,16);cl.getChunk(0,0);assertEq(cl.getLoadedChunkCount(),1,'1 chunk loaded');}
{var seed=new WorldSeed('test',64,64).generate();var cl=new ChunkLoader(seed,16);var c1=cl.getChunk(0,0);var c2=cl.getChunk(1,0);assertEq(cl.getLoadedChunkCount(),2,'2 chunks');}
{var seed=new WorldSeed('test',64,64).generate();var cl=new ChunkLoader(seed,16);cl.getChunk(0,0);cl.getChunk(1,0);cl.unloadChunk(0,0);assertEq(cl.getLoadedChunkCount(),1,'1 after unload');}
{var seed=new WorldSeed('test',32,32).generate();var cl=new ChunkLoader(seed,16);var r=cl.unloadChunk(99,99);assertEq(r.error,'chunk_not_loaded','not loaded error');}
{var seed=new WorldSeed('test',32,32).generate();var mgr=new WorldMigrationManager(seed,cl);assert(mgr!==null,'manager created');}
{var seed=new WorldSeed('test',32,32).generate();var mgr=new WorldMigrationManager(seed);var cp=mgr.createCheckpoint('manual');assert(cp.id.startsWith('cp_'),'checkpoint id');assertEq(cp.label,'manual','label');}
{var seed=new WorldSeed('test',32,32).generate();var mgr=new WorldMigrationManager(seed);var gs=new PersistentGameState('w1');gs.addPlayer('p1',{position:{x:10,y:20}});mgr.setWorldState(gs);var cp=mgr.createCheckpoint('test');assert(cp.state!==null,'state saved');}
{var seed=new WorldSeed('test',32,32).generate();var mgr=new WorldMigrationManager(seed);var r=mgr.startMigration('old','new','p1');assert(r.success,'migration started');assert(r.migrationId.startsWith('mig_'),'migration id');}
{var seed=new WorldSeed('test',32,32).generate();var mgr=new WorldMigrationManager(seed);var r=mgr.startMigration('old','new','p1');var adv=mgr.advanceMigration(r.migrationId,20);assertEq(adv.migration.progress,20,'progress 20');assertEq(adv.migration.phase,'planning','planning phase');}
{var seed=new WorldSeed('test',32,32).generate();var mgr=new WorldMigrationManager(seed);var r=mgr.startMigration('old','new','p1');var adv=mgr.advanceMigration(r.migrationId,40);assertEq(adv.migration.phase,'transferring','transferring phase');}
{var seed=new WorldSeed('test',32,32).generate();var mgr=new WorldMigrationManager(seed);var r=mgr.startMigration('old','new','p1');mgr.advanceMigration(r.migrationId,100);var comp=mgr.completeMigration(r.migrationId);assert(comp.success,'migration completed');assertEq(comp.migration.phase,'completed','completed');}
{var seed=new WorldSeed('test',32,32).generate();var mgr=new WorldMigrationManager(seed);var r=mgr.startMigration('old','new','p1');var mig=mgr.getMigration(r.migrationId);assertEq(mig.migrationId,r.migrationId,'same id');}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);