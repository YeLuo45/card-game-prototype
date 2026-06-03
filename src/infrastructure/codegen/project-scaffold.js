// ============================================================================
// Code Generation — V293 Direction E Iteration 3/9
// ProjectScaffold: 项目脚手架 (目录结构/文件模板/初始化/校验)
// 来源：claude-code + generic-agent + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  function ProjectScaffold(options) {
    options = options || {};
    this.templates = {};
    this.layouts = {};
    this.metrics = { created: 0, files: 0 };
    this._registerBuiltinLayouts();
  }

  ProjectScaffold.prototype._registerBuiltinLayouts = function () {
    this.layouts['node-lib'] = {
      files: [
        { path: 'package.json', template: 'packageJson' },
        { path: 'index.js', template: 'mainIndex' },
        { path: 'README.md', template: 'readme' },
        { path: '.gitignore', template: 'gitignore' },
        { path: 'test/test.js', template: 'basicTest' }
      ]
    };
    this.layouts['node-app'] = {
      files: [
        { path: 'package.json', template: 'packageJson' },
        { path: 'src/index.js', template: 'mainIndex' },
        { path: 'README.md', template: 'readme' },
        { path: '.gitignore', template: 'gitignore' },
        { path: 'test/test.js', template: 'basicTest' }
      ]
    };
    this.layouts['web-vanilla'] = {
      files: [
        { path: 'index.html', template: 'indexHtml' },
        { path: 'app.js', template: 'appJs' },
        { path: 'style.css', template: 'css' },
        { path: 'README.md', template: 'readme' }
      ]
    };
  };

  ProjectScaffold.prototype.registerTemplate = function (name, content) {
    if (typeof name !== 'string' || name.length === 0) return { error: 'invalid_name' };
    if (typeof content !== 'string') return { error: 'invalid_content' };
    this.templates[name] = content;
    return { success: true };
  };

  ProjectScaffold.prototype.unregisterTemplate = function (name) {
    if (!this.templates[name]) return { error: 'not_found' };
    delete this.templates[name];
    return { success: true };
  };

  ProjectScaffold.prototype.getTemplate = function (name) {
    return this.templates[name] || null;
  };

  ProjectScaffold.prototype.listLayouts = function () {
    return Object.keys(this.layouts);
  };

  ProjectScaffold.prototype.listTemplates = function () {
    return Object.keys(this.templates);
  };

  ProjectScaffold.prototype.getLayout = function (name) {
    return this.layouts[name] || null;
  };

  ProjectScaffold.prototype.addLayout = function (name, layout) {
    if (typeof name !== 'string' || name.length === 0) return { error: 'invalid_name' };
    if (!layout || !Array.isArray(layout.files)) return { error: 'invalid_layout' };
    this.layouts[name] = layout;
    return { success: true };
  };

  // generate files for a layout
  ProjectScaffold.prototype.scaffold = function (layoutName, config) {
    var layout = this.layouts[layoutName];
    if (!layout) return { error: 'layout_not_found' };
    config = config || {};
    var files = [];
    for (var i = 0; i < layout.files.length; i++) {
      var entry = layout.files[i];
      var content = this._renderTemplate(entry.template, config);
      files.push({ path: entry.path, content: content });
    }
    this.metrics.created++;
    this.metrics.files += files.length;
    return { success: true, layout: layoutName, files: files, count: files.length };
  };

  ProjectScaffold.prototype._renderTemplate = function (name, config) {
    var t = this.templates[name];
    if (t) return this._interpolate(t, config);
    // fall back to default
    return this._defaultTemplate(name, config);
  };

  ProjectScaffold.prototype._interpolate = function (tpl, config) {
    return tpl.replace(/\{\{(\w+)\}\}/g, function (m, k) {
      return config[k] !== undefined ? String(config[k]) : '';
    });
  };

  ProjectScaffold.prototype._defaultTemplate = function (name, config) {
    var n = (config.name || 'project').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    var v = config.version || '1.0.0';
    var desc = config.description || 'A new project';
    var author = config.author || 'Anonymous';
    if (name === 'packageJson') {
      return JSON.stringify({
        name: n, version: v, description: desc, author: author, main: 'index.js',
        scripts: { test: 'echo "no tests"' }, license: 'MIT'
      }, null, 2);
    }
    if (name === 'mainIndex') {
      return '// ' + n + ' main entry\nmodule.exports = {\n  name: ' + "'" + n + "'" + '\n};\n';
    }
    if (name === 'readme') {
      return '# ' + n + '\n\n' + desc + '\n\nVersion: ' + v + '\nAuthor: ' + author + '\n';
    }
    if (name === 'gitignore') {
      return 'node_modules/\n*.log\n.DS_Store\ndist/\nbuild/\n';
    }
    if (name === 'basicTest') {
      return '// Basic test\nvar assert = require(\'assert\');\nassert(true);\nconsole.log("OK");\n';
    }
    if (name === 'indexHtml') {
      return '<!DOCTYPE html>\n<html>\n<head><title>' + n + '</title><link rel="stylesheet" href="style.css"></head>\n<body>\n<h1>' + n + '</h1>\n<script src="app.js"></script>\n</body>\n</html>\n';
    }
    if (name === 'appJs') {
      return '// ' + n + ' app\nconsole.log("' + n + ' loaded");\n';
    }
    if (name === 'css') {
      return 'body { font-family: sans-serif; margin: 0; padding: 20px; }\nh1 { color: #333; }\n';
    }
    return '';
  };

  // validate a file structure
  ProjectScaffold.prototype.validate = function (files) {
    if (!Array.isArray(files)) return { error: 'invalid_input' };
    var errors = [];
    var requiredPaths = new Set();
    var hasIndex = false;
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (!f.path) errors.push({ index: i, error: 'missing_path' });
      if (f.content === undefined) errors.push({ index: i, error: 'missing_content' });
      if (f.path && (f.path === 'index.js' || f.path === 'src/index.js' || f.path === 'index.html')) hasIndex = true;
    }
    return { valid: errors.length === 0, errors: errors, fileCount: files.length, hasIndex: hasIndex };
  };

  // merge: combine multiple scaffolds
  ProjectScaffold.prototype.merge = function (scaffoldResults) {
    if (!Array.isArray(scaffoldResults)) return { error: 'invalid_input' };
    var merged = { files: [] };
    var paths = {};
    for (var i = 0; i < scaffoldResults.length; i++) {
      var r = scaffoldResults[i];
      if (!r.files) continue;
      for (var j = 0; j < r.files.length; j++) {
        var f = r.files[j];
        if (!paths[f.path]) {
          paths[f.path] = true;
          merged.files.push(f);
        }
      }
    }
    return { success: true, files: merged.files, count: merged.files.length };
  };

  // file system simulation (since we're in JS)
  ProjectScaffold.prototype.simulateWrite = function (files) {
    if (!Array.isArray(files)) return { error: 'invalid_input' };
    var tree = {};
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      var parts = f.path.split('/');
      var node = tree;
      for (var k = 0; k < parts.length - 1; k++) {
        if (!node[parts[k]]) node[parts[k]] = {};
        node = node[parts[k]];
      }
      node[parts[parts.length - 1]] = (f.content || '').length;  // store size
    }
    return { success: true, tree: tree, count: files.length };
  };

  ProjectScaffold.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  ProjectScaffold.prototype.clear = function () {
    this.metrics = { created: 0, files: 0 };
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.ProjectScaffold = ProjectScaffold;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProjectScaffold: ProjectScaffold };
  }
})();
