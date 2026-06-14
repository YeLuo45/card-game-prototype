// V363 PlayerSegmenter: RFM 模型 + 8 segment (whale/dolphin/minnow/churner/new)
'use strict';
(function () {
  function PlayerSegmenter(options) {
    this.recency = 0.5; this.frequency = 0.5; this.monetary = 0.5;
    this.lastSegment = null;
  }
  PlayerSegmenter.prototype.update = function (rfm) {
    if (!rfm) return false;
    this.recency = typeof rfm.recency === 'number' ? rfm.recency : this.recency;
    this.frequency = typeof rfm.frequency === 'number' ? rfm.frequency : this.frequency;
    this.monetary = typeof rfm.monetary === 'number' ? rfm.monetary : this.monetary;
    return true;
  };
  PlayerSegmenter.prototype._score = function () { return (this.recency + this.frequency + this.monetary) / 3; };
  PlayerSegmenter.prototype.getSegment = function () {
    var s = this._score();
    var seg;
    if (s > 0.85) seg = 'whale';
    else if (s > 0.65) seg = 'dolphin';
    else if (s > 0.40) seg = 'minnow';
    else if (s > 0.20) seg = 'new';
    else seg = 'churner';
    this.lastSegment = seg;
    return seg;
  };
  PlayerSegmenter.prototype.getRFM = function () { return { recency: this.recency, frequency: this.frequency, monetary: this.monetary, score: this._score() }; };
  PlayerSegmenter.prototype.getReport = function () { return { rfm: this.getRFM(), segment: this.getSegment() }; };
  PlayerSegmenter.prototype.reset = function () { this.recency = 0.5; this.frequency = 0.5; this.monetary = 0.5; this.lastSegment = null; };
  if (typeof window !== 'undefined') window.PlayerSegmenter = PlayerSegmenter;
  else if (typeof module !== 'undefined' && module.exports) module.exports = { PlayerSegmenter: PlayerSegmenter };
})();
