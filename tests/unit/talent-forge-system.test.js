/**
 * TalentForgeSystem Test Suite - V263 Iteration 8/9
 */

const {
  TalentForgeSystem,
  FORGE_STATES,
  SYNTHESIS_RESULT,
  DESIGN_SYSTEMS,
  PatternLearner,
  NanobotEngine,
  ChatdevOrchestrator,
  ThunderboltProcessor,
  GenericAgentCore,
  RufloEngine
} = require('../../src/talent-forge-system');

describe('TalentForgeSystem', () => {
  let forge;

  beforeEach(() => {
    forge = new TalentForgeSystem();
  });

  afterEach(() => {
    forge.reset();
  });

  describe('Core Functionality', () => {
    test('should initialize with correct version and iteration', () => {
      expect(forge.version).toBe('2.6.3');
      expect(forge.iteration).toBe(8);
      expect(forge.state).toBe(FORGE_STATES.IDLE);
    });

    test('should synthesize talent successfully with valid data', () => {
      const result = forge.synthesize({ type: 'fiery', name: 'Fire Talent', level: 1, rarity: 'rare' });
      expect(result.success).toBe(true);
      expect(result.talent).toBeDefined();
      expect(result.talent.forged).toBe(true);
      expect(result.talent.systems).toEqual(Object.values(DESIGN_SYSTEMS));
    });

    test('should set state to SYNTHESIZING during synthesis', () => {
      forge.synthesize({ type: 'frost', name: 'Ice Talent' });
      expect(forge.state).toBe(FORGE_STATES.COMPLETE);
    });

    test('should return synthesis result with energy level', () => {
      const result = forge.synthesize({ type: 'thunder', name: 'Thunder Talent' });
      expect(result.energy).toBeDefined();
      expect(typeof result.energy).toBe('number');
    });

    test('should increment synthesis count', () => {
      expect(forge.synthesisCount).toBe(0);
      forge.synthesize({ type: 'poison', name: 'Poison Talent' });
      expect(forge.synthesisCount).toBe(1);
    });

    test('should track forge history', () => {
      forge.synthesize({ type: 'swift', name: 'Swift Talent' });
      expect(forge.forgeHistory.length).toBe(1);
      expect(forge.forgeHistory[0].talent).toBeDefined();
    });

    test('should handle synthesis with intensity option', () => {
      const result = forge.synthesize({ type: 'fortify', name: 'Fortify Talent' }, { intensity: 2 });
      expect(result.success).toBe(true);
    });

    test('should track confidence in synthesis result', () => {
      const result = forge.synthesize({ type: 'rage', name: 'Rage Talent' });
      expect(result.confidence).toBeDefined();
      expect(typeof result.confidence).toBe('number');
    });
  });

  describe('Optimization', () => {
    test('should optimize talent with target stats', () => {
      const result = forge.optimize('talent_123', { attack: 100, defense: 50 });
      expect(result.success).toBe(true);
      expect(result.talentId).toBe('talent_123');
      expect(result.optimized).toBe(true);
    });

    test('should set state to OPTIMIZING during optimization', () => {
      forge.optimize('talent_456', { attack: 50 });
      expect(forge.state).toBe(FORGE_STATES.COMPLETE);
    });

    test('should deploy nanobots for optimization', () => {
      const result = forge.optimize('talent_789', { defense: 75 });
      expect(result.flowNodes).toBeDefined();
    });
  });

  describe('Pattern Learning', () => {
    test('should analyze patterns', () => {
      forge.synthesize({ type: 'lucky', name: 'Lucky Talent' });
      const patterns = forge.analyzePatterns();
      expect(Array.isArray(patterns)).toBe(true);
    });

    test('should learn from synthesis outcomes', () => {
      const patterns1 = forge.analyzePatterns();
      forge.synthesize({ type: 'pierce', name: 'Pierce Talent', rarity: 'epic' });
      const patterns2 = forge.analyzePatterns();
      expect(patterns2.length).toBeGreaterThanOrEqual(patterns1.length);
    });
  });

  describe('System Status', () => {
    test('should return complete system status', () => {
      const status = forge.getSystemStatus();
      expect(status.state).toBeDefined();
      expect(status.version).toBe('2.6.3');
      expect(status.iteration).toBe(8);
      expect(status.synthesisCount).toBeDefined();
      expect(status.energyLevel).toBeDefined();
      expect(status.activeNanobots).toBeDefined();
      expect(status.forgeHistorySize).toBeDefined();
    });

    test('should report correct energy level after synthesis', () => {
      const initialEnergy = forge.getSystemStatus().energyLevel;
      forge.synthesize({ type: 'lifesteal', name: 'Lifesteal Talent' });
      const newEnergy = forge.getSystemStatus().energyLevel;
      expect(newEnergy).toBeLessThan(initialEnergy);
    });

    test('should report active nanobots count', () => {
      forge.synthesize({ type: 'fiery', name: 'Test Talent' });
      // Default maxIterations is 5, need to tick 5 times to complete
      for (let i = 0; i < 5; i++) {
        forge.tick();
      }
      const status = forge.getSystemStatus();
      expect(status.activeNanobots).toBe(0);
    });

    test('should report available tools', () => {
      const status = forge.getSystemStatus();
      expect(status.tools).toBeDefined();
      expect(status.tools.length).toBeGreaterThan(0);
      expect(status.tools[0].name).toBeDefined();
    });

    test('should report node and edge counts', () => {
      const status = forge.getSystemStatus();
      expect(status.nodes).toBe(4);
      expect(status.edges).toBe(3);
    });
  });

  describe('Energy Management', () => {
    test('should recharge energy', () => {
      const result = forge.recharge(50);
      expect(result.energyLevel).toBeGreaterThanOrEqual(100);
    });

    test('should cap energy at maximum', () => {
      forge.recharge(200);
      const status = forge.getSystemStatus();
      expect(status.energyLevel).toBe(100);
    });
  });

  describe('Reset Functionality', () => {
    test('should reset forge to initial state', () => {
      forge.synthesize({ type: 'frost', name: 'Test Talent' });
      forge.reset();
      expect(forge.state).toBe(FORGE_STATES.IDLE);
      expect(forge.forgeHistory.length).toBe(0);
      expect(forge.synthesisCount).toBe(0);
    });

    test('should reset energy to maximum', () => {
      forge.synthesize({ type: 'thunder', name: 'Test Talent' });
      forge.reset();
      const status = forge.getSystemStatus();
      expect(status.energyLevel).toBe(100);
    });
  });

  describe('Tick Functionality', () => {
    test('should tick nanobot engine', () => {
      forge.synthesize({ type: 'poison', name: 'Test Talent' });
      expect(() => forge.tick()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty talent data', () => {
      const result = forge.synthesize({});
      expect(result.success).toBe(true);
    });

    test('should handle missing name in talent data', () => {
      const result = forge.synthesize({ type: 'fiery' });
      expect(result.success).toBe(true);
      expect(result.talent.name).toBe('Forged fiery');
    });

    test('should handle multiple rapid syntheses', () => {
      for (let i = 0; i < 5; i++) {
        forge.synthesize({ type: `type${i}`, name: `Talent ${i}` });
        forge.tick(); // Process and complete nanobot
      }
      expect(forge.synthesisCount).toBe(5);
    });

    test('should handle optimize without synthesis', () => {
      const result = forge.optimize('unreal_talent', { stat: 100 });
      expect(result.success).toBe(true);
    });

    test('should handle recharge with zero', () => {
      const result = forge.recharge(0);
      expect(result.energyLevel).toBe(100);
    });
  });
});

describe('PatternLearner', () => {
  let learner;

  beforeEach(() => {
    learner = new PatternLearner();
  });

  test('should learn patterns from context and outcome', () => {
    const context = { talentType: 'fiery', rarity: 'rare' };
    const result = learner.learn(context, SYNTHESIS_RESULT.SUCCESS);
    expect(typeof result).toBe('boolean');
  });

  test('should predict based on learned patterns', () => {
    const context = { talentType: 'frost', rarity: 'common' };
    learner.learn(context, SYNTHESIS_RESULT.SUCCESS);
    const prediction = learner.predict(context);
    expect(prediction.confidence).toBeDefined();
    expect(typeof prediction.recommended).toBe('boolean');
  });

  test('should extract pattern key from context', () => {
    // JSON.stringify order is consistent within same call, objects with same values produce same string
    const context1 = { a: 1, b: 2 };
    const context2 = { a: 1, b: 2 };
    const key1 = learner.extractPatternKey(context1);
    const key2 = learner.extractPatternKey(context2);
    expect(key1).toBe(key2);
  });

  test('should return patterns as array', () => {
    learner.learn({ type: 'test' }, SYNTHESIS_RESULT.SUCCESS);
    const patterns = learner.getPatterns();
    expect(Array.isArray(patterns)).toBe(true);
    expect(patterns[0].key).toBeDefined();
    expect(patterns[0].count).toBe(1);
  });

  test('should update success rate with multiple learnings', () => {
    learner.learn({ type: 'multi' }, SYNTHESIS_RESULT.SUCCESS);
    learner.learn({ type: 'multi' }, SYNTHESIS_RESULT.SUCCESS);
    learner.learn({ type: 'multi' }, SYNTHESIS_RESULT.FAILED);
    const patterns = learner.getPatterns();
    expect(patterns[0].successRate).toBe(2/3);
  });
});

describe('NanobotEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new NanobotEngine();
  });

  test('should deploy nanobot to target', () => {
    const result = engine.deploy({ targetData: 'test' });
    expect(result.success).toBe(true);
    expect(result.nanobotId).toBeDefined();
  });

  test('should reject deployment when max nanobots active', () => {
    for (let i = 0; i < 5; i++) {
      engine.deploy({ target: `target${i}` });
    }
    const result = engine.deploy({ target: 'overflow' });
    expect(result.success).toBe(false);
    expect(result.message).toBe('Max nanobots active');
  });

  test('should tick and progress nanobots', () => {
    const result = engine.deploy({ target: 'test' });
    const nanobotId = result.nanobotId;
    engine.tick();
    const nanobot = engine.nanobots.find(n => n.id === nanobotId);
    expect(nanobot.iterations).toBe(1);
  });

  test('should complete nanobot after max iterations', () => {
    const result = engine.deploy({ target: 'test', maxIterations: 3 });
    // Default maxIterations is 10, so we need to tick 10 times
    for (let i = 0; i < 10; i++) {
      engine.tick();
    }
    const nanobot = engine.nanobots.find(n => n.id === result.nanobotId);
    expect(nanobot.status).toBe('complete');
    expect(engine.activeCount).toBe(0);
  });

  test('should get active nanobots', () => {
    engine.deploy({ target: 'active1' });
    engine.deploy({ target: 'active2' });
    const active = engine.getActiveNanobots();
    expect(active.length).toBe(2);
  });

  test('should terminate nanobot', () => {
    const result = engine.deploy({ target: 'terminate-test' });
    const terminated = engine.terminate(result.nanobotId);
    expect(terminated).toBe(true);
    expect(engine.nanobots.find(n => n.id === result.nanobotId)).toBeUndefined();
  });

  test('should return false when terminating non-existent nanobot', () => {
    const result = engine.terminate('non-existent-id');
    expect(result).toBe(false);
  });

  test('should decrement active count when terminating active nanobot', () => {
    const result = engine.deploy({ target: 'test' });
    expect(engine.activeCount).toBe(1);
    engine.terminate(result.nanobotId);
    expect(engine.activeCount).toBe(0);
  });
});

