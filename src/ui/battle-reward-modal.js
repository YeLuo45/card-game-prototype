// Extracted from index.html inline script (V62 BattleRewardModal)

// V62: 战斗奖励选择UI函数
function showBattleRewardModal() {
  const modal = document.createElement('div');
  modal.id = 'battle-reward-modal';
  modal.className = 'modal-overlay';

  const cardRewards = getRandomCards(3);
  const hasRelicSlot = gameState.relics && gameState.relics.length < gameState.maxRelicSlots;
  const healAmount = Math.floor(gameState.playerMaxHp * 0.2);

  modal.innerHTML = `
    <div class="modal-content reward-modal">
      <h2>⚔️ 胜利！选择你的奖励</h2>
      <div class="reward-options">
        ${cardRewards.map((card, i) => `
          <div class="reward-card" onclick="selectCardReward('${card.id}')">
            <div class="card-name">${card.name}</div>
            <div class="card-cost">消耗:${card.cost}</div>
            <div class="card-desc">${card.description}</div>
          </div>
        `).join('')}
        ${hasRelicSlot ? `
          <div class="reward-option relic-reward" onclick="selectRelicReward()">
            <div class="reward-icon">🎁</div>
            <div class="reward-label">遗物</div>
            <div class="reward-desc">随机遗物</div>
          </div>
        ` : ''}
        <div class="reward-option heal-reward" onclick="selectHealReward()">
          <div class="reward-icon">💚</div>
          <div class="reward-label">回复</div>
          <div class="reward-desc">+${healAmount} HP</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function getRandomCards(count) {
  const allCards = [];
  Object.values(CardPackRegistry.packs).forEach(pack => {
    if (pack.cards) allCards.push(...pack.cards);
  });
  // 也从CARDS对象获取基础卡牌
  if (typeof CARDS !== 'undefined') {
    Object.values(CARDS).forEach(card => {
      if (card && card.id && !allCards.find(c => c.id === card.id)) {
        allCards.push(card);
      }
    });
  }
  // Fisher-Yates shuffle
  const shuffled = [...allCards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

function selectCardReward(cardId) {
  // 将卡牌加入牌组
  if (!gameState.deck) gameState.deck = [];
  // 获取完整卡牌对象
  let cardObj = null;
  Object.values(CardPackRegistry.packs).forEach(pack => {
    if (pack.cards) {
      const found = pack.cards.find(c => c.id === cardId);
      if (found) cardObj = found;
    }
  });
  if (!cardObj && CARDS && CARDS[cardId]) {
    cardObj = CARDS[cardId];
  }
  if (cardObj) {
    gameState.deck.push(cardObj.id || cardId);
    addLog(`卡牌 ${cardObj.name || cardId} 加入牌组`, 'success');
  }
  closeBattleRewardModal();
  returnToMap();
}

function selectRelicReward() {
  const availableRelics = Object.keys(RELICS_V62).filter(id => !gameState.relics.includes(id));
  if (availableRelics.length === 0) {
    showNotification('没有可获得的遗物了', 'info');
    return;
  }
  const relicId = availableRelics[Math.floor(Math.random() * availableRelics.length)];
  gameState.relics.push(relicId);
  const relic = RELICS_V62[relicId];
  if (relic) {
    addLog(`获得遗物：${relic.name}`, 'success');
  }
  closeBattleRewardModal();
  returnToMap();
}

function selectHealReward() {
  const healAmount = Math.floor(gameState.playerMaxHp * 0.2);
  gameState.playerHp = Math.min(gameState.playerHp + healAmount, gameState.playerMaxHp);
  addLog(`回复 ${healAmount} HP`, 'heal');
  closeBattleRewardModal();
  returnToMap();
}

function closeBattleRewardModal() {
  const modal = document.getElementById('battle-reward-modal');
  if (modal) modal.remove();
}
