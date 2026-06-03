// ============================================================================
// Code Generation — V291 Direction E Iteration 1/9
// CodeTemplate: 模板引擎 (变量/条件/循环/函数/过滤器/包含)
// 来源：claude-code + generic-agent + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  function CodeTemplate(options) {
    options = options || {};
    this.templates = {};
    this.helpers = {};
    this.filters = {};
    this.maxDepth = options.maxDepth || 10;
    // builtin filters
    this.filters.upper = function (s) { return String(s).toUpperCase(); };
    this.filters.lower = function (s) { return String(s).toLowerCase(); };
    this.filters.trim = function (s) { return String(s).trim(); };
    this.filters.length = function (s) { return s == null ? 0 : s.length; };
    this.filters.json = function (s) { return JSON.stringify(s); };
  }

  CodeTemplate.prototype.register = function (name, template) {
    if (typeof name !== 'string' || name.length === 0) return { error: 'invalid_name' };
    if (typeof template !== 'string') return { error: 'invalid_template' };
    this.templates[name] = template;
    return { success: true };
  };

  CodeTemplate.prototype.unregister = function (name) {
    if (!this.templates[name]) return { error: 'not_found' };
    delete this.templates[name];
    return { success: true };
  };

  CodeTemplate.prototype.get = function (name) {
    return this.templates[name] || null;
  };

  CodeTemplate.prototype.registerHelper = function (name, fn) {
    if (typeof name !== 'string' || name.length === 0) return { error: 'invalid_name' };
    if (typeof fn !== 'function') return { error: 'invalid_fn' };
    this.helpers[name] = fn;
    return { success: true };
  };

  CodeTemplate.prototype.registerFilter = function (name, fn) {
    if (typeof name !== 'string' || name.length === 0) return { error: 'invalid_name' };
    if (typeof fn !== 'function') return { error: 'invalid_fn' };
    this.filters[name] = fn;
    return { success: true };
  };

  CodeTemplate.prototype._resolveValue = function (key, ctx) {
    if (ctx == null) return undefined;
    var parts = key.split('.');
    var val = ctx;
    for (var i = 0; i < parts.length; i++) {
      if (val == null) return undefined;
      val = val[parts[i]];
    }
    return val;
  };

  CodeTemplate.prototype._applyFilter = function (value, filterStr) {
    if (!filterStr) return value;
    var self = this;
    var parts = filterStr.split('|');
    var result = value;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      var colonIdx = p.indexOf(':');
      var name, arg;
      if (colonIdx !== -1) {
        name = p.substring(0, colonIdx).trim();
        arg = p.substring(colonIdx + 1).trim();
      } else {
        name = p;
        arg = null;
      }
      if (self.filters[name]) {
        result = arg != null ? self.filters[name](result, arg) : self.filters[name](result);
      } else {
        // unknown filter: pass through
        result = result;
      }
    }
    return result;
  };

  CodeTemplate.prototype.render = function (template, context) {
    if (typeof template !== 'string') return { error: 'invalid_template' };
    var self = this;
    var ctx = context || {};
    // First pass: process for loops (substitute expanded content)
    var processed = self._expandFor(template, ctx);
    // Second pass: process if/else and variables
    var output = self._expandTags(processed, ctx);
    return { success: true, text: output };
  };

  CodeTemplate.prototype._expandFor = function (template, ctx) {
    var self = this;
    var re = /\{%\s*for\s+(\w+)\s+in\s+([^\s%]+)\s*%\}([\s\S]*?)\{%\s*endfor\s*%\}/g;
    var depth = 0;
    var maxDepth = 10;
    var changed = true;
    while (changed && depth < maxDepth) {
      changed = false;
      re.lastIndex = 0;
      var newTpl = template.replace(re, function (match, varName, listKey, body) {
        var list = self._resolveValue(listKey, ctx);
        if (!Array.isArray(list)) list = [];
        var out = '';
        for (var i = 0; i < list.length; i++) {
          var subCtx = Object.assign({}, ctx);
          subCtx[varName] = list[i];
          out += self._expandFor(body, subCtx);
        }
        changed = true;
        return out;
      });
      if (newTpl !== template) {
        template = newTpl;
        depth++;
      }
    }
    return template;
  };

  CodeTemplate.prototype._expandTags = function (template, ctx) {
    var self = this;
    var output = '';
    var pos = 0;
    // pre-process if/else
    var processed = template.replace(/\{%\s*if\s+([^%]+?)\s*%\}([\s\S]*?)(?:\{%\s*else\s*%\}([\s\S]*?))?\{%\s*endif\s*%\}/g, function (match, cond, ifBody, elseBody) {
      var truthy = self._evalCondition(cond.trim(), ctx);
      return truthy ? ifBody : (elseBody || '');
    });
    // replace variables and includes
    var re = /\{\{([^{}]*?)\}\}|\{%\s*([^{}]*?)\s*%\}|\{#\s*([^{}]*?)\s*#\}/g;
    var match;
    while ((match = re.exec(processed)) !== null) {
      output += processed.substring(pos, match.index);
      pos = match.index + match[0].length;
      if (match[1] !== undefined) {
        var expr = match[1].trim();
        var pipeIdx = expr.indexOf('|');
        var key, filterStr;
        if (pipeIdx !== -1) {
          key = expr.substring(0, pipeIdx).trim();
          filterStr = expr.substring(pipeIdx + 1).trim();
        } else {
          key = expr;
        }
        var val = self._resolveValue(key, ctx);
        if (val === undefined || val === null) val = '';
        val = self._applyFilter(val, filterStr);
        output += String(val);
      } else if (match[2] !== undefined) {
        var tag = match[2].trim();
        var spaceIdx = tag.indexOf(' ');
        var tagName = spaceIdx !== -1 ? tag.substring(0, spaceIdx) : tag;
        var tagArgs = spaceIdx !== -1 ? tag.substring(spaceIdx + 1).trim() : '';
        if (tagName === 'include') {
          var incTpl = self.templates[tagArgs];
          if (incTpl) {
            var incResult = self.render(incTpl, ctx);
            output += incResult.text || '';
          }
        }
      }
    }
    output += processed.substring(pos);
    return output;
  };

  CodeTemplate.prototype._evalCondition = function (cond, ctx) {
    var self = this;
    // equality
    var eqMatch = cond.match(/^(\S+)\s*==\s*['"]?([^'"]*?)['"]?$/);
    if (eqMatch) {
      return String(self._resolveValue(eqMatch[1], ctx)) === eqMatch[2];
    }
    // inequality
    var neMatch = cond.match(/^(\S+)\s*!=\s*['"]?([^'"]*?)['"]?$/);
    if (neMatch) {
      return String(self._resolveValue(neMatch[1], ctx)) !== neMatch[2];
    }
    // truthy
    return !!self._resolveValue(cond, ctx);
  };

  CodeTemplate.prototype.renderString = function (template, context) {
    var r = this.render(template, context);
    return r.text || '';
  };

  CodeTemplate.prototype.renderTemplate = function (name, context) {
    var tpl = this.templates[name];
    if (!tpl) return { error: 'template_not_found' };
    return this.render(tpl, context);
  };

  CodeTemplate.prototype.listTemplates = function () {
    return Object.keys(this.templates);
  };

  CodeTemplate.prototype.listHelpers = function () {
    return Object.keys(this.helpers);
  };

  CodeTemplate.prototype.listFilters = function () {
    return Object.keys(this.filters);
  };

  CodeTemplate.prototype.getMetrics = function () {
    return {
      templates: Object.keys(this.templates).length,
      helpers: Object.keys(this.helpers).length,
      filters: Object.keys(this.filters).length
    };
  };

  CodeTemplate.prototype.clear = function () {
    this.templates = {};
    this.helpers = {};
    // keep builtin filters
    this.filters = {};
    this.filters.upper = function (s) { return String(s).toUpperCase(); };
    this.filters.lower = function (s) { return String(s).toLowerCase(); };
    this.filters.trim = function (s) { return String(s).trim(); };
    this.filters.length = function (s) { return s == null ? 0 : s.length; };
    this.filters.json = function (s) { return JSON.stringify(s); };
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.CodeTemplate = CodeTemplate;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CodeTemplate: CodeTemplate };
  }
})();
