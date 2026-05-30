/**
 * V101 Card Synergy Cascade Engine (Direction B)
 * 卡牌协同效果系统：SynergyRegistry | CascadeEngine | SynergyHooks | SynergyPanel
 * 
 * 概念：卡牌间动态触发协同效果（连锁协同），hooks追踪协同依赖，mesh广播协同事件
 * 设计来源：ruflo Hook System | nanobot distributed mesh | thunderbolt feedback loops
 */

/**
 * SynergyRegistry - 协同效果注册表
 * 管理所有卡牌协同效果的注册、查询和连锁计算
 */
class SynergyRegistry {
  constructor() {
    this.synergies = new Map();  // synergyId -> synergyDef
    this.cardSynergies = new Map();  // cardId -> [synergyId]
    this.triggerHandlers = new Map();  // triggerType -> [handlerId]
  }

  /**
   * 注册协同效果定义
   * @param {object} synergyDef - 协同效果定义
   * @param {string} synergyDef.id - 协同效果唯一ID
   * @param {string} synergyDef.triggerCard - 触发卡牌ID
   * @param {string[]} synergyDef.targetCards - 目标卡牌ID列表
   * @param {string} synergyDef.effect - 效果类型 (damage_boost, draw_card, etc)
   * @param {function} synergyDef.condition - 触发条件函数
   * @param {number} synergyDef.magnitude - 效果数值
   * @returns {boolean} 注册是否成功
   */
  registerSynergy(synergyDef) {
    if (!synergyDef || !synergyDef.id || !synergyDef.triggerCard) {
      return false;
    }

    const id = synergyDef.id;
    const triggerCard = synergyDef.triggerCard;

    // 存储协同效果
    this.synergies.set(id, {
      id: id,
      triggerCard: triggerCard,
      targetCards: synergyDef.targetCards || [],
      effect: synergyDef.effect || 'unknown',
      condition: synergyDef.condition || (() => true),
      magnitude: synergyDef.magnitude || 0,
      description: synergyDef.description || '',
      priority: synergyDef.priority || 0
    });

    // 建立卡牌到协同效果的索引
    if (!this.cardSynergies.has(triggerCard)) {
      this.cardSynergies.set(triggerCard, []);
    }
    this.cardSynergies.get(triggerCard).push(id);

    return true;
  }

  /**
   * 获取卡牌的所有协同效果
   * @param {string} cardId - 卡牌ID
   * @returns {object[]} 协同效果定义数组
   */
  getSynergyForCard(cardId) {
    if (!cardId) return [];
    
    const synergyIds = this.cardSynergies.get(cardId) || [];
    return synergyIds.map(id => this.synergies.get(id)).filter(Boolean);
  }

  /**
   * 获取所有注册的协同效果
   * @returns {object[]} 所有协同效果定义
   */
  getAllSynergies() {
    return Array.from(this.synergies.values());
  }

  /**
   * 计算卡牌组合的连锁协同
   * @param {string[]} cardIds - 卡牌ID数组
   * @returns {object[]} 可触发的连锁协同链
   */
  getSynergyChains(cardIds) {
    if (!cardIds || cardIds.length === 0) return [];

    const chains = [];
    const visited = new Set();

    // 深度优先搜索连锁协同
    const dfs = (currentCard, chain, depth) => {
      if (depth > 3) return; // max cascade depth = 3

      const synergies = this.getSynergyForCard(currentCard);
      
      for (const synergy of synergies) {
        if (visited.has(synergy.id)) continue;
        
        // 检查目标卡牌是否在当前卡组中
        const hasTargets = synergy.targetCards.some(targetId => 
          cardIds.includes(targetId)
        );
        
        if (hasTargets || synergy.targetCards.length === 0) {
          visited.add(synergy.id);
          chain.push({
            synergyId: synergy.id,
            triggerCard: currentCard,
            effect: synergy.effect,
            magnitude: synergy.magnitude,
            depth: depth
          });
          
          // 递归检查目标卡牌是否能触发更多协同
          for (const targetId of synergy.targetCards) {
            if (cardIds.includes(targetId)) {
              dfs(targetId, chain, depth + 1);
            }
          }
          
          chain.pop();
          visited.delete(synergy.id);
        }
      }
    };

    // 从每个卡牌开始搜索
    for (const cardId of cardIds) {
      dfs(cardId, [], 0);
      if (chains.length === 0 || chains[chains.length - 1].length !== 0) {
        // 记录有效链
        const visitedSnapshot = new Set(visited);
        if (visitedSnapshot.size > 0) {
          chains.push([...visitedSnapshot]);
        }
      }
    }

    return chains;
  }

