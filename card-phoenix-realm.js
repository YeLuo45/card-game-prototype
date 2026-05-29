// ============================================================================
// Card Phoenix Realm — V236 Direction O
// Phoenix realm with rebirth flames, ember cycles, and ash resurrection
// claude-code + chatdev role specialization
// ============================================================================
'use strict';
(function(){
function RebirthFlame(rfid,name,flameIntensity,resilience){this.rfid=rfid;this.name=name||rfid;this.flameIntensity=(flameIntensity!==undefined)?flameIntensity:60;this.resilience=(resilience!==undefined)?resilience:70;this.burning=false;}
RebirthFlame.prototype.ignite=function(){if(this.burning)return{error:'already_burning'};this.burning=true;return{success:true,power:this.getFlamePower()};};
RebirthFlame.prototype.getFlamePower=function(){if(!this.burning)return 0;return this.flameIntensity+this.resilience;};
function EmberCycle(ecid,name,cyclePhase,emberCount){this.ecid=ecid;this.name=name||ecid;this.cyclePhase=(cyclePhase!==undefined)?cyclePhase:1;this.emberCount=(emberCount!==undefined)?emberCount:20;this.cycled=false;}
EmberCycle.prototype.cycle=function(){if(this.cycled)return{error:'already_cycled'};this.cycled=true;this.cyclePhase++;return{success:true,phase:this.cyclePhase,power:this.getCyclePower()};};
EmberCycle.prototype.getCyclePower=function(){if(!this.cycled)return 0;return this.emberCount*this.cyclePhase;};
function AshResurrection(arid,name,phoenixEssence,rebirthPower){this.arid=arid;this.name=name||arid;this.phoenixEssence=(phoenixEssence!==undefined)?phoenixEssence:50;this.rebirthPower=(rebirthPower!==undefined)?rebirthPower:80;this.resurrected=false;}
AshResurrection.prototype.resurrect=function(){if(this.resurrected)return{error:'already_resurrected'};this.resurrected=true;return{success:true,power:this.getResurrectionPower()};};
AshResurrection.prototype.getResurrectionPower=function(){if(!this.resurrected)return 0;return this.phoenixEssence+this.rebirthPower;};
function PhoenixRealm(prid,name,realmRank){this.prid=prid;this.name=name||'Phoenix Realm';this.realmRank=realmRank||1;this.flames={};this.cycles={};this.resurrections={};}
PhoenixRealm.prototype.addFlame=function(f){this.flames[f.rfid]=f;return{success:true};};
PhoenixRealm.prototype.addCycle=function(c){this.cycles[c.ecid]=c;return{success:true};};
PhoenixRealm.prototype.addResurrection=function(r){this.resurrections[r.arid]=r;return{success:true};};
PhoenixRealm.prototype.getRealmPower=function(){var total=0;for(var id in this.flames)total+=this.flames[id].getFlamePower();for(var id in this.cycles)total+=this.cycles[id].getCyclePower();for(var id in this.resurrections)total+=this.resurrections[id].getResurrectionPower();total+=this.realmRank*20;return total;};
window.RebirthFlame=RebirthFlame;window.EmberCycle=EmberCycle;window.AshResurrection=AshResurrection;window.PhoenixRealm=PhoenixRealm;
})();