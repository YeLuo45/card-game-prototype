// ============================================================================
// Collab Arena — V8: MatchSimulator + AI Opponent
// generic-agent autonomous simulation + thunderbolt feedback loops
// ============================================================================
'use strict';

var AIAgent = function(config) {
  this.config = config || {};
  this.aggressionLevel = this.config.aggressionLevel || 0.5;
  this.riskTolerance = this.config.riskTolerance || 0.5;
  this.preferredRole = this.config.preferredRole || null;
  this.wins = 0;
  this.losses = 0;
  this.simulatedGames = 0;
};

AIAgent.prototype.selectAction = function(gameState) {
  var availableActions = gameState.availableActions || ['attack', 'defend', 'heal', 'special'];
  var scores = {};
  for (var i = 0; i < availableActions.length; i++) {
    var action = availableActions[i];
    if (action === 'attack') scores[action] = this.aggressionLevel * 0.8 + Math.random() * 0.2;
    else if (action === 'defend') scores[action] = (1 - this.aggressionLevel) * 0.6 + Math.random() * 0.2;
    else if (action === 'heal') scores[action] = 0.3 + Math.random() * 0.2;
    else if (action === 'special') scores[action] = this.riskTolerance * 0.5 + Math.random() * 0.2;
    else scores[action] = Math.random() * 0.5;
  }
  var bestAction = null;
  var bestScore = -1;
  for (var a in scores) {
    if (scores[a] > bestScore) { bestScore = scores[a]; bestAction = a; }
  }
  this.lastAction = bestAction;
  return { action: bestAction, confidence: bestScore };
};

AIAgent.prototype.recordResult = function(won) {
  this.simulatedGames++;
  if (won) this.wins++;
  else this.losses++;
};

AIAgent.prototype.getStats = function() {
  return {
    wins: this.wins,
    losses: this.losses,
    gamesPlayed: this.simulatedGames,
    winRate: this.simulatedGames > 0 ? this.wins / this.simulatedGames : 0,
    aggressionLevel: this.aggressionLevel
  };
};

var MatchSimulator = function() {
  this.activeSimulations = {};
  this.simulationLog = [];
  this.agents = {};
};

MatchSimulator.prototype.createAgent = function(agentId, config) {
  this.agents[agentId] = new AIAgent(config);
  return { success: true, agentId: agentId };
};

MatchSimulator.prototype.startSimulation = function(simId, participantIds) {
  if (this.activeSimulations[simId]) return { error: 'simulation_exists' };
  var players = {};
  for (var i = 0; i < participantIds.length; i++) {
    var pid = participantIds[i];
    players[pid] = { health: 100, energy: 50, position: i, role: null, actionsTaken: 0 };
  }
  this.activeSimulations[simId] = {
    simId: simId,
    players: players,
    participantIds: participantIds,
    turn: 0,
    maxTurns: 50,
    state: 'in_progress',
    winner: null,
    events: []
  };
  this.simulationLog.push({ action: 'start', simId: simId, timestamp: Date.now() });
  return { success: true, simId: simId, turn: 0 };
};

MatchSimulator.prototype.runTurn = function(simId) {
  var sim = this.activeSimulations[simId];
  if (!sim) return { error: 'simulation_not_found' };
  if (sim.state !== 'in_progress') return { error: 'simulation_not_active' };
  sim.turn++;
  var turnEvents = [];
  for (var pid in sim.players) {
    var agentId = 'agent_' + pid;
    var agent = this.agents[agentId];
    if (!agent) { agent = new AIAgent({}); this.agents[agentId] = agent; }
    var gameState = { availableActions: ['attack', 'defend', 'heal', 'special'], currentTurn: sim.turn };
    var decision = agent.selectAction(gameState);
    var player = sim.players[pid];
    player.actionsTaken++;
    var event = { turn: sim.turn, playerId: pid, action: decision.action, confidence: decision.confidence };
    if (decision.action === 'attack') player.energy -= 10;
    else if (decision.action === 'heal') { player.health = Math.min(100, player.health + 15); player.energy -= 5; }
    else if (decision.action === 'special') player.energy -= 20;
    turnEvents.push(event);
  }
  sim.events.push.apply(sim.events, turnEvents);
  var alivePlayers = Object.values(sim.players).filter(function(p) { return p.health > 0; });
  if (alivePlayers.length <= 1 || sim.turn >= sim.maxTurns) {
    sim.state = 'completed';
    sim.winner = alivePlayers.length === 1 ? Object.keys(sim.players).find(function(k) { return sim.players[k] === alivePlayers[0]; }) : null;
    var winnerId = sim.winner;
    if (winnerId) {
      var wa = this.agents['agent_' + winnerId];
      if (wa) wa.recordResult(true);
      for (var lid in sim.players) {
        if (lid !== winnerId) {
          var la = this.agents['agent_' + lid];
          if (la) la.recordResult(false);
        }
      }
    }
  }
  return { turn: sim.turn, state: sim.state, winner: sim.winner, events: turnEvents };
};

MatchSimulator.prototype.getSimulationState = function(simId) {
  var sim = this.activeSimulations[simId];
  if (!sim) return null;
  return {
    simId: sim.simId,
    turn: sim.turn,
    state: sim.state,
    winner: sim.winner,
    playerCount: Object.keys(sim.players).length
  };
};

MatchSimulator.prototype.getAgentStats = function(agentId) {
  var agent = this.agents[agentId];
  return agent ? agent.getStats() : null;
};

MatchSimulator.prototype.getSimulationLog = function(simId) {
  var sim = this.activeSimulations[simId];
  return sim ? sim.events : [];
};

window.AIAgent = AIAgent;
window.MatchSimulator = MatchSimulator;
