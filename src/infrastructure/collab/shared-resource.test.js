'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'shared-resource.js'), 'utf8'));
var ResourceType = window.ResourceType;
var SharedResourceManager = window.SharedResourceManager;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){assert(a===b,msg+' (expected '+b+', got '+a+')');}

{var m=new SharedResourceManager();assertEq(Object.keys(m.pools).length,4,'4 resource pools');}
{var m=new SharedResourceManager();var hp=m.pools[ResourceType.HEALTH_PACK];assertEq(hp.capacity,3,'3 health packs capacity');assertEq(hp.available,3,'3 available');}
{var m=new SharedResourceManager();var r=m.acquire('s1','p1',ResourceType.HEALTH_PACK);assert(r.success,'acquire success');assertEq(r.available,2,'2 available after');}
{var m=new SharedResourceManager();var r=m.acquire('s1','p1',ResourceType.HEALTH_PACK);assert(r.success,'acquire p1');var r2=m.acquire('s1','p2',ResourceType.HEALTH_PACK);assert(r2.success,'acquire p2');var r3=m.acquire('s1','p3',ResourceType.HEALTH_PACK);assert(r3.success,'acquire p3');var r4=m.acquire('s1','p4',ResourceType.HEALTH_PACK);assertEq(r4.error,'resource_depleted','depleted');}
{var m=new SharedResourceManager();var r=m.acquire('s1','p1',ResourceType.HEALTH_PACK);var r2=m.acquire('s1','p1',ResourceType.HEALTH_PACK);assertEq(r2.error,'already_locked','already locked');}
{var m=new SharedResourceManager();var r=m.acquire('s1','p1',ResourceType.HEALTH_PACK);var rel=m.release(r.lockKey);assert(rel.success,'release success');var stat=m.getResourceStatus('s1',ResourceType.HEALTH_PACK);assertEq(stat.available,3,'3 available after release');}
{var m=new SharedResourceManager();var r=m.release('invalid_key');assertEq(r.error,'lock_not_found','lock not found');}
{var m=new SharedResourceManager();m.acquire('s1','p1',ResourceType.HEALTH_PACK);m.acquire('s1','p2',ResourceType.SHIELD_CHARGE);var sr=m.getSessionResources('s1');assertEq(sr[ResourceType.HEALTH_PACK].available,2,'2 health pack available');assertEq(sr[ResourceType.SHIELD_CHARGE].available,3,'3 shield available');}
{var m=new SharedResourceManager();m.acquire('s1','p1',ResourceType.HEALTH_PACK);var stat=m.getResourceStatus('s1',ResourceType.HEALTH_PACK);assertEq(stat.lockedBy.length,1,'1 locked');assertEq(stat.lockedBy[0],'p1','locked by p1');}
{var m=new SharedResourceManager();assert(m.isAvailable(ResourceType.HEALTH_PACK),'health pack available');m.acquire('s1','p1',ResourceType.HEALTH_PACK);m.acquire('s1','p2',ResourceType.HEALTH_PACK);m.acquire('s1','p3',ResourceType.HEALTH_PACK);assert(!m.isAvailable(ResourceType.HEALTH_PACK),'not available after 3');}
{var m=new SharedResourceManager();var r=m.respawnResources();assertEq(r.respawned,0,'nothing respawned');}
{var m=new SharedResourceManager();var inv=m.acquire('s1','p1','invalid');assertEq(inv.error,'invalid_resource_type','invalid type');}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);
