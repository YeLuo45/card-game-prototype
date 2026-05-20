// plugin-api.js - V69 插件系统 API
// 统一插件接口：Card/Relic/Enemy/Event 注册

(function() {
  'use strict';

  // 插件注册中心
  const PluginRegistry = {
    cards: new Map(),
    relics: new Map(),
    enemies: new Map(),
    events: new Map(),
    plugins: new Map(),

    // 注册插件元数据
    registerPlugin(plugin) {
      if (!plugin || !plugin.id) {
        console.warn('[PluginAPI] Invalid plugin:', plugin);
        return;
      }
      this.plugins.set(plugin.id, { ...plugin, enabled: true });
      console.log(`[PluginAPI] Plugin registered: ${plugin.id} v${plugin.version || '1.0.0'}`);
    },

    // 批量注册卡牌
    registerCard(card) {
      if (!card || !card.id) {
        console.warn('[PluginAPI] Invalid card:', card);
        return;
      }
      if (this.cards.has(card.id)) {
        console.warn(`[PluginAPI] Card already exists: ${card.id}, skipping.`);
        return;
      }
      this.cards.set(card.id, card);
      console.log(`[PluginAPI] Card registered: ${card.id} - ${card.name}`);
    },

    // 批量注册卡牌（数组）
    registerCards(cards) {
      if (!Array.isArray(cards)) return;
      cards.forEach(card => this.registerCard(card));
    },

    // 批量注册遗物
    registerRelic(relic) {
      if (!relic || !relic.id) {
        console.warn('[PluginAPI] Invalid relic:', relic);
        return;
      }
      if (this.relics.has(relic.id)) {
        console.warn(`[PluginAPI] Relic already exists: ${relic.id}, skipping.`);
        return;
      }
      this.relics.set(relic.id, relic);
      console.log(`[PluginAPI] Relic registered: ${relic.id} - ${relic.name}`);
    },

    // 批量注册遗物（数组）
    registerRelics(relics) {
      if (!Array.isArray(relics)) return;
      relics.forEach(relic => this.registerRelic(relic));
    },

    // 批量注册敌人
    registerEnemy(enemy) {
      if (!enemy || !enemy.id) {
        console.warn('[PluginAPI] Invalid enemy:', enemy);
        return;
      }
      if (this.enemies.has(enemy.id)) {
        console.warn(`[PluginAPI] Enemy already exists: ${enemy.id}, skipping.`);
        return;
      }
      this.enemies.set(enemy.id, enemy);
      console.log(`[PluginAPI] Enemy registered: ${enemy.id} - ${enemy.name}`);
    },

    // 批量注册敌人（数组）
    registerEnemies(enemies) {
      if (!Array.isArray(enemies)) return;
      enemies.forEach(enemy => this.registerEnemy(enemy));
    },

    // 批量注册事件
    registerEvent(event) {
      if (!event || !event.id) {
        console.warn('[PluginAPI] Invalid event:', event);
        return;
      }
      if (this.events.has(event.id)) {
        console.warn(`[PluginAPI] Event already exists: ${event.id}, skipping.`);
        return;
      }
      this.events.set(event.id, event);
      console.log(`[PluginAPI] Event registered: ${event.id} - ${event.name}`);
    },

    // 批量注册事件（数组）
    registerEvents(events) {
      if (!Array.isArray(events)) return;
      events.forEach(event => this.registerEvent(event));
    },

    // 获取所有插件
    getPlugins() {
      return [...this.plugins.values()];
    },

    // 获取启用的插件
    getEnabledPlugins() {
      return this.getPlugins().filter(p => p.enabled !== false);
    },

    // 获取所有卡牌
    getCards() {
      return [...this.cards.values()];
    },

    // 获取所有遗物
    getRelics() {
      return [...this.relics.values()];
    },

    // 获取所有敌人
    getEnemies() {
      return [...this.enemies.values()];
    },

    // 获取所有事件
    getEvents() {
      return [...this.events.values()];
    },

    // 重置所有数据
    reset() {
      this.cards.clear();
      this.relics.clear();
      this.enemies.clear();
      this.events.clear();
      this.plugins.clear();
    }
  };

  // 沙箱化的工具函数（限制性 Math.random / console）
  const sandboxUtils = {
    log(...args) {
      console.log('[Plugin]', ...args);
    },
    random(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    clamp(val, min, max) {
      return Math.max(min, Math.min(max, val));
    }
  };

  // 插件加载器
  const PluginLoader = {
    // 从 localStorage 恢复插件启用状态
    loadEnabledState() {
      try {
        const saved = localStorage.getItem('pluginsEnabled');
        if (saved) {
          const state = JSON.parse(saved);
          for (const [id, enabled] of Object.entries(state)) {
            const plugin = PluginRegistry.plugins.get(id);
            if (plugin) plugin.enabled = enabled;
          }
        }
      } catch (e) {
        console.warn('[PluginLoader] Failed to load plugin state:', e);
      }
    },

    // 保存插件启用状态
    saveEnabledState() {
      try {
        const state = {};
        for (const [id, plugin] of PluginRegistry.plugins) {
          state[id] = plugin.enabled !== false;
        }
        localStorage.setItem('pluginsEnabled', JSON.stringify(state));
      } catch (e) {
        console.warn('[PluginLoader] Failed to save plugin state:', e);
      }
    },

    // 启用插件
    enable(pluginId) {
      const plugin = PluginRegistry.plugins.get(pluginId);
      if (plugin) {
        plugin.enabled = true;
        this.saveEnabledState();
        console.log(`[PluginLoader] Plugin enabled: ${pluginId}`);
      }
    },

    // 禁用插件
    disable(pluginId) {
      const plugin = PluginRegistry.plugins.get(pluginId);
      if (plugin) {
        plugin.enabled = false;
        this.saveEnabledState();
        console.log(`[PluginLoader] Plugin disabled: ${pluginId}`);
      }
    },

    // 切换插件状态
    toggle(pluginId) {
      const plugin = PluginRegistry.plugins.get(pluginId);
      if (plugin) {
        plugin.enabled = !plugin.enabled;
        this.saveEnabledState();
        return plugin.enabled;
      }
      return false;
    },

    // 执行插件的 register() 函数
    executePlugin(pluginFn) {
      try {
        const api = {
          // 注册方法
          registerPlugin: (meta) => PluginRegistry.registerPlugin(meta),
          registerCard: (card) => PluginRegistry.registerCard(card),
          registerCards: (cards) => PluginRegistry.registerCards(cards),
          registerRelic: (relic) => PluginRegistry.registerRelic(relic),
          registerRelics: (relics) => PluginRegistry.registerRelics(relics),
          registerEnemy: (enemy) => PluginRegistry.registerEnemy(enemy),
          registerEnemies: (enemies) => PluginRegistry.registerEnemies(enemies),
          registerEvent: (event) => PluginRegistry.registerEvent(event),
          registerEvents: (events) => PluginRegistry.registerEvents(events),
          // 工具方法
          log: sandboxUtils.log,
          random: sandboxUtils.random,
          clamp: sandboxUtils.clamp
        };
        pluginFn(api);
        return true;
      } catch (e) {
        console.error('[PluginLoader] Plugin execution error:', e);
        return false;
      }
    },

    // 加载内置插件
    loadBuiltInPlugins() {
      // 示例插件
      if (typeof window.ExamplePlugin === 'function') {
        this.executePlugin(window.ExamplePlugin);
      }
      // Starter Kit 插件
      if (typeof window.StarterKitPlugin === 'function') {
        this.executePlugin(window.StarterKitPlugin);
      }
    }
  };

  // 导出到全局
  window.PluginRegistry = PluginRegistry;
  window.PluginLoader = PluginLoader;
  window.sandboxUtils = sandboxUtils;

  console.log('[plugin-api.js] Plugin API initialized');
})();
