'use strict';
const fs = require('fs');
const path = require('path');

// PRE-MOCKS
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
  querySelectorAll: () => []
};

// MOCK GAME DATA
const mockGameState = {
  player: {
    hp: 80, maxHp: 80, gold: 150, energy: 3, maxEnergy: 3,
    deck: [
      { id: 'strike', name: '打击', type: 'attack', rarity: 'common', cost: 1, damage: 6, description: '造成6点伤害' },
      { id: 'defend', name: '防御', type: 'skill', rarity: 'common', cost: 1, block: 5, description: '获得5点格挡' },
      { id: 'bash', name: '重击', type: 'attack', rarity: 'uncommon', cost: 2, damage: 12, description: '造成12点伤害' },
      { id: 'heal', name: '治疗', type: 'skill', rarity: 'common', cost: 1, heal: 8, description: '恢复8点HP' },
      { id: 'double_strike', name: '双重打击', type: 'attack', rarity: 'common', cost: 1, damage: 4, hits: 2, description: '造成4点伤害2次' },
      { id: 'shield_wall', name: '护盾', type: 'skill', rarity: 'uncommon', cost: 2, block: 12, description: '获得12点格挡' },
      { id: 'fireball', name: '火球', type: 'attack', rarity: 'rare', cost: 2, damage: 20, description: '造成20点伤害' },
      { id: 'meditate', name: '冥想', type: 'skill', rarity: 'rare', cost: 1, energyGain: 2, description: '获得2点能量' },
    ]
  }
};

// MOCK window.gameState
global.window.gameState = mockGameState;

// CARD STUDIO IMPLEMENTATION
class CardStudio {
  constructor() {
    this.name = 'CardStudio';
    this.version = '1.0';
    this.editingCards = [];
    this.customCards = JSON.parse(localStorage.getItem('cardStudio_customCards') || '[]');
  }

  open() {
    this._ensurePanel();
    const panel = document.getElementById('card-studio-panel');
    if (panel) {
      panel.style.display = 'flex';
      this._renderCardList();
    }
  }

  close() {
    const panel = document.getElementById('card-studio-panel');
    if (panel) panel.style.display = 'none';
  }

  _ensurePanel() {
    let panel = document.getElementById('card-studio-panel');
    if (panel) return;
    panel = document.createElement('div');
    panel.id = 'card-studio-panel';
    panel.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:99998;display:none;flex-direction:column;align-items:center;padding:20px;overflow-y:auto;';
    panel.innerHTML = this._getPanelHTML();
    document.body.appendChild(panel);
    this._bindEvents(panel);
  }

  _getPanelHTML() {
    return `<div style="max-width:900px;width:100%;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2 style="color:#ff6b6b;margin:0;">🎨 卡牌工作室</h2>
        <div style="display:flex;gap:8px;">
          <button id="cs-edit-btn" style="padding:8px 16px;background:#e94560;border:none;border-radius:8px;color:#fff;cursor:pointer;font-size:13px;">✏️ 编辑模式</button>
          <button id="cs-close-btn" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;">✕</button>
        </div>
      </div>
      <div id="cs-stats-bar" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px;"></div>
      <div id="cs-tabs" style="display:flex;gap:4px;margin-bottom:16px;border-bottom:1px solid #333;padding-bottom:4px;">
        <button class="cs-tab-btn" data-tab="all" style="flex:1;padding:10px;background:#2a2a3e;border:1px solid #444;border-radius:8px 8px 0 0;color:#aaa;font-size:13px;cursor:pointer;">全部卡牌</button>
        <button class="cs-tab-btn" data-tab="attack" style="flex:1;padding:10px;background:#2a2a3e;border:1px solid #444;border-radius:8px 8px 0 0;color:#aaa;font-size:13px;cursor:pointer;">攻击牌</button>
        <button class="cs-tab-btn" data-tab="skill" style="flex:1;padding:10px;background:#2a2a3e;border:1px solid #444;border-radius:8px 8px 0 0;color:#aaa;font-size:13px;cursor:pointer;">技能牌</button>
        <button class="cs-tab-btn" data-tab="custom" style="flex:1;padding:10px;background:#2a2a3e;border:1px solid #444;border-radius:8px 8px 0 0;color:#aaa;font-size:13px;cursor:pointer;">自定义</button>
      </div>
      <div id="cs-card-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;"></div>
      <div id="cs-editor" style="display:none;margin-top:20px;padding:16px;background:#1e1e2e;border:2px solid #e94560;border-radius:12px;"></div>
    </div>`;
  }

