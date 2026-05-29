// ============================================================================
// Card Shadow Conclave — V240 Direction S
// Shadow conclave with dark pacts, void seals, and nightmare rituals
// nanobot distributed + generic-agent autonomous
// ============================================================================
'use strict';
(function(){
function DarkPact(dpid,name,pactStrength,soulBinding){this.dpid=dpid;this.name=name||dpid;this.pactStrength=(pactStrength!==undefined)?pactStrength:50;this.soulBinding=(soulBinding!==undefined)?soulBinding:40;this.sealed=false;}
DarkPact.prototype.seal=function(){if(this.sealed)return{error:'already_sealed'};this.sealed=true;return{success:true,power:this.getPactPower()};};
DarkPact.prototype.getPactPower=function(){if(!this.sealed)return 0;return this.pactStrength+this.soulBinding;};
function VoidSeal(vsid,name,sealDensity,voidTouch){this.vsid=vsid;this.name=name||vsid;this.sealDensity=(sealDensity!==undefined)?sealDensity:60;this.voidTouch=(voidTouch!==undefined)?voidTouch:30;this.activated=false;}
VoidSeal.prototype.activate=function(){if(this.activated)return{error:'already_activated'};this.activated=true;return{success:true,power:this.getSealPower()};};
VoidSeal.prototype.getSealPower=function(){if(!this.activated)return 0;return this.sealDensity+this.voidTouch;};
function NightmareRitual(nrid,name,ritualIntensity,darkWhispers){this.nrid=nrid;this.name=name||nrid;this.ritualIntensity=(ritualIntensity!==undefined)?ritualIntensity:40;this.darkWhispers=(darkWhispers!==undefined)?darkWhispers:50;this.performed=false;}
NightmareRitual.prototype.perform=function(){if(this.performed)return{error:'already_performed'};this.performed=true;return{success:true,power:this.getRitualPower()};};
NightmareRitual.prototype.getRitualPower=function(){if(!this.performed)return 0;return this.ritualIntensity*2+this.darkWhispers;};
function ShadowConclave(scid,name,conclaveRank){this.scid=scid;this.name=name||'Shadow Conclave';this.conclaveRank=conclaveRank||1;this.pacts={};this.seals={};this.rituals={};}
ShadowConclave.prototype.addPact=function(p){this.pacts[p.dpid]=p;return{success:true};};
ShadowConclave.prototype.addSeal=function(s){this.seals[s.vsid]=s;return{success:true};};
ShadowConclave.prototype.addRitual=function(r){this.rituals[r.nrid]=r;return{success:true};};
ShadowConclave.prototype.getConclavePower=function(){var total=0;for(var id in this.pacts)total+=this.pacts[id].getPactPower();for(var id in this.seals)total+=this.seals[id].getSealPower();for(var id in this.rituals)total+=this.rituals[id].getRitualPower();total+=this.conclaveRank*20;return total;};
window.DarkPact=DarkPact;window.VoidSeal=VoidSeal;window.NightmareRitual=NightmareRitual;window.ShadowConclave=ShadowConclave;
})();