  /**
   * 移除协同效果
   * @param {string} synergyId - 协同效果ID
   * @returns {boolean} 是否成功移除
   */
  removeSynergy(synergyId) {
    const synergy = this.synergies.get(synergyId);
    if (!synergy) return false;

    // 从卡牌索引中移除
    const cardSynergies = this.cardSynergies.get(synergy.triggerCard);
    if (cardSynergies) {
      const index = cardSynergies.indexOf(synergyId);
      if (index !== -1) {
        cardSynergies.splice(index, 1);
      }
    }

    // 从主存储中移除
    this.synergies.delete(synergyId);
    return true;
  }

  /**
   * 清除所有协同效果
   */
  clear() {
    this.synergies.clear();
    this.cardSynergies.clear();
    this.triggerHandlers.clear();
  }

  /**
   * 获取协同效果数量
   * @returns {number}
   */
  getSynergyCount() {
    return this.synergies.size;
  }
}

/**
 * CascadeEngine - 连锁协同引擎
 * 处理连锁协同的触发检查、解析和应用
 */
class CascadeEngine {
  constructor(synergyRegistry) {
    this.registry = synergyRegistry;
    this.maxCascadeDepth = 3;
    this.activeCascades = new Map();  // gameId -> cascade stack
    this.cascadeHistory = [];
  }

  /**
   * 检查是否触发连锁协同
   * @param {object} playedCard - 打出的卡牌
   * @param {object} gameState - 游戏状态
   * @returns {object[]} 可触发的连锁协同数组
   */
  checkCascadeTrigger(playedCard, gameState) {
    if (!playedCard || !gameState) return [];

    const triggers = [];
    const cardId = playedCard.id || playedCard;
    const synergies = this.registry.getSynergyForCard(cardId);

    for (const synergy of synergies) {
      // 检查触发条件
      const conditionMet = synergy.condition(gameState, playedCard);
      if (!conditionMet) continue;

      // 检查目标卡牌是否在场
      const targetCards = gameState.boardCards || gameState.cardsInHand || [];
      const validTargets = synergy.targetCards.filter(targetId =>
        targetCards.some(card => card.id === targetId)
      );

      if (validTargets.length > 0 || synergy.targetCards.length === 0) {
        triggers.push({
          synergyId: synergy.id,
          triggerCard: cardId,
          targetCards: validTargets,
          effect: synergy.effect,
          magnitude: synergy.magnitude,
          conditionMet: true
        });
      }
    }

    return triggers;
  }

  /**
   * 解析连锁协同
   * @param {object[]} cascadeStack - 连锁栈
   * @param {object} gameState - 游戏状态
   * @returns {object} 解析结果
   */
  resolveCascade(cascadeStack, gameState) {
    if (!cascadeStack || cascadeStack.length === 0) {
      return { resolved: [], totalEffects: 0, depth: 0 };
    }

    const resolved = [];
    let totalEffects = 0;
    let currentDepth = 0;

    for (const cascade of cascadeStack) {
      if (currentDepth >= this.maxCascadeDepth) {
        break;
      }

      const result = this.applyCascadeEffect(cascade, gameState);
      if (result.applied) {
        resolved.push(result);
        totalEffects += result.magnitude || 1;
        currentDepth++;
      }
    }

    this.cascadeHistory.push({
      timestamp: Date.now(),
      cascades: resolved,
      totalEffects,
      depth: currentDepth
    });

    return {
      resolved,
      totalEffects,
      depth: currentDepth
    };
  }

