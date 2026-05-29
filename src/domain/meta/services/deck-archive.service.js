// ============================================================================
// Card Deck Archive System — V121 Direction O
// ============================================================================
// Deck saving, loading, export (share codes), versioning, favorites, and
// deck comparison. ThunderBolt offline-first + generic-agent L0-L4
// (deck preferences, play history, archetype stats).
// ============================================================================

'use strict';

class DeckVersion {
  constructor(versionId, deckData, authorId, note, createdAt) {
    this.versionId = versionId;
    this.deckData = deckData;
    this.authorId = authorId;
    this.note = note || '';
    this.createdAt = createdAt || Date.now();
  }
}

class DeckArchive {
  constructor(deckId, name, archetype, authorId, cardIds, format) {
    this.deckId = deckId;
    this.name = name;
    this.archetype = archetype; // 'aggro' | 'control' | 'midrange' | 'combo' | 'custom'
    this.authorId = authorId;
    this.cardIds = cardIds; // array of cardId strings
    this.format = format; // 'standard' | 'wild' | 'duel'
    this.versions = []; // DeckVersion[]
    this.currentVersionId = null;
    this.favorites = 0;
    this.views = 0;
    this.isPublic = false;
    this.tags = [];
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
    this.deletedAt = null;
  }

  getCardCount() { return this.cardIds.length; }

  getVersion(versionId) {
    return this.versions.find(v => v.versionId === versionId) || null;
  }

  addVersion(deckData, authorId, note) {
    const vid = `v${Date.now()}`;
    const v = new DeckVersion(vid, deckData, authorId, note);
    this.versions.push(v);
    this.currentVersionId = vid;
    this.cardIds = deckData.cardIds || this.cardIds;
    this.updatedAt = Date.now();
    return v;
  }
}

class DeckArchetypeClassifier {
  constructor() {
    // Simple rule-based classifier
    this.keywords = {
      aggro: ['rush', 'aggro', 'fast', 'burn', ' aggression'],
      control: ['control', 'stall', 'defense', 'removal', 'stall'],
      midrange: ['midrange', 'value', 'tempo'],
      combo: ['combo', 'OTK', 'infinite', 'burst']
    };
  }

  classify(cardIds, cardDb) {
    // cardDb: Map<cardId, cardDef>
    if (!cardIds || cardIds.length === 0) return 'custom';
    let aggro = 0, control = 0, midrange = 0, combo = 0;
    for (const cid of cardIds) {
      const card = cardDb.get(cid);
      if (!card) continue;
      const text = `${card.name || ''} ${card.type || ''}`.toLowerCase();
      for (const [arch, kws] of Object.entries(this.keywords)) {
        for (const kw of kws) {
          if (text.includes(kw)) { if (arch === 'aggro') aggro++; if (arch === 'control') control++; if (arch === 'midrange') midrange++; if (arch === 'combo') combo++; }
        }
      }
    }
    const scores = { aggro, control, midrange, combo };
    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return best[1] > 0 ? best[0] : 'midrange';
  }
}

