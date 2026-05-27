// ============================================================================
// Card Deck Template System — V112 Direction F
// ============================================================================
// Save/load/export/import deck templates with card ratings.
// Integrates: nanobot tool registry + thunderbolt offline storage.
// ============================================================================

'use strict';

class DeckTemplate {
  constructor(templateId, name, deckData) {
    this.templateId = templateId;
    this.name = name;
    this.deckData = deckData; // Array of { cardId, count }
    this.tags = [];
    this.author = 'anonymous';
    this.createdAt = Date.now();
    this.uses = 0;
  }

  addTag(tag) {
    if (!this.tags.includes(tag)) this.tags.push(tag);
  }

  getCardCount() {
    return this.deckData.reduce((s, c) => s + (c.count || 1), 0);
  }

  clone() {
    const t = new DeckTemplate(this.templateId + '_copy', this.name + ' (Copy)', JSON.parse(JSON.stringify(this.deckData)));
    t.tags = [...this.tags];
    t.author = this.author;
    return t;
  }
}

class DeckTemplateRegistry {
  constructor() {
    this.templates = new Map();
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('deck_template_registry') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const t of data.templates || []) {
          const tmpl = new DeckTemplate(t.templateId, t.name, t.deckData);
          tmpl.tags = t.tags || [];
          tmpl.author = t.author || 'anonymous';
          tmpl.createdAt = t.createdAt || Date.now();
          tmpl.uses = t.uses || 0;
          this.templates.set(t.templateId, tmpl);
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const templates = Array.from(this.templates.values()).map(t => ({
        templateId: t.templateId, name: t.name, deckData: t.deckData,
        tags: t.tags, author: t.author, createdAt: t.createdAt, uses: t.uses
      }));
      localStorage.setItem('deck_template_registry', JSON.stringify({ templates }));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  saveTemplate(templateId, name, deckData, author = 'anonymous') {
    if (this.templates.has(templateId)) {
      return { error: 'template_id_exists' };
    }
    const tmpl = new DeckTemplate(templateId, name, deckData);
    tmpl.author = author;
    this.templates.set(templateId, tmpl);
    this._save();
    this._emit('template_saved', { templateId, name });
    return tmpl;
  }

  getTemplate(templateId) {
    return this.templates.get(templateId) || null;
  }

  deleteTemplate(templateId) {
    if (!this.templates.has(templateId)) return { error: 'template_not_found' };
    this.templates.delete(templateId);
    this._save();
    this._emit('template_deleted', { templateId });
    return { success: true };
  }

  listTemplates(filter) {
    let list = Array.from(this.templates.values());
    if (filter) {
      if (filter.tag) list = list.filter(t => t.tags.includes(filter.tag));
      if (filter.author) list = list.filter(t => t.author === filter.author);
      if (filter.search) {
        const q = filter.search.toLowerCase();
        list = list.filter(t => t.name.toLowerCase().includes(q) || t.tags.some(function(tag){return tag.toLowerCase().includes(q);}));
      }
    }
    return list;
  }

  updateTemplate(templateId, updates) {
    const tmpl = this.templates.get(templateId);
    if (!tmpl) return { error: 'template_not_found' };
    if (updates.name !== undefined) tmpl.name = updates.name;
    if (updates.deckData !== undefined) tmpl.deckData = updates.deckData;
    if (updates.tags !== undefined) tmpl.tags = updates.tags;
    this._save();
    this._emit('template_updated', { templateId });
    return tmpl;
  }

  incrementUses(templateId) {
    const tmpl = this.templates.get(templateId);
    if (!tmpl) return { error: 'template_not_found' };
    tmpl.uses++;
    this._save();
    return { success: true };
  }

  exportTemplates(templateIds) {
    const selected = templateIds.map(id => this.templates.get(id)).filter(Boolean);
    return JSON.stringify(selected, null, 2);
  }

  importTemplates(jsonStr, overwrite = false) {
    try {
      const imported = JSON.parse(jsonStr);
      const results = [];
      for (const t of imported) {
        if (this.templates.has(t.templateId) && !overwrite) {
          results.push({ templateId: t.templateId, status: 'skipped_existing' });
          continue;
        }
        const tmpl = new DeckTemplate(t.templateId, t.name, t.deckData);
        tmpl.tags = t.tags || [];
        tmpl.author = t.author || 'anonymous';
        tmpl.createdAt = t.createdAt || Date.now();
        tmpl.uses = 0;
        this.templates.set(t.templateId, tmpl);
        results.push({ templateId: t.templateId, status: 'imported' });
      }
      this._save();
      return { success: true, results };
    } catch (e) {
      return { error: 'invalid_json' };
    }
  }

  getStats() {
    return {
      totalTemplates: this.templates.size,
      totalCards: Array.from(this.templates.values()).reduce((s, t) => s + t.getCardCount(), 0)
    };
  }
}

const DeckTemplateTools = {
  'decktemplate.save': {
    description: 'Save a deck template',
    parameters: { type: 'object', properties: { templateId: { type: 'string' }, name: { type: 'string' }, deckData: { type: 'array' }, author: { type: 'string' } }, required: ['templateId', 'name', 'deckData'] },
    handler(args) {
      const sys = window._deckTemplateRegistry || new DeckTemplateRegistry();
      if (window._deckTemplateRegistry === undefined) window._deckTemplateRegistry = sys;
      return sys.saveTemplate(args.templateId, args.name, args.deckData, args.author || 'anonymous');
    }
  },
  'decktemplate.get': {
    description: 'Get a deck template',
    parameters: { type: 'object', properties: { templateId: { type: 'string' } }, required: ['templateId'] },
    handler(args) {
      if (!window._deckTemplateRegistry) return { error: 'system_not_initialized' };
      return window._deckTemplateRegistry.getTemplate(args.templateId);
    }
  },
  'decktemplate.list': {
    description: 'List deck templates',
    parameters: { type: 'object', properties: { tag: { type: 'string' }, author: { type: 'string' }, search: { type: 'string' } } },
    handler(args) {
      if (!window._deckTemplateRegistry) return { error: 'system_not_initialized' };
      return window._deckTemplateRegistry.listTemplates(args);
    }
  },
  'decktemplate.delete': {
    description: 'Delete a deck template',
    parameters: { type: 'object', properties: { templateId: { type: 'string' } }, required: ['templateId'] },
    handler(args) {
      if (!window._deckTemplateRegistry) return { error: 'system_not_initialized' };
      return window._deckTemplateRegistry.deleteTemplate(args.templateId);
    }
  },
  'decktemplate.stats': {
    description: 'Get deck template stats',
    parameters: { type: 'object', properties: {} },
    handler() {
      if (!window._deckTemplateRegistry) return { error: 'system_not_initialized' };
      return window._deckTemplateRegistry.getStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DeckTemplate, DeckTemplateRegistry, DeckTemplateTools };
}
if (typeof window !== 'undefined') {
  window.DeckTemplate = DeckTemplate;
  window.DeckTemplateRegistry = DeckTemplateRegistry;
  window.DeckTemplateTools = DeckTemplateTools;
}