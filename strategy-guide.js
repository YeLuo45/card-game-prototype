// ============================================================================
// AI Strategy Guide — V99 Direction S
// chatdev Multi-Agent + nanobot MessageBus + generic-agent L0-L4 Memory
// ruflo Hook System + thunderbolt Offline-first + claude-code Tool System
// ============================================================================

// ---------------------------------------------------------------------------
// SuggestionEngine — core recommendation algorithm
// ---------------------------------------------------------------------------
class SuggestionEngine {
    constructor() {
        // Strategy scoring weights
        this.weights = {
            damage: 1.2,
            defense: 1.0,
            cardDraw: 0.8,
            energyEfficiency: 1.5,
            comboPotential: 1.3,
            survival: 1.1
        };
    }

    // Evaluate a single card's strategic value
    evaluateCard(card, gameState, context = {}) {
        if (!card || !card.name) return 0;
        let score = 0;
        const energy = gameState.player?.energy || 0;
        const maxEnergy = gameState.player?.maxEnergy || 3;
        const hp = gameState.player?.hp || 0;
        const maxHp = gameState.player?.maxHp || 100;

        // Energy efficiency — most important
        const cardCost = card.cost || 0;
        if (cardCost <= energy) {
            score += this.weights.energyEfficiency * (1 - cardCost / Math.max(energy, 1));
        }

        // Damage potential
        if (card.type === 'attack' || card.damage) {
            const dmg = card.damage || 0;
            score += this.weights.damage * Math.log1p(dmg);
        }

        // Defense value
        if (card.type === 'skill' && (card.block || card.defense)) {
            score += this.weights.defense * (card.block || card.defense || 0) * 0.5;
        }

        // Card draw
        if (card.cardDraw || card.draw) {
            score += this.weights.cardDraw * (card.cardDraw || card.draw || 0);
        }

        // Survival priority when low HP
        if (hp / maxHp < 0.3 && card.type === 'skill') {
            score *= 1.5;
        }

        // Combo potential (simplified)
        if (context.recentCards && context.recentCards.includes(card.name)) {
            score *= 0.8; // Don't repeat same card too often
        }

        return Math.round(score * 100) / 100;
    }

    // Generate top-N suggestions for current hand
    generateSuggestions(hand, gameState, context = {}) {
        if (!hand || hand.length === 0) return [];
        
        const playable = hand.filter(c => (c.cost || 0) <= (gameState.player?.energy || 0));
        if (playable.length === 0) return [];

        const scored = playable.map(card => ({
            card,
            score: this.evaluateCard(card, gameState, context),
            reason: this._generateReason(card, gameState)
        }));

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, 3);
    }

    _generateReason(card, gameState) {
        const reasons = [];
        if (card.type === 'attack' && card.damage) {
            reasons.push(`造成 ${card.damage} 点伤害`);
        }
        if (card.type === 'skill' && card.block) {
            reasons.push(`获得 ${card.block} 点格挡`);
        }
        if (card.cardDraw) {
            reasons.push(`抽 ${card.cardDraw} 张牌`);
        }
        if (card.cost !== undefined) {
            reasons.push(`消耗 ${card.cost} 能量`);
        }
        return reasons.join(', ') || '综合效益';
    }

    // Analyze player archetype from history
    analyzeArchetype(sessionHistory) {
        if (!sessionHistory || sessionHistory.length === 0) return 'balanced';
        
        let aggressive = 0, defensive = 0, control = 0;
        sessionHistory.forEach(session => {
            if (session.keyCards) {
                session.keyCards.forEach(name => {
                    if (name.includes('攻击') || name.includes('Strike') || name.includes('slash')) aggressive++;
                    if (name.includes('防御') || name.includes('Defend') || name.includes('block')) defensive++;
                    if (name.includes('抽牌') || name.includes('Draw')) control++;
                });
            }
        });

        const total = aggressive + defensive + control;
        if (total === 0) return 'balanced';
        const ratio = aggressive / total;
        if (ratio > 0.6) return 'aggressive';
        if (ratio < 0.3) return 'defensive';
        return 'balanced';
    }
}

