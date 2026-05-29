// ============================================================================
// Card Abyssal Depths — V237 Direction P
// Abyssal depths with void currents, deep pressure, and creature spawns
// nanobot distributed mesh + thunderbolt feedback pipeline
// ============================================================================
'use strict';
(function(){
function VoidCurrent(vcid,name,currentSpeed,voidDensity){this.vcid=vcid;this.name=name||vcid;this.currentSpeed=(currentSpeed!==undefined)?currentSpeed:40;this.voidDensity=(voidDensity!==undefined)?voidDensity:60;this.flowing=false;}
VoidCurrent.prototype.flow=function(){if(this.flowing)return{error:'already_flowing'};this.flowing=true;return{success:true,power:this.getCurrentPower()};};
VoidCurrent.prototype.getCurrentPower=function(){if(!this.flowing)return 0;return this.currentSpeed+this.voidDensity;};
function DeepPressure(dpid,name,depthLevel,pressureLevel){this.dpid=dpid;this.name=name||dpid;this.depthLevel=(depthLevel!==undefined)?depthLevel:50;this.pressureLevel=(pressureLevel!==undefined)?pressureLevel:30;this.compressed=false;}
DeepPressure.prototype.compress=function(){if(this.compressed)return{error:'already_compressed'};this.compressed=true;return{success:true,power:this.getPressurePower()};};
DeepPressure.prototype.getPressurePower=function(){if(!this.compressed)return 0;return this.depthLevel*2+this.pressureLevel;};
function CreatureSpawn(csid,name,spawnCount,vitality){this.csid=csid;this.name=name||csid;this.spawnCount=(spawnCount!==undefined)?spawnCount:10;this.vitality=(vitality!==undefined)?vitality:20;this.spawned=false;}
CreatureSpawn.prototype.spawn=function(){if(this.spawned)return{error:'already_spawned'};this.spawned=true;return{success:true,power:this.getSpawnPower()};};
CreatureSpawn.prototype.getSpawnPower=function(){if(!this.spawned)return 0;return this.spawnCount*this.vitality;};
function AbyssalDepths(adi,name,depthRank){this.adi=adi;this.name=name||'Abyssal Depths';this.depthRank=depthRank||1;this.currents={};this.pressures={};this.spawns={};}
AbyssalDepths.prototype.addCurrent=function(c){this.currents[c.vcid]=c;return{success:true};};
AbyssalDepths.prototype.addPressure=function(p){this.pressures[p.dpid]=p;return{success:true};};
AbyssalDepths.prototype.addSpawn=function(s){this.spawns[s.csid]=s;return{success:true};};
AbyssalDepths.prototype.getDepthPower=function(){var total=0;for(var id in this.currents)total+=this.currents[id].getCurrentPower();for(var id in this.pressures)total+=this.pressures[id].getPressurePower();for(var id in this.spawns)total+=this.spawns[id].getSpawnPower();total+=this.depthRank*15;return total;};
window.VoidCurrent=VoidCurrent;window.DeepPressure=DeepPressure;window.CreatureSpawn=CreatureSpawn;window.AbyssalDepths=AbyssalDepths;
})();