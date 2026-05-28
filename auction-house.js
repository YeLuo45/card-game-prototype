// ============================================================================
// Card Auction House — V137 Direction E
// ============================================================================
// Real-time bidding marketplace with escrow, bidding wars, and price discovery.
// chatdev multi-agent (bid agent, escrow agent) + thunderbolt feedback loops.
// ============================================================================

'use strict';

class AuctionItem {
  constructor(itemId, cardId, sellerId, startPrice, duration) {
    this.itemId = itemId;
    this.cardId = cardId;
    this.sellerId = sellerId;
    this.startPrice = startPrice;
    this.currentPrice = startPrice;
    this.highestBidderId = null;
    this.bids = [];
    this.status = 'active'; // active, sold, expired, cancelled
    this.createdAt = Date.now();
    this.endsAt = Date.now() + (duration * 1000);
    this.buyNowPrice = startPrice * 3;
  }

  addBid(bidderId, amount) {
    if (amount <= this.currentPrice) return false;
    if (Date.now() > this.endsAt) return false;
    if (this.highestBidderId === bidderId) return false; // cannot outbid self
    this.bids.push({ bidderId, amount, timestamp: Date.now() });
    this.currentPrice = amount;
    this.highestBidderId = bidderId;
    return true;
  }

  buyNow(buyerId) {
    if (this.status !== 'active') return false;
    this.bids.push({ bidderId: buyerId, amount: this.buyNowPrice, timestamp: Date.now(), buyNow: true });
    this.currentPrice = this.buyNowPrice;
    this.highestBidderId = buyerId;
    this.status = 'sold';
    return true;
  }

  isExpired() { return Date.now() > this.endsAt && this.status === 'active'; }

  finalize() {
    if (this.status !== 'active') return null;
    if (this.highestBidderId && this.currentPrice > this.startPrice) {
      this.status = 'sold';
      return { winnerId: this.highestBidderId, price: this.currentPrice };
    }
    this.status = 'expired';
    return { winnerId: null, price: 0 };
  }
}

class BidHistory {
  constructor() { this.entries = []; }
  add(bidderId, itemId, amount) {
    this.entries.push({ bidderId, itemId, amount, timestamp: Date.now() });
    if (this.entries.length > 500) this.entries.shift();
  }
  getPlayerBids(playerId) { return this.entries.filter(e => e.bidderId === playerId); }
  getItemBids(itemId) { return this.entries.filter(e => e.itemId === itemId); }
}

class EscrowService {
  constructor() { this.holds = new Map(); } // transactionId → Hold
  placeHold(transactionId, buyerId, sellerId, amount) {
    this.holds.set(transactionId, { transactionId, buyerId, sellerId, amount, status: 'held', timestamp: Date.now() });
    return { success: true };
  }
  releaseHold(transactionId) {
    const h = this.holds.get(transactionId);
    if (!h) return { error: 'hold_not_found' };
    h.status = 'released';
    return { success: true };
  }
  getHold(transactionId) { return this.holds.get(transactionId) || null; }
}

class AuctionHouse {
  constructor() {
    this.items = new Map(); // itemId → AuctionItem
    this.bidHistory = new BidHistory();
    this.escrow = new EscrowService();
    this.hooks = [];
    this._load();
  }

