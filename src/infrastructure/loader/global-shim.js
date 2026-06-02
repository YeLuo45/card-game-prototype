// ============================================================================
// src/infrastructure/loader/global-shim.js
// 声明所有在模块间隐式引用的全局变量，防止 ReferenceError。
// 必须在所有其他脚本之前加载。
// ============================================================================
window.CARDS              = window.CARDS              || {};
window.ENEMIES            = window.ENEMIES            || {};
window.RELICS             = window.RELICS             || {};
window.GUILD              = window.GUILD             || {};
window.META               = window.META              || {};
window.PROGRESSION        = window.PROGRESSION        || {};
window.SOCIAL             = window.SOCIAL             || {};
window.BATTLE             = window.BATTLE             || {};
window.UI                 = window.UI                 || {};
window.USECASES           = window.USECASES           || {};
window.CARD_SERVICES_OTHER = window.CARD_SERVICES_OTHER || {};
window.PACKS              = window.PACKS              || [];
window.CARD_PACKS         = window.CARD_PACKS         || {};

// 浏览器环境下兼容 CommonJS 导出写法
if (typeof window.module === 'undefined') {
  window.module = { exports: {} };
}
if (typeof window.exports === 'undefined') {
  window.exports = window.module.exports;
}
if (typeof window.require === 'undefined') {
  window.require = function() { return window.module.exports; };
}
var module = window.module;
var exports = window.exports;
var require = window.require;