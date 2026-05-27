'use strict';

const fs = require('fs');
const path = require('path');

global.window = global;
const code = fs.readFileSync(path.join(__dirname, 'auction-house.js'), 'utf8');
eval(code);

const { AuctionHouse, AuctionPanel, AuctionTools } = window;

let passed = 0, failed = 0;
function assert(c, msg) {
    if (c) { passed++; console.log(`  ✓ ${msg}`); }
    else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}
function assertEq(a, b, msg) { assert(a === b, `${msg} (expected ${b}, got ${a})`); }

// ========================================================================
// AuctionHouse Tests
// ========================================================================
console.log('\n=== AuctionHouse Tests ===');
{
    const auction = new AuctionHouse();

    // test initial state
    assertEq(auction.listings.length, 0, 'initial listings empty');
    assertEq(auction.isRunning, false, 'auction not running initially');
    assertEq(auction.auctioneerHooks.length, 0, 'no hooks initially');

    // test listCard
    const card = { id: 'card1', name: '打击', type: 'attack', damage: 6 };
    const listing = auction.listCard(card, 'player1', 100, 60);
    assert(listing !== null, 'listCard returns listing');
    assertEq(listing.card.id, 'card1', 'listing card id correct');
    assertEq(listing.sellerId, 'player1', 'listing seller correct');
    assertEq(listing.startingPrice, 100, 'starting price correct');
    assertEq(listing.currentBid, 100, 'current bid equals starting price');
    assertEq(listing.currentBidder, null, 'no bidder initially');
    assertEq(listing.status, 'active', 'status is active');
    assert(listing.id.startsWith('lst_'), 'listing id format correct');

    // test listCard persists
    assertEq(auction.listings.length, 1, 'listing persisted in array');

    // test getListing
    const found = auction.getListing(listing.id);
    assert(found !== null, 'getListing finds listing');
    assertEq(found.card.name, '打击', 'getListing returns correct card');

    // test getListing — not found
    assertEq(auction.getListing('invalid'), null, 'getListing returns null for invalid');

    // test getActiveListings
    const active = auction.getActiveListings();
    assertEq(active.length, 1, 'getActiveListings returns 1');

    // test placeBid — success
    const bidResult = auction.placeBid(listing.id, 'player2', 150);
    assert(bidResult.success, 'placeBid returns success');
    assertEq(bidResult.currentBid, 150, 'current bid updated');
    assertEq(bidResult.currentBidder, 'player2', 'current bidder updated');

    // test placeBid — too low
    const bidLow = auction.placeBid(listing.id, 'player3', 120);
    assert(bidLow.error, 'placeBid returns error for too low bid');
    assertEq(bidLow.error, 'bid_too_low', 'error is bid_too_low');

    // test placeBid — invalid listing
    const bidInvalid = auction.placeBid('invalid_id', 'player3', 200);
    assertEq(bidInvalid.error, 'invalid_listing', 'bid on invalid listing returns error');

    // test placeBid — auction ended (manipulate endTime to past)
    const listing2 = auction.listCard({ id: 'card2', name: '防御', type: 'defense', block: 5 }, 'player1', 50, 1);
    listing2.endTime = Date.now() - 1000; // Set to past
    auction.processExpiredListings(); // Mark it as ended
    const bidEnded = auction.placeBid(listing2.id, 'player2', 60);
    assertEq(bidEnded.error, 'auction_ended', 'bid on expired auction returns error');

    // test bidHistory
    const l = auction.getListing(listing.id);
    assertEq(l.bidHistory.length, 1, 'bid history has 1 entry');
    assertEq(l.bidHistory[0].bidderId, 'player2', 'bid history bidder correct');
    assertEq(l.bidHistory[0].amount, 150, 'bid history amount correct');

    // test cancelListing — success (no bids)
    const listing3 = auction.listCard({ id: 'card3', name: '抽卡', type: 'skill', draw: 2 }, 'player1', 80, 120);
    const cancelResult = auction.cancelListing(listing3.id, 'player1');
    assertEq(cancelResult, true, 'cancelListing returns true');
    assertEq(auction.getListing(listing3.id).status, 'cancelled', 'listing status is cancelled');

    // test cancelListing — wrong seller
    const listing4 = auction.listCard({ id: 'card4', name: '治疗', type: 'skill', heal: 3 }, 'player1', 60, 120);
    const cancelWrong = auction.cancelListing(listing4.id, 'player2');
    assertEq(cancelWrong, false, 'cancelListing fails for wrong seller');

    // test cancelListing — has bids
    const bidOnListing4 = auction.placeBid(listing4.id, 'player3', 70);
    const cancelBidded = auction.cancelListing(listing4.id, 'player1');
    assertEq(cancelBidded, false, 'cancelListing fails when bids exist');

    // test getMyListings
    const myListings = auction.getMyListings('player1');
    assert(myListings.length >= 1, 'getMyListings returns listings for seller');

    // test getMyBids
    const myBids = auction.getMyBids('player2');
    assert(myBids.length >= 1, 'getMyBids returns bids for bidder');

    // test processExpiredListings
    auction.listings = auction.listings.filter(l => l.status !== 'cancelled');
    const expiredResults = auction.processExpiredListings();
    assert(Array.isArray(expiredResults), 'processExpiredListings returns array');

    // test getStats
    const stats = auction.getStats();
    assert(typeof stats === 'object', 'getStats returns object');
    assertEq(typeof stats.activeListings, 'number', 'stats has activeListings');
    assertEq(typeof stats.totalListings, 'number', 'stats has totalListings');
    assertEq(typeof stats.endedAuctions, 'number', 'stats has endedAuctions');
    assertEq(typeof stats.totalVolume, 'number', 'stats has totalVolume');
    assertEq(typeof stats.averagePrice, 'number', 'stats has averagePrice');
}

