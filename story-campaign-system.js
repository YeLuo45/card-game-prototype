// ============================================================================
// Card Story Campaign System — V113 Direction G
// ============================================================================
// Story-driven single-player campaign with branching choices.
// Integrates: generic-agent L0-L4 narrative memory + ruflo event hooks.
// ============================================================================

'use strict';

class StoryChapter {
  constructor(chapterId, title, description) {
    this.chapterId = chapterId;
    this.title = title;
    this.description = description;
    this.nodes = new Map();
    this.startNodeId = null;
    this.unlocked = false;
  }

  addNode(nodeId, nodeData) {
    this.nodes.set(nodeId, nodeData);
    if (!this.startNodeId) this.startNodeId = nodeId;
  }

  getNode(nodeId) {
    return this.nodes.get(nodeId) || null;
  }
}

class StoryNode {
  constructor(nodeId, text, choices) {
    this.nodeId = nodeId;
    this.text = text;
    this.choices = choices || []; // [{ text, nextNodeId, reward, condition }]
    this.rewards = {};
    this.isEnding = false;
  }

  addChoice(text, nextNodeId, reward) {
    this.choices.push({ text, nextNodeId, reward: reward || null, condition: null });
  }

  setEnding(reward) {
    this.isEnding = true;
    this.rewards = reward || {};
  }
}

class PlayerStoryState {
  constructor(playerId, campaignId) {
    this.playerId = playerId;
    this.campaignId = campaignId;
    this.currentChapterId = null;
    this.currentNodeId = null;
    this.completedChapters = new Set();
    this.collectedRewards = [];
    this.decisionLog = [];
    this.flags = {};
  }

  makeDecision(choiceText, reward) {
    this.decisionLog.push({ choice: choiceText, reward: reward || null, timestamp: Date.now() });
    if (reward) this.collectedRewards.push(reward);
  }

  setFlag(key, value) {
    this.flags[key] = value;
  }

  getFlag(key) {
    return this.flags[key];
  }
}