  /**
   * 应用连锁效果
   * @param {object} cascade - 连锁协同
   * @param {object} gameState - 游戏状态
   * @returns {object} 应用结果
   */
  applyCascadeEffect(cascade, gameState) {
    if (!cascade || !gameState) {
      return { applied: false, reason: 'invalid_input' };
    }

    const synergy = this.registry.synergies.get(cascade.synergyId);
    if (!synergy) {
      return { applied: false, reason: 'synergy_not_found' };
    }

    // 根据效果类型应用不同效果
    let appliedEffect = null;
    const effectType = cascade.effect || synergy.effect;

    switch (effectType) {
      case 'damage_boost':
        appliedEffect = this.applyDamageBoost(cascade, gameState);
        break;
      case 'draw_card':
        appliedEffect = this.applyDrawCard(cascade, gameState);
        break;
      case 'energy_gain':
        appliedEffect = this.applyEnergyGain(cascade, gameState);
        break;
      case 'heal':
        appliedEffect = this.applyHeal(cascade, gameState);
        break;
      case 'block':
        appliedEffect = this.applyBlock(cascade, gameState);
        break;
      default:
        appliedEffect = { type: effectType, magnitude: cascade.magnitude };
    }

    return {
      applied: true,
      synergyId: cascade.synergyId,
      effect: appliedEffect,
      magnitude: cascade.magnitude || synergy.magnitude,
      targetCards: cascade.targetCards
    };
  }

  /**
   * 应用伤害提升效果
   */
  applyDamageBoost(cascade, gameState) {
    const magnitude = cascade.magnitude || 0;
    if (gameState.player) {
      gameState.player.damageBoost = (gameState.player.damageBoost || 0) + magnitude;
    }
    return { type: 'damage_boost', magnitude };
  }

  /**
   * 应用抽牌效果
   */
  applyDrawCard(cascade, gameState) {
    const magnitude = cascade.magnitude || 1;
    if (gameState.drawPile) {
      gameState.drawPile = gameState.drawPile || [];
      // 模拟抽牌
      for (let i = 0; i < magnitude; i++) {
        if (gameState.drawPile.length > 0) {
          const card = gameState.drawPile.shift();
          if (gameState.hand) {
            gameState.hand.push(card);
          }
        }
      }
    }
    return { type: 'draw_card', magnitude };
  }

  /**
   * 应用能量获取效果
   */
  applyEnergyGain(cascade, gameState) {
    const magnitude = cascade.magnitude || 0;
    if (gameState.player) {
      gameState.player.energy = (gameState.player.energy || 0) + magnitude;
    }
    return { type: 'energy_gain', magnitude };
  }

  /**
   * 应用治疗效果
   */
  applyHeal(cascade, gameState) {
    const magnitude = cascade.magnitude || 0;
    if (gameState.player) {
      gameState.player.currentHp = Math.min(
        gameState.player.maxHp || gameState.player.currentHp || 100,
        (gameState.player.currentHp || 50) + magnitude
      );
    }
    return { type: 'heal', magnitude };
  }

  /**
   * 应用护甲效果
   */
  applyBlock(cascade, gameState) {
    const magnitude = cascade.magnitude || 0;
    if (gameState.player) {
      gameState.player.block = (gameState.player.block || 0) + magnitude;
    }
    return { type: 'block', magnitude };
  }

  /**
   * 开始新的连锁
   * @param {string} gameId - 游戏ID
   * @returns {boolean}
   */
  startCascade(gameId) {
    if (this.activeCascades.has(gameId)) {
      return false;
    }
    this.activeCascades.set(gameId, []);
    return true;
  }

  /**
   * 添加到活跃连锁
   * @param {string} gameId - 游戏ID
   * @param {object} cascade - 连锁协同
   */
  pushToCascade(gameId, cascade) {
    const stack = this.activeCascades.get(gameId);
    if (!stack) return;
    
    if (stack.length >= this.maxCascadeDepth) {
      return; // 达到最大深度
    }
    
    stack.push(cascade);
  }

