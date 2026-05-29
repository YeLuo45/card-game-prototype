// ============================================================================
// Card Celestial Citadel — V238 Direction Q
// Celestial citadel with sky gates, astral winds, and star forges
// ruflo hierarchical + generic-agent autonomous
// ============================================================================
'use strict';
(function(){
function SkyGate(sgid,name,gateSize,astralFlow){this.sgid=sgid;this.name=name||sgid;this.gateSize=(gateSize!==undefined)?gateSize:50;this.astralFlow=(astralFlow!==undefined)?astralFlow:40;this.open=false;}
SkyGate.prototype.openGate=function(){if(this.open)return{error:'already_open'};this.open=true;return{success:true,power:this.getGatePower()};};
SkyGate.prototype.getGatePower=function(){if(!this.open)return 0;return this.gateSize+this.astralFlow;};
function AstralWind(awid,name,windSpeed,windDirection){this.awid=awid;this.name=name||awid;this.windSpeed=(windSpeed!==undefined)?windSpeed:30;this.windDirection=(windDirection!==undefined)?windDirection:90;this.blowing=false;}
AstralWind.prototype.blow=function(){if(this.blowing)return{error:'already_blowing'};this.blowing=true;return{success:true,power:this.getWindPower()};};
AstralWind.prototype.getWindPower=function(){if(!this.blowing)return 0;return this.windSpeed*2+this.windDirection;};
function StarForge(sfid,name,forgeMagnitude,starlight){this.sfid=sfid;this.name=name||sfid;this.forgeMagnitude=(forgeMagnitude!==undefined)?forgeMagnitude:60;this.starlight=(starlight!==undefined)?starlight:50;this.forging=false;}
StarForge.prototype.forge=function(){if(this.forging)return{error:'already_forging'};this.forging=true;return{success:true,power:this.getForgePower()};};
StarForge.prototype.getForgePower=function(){if(!this.forging)return 0;return this.forgeMagnitude+this.starlight;};
function CelestialCitadel(ccid,name,citadelRank){this.ccid=ccid;this.name=name||'Celestial Citadel';this.citadelRank=citadelRank||1;this.gates={};this.winds={};this.forges={};}
CelestialCitadel.prototype.addGate=function(g){this.gates[g.sgid]=g;return{success:true};};
CelestialCitadel.prototype.addWind=function(w){this.winds[w.awid]=w;return{success:true};};
CelestialCitadel.prototype.addForge=function(f){this.forges[f.sfid]=f;return{success:true};};
CelestialCitadel.prototype.getCitadelPower=function(){var total=0;for(var id in this.gates)total+=this.gates[id].getGatePower();for(var id in this.winds)total+=this.winds[id].getWindPower();for(var id in this.forges)total+=this.forges[id].getForgePower();total+=this.citadelRank*20;return total;};
window.SkyGate=SkyGate;window.AstralWind=AstralWind;window.StarForge=StarForge;window.CelestialCitadel=CelestialCitadel;
})();