// ---------------------------------------------------------------------------
// ObserverAgent — monitors game state, detects key moments
// ---------------------------------------------------------------------------
class ObserverAgent {
    constructor(messageBus) {
        this.messageBus = messageBus;
        this.lastState = null;
        this.lastHand = null;
        this.lastEnemyIntent = null;
        this.listeners = [];
        
        // Register to message bus events
        if (messageBus) {
            messageBus.subscribe('game.stateChanged', (data) => this.onGameStateChanged(data));
            messageBus.subscribe('player.energyChanged', (data) => this.onEnergyChanged(data));
            messageBus.subscribe('enemy.intentRevealed', (data) => this.onEnemyIntentChanged(data));
        }
    }

    onGameStateChanged(data) {
        const prev = this.lastState;
        this.lastState = data;
        
        // Detect phase transitions
        if (prev && data.phase !== prev.phase) {
            this.emit('phaseChange', { from: prev.phase, to: data.phase });
        }
    }

    onEnergyChanged(data) {
        this.emit('energyChange', data);
    }

    onEnemyIntentChanged(data) {
        this.lastEnemyIntent = data;
        this.emit('intentChange', data);
    }

    getCurrentContext() {
        if (typeof window === 'undefined' || !window.gameState) {
            return { hand: [], player: {}, enemy: {}, phase: 'unknown' };
        }
        const gs = window.gameState;
        return {
            hand: gs.hand || [],
            player: gs.player || {},
            enemy: gs.currentEnemy || {},
            energy: gs.player?.energy || 0,
            maxEnergy: gs.player?.maxEnergy || 3,
            hp: gs.player?.hp || 0,
            maxHp: gs.player?.maxHp || 100,
            phase: gs.phase || 'unknown',
            enemyIntent: this.lastEnemyIntent
        };
    }

    on(event, callback) {
        this.listeners.push({ event, callback });
    }

    emit(event, data) {
        this.listeners.filter(l => l.event === event).forEach(l => l.callback(data));
    }
}

// ---------------------------------------------------------------------------
// AdvisorAgent — analyzes player history via L0-L4 Memory
// ---------------------------------------------------------------------------
class AdvisorAgent {
    constructor(aimemory) {
        this.aimemory = aimemory;
        this.engine = new SuggestionEngine();
        this.currentProfile = null;
    }

    async loadPlayerProfile() {
        if (!this.aimemory) {
            this.currentProfile = { archetype: 'balanced', gamesPlayed: 0, winRate: 0.5 };
            return this.currentProfile;
        }

        try {
            // L2 pattern archive
            const patterns = await this.aimemory.getL2PatternArchive();
            // L3 meta model
            const meta = await this.aimemory.getL3MetaModel();
            
            this.currentProfile = {
                archetype: meta?.archetype || this.engine.analyzeArchetype([]),
                gamesPlayed: patterns?.length || 0,
                winRate: this._calculateWinRate(patterns),
                preferredCards: this._extractPreferredCards(patterns),
                commonMatchups: this._extractMatchups(patterns)
            };
        } catch (e) {
            this.currentProfile = { archetype: 'balanced', gamesPlayed: 0, winRate: 0.5 };
        }
        return this.currentProfile;
    }

    _calculateWinRate(patterns) {
        if (!patterns || patterns.length === 0) return 0.5;
        const wins = patterns.filter(p => p.outcome === 'win').length;
        return wins / patterns.length;
    }

