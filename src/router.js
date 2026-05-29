// ============================================================================
// src/router.js — 前端路由
// 基于 hash (#/) 或 path (/)，按需加载模块，screen 切换
// ============================================================================
'use strict';

var _routes = {};
var _current = null;

/**
 * 路由注册
 * @param {string} path   — e.g. '/deck-builder', '#/arena'
 * @param {object} config — { screen: 'deck-studio', module: 'src/ui/screens/deck-studio.screen.js', onEnter }
 */
function register(path, config) {
  _routes[path] = config;
}

/** 初始化路由，监听 hashchange */
function init() {
  window.addEventListener('hashchange', onHashChange);
  // 首次加载
  var initial = getCurrentPath();
  if (initial && _routes[initial]) {
    navigateTo(initial, true /* silent — no history push */);
  } else {
    // 默认路由
    var defaultPath = Object.keys(_routes)[0];
    if (defaultPath) window.location.hash = defaultPath;
  }
}

function onHashChange() {
  var path = getCurrentPath();
  if (path && _routes[path] && path !== _current) {
    navigateTo(path, false);
  }
}

function getCurrentPath() {
  var hash = window.location.hash;
  return hash.startsWith('#') ? hash.slice(1) : (hash || '/');
}

function navigateTo(path, silent) {
  var route = _routes[path];
  if (!route) return;

  if (_current && _current !== path) {
    // 触发 exit hook
    var prev = _routes[_current];
    if (prev && prev.onExit) prev.onExit();
  }

  _current = path;

  if (!silent) {
    window.location.hash = path;
  }

  // 动态加载模块
  if (route.module && window.Boot && window.Boot.loadModule) {
    window.Boot.loadModule(route.module).then(function() {
      if (route.onEnter) route.onEnter();
      if (window.EventBus) window.EventBus.emit('route:changed', { path: path });
    }).catch(function(err) {
      console.error('[router] Failed to load module:', route.module, err);
    });
  } else {
    if (route.onEnter) route.onEnter();
    if (window.EventBus) window.EventBus.emit('route:changed', { path: path });
  }
}

// ─── 公开 API ────────────────────────────────────────────────────────────────
var Router = {
  register:   register,
  init:       init,
  navigate:   function(path) { navigateTo(path, false); },
  getCurrent: function() { return _current; }
};

window.Router = Router;
module.exports = Router;