/**
 * Championship UI Tests
 * Tests ChampionshipUI: tournament interface / schedule display / champion hall
 */

const { ChampionshipUI } = require('../../src/championship-ui.js');

describe('ChampionshipUI', () => {
  let ui;

  beforeEach(() => {
    ui = new ChampionshipUI();
  });

  describe('constructor', () => {
    test('initializes with empty state', () => {
      expect(ui.activeTournament).toBeNull();
      expect(ui.view).toBe('schedule');
    });

    test('initializes with default view options', () => {
      expect(ui.viewOptions).toBeDefined();
      expect(ui.viewOptions.showSchedule).toBeDefined();
      expect(ui.viewOptions.showChampionHall).toBeDefined();
    });
  });

  describe('renderSchedule', () => {
    test('returns HTML string', () => {
      const html = ui.renderSchedule([]);

      expect(typeof html).toBe('string');
    });

    test('contains schedule container', () => {
      const html = ui.renderSchedule([]);

      expect(html).toContain('schedule');
    });

    test('displays tournament list', () => {
      const tournaments = [
        { id: 't1', name: 'Championship Cup', status: 'pending' }
      ];

      const html = ui.renderSchedule(tournaments);

      expect(html).toContain('Championship Cup');
    });
  });

  describe('renderChampionHall', () => {
    test('returns HTML string', () => {
      const html = ui.renderChampionHall([]);

      expect(typeof html).toBe('string');
    });

    test('contains champion hall container', () => {
      const html = ui.renderChampionHall([]);

      expect(html).toContain('champion-hall');
    });

    test('displays champion entries', () => {
      const champions = [
        { playerId: 'player1', title: 'gold', tournamentName: 'Cup 1' }
      ];

      const html = ui.renderChampionHall(champions);

      expect(html).toContain('player1');
      expect(html).toContain('gold');
    });
  });

  describe('renderBracket', () => {
    test('returns HTML string', () => {
      const html = ui.renderBracket({ rounds: [] });

      expect(typeof html).toBe('string');
    });

    test('contains bracket container', () => {
      const html = ui.renderBracket({ rounds: [] });

      expect(html).toContain('bracket');
    });
  });

  describe('renderTournamentDetails', () => {
    test('returns HTML string', () => {
      const html = ui.renderTournamentDetails({ name: 'Test' });

      expect(typeof html).toBe('string');
    });

    test('displays tournament name', () => {
      const html = ui.renderTournamentDetails({ name: 'Championship Cup' });

      expect(html).toContain('Championship Cup');
    });
  });

  describe('setActiveTournament', () => {
    test('sets active tournament', () => {
      ui.setActiveTournament({ id: 't1', name: 'Cup' });

      expect(ui.activeTournament).toBeDefined();
      expect(ui.activeTournament.id).toBe('t1');
    });
  });

  describe('switchView', () => {
    test('changes view to champion hall', () => {
      ui.switchView('champion-hall');

      expect(ui.view).toBe('champion-hall');
    });

    test('changes view to schedule', () => {
      ui.switchView('schedule');

      expect(ui.view).toBe('schedule');
    });
  });

  describe('getActiveView', () => {
    test('returns current view', () => {
      expect(ui.getActiveView()).toBe('schedule');

      ui.switchView('champion-hall');
      expect(ui.getActiveView()).toBe('champion-hall');
    });
  });

  describe('render', () => {
    test('renders current view', () => {
      const html = ui.render();

      expect(typeof html).toBe('string');
    });

    test('renders champion hall when active', () => {
      ui.switchView('champion-hall');
      const html = ui.render();

      expect(html).toContain('champion-hall');
    });
  });
});