// ============================================================================
// shared/index.js — shared 层统一导出
// 所有 domain 模块通过此文件引入 shared 层工具
// ============================================================================
'use strict';

module.exports = {
  Storage:      require('./utils/storage'),
  Random:       require('./utils/random'),
  MathUtil:     require('./utils/math'),
  EventBus:     require('./utils/event-bus'),
  GameConstants:require('./constants/game-constants')
};

// 浏览器端全局暴露
if (typeof window !== 'undefined') {
  window.Storage       = window.Storage       || {};
  window.Random        = window.Random        || {};
  window.MathUtil      = window.MathUtil      || {};
  window.EventBus      = window.EventBus      || {};
  window.GameConstants = window.GameConstants || {};
}