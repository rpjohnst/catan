"use strict";

const NONE = 0,
	ORE = 1,
	WOOD = 2,
	WOOL = 3,
	GRAIN = 4,
	BRICK = 5,
	OCEAN = 6;

const KNIGHT = 0,
	YEAR_OF_PLENTY = 1,
	MONOPOLY = 2,
	VICTORY_POINT = 3,
	ROAD_BUILDING = 4;

const TILE_POOL = Array.prototype.concat(
	repeat(NONE, 1),
	repeat(ORE, 3),
	repeat(BRICK, 3),
	repeat(WOOD, 4),
	repeat(GRAIN, 4),
	repeat(WOOL, 4)
);

const CHIT_POOL = [ 5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11 ];

class Catan {
	constructor(board) {
		// if we're deserializing a board, just read the data and stop
		if (board) {
			Object.assign(this, board);
			return;
		}

		// create board structure
		this.tiles = [];
		this.buildings = [];
		this.roads = [];
		for (let y = 0; y < 7; y++) {
			this.tiles[y] = repeat(null, 7);
			this.buildings[y] = [];
			this.roads[y] = [];

			for (let x = 0; x < 7; x++) {
				this.buildings[y][x] = repeat(null, 2);
				this.roads[y][x] = repeat(null, 3);
			}
		}

		this.hit = [];

		const cx = 3, cy = 3, N = 2;
		const directions = [[0, 1], [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1]];

		// randomize the game
		let tilePool = shuffle(TILE_POOL.slice());
		let chitPool = rotate(CHIT_POOL.slice(), Math.random() * CHIT_POOL.length);
		let addTile = (x, y) => {
			let terrain = tilePool.pop();
			this.tiles[y][x] = terrain;

			let chit = terrain == NONE ? 0 : chitPool.pop();
			if (!this.hit[chit]) { this.hit[chit] = []; }
			this.hit[chit].push([x, y]);

			if (terrain == NONE) { this.theif = [x, y]; }
		}

		// add ground tiles
		addTile(cx, cy);
		for (let radius = 1; radius <= N; radius++) {
			ring(cx, cy, radius, addTile);
		}

		// add ocean tiles
		ring(cx, cy, N + 1, (x, y) => {
			this.tiles[y][x] = OCEAN;
		});

		function ring(cx, cy, radius, callback) {
			let tx = cx + directions[4][0] * radius, ty = cy + directions[4][1] * radius;
			for (let side = 0; side < 6; side++) {
				let [dx, dy] = directions[side];
				for (let tile = 0; tile < radius; tile++) {
					callback(tx, ty);
					tx += dx;
					ty += dy;
				}
			}
		}

		// TODO: remove hard-coded initial board state
		this.addTown(3, 3, 0, 0);
		this.addRoad(3, 3, 0, 0);
		this.addTown(3, 2, 1, 0);
		this.addRoad(4, 1, 1, 0);
		this.addTown(3, 5, 1, 1);
		this.addRoad(4, 4, 0, 1);
		this.addTown(2, 3, 0, 1);
		this.addRoad(1, 3, 2, 1);
		this.addTown(5, 3, 0, 2);
		this.addRoad(4, 3, 2, 2);
		this.addTown(1, 5, 1, 2);
		this.addRoad(2, 4, 0, 2);
		this.addTown(2, 2, 1, 3);
		this.addRoad(3, 1, 0, 3);
		this.addTown(1, 2, 1, 3);
		this.addRoad(1, 2, 2, 3);
	}

	// a vertex is specified as a tile and either left or right (0/1)
	addTown(x, y, d, player) {
		// a town must be placed on an empty vertex not adjacent to any other towns
		if (this.buildings[y][x][d] != null) { return false; }
		for (let [ax, ay, ad] of this.adjacentVertices(x, y, d)) {
			if (this.buildings[ay][ax][ad] != null) { return false; }
		}

		this.buildings[y][x][d] = player;
		return true;
	}

	// an edge is specified as a tile and either west, north, or east (0/1/2)
	addRoad(x, y, d, player, pregame) {
		// a road must be placed on an empty edge next to a road or settlement of the same player
		// during pregame, a road must be next to a settlement of the same player
		if (this.roads[y][x][d] != null) { return false; }
		let valid = false;
		for (let [ex, ey, ed] of this.endpointVertices(x, y, d)) {
			if (this.buildings[ey][ex][ed] == player) { valid = true; }
			else if (!pregame) {
				for (let [px, py, pd] of this.protrudeEdges(ex, ey, ed)) {
					if (this.roads[px][py][pd] == player) { valid = true; }
				}
			}
		}
		if (!valid) { return false; }

		this.roads[y][x][d] = player;
		return true;
	}

	// adjacent vertices of a vertex
	adjacentVertices(x, y, d) {
		if (d == 0) { return [[x - 1, y + 1, 1], [x - 1, y, 1], [x - 2, y + 1, 1]]; }
		else if (d == 1) { return [[x + 2, y - 1, 0], [x + 1, y - 1, 0], [x + 1, y, 0]]; }
	}

	// endpoint vertices of an edge
	endpointVertices(x, y, d) {
		if (d == 0) { return [[x - 1, y + 1, 1], [x, y, 0]]; }
		else if (d == 1) { return [[x + 1, y, 0], [x - 1, y + 1, 1]]; }
		else if (d == 2) { return [[x, y, 1], [x + 1, y, 0]]; }
	}

	// protruding edges from a vertex
	protrudeEdges(x, y, d) {
		if (d == 0) { return [[x, y, 0], [x - 1, y, 2], [x - 1, y, 1]]; }
		else if (d == 1) { return [[x + 1, y - 1, 1], [x + 1, y - 1, 0], [x, y, 2]]; }
	}
};

function repeat(element, times) {
	let array = [];
	for (let i = 0; i < times; i++) {
		array.push(element);
	}
	return array;
}

// via http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
	for (let i = array.length; i > 0; i--) {
		let j = Math.floor(Math.random() * i);
		let tmp = array[i - 1];
		array[i - 1] = array[j];
		array[j] = tmp;
	}
	return array;
}

function rotate(array, count) {
	array.unshift.apply(array, array.splice(count));
	return array;
}

module.exports = Catan;