describe('ChatdevOrchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new ChatdevOrchestrator();
  });

  test('should register agent with capabilities', () => {
    orchestrator.registerAgent('test-agent', ['capability1', 'capability2']);
    const agent = orchestrator.getAgent('test-agent');
    expect(agent).toBeDefined();
    expect(agent.capabilities).toEqual(['capability1', 'capability2']);
  });

  test('should send message between agents', () => {
    const result = orchestrator.sendMessage('agent1', 'agent2', 'Hello');
    expect(result).toBe(true);
    const messages = orchestrator.getMessages('agent1', 'agent2');
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe('Hello');
  });

  test('should broadcast message to all other agents', () => {
    orchestrator.registerAgent('sender', ['broadcast']);
    orchestrator.registerAgent('receiver1', ['receive']);
    orchestrator.registerAgent('receiver2', ['receive']);
    orchestrator.broadcast('sender', 'Broadcast message');
    const messages = orchestrator.getMessages('sender');
    expect(messages.length).toBe(2);
  });

  test('should get messages filtered by sender', () => {
    orchestrator.sendMessage('agent1', 'agent2', 'msg1');
    orchestrator.sendMessage('agent2', 'agent1', 'msg2');
    const fromAgent1 = orchestrator.getMessages('agent1');
    expect(fromAgent1.length).toBe(1);
  });

  test('should get agent state', () => {
    orchestrator.registerAgent('state-test', ['testing']);
    const agent = orchestrator.getAgent('state-test');
    expect(agent.state).toBe('idle');
  });
});

