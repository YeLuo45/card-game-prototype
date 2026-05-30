/**
 * V101 Card Chronicle Campaign System
 * 叙事章节系统：ChronicleRegistry | NarrativeEngine | StoryMemory | ChroniclePanel
 * 
 * 概念：按卡牌背景故事/世界观设计的叙事章节系统，卡牌解锁叙事内容
 * 设计来源：generic-agent L0-L4记忆 | chatdev multi-agent叙事 | ruflo层次分解
 */

// ===== StoryMemory - L0-L4 五层记忆系统（用于故事进度存储） =====
class StoryMemory {
  constructor() {
    this.L0_RULES_KEY = 'chronicle_l0_rules';
    this.L1_INDEX_KEY = 'chronicle_l1_index';
    this.L2_FACTS_KEY = 'chronicle_l2_facts';
    this.L3_PROGRESS_KEY = 'chronicle_l3_progress';
    this.L4_ARCHIVE_KEY = 'chronicle_l4_archive';
    this.PROGRESS_KEY_PREFIX = 'chronicle_progress_';
  }

  // L0: 固定规则（不可变）
  static NARRATIVE_RULES = [
    'chapter_must_be_unlocked_before_reading',
    'choices_affect_story_outcome',
    'card_unlock_grants_chapter_access',
    'story_progress_saved_after_each_choice',
    'parallel_choices_create_branching_narratives'
  ];

  static getNarrativeRules() {
    return [...this.NARRATIVE_RULES];
  }

  // L1: 章节索引（快速查找）
  _buildChapterIndex(chapters) {
    const index = {};
    for (const chapter of chapters) {
      index[chapter.id] = {
        id: chapter.id,
        title: chapter.title,
        unlockCondition: chapter.unlockCondition,
        cardIds: chapter.cardIds || []
      };
      // 按卡牌索引
      for (const cardId of chapter.cardIds || []) {
        if (!index._cardIndex) index._cardIndex = {};
        if (!index._cardIndex[cardId]) index._cardIndex[cardId] = [];
        index._cardIndex[cardId].push(chapter.id);
      }
    }
    return index;
  }