    _extractPreferredCards(patterns) {
        if (!patterns) return [];
        const cardCounts = {};
        patterns.forEach(p => {
            (p.keyCards || []).forEach(name => {
                cardCounts[name] = (cardCounts[name] || 0) + 1;
            });
        });
        return Object.entries(cardCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(e => e[0]);
    }

    _extractMatchups(patterns) {
        if (!patterns) return {};
        const matchups = {};
        patterns.forEach(p => {
            if (p.enemy && p.outcome) {
                if (!matchups[p.enemy]) matchups[p.enemy] = { wins: 0, total: 0 };
                matchups[p.enemy].total++;
                if (p.outcome === 'win') matchups[p.enemy].wins++;
            }
        });
        return matchups;
    }

    async getAdvisoryContext(gameState) {
        await this.loadPlayerProfile();
        
        const context = {
            profile: this.currentProfile,
            recentPerformance: await this._getRecentPerformance(),
            matchupAdvice: this._getMatchupAdvice(gameState)
        };

        return context;
    }

    async _getRecentPerformance() {
        try {
            const sessions = await this.aimemory?.getL1SessionHistory?.();
            if (!sessions || sessions.length === 0) return { recent: 0, trend: 'neutral' };
            const recent = sessions.slice(-5);
            const wins = recent.filter(s => s.outcome === 'win').length;
            return { recent: wins / recent.length, trend: wins > 3 ? 'up' : wins < 2 ? 'down' : 'neutral' };
        } catch {
            return { recent: 0.5, trend: 'neutral' };
        }
    }

    _getMatchupAdvice(gameState) {
        if (!this.currentProfile?.commonMatchups || !gameState?.currentEnemy) return null;
        const enemy = gameState.currentEnemy.name || gameState.currentEnemy.id || '';
        const matchup = this.currentProfile.commonMatchups[enemy];
        if (!matchup) return null;
        return { winRate: matchup.wins / matchup.total, games: matchup.total };
    }
}

// ---------------------------------------------------------------------------
// TacticianAgent — generates specific card play recommendations
// ---------------------------------------------------------------------------
class TacticianAgent {
    constructor(suggestionEngine) {
        this.engine = suggestionEngine;
    }

    generateTactics(hand, gameState, context = {}) {
        const suggestions = this.engine.generateSuggestions(hand, gameState, context);
        
        return suggestions.map((s, i) => ({
            rank: i + 1,
            cardName: s.card.name,
            score: s.score,
            reason: s.reason,
            alternative: i === 0 ? this._getAlternative(s.card, hand) : null
        }));
    }

    _getAlternative(bestCard, hand) {
        const alternatives = hand.filter(c => 
            c.id !== bestCard.id && 
            (c.cost || 0) <= (bestCard.cost || 0) + 1 &&
            c.type !== bestCard.type
        );
        if (alternatives.length === 0) return null;
        return alternatives[0].name;
    }

    formatSuggestion(suggestion) {
        const icon = suggestion.rank === 1 ? '⭐' : suggestion.rank === 2 ? '✨' : '💡';
        return `${icon} [${suggestion.cardName}] ${suggestion.reason}`;
    }
}

// ---------------------------------------------------------------------------
// StrategyGuidePanel — UI component
// ---------------------------------------------------------------------------
class StrategyGuidePanel {
    constructor(messageBus, aimemory) {
        this.messageBus = messageBus;
        this.aimemory = aimemory;
        this.engine = new SuggestionEngine();
        this.observer = new ObserverAgent(messageBus);
        this.advisor = new AdvisorAgent(aimemory);
        this.tactician = new TacticianAgent(this.engine);
        this.isOpen = false;
        this.panel = null;
        this.strategies = [];
        
        this._registerHooks();
    }

    _registerHooks() {
        // Hook System integration
        if (typeof window !== 'undefined' && window.gameHookHub) {
            window.gameHookHub.registerHook('onPlayerTurnStart', async (gameState) => {
                if (this.isOpen) {
                    await this.updateSuggestions(gameState);
                }
            });
            window.gameHookHub.registerHook('onCardPlayed', async (data) => {
                if (this.isOpen) {
                    await this.updateSuggestions(window.gameState);
                }
            });
        }
    }

    async open() {
        this.isOpen = true;
        this._ensurePanel();
        this.panel.style.display = 'flex';
        await this.updateSuggestions(window.gameState);
    }

