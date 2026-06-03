// ============================================================================
// Code Generation — V298 Direction E Iteration 8/9
// CodeAnalyzer: 代码分析 (复杂度/依赖/圈复杂度/质量/导入导出)
// 来源：claude-code + generic-agent + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  function CodeAnalyzer(options) {
    options = options || {};
    this.analyses = {};
    this.metrics = { analyses: 0, lines: 0 };
  }

  // ---- Line counting ----
  CodeAnalyzer.prototype.countLines = function (source) {
    if (typeof source !== 'string') return { error: 'invalid_source' };
    var total = source.split('\n').length;
    var nonEmpty = source.split('\n').filter(function (l) { return l.trim().length > 0; }).length;
    var comments = source.split('\n').filter(function (l) { return /^\s*\/\//.test(l) || /^\s*\/\*/.test(l); }).length;
    return { total: total, nonEmpty: nonEmpty, comments: comments, code: nonEmpty - comments };
  };

  // ---- Cyclomatic complexity (simplified) ----
  CodeAnalyzer.prototype.cyclomaticComplexity = function (fn) {
    if (typeof fn === 'function') fn = fn.toString();
    if (typeof fn !== 'string') return { error: 'invalid_input' };
    var count = 1;  // base
    var patterns = [
      /\bif\s*\(/g,
      /\belse\s+if\s*\(/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /\?\?/g,
      /\&\&/g,
      /\|\|/g
    ];
    for (var i = 0; i < patterns.length; i++) {
      var matches = fn.match(patterns[i]);
      if (matches) count += matches.length;
    }
    var level;
    if (count <= 5) level = 'low';
    else if (count <= 10) level = 'moderate';
    else if (count <= 20) level = 'high';
    else level = 'very_high';
    return { complexity: count, level: level };
  };

  // ---- Find function declarations ----
  CodeAnalyzer.prototype.findFunctions = function (source) {
    if (typeof source !== 'string') return { error: 'invalid_source' };
    var fns = [];
    var re = /function\s+(\w+)\s*\(([^)]*)\)/g;
    var match;
    while ((match = re.exec(source)) !== null) {
      fns.push({ name: match[1], params: match[2].split(',').map(function (p) { return p.trim(); }).filter(function (x) { return x; }), position: match.index });
    }
    return fns;
  };

  // ---- Find variable declarations ----
  CodeAnalyzer.prototype.findVariables = function (source) {
    if (typeof source !== 'string') return { error: 'invalid_source' };
    var vars = [];
    var re = /(var|let|const)\s+(\w+)\s*=\s*([^;]+);?/g;
    var match;
    while ((match = re.exec(source)) !== null) {
      vars.push({ keyword: match[1], name: match[2], value: match[3].trim(), position: match.index });
    }
    return vars;
  };

  // ---- Find imports ----
  CodeAnalyzer.prototype.findImports = function (source) {
    if (typeof source !== 'string') return { error: 'invalid_source' };
    var imps = [];
    var re = /import\s+(?:\{([^}]+)\}\s+from\s+|(\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
    var match;
    while ((match = re.exec(source)) !== null) {
      var named = match[1] ? match[1].split(',').map(function (n) { return n.trim(); }).filter(function (x) { return x; }) : null;
      var def = match[2] || null;
      imps.push({ named: named, default: def, source: match[3] });
    }
    return imps;
  };

  // ---- Find requires ----
  CodeAnalyzer.prototype.findRequires = function (source) {
    if (typeof source !== 'string') return { error: 'invalid_source' };
    var reqs = [];
    var re = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    var match;
    while ((match = re.exec(source)) !== null) {
      reqs.push({ source: match[1] });
    }
    return reqs;
  };

  // ---- Find exports ----
  CodeAnalyzer.prototype.findExports = function (source) {
    if (typeof source !== 'string') return { error: 'invalid_source' };
    var exps = [];
    // module.exports = ...
    var m = source.match(/module\.exports\s*=\s*([^;]+);?/);
    if (m) exps.push({ type: 'default', value: m[1].trim() });
    // exports.x = ...
    var re = /exports\.(\w+)\s*=\s*([^;]+);?/g;
    var match;
    while ((match = re.exec(source)) !== null) {
      exps.push({ type: 'named', name: match[1], value: match[2].trim() });
    }
    return exps;
  };

  // ---- Find dependencies (combines imports + requires) ----
  CodeAnalyzer.prototype.findDependencies = function (source) {
    if (typeof source !== 'string') return { error: 'invalid_source' };
    var deps = [];
    var imps = this.findImports(source);
    for (var i = 0; i < imps.length; i++) {
      if (imps[i].source) deps.push({ source: imps[i].source, kind: 'import' });
    }
    var reqs = this.findRequires(source);
    for (var j = 0; j < reqs.length; j++) {
      deps.push({ source: reqs[j].source, kind: 'require' });
    }
    return deps;
  };

  // ---- Code quality score (0-100) ----
  CodeAnalyzer.prototype.qualityScore = function (source) {
    if (typeof source !== 'string') return { error: 'invalid_source' };
    var lines = this.countLines(source);
    var avgLineLen = source.length / Math.max(1, lines.total);
    var funcs = this.findFunctions(source);
    var vars = this.findVariables(source);
    var unusedVars = vars.filter(function (v) { return source.split(v.name).length <= 2; }).length;  // declared but no other use
    var score = 100;
    // penalties
    if (avgLineLen > 100) score -= 10;
    if (avgLineLen > 150) score -= 20;
    if (lines.code > 500) score -= 10;  // file too long
    if (unusedVars > 0) score -= unusedVars * 5;
    if (funcs.length === 0 && lines.code > 50) score -= 15;  // no decomposition
    if (lines.comments / Math.max(1, lines.code) < 0.05) score -= 5;  // low comment ratio
    score = Math.max(0, score);
    return {
      score: score,
      averageLineLength: avgLineLen,
      lines: lines,
      functions: funcs.length,
      variables: vars.length,
      unusedVariables: unusedVars
    };
  };

  // ---- Find issues ----
  CodeAnalyzer.prototype.findIssues = function (source) {
    if (typeof source !== 'string') return { error: 'invalid_source' };
    var issues = [];
    var lines = source.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      // console.log
      if (/console\.log\s*\(/.test(l)) {
        issues.push({ line: i + 1, severity: 'low', type: 'console_log', message: 'console.log left in code' });
      }
      // debugger
      if (/\bdebugger\b/.test(l)) {
        issues.push({ line: i + 1, severity: 'high', type: 'debugger', message: 'debugger statement' });
      }
      // TODO
      if (/TODO|FIXME|XXX/.test(l)) {
        issues.push({ line: i + 1, severity: 'low', type: 'todo', message: 'TODO/FIXME comment' });
      }
      // very long line
      if (l.length > 200) {
        issues.push({ line: i + 1, severity: 'medium', type: 'long_line', message: 'line > 200 chars' });
      }
      // empty catch
      if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(l)) {
        issues.push({ line: i + 1, severity: 'medium', type: 'empty_catch', message: 'empty catch block' });
      }
    }
    return issues;
  };

  // ---- Comprehensive analysis ----
  CodeAnalyzer.prototype.analyze = function (source, options) {
    if (typeof source !== 'string') return { error: 'invalid_source' };
    options = options || {};
    var result = {
      timestamp: Date.now(),
      lines: this.countLines(source),
      functions: this.findFunctions(source),
      variables: this.findVariables(source),
      imports: this.findImports(source),
      requires: this.findRequires(source),
      exports: this.findExports(source),
      dependencies: this.findDependencies(source),
      quality: this.qualityScore(source),
      issues: this.findIssues(source)
    };
    if (options.includeComplexity) {
      result.complexity = [];
      for (var i = 0; i < result.functions.length; i++) {
        var cc = this.cyclomaticComplexity(source.substring(result.functions[i].position, source.length));
        result.complexity.push({ function: result.functions[i].name, ...cc });
      }
    }
    this.metrics.analyses++;
    this.metrics.lines += result.lines.total;
    var id = 'a_' + this.metrics.analyses;
    this.analyses[id] = result;
    return { success: true, id: id, result: result };
  };

  CodeAnalyzer.prototype.getAnalysis = function (id) {
    return this.analyses[id] || null;
  };

  CodeAnalyzer.prototype.listAnalyses = function () {
    var arr = [];
    for (var k in this.analyses) {
      if (Object.prototype.hasOwnProperty.call(this.analyses, k)) {
        arr.push({ id: k, score: this.analyses[k].quality.score, lines: this.analyses[k].lines.total });
      }
    }
    return arr;
  };

  CodeAnalyzer.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  CodeAnalyzer.prototype.clear = function () {
    this.analyses = {};
    this.metrics = { analyses: 0, lines: 0 };
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.CodeAnalyzer = CodeAnalyzer;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CodeAnalyzer: CodeAnalyzer };
  }
})();