  // L2: 故事事实（已解锁章节、玩家选择）
  saveStoryProgress(playerId, progress) {
    if (!playerId || !progress) return false;
    try {
      const key = this.PROGRESS_KEY_PREFIX + playerId;
      const data = {
        ...progress,
        savedAt: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('[StoryMemory] saveStoryProgress failed:', e);
      return false;
    }
  }

  loadStoryProgress(playerId) {
    if (!playerId) return null;
    try {
      const key = this.PROGRESS_KEY_PREFIX + playerId;
      const data = localStorage.getItem(key);
      if (!data) {
        return this._createDefaultProgress(playerId);
      }
      return JSON.parse(data);
    } catch (e) {
      console.warn('[StoryMemory] loadStoryProgress failed:', e);
      return this._createDefaultProgress(playerId);
    }
  }

  _createDefaultProgress(playerId) {
    return {
      playerId,
      unlockedChapters: [],
      completedChapters: [],
      choicesMade: {},
      currentChapterId: null,
      storyBranches: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  // L3: 进度管理（SOP）
  getUnlockedChapters(playerId) {
    const progress = this.loadStoryProgress(playerId);
    return progress ? progress.unlockedChapters : [];
  }

  isChapterUnlocked(playerId, chapterId) {
    const progress = this.loadStoryProgress(playerId);
    return progress ? progress.unlockedChapters.includes(chapterId) : false;
  }

  unlockChapter(playerId, chapterId) {
    const progress = this.loadStoryProgress(playerId);
    if (!progress) return false;
    
    if (!progress.unlockedChapters.includes(chapterId)) {
      progress.unlockedChapters.push(chapterId);
      progress.updatedAt = Date.now();
      return this.saveStoryProgress(playerId, progress);
    }
    return true;
  }

  recordChoice(playerId, chapterId, choiceId, choiceResult) {
    const progress = this.loadStoryProgress(playerId);
    if (!progress) return false;

    if (!progress.choicesMade[chapterId]) {
      progress.choicesMade[chapterId] = [];
    }
    
    progress.choicesMade[chapterId].push({
      choiceId,
      result: choiceResult,
      timestamp: Date.now()
    });
    progress.updatedAt = Date.now();
    
    return this.saveStoryProgress(playerId, progress);
  }

  getChapterChoices(playerId, chapterId) {
    const progress = this.loadStoryProgress(playerId);
    return progress && progress.choicesMade[chapterId] 
      ? progress.choicesMade[chapterId] 
      : [];
  }

  markChapterCompleted(playerId, chapterId) {
    const progress = this.loadStoryProgress(playerId);
    if (!progress) return false;

    if (!progress.completedChapters.includes(chapterId)) {
      progress.completedChapters.push(chapterId);
      progress.updatedAt = Date.now();
      return this.saveStoryProgress(playerId, progress);
    }
    return true;
  }

  isChapterCompleted(playerId, chapterId) {
    const progress = this.loadStoryProgress(playerId);
    return progress ? progress.completedChapters.includes(chapterId) : false;
  }

  // L4: 故事档案（历史记录）
  archiveStoryEvent(playerId, event) {
    if (!playerId || !event) {
      console.warn('[StoryMemory] archiveStoryEvent invalid input');
      return false;
    }
    try {
      const key = this.L4_ARCHIVE_KEY + '_' + playerId;
      let archives = [];
      const existing = localStorage.getItem(key);
      if (existing) {
        archives = JSON.parse(existing);
      }
      
      archives.push({
        ...event,
        archivedAt: Date.now(),
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
      
      // 只保留最近100条记录
      if (archives.length > 100) {
        archives = archives.slice(-100);
      }
      
      localStorage.setItem(key, JSON.stringify(archives));
      return true;
    } catch (e) {
      console.warn('[StoryMemory] archiveStoryEvent failed:', e);
      return false;
    }
  }

  getStoryArchives(playerId, limit = 20) {
    try {
      const key = this.L4_ARCHIVE_KEY + '_' + playerId;
      const data = localStorage.getItem(key);
      if (!data) return [];
      
      const archives = JSON.parse(data);
      return archives.slice(-limit);
    } catch (e) {
      console.warn('[StoryMemory] getStoryArchives failed:', e);
      return [];
    }
  }

  // 重置玩家故事进度
  resetPlayerProgress(playerId) {
    try {
      const key = this.PROGRESS_KEY_PREFIX + playerId;
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn('[StoryMemory] resetPlayerProgress failed:', e);
      return false;
    }
  }

  // 获取记忆状态摘要
  getMemoryStatus(playerId) {
    const progress = this.loadStoryProgress(playerId);
    const archives = this.getStoryArchives(playerId, 10);
    
    return {
      unlockedCount: progress ? progress.unlockedChapters.length : 0,
      completedCount: progress ? progress.completedChapters.length : 0,
      totalChoices: progress 
        ? Object.values(progress.choicesMade).flat().length 
        : 0,
      recentEvents: archives.length,
      memoryIntact: progress !== null
    };
  }
}

// ===== ChronicleRegistry - 章节注册与管理 =====
class ChronicleRegistry {
  constructor() {
    this.chapters = new Map();
    this.cardChapterMap = new Map();
  }

  /**
   * 注册章节定义
   * @param {object} chapterDef - 章节定义 { id, title, description, cardIds, unlockCondition, content, choices }
   * @returns {boolean} 是否成功
   */
  registerChapter(chapterDef) {
    if (!chapterDef || !chapterDef.id) {
      console.warn('[ChronicleRegistry] Invalid chapter definition:', chapterDef);
      return false;
    }

    const chapter = {
      id: chapterDef.id,
      title: chapterDef.title || 'Untitled Chapter',
      description: chapterDef.description || '',
      cardIds: chapterDef.cardIds || [],
      unlockCondition: chapterDef.unlockCondition || 'default',
      content: chapterDef.content || '',
      choices: chapterDef.choices || [],
      requiredChapterId: chapterDef.requiredChapterId || null,
      storyArc: chapterDef.storyArc || 'main',
      metadata: {
        createdAt: Date.now(),
        version: '1.0'
      }
    };

    this.chapters.set(chapter.id, chapter);

    // 建立卡牌到章节的映射
    for (const cardId of chapter.cardIds) {
      if (!this.cardChapterMap.has(cardId)) {
        this.cardChapterMap.set(cardId, []);
      }
      this.cardChapterMap.get(cardId).push(chapter.id);
    }

    return true;
  }

  /**
   * 批量注册章节
   * @param {array} chapters - 章节定义数组
   * @returns {number} 成功注册的数量
   */
  registerChapters(chapters) {
    if (!Array.isArray(chapters)) return 0;
    let count = 0;
    for (const chapter of chapters) {
      if (this.registerChapter(chapter)) count++;
    }
    return count;
  }

  /**
   * 获取章节
   * @param {string} chapterId - 章节ID
   * @returns {object|null} 章节定义
   */
  getChapter(chapterId) {
    return this.chapters.get(chapterId) || null;
  }

  /**
   * 获取所有章节
   * @returns {array} 所有章节数组
   */
  getAllChapters() {
    return Array.from(this.chapters.values());
  }

  /**
   * 获取与卡牌相关的章节
   * @param {string} cardId - 卡牌ID
   * @returns {array} 章节数组
   */
  getChaptersByCard(cardId) {
    const chapterIds = this.cardChapterMap.get(cardId) || [];
    return chapterIds.map(id => this.chapters.get(id)).filter(Boolean);
  }

  /**
   * 获取可解锁的章节（满足解锁条件）
   * @param {object} context - 上下文 { playerId, ownedCards, storyProgress }
   * @returns {array} 可解锁章节数组
   */
  getUnlockableChapters(context) {
    const unlockable = [];
    for (const chapter of this.chapters.values()) {
      if (this._checkUnlockCondition(chapter.unlockCondition, context)) {
        unlockable.push(chapter);
      }
    }
    return unlockable;
  }

  /**
   * 检查解锁条件
   * @param {string|object} condition - 解锁条件
   * @param {object} context - 上下文
   * @returns {boolean} 是否满足条件
   */
  _checkUnlockCondition(condition, context) {
    if (!condition || condition === 'default') return true;
    
    if (typeof condition === 'string') {
      // 简单条件：card:xxx 表示需要拥有某卡牌
      if (condition.startsWith('card:')) {
        const cardId = condition.substring(5);
        return context.ownedCards && context.ownedCards.includes(cardId);
      }
      // simple condition: story:xxx 表示需要完成某章节
      if (condition.startsWith('story:')) {
        const chapterId = condition.substring(6);
        return context.storyProgress && context.storyProgress.completedChapters.includes(chapterId);
      }
      return true;
    }

    if (typeof condition === 'object') {
      // 复杂条件对象
      if (condition.requiresCard) {
        return context.ownedCards && context.ownedCards.includes(condition.requiresCard);
      }
      if (condition.requiresChapter) {
        return context.storyProgress && context.storyProgress.completedChapters.includes(condition.requiresChapter);
      }
      if (condition.requiresCards && Array.isArray(condition.requiresCards)) {
        return condition.requiresCards.every(card => 
          context.ownedCards && context.ownedCards.includes(card)
        );
      }
    }

    return true;
  }

  /**
   * 解锁章节（验证+解锁）
   * @param {string} chapterId - 章节ID
   * @param {string} playerId - 玩家ID
   * @param {object} storyMemory - StoryMemory实例
   * @param {object} context - 上下文
   * @returns {boolean} 是否解锁成功
   */
  unlockChapter(chapterId, playerId, storyMemory, context = {}) {
    const chapter = this.chapters.get(chapterId);
    if (!chapter) {
      console.warn('[ChronicleRegistry] Chapter not found:', chapterId);
      return false;
    }

    // 检查是否已解锁
    if (storyMemory.isChapterUnlocked(playerId, chapterId)) {
      return true; // 已经解锁
    }

    // 检查解锁条件
    if (!this._checkUnlockCondition(chapter.unlockCondition, context)) {
      console.warn('[ChronicleRegistry] Unlock condition not met for:', chapterId);
      return false;
    }

    // 执行解锁
    return storyMemory.unlockChapter(playerId, chapterId);
  }

  /**
   * 获取章节进度信息
   * @param {string} playerId - 玩家ID
   * @param {object} storyMemory - StoryMemory实例
   * @returns {array} 章节进度数组
   */
  getChapterProgress(playerId, storyMemory) {
    const progress = [];
    for (const chapter of this.chapters.values()) {
      const isUnlocked = storyMemory.isChapterUnlocked(playerId, chapter.id);
      const isCompleted = storyMemory.isChapterCompleted(playerId, chapter.id);
      const choices = storyMemory.getChapterChoices(playerId, chapter.id);
      
      progress.push({
        id: chapter.id,
        title: chapter.title,
        isUnlocked,
        isCompleted,
        choicesCount: choices.length,
        cardIds: chapter.cardIds
      });
    }
    return progress;
  }

  /**
   * 清除所有章节（用于测试）
   */
  clear() {
    this.chapters.clear();
    this.cardChapterMap.clear();
  }
}

// ===== NarrativeEngine - 叙事引擎 =====
class NarrativeEngine {
  constructor(chronicleRegistry, storyMemory) {
    this.registry = chronicleRegistry || new ChronicleRegistry();
    this.memory = storyMemory || new StoryMemory();
    this._activePresentation = null;
  }

  /**
   * 呈现章节内容
   * @param {string} chapterId - 章节ID
   * @param {string} playerId - 玩家ID
   * @returns {object|null} 章节呈现数据
   */
  presentChapter(chapterId, playerId) {
    const chapter = this.registry.getChapter(chapterId);
    if (!chapter) {
      console.warn('[NarrativeEngine] Chapter not found:', chapterId);
      return null;
    }

    if (!this.memory.isChapterUnlocked(playerId, chapterId)) {
      console.warn('[NarrativeEngine] Chapter not unlocked:', chapterId);
      return null;
    }

    const choices = this._prepareChoices(chapter.choices, playerId, chapterId);
    const previousChoices = this.memory.getChapterChoices(playerId, chapterId);
    
    this._activePresentation = {
      chapterId,
      playerId,
      chapter,
      presentedAt: Date.now(),
      availableChoices: choices,
      previousChoices
    };

    return {
      id: chapter.id,
      title: chapter.title,
      description: chapter.description,
      content: chapter.content,
      storyArc: chapter.storyArc || 'main',
      choices,
      previousChoicesCount: previousChoices.length,
      isCompleted: this.memory.isChapterCompleted(playerId, chapterId)
    };
  }

  /**
   * 准备选择分支（过滤已选过的条件选择）
   * @param {array} choices - 原始选择数组
   * @param {string} playerId - 玩家ID
   * @param {string} chapterId - 章节ID
   * @returns {array} 可用选择数组
   */
  _prepareChoices(choices, playerId, chapterId) {
    if (!choices || !Array.isArray(choices)) return [];
    
    const previousChoices = this.memory.getChapterChoices(playerId, chapterId);
    const chosenIds = previousChoices.map(c => c.choiceId);
    
    return choices
      .filter(choice => !choice.isConditional || !chosenIds.includes(choice.id))
      .map(choice => ({
        id: choice.id,
        text: choice.text,
        description: choice.description || '',
        nextChapterId: choice.nextChapterId || null,
        unlocksCards: choice.unlocksCards || [],
        requiresCard: choice.requiresCard || null,
        outcome: choice.outcome || 'neutral'
      }));
  }

  /**
   * 让玩家做选择
   * @param {string} chapterId - 章节ID
   * @param {string} choiceId - 选择ID
   * @param {string} playerId - 玩家ID
   * @returns {object|null} 选择结果
   */
  makeChoice(chapterId, choiceId, playerId) {
    const chapter = this.registry.getChapter(chapterId);
    if (!chapter) {
      return { success: false, error: 'chapter_not_found' };
    }

    const choice = chapter.choices.find(c => c.id === choiceId);
    if (!choice) {
      return { success: false, error: 'choice_not_found' };
    }

    // 检查是否需要特定卡牌
    if (choice.requiresCard) {
      // 这里需要外部提供卡牌检查上下文，简化处理
      console.warn('[NarrativeEngine] Choice requires card:', choice.requiresCard);
    }

    // 记录选择
    const choiceResult = {
      choiceId,
      outcome: choice.outcome || 'neutral',
      nextChapterId: choice.nextChapterId || null,
      unlocksCards: choice.unlocksCards || [],
      madeAt: Date.now()
    };

    this.memory.recordChoice(playerId, chapterId, choiceId, choiceResult);

    // 归档故事事件
    this.memory.archiveStoryEvent(playerId, {
      type: 'choice_made',
      chapterId,
      choiceId,
      outcome: choiceResult.outcome
    });

    // 如果有后续章节，解锁它
    if (choice.nextChapterId) {
      this.memory.unlockChapter(playerId, choice.nextChapterId);
    }

    return {
      success: true,
      result: choiceResult,
      chapterCompleted: choice.outcome === 'ending' || choice.isEnding
    };
  }

  /**
   * 获取玩家章节进度
   * @param {string} playerId - 玩家ID
   * @returns {object} 进度信息
   */
  getChapterProgress(playerId) {
    const progress = this.registry.getChapterProgress(playerId, this.memory);
    const storyMemoryStatus = this.memory.getMemoryStatus(playerId);
    
    const totalChapters = this.registry.getAllChapters().length;
    const unlockedCount = progress.filter(p => p.isUnlocked).length;
    const completedCount = progress.filter(p => p.isCompleted).length;

    return {
      playerId,
      totalChapters,
      unlockedCount,
      completedCount,
      completionPercentage: totalChapters > 0 
        ? Math.round((completedCount / totalChapters) * 100) 
        : 0,
      chapters: progress,
      memoryStatus: storyMemoryStatus
    };
  }

  /**
   * 根据选择推进故事
   * @param {string} chapterId - 章节ID
   * @param {string} choiceId - 选择ID
   * @param {string} playerId - 玩家ID
   * @returns {object|null} 推进结果
   */
  advanceStory(chapterId, choiceId, playerId) {
    const result = this.makeChoice(chapterId, choiceId, playerId);
    
    if (!result.success) {
      return result;
    }

    // 推进故事
    const { result: choiceResult, chapterCompleted } = result;

    // 如果章节完成，标记它
    if (chapterCompleted) {
      this.memory.markChapterCompleted(playerId, chapterId);
    }

    // 返回下一个章节（如果有）
    if (choiceResult.nextChapterId) {
      return {
        success: true,
        advanced: true,
        nextChapter: this.presentChapter(choiceResult.nextChapterId, playerId),
        choiceResult
      };
    }

    return {
      success: true,
      advanced: false,
      choiceResult,
      chapterCompleted
    };
  }

  /**
   * 解锁基于卡牌的章节
   * @param {string} playerId - 玩家ID
   * @param {array} ownedCards - 拥有的卡牌数组
   * @returns {array} 新解锁的章节ID数组
   */
  unlockChaptersForCards(playerId, ownedCards) {
    const newlyUnlocked = [];
    const context = {
      playerId,
      ownedCards: ownedCards || [],
      storyProgress: this.memory.loadStoryProgress(playerId)
    };

    const unlockable = this.registry.getUnlockableChapters(context);
    
    for (const chapter of unlockable) {
      if (this.registry.unlockChapter(chapter.id, playerId, this.memory, context)) {
        newlyUnlocked.push(chapter.id);
        this.memory.archiveStoryEvent(playerId, {
          type: 'chapter_unlocked',
          chapterId: chapter.id,
          trigger: 'card_unlock'
        });
      }
    }

    return newlyUnlocked;
  }

  /**
   * 获取当前呈现的章节
   * @returns {object|null} 当前章节
   */
  getActivePresentation() {
    return this._activePresentation;
  }

  /**
   * 清除活动呈现
   */
  clearActivePresentation() {
    this._activePresentation = null;
  }
}

// ===== ChroniclePanel - UI组件 =====
class ChroniclePanel {
  constructor(narrativeEngine, containerId = 'chronicle-panel') {
    this.engine = narrativeEngine;
    this.containerId = containerId;
    this._currentPlayerId = null;
    this._renderCallback = null;
  }

  /**
   * 设置当前玩家
   * @param {string} playerId - 玩家ID
   */
  setPlayer(playerId) {
    this._currentPlayerId = playerId;
  }

  /**
   * 注册渲染回调
   * @param {function} callback - 渲染回调函数
   */
  onRender(callback) {
    this._renderCallback = callback;
  }

  /**
   * 渲染面板
   * @returns {string} HTML字符串
   */
  render() {
    if (!this._currentPlayerId) {
      return this._renderNoPlayer();
    }

    const progress = this.engine.getChapterProgress(this._currentPlayerId);
    const html = this._buildPanelHTML(progress);

    if (this._renderCallback) {
      this._renderCallback(html, progress);
    }

    return html;
  }

  /**
   * 渲染无玩家状态
   * @returns {string} HTML
   */
  _renderNoPlayer() {
    return `
      <div class="chronicle-panel chronicle-panel-empty">
        <div class="chronicle-empty-message">
          <span class="chronicle-icon">📜</span>
          <p>No player selected</p>
        </div>
      </div>
    `;
  }

  /**
   * 构建面板HTML
   * @param {object} progress - 进度数据
   * @returns {string} HTML
   */
  _buildPanelHTML(progress) {
    const chaptersList = progress.chapters.map(ch => this._renderChapterItem(ch)).join('');
    const completionText = `${progress.completedCount}/${progress.totalChapters} chapters completed`;

    return `
      <div class="chronicle-panel" id="${this.containerId}">
        <div class="chronicle-header">
          <h2 class="chronicle-title">Card Chronicle Campaign</h2>
          <div class="chronicle-progress">
            <div class="chronicle-progress-bar">
              <div class="chronicle-progress-fill" style="width: ${progress.completionPercentage}%"></div>
            </div>
            <span class="chronicle-progress-text">${completionText}</span>
          </div>
        </div>
        <div class="chronicle-chapters">
          ${chaptersList}
        </div>
        <div class="chronicle-footer">
          <button class="chronicle-btn chronicle-btn-refresh" onclick="chroniclePanelInstance.refresh()">
            Refresh
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 渲染单个章节项
   * @param {object} chapter - 章节数据
   * @returns {string} HTML
   */
  _renderChapterItem(chapter) {
    const statusClass = chapter.isCompleted 
      ? 'chronicle-chapter-completed' 
      : (chapter.isUnlocked ? 'chronicle-chapter-unlocked' : 'chronicle-chapter-locked');
    
    const statusIcon = chapter.isCompleted 
      ? '✅' 
      : (chapter.isUnlocked ? '📖' : '🔒');
    
    const cardsList = chapter.cardIds && chapter.cardIds.length > 0 
      ? chapter.cardIds.map(id => `<span class="chronicle-card-tag">${id}</span>`).join('')
      : '';

    return `
      <div class="chronicle-chapter-item ${statusClass}" data-chapter-id="${chapter.id}">
        <div class="chronicle-chapter-header">
          <span class="chronicle-chapter-icon">${statusIcon}</span>
          <span class="chronicle-chapter-title">${chapter.title}</span>
        </div>
        ${cardsList ? `<div class="chronicle-chapter-cards">${cardsList}</div>` : ''}
        ${chapter.isUnlocked && !chapter.isCompleted ? `
          <button class="chronicle-btn chronicle-btn-read" data-chapter-id="${chapter.id}">
            Read Chapter
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * 刷新面板
   */
  refresh() {
    this.render();
  }

  /**
   * 显示章节内容
   * @param {string} chapterId - 章节ID
   * @returns {string|null} 章节内容HTML
   */
  showChapter(chapterId) {
    if (!this._currentPlayerId) return null;

    const presentation = this.engine.presentChapter(chapterId, this._currentPlayerId);
    if (!presentation) return null;

    return this._renderChapterContent(presentation);
  }

  /**
   * 渲染章节内容
   * @param {object} presentation - 呈现数据
   * @returns {string} HTML
   */
  _renderChapterContent(presentation) {
    const choicesList = presentation.choices.map(choice => `
      <button class="chronicle-choice-btn" data-choice-id="${choice.id}" data-chapter-id="${presentation.id}">
        <span class="chronicle-choice-text">${choice.text}</span>
        ${choice.description ? `<span class="chronicle-choice-desc">${choice.description}</span>` : ''}
      </button>
    `).join('');

    return `
      <div class="chronicle-chapter-content" data-chapter-id="${presentation.id}">
        <div class="chronicle-content-header">
          <h3>${presentation.title}</h3>
          <span class="chronicle-arc-badge">${presentation.storyArc}</span>
        </div>
        <div class="chronicle-content-body">
          <p class="chronicle-description">${presentation.description}</p>
          <div class="chronicle-story-text">${presentation.content}</div>
        </div>
        ${presentation.choices.length > 0 ? `
          <div class="chronicle-choices">
            <h4>Make Your Choice</h4>
            ${choicesList}
          </div>
        ` : `
          <div class="chronicle-chapter-end">
            <span class="chronicle-end-marker">— Chapter Complete —</span>
          </div>
        `}
      </div>
    `;
  }

  /**
   * 处理选择点击
   * @param {string} chapterId - 章节ID
   * @param {string} choiceId - 选择ID
   * @returns {object} 结果
   */
  handleChoice(chapterId, choiceId) {
    if (!this._currentPlayerId) {
      return { success: false, error: 'no_player' };
    }

    return this.engine.advanceStory(chapterId, choiceId, this._currentPlayerId);
  }

  /**
   * 获取玩家进度摘要
   * @returns {object} 进度摘要
   */
  getProgressSummary() {
    if (!this._currentPlayerId) return null;
    return this.engine.getChapterProgress(this._currentPlayerId);
  }

  /**
   * 导出面板样式（CSS字符串）
   * @returns {string} CSS
   */
  static getStyles() {
    return `
      .chronicle-panel {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 12px;
        padding: 20px;
        color: #e8e8e8;
        max-width: 600px;
        margin: 0 auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }
      .chronicle-panel-empty {
        text-align: center;
        padding: 40px 20px;
      }
      .chronicle-empty-message .chronicle-icon {
        font-size: 48px;
        display: block;
        margin-bottom: 16px;
      }
      .chronicle-header {
        margin-bottom: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 16px;
      }
      .chronicle-title {
        margin: 0 0 12px 0;
        font-size: 1.5em;
        color: #f0c040;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }
      .chronicle-progress {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .chronicle-progress-bar {
        flex: 1;
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
      }
      .chronicle-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #f0c040, #ff6b35);
        border-radius: 4px;
        transition: width 0.3s ease;
      }
      .chronicle-progress-text {
        font-size: 0.85em;
        color: #aaa;
        white-space: nowrap;
      }
      .chronicle-chapters {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 400px;
        overflow-y: auto;
      }
      .chronicle-chapter-item {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 12px 16px;
        border-left: 3px solid transparent;
        transition: all 0.2s ease;
      }
      .chronicle-chapter-locked {
        opacity: 0.6;
        border-left-color: #666;
      }
      .chronicle-chapter-unlocked {
        border-left-color: #f0c040;
      }
      .chronicle-chapter-completed {
        border-left-color: #4ade80;
        background: rgba(74, 222, 128, 0.05);
      }
      .chronicle-chapter-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      .chronicle-chapter-icon {
        font-size: 1.2em;
      }
      .chronicle-chapter-title {
        font-weight: 600;
        font-size: 1em;
      }
      .chronicle-chapter-cards {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }
      .chronicle-card-tag {
        background: rgba(240, 192, 64, 0.15);
        color: #f0c040;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.75em;
      }
      .chronicle-btn {
        background: linear-gradient(135deg, #f0c040, #ff6b35);
        border: none;
        color: #1a1a2e;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s ease;
        margin-top: 8px;
      }
      .chronicle-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(240, 192, 64, 0.3);
      }
      .chronicle-footer {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        text-align: center;
      }
      .chronicle-btn-refresh {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #e8e8e8;
      }
      .chronicle-btn-refresh:hover {
        background: rgba(255, 255, 255, 0.1);
        box-shadow: none;
      }
      .chronicle-chapter-content {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        padding: 20px;
      }
      .chronicle-content-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .chronicle-content-header h3 {
        margin: 0;
        color: #f0c040;
      }
      .chronicle-arc-badge {
        background: rgba(240, 192, 64, 0.15);
        color: #f0c040;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 0.75em;
        text-transform: uppercase;
      }
      .chronicle-content-body {
        margin-bottom: 20px;
      }
      .chronicle-description {
        font-style: italic;
        color: #aaa;
        margin-bottom: 12px;
      }
      .chronicle-story-text {
        line-height: 1.6;
        color: #e8e8e8;
      }
      .chronicle-choices {
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding-top: 16px;
      }
      .chronicle-choices h4 {
        margin: 0 0 12px 0;
        color: #e8e8e8;
      }
      .chronicle-choice-btn {
        display: block;
        width: 100%;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #e8e8e8;
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 8px;
        text-align: left;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .chronicle-choice-btn:hover {
        background: rgba(240, 192, 64, 0.1);
        border-color: #f0c040;
      }
      .chronicle-choice-text {
        font-weight: 600;
        display: block;
      }
      .chronicle-choice-desc {
        display: block;
        font-size: 0.85em;
        color: #888;
        margin-top: 4px;
      }
      .chronicle-chapter-end {
        text-align: center;
        padding: 20px;
        color: #4ade80;
      }
      .chronicle-end-marker {
        font-style: italic;
      }
    `;
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.ChronicleRegistry = ChronicleRegistry;
  window.NarrativeEngine = NarrativeEngine;
  window.StoryMemory = StoryMemory;
  window.ChroniclePanel = ChroniclePanel;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChronicleRegistry, NarrativeEngine, StoryMemory, ChroniclePanel };
}