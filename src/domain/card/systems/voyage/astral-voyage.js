// ============================================================================
// Card Astral Voyage — V205 Direction A
// Astral voyage with star maps, warp routes, and cosmic navigation
// nanobot distributed mesh + thunderbolt feedback loops
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // StarMap: A star map for navigation
  // -----------------------------------------------------------------------
  function StarMap(mapId, name, stars, connections) {
    this.mapId = mapId;
    this.name = name || mapId;
    this.stars = stars || []; // [{id, name, x, y, element}]
    this.connections = connections || []; // [[starA, starB, distance], ...]
    this.visitedStars = [];
    this.totalDistance = 0;
  }

  StarMap.prototype.addStar = function (star) {
    this.stars.push(star);
    return { success: true, starCount: this.stars.length };
  };

  StarMap.prototype.addConnection = function (starA, starB, distance) {
    this.connections.push([starA, starB, distance]);
    return { success: true };
  };

  StarMap.prototype.visitStar = function (starId) {
    if (this.visitedStars.indexOf(starId) !== -1) return { error: 'already_visited' };
    if (!this._starExists(starId)) return { error: 'star_not_found' };
    this.visitedStars.push(starId);
    return { success: true, visited: this.visitedStars.length };
  };

  StarMap.prototype._starExists = function (starId) {
    return this.stars.some(function (s) { return s.id === starId; });
  };

  StarMap.prototype.getStarByName = function (name) {
    return this.stars.find(function (s) { return s.name === name; }) || null;
  };

  StarMap.prototype.getVisitedCount = function () { return this.visitedStars.length; };

  // -----------------------------------------------------------------------
  // WarpRoute: A warp route between systems
  // -----------------------------------------------------------------------
  function WarpRoute(routeId, name, origin, destination, distance, fuelCost) {
    this.routeId = routeId;
    this.name = name || routeId;
    this.origin = origin;
    this.destination = destination;
    this.distance = distance || 100;
    this.fuelCost = fuelCost || 20;
    this.danger = 1; // 1-5
    this.discovered = false;
    this.travelCount = 0;
  }

  WarpRoute.prototype.travel = function (ship) {
    if (!this.discovered) return { error: 'not_discovered' };
    if (ship.fuel < this.fuelCost) return { error: 'insufficient_fuel' };
    ship.fuel -= this.fuelCost;
    ship.x = this.destination.x || 0;
    ship.y = this.destination.y || 0;
    this.travelCount++;
    return { success: true, fuelLeft: ship.fuel, travelCount: this.travelCount };
  };

  WarpRoute.prototype.discover = function () {
    if (this.discovered) return { error: 'already_discovered' };
    this.discovered = true;
    return { success: true };
  };

  // --------------------------------------------------------------------===
  // SpaceShip: A ship for astral voyages
  // --------------------------------------------------------------------===
  function SpaceShip(shipId, name, hull, speed, fuel) {
    this.shipId = shipId;
    this.name = name || shipId;
    this.hull = hull || 100;
    this.maxHull = hull || 100;
    this.speed = speed || 1;
    this.fuel = fuel || 100;
    this.maxFuel = fuel || 100;
    this.x = 0;
    this.y = 0;
    this.missions = 0;
  }

  SpaceShip.prototype.refuel = function (amount) {
    var added = Math.min(this.maxFuel - this.fuel, amount);
    this.fuel += added;
    return { success: true, fuel: this.fuel, added: added };
  };

  SpaceShip.prototype.repair = function (amount) {
    this.hull = Math.min(this.maxHull, this.hull + amount);
    return { success: true, hull: this.hull };
  };

  SpaceShip.prototype.takeDamage = function (amount) {
    this.hull = Math.max(0, this.hull - amount);
    return { damaged: true, hull: this.hull };
  };

  SpaceShip.prototype.getFuelPercent = function () {
    return this.maxFuel > 0 ? (this.fuel / this.maxFuel * 100) : 0;
  };

  // --------------------------------------------------------------------===
  // AstralNavigator: Navigation controller
  // --------------------------------------------------------------------===
  function AstralNavigator(navId, name) {
    this.navId = navId || ('nav_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Navigator';
    this.ships = {};
    this.routes = {};
    this.maps = {};
    this.shipCounter = 0;
    this.routeCounter = 0;
  }

  AstralNavigator.prototype.addShip = function (ship) {
    this.ships[ship.shipId] = ship;
    return { success: true, count: Object.keys(this.ships).length };
  };

  AstralNavigator.prototype.addRoute = function (route) {
    this.routes[route.routeId] = route;
    return { success: true, count: Object.keys(this.routes).length };
  };

  AstralNavigator.prototype.addMap = function (map) {
    this.maps[map.mapId] = map;
    return { success: true, count: Object.keys(this.maps).length };
  };

  AstralNavigator.prototype.getShip = function (id) { return this.ships[id] || null; };
  AstralNavigator.prototype.getRoute = function (id) { return this.routes[id] || null; };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.StarMap = StarMap;
  window.WarpRoute = WarpRoute;
  window.SpaceShip = SpaceShip;
  window.AstralNavigator = AstralNavigator;
})();