    close() {
        this.isOpen = false;
        if (this.panel) this.panel.style.display = 'none';
    }

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    }

    _ensurePanel() {
        if (this.panel) return;
        
        if (typeof document === 'undefined') return;

        // Check if already exists
        const existing = document.getElementById('strategy-guide-panel');
        if (existing) {
            this.panel = existing;
            return;
        }

        this.panel = document.createElement('div');
        this.panel.id = 'strategy-guide-panel';
        this.panel.innerHTML = this._getPanelHTML();
        this.panel.style.cssText = `
            position: fixed; top: 50%; right: 10px; transform: translateY(-50%);
            width: 280px; max-height: 400px; background: #1a1a2e; border: 2px solid #4a4a6a;
            border-radius: 12px; padding: 12px; z-index: 9999; display: none; flex-direction: column;
            font-family: 'Segoe UI', sans-serif; color: #e0e0e0; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        `;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = 'position: absolute; top: 8px; right: 10px; background: none; border: none; color: #888; cursor: pointer; font-size: 18px;';
        closeBtn.onclick = () => this.close();
        this.panel.appendChild(closeBtn);

        if (document.body) {
            document.body.appendChild(this.panel);
        }

        // Wire up event listeners
        const refreshBtn = this.panel.querySelector('#sg-refresh-btn');
        if (refreshBtn) {
            refreshBtn.onclick = () => this.updateSuggestions(window.gameState);
        }
    }

    _getPanelHTML() {
        return `
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #ffd700;">
                💡 AI 策略助手
            </div>
            <div id="sg-archetype" style="font-size: 11px; color: #aaa; margin-bottom: 8px;">
                加载中...
            </div>
            <div id="sg-suggestions" style="flex: 1; overflow-y: auto; font-size: 12px;">
                <div style="color: #888;">正在分析...</div>
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #333;">
                <button id="sg-refresh-btn" style="
                    width: 100%; padding: 6px; background: #2a2a4a; border: 1px solid #4a4a6a;
                    color: #e0e0e0; border-radius: 6px; cursor: pointer; font-size: 12px;">
                    🔄 刷新建议
                </button>
            </div>
        `;
    }

    async updateSuggestions(gameState) {
        if (!this.panel) return;

        try {
            // Load advisor profile
            const profile = await this.advisor.loadPlayerProfile();
            const archetypeEl = this.panel.querySelector('#sg-archetype');
            if (archetypeEl) {
                const archetypeText = {
                    aggressive: '⚔️ 进攻型',
                    defensive: '🛡️ 防守型',
                    balanced: '⚖️ 均衡型'
                };
                archetypeEl.textContent = `玩家风格: ${archetypeText[profile.archetype] || '均衡型'} | 胜率: ${Math.round(profile.winRate * 100)}%`;
            }

            // Get current hand from game state
            const hand = gameState?.hand || [];
            const context = await this.advisor.getAdvisoryContext(gameState);
            
            // Generate tactics
            const tactics = this.tactician.generateTactics(hand, gameState, context);
            this.strategies = tactics;

            // Update UI
            const suggestionsEl = this.panel.querySelector('#sg-suggestions');
            if (suggestionsEl) {
                if (tactics.length === 0) {
                    suggestionsEl.innerHTML = '<div style="color: #888;">当前无法生成建议</div>';
                } else {
                    suggestionsEl.innerHTML = tactics.map(t => `
                        <div style="margin-bottom: 8px; padding: 6px; background: #252540; border-radius: 6px;">
                            <div style="color: #ffd700; font-weight: bold;">${t.rank === 1 ? '⭐' : t.rank === 2 ? '✨' : '💡'} ${t.cardName}</div>
                            <div style="color: #aaa; font-size: 11px; margin-top: 2px;">${t.reason}</div>
                            ${t.rank === 1 && t.alternative ? `<div style="color: #666; font-size: 10px;">备选: ${t.alternative}</div>` : ''}
                        </div>
                    `).join('');
                }
            }

            // Publish suggestion event
            if (this.messageBus && tactics.length > 0) {
                this.messageBus.publish('strategy.suggestionGenerated', {
                    suggestions: tactics,
                    archetype: profile.archetype
                });
            }
        } catch (e) {
            console.error('[StrategyGuide] updateSuggestions error:', e);
        }
    }

