// ============================================================================
// Card Crystal Sanctum — V241 Direction T
// Crystal sanctum with gem resonators, lattice bonds, and prismatic forges
// ruflo hierarchical + thunderbolt feedback
// ============================================================================
'use strict';
(function(){
function GemResonator(grd,name,resonanceFreq,spectralPurity){this.grd=grd;this.name=name||grd;this.resonanceFreq=(resonanceFreq!==undefined)?resonanceFreq:50;this.spectralPurity=(spectralPurity!==undefined)?spectralPurity:40;this.resonating=false;}
GemResonator.prototype.resonate=function(){if(this.resonating)return{error:'already_resonating'};this.resonating=true;return{success:true,power:this.getResonatorPower()};};
GemResonator.prototype.getResonatorPower=function(){if(!this.resonating)return 0;return this.resonanceFreq+this.spectralPurity;};
function LatticeBond(lbid,name,bondStrength,crystalStructure){this.lbid=lbid;this.name=name||lbid;this.bondStrength=(bondStrength!==undefined)?bondStrength:60;this.crystalStructure=(crystalStructure!==undefined)?crystalStructure:30;this.bonded=false;}
LatticeBond.prototype.bind=function(){if(this.bonded)return{error:'already_bonded'};this.bonded=true;return{success:true,power:this.getBondPower()};};
LatticeBond.prototype.getBondPower=function(){if(!this.bonded)return 0;return this.bondStrength+this.crystalStructure;};
function PrismaticForge(pfid,name,prismIntensity,lightRefraction){this.pfid=pfid;this.name=name||pfid;this.prismIntensity=(prismIntensity!==undefined)?prismIntensity:40;this.lightRefraction=(lightRefraction!==undefined)?lightRefraction:50;this.forged=false;}
PrismaticForge.prototype.forge=function(){if(this.forged)return{error:'already_forged'};this.forged=true;return{success:true,power:this.getForgePower()};};
PrismaticForge.prototype.getForgePower=function(){if(!this.forged)return 0;return this.prismIntensity+this.lightRefraction;};
function CrystalSanctum(csd,name,sanctumClarity){this.csd=csd;this.name=name||'Crystal Sanctum';this.sanctumClarity=sanctumClarity||1;this.resonators={};this.bonds={};this.forges={};}
CrystalSanctum.prototype.addResonator=function(r){this.resonators[r.grd]=r;return{success:true};};
CrystalSanctum.prototype.addBond=function(b){this.bonds[b.lbid]=b;return{success:true};};
CrystalSanctum.prototype.addForge=function(f){this.forges[f.pfid]=f;return{success:true};};
CrystalSanctum.prototype.getSanctumPower=function(){var total=0;for(var id in this.resonators)total+=this.resonators[id].getResonatorPower();for(var id in this.bonds)total+=this.bonds[id].getBondPower();for(var id in this.forges)total+=this.forges[id].getForgePower();total+=this.sanctumClarity*15;return total;};
window.GemResonator=GemResonator;window.LatticeBond=LatticeBond;window.PrismaticForge=PrismaticForge;window.CrystalSanctum=CrystalSanctum;
})();