  /**
   * 结束连锁并获取结果
   * @param {string} gameId - 游戏ID
   * @param {object} gameState - 游戏状态
   * @returns {object} 解析结果
   */
  endCascade(gameId, gameState) {
    const stack = this.activeCascades.get(gameId);
    if (!stack) return { resolved: [], totalEffects: 0, depth: 0 };

    const result = this.resolveCascade(stack, gameState);
    this.activeCascades.delete(gameId);
    return result;
  }

  /**
   * 获取连锁历史
   * @returns {object[]}
   */
  getCascadeHistory() {
    return [...this.cascadeHistory];
  }

  /**
   * 清除连锁历史
   */
  clearHistory() {
    this.cascadeHistory = [];
  }

  /**
   * 设置最大连锁深度
   * @param {number} depth
   */
  setMaxCascadeDepth(depth) {
    if (depth > 0 && depth <= 10) {
      this.maxCascadeDepth = depth;
    }
  }
}

/**
 * SynergyHooks - 协同效果事件钩子
 * 类似EventBus的pub/sub模式，管理协同事件的订阅和广播
 */
class SynergyHooks {
  constructor() {
    this.handlers = {
      onCardPlayed: [],
      onSynergyTriggered: [],
      onCascadeResolved: []
    };
    this.hookEnabled = true;
    this.eventLog = [];
  }

  /**
   * 卡牌打出时钩子
   * @param {function} handler - 处理器函数
   * @returns {function} 取消订阅函数
   */
  onCardPlayed(handler) {
    if (typeof handler !== 'function') return () => {};
    this.handlers.onCardPlayed.push(handler);
    
    return () => {
      const index = this.handlers.onCardPlayed.indexOf(handler);
      if (index !== -1) {
        this.handlers.onCardPlayed.splice(index, 1);
      }
    };
  }

  /**
   * 协同触发时钩子
   * @param {function} handler - 处理器函数
   * @returns {function} 取消订阅函数
   */
  onSynergyTriggered(handler) {
    if (typeof handler !== 'function') return () => {};
    this.handlers.onSynergyTriggered.push(handler);
    
    return () => {
      const index = this.handlers.onSynergyTriggered.indexOf(handler);
      if (index !== -1) {
        this.handlers.onSynergyTriggered.splice(index, 1);
      }
    };
  }

  /**
   * 连锁解析完成时钩子
   * @param {function} handler - 处理器函数
   * @returns {function} 取消订阅函数
   */
  onCascadeResolved(handler) {
    if (typeof handler !== 'function') return () => {};
    this.handlers.onCascadeResolved.push(handler);
    
    return () => {
      const index = this.handlers.onCascadeResolved.indexOf(handler);
      if (index !== -1) {
        this.handlers.onCascadeResolved.splice(index, 1);
      }
    };
  }

  /**
   * 触发卡牌打出事件
   * @param {object} card - 卡牌对象
   * @param {object} gameState - 游戏状态
   */
  triggerCardPlayed(card, gameState) {
    if (!this.hookEnabled) return;
    
    const event = {
      type: 'onCardPlayed',
      card: card,
      gameState: gameState,
      timestamp: Date.now()
    };
    
    this.eventLog.push(event);
    this.broadcast('onCardPlayed', event);
  }

  /**
   * 触发协同触发事件
   * @param {object} synergy - 协同效果
   * @param {object} context - 触发上下文
   */
  triggerSynergy(synergy, context) {
    if (!this.hookEnabled) return;
    
    const event = {
      type: 'onSynergyTriggered',
      synergy: synergy,
      context: context,
      timestamp: Date.now()
    };
    
    this.eventLog.push(event);
    this.broadcast('onSynergyTriggered', event);
  }

  /**
   * 触发连锁解析完成事件
   * @param {object} result - 解析结果
   */
  triggerCascadeResolved(result) {
    if (!this.hookEnabled) return;
    
    const event = {
      type: 'onCascadeResolved',
      result: result,
      timestamp: Date.now()
    };
    
    this.eventLog.push(event);
    this.broadcast('onCascadeResolved', event);
  }

  /**
   * 广播事件到所有处理器
   * @param {string} eventType - 事件类型
   * @param {object} event - 事件数据
   */
  broadcast(eventType, event) {
    const handlers = this.handlers[eventType] || [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (e) {
        console.warn(`[SynergyHooks] Handler error in ${eventType}:`, e);
      }
    }
  }

