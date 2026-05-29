// ============================================================================
// Card Ethereal Sanctum — V244 Direction W
// Ethereal sanctum with spectral channels, phantom resonance, and spirit gates
// ruflo + thunderbolt: hierarchical resonance, feedback pipeline
// ============================================================================
'use strict';

var EtherealChannel = function(id, element, resonance, clarity) {
  this.channelId  = id;
  this.element    = element;
  this.resonance  = resonance;   // 0-100
  this.clarity    = clarity;     // 0-100
  this.active     = false;
  this.spectralGain = 0;
};

EtherealChannel.prototype.activate = function() {
  if (this.active) return { error: 'already_active' };
  this.active = true;
  this.spectralGain = Math.floor((this.resonance * this.clarity) / 100);
  return { success: true, gain: this.spectralGain };
};

EtherealChannel.prototype.deactivate = function() {
  if (!this.active) return { error: 'not_active' };
  this.active = false;
  var lost = this.spectralGain || 0;
  this.spectralGain = 0;
  return { success: true, lost: lost };
};

EtherealChannel.prototype.getChannelPower = function() {
  if (!this.active) return 0;
  return Math.floor(this.resonance * 2);
};

var PhantomResonance = function(id, element, haunting, stability) {
  this.phantomId  = id;
  this.element    = element;
  this.haunting   = haunting;   // 0-100
  this.stability  = stability;  // 0-100
  this.bound      = false;
  this.echoBoost  = 0;
};

PhantomResonance.prototype.bind = function() {
  if (this.bound) return { error: 'already_bound' };
  this.bound = true;
  this.echoBoost = Math.floor((this.haunting * this.stability) / 50);
  return { success: true, boost: this.echoBoost };
};

PhantomResonance.prototype.unbind = function() {
  if (!this.bound) return { error: 'not_bound' };
  this.bound = false;
  var lost = this.echoBoost;
  this.echoBoost = 0;
  return { success: true, lost: lost };
};

PhantomResonance.prototype.getPhantomPower = function() {
  if (!this.bound) return 0;
  return Math.floor(this.haunting * 1.5 + this.stability * 0.5);
};

var SpiritGate = function(id, element, spectral, ethereal) {
  this.gateId    = id;
  this.element   = element;
  this.spectral  = spectral;   // 0-100
  this.ethereal  = ethereal;   // 0-100
  this.open      = false;
  this.dimension = null;
};

SpiritGate.prototype.openGate = function() {
  if (this.open) return { error: 'already_open' };
  this.open = true;
  this.dimension = this.spectral > this.ethereal ? 'spectral' : 'ethereal';
  return { success: true, dimension: this.dimension };
};

SpiritGate.prototype.closeGate = function() {
  if (!this.open) return { error: 'not_open' };
  this.open = false;
  var dim = this.dimension;
  this.dimension = null;
  return { success: true, closed: dim };
};

SpiritGate.prototype.getGatePower = function() {
  if (!this.open) return 0;
  var base = this.spectral + this.ethereal;
  return this.dimension === 'spectral' ? Math.floor(base * 1.3) : Math.floor(base * 1.1);
};

var EtherealSanctum = function(id, element, channelLevel, phantomLevel, gateLevel) {
  this.sanctumId     = id;
  this.element       = element;
  this.channelLevel  = channelLevel;
  this.phantomLevel  = phantomLevel;
  this.gateLevel     = gateLevel;
  this.blessing      = 0;
};

EtherealSanctum.prototype.getSanctumPower = function() {
  var channels  = this.channelLevel  * 2;
  var phantoms  = this.phantomLevel  * 3;
  var gates    = this.gateLevel     * 2;
  var blessing = Math.floor(this.blessing * 0.8);
  return channels + phantoms + gates + blessing;
};

EtherealSanctum.prototype.advanceStage = function(stages) {
  var gained = 0;
  if (stages >= 3) { this.channelLevel++; gained++; }
  if (stages >= 5) { this.phantomLevel++; gained++; }
  if (stages >= 8) { this.gateLevel++; gained++; }
  return { gained: gained, channel: this.channelLevel, phantom: this.phantomLevel, gate: this.gateLevel };
};

EtherealSanctum.prototype.setBlessing = function(amount) {
  this.blessing = Math.max(0, Math.min(200, amount));
  return { blessing: this.blessing };
};

// ─── Export ──────────────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.EtherealChannel  = EtherealChannel;
  window.PhantomResonance  = PhantomResonance;
  window.SpiritGate        = SpiritGate;
  window.EtherealSanctum   = EtherealSanctum;
}