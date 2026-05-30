// ============================================================================
// src/domain/card/systems/sanctum/chrono-sanctum.js — V245
// Match existing test expectations: TimeRift(trid,riftStability,timeDistortion)
// TemporalAnchor(taid,anchorStrength,timePull), AgeForge(afid,forgeAge,metallicSheen)
// ============================================================================
'use strict';

var TimeRift = function(id, element, riftStability, timeDistortion) {
  this.trid             = id;
  this.element          = element;
  this.riftStability    = riftStability;   // 0-100
  this.timeDistortion   = timeDistortion;   // 0-100
  this.opened           = false;
  this.powerBoost       = 0;
};

TimeRift.prototype.open = function() {
  if (this.opened) return { error: 'already_opened' };
  this.opened = true;
  this.powerBoost = Math.floor((this.riftStability + this.timeDistortion) / 2);
  return { success: true, boost: this.powerBoost };
};

TimeRift.prototype.close = function() {
  if (!this.opened) return { error: 'not_open' };
  this.opened = false;
  var lost = this.powerBoost;
  this.powerBoost = 0;
  return { success: true, lost: lost };
};

TimeRift.prototype.getRiftPower = function() {
  if (!this.opened) return 0;
  return this.riftStability + this.timeDistortion + this.powerBoost;
};

var TemporalAnchor = function(id, element, anchorStrength, timePull) {
  this.taid            = id;
  this.element         = element;
  this.anchorStrength  = anchorStrength;  // 0-100
  this.timePull        = timePull;        // 0-100
  this.anchored         = false;
  this.warpPower       = 0;
};

TemporalAnchor.prototype.anchor = function() {
  if (this.anchored) return { error: 'already_anchored' };
  this.anchored = true;
  this.warpPower = Math.floor((this.anchorStrength + this.timePull) / 2);
  return { success: true, warp: this.warpPower };
};

TemporalAnchor.prototype.release = function() {
  if (!this.anchored) return { error: 'not_anchored' };
  this.anchored = false;
  var lost = this.warpPower;
  this.warpPower = 0;
  return { success: true, lost: lost };
};

TemporalAnchor.prototype.getAnchorPower = function() {
  if (!this.anchored) return 0;
  return this.anchorStrength + this.timePull;
};

var AgeForge = function(id, element, forgeAge, metallicSheen) {
  this.afid           = id;
  this.element        = element;
  this.forgeAge       = forgeAge;      // 0-100
  this.metallicSheen   = metallicSheen;  // 0-100
  this.forged          = false;
  this.ageBonus        = 0;
};

AgeForge.prototype.forge = function() {
  if (this.forged) return { error: 'already_forged' };
  this.forged = true;
  this.ageBonus = Math.floor((this.forgeAge * this.metallicSheen) / 50);
  return { success: true, bonus: this.ageBonus };
};

AgeForge.prototype.unforge = function() {
  if (!this.forged) return { error: 'not_forged' };
  this.forged = false;
  var lost = this.ageBonus;
  this.ageBonus = 0;
  return { success: true, lost: lost };
};

AgeForge.prototype.getForgePower = function() {
  if (!this.forged) return 0;
  return this.forgeAge + this.metallicSheen;
};

var ChronoSanctum = function(id, element, era) {
  this.csid        = id;
  this.element    = element;
  this.sanctumEra = era !== undefined ? era : 1;
  this.rifts   = [];
  this.anchors = [];
  this.forges  = [];
  this.blessing = 0;
};

ChronoSanctum.prototype.addRift = function(r)   { this.rifts.push(r); };
ChronoSanctum.prototype.addAnchor = function(a) { this.anchors.push(a); };
ChronoSanctum.prototype.addForge = function(f)  { this.forges.push(f); };

ChronoSanctum.prototype.getSanctumPower = function() {
  var selfPower   = this.sanctumEra * 5;
  var riftPower   = this.rifts.reduce(function(s,r){ return s + (r.getRiftPower   ? r.getRiftPower()   : 0); }, 0);
  var anchorPower = this.anchors.reduce(function(s,a){ return s + (a.getAnchorPower ? a.getAnchorPower() : 0); }, 0);
  var forgePower  = this.forges.reduce(function(s,f){ return s + (f.getForgePower  ? f.getForgePower()  : 0); }, 0);
  return selfPower + riftPower + anchorPower + forgePower;
};

ChronoSanctum.prototype.advanceStage = function(stages) {
  var gained = 0;
  if (stages >= 3) { this.sanctumEra = Math.min(10, this.sanctumEra + 1); gained++; }
  return { gained: gained, era: this.sanctumEra };
};

ChronoSanctum.prototype.setBlessing = function(amount) {
  this.blessing = Math.max(0, Math.min(200, amount));
  return { blessing: this.blessing };
};

// ─── Export ──────────────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.TimeRift         = TimeRift;
  window.TemporalAnchor   = TemporalAnchor;
  window.AgeForge         = AgeForge;
  window.ChronoSanctum    = ChronoSanctum;
}