  /**
   * 启用/禁用钩子
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.hookEnabled = !!enabled;
  }

  /**
   * 获取事件日志
   * @returns {object[]}
   */
  getEventLog() {
    return [...this.eventLog];
  }

  /**
   * 清除事件日志
   */
  clearEventLog() {
    this.eventLog = [];
  }

  /**
   * 获取处理器数量
   * @returns {object}
   */
  getHandlerCount() {
    return {
      onCardPlayed: this.handlers.onCardPlayed.length,
      onSynergyTriggered: this.handlers.onSynergyTriggered.length,
      onCascadeResolved: this.handlers.onCascadeResolved.length
    };
  }

  /**
   * 移除所有处理器
   */
  clearAll() {
    this.handlers.onCardPlayed = [];
    this.handlers.onSynergyTriggered = [];
    this.handlers.onCascadeResolved = [];
  }
}

/**
 * SynergyPanel - 协同效果UI面板
 * 显示卡组协同效果列表和可触发的连锁提示
 */
class SynergyPanel {
  constructor(containerId, synergyRegistry, cascadeEngine) {
    this.containerId = containerId || 'synergy-panel';
    this.registry = synergyRegistry;
    this.cascadeEngine = cascadeEngine;
    this.hooks = new SynergyHooks();
    this.currentDeck = [];
    this.visible = false;
    this.panelElement = null;
  }

  /**
   * 初始化面板
   */
  init() {
    // 创建面板HTML结构
    this.createPanelElement();
    
    // 绑定钩子用于实时更新
    this.hooks.onSynergyTriggered((event) => {
      this.showCascadeNotification(event.synergy);
    });
  }

  /**
   * 创建面板DOM元素
   */
  createPanelElement() {
    // 检查是否已存在
    let existing = document.getElementById(this.containerId);
    if (existing) {
      this.panelElement = existing;
      return;
    }

    // 创建新面板
    this.panelElement = document.createElement('div');
    this.panelElement.id = this.containerId;
    this.panelElement.className = 'synergy-panel';
    this.panelElement.innerHTML = this.getPanelHTML();
    
    // 添加到body
    if (document.body) {
      document.body.appendChild(this.panelElement);
    }
  }

  /**
   * 获取面板HTML
   * @returns {string}
   */
  getPanelHTML() {
    return `
      <div class="synergy-panel-header">
        <h3>卡牌协同效果</h3>
        <button class="synergy-panel-close" onclick="window.SynergyPanelInstance?.hide()">×</button>
      </div>
      <div class="synergy-panel-content">
        <div class="synergy-list-section">
          <h4>已注册协同</h4>
          <div class="synergy-list" id="${this.containerId}-list"></div>
        </div>
        <div class="synergy-cascade-section">
          <h4>可触发连锁</h4>
          <div class="synergy-cascade-tips" id="${this.containerId}-tips"></div>
        </div>
      </div>
      <style>
        .synergy-panel {
          position: fixed;
          top: 10px;
          right: 10px;
          width: 300px;
          max-height: 500px;
          background: #1a1a2e;
          border: 2px solid #e94560;
          border-radius: 8px;
          color: #fff;
          font-family: Arial, sans-serif;
          z-index: 1000;
          display: none;
          overflow: hidden;
        }
        .synergy-panel.visible {
          display: block;
        }
        .synergy-panel-header {
          background: #16213e;
          padding: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e94560;
        }
        .synergy-panel-header h3 {
          margin: 0;
          font-size: 14px;
          color: #e94560;
        }
        .synergy-panel-close {
          background: none;
          border: none;
          color: #fff;
          font-size: 20px;
          cursor: pointer;
        }
        .synergy-panel-content {
          padding: 10px;
          max-height: 450px;
          overflow-y: auto;
        }
        .synergy-list-section h4,
        .synergy-cascade-section h4 {
          margin: 0 0 8px 0;
          font-size: 12px;
          color: #0f3460;
          background: #e94560;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .synergy-list {
          max-height: 200px;
          overflow-y: auto;
        }
        .synergy-item {
          background: #16213e;
          padding: 8px;
          margin-bottom: 6px;
          border-radius: 4px;
          font-size: 12px;
        }
        .synergy-item-name {
          color: #e94560;
          font-weight: bold;
        }
        .synergy-item-effect {
          color: #94a2a8;
        }
        .synergy-cascade-tips {
          font-size: 12px;
        }
        .cascade-tip {
          background: #16213e;
          padding: 6px;
          margin-bottom: 4px;
          border-radius: 4px;
          border-left: 3px solid #e94560;
        }
      </style>
    `;
  }

