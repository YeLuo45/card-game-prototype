// plugin-api.js - V79 插件系统 API v9
// 统一插件接口：Card/Relic/Enemy/Event 注册 + LifecycleManager + EventBus + RemoteMarket
// V79: 插件市场v4 — 第三方分发 + 版本治理 (PluginManifest + HMAC-SHA256 + semver + 审核队列)

(function() {
  'use strict';

  // ===== V79 新增：SemVer 版本比较 =====
  const SemVer = {
    // 解析版本字符串为组件
    parse(version) {
      const parts = String(version).match(/^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9._-]+))?$/);
      if (!parts) return null;
      return {
        major: parseInt(parts[1], 10),
        minor: parseInt(parts[2], 10),
        patch: parseInt(parts[3], 10),
        prerelease: parts[4] || ''
      };
    },

    // 比较两个版本: 返回 1 (a>b), 0 (相等), -1 (a<b)
    compare(a, b) {
      const va = this.parse(a);
      const vb = this.parse(b);
      if (!va || !vb) return 0;

      if (va.major !== vb.major) return va.major - vb.major;
      if (va.minor !== vb.minor) return va.minor - vb.minor;
      if (va.patch !== vb.patch) return va.patch - vb.patch;

      // 正式版 > prerelease
      if (va.prerelease && !vb.prerelease) return -1;
      if (!va.prerelease && vb.prerelease) return 1;
      if (va.prerelease < vb.prerelease) return -1;
      if (va.prerelease > vb.prerelease) return 1;
      return 0;
    },

    // 检查v1是否大于v2
    gt(a, b) { return this.compare(a, b) > 0; },
    // 检查v1是否小于v2
    lt(a, b) { return this.compare(a, b) < 0; },
    // 检查v1是否等于v2
    eq(a, b) { return this.compare(a, b) === 0; },
    // 检查v1是否大于等于v2
    gte(a, b) { return this.compare(a, b) >= 0; },
    // 检查v1是否小于等于v2
    lte(a, b) { return this.compare(a, b) <= 0; },

    // 格式化版本差异
    diff(v1, v2) {
      const va = this.parse(v1);
      const vb = this.parse(v2);
      if (!va || !vb) return 'unknown';

      if (va.major !== vb.major) return 'major'; // breaking change
      if (va.minor !== vb.minor) return 'minor'; // feature
      if (va.patch !== vb.patch) return 'patch'; // fix
      return 'same';
    },

    // 检查版本是否有效
    isValid(version) { return this.parse(version) !== null; }
  };

  // ===== V79 新增：HMAC-SHA256 签名工具 =====
  const SignatureTool = {
    SECRET_KEY: 'plugin-market-v79-secret',

    // 生成 HMAC-SHA256 签名
    async sign(data) {
      const key = await this._getKey();
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(JSON.stringify(data));

      const cryptoKey = await crypto.subtle.importKey(
        'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );

      const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBytes);
      return this._arrayBufferToHex(signature);
    },

    // 验证签名
    async verify(data, signature) {
      const computed = await this.sign(data);
      return computed === signature;
    },

    // 生成插件包的签名
    async signPluginManifest(manifest) {
      const signData = {
        name: manifest.name,
        version: manifest.version,
        author: manifest.author,
        cards: manifest.cards,
        relics: manifest.relics,
        hooks: manifest.hooks,
        dependencies: manifest.dependencies
      };
      return await this.sign(signData);
    },

    // 内部：获取密钥
    async _getKey() {
      const encoder = new TextEncoder();
      return encoder.encode(this.SECRET_KEY + (localStorage.getItem('plugin_publisher_token') || ''));
    },

    // 内部：ArrayBuffer转Hex
    _arrayBufferToHex(buffer) {
      return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
  };

  // ===== V79 新增：PluginManifest 生成器 =====
  const PluginManifestGenerator = {
    // 创建标准 manifest
    async create(pluginData) {
      const manifest = {
        name: pluginData.name || 'unnamed-plugin',
        version: pluginData.version || '1.0.0',
        author: pluginData.author || 'anonymous',
        description: pluginData.description || '',
        signature: '',
        cards: pluginData.cards || [],
        relics: pluginData.relics || [],
        hooks: pluginData.hooks || [],
        dependencies: pluginData.dependencies || {}
      };

      // 生成签名
      manifest.signature = await SignatureTool.signPluginManifest(manifest);

      return manifest;
    },

    // 验证 manifest 完整性
    validate(manifest) {
      const errors = [];

      if (!manifest.name) errors.push('Missing name');
      if (!manifest.version) errors.push('Missing version');
      if (!manifest.author) errors.push('Missing author');
      if (!manifest.signature) errors.push('Missing signature');

      if (!SemVer.isValid(manifest.version)) {
        errors.push(`Invalid version format: ${manifest.version}`);
      }

      if (!Array.isArray(manifest.cards)) errors.push('cards must be array');
      if (!Array.isArray(manifest.relics)) errors.push('relics must be array');
      if (!Array.isArray(manifest.hooks)) errors.push('hooks must be array');
      if (typeof manifest.dependencies !== 'object') errors.push('dependencies must be object');

      return { valid: errors.length === 0, errors };
    },

    // 导出为 JSON 字符串
    exportToJSON(manifest) {
      return JSON.stringify(manifest, null, 2);
    },

    // 从 JSON 解析
    parseFromJSON(jsonStr) {
      try {
        return JSON.parse(jsonStr);
      } catch (e) {
        return null;
      }
    }
  };

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
      const apiBase = 'http://127.0.0.1:8000';
      const apiKey = 'sk-aim-';

      return new Promise((resolve, reject) => {
        const manifestUrl = url || this.marketUrl;

        // 如果有 manifestUrl，先尝试 fetch
        if (manifestUrl) {
          console.log(`[RemoteMarket] Fetching manifest from: ${manifestUrl}`);
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
              console.error('[RemoteMarket] Fetch error, trying ai-superpower API:', err);
              // fallback: 尝试 ai-superpower /api/proposals 作为真实数据源
              this._fetchFromApi(apiBase, apiKey).then(resolve).catch(() => {
                resolve(this._getMockPlugins());
              });
            });
          return;
        }

        // 无 manifestUrl，直接尝试 ai-superpower API
        console.log('[RemoteMarket] No market URL, fetching from ai-superpower API');
        this._fetchFromApi(apiBase, apiKey).then(resolve).catch(() => {
          resolve(this._getMockPlugins());
        });
      });
    },

    // 从 ai-superpower API 获取真实提案数据作为插件市场
    _fetchFromApi(apiBase, apiKey) {
      return new Promise((resolve, reject) => {
        console.log('[RemoteMarket] Fetching proposals from ai-superpower API');
        fetch(`${apiBase}/api/proposals?page=1&page_size=20`, {
          headers: { 'X-API-Key': apiKey }
        })
          .then(response => {
            if (!response.ok) throw new Error(`API HTTP ${response.status}`);
            return response.json();
          })
          .then(data => {
            console.log(`[RemoteMarket] Received ${data.items?.length || 0} proposals from API`);
            if (!data.items || data.items.length === 0) {
              reject(new Error('Empty response'));
              return;
            }
            // 将提案映射为插件格式
            const plugins = data.items.map(p => ({
              id: p.id,
              name: p.title,
              version: '1.0.0',
              author: p.owner || '未知',
              description: `项目: ${p.project_name || '未知'} | 状态: ${p.status}`,
              url: `https://github.com/${p.project_name || ''}`,
              rating: 4.0,
              downloads: 100,
              tags: [p.project_name || '', p.status || '']
            }));
            resolve(plugins);
          })
          .catch(err => {
            console.error('[RemoteMarket] API fetch error:', err);
            reject(err);
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
    },

    // 评分插件（保存到 localStorage）
    ratePlugin(pluginId, rating) {
      try {
        const ratings = JSON.parse(localStorage.getItem('plugin_ratings') || '{}');
        ratings[pluginId] = Math.max(1, Math.min(5, rating));
        localStorage.setItem('plugin_ratings', JSON.stringify(ratings));
        console.log(`[PluginManager] Rated ${pluginId}: ${rating}★`);
        return true;
      } catch (e) {
        console.error('[PluginManager] ratePlugin error:', e);
        return false;
      }
    },

    // 获取插件评分
    getPluginRating(pluginId) {
      try {
        const ratings = JSON.parse(localStorage.getItem('plugin_ratings') || '{}');
        return ratings[pluginId] || 0;
      } catch (e) {
        return 0;
      }
    },

    // 获取所有评分
    getAllRatings() {
      try {
        return JSON.parse(localStorage.getItem('plugin_ratings') || '{}');
      } catch (e) {
        return {};
      }
    }
  };

  // ===== V79 新增：审核队列 =====
  const ReviewQueue = {
    STORAGE_KEY: 'plugin_review_queue',

    // 获取队列
    getQueue() {
      try {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
      } catch (e) {
        console.error('[ReviewQueue] Failed to get queue:', e);
        return [];
      }
    },

    // 保存队列
    _saveQueue(queue) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    },

    // 提交插件到审核队列
    submit(pluginManifest) {
      const queue = this.getQueue();
      const existing = queue.findIndex(p => p.name === pluginManifest.name);
      if (existing >= 0) {
        // 更新已存在的插件版本
        queue[existing] = { ...pluginManifest, status: 'pending_review', submittedAt: Date.now() };
      } else {
        queue.push({ ...pluginManifest, status: 'pending_review', submittedAt: Date.now() });
      }
      this._saveQueue(queue);
      console.log(`[ReviewQueue] Submitted: ${pluginManifest.name} v${pluginManifest.version}`);
      return true;
    },

    // 获取待审核列表
    getPending() {
      return this.getQueue().filter(p => p.status === 'pending_review');
    },

    // 批准插件
    approve(pluginName) {
      const queue = this.getQueue();
      const item = queue.find(p => p.name === pluginName);
      if (item) {
        item.status = 'approved';
        item.reviewedAt = Date.now();
        this._saveQueue(queue);
        console.log(`[ReviewQueue] Approved: ${pluginName}`);
        return true;
      }
      return false;
    },

    // 拒绝插件
    reject(pluginName, reason) {
      const queue = this.getQueue();
      const item = queue.find(p => p.name === pluginName);
      if (item) {
        item.status = 'rejected';
        item.rejectionReason = reason || 'No reason provided';
        item.reviewedAt = Date.now();
        this._saveQueue(queue);
        console.log(`[ReviewQueue] Rejected: ${pluginName} - ${reason}`);
        return true;
      }
      return false;
    },

    // 获取已批准列表
    getApproved() {
      return this.getQueue().filter(p => p.status === 'approved');
    },

    // 获取已拒绝列表
    getRejected() {
      return this.getQueue().filter(p => p.status === 'rejected');
    },

    // 清除已批准的插件（移到市场后）
    clearApproved() {
      const queue = this.getQueue().filter(p => p.status !== 'approved');
      this._saveQueue(queue);
    }
  };

  // ===== V79 新增：版本 Diff 对比 =====
  const VersionDiff = {
    // 对比两个插件版本，返回差异
    compare(oldPlugin, newPlugin) {
      const result = {
        hasBreaking: false,
        hasNewFeatures: false,
        hasBugFixes: false,
        newCards: [],
        modifiedCards: [],
        removedCards: [],
        newRelics: [],
        modifiedRelics: [],
        removedRelics: [],
        newHooks: [],
        removedHooks: [],
        dependencyChanges: {}
      };

      // 版本差异类型
      const diffType = SemVer.diff(newPlugin.version, oldPlugin.version);
      if (diffType === 'major') result.hasBreaking = true;
      if (diffType === 'minor') result.hasNewFeatures = true;
      if (diffType === 'patch') result.hasBugFixes = true;

      // 卡牌差异
      const oldCards = oldPlugin.cards || [];
      const newCards = newPlugin.cards || [];

      const oldCardIds = new Set(oldCards.map(c => c.id));
      const newCardIds = new Set(newCards.map(c => c.id));

      // 新增卡牌
      result.newCards = newCards.filter(c => !oldCardIds.has(c.id));
      // 移除卡牌
      result.removedCards = oldCards.filter(c => !newCardIds.has(c.id));
      // 修改卡牌（同一ID但内容不同）
      result.modifiedCards = newCards.filter(c => {
        if (!oldCardIds.has(c.id)) return false;
        const oldCard = oldCards.find(oc => oc.id === c.id);
        return JSON.stringify(oldCard) !== JSON.stringify(c);
      });

      // 遗物差异
      const oldRelics = oldPlugin.relics || [];
      const newRelics = newPlugin.relics || [];

      const oldRelicIds = new Set(oldRelics.map(r => r.id));
      const newRelicIds = new Set(newRelics.map(r => r.id));

      result.newRelics = newRelics.filter(r => !oldRelicIds.has(r.id));
      result.removedRelics = oldRelics.filter(r => !newRelicIds.has(r.id));
      result.modifiedRelics = newRelics.filter(r => {
        if (!oldRelicIds.has(r.id)) return false;
        const oldRelic = oldRelics.find(or => or.id === r.id);
        return JSON.stringify(oldRelic) !== JSON.stringify(r);
      });

      // Hook 差异
      const oldHooks = new Set(oldPlugin.hooks || []);
      const newHooks = new Set(newPlugin.hooks || []);
      result.newHooks = [...newHooks].filter(h => !oldHooks.has(h));
      result.removedHooks = [...oldHooks].filter(h => !newHooks.has(h));

      // 依赖变化
      const oldDeps = oldPlugin.dependencies || {};
      const newDeps = newPlugin.dependencies || {};
      for (const [key, newVer] of Object.entries(newDeps)) {
        if (oldDeps[key] !== undefined) {
          if (oldDeps[key] !== newVer) {
            result.dependencyChanges[key] = { from: oldDeps[key], to: newVer };
          }
        } else {
          result.dependencyChanges[key] = { from: null, to: newVer };
        }
      }
      for (const key of Object.keys(oldDeps)) {
        if (!newDeps[key]) {
          result.dependencyChanges[key] = { from: oldDeps[key], to: null };
        }
      }

      return result;
    },

    // 格式化差异为可读文本
    format(diff) {
      const lines = [];
      if (diff.hasBreaking) lines.push('⚠️ Breaking Change (主版本号变更)');
      if (diff.hasNewFeatures) lines.push('✨ New Features (次版本号变更)');
      if (diff.hasBugFixes) lines.push('🐛 Bug Fixes (补丁版本变更)');

      if (diff.newCards.length) {
        lines.push(`\n🆕 New Cards (${diff.newCards.length}):`);
        diff.newCards.forEach(c => lines.push(`   - ${c.name || c.id}`));
      }
      if (diff.removedCards.length) {
        lines.push(`\n❌ Removed Cards (${diff.removedCards.length}):`);
        diff.removedCards.forEach(c => lines.push(`   - ${c.name || c.id}`));
      }
      if (diff.modifiedCards.length) {
        lines.push(`\n📝 Modified Cards (${diff.modifiedCards.length}):`);
        diff.modifiedCards.forEach(c => lines.push(`   - ${c.name || c.id}`));
      }
      if (diff.newRelics.length) {
        lines.push(`\n🆕 New Relics (${diff.newRelics.length}):`);
        diff.newRelics.forEach(r => lines.push(`   - ${r.name || r.id}`));
      }
      if (diff.removedRelics.length) {
        lines.push(`\n❌ Removed Relics (${diff.removedRelics.length}):`);
        diff.removedRelics.forEach(r => lines.push(`   - ${r.name || r.id}`));
      }
      if (diff.newHooks.length) {
        lines.push(`\n🆕 New Hooks: ${diff.newHooks.join(', ')}`);
      }
      if (diff.removedHooks.length) {
        lines.push(`\n❌ Removed Hooks: ${diff.removedHooks.join(', ')}`);
      }
      const depChanges = Object.keys(diff.dependencyChanges);
      if (depChanges.length) {
        lines.push('\n📦 Dependency Changes:');
        depChanges.forEach(k => {
          const change = diff.dependencyChanges[k];
          if (change.from === null) lines.push(`   + ${k}: ${change.to}`);
          else if (change.to === null) lines.push(`   - ${k}: ${change.from} (removed)`);
          else lines.push(`   ~ ${k}: ${change.from} → ${change.to}`);
        });
      }
      return lines.join('\n') || 'No changes detected';
    }
  };

  // ===== V79 新增：发布者注册 =====
  const PluginPublisher = {
    STORAGE_KEY: 'plugin_publisher_profile',

    // 保存发布者资料
    saveProfile(profile) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profile));
      console.log('[PluginPublisher] Profile saved:', profile.github || profile.author);
    },

    // 获取发布者资料
    getProfile() {
      try {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        return null;
      }
    },

    // 检查是否已注册
    isRegistered() {
      return this.getProfile() !== null;
    },

    // 绑定 GitHub
    bindGitHub(githubUsername, token) {
      const profile = {
        github: githubUsername,
        token: token,
        boundAt: Date.now()
      };
      this.saveProfile(profile);
      // 同时保存到 plugin_publisher_token 供 SignatureTool 使用
      localStorage.setItem('plugin_publisher_token', token);
      console.log(`[PluginPublisher] GitHub bound: ${githubUsername}`);
      return true;
    },

    // 登出
    logout() {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem('plugin_publisher_token');
      console.log('[PluginPublisher] Logged out');
    }
  };

  // 导出到全局
  window.PluginRegistry = PluginRegistry;
  window.PluginLoader = PluginLoader;
  window.PluginCache = PluginCache;
  window.EventBus = EventBus;
  window.RemoteMarket = RemoteMarket;
  window.LifecycleManager = LifecycleManager;
  window.PluginManager = PluginManager;
  // V79 新增导出
  window.SemVer = SemVer;
  window.SignatureTool = SignatureTool;
  window.PluginManifestGenerator = PluginManifestGenerator;
  window.ReviewQueue = ReviewQueue;
  window.VersionDiff = VersionDiff;
  window.PluginPublisher = PluginPublisher;

  console.log('[plugin-api.js] Plugin API V79 initialized — Plugin Market v4: Third-party Distribution + Version Governance');
})();
