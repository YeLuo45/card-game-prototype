/**
 * V101 Card Chronicle Campaign System Tests
 * 测试 ChronicleRegistry | NarrativeEngine | StoryMemory | ChroniclePanel
 * 覆盖率要求: ≥95%, 通过率: 100%
 */

// Mock localStorage
const mockStorage = {};
global.localStorage = {
  getItem: jest.fn((key) => mockStorage[key] || null),
  setItem: jest.fn((key, value) => { mockStorage[key] = value; }),
  removeItem: jest.fn((key) => { delete mockStorage[key]; }),
  clear: jest.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }),
  get length() { return Object.keys(mockStorage).length; },
  key: jest.fn((i) => Object.keys(mockStorage)[i] || null)
};

// Mock window for browser context
global.window = {
  ALL_CARDS: {
    'strike': { id: 'strike', name: 'Strike', damage: 6, cost: 1, type: 'attack' },
    'defend': { id: 'defend', name: 'Defend', damage: 5, cost: 1, type: 'skill' },
    'bash': { id: 'bash', name: 'Bash', damage: 8, cost: 2, type: 'attack' }
  }
};

const { ChronicleRegistry, NarrativeEngine, StoryMemory, ChroniclePanel } = require('../../chronicle-campaign.js');

describe('StoryMemory', () => {
  let memory;

  beforeEach(() => {
    memory = new StoryMemory();
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    jest.clearAllMocks();
  });

  describe('NARRATIVE_RULES', () => {
    test('has fixed rules that never change', () => {
      const rules = StoryMemory.getNarrativeRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
      expect(rules).toContain('chapter_must_be_unlocked_before_reading');
      expect(rules).toContain('choices_affect_story_outcome');
    });

    test('getNarrativeRules returns a copy', () => {
      const rules1 = StoryMemory.getNarrativeRules();
      const rules2 = StoryMemory.getNarrativeRules();
      expect(rules1).not.toBe(rules2);
      expect(rules1).toEqual(rules2);
    });
  });

  describe('saveStoryProgress', () => {
    test('saves progress to localStorage', () => {
      const progress = {
        playerId: 'player1',
        unlockedChapters: ['ch1'],
        completedChapters: []
      };
      const result = memory.saveStoryProgress('player1', progress);
      expect(result).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    test('returns false for invalid input', () => {
      expect(memory.saveStoryProgress(null, {})).toBe(false);
      expect(memory.saveStoryProgress('player1', null)).toBe(false);
    });

    test('includes savedAt timestamp', () => {
      const progress = { playerId: 'player1' };
      memory.saveStoryProgress('player1', progress);
      
      const saved = JSON.parse(mockStorage['chronicle_progress_player1']);
      expect(saved.savedAt).toBeDefined();
      expect(typeof saved.savedAt).toBe('number');
    });
  });

  describe('loadStoryProgress', () => {
    test('loads progress from localStorage', () => {
      mockStorage['chronicle_progress_player1'] = JSON.stringify({
        playerId: 'player1',
        unlockedChapters: ['ch1', 'ch2']
      });
      
      const progress = memory.loadStoryProgress('player1');
      expect(progress).not.toBeNull();
      expect(progress.playerId).toBe('player1');
      expect(progress.unlockedChapters).toContain('ch1');
    });

    test('returns default progress for new player', () => {
      const progress = memory.loadStoryProgress('newplayer');
      expect(progress).not.toBeNull();
      expect(progress.playerId).toBe('newplayer');
      expect(progress.unlockedChapters).toEqual([]);
      expect(progress.completedChapters).toEqual([]);
    });

    test('returns null for null playerId', () => {
      expect(memory.loadStoryProgress(null)).toBeNull();
    });

    test('handles corrupted JSON gracefully', () => {
      mockStorage['chronicle_progress_bad'] = 'not valid json {';
      const progress = memory.loadStoryProgress('bad');
      expect(progress).not.toBeNull();
      expect(progress.playerId).toBe('bad');
    });
  });

  describe('getUnlockedChapters', () => {
    test('returns unlocked chapters array', () => {
      mockStorage['chronicle_progress_player1'] = JSON.stringify({
        playerId: 'player1',
        unlockedChapters: ['ch1', 'ch2'],
        completedChapters: []
      });
      
      const unlocked = memory.getUnlockedChapters('player1');
      expect(unlocked).toEqual(['ch1', 'ch2']);
    });

    test('returns empty array for player without progress', () => {
      const unlocked = memory.getUnlockedChapters('nonexistent');
      expect(unlocked).toEqual([]);
    });
  });

  describe('isChapterUnlocked', () => {
    test('returns true for unlocked chapter', () => {
      mockStorage['chronicle_progress_player1'] = JSON.stringify({
        playerId: 'player1',
        unlockedChapters: ['ch1']
      });
      
      expect(memory.isChapterUnlocked('player1', 'ch1')).toBe(true);
    });

    test('returns false for locked chapter', () => {
      mockStorage['chronicle_progress_player1'] = JSON.stringify({
        playerId: 'player1',
        unlockedChapters: ['ch1']
      });
      
      expect(memory.isChapterUnlocked('player1', 'ch2')).toBe(false);
    });
  });

  describe('unlockChapter', () => {
    test('unlocks a locked chapter', () => {
      const result = memory.unlockChapter('player1', 'ch1');
      expect(result).toBe(true);
      
      const unlocked = memory.getUnlockedChapters('player1');
      expect(unlocked).toContain('ch1');
    });

    test('returns true for already unlocked chapter', () => {
      memory.unlockChapter('player1', 'ch1');
      const result = memory.unlockChapter('player1', 'ch1');
      expect(result).toBe(true);
    });

    test('updates updatedAt timestamp', () => {
      memory.unlockChapter('player1', 'ch1');
      const progress = memory.loadStoryProgress('player1');
      expect(progress.updatedAt).toBeDefined();
    });
  });

  describe('recordChoice', () => {
    test('records a choice made by player', () => {
      const result = memory.recordChoice('player1', 'ch1', 'choice1', { outcome: 'good' });
      expect(result).toBe(true);
      
      const choices = memory.getChapterChoices('player1', 'ch1');
      expect(choices.length).toBe(1);
      expect(choices[0].choiceId).toBe('choice1');
      expect(choices[0].result.outcome).toBe('good');
    });

    test('records multiple choices', () => {
      memory.recordChoice('player1', 'ch1', 'choice1', {});
      memory.recordChoice('player1', 'ch1', 'choice2', {});
      
      const choices = memory.getChapterChoices('player1', 'ch1');
      expect(choices.length).toBe(2);
    });

    test('returns false for invalid input', () => {
      expect(memory.recordChoice(null, 'ch1', 'choice1', {})).toBe(false);
    });
  });

  describe('getChapterChoices', () => {
    test('returns choices for specific chapter', () => {
      memory.recordChoice('player1', 'ch1', 'choice1', {});
      memory.recordChoice('player1', 'ch2', 'choiceA', {});
      
      const choices = memory.getChapterChoices('player1', 'ch1');
      expect(choices.length).toBe(1);
      expect(choices[0].choiceId).toBe('choice1');
    });

    test('returns empty array for chapter with no choices', () => {
      const choices = memory.getChapterChoices('player1', 'unknown');
      expect(choices).toEqual([]);
    });
  });

  describe('markChapterCompleted', () => {
    test('marks chapter as completed', () => {
      const result = memory.markChapterCompleted('player1', 'ch1');
      expect(result).toBe(true);
      
      expect(memory.isChapterCompleted('player1', 'ch1')).toBe(true);
    });

    test('returns true for already completed chapter', () => {
      memory.markChapterCompleted('player1', 'ch1');
      const result = memory.markChapterCompleted('player1', 'ch1');
      expect(result).toBe(true);
    });
  });

  describe('isChapterCompleted', () => {
    test('returns true for completed chapter', () => {
      mockStorage['chronicle_progress_player1'] = JSON.stringify({
        playerId: 'player1',
        completedChapters: ['ch1']
      });
      
      expect(memory.isChapterCompleted('player1', 'ch1')).toBe(true);
    });

    test('returns false for incomplete chapter', () => {
      expect(memory.isChapterCompleted('player1', 'unknown')).toBe(false);
    });
  });

  describe('archiveStoryEvent', () => {
    test('archives story event', () => {
      const result = memory.archiveStoryEvent('player1', {
        type: 'choice_made',
        chapterId: 'ch1'
      });
      expect(result).toBe(true);
    });

    test('returns false for invalid input', () => {
      expect(memory.archiveStoryEvent(null, {})).toBe(false);
    });

    test('limits archive to 100 entries', () => {
      for (let i = 0; i < 105; i++) {
        memory.archiveStoryEvent('player1', { type: 'test', index: i });
      }
      
      const archives = memory.getStoryArchives('player1', 200);
      expect(archives.length).toBeLessThanOrEqual(100);
    });
  });

  describe('getStoryArchives', () => {
    test('returns archived events', () => {
      memory.archiveStoryEvent('player1', { type: 'test' });
      memory.archiveStoryEvent('player1', { type: 'test2' });
      
      const archives = memory.getStoryArchives('player1');
      expect(archives.length).toBe(2);
    });

    test('respects limit parameter', () => {
      for (let i = 0; i < 20; i++) {
        memory.archiveStoryEvent('player1', { type: 'test', i });
      }
      
      const archives = memory.getStoryArchives('player1', 5);
      expect(archives.length).toBe(5);
    });

    test('returns empty array when no archives', () => {
      const archives = memory.getStoryArchives('player1');
      expect(archives).toEqual([]);
    });
  });

  describe('resetPlayerProgress', () => {
    test('resets player progress', () => {
      memory.unlockChapter('player1', 'ch1');
      memory.saveStoryProgress('player1', { playerId: 'player1', test: true });
      
      const result = memory.resetPlayerProgress('player1');
      expect(result).toBe(true);
      expect(mockStorage['chronicle_progress_player1']).toBeUndefined();
    });
  });

  describe('getMemoryStatus', () => {
    test('returns memory status summary', () => {
      memory.unlockChapter('player1', 'ch1');
      memory.markChapterCompleted('player1', 'ch1');
      memory.recordChoice('player1', 'ch1', 'choice1', {});
      memory.archiveStoryEvent('player1', { type: 'test' });
      
      const status = memory.getMemoryStatus('player1');
      expect(status).toHaveProperty('unlockedCount');
      expect(status).toHaveProperty('completedCount');
      expect(status).toHaveProperty('totalChoices');
      expect(status).toHaveProperty('recentEvents');
      expect(status).toHaveProperty('memoryIntact');
      expect(status.unlockedCount).toBe(1);
      expect(status.completedCount).toBe(1);
    });

    test('handles nonexistent player', () => {
      const status = memory.getMemoryStatus('nonexistent');
      expect(status.memoryIntact).toBe(true);
    });
  });
});

describe('ChronicleRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new ChronicleRegistry();
  });

  describe('registerChapter', () => {
    test('registers a valid chapter', () => {
      const chapterDef = {
        id: 'ch1',
        title: 'Chapter 1',
        description: 'Test description',
        cardIds: ['strike', 'defend'],
        unlockCondition: 'default',
        content: 'Chapter content here',
        choices: [
          { id: 'choice1', text: 'Make a choice', outcome: 'good' }
        ]
      };
      
      const result = registry.registerChapter(chapterDef);
      expect(result).toBe(true);
      expect(registry.chapters.has('ch1')).toBe(true);
    });

    test('rejects chapter without id', () => {
      const result = registry.registerChapter({ title: 'No ID' });
      expect(result).toBe(false);
    });

    test('rejects null chapter', () => {
      expect(registry.registerChapter(null)).toBe(false);
    });

    test('sets default values for optional fields', () => {
      registry.registerChapter({ id: 'ch1' });
      const chapter = registry.getChapter('ch1');
      expect(chapter.title).toBe('Untitled Chapter');
      expect(chapter.description).toBe('');
      expect(chapter.cardIds).toEqual([]);
      expect(chapter.choices).toEqual([]);
    });
  });

  describe('registerChapters', () => {
    test('registers multiple chapters', () => {
      const chapters = [
        { id: 'ch1', title: 'Chapter 1' },
        { id: 'ch2', title: 'Chapter 2' }
      ];
      
      const count = registry.registerChapters(chapters);
      expect(count).toBe(2);
      expect(registry.getChapter('ch1')).not.toBeNull();
      expect(registry.getChapter('ch2')).not.toBeNull();
    });

    test('returns 0 for non-array input', () => {
      expect(registry.registerChapters('not an array')).toBe(0);
    });

    test('counts only successful registrations', () => {
      const chapters = [
        { id: 'ch1', title: 'Chapter 1' },
        { id: 'ch2' }, // missing title is fine
        { id: 'ch3', title: 'Chapter 3' }
      ];
      
      const count = registry.registerChapters(chapters);
      expect(count).toBe(3);
    });
  });

  describe('getChapter', () => {
    test('returns registered chapter', () => {
      registry.registerChapter({ id: 'ch1', title: 'Test Chapter' });
      const chapter = registry.getChapter('ch1');
      expect(chapter).not.toBeNull();
      expect(chapter.title).toBe('Test Chapter');
    });

    test('returns null for unknown chapter', () => {
      const chapter = registry.getChapter('unknown');
      expect(chapter).toBeNull();
    });
  });

  describe('getAllChapters', () => {
    test('returns all registered chapters', () => {
      registry.registerChapter({ id: 'ch1' });
      registry.registerChapter({ id: 'ch2' });
      
      const chapters = registry.getAllChapters();
      expect(chapters.length).toBe(2);
    });

    test('returns empty array when no chapters registered', () => {
      const chapters = registry.getAllChapters();
      expect(chapters).toEqual([]);
    });
  });

  describe('getChaptersByCard', () => {
    test('returns chapters associated with card', () => {
      registry.registerChapter({ id: 'ch1', cardIds: ['strike', 'defend'] });
      registry.registerChapter({ id: 'ch2', cardIds: ['strike'] });
      
      const chapters = registry.getChaptersByCard('strike');
      expect(chapters.length).toBe(2);
    });

    test('returns empty array for card with no chapters', () => {
      const chapters = registry.getChaptersByCard('unknown');
      expect(chapters).toEqual([]);
    });
  });

  describe('getUnlockableChapters', () => {
    test('returns chapters meeting unlock conditions', () => {
      registry.registerChapter({
        id: 'ch1',
        unlockCondition: 'default'
      });
      registry.registerChapter({
        id: 'ch2',
        unlockCondition: 'card:strike'
      });
      
      const context = {
        ownedCards: ['strike']
      };
      
      const unlockable = registry.getUnlockableChapters(context);
      expect(unlockable.length).toBe(2); // ch1 is default (always unlockable), ch2 needs strike
    });

    test('excludes chapters with unmet conditions', () => {
      registry.registerChapter({
        id: 'ch1',
        unlockCondition: 'card:strike'
      });
      
      const context = { ownedCards: [] };
      
      const unlockable = registry.getUnlockableChapters(context);
      expect(unlockable.length).toBe(0);
    });

    test('handles complex unlock conditions', () => {
      registry.registerChapter({
        id: 'ch1',
        unlockCondition: { requiresCard: 'strike' }
      });
      
      const context = { ownedCards: ['strike'] };
      const unlockable = registry.getUnlockableChapters(context);
      expect(unlockable.length).toBe(1);
    });
  });

  describe('unlockChapter', () => {
    let memory;

    beforeEach(() => {
      memory = new StoryMemory();
    });

    test('unlocks chapter when conditions are met', () => {
      registry.registerChapter({ id: 'ch1' });
      
      const result = registry.unlockChapter('ch1', 'player1', memory, {});
      expect(result).toBe(true);
      expect(memory.isChapterUnlocked('player1', 'ch1')).toBe(true);
    });

    test('returns false for non-existent chapter', () => {
      const result = registry.unlockChapter('unknown', 'player1', memory, {});
      expect(result).toBe(false);
    });

    test('returns false when conditions not met', () => {
      // First need to verify the chapter is NOT already unlocked
      // then test that unlock fails when conditions not met
      // Since this is a new player with no history, conditions should be checked
      // BUT the current implementation returns true early if already unlocked...
      // Let's test with a fresh memory and proper context without cards
      
      // Create a fresh scenario where chapter exists but player never had it unlocked
      mockStorage['chronicle_progress_playerNew'] = JSON.stringify({
        playerId: 'playerNew',
        unlockedChapters: [],  // empty - not unlocked
        completedChapters: []
      });
      
      registry.registerChapter({
        id: 'chCond',
        unlockCondition: 'card:nonexistent'
      });
      
      const result = registry.unlockChapter('chCond', 'playerNew', memory, { ownedCards: [] });
      // Since we manually set up progress without chCond in unlocked, it should return false
      expect(result).toBe(false);
    });

    test('returns true for already unlocked chapter', () => {
      registry.registerChapter({ id: 'ch1' });
      registry.unlockChapter('ch1', 'player1', memory, {});
      
      const result = registry.unlockChapter('ch1', 'player1', memory, {});
      expect(result).toBe(true);
    });
  });

  describe('getChapterProgress', () => {
    test('returns progress for all chapters', () => {
      const memory = new StoryMemory();
      registry.registerChapter({ id: 'ch1', title: 'Chapter 1' });
      registry.registerChapter({ id: 'ch2', title: 'Chapter 2' });
      
      memory.unlockChapter('player1', 'ch1');
      memory.markChapterCompleted('player1', 'ch1');
      
      const progress = registry.getChapterProgress('player1', memory);
      expect(progress.length).toBe(2);
      expect(progress[0].isUnlocked).toBe(true);
      expect(progress[0].isCompleted).toBe(true);
    });
  });

  describe('clear', () => {
    test('clears all chapters', () => {
      registry.registerChapter({ id: 'ch1' });
      registry.registerChapter({ id: 'ch2' });
      
      registry.clear();
      
      expect(registry.chapters.size).toBe(0);
      expect(registry.cardChapterMap.size).toBe(0);
    });
  });
});

