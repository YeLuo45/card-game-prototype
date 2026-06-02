'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'game-state.js'), 'utf8'));
var PersistentGameState = window.PersistentGameState;
var SaveLoadManager = window.SaveLoadManager;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){if(a===b){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg+' (expected '+b+', got '+a+')');}}

{var s=new PersistentGameState('w1');assertEq(s.worldId,'w1','world id');assertEq(Object.keys(s.playerStates).length,0,'0 players');}
{var s=new PersistentGameState('w1');var r=s.addPlayer('p1',{position:{x:10,y:20},health:80});assert(r.success,'add player success');assertEq(s.playerStates.p1.health,80,'health 80');}
{var s=new PersistentGameState('w1');s.addPlayer('p1');var r=s.updatePlayer('p1',{health:50,experience:150});assert(r.success,'update success');assertEq(s.playerStates.p1.health,50,'health 50');assertEq(s.playerStates.p1.experience,150,'exp 150');}
{var s=new PersistentGameState('w1');s.addPlayer('p1');var r=s.updatePlayer('p999',{health:50});assertEq(r.error,'player_not_found','not found');}
{var s=new PersistentGameState('w1');s.addPlayer('p1');var p=s.getPlayer('p1');assertEq(p.playerId,'p1','player id');}
{var s=new PersistentGameState('w1');s.addPlayer('p1');var r=s.removePlayer('p1');assert(r.success,'remove success');assertEq(Object.keys(s.playerStates).length,0,'0 players');}
{var s=new PersistentGameState('w1');s.addPlayer('p1');s.addWorldModification('building',{x:5,y:5},{type:'house'});var mods=s.getModificationsInRegion(5,5,10);assertEq(mods.length,1,'1 mod near');}
{var s=new PersistentGameState('w1');s.addWorldModification('tree',{x:0,y:0});s.addWorldModification('tree',{x:100,y:100});var mods=s.getModificationsInRegion(5,5,10);assertEq(mods.length,1,'1 within radius');}
{var s=new PersistentGameState('w1');var r=s.setQuestState('q1','active',25);assert(r.success,'quest set');assertEq(s.questStates.q1.progress,25,'progress 25');}
{var s=new PersistentGameState('w1');s.setQuestState('q1','active',50);var qs=s.getQuestState('q1');assertEq(qs.state,'active','active');assertEq(qs.progress,50,'50 progress');}
{var s=new PersistentGameState('w1');var r=s.setGlobalFlag('key1','value1');assert(r.success,'flag set');assertEq(s.getGlobalFlag('key1'),'value1','flag value');}
{var s=new PersistentGameState('w1');s.setGlobalFlag('key1','val');assertEq(s.getGlobalFlag('nonexistent'),null,'null for missing');}
{var s=new PersistentGameState('w1');var r=s.advanceTime(7);assertEq(r.timeOfDay,7,'time 7');assertEq(r.season,'summer','summer');}
{var s=new PersistentGameState('w1');s.advanceTime(12);var r=s.advanceTime(1);assertEq(r.season,'autumn','autumn');}
{var s=new PersistentGameState('w1');s.advanceTime(18);var r=s.advanceTime(1);assertEq(r.season,'winter','winter');}
{var s=new PersistentGameState('w1');s.advanceTime(18);var r=s.advanceTime(7);assertEq(r.season,'spring','spring');}
{var s=new PersistentGameState('w1');var ser=s.serialize();assertEq(ser.worldId,'w1','serialized world id');assert(ser.savedAt>0,'savedAt set');}
{var m=new SaveLoadManager();var gs=new PersistentGameState('w1');var r=m.save('save1',gs);assert(r.success,'save success');}
{var m=new SaveLoadManager();var gs=new PersistentGameState('w1');m.save('save1',gs);var loaded=m.load('save1');assert(loaded.success,'load success');assertEq(loaded.gameState.worldId,'w1','loaded world id');}
{var m=new SaveLoadManager();var gs=new PersistentGameState('w1');m.save('save1',gs);var r=m.deleteSave('save1');assert(r.success,'delete success');var has=m.hasSave('save1');assert(!has,'save deleted');}
{var m=new SaveLoadManager();var gs=new PersistentGameState('w1');m.save('save1',gs);var r=m.deleteSave('save999');assertEq(r.error,'save_not_found','not found');}
{var m=new SaveLoadManager();var gs=new PersistentGameState('w1');m.save('save1',gs);var list=m.listSaves();assertEq(list.length,1,'1 save');}
{var m=new SaveLoadManager();var gs=new PersistentGameState('w1');m.save('save1',gs);m.save('save2',gs);var active=m.getActiveSave();assertEq(active.saveId,'save2','save2 active');}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);