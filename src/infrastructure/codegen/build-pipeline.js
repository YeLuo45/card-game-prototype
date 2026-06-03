// ============================================================================
// Code Generation — V299 Direction E Iteration 9/9
// BuildPipeline: 构建管道 (阶段编排/执行/缓存/钩子/重试)
// 来源：claude-code + generic-agent + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  function BuildPipeline(options) {
    options = options || {};
    this.pipelines = {};
    this.executions = {};
    this.pipelineCounter = 0;
    this.executionCounter = 0;
    this.maxExecutions = options.maxExecutions || 100;
    this.metrics = {
      pipelines: 0,
      executions: 0,
      stages: 0
    };
  }

  // ---- Define a pipeline ----
  BuildPipeline.prototype.definePipeline = function (name, config) {
    if (typeof name !== 'string' || name.length === 0) return { error: 'invalid_name' };
    if (!config || !Array.isArray(config.stages)) return { error: 'stages_required' };
    this.pipelines[name] = {
      name: name,
      description: config.description || '',
      stages: config.stages.map(function (s) {
        return {
          name: s.name,
          action: s.action,
          options: s.options || {},
          retries: s.retries || 0,
          required: s.required !== false,
          onSuccess: s.onSuccess || null,
          onFailure: s.onFailure || null,
          cacheKey: s.cacheKey || null
        };
      }),
      createdAt: Date.now()
    };
    this.metrics.pipelines++;
    this.metrics.stages += config.stages.length;
    return { success: true, pipeline: this.pipelines[name] };
  };

  BuildPipeline.prototype.removePipeline = function (name) {
    if (!this.pipelines[name]) return { error: 'not_found' };
    delete this.pipelines[name];
    return { success: true };
  };

  BuildPipeline.prototype.getPipeline = function (name) {
    return this.pipelines[name] || null;
  };

  BuildPipeline.prototype.listPipelines = function () {
    var arr = [];
    for (var k in this.pipelines) {
      if (Object.prototype.hasOwnProperty.call(this.pipelines, k)) {
        arr.push({ name: k, stages: this.pipelines[k].stages.length });
      }
    }
    return arr;
  };

  // ---- Execute a pipeline ----
  BuildPipeline.prototype.execute = function (name, context) {
    var p = this.pipelines[name];
    if (!p) return { error: 'pipeline_not_found' };
    context = context || {};
    var executionId = 'exec_' + (++this.executionCounter) + '_' + Date.now();
    if (this.executionCounter > this.maxExecutions) {
      // cleanup old
      var keys = Object.keys(this.executions);
      if (keys.length > 0) delete this.executions[keys[0]];
    }
    var execution = {
      executionId: executionId,
      pipeline: name,
      status: 'running',
      startedAt: Date.now(),
      finishedAt: null,
      stages: [],
      context: context,
      error: null
    };
    this.executions[executionId] = execution;
    this.metrics.executions++;
    for (var i = 0; i < p.stages.length; i++) {
      if (execution.status === 'failed') break;
      var stage = p.stages[i];
      var stageResult = this._runStage(stage, context, execution);
      execution.stages.push(stageResult);
      if (!stageResult.success && stage.required) {
        execution.status = 'failed';
        execution.error = 'stage_failed: ' + stage.name + (stageResult.error ? ' (' + stageResult.error + ')' : '');
        break;
      }
    }
    execution.finishedAt = Date.now();
    if (execution.status !== 'failed') execution.status = 'completed';
    return { success: execution.status === 'completed', execution: execution };
  };

  BuildPipeline.prototype._runStage = function (stage, context, execution) {
    var start = Date.now();
    var cached = null;
    if (stage.cacheKey) {
      cached = this._getCache(stage.cacheKey);
      if (cached) {
        return { name: stage.name, status: 'cached', duration: 0, result: cached, success: true, cached: true };
      }
    }
    var success = true;
    var result = null;
    var error = null;
    var attempt = 0;
    var done = false;
    while (!done && attempt <= stage.retries) {
      try {
        if (typeof stage.action === 'function') {
          result = stage.action(context, execution);
        } else if (stage.action && stage.action.command) {
          result = this._runCommand(stage.action.command, context);
        } else {
          result = { ok: true };
        }
        success = true;
        done = true;
      } catch (e) {
        error = e.message || String(e);
        if (attempt >= stage.retries) {
          success = false;
          done = true;
        } else {
          attempt++;
        }
      }
    }
    var duration = Date.now() - start;
    if (success && stage.cacheKey && result) {
      this._setCache(stage.cacheKey, result);
    }
    if (success && typeof stage.onSuccess === 'function') {
      try { stage.onSuccess(result, context); } catch (e) { /* ignore */ }
    }
    if (!success && typeof stage.onFailure === 'function') {
      try { stage.onFailure(error, context); } catch (e) { /* ignore */ }
    }
    return {
      name: stage.name,
      status: success ? 'success' : 'failed',
      duration: duration,
      result: result,
      error: error,
      success: success
    };
  };

  BuildPipeline.prototype._runCommand = function (cmd, context) {
    // simulated command execution
    return { command: cmd, executed: true, output: 'simulated output for ' + cmd };
  };

  BuildPipeline.prototype._cache = {};
  BuildPipeline.prototype._getCache = function (key) {
    return this._cache[key] || null;
  };
  BuildPipeline.prototype._setCache = function (key, value) {
    this._cache[key] = value;
  };
  BuildPipeline.prototype.clearCache = function () {
    this._cache = {};
    return { success: true };
  };

  // ---- Get execution ----
  BuildPipeline.prototype.getExecution = function (id) {
    return this.executions[id] || null;
  };

  BuildPipeline.prototype.listExecutions = function () {
    var arr = [];
    for (var k in this.executions) {
      if (Object.prototype.hasOwnProperty.call(this.executions, k)) {
        arr.push({ id: k, status: this.executions[k].status, duration: this.executions[k].finishedAt ? this.executions[k].finishedAt - this.executions[k].startedAt : 0 });
      }
    }
    return arr;
  };

  // ---- Validate pipeline ----
  BuildPipeline.prototype.validatePipeline = function (name) {
    var p = this.pipelines[name];
    if (!p) return { error: 'not_found' };
    var errors = [];
    for (var i = 0; i < p.stages.length; i++) {
      var s = p.stages[i];
      if (!s.name) errors.push({ stage: i, error: 'missing_name' });
      if (typeof s.action !== 'function' && (!s.action || !s.action.command)) {
        errors.push({ stage: i, error: 'invalid_action', stageName: s.name });
      }
    }
    return { valid: errors.length === 0, errors: errors };
  };

  BuildPipeline.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  BuildPipeline.prototype.getSummary = function () {
    return {
      pipelines: Object.keys(this.pipelines).length,
      executions: Object.keys(this.executions).length,
      cacheSize: Object.keys(this._cache).length,
      metrics: this.metrics
    };
  };

  BuildPipeline.prototype.clear = function () {
    this.pipelines = {};
    this.executions = {};
    this._cache = {};
    this.metrics = { pipelines: 0, executions: 0, stages: 0 };
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.BuildPipeline = BuildPipeline;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BuildPipeline: BuildPipeline };
  }
})();
