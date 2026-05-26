'use strict';
const fs = require('fs');
const path = require('path');

// PRE-MOCKS for browser-like globals
global.localStorage = {
  _store: {},
  getItem(k) { return this._store.hasOwnProperty(k) ? this._store[k] : null; },
  setItem(k, v) { this._store[k] = v; },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};
global.window = global;
global.document = {
  addEventListener: () => {},
  body: { appendChild: () => {}, querySelector: () => null },
  querySelectorAll: () => [],
  getElementById: () => null
};

// Simple in-memory game state for MCP server tools
const mockGameState = {
  player: {
    hp: 80, maxHp: 80, gold: 150, energy: 3, maxEnergy: 3,
    deck: [
      { id: 'strike', name: '打击', type: 'attack', rarity: 'common', cost: 1, damage: 6, description: '造成6点伤害' },
      { id: 'defend', name: '防御', type: 'skill', rarity: 'common', cost: 1, block: 5, description: '获得5点格挡' },
      { id: 'bash', name: '重击', type: 'attack', rarity: 'uncommon', cost: 2, damage: 12, description: '造成12点伤害' },
      { id: 'heal', name: '治疗', type: 'skill', rarity: 'common', cost: 1, heal: 8, description: '恢复8点HP' },
      { id: 'fireball', name: '火球', type: 'attack', rarity: 'rare', cost: 2, damage: 20, description: '造成20点伤害' },
    ]
  },
  enemy: { name: '史莱姆王', hp: 50, maxHp: 50, attack: 8 },
  currentNode: 'battle',
  gamePhase: 'player_turn'
};

global.window.gameState = mockGameState;

// ===== V88 MCP Server =====
/**
 * card-game-prototype MCP Server
 * Implements JSON-RPC 2.0 over stdio
 * Exposes game state and actions as MCP tools
 */

class CardGameMCPServer {
  constructor() {
    this.version = '1.1.0';
    this.name = 'card-game-prototype';
    this.tools = this._buildTools();
    this.memory = { L0: {}, L1: [], L2: [], L3: [], L4: {} };
    this.dreams = [];
    this.skills = [];
    this.evolutionLog = [];
    this.tuningParams = {};
    this._requestId = 0;
  }

