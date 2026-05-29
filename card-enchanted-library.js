// ============================================================================
// Card Enchanted Library — V235 Direction N
// Enchanted library with tome binding, rune inscription, and knowledge wells
// ruflo hierarchical + generic-agent autonomous
// ============================================================================
'use strict';
(function(){
function TomeBinding(tid,name,pageCount,inkQuality){this.tid=tid;this.name=name||tid;this.pageCount=(pageCount!==undefined)?pageCount:100;this.inkQuality=(inkQuality!==undefined)?inkQuality:60;this.bound=false;}
TomeBinding.prototype.bind=function(){if(this.bound)return{error:'already_bound'};this.bound=true;return{success:true,power:this.getBindingPower()};};
TomeBinding.prototype.getBindingPower=function(){if(!this.bound)return 0;return this.pageCount+this.inkQuality;};
function RuneInscription(rid,name,runeCount,inscriptionDepth){this.rid=rid;this.name=name||rid;this.runeCount=(runeCount!==undefined)?runeCount:20;this.inscriptionDepth=(inscriptionDepth!==undefined)?inscriptionDepth:40;this.inscribed=false;}
RuneInscription.prototype.inscribe=function(){if(this.inscribed)return{error:'already_inscribed'};this.inscribed=true;return{success:true,power:this.getInscriptionPower()};};
RuneInscription.prototype.getInscriptionPower=function(){if(!this.inscribed)return 0;return this.runeCount*2+this.inscriptionDepth;};
function KnowledgeWell(wid,name,wellDepth,liquidKnowledge){this.wid=wid;this.name=name||wid;this.wellDepth=(wellDepth!==undefined)?wellDepth:50;this.liquidKnowledge=(liquidKnowledge!==undefined)?liquidKnowledge:30;this.filled=false;}
KnowledgeWell.prototype.fill=function(){if(this.filled)return{error:'already_filled'};this.filled=true;return{success:true,power:this.getWellPower()};};
KnowledgeWell.prototype.getWellPower=function(){if(!this.filled)return 0;return this.wellDepth+this.liquidKnowledge*2;};
function EnchantedLibrary(lid,name,libraryRank){this.lid=lid;this.name=name||'Enchanted Library';this.libraryRank=libraryRank||1;this.tomes={};this.inscriptions={};this.wells={};}
EnchantedLibrary.prototype.addTome=function(t){this.tomes[t.tid]=t;return{success:true};};
EnchantedLibrary.prototype.addInscription=function(r){this.inscriptions[r.rid]=r;return{success:true};};
EnchantedLibrary.prototype.addWell=function(w){this.wells[w.wid]=w;return{success:true};};
EnchantedLibrary.prototype.getLibraryPower=function(){var total=0;for(var id in this.tomes)total+=this.tomes[id].getBindingPower();for(var id in this.inscriptions)total+=this.inscriptions[id].getInscriptionPower();for(var id in this.wells)total+=this.wells[id].getWellPower();total+=this.libraryRank*15;return total;};
window.TomeBinding=TomeBinding;window.RuneInscription=RuneInscription;window.KnowledgeWell=KnowledgeWell;window.EnchantedLibrary=EnchantedLibrary;
})();