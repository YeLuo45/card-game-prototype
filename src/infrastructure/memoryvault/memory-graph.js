// ============================================================================
// Distributed Memory Vault — V305 Direction F Iteration 6/30
// MemoryGraph: 知识图谱关联（节点-边结构 + 关联查询 + 遍历）
// 来源：nanobot Mesh (节点拓扑) + generic-agent Knowledge Graph (L0-L4)
// ============================================================================
'use strict';

(function () {

  // --------------------------------------------------------------------------
  // RELATION_TYPE — semantic edge labels
  // --------------------------------------------------------------------------
  var RELATION_TYPE = {
    CAUSAL: 'causal',         // A causes B (战斗失败 → 学习弱点)
    TEMPORAL: 'temporal',     // A before B (事件序列)
    SEMANTIC: 'semantic',     // A is related to B (主题相似)
    ENTITY: 'entity',         // A references entity X (卡牌 → 角色)
    HIERARCHY: 'hierarchy',   // A is-a B (类型归属)
    CONTRADICTS: 'contradicts', // A conflicts with B
    REINFORCES: 'reinforces',   // A strengthens B
    TRIGGERS: 'triggers'        // A activates B
  };

  // --------------------------------------------------------------------------
  // MemoryGraphNode — wraps a memory entry as a graph node
  // --------------------------------------------------------------------------
  function MemoryGraphNode(memoryId, type, layer) {
    this.memoryId = memoryId;
    this.type = type || 'unknown';
    this.layer = layer || 'L4';
    this.properties = {};
    this.incoming = {}; // relation -> Set of source node ids
    this.outgoing = {}; // relation -> Set of target node ids
  }

  MemoryGraphNode.prototype.setProperty = function (k, v) { this.properties[k] = v; return this; };
  MemoryGraphNode.prototype.getProperty = function (k) { return this.properties[k]; };

  // --------------------------------------------------------------------------
  // MemoryGraphEdge — directed typed edge
  // --------------------------------------------------------------------------
  function MemoryGraphEdge(fromId, toId, relation, weight) {
    this.from = fromId;
    this.to = toId;
    this.relation = relation || RELATION_TYPE.SEMANTIC;
    this.weight = (weight != null) ? weight : 1.0;
    this.createdAt = Date.now();
  }

  // --------------------------------------------------------------------------
  // MemoryGraph — node/edge container with traversal
  // --------------------------------------------------------------------------
  function MemoryGraph(options) {
    this.nodes = {};           // memoryId -> MemoryGraphNode
    this.edges = [];           // list of MemoryGraphEdge
    this.adjacency = {};       // fromId -> [edgeIndex]
    this.reverseAdj = {};      // toId -> [edgeIndex]
    this.maxEdgesPerNode = (options && options.maxEdgesPerNode) || 100;
    this.allowCycles = !!(options && options.allowCycles); // default false — reject cycles
  }

  // Add node (idempotent)
  MemoryGraph.prototype.addNode = function (memoryId, type, layer, properties) {
    if (!memoryId) return null;
    if (this.nodes[memoryId]) {
      if (type) this.nodes[memoryId].type = type;
      if (layer) this.nodes[memoryId].layer = layer;
      if (properties) {
        for (var k in properties) {
          if (Object.prototype.hasOwnProperty.call(properties, k)) {
            this.nodes[memoryId].setProperty(k, properties[k]);
          }
        }
      }
      return this.nodes[memoryId];
    }
    var node = new MemoryGraphNode(memoryId, type, layer);
    if (properties) {
      for (var k2 in properties) {
        if (Object.prototype.hasOwnProperty.call(properties, k2)) {
          node.setProperty(k2, properties[k2]);
        }
      }
    }
    this.nodes[memoryId] = node;
    return node;
  };

  MemoryGraph.prototype.hasNode = function (memoryId) { return !!this.nodes[memoryId]; };
  MemoryGraph.prototype.getNode = function (memoryId) { return this.nodes[memoryId] || null; };
  MemoryGraph.prototype.removeNode = function (memoryId) {
    if (!this.nodes[memoryId]) return false;
    delete this.nodes[memoryId];
    // remove edges
    this.edges = this.edges.filter(function (e) { return e.from !== memoryId && e.to !== memoryId; });
    delete this.adjacency[memoryId];
    delete this.reverseAdj[memoryId];
    return true;
  };

  // Add edge (rejects if nodes missing, optional cycle detection)
  MemoryGraph.prototype.addEdge = function (fromId, toId, relation, weight) {
    if (!this.nodes[fromId]) return { error: 'from_not_found', success: false };
    if (!this.nodes[toId]) return { error: 'to_not_found', success: false };
    if (fromId === toId) return { error: 'self_loop', success: false };
    if (!this.allowCycles && this._hasPath(toId, fromId, 10)) {
      return { error: 'cycle_detected', success: false };
    }
    var edge = new MemoryGraphEdge(fromId, toId, relation, weight);
    this.edges.push(edge);
    var idx = this.edges.length - 1;
    if (!this.adjacency[fromId]) this.adjacency[fromId] = [];
    this.adjacency[fromId].push(idx);
    if (!this.reverseAdj[toId]) this.reverseAdj[toId] = [];
    this.reverseAdj[toId].push(idx);

    // update node outgoing/incoming sets
    var fromNode = this.nodes[fromId];
    if (!fromNode.outgoing[relation]) fromNode.outgoing[relation] = {};
    fromNode.outgoing[relation][toId] = true;
    var toNode = this.nodes[toId];
    if (!toNode.incoming[relation]) toNode.incoming[relation] = {};
    toNode.incoming[relation][fromId] = true;
    return { success: true, edge: edge };
  };

  MemoryGraph.prototype.removeEdge = function (fromId, toId, relation) {
    var initial = this.edges.length;
    this.edges = this.edges.filter(function (e) {
      if (e.from !== fromId) return true;
      if (e.to !== toId) return true;
      if (relation && e.relation !== relation) return true;
      return false;
    });
    var removed = initial - this.edges.length;
    if (removed > 0) {
      // rebuild adjacency
      this._rebuildAdjacency();
    }
    return removed;
  };

  MemoryGraph.prototype._rebuildAdjacency = function () {
    this.adjacency = {};
    this.reverseAdj = {};
    for (var i = 0; i < this.edges.length; i++) {
      var e = this.edges[i];
      if (!this.adjacency[e.from]) this.adjacency[e.from] = [];
      this.adjacency[e.from].push(i);
      if (!this.reverseAdj[e.to]) this.reverseAdj[e.to] = [];
      this.reverseAdj[e.to].push(i);
    }
  };

  MemoryGraph.prototype.getEdges = function (fromId) {
    if (!fromId) return this.edges.slice();
    var idxs = this.adjacency[fromId] || [];
    var out = [];
    for (var i = 0; i < idxs.length; i++) out.push(this.edges[idxs[i]]);
    return out;
  };

  MemoryGraph.prototype.getIncomingEdges = function (toId) {
    var idxs = this.reverseAdj[toId] || [];
    var out = [];
    for (var i = 0; i < idxs.length; i++) out.push(this.edges[idxs[i]]);
    return out;
  };

  // BFS traversal up to maxDepth
  MemoryGraph.prototype.traverse = function (startId, options) {
    var maxDepth = (options && options.maxDepth) || 3;
    var relation = options && options.relation;
    var visited = { startId: true };
    var order = [startId];
    var queue = [{ id: startId, depth: 0 }];
    while (queue.length > 0) {
      var cur = queue.shift();
      if (cur.depth >= maxDepth) continue;
      var edges = this.getEdges(cur.id);
      for (var i = 0; i < edges.length; i++) {
        var e = edges[i];
        if (relation && e.relation !== relation) continue;
        if (visited[e.to]) continue;
        visited[e.to] = true;
        order.push(e.to);
        queue.push({ id: e.to, depth: cur.depth + 1 });
      }
    }
    return order;
  };

  // Find shortest path between two nodes (BFS)
  MemoryGraph.prototype._hasPath = function (fromId, toId, maxDepth) {
    if (fromId === toId) return true;
    var visited = {};
    visited[fromId] = true;
    var queue = [fromId];
    var depth = 0;
    while (queue.length > 0 && depth < maxDepth) {
      var next = [];
      for (var i = 0; i < queue.length; i++) {
        var edges = this.getEdges(queue[i]);
        for (var j = 0; j < edges.length; j++) {
          if (edges[j].to === toId) return true;
          if (!visited[edges[j].to]) {
            visited[edges[j].to] = true;
            next.push(edges[j].to);
          }
        }
      }
      queue = next;
      depth++;
    }
    return false;
  };

  MemoryGraph.prototype.findPath = function (fromId, toId, maxDepth) {
    if (!this.nodes[fromId] || !this.nodes[toId]) return null;
    if (fromId === toId) return [fromId];
    var visited = {};
    visited[fromId] = { parent: null };
    var queue = [fromId];
    var depth = 0;
    var md = maxDepth || 6;
    while (queue.length > 0 && depth < md) {
      var next = [];
      for (var i = 0; i < queue.length; i++) {
        var edges = this.getEdges(queue[i]);
        for (var j = 0; j < edges.length; j++) {
          var t = edges[j].to;
          if (visited[t]) continue;
          visited[t] = { parent: queue[i], edge: edges[j] };
          if (t === toId) {
            // reconstruct path
            var path = [t];
            var p = visited[t].parent;
            while (p) { path.unshift(p); p = visited[p].parent; }
            return path;
          }
          next.push(t);
        }
      }
      queue = next;
      depth++;
    }
    return null;
  };

  // Find all neighbors of a node grouped by relation
  MemoryGraph.prototype.getNeighbors = function (nodeId, relation) {
    var node = this.nodes[nodeId];
    if (!node) return {};
    var result = {};
    var rels = relation ? [relation] : Object.keys(node.outgoing);
    for (var i = 0; i < rels.length; i++) {
      var r = rels[i];
      result[r] = Object.keys(node.outgoing[r] || {});
    }
    return result;
  };

  // Find related memories by traversing graph from a node
  MemoryGraph.prototype.findRelated = function (nodeId, maxDepth) {
    if (!this.nodes[nodeId]) return [];
    return this.traverse(nodeId, { maxDepth: maxDepth || 2 }).slice(1); // exclude self
  };

  MemoryGraph.prototype.getStats = function () {
    var relCounts = {};
    for (var i = 0; i < this.edges.length; i++) {
      var r = this.edges[i].relation;
      relCounts[r] = (relCounts[r] || 0) + 1;
    }
    return {
      nodeCount: Object.keys(this.nodes).length,
      edgeCount: this.edges.length,
      relationCounts: relCounts
    };
  };

  MemoryGraph.prototype.toJSON = function () {
    return {
      nodes: Object.keys(this.nodes).map(function (k) { return { id: k, type: this.nodes[k].type, layer: this.nodes[k].layer }; }.bind(this)),
      edges: this.edges.map(function (e) { return { from: e.from, to: e.to, relation: e.relation, weight: e.weight }; })
    };
  };

  // Exports
  window.MemoryGraph = MemoryGraph;
  window.MemoryGraphNode = MemoryGraphNode;
  window.MemoryGraphEdge = MemoryGraphEdge;
  window.RELATION_TYPE = RELATION_TYPE;

})();
