// plugin-loader.js - V60 卡牌插件系统
// 负责加载和管理所有卡牌包插件

(function() {
  'use strict';

  // 卡牌包注册表
  const CardPackRegistry = (() => {
    const packs = new Map();
    let activePacks = new Set(['starter', 'balanced', 'ironclad']);

    // 从localStorage恢复激活状态
    function load() {
      try {
        const saved = localStorage.getItem('cardPacksActive');
        if (saved) {
          activePacks = new Set(JSON.parse(saved));
        }
      } catch (e) {
        console.warn('Failed to load card packs from localStorage:', e);
      }
    }

    // 保存激活状态到localStorage
    function save() {
      try {
        localStorage.setItem('cardPacksActive', JSON.stringify([...activePacks]));
      } catch (e) {
        console.warn('Failed to save card packs to localStorage:', e);
      }
    }

    // 注册卡包
    function register(pack) {
      if (!pack || !pack.id) {
        console.warn('Invalid card pack:', pack);
        return;
      }
      packs.set(pack.id, pack);
      console.log(`Card pack registered: ${pack.id} - ${pack.name}`);
    }

    // 注销卡包
    function unregister(packId) {
      packs.delete(packId);
      activePacks.delete(packId);
    }

    // 激活卡包
    function activate(packId) {
      if (packs.has(packId)) {
        activePacks.add(packId);
        save();
        console.log(`Card pack activated: ${packId}`);
      }
    }

    // 停用卡包
    function deactivate(packId) {
      activePacks.delete(packId);
      save();
      console.log(`Card pack deactivated: ${packId}`);
    }

    // 获取所有激活卡包的卡牌
    function getCards() {
      const cards = [];
      for (const packId of activePacks) {
        const pack = packs.get(packId);
        if (pack && pack.cards) {
          cards.push(...pack.cards);
        }
      }
      return cards;
    }

    // 获取所有激活卡包的遗物
    function getRelics() {
      const relics = [];
      for (const packId of activePacks) {
        const pack = packs.get(packId);
        if (pack && pack.relics) {
          relics.push(...pack.relics);
        }
      }
      return relics;
    }

    // 获取所有激活卡包的敌人
    function getEnemies() {
      const enemies = [];
      for (const packId of activePacks) {
        const pack = packs.get(packId);
        if (pack && pack.enemies) {
          enemies.push(...pack.enemies);
        }
      }
      return enemies;
    }

    // 获取所有激活卡包的事件
    function getEvents() {
      const events = [];
      for (const packId of activePacks) {
        const pack = packs.get(packId);
        if (pack && pack.events) {
          events.push(...pack.events);
        }
      }
      return events;
    }

    // 获取所有已注册卡包
    function getAllPacks() {
      return [...packs.values()];
    }

    // 获取激活的卡包ID列表
    function getActivePackIds() {
      return [...activePacks];
    }

    // 检查卡包是否激活
    function isActive(packId) {
      return activePacks.has(packId);
    }

    // 从DOM加载已注册的卡包（window.CARD_PACKS）
    function loadFromDOM() {
      if (window.CARD_PACKS) {
        for (const [id, pack] of Object.entries(window.CARD_PACKS)) {
          register(pack);
        }
      }
    }

    // 导出状态
    function exportState() {
      return {
        activePacks: [...activePacks]
      };
    }

    // 导入状态
    function importState(state) {
      if (state && state.activePacks) {
        activePacks = new Set(state.activePacks);
        save();
      }
    }

    return {
      load,
      save,
      register,
      unregister,
      activate,
      deactivate,
      getCards,
      getRelics,
      getEnemies,
      getEvents,
      getAllPacks,
      getActivePackIds,
      isActive,
      loadFromDOM,
      exportState,
      importState,
      // 暴露activePacks的getter
      get activePacks() { return activePacks; }
    };
  })();

  // 自动初始化
  CardPackRegistry.load();
  CardPackRegistry.loadFromDOM();

  // 刷新CARDS从注册表
  function refreshCardsFromRegistry() {
    if (typeof CARDS !== 'undefined') {
      const cardsList = CardPackRegistry.getCards();
      CARDS = {};
      for (const card of cardsList) {
        CARDS[card.id] = card;
      }
      console.log(`Cards refreshed from registry: ${Object.keys(CARDS).length} cards`);
    }
  }

  // 刷新RELICS从注册表
  function refreshRelicsFromRegistry() {
    if (typeof RELICS !== 'undefined') {
      const relicsList = CardPackRegistry.getRelics();
      RELICS = {};
      for (const relic of relicsList) {
        RELICS[relic.id] = relic;
      }
      console.log(`Relics refreshed from registry: ${Object.keys(RELICS).length} relics`);
    }
  }

  // 刷新所有游戏数据
  function refreshAllFromRegistry() {
    refreshCardsFromRegistry();
    refreshRelicsFromRegistry();
  }

  // 导出到window
  window.CardPackRegistry = CardPackRegistry;
  window.refreshCardsFromRegistry = refreshCardsFromRegistry;
  window.refreshRelicsFromRegistry = refreshRelicsFromRegistry;
  window.refreshAllFromRegistry = refreshAllFromRegistry;

  // 打开卡包管理模态框
  window.openCardPackManager = function() {
    const packs = CardPackRegistry.getAllPacks();
    const activeIds = CardPackRegistry.getActivePackIds();

    let html = `
      <div id="card-pack-manager" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          background: #1a1a2e;
          border: 2px solid #ffd700;
          border-radius: 15px;
          padding: 20px;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        ">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
            <h2 style="color:#ffd700;margin:0;">🃏 卡包管理</h2>
            <button onclick="closeCardPackManager()" style="
              background: none;
              border: none;
              color: #fff;
              font-size: 24px;
              cursor: pointer;
            ">✕</button>
          </div>
          <div id="card-pack-list" style="margin-bottom:15px;">
    `;

    for (const pack of packs) {
      const isActive = activeIds.includes(pack.id);
      const icon = pack.portrait || '📦';
      html += `
        <div style="
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 12px;
        ">
          <span style="font-size:28px;">${icon}</span>
          <div style="flex:1;">
            <div style="color:#ffd700;font-weight:bold;">${pack.name}</div>
            <div style="color:#888;font-size:12px;">${pack.description || ''}</div>
            <div style="color:#666;font-size:11px;">v${pack.version} | ${pack.author || '未知作者'}</div>
          </div>
          <label style="position:relative;width:50px;height:26px;cursor:pointer;">
            <input type="checkbox" 
              id="pack-toggle-${pack.id}"
              ${isActive ? 'checked' : ''} 
              onchange="toggleCardPack('${pack.id}')"
              style="opacity:0;width:0;height:0;position:absolute;">
            <span style="
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: ${isActive ? '#2ecc71' : '#555'};
              border-radius: 13px;
              transition: 0.3s;
            ">
              <span style="
                position: absolute;
                left: ${isActive ? '26px' : '2px'};
                top: 2px;
                width: 22px;
                height: 22px;
                background: #fff;
                border-radius: 50%;
                transition: 0.3s;
              "></span>
            </span>
          </label>
        </div>
      `;
    }

    html += `
          </div>
          <div style="text-align:center;color:#888;font-size:12px;">
            当前激活: ${activeIds.length} 个卡包 | 
            卡牌数: ${CardPackRegistry.getCards().length} 张
          </div>
          <button onclick="closeCardPackManager()" style="
            width: 100%;
            margin-top: 15px;
            padding: 12px;
            background: linear-gradient(145deg, #ffd700, #f39c12);
            border: none;
            border-radius: 10px;
            color: #000;
            font-weight: bold;
            font-size: 16px;
            cursor: pointer;
          ">关闭</button>
        </div>
      </div>
    `;

    const container = document.createElement('div');
    container.id = 'card-pack-manager-container';
    container.innerHTML = html;
    document.body.appendChild(container);
  };

  // 关闭卡包管理模态框
  window.closeCardPackManager = function() {
    const container = document.getElementById('card-pack-manager-container');
    if (container) {
      container.remove();
    }
  };

  // 切换卡包激活状态
  window.toggleCardPack = function(packId) {
    if (CardPackRegistry.isActive(packId)) {
      CardPackRegistry.deactivate(packId);
    } else {
      CardPackRegistry.activate(packId);
    }
    // 刷新卡牌数据
    refreshAllFromRegistry();
    // 更新UI开关状态
    const toggle = document.getElementById(`pack-toggle-${packId}`);
    if (toggle) {
      const isActive = CardPackRegistry.isActive(packId);
      const span = toggle.nextElementSibling;
      span.style.background = isActive ? '#2ecc71' : '#555';
      span.querySelector('span').style.left = isActive ? '26px' : '2px';
    }
  };

  console.log('Plugin loader initialized. Active packs:', CardPackRegistry.getActivePackIds());
})();