describe('NarrativeEngine', () => {
  let engine;
  let registry;
  let memory;

  beforeEach(() => {
    registry = new ChronicleRegistry();
    memory = new StoryMemory();
    engine = new NarrativeEngine(registry, memory);
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  });

  describe('constructor', () => {
    test('initializes with provided registry and memory', () => {
      const customRegistry = new ChronicleRegistry();
      const customMemory = new StoryMemory();
      const customEngine = new NarrativeEngine(customRegistry, customMemory);
      
      expect(customEngine.registry).toBe(customRegistry);
      expect(customEngine.memory).toBe(customMemory);
    });

    test('creates default registry and memory when not provided', () => {
      const defaultEngine = new NarrativeEngine();
      expect(defaultEngine.registry).toBeInstanceOf(ChronicleRegistry);
      expect(defaultEngine.memory).toBeInstanceOf(StoryMemory);
    });
  });

  describe('presentChapter', () => {
    beforeEach(() => {
      registry.registerChapter({
        id: 'ch1',
        title: 'Test Chapter',
        description: 'A test chapter',
        content: 'Story content here',
        storyArc: 'main',
        choices: [
          { id: 'choice1', text: 'Choice 1', description: 'First choice', outcome: 'good', isConditional: true },
          { id: 'choice2', text: 'Choice 2', outcome: 'bad', nextChapterId: 'ch2' }
        ]
      });
      memory.unlockChapter('player1', 'ch1');
    });

    test('presents unlocked chapter', () => {
      const presentation = engine.presentChapter('ch1', 'player1');
      expect(presentation).not.toBeNull();
      expect(presentation.id).toBe('ch1');
      expect(presentation.title).toBe('Test Chapter');
    });

    test('returns null for locked chapter', () => {
      const presentation = engine.presentChapter('ch1', 'player2');
      expect(presentation).toBeNull();
    });

    test('returns null for non-existent chapter', () => {
      const presentation = engine.presentChapter('unknown', 'player1');
      expect(presentation).toBeNull();
    });

    test('filters out already chosen conditional choices', () => {
      // Make first choice
      engine.makeChoice('ch1', 'choice1', 'player1');
      
      // Try to present again
      const presentation = engine.presentChapter('ch1', 'player1');
      expect(presentation.choices.length).toBe(1);
      expect(presentation.choices.find(c => c.id === 'choice1')).toBeUndefined();
    });

    test('includes chapter metadata', () => {
      const presentation = engine.presentChapter('ch1', 'player1');
      expect(presentation.storyArc).toBe('main');
      expect(presentation.previousChoicesCount).toBe(0);
    });
  });

  describe('makeChoice', () => {
    beforeEach(() => {
      registry.registerChapter({
        id: 'ch1',
        title: 'Test Chapter',
        choices: [
          { id: 'choice1', text: 'Choice 1', outcome: 'good', nextChapterId: 'ch2' },
          { id: 'choice2', text: 'Choice 2', outcome: 'bad' }
        ]
      });
      registry.registerChapter({
        id: 'ch2',
        title: 'Chapter 2',
        choices: []
      });
      memory.unlockChapter('player1', 'ch1');
      memory.unlockChapter('player1', 'ch2');
    });

    test('records player choice', () => {
      const result = engine.makeChoice('ch1', 'choice1', 'player1');
      expect(result.success).toBe(true);
      
      const choices = memory.getChapterChoices('player1', 'ch1');
      expect(choices.length).toBe(1);
      expect(choices[0].choiceId).toBe('choice1');
    });

    test('returns error for non-existent chapter', () => {
      const result = engine.makeChoice('unknown', 'choice1', 'player1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('chapter_not_found');
    });

    test('returns error for non-existent choice', () => {
      const result = engine.makeChoice('ch1', 'unknown', 'player1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('choice_not_found');
    });

    test('archives story event on choice', () => {
      engine.makeChoice('ch1', 'choice1', 'player1');
      
      const archives = memory.getStoryArchives('player1');
      expect(archives.some(a => a.type === 'choice_made')).toBe(true);
    });

    test('unlocks next chapter if specified', () => {
      engine.makeChoice('ch1', 'choice1', 'player1');
      
      expect(memory.isChapterUnlocked('player1', 'ch2')).toBe(true);
    });

    test('returns choice result data', () => {
      const result = engine.makeChoice('ch1', 'choice1', 'player1');
      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('choiceId', 'choice1');
      expect(result.result).toHaveProperty('outcome', 'good');
    });
  });

  describe('getChapterProgress', () => {
    test('returns progress summary', () => {
      registry.registerChapter({ id: 'ch1', title: 'Chapter 1' });
      registry.registerChapter({ id: 'ch2', title: 'Chapter 2' });
      memory.unlockChapter('player1', 'ch1');
      memory.markChapterCompleted('player1', 'ch1');
      
      const progress = engine.getChapterProgress('player1');
      expect(progress.playerId).toBe('player1');
      expect(progress.totalChapters).toBe(2);
      expect(progress.unlockedCount).toBe(1);
      expect(progress.completedCount).toBe(1);
      expect(progress.completionPercentage).toBe(50);
    });

    test('calculates completion percentage correctly', () => {
      registry.registerChapter({ id: 'ch1' });
      registry.registerChapter({ id: 'ch2' });
      registry.registerChapter({ id: 'ch3' });
      registry.registerChapter({ id: 'ch4' });
      memory.unlockChapter('player1', 'ch1');
      memory.unlockChapter('player1', 'ch2');
      memory.unlockChapter('player1', 'ch3');
      memory.unlockChapter('player1', 'ch4');
      memory.markChapterCompleted('player1', 'ch1');
      memory.markChapterCompleted('player1', 'ch2');
      
      const progress = engine.getChapterProgress('player1');
      expect(progress.completionPercentage).toBe(50);
    });
  });

  describe('advanceStory', () => {
    beforeEach(() => {
      registry.registerChapter({
        id: 'ch1',
        choices: [
          { id: 'choice1', text: 'Go forward', outcome: 'neutral', nextChapterId: 'ch2', isEnding: false },
          { id: 'choiceNoNext', text: 'Stay put', outcome: 'neutral', isEnding: false }
          // choiceNoNext has no nextChapterId
        ]
      });
      registry.registerChapter({
        id: 'ch2',
        choices: [
          { id: 'choiceA', text: 'End story', outcome: 'ending', isEnding: true }
        ]
      });
      memory.unlockChapter('player1', 'ch1');
      memory.unlockChapter('player1', 'ch2');
    });

    test('advances to next chapter when choice has nextChapterId', () => {
      const result = engine.advanceStory('ch1', 'choice1', 'player1');
      expect(result.success).toBe(true);
      expect(result.advanced).toBe(true);
      expect(result.nextChapter).not.toBeNull();
      expect(result.nextChapter.id).toBe('ch2');
    });

    test('marks chapter complete when choice is ending', () => {
      engine.advanceStory('ch2', 'choiceA', 'player1');
      expect(memory.isChapterCompleted('player1', 'ch2')).toBe(true);
    });

    test('returns chapterCompleted flag correctly', () => {
      const result = engine.advanceStory('ch2', 'choiceA', 'player1');
      expect(result.chapterCompleted).toBe(true);
    });

    test('returns advanced=false when choice has no next chapter', () => {
      const result = engine.advanceStory('ch1', 'choiceNoNext', 'player1');
      expect(result.success).toBe(true);
      expect(result.advanced).toBe(false);
    });
  });

  describe('unlockChaptersForCards', () => {
    test('unlocks chapters when player owns required cards', () => {
      registry.registerChapter({
        id: 'ch1',
        cardIds: ['strike'],
        unlockCondition: 'card:strike'
      });
      
      const unlocked = engine.unlockChaptersForCards('player1', ['strike']);
      expect(unlocked).toContain('ch1');
    });

    test('does not unlock chapters without required cards', () => {
      registry.registerChapter({
        id: 'ch1',
        unlockCondition: 'card:strike'
      });
      
      const unlocked = engine.unlockChaptersForCards('player1', []);
      expect(unlocked).not.toContain('ch1');
    });

    test('archives unlock event', () => {
      registry.registerChapter({
        id: 'ch1',
        unlockCondition: 'default'
      });
      
      engine.unlockChaptersForCards('player1', []);
      
      const archives = memory.getStoryArchives('player1');
      expect(archives.some(a => a.type === 'chapter_unlocked')).toBe(true);
    });

    test('handles null ownedCards', () => {
      registry.registerChapter({ id: 'ch1' });
      const unlocked = engine.unlockChaptersForCards('player1', null);
      expect(Array.isArray(unlocked)).toBe(true);
    });
  });

  describe('getActivePresentation', () => {
    test('returns current active presentation', () => {
      registry.registerChapter({
        id: 'ch1',
        choices: []
      });
      memory.unlockChapter('player1', 'ch1');
      
      engine.presentChapter('ch1', 'player1');
      expect(engine.getActivePresentation()).not.toBeNull();
      expect(engine.getActivePresentation().chapterId).toBe('ch1');
    });

    test('returns null when no active presentation', () => {
      expect(engine.getActivePresentation()).toBeNull();
    });
  });

  describe('clearActivePresentation', () => {
    test('clears active presentation', () => {
      registry.registerChapter({ id: 'ch1', choices: [] });
      memory.unlockChapter('player1', 'ch1');
      
      engine.presentChapter('ch1', 'player1');
      engine.clearActivePresentation();
      
      expect(engine.getActivePresentation()).toBeNull();
    });
  });
});

describe('ChroniclePanel', () => {
  let panel;
  let engine;
  let registry;
  let memory;

  beforeEach(() => {
    registry = new ChronicleRegistry();
    memory = new StoryMemory();
    engine = new NarrativeEngine(registry, memory);
    panel = new ChroniclePanel(engine, 'test-panel');
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  });

  describe('constructor', () => {
    test('initializes with engine and containerId', () => {
      expect(panel.engine).toBe(engine);
      expect(panel.containerId).toBe('test-panel');
    });

    test('uses default containerId when not provided', () => {
      const defaultPanel = new ChroniclePanel(engine);
      expect(defaultPanel.containerId).toBe('chronicle-panel');
    });
  });

  describe('setPlayer', () => {
    test('sets current player ID', () => {
      panel.setPlayer('player1');
      expect(panel._currentPlayerId).toBe('player1');
    });
  });

  describe('onRender', () => {
    test('registers render callback', () => {
      const callback = jest.fn();
      panel.onRender(callback);
      expect(panel._renderCallback).toBe(callback);
    });
  });

  describe('render', () => {
    test('renders no player state when no player set', () => {
      const html = panel.render();
      expect(html).toContain('No player selected');
    });

    test('renders panel with progress when player set', () => {
      registry.registerChapter({ id: 'ch1', title: 'Chapter 1' });
      memory.unlockChapter('player1', 'ch1');
      panel.setPlayer('player1');
      
      const html = panel.render();
      expect(html).toContain('Card Chronicle Campaign');
      expect(html).toContain('Chapter 1');
    });

    test('calls render callback if registered', () => {
      const callback = jest.fn();
      panel.onRender(callback);
      panel.setPlayer('player1');
      panel.render();
      
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('showChapter', () => {
    test('returns null when no player set', () => {
      const content = panel.showChapter('ch1');
      expect(content).toBeNull();
    });

    test('returns chapter content for unlocked chapter', () => {
      registry.registerChapter({
        id: 'ch1',
        title: 'Test Chapter',
        description: 'A test',
        content: 'Story text here',
        choices: [
          { id: 'choice1', text: 'Make choice' }
        ]
      });
      memory.unlockChapter('player1', 'ch1');
      panel.setPlayer('player1');
      
      const content = panel.showChapter('ch1');
      expect(content).not.toBeNull();
      expect(content).toContain('Test Chapter');
      expect(content).toContain('Make choice');
    });

    test('returns null for locked chapter', () => {
      registry.registerChapter({ id: 'ch1' });
      panel.setPlayer('player1');
      
      const content = panel.showChapter('ch1');
      expect(content).toBeNull();
    });
  });

  describe('handleChoice', () => {
    beforeEach(() => {
      registry.registerChapter({
        id: 'ch1',
        choices: [
          { id: 'choice1', text: 'Go left', outcome: 'good' },
          { id: 'choice2', text: 'Go right', outcome: 'neutral' }
        ]
      });
      memory.unlockChapter('player1', 'ch1');
      panel.setPlayer('player1');
    });

    test('processes choice and returns result', () => {
      const result = panel.handleChoice('ch1', 'choice1');
      expect(result.success).toBe(true);
      expect(result.choiceResult.choiceId).toBe('choice1');
    });

    test('returns error when no player set', () => {
      panel.setPlayer(null);
      const result = panel.handleChoice('ch1', 'choice1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('no_player');
    });
  });

  describe('getProgressSummary', () => {
    test('returns null when no player set', () => {
      expect(panel.getProgressSummary()).toBeNull();
    });

    test('returns progress summary when player set', () => {
      registry.registerChapter({ id: 'ch1' });
      panel.setPlayer('player1');
      
      const summary = panel.getProgressSummary();
      expect(summary).not.toBeNull();
      expect(summary).toHaveProperty('playerId', 'player1');
    });
  });

  describe('refresh', () => {
    test('calls render', () => {
      panel.setPlayer('player1');
      const renderSpy = jest.spyOn(panel, 'render');
      panel.refresh();
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe('getStyles', () => {
    test('returns CSS string', () => {
      const styles = ChroniclePanel.getStyles();
      expect(typeof styles).toBe('string');
      expect(styles).toContain('.chronicle-panel');
      expect(styles).toContain('chronicle-chapters');
    });
  });
});

describe('Integration Tests', () => {
  test('full chronicle campaign workflow', () => {
    // Setup
    const memory = new StoryMemory();
    const registry = new ChronicleRegistry();
    const engine = new NarrativeEngine(registry, memory);
    const panel = new ChroniclePanel(engine);
    
    // Register chapters
    registry.registerChapter({
      id: 'ch1',
      title: 'The Beginning',
      description: 'A new adventure starts',
      cardIds: ['strike'],
      content: 'You wake up in a strange land...',
      choices: [
        { id: 'choice1', text: 'Explore the forest', outcome: 'good', nextChapterId: 'ch2' },
        { id: 'choice2', text: 'Stay and wait', outcome: 'neutral' }
      ]
    });
    
    registry.registerChapter({
      id: 'ch2',
      title: 'The Forest',
      description: 'A dark forest awaits',
      content: 'You venture into the forest...',
      choices: [
        { id: 'choiceA', text: 'Fight the monster', outcome: 'epic', isEnding: true }
      ]
    });
    
    // Player starts
    panel.setPlayer('player1');
    
    // Unlock chapters via cards
    const unlocked = engine.unlockChaptersForCards('player1', ['strike']);
    expect(unlocked).toContain('ch1');
    
    // Read chapter 1
    let presentation = engine.presentChapter('ch1', 'player1');
    expect(presentation).not.toBeNull();
    expect(presentation.title).toBe('The Beginning');
    
    // Make a choice (advanceStory will also record the choice)
    result = engine.advanceStory('ch1', 'choice1', 'player1');
    expect(result.advanced).toBe(true);
    expect(result.nextChapter.id).toBe('ch2');
    
    // Read chapter 2
    presentation = engine.presentChapter('ch2', 'player1');
    expect(presentation).not.toBeNull();
    expect(presentation.title).toBe('The Forest');
    
    // Make ending choice using advanceStory to properly mark completion
    result = engine.advanceStory('ch2', 'choiceA', 'player1');
    expect(result.success).toBe(true);
    expect(result.chapterCompleted).toBe(true);
    
    // Verify chapter is completed
    expect(memory.isChapterCompleted('player1', 'ch2')).toBe(true);
    
    // Check progress
    const progress = engine.getChapterProgress('player1');
    expect(progress.completedCount).toBe(1);
  });
});