// plugin-api.js - V72 插件系统 API v4
// 统一插件接口：Card/Relic/Enemy/Event 注册 + LifecycleManager + EventBus + RemoteMarket

(function() {
  'use strict';

  // ===== V72 更新：PluginCache TTL =====
  const PluginCache = {
    TTL: 5 * 60 * 1000, // 5 minutes

    // 获取缓存的插件数据
    get(pluginId) {
      try {
        const cached = localStorage.getItem('plugin_cache_' + pluginId);
        if (!cached) return null;
        const entry = JSON.parse(cached);
        // Check TTL expiry
        if (Date.now() - entry._ts > this.TTL) {
          localStorage.removeItem('plugin_cache_' + pluginId);
          return null;
        }
        return entry._data;
      } catch (e) {
        console.warn('[PluginCache] Get error:', e);
        return null;
      }
    },

    // 存入缓存
    set(pluginId, data) {
      try {
        localStorage.setItem('plugin_cache_' + pluginId, JSON.stringify({ _data: data, _ts: Date.now() }));
        console.log(`[PluginCache] Cached: ${pluginId}`);
      } catch (e) {
        console.warn('[PluginCache] Set error:', e);
      }
    },

    // 删除缓存
    remove(pluginId) {
      try {
        localStorage.removeItem('plugin_cache_' + pluginId);
        console.log(`[PluginCache] Removed: ${pluginId}`);
      } catch (e) {
        console.warn('[PluginCache] Remove error:', e);
      }
    },

    // 列出所有缓存插件 ID（仅未过期的）
    list() {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('plugin_cache_'));
      const result = [];
      for (const k of keys) {
        const pluginId = k.replace('plugin_cache_', '');
        const cached = localStorage.getItem(k);
        if (cached) {
          try {
            const entry = JSON.parse(cached);
            if (Date.now() - entry._ts <= this.TTL) {
              result.push(pluginId);
            }
          } catch (e) {
            result.push(pluginId); // keep even if corrupt for debugging
          }
        }
      }
      return result;
    },

    // 检查插件是否已缓存且未过期
    has(pluginId) {
      return this.get(pluginId) !== null;
    }
  };

  // ===== V70 新增：EventBus =====
  const EventBus = {
    listeners: new Map(),

    // 发布事件
    emit(event, data) {
      const handlers = this.listeners.get(event) || [];
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (e) {
          console.error(`[EventBus] Handler error for "${event}":`, e);
        }
      });
      // 触发内置事件日志（调试用）
      if (event !== 'debug:log') {
        console.log(`[EventBus] emit: ${event}`, data);
      }
    },

    // 订阅事件，返回 unsubscribe 函数
    on(event, handler) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(handler);
      // 返回取消订阅函数
      return () => this.off(event, handler);
    },

    // 取消订阅
    off(event, handler) {
      const handlers = this.listeners.get(event) || [];
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    },

    // 清空所有监听
    clear() {
      this.listeners.clear();
    },

    // 内置事件列表
    builtInEvents: ['game:start', 'game:end', 'card:played', 'card:discarded', 'turn:start', 'turn:end', 'enemy:defeated']
  };

  // ===== V70 新增：RemoteMarket =====
  const RemoteMarket = {
    marketUrl: '',

    setMarketUrl(url) {
      this.marketUrl = url;
      console.log(`[RemoteMarket] Market URL set: ${url}`);
    },

    // 获取 manifest.json 插件列表
    fetchManifest(url) {
      return new Promise((resolve, reject) => {
        const manifestUrl = url || this.marketUrl;
        if (!manifestUrl) {
          reject(new Error('No market URL configured'));
          return;
        }
        console.log(`[RemoteMarket] Fetching manifest from: ${manifestUrl}`);
        // 使用 fetch 获取 manifest
        fetch(manifestUrl)
          .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
          })
          .then(data => {
            console.log(`[RemoteMarket] Received ${data.plugins?.length || 0} plugins`);
            resolve(data.plugins || []);
          })
          .catch(err => {
            console.error('[RemoteMarket] Fetch error:', err);
            // 网络错误时返回模拟数据
            resolve(this._getMockPlugins());
          });
      });
    },

    // 下载并安装插件
    downloadPlugin(pluginId) {
      return new Promise((resolve, reject) => {
        console.log(`[RemoteMarket] Downloading plugin: ${pluginId}`);
        // 模拟下载延迟
        setTimeout(() => {
          // 实际实现中应通过 fetch 下载插件 JS 文件
          // 这里返回模拟的插件对象
          const mockPlugin = this._getMockPlugins().find(p => p.id === pluginId);
          if (mockPlugin) {
            resolve(mockPlugin);
          } else {
            reject(new Error(`Plugin not found: ${pluginId}`));
          }
        }, 500);
      });
    },

    // 模拟插件数据（当网络不可用时）
    _getMockPlugins() {
      return [
        {
          id: 'fireball-expansion',
          name: '🔥 火球术扩展包',
          version: '1.0.0',
          author: '第三方开发者',
          description: '添加10张强力火系卡牌，包含火球术、烈焰风暴等',
          url: 'https://example.com/plugins/fireball-plugin.js',
          rating: 4.5,
          downloads: 1234,
          tags: ['攻击', '火系']
        },
        {
          id: 'ice-mage-pack',
          name: '❄️ 冰霜法师扩展包',
          version: '1.2.0',
          author: 'IceDev',
          description: '冰系卡牌专包，强化冻结效果',
          url: 'https://example.com/plugins/ice-plugin.js',
          rating: 4.2,
          downloads: 856,
          tags: ['控制', '冰系']
        },
        {
          id: 'lucky-reliquary',
          name: '🍀 幸运遗物宝库',
          version: '1.0.0',
          author: 'LuckyDev',
          description: '新增15种独特遗物，改变游戏玩法',
          url: 'https://example.com/plugins/lucky-reliquary.js',
          rating: 4.8,
          downloads: 2341,
          tags: ['遗物', '幸运']
        }
      ];
    }
  };

  // ===== V70 新增：LifecycleManager =====
  const LifecycleManager = {
    // 调用插件生命周期钩子
    callHook(plugin, hookName, ...args) {
      if (plugin && typeof plugin[hookName] === 'function') {
        try {
          console.log(`[LifecycleManager] ${plugin.id}: ${hookName}`);
          return plugin[hookName].apply(plugin, args);
        } catch (e) {
          console.error(`[LifecycleManager] ${hookName} error in plugin ${plugin.id}:`, e);
        }
      }
    },

    // 触发 onLoad
    onLoad(plugin) {
      return this.callHook(plugin, 'onLoad');
    },

    // 触发 onEnable
    onEnable(plugin) {
      return this.callHook(plugin, 'onEnable');
    },

    // 触发 onDisable
    onDisable(plugin) {
      return this.callHook(plugin, 'onDisable');
    },

    // 触发 onUnload
    onUnload(plugin) {
      return this.callHook(plugin, 'onUnload');
    }
  };

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
          // V70 新增：EventBus
          EventBus: EventBus,
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

    // V70: 加载内置插件（带生命周期）
    loadBuiltInPlugins() {
      // 示例插件
      if (typeof window.ExamplePlugin === 'function') {
        const pluginObj = this._createPluginWrapper(window.ExamplePlugin, 'example-plugin');
        if (pluginObj) {
          LifecycleManager.onLoad(pluginObj);
          this.executePlugin(window.ExamplePlugin);
          LifecycleManager.onEnable(pluginObj);
        }
      }
      // Starter Kit 插件
      if (typeof window.StarterKitPlugin === 'function') {
        const pluginObj = this._createPluginWrapper(window.StarterKitPlugin, 'starter-kit-plugin');
        if (pluginObj) {
          LifecycleManager.onLoad(pluginObj);
          this.executePlugin(window.StarterKitPlugin);
          LifecycleManager.onEnable(pluginObj);
        }
      }
    },

    // V70: 创建插件包装对象（用于生命周期管理）
    _createPluginWrapper(pluginFn, fallbackId) {
      try {
        // 尝试从插件函数获取元数据
        let pluginMeta = { id: fallbackId, name: fallbackId, version: '1.0.0' };
        // 如果插件返回对象，则使用它
        const result = pluginFn({
          registerPlugin: (meta) => { pluginMeta = { ...pluginMeta, ...meta }; }
        });
        if (result && typeof result === 'object') {
          pluginMeta = { ...pluginMeta, ...result };
        }
        return pluginMeta;
      } catch (e) {
        return { id: fallbackId, name: fallbackId, version: '1.0.0' };
      }
    },

    // V70: 启用插件（带生命周期）
    enable(pluginId) {
      const plugin = PluginRegistry.plugins.get(pluginId);
      if (plugin) {
        plugin.enabled = true;
        this.saveEnabledState();
        LifecycleManager.onEnable(plugin);
        console.log(`[PluginLoader] Plugin enabled: ${pluginId}`);
      }
    },

    // V70: 禁用插件（带生命周期）
    disable(pluginId) {
      const plugin = PluginRegistry.plugins.get(pluginId);
      if (plugin) {
        LifecycleManager.onDisable(plugin);
        plugin.enabled = false;
        this.saveEnabledState();
        console.log(`[PluginLoader] Plugin disabled: ${pluginId}`);
      }
    },

    // V70: 切换插件状态（带生命周期）
    toggle(pluginId) {
      const plugin = PluginRegistry.plugins.get(pluginId);
      if (plugin) {
        const wasEnabled = plugin.enabled;
        plugin.enabled = !plugin.enabled;
        this.saveEnabledState();
        if (plugin.enabled && !wasEnabled) {
          LifecycleManager.onEnable(plugin);
        } else if (!plugin.enabled && wasEnabled) {
          LifecycleManager.onDisable(plugin);
        }
        return plugin.enabled;
      }
      return false;
    }
  };

  // 导出到全局
  window.PluginRegistry = PluginRegistry;
  window.PluginLoader = PluginLoader;
