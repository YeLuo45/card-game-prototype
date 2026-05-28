// ============================================================================
// Card Auction House — V141 Direction C
// Bidding marketplace for trading cards between players
// thunderbolt offline-first + ruflo escrow + nanobot tool registry
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // AuctionHouse: Core auction logic
  // -----------------------------------------------------------------------
  function AuctionHouse() {
    this.state = { initialized: false, nextAuctionId: 1 };
    this._auctions = {};       // auctionId -> auction
    this._bids = {};          // auctionId -> bidHistory
    this._escrow = {};        // playerId -> balance
    this._listeners = [];
    this._init();
  }

  AuctionHouse.prototype._init = function () {
    this.state.initialized = true;
  };

  AuctionHouse.prototype._log = function (msg, data) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[AuctionHouse] ' + msg, data || '');
    }
  };

  // Create a new auction
  AuctionHouse.prototype.createAuction = function (playerId, card, params) {
    if (!card || !card.id) return { error: 'invalid_card' };
    if (!params || !params.startPrice || params.startPrice < 1) return { error: 'invalid_start_price' };
    if (!params.duration || params.duration < 1 || params.duration > 168) return { error: 'invalid_duration' };

    var auctionId = 'auction_' + (this.state.nextAuctionId++);
    var now = Date.now();

    var auction = {
      id: auctionId,
      sellerId: playerId,
      card: card,
      startPrice: params.startPrice,
      currentPrice: params.startPrice,
      buyNowPrice: params.buyNowPrice || 0,
      duration: params.duration,
      startTime: now,
      endTime: now + params.duration * 3600000,
      status: 'active',
      winnerId: null,
      bidCount: 0,
      watchers: []
    };

    this._auctions[auctionId] = auction;
    this._bids[auctionId] = [];

    this._emit('auction_created', auctionId);
    return { success: true, auctionId: auctionId, auction: auction };
  };

  // Place a bid
  AuctionHouse.prototype.placeBid = function (playerId, auctionId, amount) {
    var auction = this._auctions[auctionId];
    if (!auction) return { error: 'auction_not_found' };
    if (auction.status !== 'active') return { error: 'auction_not_active' };
    if (auction.sellerId === playerId) return { error: 'cannot_bid_own_auction' };
    if (amount < auction.currentPrice) return { error: 'bid_too_low', minBid: auction.currentPrice };
    if (this._isExpired(auction)) return { error: 'auction_expired' };

    var bids = this._bids[auctionId] || [];
    var topBid = bids.length > 0 ? bids[bids.length - 1] : null;

    // Require minimum increment
    var minIncrement = Math.max(1, Math.ceil(auction.currentPrice * 0.05));
    if (topBid) {
      // Must strictly exceed current price (no ties allowed)
      if (amount <= auction.currentPrice) {
        return { error: 'bid_too_low', minBid: auction.currentPrice + minIncrement };
      }
      if (amount < auction.currentPrice + minIncrement) {
        return { error: 'bid_increment', minBid: auction.currentPrice + minIncrement };
      }
    } else {
      // First bid: must meet or exceed start price
      if (amount < auction.currentPrice) {
        return { error: 'bid_too_low', minBid: auction.currentPrice };
      }
    }

    // Deduct from escrow
    var escrow = this._getEscrow(playerId);
    if (escrow < amount) return { error: 'insufficient_escrow', required: amount, balance: escrow };

    // Refund previous top bidder
    if (topBid) {
      this._escrow[topBid.playerId] = (this._escrow[topBid.playerId] || 0) + topBid.amount;
    }

    // Lock bid amount in escrow
    this._escrow[playerId] = escrow - amount;

    var bid = { playerId: playerId, amount: amount, time: Date.now(), auctionId: auctionId };
    bids.push(bid);
    this._bids[auctionId] = bids;

    auction.currentPrice = amount;
    auction.bidCount = bids.length;

    this._emit('bid_placed', auctionId, bid);
    return { success: true, bid: bid, currentPrice: amount };
  };

  // Buy now
  AuctionHouse.prototype.buyNow = function (playerId, auctionId) {
    var auction = this._auctions[auctionId];
    if (!auction) return { error: 'auction_not_found' };
    if (auction.status !== 'active') return { error: 'auction_not_active' };
    if (auction.sellerId === playerId) return { error: 'cannot_buy_own_auction' };
    if (!auction.buyNowPrice || auction.buyNowPrice <= 0) return { error: 'no_buy_now' };
    if (this._isExpired(auction)) return { error: 'auction_expired' };

    var escrow = this._getEscrow(playerId);
    if (escrow < auction.buyNowPrice) return { error: 'insufficient_escrow', required: auction.buyNowPrice };

    // Deduct buy now price
    this._escrow[playerId] = escrow - auction.buyNowPrice;

    // Close auction
    auction.status = 'sold';
    auction.winnerId = playerId;
    auction.endTime = Date.now();
    auction.buyNowSale = true;

    // Transfer card (seller gets proceeds)
    this._escrow[auction.sellerId] = (this._escrow[auction.sellerId] || 0) + auction.buyNowPrice;

    this._emit('auction_sold', auctionId, playerId);
    return { success: true, winnerId: playerId, price: auction.buyNowPrice, card: auction.card };
  };

  // Settle expired auction
  AuctionHouse.prototype.settleAuction = function (auctionId) {
    var auction = this._auctions[auctionId];
    if (!auction) return { error: 'auction_not_found' };
    if (auction.status !== 'active') return { error: 'auction_already_settled' };
    if (!this._isExpired(auction)) return { error: 'auction_not_expired' };

    var bids = this._bids[auctionId] || [];
    if (bids.length === 0) {
      auction.status = 'unsold';
    } else {
      var winner = bids[bids.length - 1];
      auction.status = 'sold';
      auction.winnerId = winner.playerId;
      // Seller gets proceeds
      this._escrow[auction.sellerId] = (this._escrow[auction.sellerId] || 0) + winner.amount;
    }

    this._emit('auction_settled', auctionId);
    return { success: true, status: auction.status, winnerId: auction.winnerId };
  };

  // Get auction info
  AuctionHouse.prototype.getAuction = function (auctionId) {
    var auction = this._auctions[auctionId];
    if (!auction) return null;
    var extended = { bidCount: auction.bidCount, isExpired: this._isExpired(auction), currentPrice: auction.currentPrice };
    for (var k in auction) extended[k] = auction[k];
    return extended;
  };

  // List active auctions
  AuctionHouse.prototype.listAuctions = function (filter) {
    var active = [];
    for (var id in this._auctions) {
      var a = this._auctions[id];
      if (filter && filter.status && a.status !== filter.status) continue;
      if (filter && filter.sellerId && a.sellerId !== filter.sellerId) continue;
      active.push(this.getAuction(id));
    }
    return active;
  };

  // List user's bids
  AuctionHouse.prototype.getMyBids = function (playerId) {
    var myBids = [];
    for (var aid in this._bids) {
      var bids = this._bids[aid];
      for (var i = 0; i < bids.length; i++) {
        if (bids[i].playerId === playerId) {
          myBids.push({ auctionId: aid, amount: bids[i].amount, time: bids[i].time });
        }
      }
    }
    return myBids;
  };

  // Escrow management
  AuctionHouse.prototype.depositEscrow = function (playerId, amount) {
    if (amount <= 0) return { error: 'invalid_amount' };
    this._escrow[playerId] = (this._escrow[playerId] || 0) + amount;
    return { success: true, balance: this._escrow[playerId] };
  };

  AuctionHouse.prototype._getEscrow = function (playerId) {
    return this._escrow[playerId] || 0;
  };

  AuctionHouse.prototype.getEscrowBalance = function (playerId) {
    return { balance: this._escrow[playerId] || 0 };
  };

  AuctionHouse.prototype._isExpired = function (auction) {
    return Date.now() > auction.endTime;
  };

  // Event system (nanobot tool registry pattern)
  AuctionHouse.prototype.on = function (event, cb) {
    this._listeners.push({ event: event, cb: cb });
  };

  AuctionHouse.prototype._emit = function (event, auctionId, data) {
    for (var i = 0; i < this._listeners.length; i++) {
      var l = this._listeners[i];
      if (l.event === event) l.cb(auctionId, data);
    }
  };

  // -----------------------------------------------------------------------
  // BidHistory: Per-auction bid tracking
  // -----------------------------------------------------------------------
  function BidHistory(auctionId) {
    this.auctionId = auctionId;
    this.bids = [];
  }

  BidHistory.prototype.add = function (playerId, amount) {
    this.bids.push({ playerId: playerId, amount: amount, time: Date.now() });
  };

  BidHistory.prototype.getTop = function () {
    return this.bids.length > 0 ? this.bids[this.bids.length - 1] : null;
  };

  BidHistory.prototype.getAll = function () {
    return this.bids.slice();
  };

  // -----------------------------------------------------------------------
  // EscrowService: Secure fund holding (ruflo escrow pattern)
  // -----------------------------------------------------------------------
  function EscrowService() {
    this.holds = {}; // holdId -> hold
  }

  EscrowService.prototype.createHold = function (playerId, amount, reason) {
    var holdId = 'hold_' + Date.now();
    this.holds[holdId] = { playerId: playerId, amount: amount, reason: reason, status: 'active', created: Date.now() };
    return { holdId: holdId };
  };

  EscrowService.prototype.releaseHold = function (holdId) {
    var hold = this.holds[holdId];
    if (!hold) return { error: 'hold_not_found' };
    if (hold.status !== 'active') return { error: 'hold_already_released' };
    hold.status = 'released';
    return { success: true };
  };

  EscrowService.prototype.getActiveHolds = function (playerId) {
    var result = [];
    for (var hid in this.holds) {
      var h = this.holds[hid];
      if (h.playerId === playerId && h.status === 'active') result.push(h);
    }
    return result;
  };

  // -----------------------------------------------------------------------
  // AuctionStore: Persistence
  // -----------------------------------------------------------------------
  function AuctionStore(ns) {
    this.ns = ns || 'auction_house';
    this._load();
  }

  AuctionStore.prototype._load = function () {
    this.data = { auctions: {}, bids: {} };
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.ns);
        if (raw) this.data = JSON.parse(raw);
      }
    } catch (e) {}
    this.data.auctions = this.data.auctions || {};
    this.data.bids = this.data.bids || {};
  };

  AuctionStore.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.ns, JSON.stringify(this.data));
      }
    } catch (e) {}
  };

  AuctionStore.prototype.saveAuction = function (auction) {
    this.data.auctions[auction.id] = auction;
    this._save();
  };

  AuctionStore.prototype.getAuctions = function () {
    return this.data.auctions;
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.AuctionHouse = AuctionHouse;
  window.BidHistory = BidHistory;
  window.EscrowService = EscrowService;
  window.AuctionStore = AuctionStore;
})();