  _bindEvents(panel) {
    panel.querySelector('#cs-close-btn')?.addEventListener('click', () => this.close());
    panel.querySelector('#cs-edit-btn')?.addEventListener('click', () => this._toggleEditMode());
    panel.querySelectorAll('.cs-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab));
    });
    panel.addEventListener('click', (e) => {
      if (e.target === panel) this.close();
    });
  }

  _getCardTypeIcon(type) {
    return { attack: '⚔️', skill: '🛡️', power: '✨' }[type] || '🃏';
  }

  _getRarityColor(rarity) {
    return { common: '#aaa', uncommon: '#27ae60', rare: '#9b59b6', legendary: '#f39c12' }[rarity] || '#aaa';
  }

  _renderCardList(filter = 'all') {
    const grid = document.getElementById('cs-card-grid');
    if (!grid) return;
    const allCards = this._getAllCards();
    const filtered = filter === 'all' ? allCards : allCards.filter(c => c.type === filter || (filter === 'custom' && c.isCustom));
    grid.innerHTML = filtered.map(c => `
      <div class="cs-card-item" data-id="${c.id}" style="background:#1e1e2e;border:2px solid ${this._getRarityColor(c.rarity)};border-radius:12px;padding:12px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:18px;">${this._getCardTypeIcon(c.type)}</span>
          <span style="background:${this._getRarityColor(c.rarity)};padding:2px 6px;border-radius:6px;font-size:10px;color:#fff;">${c.rarity}</span>
        </div>
        <div style="color:#fff;font-size:13px;font-weight:bold;margin-bottom:4px;">${c.name}</div>
        <div style="color:#ffd700;font-size:12px;margin-bottom:4px;">⚡${c.cost ?? 0}</div>
        <div style="color:#888;font-size:11px;">${c.description || ''}</div>
        ${c.isCustom ? '<div style="color:#e94560;font-size:10px;margin-top:4px;">✏️ 自定义</div>' : ''}
      </div>`).join('');
    grid.querySelectorAll('.cs-card-item').forEach(item => {
      item.addEventListener('click', () => this._openEditor(item.dataset.id));
    });
  }

  _getAllCards() {
    const deck = (window.gameState?.player?.deck || []);
    const custom = this.customCards;
    return [...deck.map(c => ({ ...c, isCustom: false })), ...custom.map(c => ({ ...c, isCustom: true }))];
  }

  _switchTab(tab) {
    document.querySelectorAll('.cs-tab-btn').forEach(btn => {
      btn.style.background = btn.dataset.tab === tab ? '#3a3a5e' : '#2a2a3e';
      btn.style.color = btn.dataset.tab === tab ? '#fff' : '#aaa';
    });
    this._renderCardList(tab);
  }

  _openEditor(cardId) {
    const card = this._getAllCards().find(c => c.id === cardId);
    if (!card) return;
    const editor = document.getElementById('cs-editor');
    if (!editor) return;
    editor.style.display = 'block';
    editor.innerHTML = this._getEditorHTML(card);
    editor.scrollIntoView({ behavior: 'smooth' });
    editor.querySelector('#cs-save-btn')?.addEventListener('click', () => this._saveCard(cardId));
    editor.querySelector('#cs-delete-btn')?.addEventListener('click', () => this._deleteCard(cardId));
  }

  _getEditorHTML(card) {
    return `<h3 style="color:#e94560;margin:0 0 12px 0;">✏️ 编辑: ${card.name}</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label style="color:#888;font-size:11px;display:block;margin-bottom:4px;">卡牌名称</label>
          <input id="cs-input-name" value="${card.name}" style="width:100%;padding:8px;background:#2a2a3e;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px;">
        </div>
        <div>
          <label style="color:#888;font-size:11px;display:block;margin-bottom:4px;">费用</label>
          <input id="cs-input-cost" type="number" value="${card.cost ?? 0}" min="0" style="width:100%;padding:8px;background:#2a2a3e;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px;">
        </div>
        <div>
          <label style="color:#888;font-size:11px;display:block;margin-bottom:4px;">类型</label>
          <select id="cs-input-type" style="width:100%;padding:8px;background:#2a2a3e;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px;">
            <option value="attack" ${card.type==='attack'?'selected':''}>攻击</option>
            <option value="skill" ${card.type==='skill'?'selected':''}>技能</option>
            <option value="power" ${card.type==='power'?'selected':''}>能力</option>
          </select>
        </div>
        <div>
          <label style="color:#888;font-size:11px;display:block;margin-bottom:4px;">稀有度</label>
          <select id="cs-input-rarity" style="width:100%;padding:8px;background:#2a2a3e;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px;">
            <option value="common" ${card.rarity==='common'?'selected':''}>普通</option>
            <option value="uncommon" ${card.rarity==='uncommon'?'selected':''}>优秀</option>
            <option value="rare" ${card.rarity==='rare'?'selected':''}>稀有</option>
            <option value="legendary" ${card.rarity==='legendary'?'selected':''}>传说</option>
          </select>
        </div>
      </div>
      <div style="margin-top:10px;">
        <label style="color:#888;font-size:11px;display:block;margin-bottom:4px;">描述</label>
        <textarea id="cs-input-desc" style="width:100%;padding:8px;background:#2a2a3e;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px;min-height:60px;">${card.description || ''}</textarea>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button id="cs-save-btn" style="flex:1;padding:10px;background:#e94560;border:none;border-radius:8px;color:#fff;font-weight:bold;cursor:pointer;">💾 保存</button>
        ${card.isCustom ? `<button id="cs-delete-btn" style="padding:10px;background:#c0392b;border:none;border-radius:8px;color:#fff;font-weight:bold;cursor:pointer;">🗑️ 删除</button>` : ''}
        <button onclick="document.getElementById('cs-editor').style.display='none'" style="flex:1;padding:10px;background:#333;border:none;border-radius:8px;color:#aaa;font-weight:bold;cursor:pointer;">取消</button>
      </div>`;
  }

  _saveCard(originalId) {
    const nameEl = document.getElementById ? document.getElementById('cs-input-name') : null;
    const name = nameEl?.value?.trim();
    const costEl = document.getElementById ? document.getElementById('cs-input-cost') : null;
    const cost = parseInt(costEl?.value || '0', 10);
    const typeEl = document.getElementById ? document.getElementById('cs-input-type') : null;
    const type = typeEl?.value || 'attack';
    const rarityEl = document.getElementById ? document.getElementById('cs-input-rarity') : null;
    const rarity = rarityEl?.value || 'common';
    const descEl = document.getElementById ? document.getElementById('cs-input-desc') : null;
    const description = descEl?.value?.trim() || '';
    if (!name) return;
    const idx = this.customCards.findIndex(c => c.id === originalId);
    if (idx >= 0) {
      this.customCards[idx] = { ...this.customCards[idx], name, cost, type, rarity, description };
    } else {
      this.customCards.push({ id: `custom_${Date.now()}`, name, cost, type, rarity, description, isCustom: true });
    }
    localStorage.setItem('cardStudio_customCards', JSON.stringify(this.customCards));
    this._renderCardList();
    const editorEl = document.getElementById ? document.getElementById('cs-editor') : null;
    if (editorEl) editorEl.style.display = 'none';
  }

  _deleteCard(cardId) {
    this.customCards = this.customCards.filter(c => c.id !== cardId);
    localStorage.setItem('cardStudio_customCards', JSON.stringify(this.customCards));
    this._renderCardList();
    const editorEl = document.getElementById ? document.getElementById('cs-editor') : null;
    if (editorEl) editorEl.style.display = 'none';
  }

  _toggleEditMode() {
    const editor = document.getElementById('cs-editor');
    const btn = document.getElementById('cs-edit-btn');
    if (!editor || !btn) return;
    if (editor.style.display === 'none' || !editor.style.display) {
      editor.style.display = 'block';
      editor.innerHTML = this._getNewCardHTML();
      btn.textContent = '✅ 完成编辑';
    } else {
      editor.style.display = 'none';
      btn.textContent = '✏️ 编辑模式';
    }
  }

  _getNewCardHTML() {
    return `<h3 style="color:#e94560;margin:0 0 12px 0;">➕ 创建新卡牌</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label style="color:#888;font-size:11px;display:block;margin-bottom:4px;">卡牌名称</label>
          <input id="cs-new-name" placeholder="输入名称" style="width:100%;padding:8px;background:#2a2a3e;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px;">
        </div>
        <div>
          <label style="color:#888;font-size:11px;display:block;margin-bottom:4px;">费用</label>
          <input id="cs-new-cost" type="number" value="1" min="0" style="width:100%;padding:8px;background:#2a2a3e;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px;">
        </div>
        <div>
          <label style="color:#888;font-size:11px;display:block;margin-bottom:4px;">类型</label>
          <select id="cs-new-type" style="width:100%;padding:8px;background:#2a2a3e;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px;">
            <option value="attack">攻击</option>
            <option value="skill">技能</option>
            <option value="power">能力</option>
          </select>
        </div>
        <div>
          <label style="color:#888;font-size:11px;display:block;margin-bottom:4px;">稀有度</label>
          <select id="cs-new-rarity" style="width:100%;padding:8px;background:#2a2a3e;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px;">
            <option value="common">普通</option>
            <option value="uncommon">优秀</option>
            <option value="rare">稀有</option>
            <option value="legendary">传说</option>
          </select>
        </div>
      </div>
      <div style="margin-top:10px;">
        <label style="color:#888;font-size:11px;display:block;margin-bottom:4px;">描述</label>
        <textarea id="cs-new-desc" placeholder="输入卡牌描述" style="width:100%;padding:8px;background:#2a2a3e;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px;min-height:60px;"></textarea>
      </div>
      <button id="cs-create-btn" style="width:100%;margin-top:12px;padding:12px;background:#e94560;border:none;border-radius:8px;color:#fff;font-weight:bold;font-size:14px;cursor:pointer;">🎨 创建卡牌</button>`;
  }

  getStats() {
    const cards = this._getAllCards();
    return {
      totalCards: cards.length,
      customCards: this.customCards.length,
      byType: cards.reduce((acc, c) => { acc[c.type] = (acc[c.type] || 0) + 1; return acc; }, {}),
      byRarity: cards.reduce((acc, c) => { acc[c.rarity] = (acc[c.rarity] || 0) + 1; return acc; }, {})
    };
  }

  reset() {
    this.customCards = [];
    localStorage.removeItem('cardStudio_customCards');
    this._renderCardList();
  }
}

window.CardStudio = CardStudio;
global.CardStudio = CardStudio;