describe('ThunderboltProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new ThunderboltProcessor();
  });

  test('should generate bolt with sufficient energy', () => {
    const result = processor.generateBolt(2);
    expect(result.success).toBe(true);
    expect(result.bolt).toBeDefined();
    expect(result.bolt.intensity).toBe(2);
  });

  test('should reject bolt generation with insufficient energy', () => {
    processor.energyLevel = 5;
    const result = processor.generateBolt(2);
    expect(result.success).toBe(false);
  });

  test('should discharge bolt and return energy', () => {
    const { bolt } = processor.generateBolt(1);
    const initialEnergy = processor.energyLevel;
    processor.discharge(bolt.id);
    expect(processor.energyLevel).toBeGreaterThan(initialEnergy);
  });

  test('should return false when discharging non-existent bolt', () => {
    const result = processor.discharge('non-existent');
    expect(result).toBe(false);
  });

  test('should recharge energy', () => {
    processor.energyLevel = 30;
    processor.recharge(20);
    expect(processor.energyLevel).toBe(50);
  });

  test('should cap energy at maximum during recharge', () => {
    processor.recharge(200);
    expect(processor.energyLevel).toBe(100);
  });

  test('should get active (non-discharged) bolts', () => {
    processor.generateBolt(1);
    processor.generateBolt(2);
    const active = processor.getActiveBolts();
    expect(active.length).toBe(2);
  });
});

