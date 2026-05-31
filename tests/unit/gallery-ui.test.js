/**
 * Gallery UI Tests
 * V287 - Iteration 8/9 - Card Gallery & Lore System
 */

const { GalleryUI } = require('../../src/gallery-ui');

describe('GalleryUI', () => {
  let galleryUI;
  let mockContainer;

  beforeEach(() => {
    mockContainer = {
      innerHTML: '',
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      querySelector: jest.fn(),
      addEventListener: jest.fn()
    };
    galleryUI = new GalleryUI(mockContainer);
  });

  describe('constructor', () => {
    test('creates GalleryUI instance', () => {
      expect(galleryUI).toBeDefined();
    });

    test('initializes with default state', () => {
      expect(galleryUI.currentView).toBe('grid');
      expect(galleryUI.selectedCard).toBeNull();
    });

    test('accepts custom container', () => {
      const customContainer = { innerHTML: '' };
      const ui = new GalleryUI(customContainer);
      expect(ui.container).toBe(customContainer);
    });
  });

  describe('render', () => {
    test('renders gallery container', () => {
      galleryUI.render();
      expect(mockContainer.innerHTML).not.toBe('');
    });

    test('renders card grid when in grid view', () => {
      galleryUI.setViewMode('grid');
      galleryUI.render();
      expect(mockContainer.innerHTML).toContain('gallery');
    });

    test('renders card list when in list view', () => {
      galleryUI.setViewMode('list');
      galleryUI.render();
      expect(mockContainer.innerHTML).toContain('gallery');
    });
  });

  describe('setViewMode', () => {
    test('sets grid view mode', () => {
      galleryUI.setViewMode('grid');
      expect(galleryUI.currentView).toBe('grid');
    });

    test('sets list view mode', () => {
      galleryUI.setViewMode('list');
      expect(galleryUI.currentView).toBe('list');
    });

    test('updates display when view mode changes', () => {
      galleryUI.setViewMode('grid');
      galleryUI.setViewMode('list');
      expect(galleryUI.currentView).toBe('list');
    });
  });

  describe('getViewMode', () => {
    test('returns current view mode', () => {
      galleryUI.setViewMode('list');
      expect(galleryUI.getViewMode()).toBe('list');
    });
  });

  describe('displayCards', () => {
    test('displays array of cards', () => {
      const cards = [
        { id: 'c1', name: 'Card 1', rarity: 'common' },
        { id: 'c2', name: 'Card 2', rarity: 'rare' }
      ];
      galleryUI.displayCards(cards);
      expect(mockContainer.innerHTML).toContain('Card 1');
      expect(mockContainer.innerHTML).toContain('Card 2');
    });

    test('displays empty state when no cards', () => {
      galleryUI.displayCards([]);
      expect(mockContainer.innerHTML).toContain('gallery');
    });

    test('handles card images', () => {
      const cards = [{ id: 'c1', name: 'Test', imageUrl: 'test.png' }];
      galleryUI.displayCards(cards);
      expect(mockContainer.innerHTML).toContain('test.png');
    });
  });

  describe('showCardDetail', () => {
    test('shows detail popup for a card', () => {
      const card = { id: 'c1', name: 'Test Card', rarity: 'rare' };
      galleryUI.showCardDetail(card);
      expect(galleryUI.selectedCard).toBe(card);
    });

    test('includes card info in popup', () => {
      const card = { id: 'c1', name: 'Test Card', rarity: 'rare', lore: 'Secret story' };
      galleryUI.showCardDetail(card);
      expect(galleryUI.selectedCard).toEqual(card);
    });
  });

  describe('hideCardDetail', () => {
    test('hides card detail popup', () => {
      const card = { id: 'c1', name: 'Test' };
      galleryUI.showCardDetail(card);
      galleryUI.hideCardDetail();
      expect(galleryUI.selectedCard).toBeNull();
    });
  });

  describe('applyFilter', () => {
    test('applies filter to display', () => {
      galleryUI.applyFilter('rarity', 'rare');
      expect(galleryUI.activeFilters.rarity).toBe('rare');
    });

    test('updates display when filter applied', () => {
      galleryUI.applyFilter('rarity', 'epic');
      expect(galleryUI.activeFilters.rarity).toBe('epic');
    });
  });

  describe('clearFilters', () => {
    test('clears all active filters', () => {
      galleryUI.applyFilter('rarity', 'rare');
      galleryUI.applyFilter('set', 'core');
      galleryUI.clearFilters();
      expect(Object.keys(galleryUI.activeFilters).length).toBe(0);
    });
  });

  describe('search', () => {
    test('performs search and updates display', () => {
      galleryUI.search('test query');
      expect(galleryUI.lastSearchQuery).toBe('test query');
    });

    test('handles empty search', () => {
      galleryUI.search('');
      expect(galleryUI.lastSearchQuery).toBe('');
    });
  });

  describe('updateLoreUnlockStatus', () => {
    test('updates lore unlock status display', () => {
      const cardId = 'c1';
      galleryUI.updateLoreUnlockStatus(cardId, true);
      expect(galleryUI.loreUnlockStatus[cardId]).toBe(true);
    });

    test('shows locked indicator for locked lore', () => {
      const cardId = 'c1';
      galleryUI.updateLoreUnlockStatus(cardId, false);
      expect(galleryUI.loreUnlockStatus[cardId]).toBe(false);
    });
  });

  describe('renderCard', () => {
    test('renders individual card element', () => {
      const card = { id: 'c1', name: 'Test Card', rarity: 'common' };
      const element = galleryUI.renderCard(card);
      expect(element).toBeDefined();
      expect(element.tag).toBe('div');
    });

    test('includes card name in render', () => {
      const card = { id: 'c1', name: 'Test Card', rarity: 'common' };
      const element = galleryUI.renderCard(card);
      expect(element.textContent).toContain('Test Card');
    });

    test('shows locked class for locked lore', () => {
      const card = { id: 'c1', name: 'Test', rarity: 'common', hasLore: true };
      galleryUI.updateLoreUnlockStatus('c1', false);
      const element = galleryUI.renderCard(card, false);
      expect(element.className).toContain('locked');
    });

    test('shows unlocked class for unlocked lore', () => {
      const card = { id: 'c1', name: 'Test', rarity: 'common' };
      const element = galleryUI.renderCard(card, true);
      expect(element.className).not.toContain('locked');
    });
  });

  describe('getSelectedCard', () => {
    test('returns currently selected card', () => {
      const card = { id: 'c1', name: 'Test' };
      galleryUI.showCardDetail(card);
      expect(galleryUI.getSelectedCard()).toEqual(card);
    });

    test('returns null when no card selected', () => {
      expect(galleryUI.getSelectedCard()).toBeNull();
    });
  });

  describe('destroy', () => {
    test('clears gallery display', () => {
      galleryUI.render();
      galleryUI.destroy();
      expect(mockContainer.innerHTML).toBe('');
    });

    test('clears selected card', () => {
      galleryUI.showCardDetail({ id: 'c1', name: 'Test' });
      galleryUI.destroy();
      expect(galleryUI.selectedCard).toBeNull();
    });
  });
});