class DeckArchiveSystem {
  constructor() {
    this.archives = new Map(); // deckId → DeckArchive
    this.cardDb = new Map(); // cardId → { name, type, cost, attack, defense }
    this.playerDecks = new Map(); // playerId → [deckId]
    this.shareCodes = new Map(); // shareCode → deckId
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('deck_archive') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const [did, ddata] of Object.entries(data.archives || {})) {
          const d = new DeckArchive(ddata.deckId, ddata.name, ddata.archetype, ddata.authorId, ddata.cardIds, ddata.format);
          d.favorites = ddata.favorites || 0;
          d.views = ddata.views || 0;
          d.isPublic = ddata.isPublic || false;
          d.tags = ddata.tags || [];
          d.currentVersionId = ddata.currentVersionId || null;
          d.versions = (ddata.versions || []).map(v => new DeckVersion(v.versionId, v.deckData, v.authorId, v.note, v.createdAt));
          d.createdAt = ddata.createdAt || Date.now();
          d.updatedAt = ddata.updatedAt || Date.now();
          d.deletedAt = ddata.deletedAt || null;
          this.archives.set(did, d);
          if (ddata.authorId) {
            if (!this.playerDecks.has(ddata.authorId)) this.playerDecks.set(ddata.authorId, []);
            if (!this.playerDecks.get(ddata.authorId).includes(did)) this.playerDecks.get(ddata.authorId).push(did);
          }
        }
        for (const [cid, cdata] of Object.entries(data.cardDb || {})) {
          this.cardDb.set(cid, cdata);
        }
        for (const [code, did] of Object.entries(data.shareCodes || {})) {
          this.shareCodes.set(code, did);
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        archives: Object.fromEntries(Array.from(this.archives.entries()).map(([k, v]) => [k, { deckId: v.deckId, name: v.name, archetype: v.archetype, authorId: v.authorId, cardIds: v.cardIds, format: v.format, favorites: v.favorites, views: v.views, isPublic: v.isPublic, tags: v.tags, currentVersionId: v.currentVersionId, versions: v.versions.map(w => ({ versionId: w.versionId, deckData: w.deckData, authorId: w.authorId, note: w.note, createdAt: w.createdAt })), createdAt: v.createdAt, updatedAt: v.updatedAt, deletedAt: v.deletedAt }])),
        cardDb: Object.fromEntries(Array.from(this.cardDb.entries())),
        shareCodes: Object.fromEntries(this.shareCodes.entries())
      };
      localStorage.setItem('deck_archive', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  registerCard(cardId, name, type, cost, attack, defense) {
    if (this.cardDb.has(cardId)) return { error: 'card_exists' };
    const card = { cardId, name, type, cost, attack, defense };
    this.cardDb.set(cardId, card);
    this._save();
    return card;
  }

  createDeck(name, archetype, authorId, cardIds, format) {
    if (!name || !cardIds || cardIds.length === 0) return { error: 'invalid_deck' };
    if (cardIds.length > 30) return { error: 'too_many_cards' };
    const deckId = `deck_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const finalArchetype = archetype || new DeckArchetypeClassifier().classify(cardIds, this.cardDb);
    const d = new DeckArchive(deckId, name, finalArchetype, authorId, cardIds, format || 'standard');
    this.archives.set(deckId, d);
    if (authorId) {
      if (!this.playerDecks.has(authorId)) this.playerDecks.set(authorId, []);
      this.playerDecks.get(authorId).push(deckId);
    }
    this._save();
    this._emit('deck_created', { deckId, name, archetype: finalArchetype });
    return d;
  }

  getDeck(deckId) {
    const d = this.archives.get(deckId);
    if (!d || d.deletedAt) return null;
    d.views++;
    this._save();
    return d;
  }

  updateDeck(deckId, updates) {
    const d = this.archives.get(deckId);
    if (!d) return { error: 'deck_not_found' };
    if (updates.name !== undefined) d.name = updates.name;
    if (updates.archetype !== undefined) d.archetype = updates.archetype;
    if (updates.isPublic !== undefined) d.isPublic = updates.isPublic;
    if (updates.tags !== undefined) d.tags = updates.tags;
    if (updates.cardIds !== undefined) {
      d.cardIds = updates.cardIds;
      d.addVersion({ cardIds: updates.cardIds }, updates.authorId || d.authorId, updates.changeNote || '');
    }
    d.updatedAt = Date.now();
    this._save();
    this._emit('deck_updated', { deckId });
    return d;
  }

  deleteDeck(deckId) {
    const d = this.archives.get(deckId);
    if (!d) return { error: 'deck_not_found' };
    d.deletedAt = Date.now();
    this._save();
    this._emit('deck_deleted', { deckId });
    return { success: true };
  }

  duplicateDeck(sourceDeckId, newName, newAuthorId) {
    const src = this.getDeck(sourceDeckId);
    if (!src) return { error: 'deck_not_found' };
    return this.createDeck(newName || `${src.name} (Copy)`, src.archetype, newAuthorId, src.cardIds.slice(), src.format);
  }

  favoriteDeck(deckId) {
    const d = this.archives.get(deckId);
    if (!d) return { error: 'deck_not_found' };
    d.favorites++;
    this._save();
    this._emit('deck_favorited', { deckId });
    return { favorites: d.favorites };
  }

  getPlayerDecks(playerId) {
    const ids = this.playerDecks.get(playerId) || [];
    return ids.map(id => this.getDeck(id)).filter(d => d !== null);
  }

  getPublicDecks(archetype, format, limit) {
    const results = [];
    for (const d of this.archives.values()) {
      if (d.isPublic && !d.deletedAt) {
        if (!archetype || d.archetype === archetype) {
          if (!format || d.format === format) results.push(d);
        }
      }
    }
    results.sort((a, b) => b.favorites - a.favorites);
    return limit ? results.slice(0, limit) : results;
  }

  generateShareCode(deckId) {
    if (!this.archives.has(deckId)) return { error: 'deck_not_found' };
    const code = Math.random().toString(36).slice(2, 10).toUpperCase();
    this.shareCodes.set(code, deckId);
    this._save();
    return { code, deckId };
  }

  resolveShareCode(code) {
    const deckId = this.shareCodes.get(code);
    if (!deckId) return { error: 'invalid_code' };
    return { deckId, deck: this.getDeck(deckId) };
  }

  compareDecks(deckIdA, deckIdB) {
    const a = this.getDeck(deckIdA);
    const b = this.getDeck(deckIdB);
    if (!a || !b) return { error: 'deck_not_found' };

    const aSet = new Set(a.cardIds);
    const bSet = new Set(b.cardIds);
    const shared = a.cardIds.filter(id => bSet.has(id));
    const onlyA = a.cardIds.filter(id => !bSet.has(id));
    const onlyB = b.cardIds.filter(id => !aSet.has(id));

    const similarity = a.cardIds.length > 0 ? shared.length / Math.max(a.cardIds.length, b.cardIds.length) : 0;

    return { shared, onlyA, onlyB, similarity };
  }

  getStats() {
    let publicCount = 0, totalVersions = 0;
    for (const d of this.archives.values()) {
      if (d.isPublic && !d.deletedAt) publicCount++;
      totalVersions += d.versions.length;
    }
    return {
      totalDecks: this.archives.size,
      publicDecks: publicCount,
      totalVersions,
      totalShareCodes: this.shareCodes.size,
      totalCardDb: this.cardDb.size
    };
  }
}

const DeckArchiveTools = {
  'deck.create': {
    description: 'Create a new deck archive',
    parameters: { type: 'object', properties: { name: { type: 'string' }, archetype: { type: 'string' }, authorId: { type: 'string' }, cardIds: { type: 'array', items: { type: 'string' } }, format: { type: 'string' } }, required: ['name', 'authorId', 'cardIds'] },
    handler(args) {
      if (!window._deckArchive) window._deckArchive = new DeckArchiveSystem();
      return window._deckArchive.createDeck(args.name, args.archetype, args.authorId, args.cardIds, args.format);
    }
  },
  'deck.update': {
    description: 'Update a deck',
    parameters: { type: 'object', properties: { deckId: { type: 'string' }, name: { type: 'string' }, cardIds: { type: 'array', items: { type: 'string' } }, authorId: { type: 'string' }, changeNote: { type: 'string' } }, required: ['deckId'] },
    handler(args) {
      if (!window._deckArchive) return { error: 'system_not_initialized' };
      return window._deckArchive.updateDeck(args.deckId, args);
    }
  },
  'deck.share': {
    description: 'Generate share code for deck',
    parameters: { type: 'object', properties: { deckId: { type: 'string' } }, required: ['deckId'] },
    handler(args) {
      if (!window._deckArchive) return { error: 'system_not_initialized' };
      return window._deckArchive.generateShareCode(args.deckId);
    }
  },
  'deck.stats': {
    description: 'Get deck archive stats',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._deckArchive) window._deckArchive = new DeckArchiveSystem();
      return window._deckArchive.getStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DeckVersion, DeckArchive, DeckArchetypeClassifier, DeckArchiveSystem, DeckArchiveTools };
}
if (typeof window !== 'undefined') {
  window.DeckVersion = DeckVersion;
  window.DeckArchive = DeckArchive;
  window.DeckArchetypeClassifier = DeckArchetypeClassifier;
  window.DeckArchiveSystem = DeckArchiveSystem;
  window.DeckArchiveTools = DeckArchiveTools;
}