  /**
   * 显示面板
   */
  show() {
    if (this.panelElement) {
      this.panelElement.classList.add('visible');
      this.visible = true;
      this.refresh();
    }
  }

  /**
   * 隐藏面板
   */
  hide() {
    if (this.panelElement) {
      this.panelElement.classList.remove('visible');
      this.visible = false;
    }
  }

  /**
   * 切换面板显示状态
   */
  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 设置当前卡组
   * @param {object[]} deck - 卡组数组
   */
  setDeck(deck) {
    this.currentDeck = deck || [];
    this.refresh();
  }

  /**
   * 刷新面板显示
   */
  refresh() {
    if (!this.panelElement) return;

    // 更新协同列表
    const listElement = document.getElementById(`${this.containerId}-list`);
    if (listElement) {
      listElement.innerHTML = this.renderSynergyList();
    }

    // 更新连锁提示
    const tipsElement = document.getElementById(`${this.containerId}-tips`);
    if (tipsElement) {
      tipsElement.innerHTML = this.renderCascadeTips();
    }
  }

  /**
   * 渲染协同效果列表
   * @returns {string}
   */
  renderSynergyList() {
    const synergies = this.registry.getAllSynergies();
    if (synergies.length === 0) {
      return '<div class="synergy-item">暂无协同效果</div>';
    }

    return synergies.map(synergy => `
      <div class="synergy-item">
        <div class="synergy-item-name">${synergy.id}</div>
        <div class="synergy-item-effect">${synergy.effect} (+${synergy.magnitude})</div>
        <div class="synergy-item-desc">${synergy.description || ''}</div>
      </div>
    `).join('');
  }

  /**
   * 渲染可触发连锁提示
   * @returns {string}
   */
  renderCascadeTips() {
    if (this.currentDeck.length === 0) {
      return '<div class="cascade-tip">请先设置卡组</div>';
    }

    const cardIds = this.currentDeck.map(c => c.id || c);
    const chains = this.registry.getSynergyChains(cardIds);
    
    if (chains.length === 0) {
      return '<div class="cascade-tip">当前卡组无可触发连锁</div>';
    }

    return chains.slice(0, 5).map((chain, index) => `
      <div class="cascade-tip">
        <strong>连锁 ${index + 1}:</strong> ${chain.length} 层协同
      </div>
    `).join('');
  }

  /**
   * 显示连锁触发通知
   * @param {object} synergy - 协同效果
   */
  showCascadeNotification(synergy) {
    if (!synergy) return;
    
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'synergy-notification';
    notification.innerHTML = `
      <span>🎯 协同触发: ${synergy.id}</span>
      <span>${synergy.effect} (+${synergy.magnitude})</span>
    `;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #e94560;
      color: #fff;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 1001;
      animation: fadeInOut 2s forwards;
    `;
    
    // 添加动画样式
    if (!document.getElementById('synergy-animation')) {
      const style = document.createElement('style');
      style.id = 'synergy-animation';
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(20px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // 2秒后移除
    setTimeout(() => {
      notification.remove();
    }, 2000);
  }

  /**
   * 获取面板可见状态
   * @returns {boolean}
   */
  isVisible() {
    return this.visible;
  }

  /**
   * 销毁面板
   */
  destroy() {
    if (this.panelElement) {
      this.panelElement.remove();
      this.panelElement = null;
    }
    this.hooks.clearAll();
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SynergyRegistry,
    CascadeEngine,
    SynergyHooks,
    SynergyPanel
  };
}