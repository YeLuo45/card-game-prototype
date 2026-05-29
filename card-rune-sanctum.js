// ============================================================================
// Card Rune Sanctum — V209 Direction E
// Rune sanctum with glyph inscription, power channels, and sigil binding
// chatdev role specialization + ruflo hierarchical decomposition
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // Glyph: An inscribed glyph
  // -----------------------------------------------------------------------
  function Glyph(glyphId, name, element, power, tier) {
    this.glyphId = glyphId;
    this.name = name || glyphId;
    this.element = element || 'neutral';
    this.power = power || 10;
    this.tier = tier || 1; // 1-5
    this.inscribed = false;
    this.sigilId = null;
  }

  Glyph.prototype.inscribe = function (sigilId) {
    if (this.inscribed) return { error: 'already_inscribed' };
    this.inscribed = true;
    this.sigilId = sigilId;
    return { success: true };
  };

  Glyph.prototype.getPower = function () {
    return this.inscribed ? this.power * this.tier : Math.floor(this.power * this.tier * 0.5);
  };

  // -----------------------------------------------------------------------
  // Sigil: A sigil with bound glyphs
  // -----------------------------------------------------------------------
  function Sigil(sigilId, name, maxGlyphs) {
    this.sigilId = sigilId;
    this.name = name || sigilId;
    this.maxGlyphs = maxGlyphs || 5;
    this.glyphs = {}; // glyphId -> Glyph
    this.power = 0;
    this.element = 'neutral';
  }

  Sigil.prototype.bindGlyph = function (glyph) {
    if (Object.keys(this.glyphs).length >= this.maxGlyphs) return { error: 'max_glyphs' };
    if (this.glyphs[glyph.glyphId]) return { error: 'glyph_exists' };
    this.glyphs[glyph.glyphId] = glyph;
    this._recalculate();
    return { success: true, glyphCount: Object.keys(this.glyphs).length };
  };

  Sigil.prototype.removeGlyph = function (glyphId) {
    if (!this.glyphs[glyphId]) return { error: 'glyph_not_bound' };
    delete this.glyphs[glyphId];
    this._recalculate();
    return { success: true };
  };

  Sigil.prototype._recalculate = function () {
    var totalPower = 0;
    var elements = {};
    for (var gid in this.glyphs) {
      var g = this.glyphs[gid];
      totalPower += g.getPower();
      elements[g.element] = (elements[g.element] || 0) + 1;
    }
    this.power = totalPower;
    var dominant = 'neutral';
    var maxCount = 0;
    for (var el in elements) {
      if (elements[el] > maxCount) { maxCount = elements[el]; dominant = el; }
    }
    this.element = dominant;
  };

  Sigil.prototype.getPower = function () { return this.power; };
  Sigil.prototype.getElement = function () { return this.element; };
  Sigil.prototype.getGlyphCount = function () { return Object.keys(this.glyphs).length; };

  // -----------------------------------------------------------------------
  // RuneChannel: A power channel in the sanctum
  // -----------------------------------------------------------------------
  function RuneChannel(channelId, name, capacity) {
    this.channelId = channelId;
    this.name = name || channelId;
    this.capacity = capacity || 100;
    this.flow = 0; // current power flow 0-100
    this.active = false;
    this.sigilId = null;
  }

  RuneChannel.prototype.activate = function (sigil, power) {
    if (this.active) return { error: 'already_active' };
    if (power > this.capacity) return { error: 'exceeds_capacity' };
    this.active = true;
    this.flow = power;
    this.sigilId = sigil.sigilId;
    return { success: true, flow: this.flow };
  };

  RuneChannel.prototype.deactivate = function () {
    this.active = false;
    this.flow = 0;
    this.sigilId = null;
    return { success: true };
  };

  RuneChannel.prototype.adjustFlow = function (delta) {
    if (!this.active) return { error: 'not_active' };
    this.flow = Math.max(0, Math.min(this.capacity, this.flow + delta));
    return { success: true, flow: this.flow };
  };

  // --------------------------------------------------------------------===
  // RuneSanctum: Main sanctum manager
  // ----------------------------------------------------------------=======
  function RuneSanctum(sanctumId, name, maxChannels) {
    this.sanctumId = sanctumId || ('sanctum_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Rune Sanctum';
    this.channels = {};
    this.channelCounter = 0;
    this.maxChannels = maxChannels || 10;
    this.sanctumPower = 0;
  }

  RuneSanctum.prototype.addChannel = function (channel) {
    if (Object.keys(this.channels).length >= this.maxChannels) return { error: 'max_channels' };
    this.channels[channel.channelId] = channel;
    return { success: true, count: Object.keys(this.channels).length };
  };

  RuneSanctum.prototype.getChannel = function (id) { return this.channels[id] || null; };
  RuneSanctum.prototype.getChannelCount = function () { return Object.keys(this.channels).length; };

  RuneSanctum.prototype.getTotalPower = function () {
    var total = 0;
    for (var cid in this.channels) {
      if (this.channels[cid].active) total += this.channels[cid].flow;
    }
    return total;
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.Glyph = Glyph;
  window.Sigil = Sigil;
  window.RuneChannel = RuneChannel;
  window.RuneSanctum = RuneSanctum;
})();