// V70 新增导出
  window.PluginCache = PluginCache;
  window.EventBus = EventBus;
  window.RemoteMarket = RemoteMarket;
  window.LifecycleManager = LifecycleManager;

  // ===== V72 更新：PluginManager.install/uninstall =====
  const PluginManager = {
    // 安装插件（注册到 PluginRegistry + 缓存）
    install(plugin) {
      if (!plugin || !plugin.id) {
        console.warn('[PluginManager] Invalid plugin:', plugin);
        return false;
      }
      // 注册到 PluginRegistry
      PluginRegistry.registerPlugin(plugin);
      // 调用 Lifecycle onLoad
      const pluginObj = PluginRegistry.plugins.get(plugin.id);
      if (pluginObj) {
        LifecycleManager.onLoad(pluginObj);
        LifecycleManager.onEnable(pluginObj);
      }
      // 缓存插件数据
      PluginCache.set(plugin.id, plugin);
      console.log(`[PluginManager] Installed: ${plugin.id}`);
      return true;
    },

    // 卸载插件（从 PluginRegistry 移除 + 清理缓存）
    uninstall(pluginId) {
      const plugin = PluginRegistry.plugins.get(pluginId);
      if (plugin) {
        LifecycleManager.onDisable(plugin);
        LifecycleManager.onUnload(plugin);
        PluginRegistry.plugins.delete(pluginId);
        PluginCache.remove(pluginId);
        console.log(`[PluginManager] Uninstalled: ${pluginId}`);
        return true;
      }
      return false;
    },

    // 列出已安装插件
    listInstalled() {
      return PluginRegistry.getPlugins();
    },

    // 检查插件是否已安装
    isInstalled(pluginId) {
      return PluginRegistry.plugins.has(pluginId);
    }
  };

  window.PluginManager = PluginManager;

  console.log('[plugin-api.js] Plugin API V72 initialized');
})();
