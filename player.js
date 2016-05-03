"use strict";

let Catan = require("./catan").Catan;

const COST = {
	[Catan.ROAD]: { [Catan.BRICK]: 1, [Catan.WOOD]: 1 },
	[Catan.TOWN]: { [Catan.BRICK]: 1, [Catan.WOOD]: 1, [Catan.GRAIN]: 1, [Catan.WOOL]: 1 },
	[Catan.CITY]: { [Catan.GRAIN]: 2, [Catan.ORE]: 3 },
	[Catan.CARD]: { [Catan.WOOL]: 1, [Catan.GRAIN]: 1, [Catan.ORE]: 1 },
};

class Player{
	constructor() {
		// pieces available for placement
		this.pieces = {
			[Catan.ROAD]: 15,
			[Catan.TOWN]: 5,
			[Catan.CITY]: 4,
		};

		// hand
		this.resources = {
			[Catan.ORE]: 0,
			[Catan.WOOD]: 0,
			[Catan.WOOL]: 0,
			[Catan.GRAIN]: 0,
			[Catan.BRICK]: 0,
		};
		this.cards = {
			[Catan.KNIGHT]: 0,
			[Catan.YEAR_OF_PLENTY]: 0,
			[Catan.MONOPOLY]: 0,
			[Catan.VICTORY_POINT]: 0,
			[Catan.ROAD_BUILDING]: 0,
		};

		this.knights = 0;
	}

	hasResources(resourceSet) {
		for (let resourceType in resourceSet) {
			if (this.resources[resourceType] < resourceSet[resourceType]) {
				return false;
			}
		}

		return true;
	}

	spendResources(resourceSet) {
		for (let resourceType in resourceSet) {
			this.resources[resourceType] -= resourceSet[resourceType];
		}
	}

	canAfford(type) {
		if (type != CATAN.Card && this.pieces[type] == 0) {
			return false;
		}

		return this.hasResources(COST[type]);
	}

	build(type) {
		this.pieces[type] -= 1;
		this.spendResources(COST[type]);
	}
};

Player.countResources = function (hand) {
	let sum = 0;
	for (let resourceType in hand) {
		sum += hand[resourceType];
	}
	return sum;
}

module.exports = Player;
