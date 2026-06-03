// ============================================================================
// Code Generation — V296 Direction E Iteration 6/9
// DocGenerator: 文档生成 (JSDoc/Markdown/索引/分类/搜索)
// 来源：claude-code + generic-agent + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  function DocGenerator(options) {
    options = options || {};
    this.entries = {};
    this.entriesByType = {};
    this.entryCounter = 0;
    this.maxEntries = options.maxEntries || 5000;
    this.metrics = { entries: 0, generated: 0 };
  }

  DocGenerator.prototype.add = function (entry) {
    if (!entry || typeof entry !== 'object') return { error: 'invalid_entry' };
    if (typeof entry.name !== 'string' || entry.name.length === 0) return { error: 'name_required' };
    if (Object.keys(this.entries).length >= this.maxEntries) return { error: 'max_reached' };
    var type = entry.type || 'misc';
    var id = entry.id || 'e_' + (++this.entryCounter) + '_' + Date.now();
    if (this.entries[id]) return { error: 'duplicate_id' };
    var e = {
      id: id,
      name: entry.name,
      type: type,
      description: entry.description || '',
      params: entry.params || [],
      returns: entry.returns || null,
      throws: entry.throws || [],
      examples: entry.examples || [],
      category: entry.category || 'general',
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      author: entry.author || null,
      version: entry.version || null,
      since: entry.since || null,
      deprecated: !!entry.deprecated,
      see: Array.isArray(entry.see) ? entry.see : [],
      createdAt: Date.now()
    };
    this.entries[id] = e;
    if (!this.entriesByType[type]) this.entriesByType[type] = [];
    this.entriesByType[type].push(id);
    this.metrics.entries++;
    return { success: true, id: id, entry: e };
  };

  DocGenerator.prototype.remove = function (id) {
    if (!this.entries[id]) return { error: 'not_found' };
    var e = this.entries[id];
    var list = this.entriesByType[e.type];
    if (list) {
      var idx = list.indexOf(id);
      if (idx !== -1) list.splice(idx, 1);
    }
    delete this.entries[id];
    return { success: true };
  };

  DocGenerator.prototype.get = function (id) {
    return this.entries[id] || null;
  };

  DocGenerator.prototype.list = function (filter) {
    var arr = [];
    for (var k in this.entries) {
      if (Object.prototype.hasOwnProperty.call(this.entries, k)) {
        var e = this.entries[k];
        if (filter) {
          if (filter.type && e.type !== filter.type) continue;
          if (filter.category && e.category !== filter.category) continue;
          if (filter.tag && e.tags.indexOf(filter.tag) === -1) continue;
        }
        arr.push(e);
      }
    }
    return arr;
  };

  DocGenerator.prototype.search = function (query) {
    var q = (query || '').toLowerCase();
    var results = [];
    for (var k in this.entries) {
      if (Object.prototype.hasOwnProperty.call(this.entries, k)) {
        var e = this.entries[k];
        if (!q) { results.push(e); continue; }
        if (e.name.toLowerCase().indexOf(q) !== -1) results.push(e);
        else if (e.description.toLowerCase().indexOf(q) !== -1) results.push(e);
        else if (e.tags.some(function (t) { return t.toLowerCase().indexOf(q) !== -1; })) results.push(e);
      }
    }
    return results;
  };

  // ---- Generate JSDoc for an entry ----
  DocGenerator.prototype.generateJSDoc = function (id) {
    var e = this.entries[id];
    if (!e) return null;
    var lines = ['/**'];
    if (e.description) lines.push(' * ' + e.description);
    if (e.deprecated) lines.push(' * @deprecated');
    if (e.since) lines.push(' * @since ' + e.since);
    for (var i = 0; i < e.params.length; i++) {
      var p = e.params[i];
      var pStr = ' * @param';
      if (p.type) pStr += ' {' + p.type + '}';
      pStr += ' ' + p.name;
      if (p.description) pStr += ' - ' + p.description;
      if (p.optional) pStr += ' [optional]';
      lines.push(pStr);
    }
    if (e.returns) {
      lines.push(' * @returns' + (e.returns.type ? ' {' + e.returns.type + '}' : '') + (e.returns.description ? ' ' + e.returns.description : ''));
    }
    for (var t = 0; t < e.throws.length; t++) {
      lines.push(' * @throws {' + e.throws[t].type + '} ' + e.throws[t].description);
    }
    for (var x = 0; x < e.examples.length; x++) {
      lines.push(' * @example');
      lines.push(' * ' + e.examples[x]);
    }
    for (var s = 0; s < e.see.length; s++) {
      lines.push(' * @see ' + e.see[s]);
    }
    lines.push(' */');
    this.metrics.generated++;
    return lines.join('\n');
  };

  // ---- Generate Markdown documentation for an entry ----
  DocGenerator.prototype.generateMarkdown = function (id) {
    var e = this.entries[id];
    if (!e) return null;
    var lines = [];
    lines.push('### ' + e.name);
    if (e.deprecated) lines.push('> **DEPRECATED**');
    if (e.description) lines.push(e.description);
    lines.push('');
    if (e.params.length > 0) {
      lines.push('**Parameters:**');
      lines.push('');
      lines.push('| Name | Type | Optional | Description |');
      lines.push('|------|------|----------|-------------|');
      for (var i = 0; i < e.params.length; i++) {
        var p = e.params[i];
        lines.push('| ' + p.name + ' | ' + (p.type || '-') + ' | ' + (p.optional ? 'yes' : 'no') + ' | ' + (p.description || '') + ' |');
      }
      lines.push('');
    }
    if (e.returns) {
      lines.push('**Returns:** ' + (e.returns.type || 'any') + (e.returns.description ? ' - ' + e.returns.description : ''));
      lines.push('');
    }
    if (e.examples.length > 0) {
      lines.push('**Examples:**');
      lines.push('');
      for (var x = 0; x < e.examples.length; x++) {
        lines.push('```');
        lines.push(e.examples[x]);
        lines.push('```');
      }
      lines.push('');
    }
    if (e.tags.length > 0) {
      lines.push('Tags: ' + e.tags.map(function (t) { return '`' + t + '`'; }).join(', '));
    }
    this.metrics.generated++;
    return lines.join('\n');
  };

  // ---- Generate index for all entries ----
  DocGenerator.prototype.generateIndex = function (options) {
    options = options || {};
    var format = options.format || 'markdown';
    var lines = [];
    if (format === 'markdown') {
      lines.push('# Documentation Index');
      lines.push('');
      lines.push('Total: ' + Object.keys(this.entries).length + ' entries');
      lines.push('');
      // group by type
      for (var t in this.entriesByType) {
        if (Object.prototype.hasOwnProperty.call(this.entriesByType, t)) {
          lines.push('## ' + t);
          lines.push('');
          for (var i = 0; i < this.entriesByType[t].length; i++) {
            var e = this.entries[this.entriesByType[t][i]];
            lines.push('- **' + e.name + '** - ' + (e.description || '(no description)'));
          }
          lines.push('');
        }
      }
    } else {
      lines.push('# Documentation Index\n');
      var all = this.list();
      for (var k = 0; k < all.length; k++) {
        var e2 = all[k];
        lines.push(e2.name + ' (' + e2.type + ')');
      }
    }
    this.metrics.generated++;
    return lines.join('\n');
  };

  DocGenerator.prototype.listTypes = function () {
    var arr = [];
    for (var k in this.entriesByType) {
      if (Object.prototype.hasOwnProperty.call(this.entriesByType, k)) {
        arr.push({ type: k, count: this.entriesByType[k].length });
      }
    }
    return arr;
  };

  DocGenerator.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  DocGenerator.prototype.getSummary = function () {
    return {
      total: Object.keys(this.entries).length,
      types: this.listTypes().length,
      metrics: this.metrics
    };
  };

  DocGenerator.prototype.clear = function () {
    this.entries = {};
    this.entriesByType = {};
    this.metrics = { entries: 0, generated: 0 };
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.DocGenerator = DocGenerator;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DocGenerator: DocGenerator };
  }
})();