class StoryCampaignSystem {
  constructor() {
    this.campaigns = new Map();
    this.playerStates = new Map(); // playerId → Map(campaignId → PlayerStoryState)
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('story_campaign_system') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const c of data.campaigns || []) {
          const campaign = new StoryChapter(c.chapterId, c.title, c.description);
          campaign.unlocked = c.unlocked || false;
          for (const [nid, ndata] of Object.entries(c.nodes || {})) {
            const node = new StoryNode(nid, ndata.text, ndata.choices);
            node.rewards = ndata.rewards || {};
            node.isEnding = ndata.isEnding || false;
            campaign.addNode(nid, node);
          }
          campaign.startNodeId = c.startNodeId;
          this.campaigns.set(c.chapterId, campaign);
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const campaigns = Array.from(this.campaigns.values()).map(c => ({
        chapterId: c.chapterId, title: c.title, description: c.description,
        unlocked: c.unlocked, startNodeId: c.startNodeId,
        nodes: Object.fromEntries(Array.from(c.nodes.entries()).map(([k, v]) => [k, {
          text: v.text, choices: v.choices, rewards: v.rewards, isEnding: v.isEnding
        }]))
      }));
      localStorage.setItem('story_campaign_system', JSON.stringify({ campaigns }));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  createCampaign(campaignId, title, description) {
    const campaign = new StoryChapter(campaignId, title, description);
    this.campaigns.set(campaignId, campaign);
    this._save();
    return campaign;
  }

  getCampaign(campaignId) {
    return this.campaigns.get(campaignId) || null;
  }

  addStoryNode(campaignId, nodeId, text, choices) {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return { error: 'campaign_not_found' };
    const node = new StoryNode(nodeId, text, choices);
    campaign.addNode(nodeId, node);
    this._save();
    return node;
  }

  getOrCreatePlayerState(playerId, campaignId) {
    if (!this.playerStates.has(playerId)) this.playerStates.set(playerId, new Map());
    const pMap = this.playerStates.get(playerId);
    if (!pMap.has(campaignId)) {
      pMap.set(campaignId, new PlayerStoryState(playerId, campaignId));
    }
    return pMap.get(campaignId);
  }

  startCampaign(playerId, campaignId) {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return { error: 'campaign_not_found' };
    campaign.unlocked = true;
    const state = this.getOrCreatePlayerState(playerId, campaignId);
    state.currentChapterId = campaignId;
    state.currentNodeId = campaign.startNodeId;
    this._save();
    this._emit('campaign_started', { playerId, campaignId });
    return { success: true, nodeId: state.currentNodeId };
  }

  makeChoice(playerId, campaignId, choiceIndex) {
    const campaign = this.campaigns.get(campaignId);
    const state = this.playerStates.get(playerId)?.get(campaignId);
    if (!campaign || !state) return { error: 'state_not_found' };

    const node = campaign.getNode(state.currentNodeId);
    if (!node) return { error: 'node_not_found' };
    if (choiceIndex < 0 || choiceIndex >= node.choices.length) return { error: 'invalid_choice' };

    const choice = node.choices[choiceIndex];
    state.makeDecision(choice.text, choice.reward);

    if (choice.nextNodeId === null || choice.nextNodeId === undefined) {
      state.completedChapters.add(campaignId);
      this._save();
      this._emit('chapter_completed', { playerId, campaignId });
      return { success: true, completed: true };
    }

    state.currentNodeId = choice.nextNodeId;
    const nextNode = campaign.getNode(choice.nextNodeId);
    this._save();
    this._emit('choice_made', { playerId, campaignId, choiceIndex, nextNodeId: choice.nextNodeId });
    return { success: true, completed: nextNode ? nextNode.isEnding : false, nextNodeId: choice.nextNodeId };
  }

  getCurrentNode(playerId, campaignId) {
    const campaign = this.campaigns.get(campaignId);
    const state = this.playerStates.get(playerId)?.get(campaignId);
    if (!campaign || !state) return { error: 'state_not_found' };
    return { nodeId: state.currentNodeId, node: campaign.getNode(state.currentNodeId), completed: state.completedChapters.has(campaignId) };
  }

  getPlayerProgress(playerId, campaignId) {
    const state = this.playerStates.get(playerId)?.get(campaignId);
    if (!state) return { playerId, campaignId, completedChapters: 0, decisions: 0 };
    return {
      playerId, campaignId,
      completedChapters: state.completedChapters.size,
      decisions: state.decisionLog.length,
      rewardsCollected: state.collectedRewards.length,
      currentNodeId: state.currentNodeId
    };
  }

  getStats() {
    return {
      totalCampaigns: this.campaigns.size,
      totalPlayers: this.playerStates.size
    };
  }
}

const StoryCampaignTools = {
  'story.create': {
    description: 'Create a story campaign',
    parameters: { type: 'object', properties: { campaignId: { type: 'string' }, title: { type: 'string' } }, required: ['campaignId', 'title'] },
    handler(args) {
      const sys = window._storyCampaignSystem || new StoryCampaignSystem();
      if (window._storyCampaignSystem === undefined) window._storyCampaignSystem = sys;
      return sys.createCampaign(args.campaignId, args.title, args.description || '');
    }
  },
  'story.add_node': {
    description: 'Add a story node',
    parameters: { type: 'object', properties: { campaignId: { type: 'string' }, nodeId: { type: 'string' }, text: { type: 'string' }, choices: { type: 'array' } }, required: ['campaignId', 'nodeId', 'text'] },
    handler(args) {
      if (!window._storyCampaignSystem) return { error: 'system_not_initialized' };
      return window._storyCampaignSystem.addStoryNode(args.campaignId, args.nodeId, args.text, args.choices || []);
    }
  },
  'story.start': {
    description: 'Start a campaign',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, campaignId: { type: 'string' } }, required: ['playerId', 'campaignId'] },
    handler(args) {
      if (!window._storyCampaignSystem) return { error: 'system_not_initialized' };
      return window._storyCampaignSystem.startCampaign(args.playerId, args.campaignId);
    }
  },
  'story.choice': {
    description: 'Make a story choice',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, campaignId: { type: 'string' }, choiceIndex: { type: 'number' } }, required: ['playerId', 'campaignId', 'choiceIndex'] },
    handler(args) {
      if (!window._storyCampaignSystem) return { error: 'system_not_initialized' };
      return window._storyCampaignSystem.makeChoice(args.playerId, args.campaignId, args.choiceIndex);
    }
  },
  'story.progress': {
    description: 'Get player progress',
    parameters: { type: 'object', properties: { playerId: { type: 'string' }, campaignId: { type: 'string' } }, required: ['playerId', 'campaignId'] },
    handler(args) {
      if (!window._storyCampaignSystem) return { error: 'system_not_initialized' };
      return window._storyCampaignSystem.getPlayerProgress(args.playerId, args.campaignId);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StoryChapter, StoryNode, PlayerStoryState, StoryCampaignSystem, StoryCampaignTools };
}
if (typeof window !== 'undefined') {
  window.StoryChapter = StoryChapter;
  window.StoryNode = StoryNode;
  window.PlayerStoryState = PlayerStoryState;
  window.StoryCampaignSystem = StoryCampaignSystem;
  window.StoryCampaignTools = StoryCampaignTools;
}