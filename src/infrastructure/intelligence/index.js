// ============================================================================
// Card Intelligence Network — V7: Unified Intelligence Index
// Consolidates all intelligence modules into single export
// ============================================================================
'use strict';

var CardIntelligenceIndex = function() {
  this.graph = null;
  this.registry = null;
  this.network = null;
  this.opponentTracker = null;
  this.strategyEngine = null;
  this.correlationMatrix = null;
  this.metaTracker = null;
  this.balanceAdvisor = null;
  this.draftEngine = null;
  this.persistence = null;
  this.initialized = false;
};

CardIntelligenceIndex.prototype.initialize = function(storageKey) {
  storageKey = storageKey || 'card_intel_v1';
  this.graph = new CardRelationshipGraph();
  this.registry = new ComboRegistry(this.graph);
  this.network = new CardIntelligenceNetwork();
  this.network.graph = this.graph;
  this.network.registry = this.registry;
  this.opponentTracker = new PlayHistoryTracker();
  this.strategyEngine = new AdaptiveStrategyEngine(this.network, this.opponentTracker);
  this.correlationMatrix = new DeckCorrelationMatrix();
  this.metaTracker = new MetaGameTracker();
  this.balanceAdvisor = new CardBalanceAdvisor(this.metaTracker);
  this.draftEngine = new DraftRecommendationEngine(this.network, this.correlationMatrix);
  this.persistence = new OfflinePersistenceLayer(storageKey);
  this.initialized = true;
  return { success: true };
};

CardIntelligenceIndex.prototype.getStats = function() {
  if (!this.initialized) return { error: 'not_initialized' };
  return {
    graph: this.graph.getGraphStats(),
    chains: this.registry.getChainCount(),
    opponents: this.opponentTracker.getAllOpponents().length,
    meta: this.metaTracker.getMetaSnapshot(),
    draft: this.draftEngine.getDraftStats()
  };
};

CardIntelligenceIndex.prototype.exportData = function() {
  if (!this.persistence) return { error: 'no_persistence' };
  var data = {
    graph: this.graph.relationships,
    chains: this.registry.comboChains,
    opponents: {},
    meta: this.metaTracker.globalStats,
    exportedAt: Date.now()
  };
  var oppIds = this.opponentTracker.getAllOpponents();
  for (var i = 0; i < oppIds.length; i++) {
    data.opponents[oppIds[i]] = this.opponentTracker.getOpponentSummary(oppIds[i]);
  }
  this.persistence.set('intel_export', data);
  return { success: true, key: 'intel_export' };
};

CardIntelligenceIndex.prototype.importData = function(key) {
  if (!this.persistence) return { error: 'no_persistence' };
  var data = this.persistence.get(key || 'intel_export');
  if (!data) return { error: 'data_not_found' };
  if (data.graph) this.graph.relationships = data.graph;
  if (data.chains) this.registry.comboChains = data.chains;
  if (data.meta) this.metaTracker.globalStats = data.meta;
  return { success: true };
};

window.CardIntelligenceIndex = CardIntelligenceIndex;