    getStats() {
        return {
            panelOpen: this.isOpen,
            strategyCount: this.strategies.length,
            lastUpdate: new Date().toISOString()
        };
    }
}

// ---------------------------------------------------------------------------
// MemoryBridge — connects Strategy Guide to AIMemory L0-L4
// ---------------------------------------------------------------------------
class MemoryBridge {
    constructor(aimemory) {
        this.aimemory = aimemory;
    }

    async recordDecision(sessionId, card, gameState, suggestion) {
        if (!this.aimemory) return;
        if (!card || !card.id) return;
        try {
            const record = {
                type: 'decision',
                cardId: card.id,
                cardName: card.name,
                sessionId,
                gameState: {
                    hp: gameState.player?.hp,
                    energy: gameState.player?.energy,
                    phase: gameState.phase
                },
                suggestionRank: suggestion?.rank || 0,
                timestamp: Date.now()
            };

            // L1 session history
            await this.aimemory.addL1Session?.(record);
        } catch (e) {
            console.error('[MemoryBridge] recordDecision error:', e);
        }
    }

    async getDecisionHistory(cardName, limit = 10) {
        if (!this.aimemory) return [];
        try {
            const history = await this.aimemory.getL1SessionHistory?.();
            return (history || [])
                .filter(s => s.keyCards?.includes(cardName))
                .slice(-limit);
        } catch {
            return [];
        }
    }
}

// ---------------------------------------------------------------------------
// StrategyGuide MCP Tools (extend existing MCP server)
// ---------------------------------------------------------------------------
const StrategyGuideTools = {
    'strategy.getSuggestion': {
        description: 'Get AI strategy suggestions for current game state',
        parameters: {
            type: 'object',
            properties: {
                sessionId: { type: 'string', description: 'Optional session ID' }
            }
        },
        handler: async (args, context) => {
            const panel = context?.strategyGuide;
            if (!panel) return { error: 'StrategyGuide not initialized' };
            await panel.updateSuggestions(window.gameState);
            return {
                strategies: panel.strategies,
                stats: panel.getStats()
            };
        }
    },
    'strategy.getPlayerProfile': {
        description: 'Get player strategy profile from L0-L4 memory',
        parameters: { type: 'object', properties: {} },
        handler: async (args, context) => {
            const advisor = context?.advisor;
            if (!advisor) return { error: 'Advisor not initialized' };
            await advisor.loadPlayerProfile();
            return advisor.currentProfile;
        }
    },
    'strategy.getHistory': {
        description: 'Get historical decisions for a specific card',
        parameters: {
            type: 'object',
            properties: {
                cardName: { type: 'string' },
                limit: { type: 'number', default: 10 }
            }
        },
        handler: async (args, context) => {
            const bridge = context?.memoryBridge;
            if (!bridge) return { error: 'MemoryBridge not initialized' };
            return bridge.getDecisionHistory(args.cardName, args.limit || 10);
        }
    }
};

// ---------------------------------------------------------------------------
// Export for both browser and Node.js
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
    window.SuggestionEngine = SuggestionEngine;
    window.ObserverAgent = ObserverAgent;
    window.AdvisorAgent = AdvisorAgent;
    window.TacticianAgent = TacticianAgent;
    window.StrategyGuidePanel = StrategyGuidePanel;
    window.MemoryBridge = MemoryBridge;
    window.StrategyGuideTools = StrategyGuideTools;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SuggestionEngine,
        ObserverAgent,
        AdvisorAgent,
        TacticianAgent,
        StrategyGuidePanel,
        MemoryBridge,
        StrategyGuideTools
    };
}