  _buildTools() {
    return {
      // === Game State Tools ===
      getGameState: {
        description: '获取当前游戏状态（玩家HP、金币、能量、手牌数、敌人状态）',
        inputSchema: { type: 'object', properties: {} },
        handler: () => ({ ...mockGameState.player, enemy: mockGameState.enemy, currentNode: mockGameState.currentNode, gamePhase: mockGameState.gamePhase })
      },
      getPlayerDeck: {
        description: '获取玩家牌组所有卡牌列表',
        inputSchema: { type: 'object', properties: {} },
        handler: () => [...mockGameState.player.deck]
      },
      getCardById: {
        description: '根据ID获取单张卡牌详情',
        inputSchema: { type: 'object', properties: { cardId: { type: 'string', description: '卡牌ID' } }, required: ['cardId'] },
        handler: ({ cardId }) => {
          const card = mockGameState.player.deck.find(c => c.id === cardId);
          return card ? { ...card } : { error: `Card ${cardId} not found` };
        }
      },
      getAvailableEnergy: {
        description: '获取当前可用能量和最大能量',
        inputSchema: { type: 'object', properties: {} },
        handler: () => ({ current: mockGameState.player.energy, max: mockGameState.player.maxEnergy })
      },

      // === AI Memory Tools (L0-L4) ===
      getL0SystemConfig: {
        description: '获取L0系统配置（角色设定、游戏规则、平衡参数）',
        inputSchema: { type: 'object', properties: {} },
        handler: () => ({ ...this.memory.L0 })
      },
      getL1SessionHistory: {
        description: '获取L1会话历史（最近N场对局摘要）',
        inputSchema: { type: 'object', properties: { limit: { type: 'number', description: '返回条数，默认10' } }, required: [] },
        handler: ({ limit = 10 } = {}) => this.memory.L1.slice(-limit)
      },
      getL2PatternArchive: {
        description: '获取L2模式归档（识别的玩家策略模式）',
        inputSchema: { type: 'object', properties: {} },
        handler: () => Object.values(this.memory.L2)
      },
      getL3MetaModel: {
        description: '获取L3元模型（当前游戏风格标签、偏好）',
        inputSchema: { type: 'object', properties: {} },
        handler: () => ({ ...this.memory.L3 })
      },
      getL4WorldModel: {
        description: '获取L4世界模型（游戏环境知识、卡牌协同知识）',
        inputSchema: { type: 'object', properties: {} },
        handler: () => ({ ...this.memory.L4 })
      },
      updateL0Config: {
        description: '更新L0系统配置',
        inputSchema: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' } }, required: ['key', 'value'] },
        handler: ({ key, value }) => { this.memory.L0[key] = value; return { success: true, key, value }; }
      },
      addL1Session: {
        description: '添加L1会话记录',
        inputSchema: { type: 'object', properties: { sessionId: { type: 'string' }, outcome: { type: 'string' }, hpRatio: { type: 'number' }, damageDealt: { type: 'number' } }, required: ['sessionId'] },
        handler: (session) => { this.memory.L1.push({ ...session, timestamp: Date.now() }); return { success: true, count: this.memory.L1.length }; }
      },

      // === Dream Memory Tools ===
      getDreamFragments: {
        description: '获取最近的梦境碎片列表',
        inputSchema: { type: 'object', properties: { owner: { type: 'string', description: '玩家ID，默认player1' }, limit: { type: 'number' } }, required: [] },
        handler: ({ owner = 'player1', limit = 20 } = {}) => this.dreams.slice(-limit).map(d => ({ id: d.id, title: d.title, archetype: d.archetype, emotion: d.emotion, timestamp: d.timestamp }))
      },
      getDreamDetail: {
        description: '获取梦境详情（包含AI关键决策）',
        inputSchema: { type: 'object', properties: { dreamId: { type: 'string' } }, required: ['dreamId'] },
        handler: ({ dreamId }) => this.dreams.find(d => d.id === dreamId) || { error: `Dream ${dreamId} not found` }
      },
      generateDream: {
        description: '从L1会话生成梦境',
        inputSchema: { type: 'object', properties: { sessionId: { type: 'string' } }, required: ['sessionId'] },
        handler: ({ sessionId }) => {
          const session = this.memory.L1.find(s => s.sessionId === sessionId);
          if (!session) return { error: `Session ${sessionId} not found` };
          const dream = this._createDream(session);
          this.dreams.push(dream);
          return { success: true, dreamId: dream.id };
        }
      },

      // === Skill Tools ===
      getSkills: {
        description: '获取当前AI技能结晶列表',
        inputSchema: { type: 'object', properties: {} },
        handler: () => [...this.skills]
      },
      getSkillById: {
        description: '根据ID获取技能详情',
        inputSchema: { type: 'object', properties: { skillId: { type: 'string' } }, required: ['skillId'] },
        handler: ({ skillId }) => this.skills.find(s => s.id === skillId) || { error: `Skill ${skillId} not found` }
      },

      // === Self-Evolution Tools ===
      getEvolutionLog: {
        description: '获取自演化历史记录',
        inputSchema: { type: 'object', properties: { limit: { type: 'number', description: '返回条数，默认10' } }, required: [] },
        handler: ({ limit = 10 } = {}) => this.evolutionLog.slice(-limit)
      },
      analyzePerformance: {
        description: '分析最近N场对局的AI表现，计算胜率、伤害、生存率等指标',
        inputSchema: { type: 'object', properties: { sessions: { type: 'array', description: 'L1会话列表' } }, required: ['sessions'] },
        handler: ({ sessions }) => {
          if (!sessions || sessions.length === 0) return { error: 'No sessions provided' };
          const total = sessions.length;
          const victories = sessions.filter(s => s.outcome === 'victory').length;
          const avgDamage = sessions.reduce((sum, s) => sum + (s.damageDealt || 0), 0) / total;
          const avgHpRatio = sessions.reduce((sum, s) => sum + (s.hpRatio || 0), 0) / total;
          const survivals = sessions.filter(s => s.hpRatio > 0).length;
          return {
            totalSessions: total,
            winRate: victories / total,
            avgDamageDealt: Math.round(avgDamage),
            avgSurvivalHpRatio: Math.round(avgHpRatio * 100) / 100,
            survivability: survivals / total,
            recommendations: this._generateRecommendations(victories / total, avgDamage, avgHpRatio)
          };
        }
      },
      generateImprovement: {
        description: '基于表现分析生成参数调优建议',
        inputSchema: { type: 'object', properties: { analysis: { type: 'object', description: 'analyzePerformance返回的分析结果' } }, required: ['analysis'] },
        handler: ({ analysis }) => {
          if (!analysis) return { error: 'No analysis provided' };
          const recs = [];
          if (analysis.winRate < 0.5) recs.push({ param: 'enemy_damage_base', direction: 'reduce', amount: 0.1, reason: '玩家胜率偏低，降低敌人基础伤害10%' });
          if (analysis.avgDamageDealt < 50) recs.push({ param: 'player_attack_multiplier', direction: 'increase', amount: 0.15, reason: '玩家平均伤害偏低，提升攻击力系数15%' });
          if (analysis.avgSurvivalHpRatio < 0.3) recs.push({ param: 'healing_rate', direction: 'increase', amount: 0.2, reason: '玩家存活HP偏低，提升治疗率20%' });
          if (analysis.survivability < 0.7) recs.push({ param: 'block_effectiveness', direction: 'increase', amount: 0.1, reason: '生存率偏低，提升格挡效果10%' });
          return { improvementId: `imp_${Date.now()}`, recommendations: recs, confidence: analysis.winRate > 0.6 ? 'high' : 'medium' };
        }
      },
      applyImprovement: {
        description: '应用参数调优到游戏AI',
        inputSchema: { type: 'object', properties: { improvementId: { type: 'string' }, recommendations: { type: 'array' } }, required: ['improvementId', 'recommendations'] },
        handler: ({ improvementId, recommendations }) => {
          if (!improvementId || !recommendations || recommendations.length === 0) return { error: 'Missing improvementId or recommendations' };
          const applied = recommendations.map(r => {
            this.tuningParams[r.param] = this.tuningParams[r.param] || {};
            const current = this.tuningParams[r.param].value || 1.0;
            const delta = r.direction === 'increase' ? r.amount : -r.amount;
            this.tuningParams[r.param] = { value: Math.round((current + delta) * 1000) / 1000, lastUpdate: Date.now() };
            return { param: r.param, oldValue: current, newValue: this.tuningParams[r.param].value };
          });
          this.evolutionLog.push({ improvementId, applied, timestamp: Date.now(), status: 'applied' });
          return { success: true, improvementId, applied, newParams: this.tuningParams };
        }
      },
      getTuningParams: {
        description: '获取当前参数调优状态',
        inputSchema: { type: 'object', properties: {} },
        handler: () => ({ ...this.tuningParams })
      },

      // === System Tools ===
      ping: {
        description: '健康检查',
        inputSchema: { type: 'object', properties: {} },
        handler: () => ({ pong: true, version: this.version, timestamp: Date.now() })
      },
      listTools: {
        description: '列出所有可用工具',
        inputSchema: { type: 'object', properties: {} },
        handler: () => Object.entries(this.tools).map(([name, tool]) => ({ name, description: tool.description }))
      },
      getServerInfo: {
        description: '获取服务器信息',
        inputSchema: { type: 'object', properties: {} },
        handler: () => ({ name: this.name, version: this.version, description: 'card-game-prototype MCP Server', toolCount: Object.keys(this.tools).length })
      }
    };
  }

