// ============================================================================
// Card Auction House — V187 Direction C
// Trading card auction house with bidding, buyouts and transaction history
// thunderbolt feedback loops + chatdev role specialization
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // AuctionItem: A single auction listing
  // -----------------------------------------------------------------------
  function AuctionItem(itemId, sellerId, card, startingPrice, buyoutPrice, duration) {
    this.itemId = itemId || ('item_' + Math.random().toString(36).substr(2, 6));
    this.sellerId = sellerId;
    this.card = card;
    this.startingPrice = startingPrice || 1;
    this.currentBid = startingPrice;
    this.currentBidder = null;
    this.buyoutPrice = buyoutPrice || null;
    this.duration = duration || 3600000; // 1 hour default in ms
    this.createdAt = Date.now();
    this.expiresAt = this.createdAt + this.duration;
    this.status = 'active'; // active, sold, expired, cancelled
    this.bidCount = 0;
  }

  AuctionItem.prototype.placeBid = function (bidderId, amount) {
    if (this.status !== 'active') return { error: 'not_active' };
    if (Date.now() > this.expiresAt) {
      this.status = 'expired';
      return { error: 'expired' };
    }
    if (amount <= this.currentBid) return { error: 'bid_too_low' };
    if (bidderId === this.sellerId) return { error: 'own_item' };
    this.currentBidder = bidderId;
    this.currentBid = amount;
    this.bidCount++;
    return { success: true, currentBid: this.currentBid, bidCount: this.bidCount };
  };

  AuctionItem.prototype.buyout = function (buyerId) {
    if (this.status !== 'active') return { error: 'not_active' };
    if (!this.buyoutPrice) return { error: 'no_buyout' };
    if (buyerId === this.sellerId) return { error: 'own_item' };
    this.currentBidder = buyerId;
    this.currentBid = this.buyoutPrice;
    this.status = 'sold';
    this.soldAt = Date.now();
    return { success: true, finalPrice: this.buyoutPrice, winner: buyerId };
  };

  AuctionItem.prototype.getRemainingTime = function () {
    if (this.status !== 'active') return 0;
    return Math.max(0, this.expiresAt - Date.now());
  };

  // -----------------------------------------------------------------------
  // Transaction: A completed transaction record
  // -----------------------------------------------------------------------
  function Transaction(txId, itemId, sellerId, buyerId, price, card) {
    this.txId = txId;
    this.itemId = itemId;
    this.sellerId = sellerId;
    this.buyerId = buyerId;
    this.price = price;
    this.card = card;
    this.timestamp = Date.now();
  }

  // -----------------------------------------------------------------------
  // AuctionHouse: Manages all auctions and transactions
  // -----------------------------------------------------------------------
  function AuctionHouse(houseId, name) {
    this.houseId = houseId || ('house_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Auction House';
    this.listings = {}; // itemId -> AuctionItem
    this.transactions = []; // array of Transaction
    this.itemIdCounter = 0;
    this.txIdCounter = 0;
    this.feePercent = 5; // 5% house fee
  }

  AuctionHouse.prototype.listItem = function (sellerId, card, startingPrice, buyoutPrice, duration) {
    this.itemIdCounter++;
    var itemId = 'item_' + this.itemIdCounter;
    this.listings[itemId] = new AuctionItem(itemId, sellerId, card, startingPrice, buyoutPrice, duration);
    return { success: true, itemId: itemId };
  };

  AuctionHouse.prototype.getItem = function (itemId) {
    return this.listings[itemId] || null;
  };

  AuctionHouse.prototype.getActiveListings = function () {
    var active = [];
    for (var id in this.listings) {
      if (this.listings[id].status === 'active') active.push(this.listings[id]);
    }
    return active;
  };

  AuctionHouse.prototype.placeBid = function (itemId, bidderId, amount) {
    var item = this.listings[itemId];
    if (!item) return { error: 'item_not_found' };
    var r = item.placeBid(bidderId, amount);
    if (r.success) this._checkExpired(item);
    return r;
  };

  AuctionHouse.prototype.buyout = function (itemId, buyerId) {
    var item = this.listings[itemId];
    if (!item) return { error: 'item_not_found' };
    var r = item.buyout(buyerId);
    if (r.success) {
      item.status = 'sold';
      var txId = 'tx_' + (++this.txIdCounter);
      var tx = new Transaction(txId, itemId, item.sellerId, buyerId, r.finalPrice, item.card);
      this.transactions.push(tx);
      this._updateSellerEarnings(item.sellerId, r.finalPrice);
    }
    return r;
  };

  AuctionHouse.prototype._checkExpired = function (item) {
    if (item.status === 'active' && Date.now() > item.expiresAt) {
      item.status = 'expired';
      if (item.currentBidder) {
        item.status = 'sold';
        var txId = 'tx_' + (++this.txIdCounter);
        var tx = new Transaction(txId, item.itemId, item.sellerId, item.currentBidder, item.currentBid, item.card);
        this.transactions.push(tx);
        this._updateSellerEarnings(item.sellerId, item.currentBid);
      }
    }
  };

  AuctionHouse.prototype._updateSellerEarnings = function (sellerId, salePrice) {
    // Simplified: record net earnings after fee
    this._sellerEarnings = this._sellerEarnings || {};
    var net = salePrice * (1 - this.feePercent / 100);
    this._sellerEarnings[sellerId] = (this._sellerEarnings[sellerId] || 0) + net;
  };

  AuctionHouse.prototype.getSellerEarnings = function (sellerId) {
    return this._sellerEarnings ? (this._sellerEarnings[sellerId] || 0) : 0;
  };

  AuctionHouse.prototype.getTransactions = function () {
    return this.transactions.slice();
  };

  AuctionHouse.prototype.getTransactionHistory = function (playerId) {
    return this.transactions.filter(function (t) {
      return t.sellerId === playerId || t.buyerId === playerId;
    });
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.AuctionItem = AuctionItem;
  window.Transaction = Transaction;
  window.AuctionHouse = AuctionHouse;
})();