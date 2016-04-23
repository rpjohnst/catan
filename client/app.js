"use strict";

let Catan = require("../catan.js");

let currentState;
let run = function (state) {
	currentState = state;
	(function update(time) {
		requestAnimationFrame(update);
		currentState.draw();
	})(performance.now());
};

const tileColors = [ "#f4a460", "#666666", "#003200", "#006400", "#ffff00", "#660000", "#0000ff" ];
const playerColors = ["#ff0000", "#ffffff", "#0000ff", "#00ff00"];

const server = "ws://localhost:8081";
class Lobby {
	constructor(ctx) {
		this.ctx = ctx;

		this.assets = {
			hexagon: new Image(), hexagons: [],
			town: new Image(), city: new Image(), towns: [], cities: [],
			pawn: new Image(),
		};
		this.assets.hexagon.addEventListener("load", () => {
			tileColors.forEach((color, i) => {
				this.assets.hexagons[i] = blend(this.assets.hexagon, color);
			});
		});
		this.assets.town.addEventListener("load", () => {
			playerColors.forEach((color, i) => {
				this.assets.towns[i] = blend(this.assets.town, color);
			});
		});
		this.assets.city.addEventListener("load", () => {
			playerColors.forEach((color, i) => {
				this.assets.cities[i] = blend(this.assets.city, color);
			});
		});

		function blend(image, color) {
			let blendCanvas = document.createElement("canvas");
			let blendCtx = blendCanvas.getContext("2d");

			blendCanvas.width = image.width;
			blendCanvas.height = image.height;

			blendCtx.fillStyle = color;
			blendCtx.fillRect(0, 0, blendCanvas.width, blendCanvas.height);

			blendCtx.globalCompositeOperation = "multiply";
			blendCtx.drawImage(image, 0, 0);

			blendCtx.globalCompositeOperation = "destination-atop";
			blendCtx.drawImage(image, 0, 0);

			return blendCanvas;
		}

		for (let asset in this.assets) {
			this.assets[asset].src = "assets/" + asset + ".png";
		}

		this.ws = new WebSocket(server);
		this.ws.onmessage = (event) => {
			console.log(event.data);

			let message = JSON.parse(event.data);
			switch (message.message) {
			case "start":
				this.board = new Catan(message.board);
				this.player = message.player;
				break;

			case "turn":
				this.turn = message.player;
				currentState = new Play(
					this.ctx, this.assets, this.ws,
					this.board, this.player, this.turn
				);
				break;

			case "end":
				currentState = new Lobby(ctx);
				break;
			}
		};
	}

	draw() {
		let ctx = this.ctx, width = ctx.canvas.clientWidth, height = ctx.canvas.clientHeight;

		ctx.fillStyle = "#000";
		ctx.fillRect(0, 0, width, height);

		ctx.font = "48px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = "#fff";
		ctx.fillText("Loading...", width / 2, height / 2);
	}
}

class Play {
	constructor(ctx, assets, ws, board, player, turn) {
		this.ctx = ctx;
		this.assets = assets;
		this.ws = ws;
		this.board = board;
		this.player = player;
		this.turn = turn;

		this.mouseX = 0;
		this.mouseY = 0;

		this.ws.onmessage = (event) => {
			console.log(event.data);

			let message = JSON.parse(event.data);
			switch (message.message) {
			case "turn":
				this.turn = message.player;
				break;

			case "buildTown":
				this.board.addTown(message.x, message.y, message.d, message.player);
				break;
      
      case "diceRoll":
        var dice = message.value;
        break;
      
      case "info":
        var ids = ["victoryPoints", "wood", "brick", "ore", "wool", "grain", "cities", "towns", "roads", "develop", "knights"];
        for(var i=0; i< ids.length; i++)
        {
          var id = ids[i];
          var value = message[id];
          var docel = $("#" + id);
          if(docel)
            docel.html(value);
        }
        
        break;
        
			case "end":
				currentState = new Lobby(ctx);
				break;
			}
		};
	}

	draw() {
		let ctx = this.ctx, width = ctx.canvas.clientWidth, height = ctx.canvas.clientHeight;

		let radius = 35,
			hexagon_narrow_width = 3 / 2 * radius,
			hexagon_height = 2 * radius * Math.sin(Math.PI / 3);

		let tileToPixels = function (x, y) {
			let xx = x - 3, yy = y - 3;
			return [
				width / 2 + hexagon_narrow_width * xx,
				height / 2 - hexagon_height * (xx / 2 + yy)
			];
		};

		let vertexToPixels = function (x, y, d) {
			let [px, py] = tileToPixels(x, y);
			if (d == 0) { px -= radius; }
			else if (d == 1) { px += radius; }
			return [px, py];
		};

		let pixelsToTile = function (px, py) {
			// convert to fractional cube coordinates
			let x = (px - width / 2) / hexagon_narrow_width,
				y = (height / 2 - py) / hexagon_height - x / 2,
				z = -(x + y);

			// round to nearest cube and calculate the difference
			let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
			let dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);

			// whichever coordinate moved farthest, push it back into the hex grid plane
			if (dx > dy && dx > dz) {
				rx = -(ry + rz);
			} else if (dy > dz) {
				ry = -(rx + rz);
			} else {
				rz = -(rx + ry);
			}

			return [rx + 3, ry + 3];
		};