  _createDream(session) {
    const archetypes = ['aggressive', 'defensive', 'control', 'balanced'];
    const emotions = ['exciting', 'tense', 'strategic', 'defensive', 'neutral'];
    const titles = [
      '回忆: 关键一战', '回溯: 策略布局', '重现: 逆转时刻', '追溯: 完美收官'
    ];
    return {
      id: `dream_${Date.now()}`,
      sessionId: session.sessionId,
      title: titles[Math.floor(Math.random() * titles.length)],
      summary: `本局以${session.outcome}结束。玩家造成了${session.damageDealt || 0}点伤害，HP比例${((session.hpRatio || 1) * 100).toFixed(0)}%。`,
      archetype: archetypes[Math.floor(Math.random() * archetypes.length)],
      emotion: emotions[Math.floor(Math.random() * emotions.length)],
      keyDecisions: [
        { turn: 1, action: '使用打击卡牌', reasoning: '消耗最低能量造成稳定伤害' },
        { turn: 2, action: '保留能量', reasoning: '等待更好时机使用高伤害卡牌' }
      ],
      timestamp: Date.now()
    };
  }

  _generateRecommendations(winRate, avgDamage, avgHpRatio) {
    const recs = [];
    if (winRate < 0.5) recs.push('建议降低敌人伤害或增加玩家初始生命值');
    if (avgDamage < 50) recs.push('建议提升卡牌伤害或降低敌人护甲');
    if (avgHpRatio < 0.3) recs.push('建议增加治疗卡牌效果或减少敌人攻击频率');
    return recs;
  }

  // JSON-RPC 2.0 stdio protocol
  _handleRequest(request) {
    const { method, params, id } = request;

    if (method === 'initialize') {
      return { jsonrpc: '2.0', result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: this.name, version: this.version } }, id };
    }
    if (method === 'tools/list') {
      const tools = Object.entries(this.tools).map(([name, tool]) => ({
        name, description: tool.description,
        inputSchema: { type: 'object', properties: tool.inputSchema.properties || {}, required: tool.inputSchema.required || [] }
      }));
      return { jsonrpc: '2.0', result: { tools }, id };
    }
    if (method === 'tools/call') {
      const { name, arguments: args = {} } = params;
      const tool = this.tools[name];
      if (!tool) return { jsonrpc: '2.0', error: { code: -32602, message: `Unknown tool: ${name}` }, id };
      try {
        const result = tool.handler(args);
        return { jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }, id };
      } catch (e) {
        return { jsonrpc: '2.0', error: { code: -32603, message: e.message }, id };
      }
    }
    if (method === 'ping') return { jsonrpc: '2.0', result: { pong: true }, id };
    return { jsonrpc: '2.0', error: { code: -32601, message: `Method not found: ${method}` }, id: id || null };
  }

  processMessage(message) {
    try {
      const request = JSON.parse(message);
      const response = this._handleRequest(request);
      if (response) process.stdout.write(JSON.stringify(response) + '\n');
    } catch (e) {
      process.stderr.write(`Parse error: ${e.message}\n`);
    }
  }

  run() {
    // Read lines from stdin
    let buffer = '';
    process.stdin.on('data', (chunk) => {
      buffer += chunk.toString();
      let newline;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) this.processMessage(line);
      }
    });
    process.stdin.on('end', () => { process.exit(0); });
  }
}

// Export for testing
module.exports = { CardGameMCPServer };

// Run if executed directly
if (require.main === module) {
  const server = new CardGameMCPServer();
  server.run();
}