  _load() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('auction_house') : null;
      if (raw) {
        const data = JSON.parse(raw);
        for (const [iid, idata] of Object.entries(data.items || {})) {
          const item = new AuctionItem(idata.cardId, idata.cardId, idata.sellerId, idata.startPrice, 60);
          item.currentPrice = idata.currentPrice;
          item.highestBidderId = idata.highestBidderId;
          item.status = idata.status;
          item.bids = idata.bids || [];
          item.createdAt = idata.createdAt || Date.now();
          item.endsAt = idata.endsAt || Date.now() + 60000;
          this.items.set(iid, item);
        }
      }
    } catch {}
  }

  _save() {
    if (typeof localStorage !== 'undefined') {
      const data = {
        items: Object.fromEntries(Array.from(this.items.entries()).map(([k, v]) => [k, {
          cardId: v.cardId, sellerId: v.sellerId, startPrice: v.startPrice,
          currentPrice: v.currentPrice, highestBidderId: v.highestBidderId,
          status: v.status, bids: v.bids, createdAt: v.createdAt, endsAt: v.endsAt
        }]))
      };
      localStorage.setItem('auction_house', JSON.stringify(data));
    }
  }

  registerHook(cb) { this.hooks.push(cb); }
  _emit(event, data) { for (const h of this.hooks) { try { h(event, data); } catch {} } }

  listItem(cardId, sellerId, startPrice, durationSec) {
    const itemId = `auction_${Date.now()}`;
    const item = new AuctionItem(itemId, cardId, sellerId, startPrice, durationSec);
    this.items.set(itemId, item);
    this._save();
    this._emit('item_listed', { itemId, cardId });
    return item;
  }

  placeBid(itemId, bidderId, amount) {
    const item = this.items.get(itemId);
    if (!item) return { error: 'item_not_found' };
    if (item.sellerId === bidderId) return { error: 'cannot_bid_on_own' };

    const result = item.addBid(bidderId, amount);
    if (!result) return { error: 'bid_too_low' };

    this.bidHistory.add(bidderId, itemId, amount);
    this._save();
    this._emit('bid_placed', { itemId, bidderId, amount });
    return { success: true, currentPrice: item.currentPrice };
  }

  buyNow(itemId, buyerId) {
    const item = this.items.get(itemId);
    if (!item) return { error: 'item_not_found' };
    if (item.sellerId === buyerId) return { error: 'cannot_buy_own' };

    const result = item.buyNow(buyerId);
    if (!result) return { error: 'auction_not_active' };

    this._save();
    this._emit('buy_now', { itemId, buyerId, price: item.buyNowPrice });
    return { success: true, price: item.buyNowPrice };
  }

  finalizeAuction(itemId) {
    const item = this.items.get(itemId);
    if (!item) return { error: 'item_not_found' };
    const result = item.finalize();
    if (result && result.winnerId) {
      // Place escrow hold
      const txId = `tx_${itemId}_${Date.now()}`;
      this.escrow.placeHold(txId, result.winnerId, item.sellerId, result.price);
    }
    this._save();
    this._emit('auction_finalized', { itemId, ...result });
    return result;
  }

  getActiveAuctions(limit) {
    return Array.from(this.items.values())
      .filter(i => i.status === 'active')
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit || 20)
      .map(i => ({ itemId: i.itemId, cardId: i.cardId, currentPrice: i.currentPrice, endsAt: i.endsAt, bidCount: i.bids.length }));
  }

  getMyBids(playerId) {
    return this.bidHistory.getPlayerBids(playerId)
      .map(b => ({ itemId: b.itemId, amount: b.amount, timestamp: b.timestamp }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getItemDetails(itemId) {
    const item = this.items.get(itemId);
    if (!item) return null;
    return {
      itemId: item.itemId, cardId: item.cardId, sellerId: item.sellerId,
      startPrice: item.startPrice, currentPrice: item.currentPrice,
      highestBidderId: item.highestBidderId, status: item.status,
      bidCount: item.bids.length, endsAt: item.endsAt
    };
  }

  cancelAuction(itemId, sellerId) {
    const item = this.items.get(itemId);
    if (!item) return { error: 'item_not_found' };
    if (item.sellerId !== sellerId) return { error: 'not_owner' };
    if (item.bids.length > 0) return { error: 'has_bids' };
    item.status = 'cancelled';
    this._save();
    return { success: true };
  }
}

const AuctionTools = {
  'auction.list': {
    description: 'List an item for auction',
    parameters: { type: 'object', properties: { cardId: { type: 'string' }, sellerId: { type: 'string' }, startPrice: { type: 'number' }, durationSec: { type: 'number' } }, required: ['cardId', 'sellerId', 'startPrice'] },
    handler(args) {
      if (!window._auctionHouse) window._auctionHouse = new AuctionHouse();
      return window._auctionHouse.listItem(args.cardId, args.sellerId, args.startPrice, args.durationSec || 60);
    }
  },
  'auction.bid': {
    description: 'Place a bid',
    parameters: { type: 'object', properties: { itemId: { type: 'string' }, bidderId: { type: 'string' }, amount: { type: 'number' } }, required: ['itemId', 'bidderId', 'amount'] },
    handler(args) {
      if (!window._auctionHouse) return { error: 'not_init' };
      return window._auctionHouse.placeBid(args.itemId, args.bidderId, args.amount);
    }
  },
  'auction.buy_now': {
    description: 'Buy now at fixed price',
    parameters: { type: 'object', properties: { itemId: { type: 'string' }, buyerId: { type: 'string' } }, required: ['itemId', 'buyerId'] },
    handler(args) {
      if (!window._auctionHouse) return { error: 'not_init' };
      return window._auctionHouse.buyNow(args.itemId, args.buyerId);
    }
  },
  'auction.active': {
    description: 'Get active auctions',
    parameters: { type: 'object', properties: { limit: { type: 'number' } } },
    handler(args) {
      if (!window._auctionHouse) window._auctionHouse = new AuctionHouse();
      return window._auctionHouse.getActiveAuctions(args.limit);
    }
  },
  'auction.my_bids': {
    description: 'Get my bid history',
    parameters: { type: 'object', properties: { playerId: { type: 'string' } } },
    handler(args) {
      if (!window._auctionHouse) window._auctionHouse = new AuctionHouse();
      return window._auctionHouse.getMyBids(args.playerId);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AuctionItem, BidHistory, EscrowService, AuctionHouse, AuctionTools };
}
if (typeof window !== 'undefined') {
  window.AuctionItem = AuctionItem;
  window.BidHistory = BidHistory;
  window.EscrowService = EscrowService;
  window.AuctionHouse = AuctionHouse;
  window.AuctionTools = AuctionTools;
}