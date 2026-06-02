'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'role-system.js'), 'utf8'));
var RoleSystem = window.RoleSystem;
var RoleAssignmentEngine = window.RoleAssignmentEngine;
var PLAYER_ROLES = window.PLAYER_ROLES;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){assert(a===b,msg+' (expected '+b+', got '+a+')');}
function assertApprox(a,b,msg){assert(Math.abs(a-b)<=0.01,msg+' (expected ~'+b+', got '+a+')');}

{var r=new RoleSystem();assertEq(r.roles.length,5,'5 roles');}
{var r=new RoleSystem();var def=r.getRoleDefinition('tank');assert(def!==null,'tank def not null');assertEq(def.healthBonus,1.5,'tank health bonus');}
{var r=new RoleSystem();var def=r.getRoleDefinition('dps');assertEq(def.damageMultiplier,1.5,'dps damage multiplier');}
{var r=new RoleSystem();var def=r.getRoleDefinition('support');assert(def.canRevive===true,'support can revive');}
{var r=new RoleSystem();var def=r.getRoleDefinition('controller');assertEq(def.crowdControlBonus,1.5,'controller CC bonus');}
{var r=new RoleSystem();var def=r.getRoleDefinition('flex');assertEq(def.damageMultiplier,1.1,'flex damage mult');}
{var r=new RoleSystem();var compat=r.getCompatibleRoles('aggro');assert(compat.indexOf('dps')!==-1,'aggro has dps');assert(compat.indexOf('tank')!==-1,'aggro has tank');}
{var r=new RoleSystem();var compat=r.getCompatibleRoles('control');assert(compat.indexOf('support')!==-1,'control has support');}
{var r=new RoleSystem();var all=r.getAllRoles();assertEq(all.length,5,'5 all roles');}

{var e=new RoleAssignmentEngine();var sugg=e.suggestRole('p1','aggro',[]);assert(sugg.playerId==='p1','player id');assert(sugg.suggestedRole!==null,'has suggested role');}
{var e=new RoleAssignmentEngine();var sugg=e.suggestRole('p1','aggro',[]);assertEq(typeof sugg.suggestedRole,'string','role is string');assert(Array.isArray(sugg.alternatives),'alternatives is array');}
{var e=new RoleAssignmentEngine();var sugg=e.suggestRole('p1','aggro',[{playerId:'p2',role:'dps'}]);assert(sugg.suggestedRole!=='dps','not dps when taken');}
{var e=new RoleAssignmentEngine();var r=e.assignRole('s1','p1','tank');assert(r.success,'assign success');assertEq(r.role,'tank','role is tank');}
{var e=new RoleAssignmentEngine();e.assignRole('s1','p1','tank');var pr=e.getPlayerRole('s1','p1');assertEq(pr,'tank','player role tank');}
{var e=new RoleAssignmentEngine();e.assignRole('s1','p1','dps');var pr=e.getPlayerRole('s1','p2');assertEq(pr,null,'null for unknown player');}
{var e=new RoleAssignmentEngine();e.assignRole('s1','p1','tank');e.assignRole('s1','p2','dps');var comp=e.getTeamComposition('s1');assertEq(comp.tank.length,1,'1 tank');assertEq(comp.dps.length,1,'1 dps');}
{var e=new RoleAssignmentEngine();e.assignRole('s1','p1','tank');e.assignRole('s1','p2','dps');var balanced=e.isBalancedTeam('s1');assert(balanced,'balanced with 2 roles');}
{var e=new RoleAssignmentEngine();e.assignRole('s1','p1','tank');var hist=e.assignmentHistory;assertEq(hist.length,1,'1 history entry');}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);