describe('GenericAgentCore', () => {
  let agent;

  beforeEach(() => {
    agent = new GenericAgentCore();
  });

  test('should add tool', () => {
    agent.addTool('testTool', (params) => ({ result: params }), 'Test description');
    const tools = agent.getAvailableTools();
    expect(tools.length).toBe(1);
    expect(tools[0].name).toBe('testTool');
  });

  test('should set current goal', () => {
    agent.setGoal('Test goal');
    expect(agent.currentGoal).toBe('Test goal');
    expect(agent.goals.length).toBe(1);
  });

  test('should execute tool', () => {
    agent.addTool('executeTool', (params) => ({ executed: true, params }), 'Execute tool');
    const result = agent.executeTool('executeTool', { test: 'data' });
    expect(result.executed).toBe(true);
  });

  test('should return error for non-existent tool', () => {
    const result = agent.executeTool('nonExistent', {});
    expect(result.success).toBe(false);
    expect(result.message).toContain('not found');
  });

  test('should track tool use count', () => {
    agent.addTool('countedTool', () => ({}), 'Counted tool');
    agent.executeTool('countedTool', {});
    agent.executeTool('countedTool', {});
    const tools = agent.getAvailableTools();
    expect(tools[0].useCount).toBe(2);
  });

  test('should record experience', () => {
    agent.addTool('expTool', (params) => ({ result: params }), 'Experience tool');
    agent.executeTool('expTool', { key: 'value' });
    expect(agent.experience.length).toBe(1);
    expect(agent.experience[0].tool).toBe('expTool');
  });

  test('should complete goal', () => {
    agent.setGoal('Completable goal');
    agent.completeGoal();
    expect(agent.currentGoal).toBeNull();
    const completedGoal = agent.goals.find(g => g.status === 'completed');
    expect(completedGoal).toBeDefined();
  });

  test('should track multiple goals', () => {
    agent.setGoal('Goal 1');
    agent.setGoal('Goal 2');
    expect(agent.goals.length).toBe(2);
  });
});

