// ============================================================================
// Code Generation — V294 Direction E Iteration 4/9
// CodeRefactor: 重构工具 (rename/extract/inline/format/move)
// 来源：claude-code + generic-agent + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  function CodeRefactor(options) {
    options = options || {};
    this.operations = [];
    this.metrics = { performed: 0 };
    this.maxOperations = options.maxOperations || 1000;
  }

  // ---- Rename identifier ----
  CodeRefactor.prototype.rename = function (source, oldName, newName, options) {
    if (typeof source !== 'string') return { error: 'invalid_source' };
    if (typeof oldName !== 'string' || oldName.length === 0) return { error: 'invalid_old_name' };
    if (typeof newName !== 'string' || newName.length === 0) return { error: 'invalid_new_name' };
    options = options || {};
    var scope = options.scope || 'all';
    // whole-word match with word boundaries
    var pattern;
    if (options.regex) pattern = new RegExp(oldName, options.regexFlags || 'g');
    else pattern = new RegExp('\\b' + this._escapeRegex(oldName) + '\\b', 'g');
    var count = 0;
    var result = source.replace(pattern, function (match) {
      count++;
      return newName;
    });
    this._recordOperation({ type: 'rename', old: oldName, new: newName, count: count });
    return { success: true, original: source, refactored: result, replacements: count };
  };

  // ---- Extract function ----
  CodeRefactor.prototype.extractFunction = function (source, config) {
    if (typeof source !== 'string') return { error: 'invalid_source' };
    if (!config || typeof config !== 'object') return { error: 'invalid_config' };
    if (!config.name || typeof config.name !== 'string') return { error: 'invalid_name' };
    if (typeof config.startLine !== 'number' || typeof config.endLine !== 'number') return { error: 'invalid_lines' };
    var lines = source.split('\n');
    if (config.startLine < 0 || config.endLine >= lines.length || config.startLine > config.endLine) {
      return { error: 'out_of_range' };
    }
    var params = config.params || [];
    var paramList = params.join(', ');
    var body = lines.slice(config.startLine, config.endLine + 1);
    var indent = body[0].match(/^(\s*)/)[1] || '';
    var bodyText = body.map(function (l) { return l.replace(new RegExp('^' + indent), ''); }).join('\n');
    var fnCode = indent + 'function ' + config.name + ' (' + paramList + ') {\n' + bodyText + '\n' + indent + '}';
    var newLines = lines.slice(0, config.startLine).concat([fnCode]).concat(lines.slice(config.endLine + 1));
    var result = newLines.join('\n');
    this._recordOperation({ type: 'extractFunction', name: config.name, lines: [config.startLine, config.endLine] });
    return { success: true, refactored: result, extracted: fnCode };
  };

  // ---- Inline variable ----
  CodeRefactor.prototype.inlineVariable = function (source, varName, options) {
    if (typeof source !== 'string') return { error: 'invalid_source' };
    if (typeof varName !== 'string') return { error: 'invalid_var' };
    options = options || {};
    var lines = source.split('\n');
    var declRe = new RegExp('^(\\s*)(const|let|var)\\s+' + this._escapeRegex(varName) + '\\s*=\\s*([^;]+);?\\s*$');
    var declIdx = -1;
    var value = null;
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(declRe);
      if (m) {
        declIdx = i;
        value = m[3].trim();
        break;
      }
    }
    if (declIdx === -1) return { error: 'declaration_not_found' };
    // replace usages with value
    var useRe = new RegExp('\\b' + this._escapeRegex(varName) + '\\b', 'g');
    var count = 0;
    var newLines = lines.map(function (l, idx) {
      if (idx === declIdx) return null;
      return l.replace(useRe, function () { count++; return value; });
    }).filter(function (l) { return l !== null; });
    this._recordOperation({ type: 'inlineVariable', name: varName, count: count });
    return { success: true, refactored: newLines.join('\n'), replacements: count, value: value };
  };

  // ---- Format code (simple) ----
  CodeRefactor.prototype.format = function (source, options) {
    if (typeof source !== 'string') return { error: 'invalid_source' };
    options = options || {};
    var indentStr = options.indent || '  ';
    var lines = source.split('\n');
    var depth = 0;
    var formatted = [];
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      var trimmed = l.trim();
      if (trimmed.length === 0) {
        formatted.push('');
        continue;
      }
      // decrease depth before lines starting with closing brace
      if (trimmed.charAt(0) === '}') depth = Math.max(0, depth - 1);
      formatted.push(indentStr.repeat(depth) + trimmed);
      // increase depth if line ends with opening brace
      if (trimmed.charAt(trimmed.length - 1) === '{') depth++;
    }
    this._recordOperation({ type: 'format' });
    return { success: true, refactored: formatted.join('\n') };
  };

  // ---- Move code (cut and paste lines) ----
  CodeRefactor.prototype.moveLines = function (source, fromStart, fromEnd, toLine) {
    if (typeof source !== 'string') return { error: 'invalid_source' };
    var lines = source.split('\n');
    if (fromStart < 0 || fromEnd >= lines.length || fromStart > fromEnd) return { error: 'invalid_range' };
    if (toLine < 0 || toLine > lines.length) return { error: 'invalid_target' };
    var block = lines.slice(fromStart, fromEnd + 1);
    var remaining = lines.slice(0, fromStart).concat(lines.slice(fromEnd + 1));
    var insertAt = toLine > fromStart ? toLine - block.length : toLine;
    var newLines = remaining.slice(0, insertAt).concat(block).concat(remaining.slice(insertAt));
    this._recordOperation({ type: 'move', from: fromStart, to: toLine });
    return { success: true, refactored: newLines.join('\n') };
  };

  // ---- Replace pattern ----
  CodeRefactor.prototype.replace = function (source, search, replace, options) {
    if (typeof source !== 'string') return { error: 'invalid_source' };
    if (typeof search !== 'string' && !(search instanceof RegExp)) return { error: 'invalid_search' };
    if (typeof replace !== 'string') return { error: 'invalid_replace' };
    options = options || {};
    var re = search instanceof RegExp ? search : new RegExp(this._escapeRegex(search), options.flags || 'g');
    var count = 0;
    var result = source.replace(re, function () {
      count++;
      return replace;
    });
    this._recordOperation({ type: 'replace', count: count });
    return { success: true, refactored: result, replacements: count };
  };

  // ---- Extract constant ----
  CodeRefactor.prototype.extractConstant = function (source, value, name) {
    if (typeof source !== 'string') return { error: 'invalid_source' };
    if (typeof name !== 'string') return { error: 'invalid_name' };
    var re = new RegExp(this._escapeRegex(String(value)), 'g');
    var count = 0;
    var refactored = source.replace(re, function () { count++; return name; });
    var constLine = 'const ' + name + ' = ' + JSON.stringify(value) + ';\n';
    refactored = constLine + refactored;
    this._recordOperation({ type: 'extractConstant', name: name, count: count });
    return { success: true, refactored: refactored, replacements: count };
  };

  // ---- Generate diff (line-by-line) ----
  CodeRefactor.prototype.diff = function (oldSource, newSource) {
    if (typeof oldSource !== 'string' || typeof newSource !== 'string') return { error: 'invalid_input' };
    var oldLines = oldSource.split('\n');
    var newLines = newSource.split('\n');
    var ops = [];
    var maxLen = Math.max(oldLines.length, newLines.length);
    for (var i = 0; i < maxLen; i++) {
      if (i >= oldLines.length) ops.push({ op: 'add', line: i + 1, content: newLines[i] });
      else if (i >= newLines.length) ops.push({ op: 'remove', line: i + 1, content: oldLines[i] });
      else if (oldLines[i] !== newLines[i]) ops.push({ op: 'modify', line: i + 1, old: oldLines[i], new: newLines[i] });
    }
    return { operations: ops, added: ops.filter(function (o) { return o.op === 'add'; }).length, removed: ops.filter(function (o) { return o.op === 'remove'; }).length, modified: ops.filter(function (o) { return o.op === 'modify'; }).length };
  };

  CodeRefactor.prototype._recordOperation = function (op) {
    this.operations.push(op);
    if (this.operations.length > this.maxOperations) this.operations = this.operations.slice(-this.maxOperations);
    this.metrics.performed++;
  };

  CodeRefactor.prototype._escapeRegex = function (s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  CodeRefactor.prototype.getHistory = function () {
    return this.operations.slice();
  };

  CodeRefactor.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  CodeRefactor.prototype.clear = function () {
    this.operations = [];
    this.metrics = { performed: 0 };
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.CodeRefactor = CodeRefactor;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CodeRefactor: CodeRefactor };
  }
})();
