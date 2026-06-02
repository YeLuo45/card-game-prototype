'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'world-seed.js'), 'utf8'));
var TerrainType = window.TerrainType;
var ResourceNode = window.ResourceNode;
var WorldSeed = window.WorldSeed;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){assert(a===b,msg+' (expected '+b+', got '+a+')');}
function assertApprox(a,b,msg){assert(Math.abs(a-b)<=0.01,msg+' (expected ~'+b+', got '+a+')');}

{var r=new WorldSeed('test_world', 32, 32);assertEq(r.seedId,'test_world','seed id');assertEq(r.width,32,'width');assertEq(r.height,32,'height');}
{var r=new WorldSeed('abc123');var g=r.generate();assert(r.tileCount>0,'tile count > 0');assert(r.generated===true,'generated flag set');}
{var r=new WorldSeed('test',16,16).generate();var tile=r.getTile(5,5);assert(tile!==null,'tile not null');assert(tile.terrain!==undefined,'has terrain');}
{var r=new WorldSeed('test',16,16).generate();var tile=r.getTile(-1,5);assertEq(tile,null,'null for out of bounds');var tile2=r.getTile(5,-1);assertEq(tile2,null,'null for negative');}
{var r=new WorldSeed('test',16,16).generate();var spawns=r.getSpawnPoints();assert(spawns.length>=2,'at least 2 spawns');}
{var r=new WorldSeed('test',16,16).generate();var pois=r.getPOIs();assert(pois.length===10,'10 POIs');}
{var r=new WorldSeed('test',16,16).generate();var nodes=r.resourceNodes;assert(nodes.length===50,'50 resource nodes');}
{var r=new WorldSeed('seed1',16,16).generate();var t1=r.getTerrain();var r2=new WorldSeed('seed1',16,16).generate();var t2=r2.getTerrain();var same=true;for(var y=0;y<16;y++)for(var x=0;x<16;x++)if(t1[y][x].terrain!==t2[y][x].terrain){same=false;break;}
assert(same,'same seed same terrain');}
{var r=new WorldSeed('seed1',16,16).generate();var r2=new WorldSeed('seed2',16,16).generate();var t1=r.getTerrain();var t2=r2.getTerrain();var diff=false;for(var y=0;y<16;y++)for(var x=0;x<16;x++)if(t1[y][x].terrain!==t2[y][x].terrain){diff=true;break;}
assert(diff,'different seeds different terrain');}
{var node=new ResourceNode('n1','wood',100,{x:5,y:5});assertEq(node.id,'n1','node id');assertEq(node.resourceType,'wood','wood type');assertEq(node.quantity,100,'100 quantity');assertEq(node.depleted,false,'not depleted');}
{var node=new ResourceNode('n1','wood',100,{x:5,y:5});var r=node.harvest(30);assertEq(r.extracted,30,'extracted 30');assertEq(r.remaining,70,'70 remaining');assertEq(node.quantity,70,'quantity is 70');}
{var node=new ResourceNode('n1','stone',50,{x:5,y:5});var r=node.harvest(100);assertEq(r.extracted,50,'extracted all 50');assertEq(r.remaining,0,'0 remaining');assert(node.depleted===true,'depleted');}
{var node=new ResourceNode('n1','wood',100,{x:5,y:5});node.harvest(100);assert(node.depleted===true,'depleted after full harvest');var r2=node.harvest(10);assertEq(r2.error,'node_depleted','error when depleted');}
{var node=new ResourceNode('n1','wood',100,{x:5,y:5});node.harvest(50);node.checkRespawn();assert(node.depleted===false,'not depleted');}
{var node=new ResourceNode('n1','gold',100,{x:5,y:5});node.harvest(100);var res=node.checkRespawn();assert(res.respawned===false||typeof res.timeRemaining==='number','not respawned or time remaining');}
{var r=new WorldSeed('test',32,32).generate();var near=r.getResourceNodesNear(16,16,50);assert(Array.isArray(near),'returns array');}
{var r=new WorldSeed('test',16,16).generate();var t=r.getTerrain();var count=0;for(var y=0;y<16;y++)for(var x=0;x<16;x++){var tile=t[y][x];if(tile.terrain===TerrainType.PLAINS||tile.terrain===TerrainType.FOREST||tile.terrain===TerrainType.MOUNTAIN||tile.terrain===TerrainType.WATER)count++;}
assert(count>0,'has valid terrain types');}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);