		let pixelsToVertex = function (px, py) {
			let [x, y] = pixelsToTile(px, py);
			let [cx, cy] = tileToPixels(x, y);
			let angle = Math.atan2(cy - py, px - cx);
			let hextant = (Math.floor((angle + Math.PI / 6) / 2 / Math.PI * 6) + 6) % 6;

			switch (hextant) {
			case 0: return [x, y, 1];
			case 1: return [x + 1, y, 0];
			case 2: return [x - 1, y + 1, 1];
			case 3: return [x, y, 0];
			case 4: return [x - 1, y, 1];
			case 5: return [x + 1, y - 1, 0];
			}
		};

		let pixelsToEdge = function (px, py) {
			let [x, y] = pixelsToTile(px, py);
			let [cx, cy] = tileToPixels(x, y);
			let angle = Math.atan2(cy - py, px - cx);
			let hextant = (Math.floor(angle / 2 / Math.PI * 6) + 6) % 6;

			switch (hextant) {
			case 0: return [x, y, 2];
			case 1: return [x, y, 1];
			case 2: return [x, y, 0];
			case 3: return [x - 1, y, 2];
			case 4: return [x, y - 1, 1];
			case 5: return [x + 1, y - 1, 0];
			}
		};

		ctx.fillStyle = "#000";
		ctx.fillRect(0, 0, width, height);

		ctx.font = "14px sans-serif";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillStyle = "#fff";
		ctx.fillText("You are player " + this.player + " and it is player " + this.turn + "'s turn", 0, 0);

		let [mx, my] = pixelsToTile(this.mouseX, this.mouseY);
		ctx.fillText("Mouse cursor on tile (" + mx + "," + my + ")", 0, 16);

		let [mvx, mvy, mvd] = pixelsToVertex(this.mouseX, this.mouseY);
		ctx.fillText("Mouse cursor near vertex (" + mvx + "," + mvy + "," + ["L", "R"][mvd] + ")", 0, 32);

		let [mex, mey, med] = pixelsToEdge(this.mouseX, this.mouseY);
		ctx.fillText("Mouse cursor near edge (" + mex + "," + mey + "," + ["W", "N", "E"][med] + ")", 0, 48);

		// draw tiles, roads, and buildings
		let cx = 3, cy = 3, N = 3;

		forEachTile(cx, cy, N, (x, y) => {
			let [px, py] = tileToPixels(x, y);

			let image = this.assets.hexagons[this.board.tiles[y][x]] || this.assets.hexagon;
			let width = radius * 2 - 5, height = radius * 2 - 10;
			ctx.drawImage(image, px - width / 2, py - height / 2, width, height);
		});

		forEachTile(cx, cy, N, (x, y) => {
			for (let d = 0; d < 3; d++) {
				let road = this.board.roads[y][x][d];
				if (road == null) { continue; }

				let [[x1, y1, d1], [x2, y2, d2]] = this.board.endpointVertices(x, y, d);
				let [px1, py1] = vertexToPixels(x1, y1, d1);
				let [px2, py2] = vertexToPixels(x2, y2, d2);

				ctx.strokeStyle = playerColors[road];
				ctx.lineWidth = 4;
				ctx.beginPath();
				ctx.moveTo(px1, py1);
				ctx.lineTo(px2, py2);
				ctx.stroke();
			}
		});

		forEachTile(cx, cy, N, (x, y) => {
			for (let d = 0; d < 2; d++) {
				let building = this.board.buildings[y][x][d];
				if (building == null) { continue; }

				let [px, py] = vertexToPixels(x, y, d);

				let image = this.assets.towns[building];
				ctx.drawImage(image, px - image.width / 2, py - image.height / 2);
			}
		});

		function forEachTile(cx, cy, radius, callback) {
			for (let dx = -N; dx <= N; dx++) {
				for (let dy = Math.max(-N, -dx - N); dy <= Math.min(N, -dx + N); dy++) {
					let x = cx + dx, y = cy + dy;
					callback(x, y);
				}
			}
		}

		// draw theif
		{
			let image = this.assets.pawn;
			let [px, py] = tileToPixels(this.board.theif[0], this.board.theif[1]);
			ctx.drawImage(image, px - image.width / 2, py - image.height / 2);
		}

		// draw numbers
		this.board.hit.forEach((hit, i) => {
			if (hit == null || i == 0) { return; }

			ctx.font = "16px sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillStyle = "0xfff";
			for (let [x, y] of hit) {
				let [px, py] = tileToPixels(x, y);

				ctx.fillText(i, px, py - 10);
				ctx.fillText(getPips(i), px, py+ 10);
			}

			function getPips(i) {
				switch (i) {
				case 2: case 12: return "•";
				case 3: case 11: return "••";
				case 4: case 10: return "•••";
				case 5: case 9: return "••••";
				case 6: case 8: return "•••••";
				}
			}
		});
	}

	buildTown(x, y, d) {
		this.ws.send(JSON.stringify({ message: "buildTown", x: x, y: y, d: d }));
	}

	endTurn() {
		this.ws.send(JSON.stringify({ message: "turn" }));
	}
}

let catan = new Catan();

let canvas = document.createElement("canvas");
canvas.width = 525;
canvas.height = 525;
document.body.appendChild(canvas);

canvas.addEventListener("mousemove", function (event) {
	let rect = canvas.getBoundingClientRect();
	currentState.mouseX = event.clientX - rect.left;
	currentState.mouseY = event.clientY - rect.top;
});

// TODO: replace this with proper turn handling in the state class
let form = document.forms.coordinates;

form.buildTown.addEventListener("click", function (event) {
	currentState.buildTown(+form.x.value, +form.y.value, +form.d.value);
	event.preventDefault();
});

form.endTurn.addEventListener("click", function (event) {
	currentState.endTurn();
	event.preventDefault();
});

let ctx = canvas.getContext("2d");
run(new Lobby(ctx));
