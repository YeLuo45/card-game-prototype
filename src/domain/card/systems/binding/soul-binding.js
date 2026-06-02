// ============================================================================
// Card Soul Binding — V189 Direction E
// Soul binding with spirit partners, empathic links and shared destiny
// ruflo hierarchical decomposition + thunderbolt feedback loops
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // SoulFragment: A fragment of soul essence
  // -----------------------------------------------------------------------
  function SoulFragment(fragmentId, name, affinity, power) {
    this.fragmentId = fragmentId;
    this.name = name || fragmentId;
    this.affinity = affinity || 'neutral'; // light, shadow, nature, fire, water
    this.power = power || 1;
    this.bound = false;
  }

  SoulFragment.prototype.bind = function (partnerId) {
    if (this.bound) return { error: 'already_bound' };
    this.bound = true;
    this.boundPartnerId = partnerId;
    return { success: true, boundTo: partnerId };
  };

  SoulFragment.prototype.unbind = function () {
    if (!this.bound) return { error: 'not_bound' };
    this.bound = false;
    var prev = this.boundPartnerId;
    delete this.boundPartnerId;
    return { success: true, previouslyBoundTo: prev };
  };

  // -----------------------------------------------------------------------
  // SpiritPartner: A spirit partner bound to a player
  // -----------------------------------------------------------------------
  function SpiritPartner(partnerId, name, soulFragment, level, experience) {
    this.partnerId = partnerId;
    this.name = name || 'Spirit ' + partnerId;
    this.soulFragment = soulFragment;
    this.level = level || 1;
    this.experience = experience || 0;
    this.xpToNext = 100;
    this.empathicLink = false;
    this.bondStrength = 0;
  }

  SpiritPartner.prototype.activateEmpathicLink = function () {
    if (this.empathicLink) return { error: 'link_already_active' };
    if (!this.soulFragment || !this.soulFragment.bound) return { error: 'fragment_not_bound' };
    this.empathicLink = true;
    return { success: true };
  };

  SpiritPartner.prototype.addExperience = function (amount) {
    this.experience += amount;
    var leveledUp = false;
    while (this.experience >= this.xpToNext && this.level < 20) {
      this.experience -= this.xpToNext;
      this.level++;
      this.xpToNext = Math.floor(this.xpToNext * 1.5);
      this.bondStrength += 5;
      leveledUp = true;
    }
    return { success: true, leveledUp: leveledUp, level: this.level };
  };

  SpiritPartner.prototype.getBondPower = function () {
    var base = this.soulFragment ? this.soulFragment.power * this.level : this.level;
    var bondBonus = this.empathicLink ? this.bondStrength * 0.1 : 0;
    return Math.floor(base + bondBonus);
  };

  // -----------------------------------------------------------------------
  // SoulBindingAltar: A sacred altar for soul binding rituals
  // -----------------------------------------------------------------------
  function SoulBindingAltar(altarId, name) {
    this.altarId = altarId || ('altar_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Soul Altar';
    this.activeBindings = {}; // partnerId -> { fragmentId, playerId, boundAt }
    this.altarIdCounter = 0;
    this.totalBindings = 0;
  }

  SoulBindingAltar.prototype.performBinding = function (playerId, soulFragment, partnerName) {
    if (!soulFragment || soulFragment.bound) return { error: 'fragment_unavailable' };
    var partnerId = 'partner_' + (++this.altarIdCounter);
    var partner = new SpiritPartner(partnerId, partnerName, soulFragment);
    var fragmentBind = soulFragment.bind(playerId);
    if (!fragmentBind.success) return fragmentBind;
    this.activeBindings[partnerId] = {
      fragmentId: soulFragment.fragmentId,
      playerId: playerId,
      boundAt: Date.now()
    };
    this.totalBindings++;
    return { success: true, partner: partner };
  };

  SoulBindingAltar.prototype.breakBinding = function (partnerId) {
    var binding = this.activeBindings[partnerId];
    if (!binding) return { error: 'binding_not_found' };
    delete this.activeBindings[partnerId];
    this.totalBindings--;
    return { success: true };
  };

  SoulBindingAltar.prototype.getActivePartners = function (playerId) {
    var partners = [];
    for (var pid in this.activeBindings) {
      if (this.activeBindings[pid].playerId === playerId) partners.push(pid);
    }
    return partners;
  };

  SoulBindingAltar.prototype.getTotalBindings = function () {
    return this.totalBindings;
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.SoulFragment = SoulFragment;
  window.SpiritPartner = SpiritPartner;
  window.SoulBindingAltar = SoulBindingAltar;
})();