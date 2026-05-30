// ============================================================================
// src/infrastructure/loader/global-shim.js
// 声明所有在模块间隐式引用的全局变量，防止 ReferenceError。
// 必须在 plugin-loader.js 之前加载。
// ============================================================================
window.CARDS     = window.CARDS     || {};
window.ENEMIES   = window.ENEMIES   || {};
window.RELICS    = window.RELICS    || {};
window.GUILD     = window.GUILD     || {};
window.META      = window.META      || {};
window.PROGRESSION = window.PROGRESSION || {};
window.SOCIAL    = window.SOCIAL    || {};
window.BATTLE    = window.BATTLE    || {};
window.UI        = window.UI        || {};
window.USECASES  = window.USECASES  || {};
window.CARD_SERVICES_OTHER = window.CARD_SERVICES_OTHER || {};