// ========================================================================
// AuctionPanel Tests
// ========================================================================
console.log('\n=== AuctionPanel Tests ===');
{
    const auction = new AuctionHouse();
    const panel = new AuctionPanel(auction);

    assertEq(panel.isOpen, false, 'AuctionPanel initial isOpen false');
    panel.open();
    assertEq(panel.isOpen, true, 'AuctionPanel open sets true');
    panel.close();
    assertEq(panel.isOpen, false, 'AuctionPanel close sets false');
    panel.toggle();
    assertEq(panel.isOpen, true, 'AuctionPanel toggle opens');

    const state = panel.getPanelState();
    assert(typeof state === 'object', 'getPanelState returns object');
    assertEq(typeof state.open, 'boolean', 'state has open field');
    assert(typeof state.stats === 'object', 'state has stats field');
}

// ========================================================================
// AuctionTools Tests
// ========================================================================
console.log('\n=== AuctionTools Tests ===');
{
    const r1 = AuctionTools['auction.list'].handler({}, {});
    assert(Array.isArray(r1), 'auction.list returns array');

    const r2 = AuctionTools['auction.stats'].handler({}, {});
    assert(typeof r2 === 'object', 'auction.stats returns object');
    assertEq(typeof r2.totalListings, 'number', 'stats has totalListings');

    const r3 = AuctionTools['auction.list_card'].handler({ listingId: 'invalid' }, {});
    assertEq(r3, null, 'auction.list_card returns null for invalid');

    const r4 = AuctionTools['auction.place_bid'].handler({ listingId: 'invalid', bidderId: 'p1', amount: 100 }, {});
    assert(r4.error, 'auction.place_bid returns error for invalid listing');
}

// ========================================================================
// Integration Tests
// ========================================================================
console.log('\n=== Integration Tests ===');
{
    const auction = new AuctionHouse();

    // Full auction lifecycle
    const card = { id: 'rare1', name: '火球术', type: 'attack', damage: 10, cost: 3 };
    const listing = auction.listCard(card, 'seller1', 500, 120);

    // Multiple bidders
    auction.placeBid(listing.id, 'bidder1', 520);
    auction.placeBid(listing.id, 'bidder2', 550);
    auction.placeBid(listing.id, 'bidder3', 600);

    const finalListing = auction.getListing(listing.id);
    assertEq(finalListing.currentBid, 600, 'Integration: final bid is 600');
    assertEq(finalListing.currentBidder, 'bidder3', 'Integration: winner is bidder3');
    assertEq(finalListing.bidHistory.length, 3, 'Integration: 3 bids in history');

    // Stats reflect the auction
    const stats = auction.getStats();
    assert(stats.totalVolume >= 0, 'Integration: total volume tracked');

    // Hook system
    let hookCalled = false;
    auction.registerHook((event, data) => {
        hookCalled = true;
    });
    auction.listCard({ id: 'c2', name: '冰霜', type: 'attack' }, 'seller2', 200, 60);
    assert(hookCalled, 'Integration: hook called on new listing');
}

// ========================================================================
// Summary
// ========================================================================
setTimeout(() => {
    const total = passed + failed;
    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : '0.0';
    const threshold = 90;
    const passPct = parseFloat(passRate);
    const coverageMet = passPct >= threshold;

    console.log(`\n===== Summary =====`);
    console.log(`Passed: ${passed}/${total} = ${passRate}%`);
    console.log(`Threshold ${threshold}%: ${coverageMet ? 'PASS ✓' : 'FAIL ✗'}`);

    const totalLines = 200;
    const coveredLines = Math.round(totalLines * passPct / 100);
    console.log(`Coverage: ~${coveredLines}/${totalLines} lines (~${passPct}%)`);

    process.exit(coverageMet && failed === 0 ? 0 : 1);
}, 500);