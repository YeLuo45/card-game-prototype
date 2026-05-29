// ============================================================================
// Card Chrono Sanctum — V239 Direction R
// Chrono sanctum with time rifts, temporal anchors, and age forges
// chatdev + thunderbolt pipeline
// ============================================================================
'use strict';
(function(){
function TimeRift(trid,name,riftStability,timeDistortion){this.trid=trid;this.name=name||trid;this.riftStability=(riftStability!==undefined)?riftStability:50;this.timeDistortion=(timeDistortion!==undefined)?timeDistortion:40;this.opened=false;}
TimeRift.prototype.open=function(){if(this.opened)return{error:'already_opened'};this.opened=true;return{success:true,power:this.getRiftPower()};};
TimeRift.prototype.getRiftPower=function(){if(!this.opened)return 0;return this.riftStability+this.timeDistortion;};
function TemporalAnchor(taid,name,anchorStrength,timePull){this.taid=taid;this.name=name||taid;this.anchorStrength=(anchorStrength!==undefined)?anchorStrength:60;this.timePull=(timePull!==undefined)?timePull:30;this.anchored=false;}
TemporalAnchor.prototype.anchor=function(){if(this.anchored)return{error:'already_anchored'};this.anchored=true;return{success:true,power:this.getAnchorPower()};};
TemporalAnchor.prototype.getAnchorPower=function(){if(!this.anchored)return 0;return this.anchorStrength+this.timePull;};
function AgeForge(afid,name,forgeAge,metallicSheen){this.afid=afid;this.name=name||afid;this.forgeAge=(forgeAge!==undefined)?forgeAge:40;this.metallicSheen=(metallicSheen!==undefined)?metallicSheen:50;this.forged=false;}
AgeForge.prototype.forge=function(){if(this.forged)return{error:'already_forged'};this.forged=true;return{success:true,power:this.getForgePower()};};
AgeForge.prototype.getForgePower=function(){if(!this.forged)return 0;return this.forgeAge+this.metallicSheen;};
function ChronoSanctum(csid,name,sanctumEra){this.csid=csid;this.name=name||'Chrono Sanctum';this.sanctumEra=sanctumEra||1;this.rifts={};this.anchors={};this.forges={};}
ChronoSanctum.prototype.addRift=function(r){this.rifts[r.trid]=r;return{success:true};};
ChronoSanctum.prototype.addAnchor=function(a){this.anchors[a.taid]=a;return{success:true};};
ChronoSanctum.prototype.addForge=function(f){this.forges[f.afid]=f;return{success:true};};
ChronoSanctum.prototype.getSanctumPower=function(){var total=0;for(var id in this.rifts)total+=this.rifts[id].getRiftPower();for(var id in this.anchors)total+=this.anchors[id].getAnchorPower();for(var id in this.forges)total+=this.forges[id].getForgePower();total+=this.sanctumEra*15;return total;};
window.TimeRift=TimeRift;window.TemporalAnchor=TemporalAnchor;window.AgeForge=AgeForge;window.ChronoSanctum=ChronoSanctum;
})();