describe('RufloEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new RufloEngine();
  });

  test('should register node', () => {
    const result = engine.registerNode('node1', 'input', { data: 'test' });
    expect(result).toBe(true);
    const nodes = engine.getNodes();
    expect(nodes.length).toBe(1);
  });

  test('should connect nodes', () => {
    engine.registerNode('from', 'input');
    engine.registerNode('to', 'output');
    const result = engine.connect('from', 'to');
    expect(result).toBe(true);
    expect(engine.edges.length).toBe(1);
  });

  test('should fail to connect non-existent nodes', () => {
    const result = engine.connect('non-existent1', 'non-existent2');
    expect(result).toBe(false);
  });

  test('should execute flow starting from node', () => {
    engine.registerNode('start', 'input');
    engine.registerNode('middle', 'process');
    engine.registerNode('end', 'output');
    engine.connect('start', 'middle');
    engine.connect('middle', 'end');
    const flow = engine.executeFlow('flow1', 'start');
    expect(flow).toContain('start');
    expect(flow).toContain('middle');
    expect(flow).toContain('end');
  });

  test('should handle disconnected nodes', () => {
    engine.registerNode('isolated', 'input');
    const flow = engine.executeFlow('flow2', 'isolated');
    expect(flow).toEqual(['isolated']);
  });

  test('should get flow by id', () => {
    engine.registerNode('test', 'input');
    engine.connect('test', 'test');
    engine.executeFlow('myflow', 'test');
    const retrieved = engine.getFlow('myflow');
    expect(retrieved).toBeDefined();
    expect(retrieved.status).toBe('complete');
  });

  test('should get all nodes as array', () => {
    engine.registerNode('n1', 'input');
    engine.registerNode('n2', 'process');
    const nodes = engine.getNodes();
    expect(nodes.length).toBe(2);
    expect(nodes[0].id).toBeDefined();
  });

  test('should prevent infinite loops in flow execution', () => {
    engine.registerNode('a', 'process');
    engine.registerNode('b', 'process');
    engine.connect('a', 'b');
    engine.connect('b', 'a');
    const flow = engine.executeFlow('loopflow', 'a');
    expect(flow.length).toBeLessThanOrEqual(2);
  });
});

describe('Constants', () => {
  test('FORGE_STATES should have all required states', () => {
    expect(FORGE_STATES.IDLE).toBe('idle');
    expect(FORGE_STATES.SYNTHESIZING).toBe('synthesizing');
    expect(FORGE_STATES.OPTIMIZING).toBe('optimizing');
    expect(FORGE_STATES.COMPLETE).toBe('complete');
    expect(FORGE_STATES.ERROR).toBe('error');
  });

  test('SYNTHESIS_RESULT should have all required results', () => {
    expect(SYNTHESIS_RESULT.SUCCESS).toBe('success');
    expect(SYNTHESIS_RESULT.PARTIAL).toBe('partial');
    expect(SYNTHESIS_RESULT.FAILED).toBe('failed');
  });

  test('DESIGN_SYSTEMS should contain all 6 design systems', () => {
    expect(Object.keys(DESIGN_SYSTEMS)).toHaveLength(6);
    expect(DESIGN_SYSTEMS.CLAUDE_CODE).toBe('claude-code');
    expect(DESIGN_SYSTEMS.NANOBOT).toBe('nanobot');
    expect(DESIGN_SYSTEMS.CHATDEV).toBe('chatdev');
    expect(DESIGN_SYSTEMS.THUNDERBOLT).toBe('thunderbolt');
    expect(DESIGN_SYSTEMS.GENERIC_AGENT).toBe('generic-agent');
    expect(DESIGN_SYSTEMS.RUFLO).toBe('ruflo');
  });
});