"use strict";

let Catan = require("../catan").Catan,
	Player = require("../player"),
	Hex = require("./hex"),
	ResourceSprite;

let currentState;
let run = function (state) {
	currentState = state;
	(function update(time) {
		requestAnimationFrame(update);
		currentState.draw();
	})(performance.now());
};

const tileColors = ["#f4a460", "#666666", "#003200", "#006400", "#ffff00", "#660000", "#0000ff"];
const playerColors = ["#ff0000", "#00bcff", "#ffbc00", "#008000"];

const server = "ws://" + window.location.hostname + ":8081";

class DevelopmentCard {
	constructor(x, y, type, assets, ctx){
		switch(type){
			case Catan.KNIGHT:					this.image = assets.placeholder; break;
			case Catan.MONOPOLY:				this.image = assets.placeholder; break;
			case Catan.YEAR_OF_PLENTY:	this.image = assets.placeholder; break;
			case Catan.VICTORY_POINT: 	this.image = assets.placeholder; break;
			case Catan.ROAD_BUILDING: 	this.image = assets.placeholder; break;
		}
		this.x = x;
		this.y = y;
		this.ctx = ctx;
		this.scale = 0.33;
		this.type = type;
	}

	inCard(x, y) { return x >= this.x && x <= this.x + this.image.width * this.scale && y >= this.y && y <= this.y + this.image.height * this.scale; }

	draw(){
		this.ctx.drawImage(this.image, this.x, this.y, this.image.width * this.scale, this.image.height * this.scale);
		//ctx.drawImage(this.image, this.x - this.image.width * this.scale / 2, this.y - this.image.height * this.scale / 2, 
									//this.image.width * this.scale, this.image.height * this.scale);
	}
}

class Lobby {
	constructor(ctx) {
		this.ctx = ctx;

		this.assets = {
			hexagon: new Image(), hexagons: [],
			town: new Image(), city: new Image(), towns: [], cities: [],
			pawn: new Image(),
			ore_sm: new Image(),
			logs_sm: new Image(),
			grain_sm: new Image(),
			wool_sm: new Image(),
			bricks_sm: new Image(),
			placeholder: new Image(),
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
		ctx.fillText("Waiting for players...", width / 2, height / 2);
	}
}

class Play {
	constructor(ctx, assets, ws, board, player, turn) {
		this.ctx = ctx;
		this.assets = assets;
		this.ws = ws;

		this.board = board;
		this.hand = new Player();
		this.player = player;
		this.turn = turn;

		this.pregame = true;
		this.lastTown = [];

		this.sprites = [];

		this.tradingOffers = [];
		this.tradingOngoing = false;

		this.robber = this.board.robber;

		this.mouse = [0, 0];
		this.tile = [0, 0];
		this.vertex = [0, 0, 0];
		this.edge = [0, 0, 0];

		// Create dev card sprite array
		this.devCardSprites = [];
		for (let card in this.hand.cards) {
			card = +card;
			let cardSprite = new DevelopmentCard(0, 300, card, this.assets, ctx);
			cardSprite.x = canvas.width / 2 + card * (cardSprite.image.width * cardSprite.scale + 10);
			this.devCardSprites[card] = cardSprite;
		}

		this.ws.onmessage = (event) => {
			console.log(event.data);

			let message = JSON.parse(event.data);
			switch (message.message) {
			// main play messages

			case "turn":
				this.turn = message.player;
				this.dice = message.dice;				
				if (message.start) {
					this.pregame = false;
					this.lastTown = [];
				}

				if (!this.dice) { break; }
				if (this.dice == 7) {
					if (this.player == message.player) { this.action = "moveRobber"; }

					let total = Player.countResources(this.hand.resources);
					if (total > 7) { showDiscardModal(Math.floor(total / 2)); }
				}

				for (let [hx, hy] of this.board.hit[this.dice]) {
					let resource = this.board.tiles[hy][hx];
					let [tpx, tpy] = Hex.tileToPixels(hx, hy);
					for (let [cx, cy, cd] of this.board.cornerVertices(hx, hy)) {
						if (!this.board.buildings[cy][cx][cd]) { continue; }

						let [vpx, vpy] = Hex.vertexToPixels(cx, cy, cd);
						this.sprites.push(new ResourceSprite(resource, [tpx, tpy], [vpx, vpy]));
					}
				}
				break;

			case "resources":
				this.hand.resources = message.resources;
				this.hand.pieces = message.pieces;
				this.hand.cards = message.cards;
				break;

			case "build":
				if (this.pregame && message.type == Catan.TOWN) {
					this.lastTown[message.player] = { x: message.x, y: message.y, d: message.d };
				}

				if (this.pendingCity) { delete this.pendingCity; }
				this.board.build(
					message.type, message.x, message.y, message.d, message.player,
					this.pregame, this.lastTown[message.player]
				);
				break;

			case "chat":
				let name = document.createTextNode("Player " + message.sender + ": ");
				let content = document.createTextNode(message.text);

				let nameSpan = document.createElement("span");
				nameSpan.style.color = playerColors[message.sender];
				nameSpan.appendChild(name);

				let msgP = document.createElement("p");
				msgP.appendChild(nameSpan);
				msgP.appendChild(content);

				let chatBox = document.getElementById("chat-contents");
				chatBox.appendChild(msgP);
				chatBox.scrollTop = chatBox.scrollHeight;
				break;

			case "end":
				currentState = new Lobby(ctx);
				break;

			// trading messages

			case "offer":
				this.tradingOngoing = true;
				this.tradingOffers[message.player] = message.offer;
				break;

			case "confirm":
				this.tradingOngoing = false;
				this.tradingOffers = [];
				break;

			// robber messages

			case "discard":
				document.getElementById("discard-modal").style.display = "none";
				break;

			case "robber":
				this.board.robber = [message.x, message.y];
				if (this.action == "steal") { delete this.action; }
				break;

			case "error":
				if (message.error == "robber" && this.action == "steal") {
					this.action = "moveRobber";
				}
				break;
			}
		};
	}

	draw() {
		let ctx = this.ctx, width = ctx.canvas.clientWidth, height = ctx.canvas.clientHeight;

		ctx.fillStyle = "#000";
		ctx.fillRect(0, 0, width, height);

		ctx.font = "14px sans-serif";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillStyle = "#fff";
		ctx.fillText("You are player " + this.player + " and it is player " + this.turn + "'s turn", 0, 0);

		let [mx, my] = this.tile, [mvx, mvy, mvd] = this.vertex, [mex, mey, med] = this.edge;
		ctx.fillText("Mouse cursor on tile (" + mx + "," + my + ")", 0, 16);
		ctx.fillText("Mouse cursor near vertex (" + mvx + "," + mvy + "," + ["L", "R"][mvd] + ")", 0, 32);
		ctx.fillText("Mouse cursor near edge (" + mex + "," + mey + "," + ["W", "N", "E"][med] + ")", 0, 48);

		let cx = 3, cy = 3, N = 3;

		// draw tiles
		this.board.forEachTile(cx, cy, N, (x, y) => {
			let [px, py] = Hex.tileToPixels(x, y);

			let image = this.assets.hexagons[this.board.tiles[y][x]] || this.assets.hexagon;
			let width = 2 * Hex.radius - 5, height = 2 * Hex.radius * Math.sin(Math.PI / 3) - 5;
			ctx.drawImage(image, px - width / 2, py - height / 2, width, height);
		});

		// draw roads
		this.board.forEachTile(cx, cy, N, (x, y) => {
			for (let d = 0; d < 3; d++) {
				let road = this.board.roads[y][x][d];
				if (road == null) { continue; }

				drawRoad(playerColors[road], x, y, d);
			}
		});

		if (
			this.action == "buildRoad" &&
			this.board.validRoad(mex, mey, med, this.player, this.pregame, this.lastTown[this.player])
		) {
			ctx.globalAlpha = 0.5;
			drawRoad(playerColors[this.player], mex, mey, med);
			ctx.globalAlpha = 1.0;
		}

		function drawRoad(color, x, y, d) {
			let [[x1, y1, d1], [x2, y2, d2]] = currentState.board.endpointVertices(x, y, d);
			let [px1, py1] = Hex.vertexToPixels(x1, y1, d1);
			let [px2, py2] = Hex.vertexToPixels(x2, y2, d2);

			ctx.strokeStyle = color;
			ctx.lineWidth = 4;
			ctx.beginPath();
			ctx.moveTo(px1, py1);
			ctx.lineTo(px2, py2);
			ctx.stroke();
		}

		// draw buildings
		this.board.forEachTile(cx, cy, N, (x, y) => {
			for (let d = 0; d < 2; d++) {
				let building = this.board.buildings[y][x][d];
				if (!building) { continue; }

				// don't draw a town if the player is hovering a city over it
				if (
					this.action == "buildCity" && x == mvx && y == mvy && d == mvd &&
					this.board.validCity(x, y, d)
				) { continue; }

				let image;
				switch (building.type) {
				case Catan.TOWN: image = this.assets.towns[building.player]; break;
				case Catan.CITY: image = this.assets.cities[building.player]; break;
				}

				// draw a city if the client is waiting for the server to upgrade it
				let pending = this.pendingCity;
				if (pending && pending.x == x && pending.y == y && pending.d == d) {
					image = this.assets.cities[building.player];
				}

				drawBuilding(image, x, y, d);
			}
		});

		if (this.action == "buildTown" && this.board.validTown(mvx, mvy, mvd)) {
			ctx.globalAlpha = 0.5;
			drawBuilding(this.assets.towns[this.player], mvx, mvy, mvd);
			ctx.globalAlpha = 1.0;
		}

		if (this.action == "buildCity" && this.board.validCity(mvx, mvy, mvd)) {
			ctx.globalAlpha = 0.5;
			drawBuilding(this.assets.cities[this.player], mvx, mvy, mvd);
			ctx.globalAlpha = 1.0;
		}

		function drawBuilding(image, x, y, d) {
			let [px, py] = Hex.vertexToPixels(x, y, d);
			ctx.drawImage(image, px - image.width / 2, py - image.height / 2);
		}
		// Store vertex and edge coordinates in current state (should decouple from rendering?)
		currentState.lvx = mvx; currentState.lvy = mvy; currentState.lvd = mvd;
		currentState.lex = mex; currentState.ley = mey; currentState.led = med;
		currentState.lmx = mx; currentState.lmy = my;

		// draw numbers
		this.board.hit.forEach((hit, i) => {
			if (hit == null || i == 0) { return; }

			ctx.font = "16px sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillStyle = "0xfff";
			for (let [x, y] of hit) {
				let [px, py] = Hex.tileToPixels(x, y);

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

		// draw resource icons
		for (let i = this.sprites.length - 1; i >= 0; i--) {
			let sprite = this.sprites[i];
			if (sprite.move()) { this.sprites.splice(i, 1); }

			let image;
			switch (sprite.type) {
			case Catan.ORE: image = this.assets.ore_sm; break;
			case Catan.WOOD: image = this.assets.logs_sm; break;
			case Catan.WOOL: image = this.assets.wool_sm; break;
			case Catan.GRAIN: image = this.assets.grain_sm; break;
			case Catan.BRICK: image = this.assets.bricks_sm; break;
			}

			let [x, y] = sprite.pos, scale = sprite.scale;
			ctx.drawImage(
				image,
				x - scale * image.width / 2, y - scale * image.height / 2,
				scale * image.width, scale * image.height
			);
		}

		// draw robber
		if (this.action != "moveRobber") {
			let [rx, ry] = this.action == "steal" ? this.robber : this.board.robber;
			drawRobber(this.assets.pawn, rx, ry);
		} else if (this.board.isGround(mx, my)) {
			ctx.globalAlpha = 0.5;
			drawRobber(this.assets.pawn, mx, my);
			ctx.globalAlpha = 1.0;
		}

		function drawRobber(image, x, y) {
			let [px, py] = Hex.tileToPixels(x, y);
			ctx.drawImage(image, px - image.width / 2, py - image.height / 2);
		}

		// draw info
		{
			ctx.font = "14px sans-serif";
			ctx.textAlign = "left";
			ctx.textBaseline = "top";
			ctx.fillStyle = "#fff";

			for (let piece in this.hand.pieces) {
				let y = piece * 16;
				ctx.fillText(Play.pieceNames[piece], width / 2 + 40 + 0, y);
				ctx.fillText(this.hand.pieces[piece], width / 2 + 40 + 50, y);
			}

			for (let resource in this.hand.resources) {
				let y = -16 + resource * 16;
				ctx.fillText(Play.resourceNames[resource], width / 2 + 40 + 90, y);
				ctx.fillText(this.hand.resources[resource], width / 2 + 40 + 140, y);
			}

			let oldTextAlign = ctx.textAlign;
			ctx.textAlign = "center";
			for (let card in this.hand.cards) {
				if (this.hand.cards[card] > 0) {
					let curCard = this.devCardSprites[card];
					curCard.draw();
					let x = curCard.x + curCard.image.width * curCard.scale / 2;
					let y = curCard.y + curCard.image.height * curCard.scale + 10;
					ctx.fillText("x" + this.hand.cards[card], x, y);
				}
			}
			ctx.textAlign = oldTextAlign;

			if (this.tradingOngoing) {
				ctx.fillText("Offers:", width / 2 + 40, 100);

				let j = 0;
				for (let i = 0; i < 4; i++) {
					let tx, ty;
					if (i == this.turn) {
						[tx, ty] = [width / 2 + 40, 132];
					} else {
						[tx, ty] = [width / 2 + 40 + 120 * j, 132 + 16 * 7];
						j++;
					}

					ctx.fillText("Player " + i + ":", tx, ty);
					let offerText = [];
					let offer = this.tradingOffers[i];
					for (let kind in offer) {
						if (!offer[kind]) { continue; }
						offerText.push(offer[kind] + " " + Play.resourceNames[kind]);
					}
					offerText.forEach((text, row) => ctx.fillText(text, tx, ty + 16 * (row + 1)));
				}
			}
		}
	}

	click() {
		let [tx, ty] = this.tile;
		let [vx, vy, vd] = this.vertex;
		let [ex, ey, ed] = this.edge;

		if (this.action == "moveRobber") {
			currentState.steal(tx, ty);
			return;
		}

		let type, x, y, d;
		switch (this.action) {
			default: return;

			case "buildRoad": sendBuild(this.ws, Catan.ROAD, ex, ey, ed); break;
			case "buildTown": sendBuild(this.ws, Catan.TOWN, vx, vy, vd); break;
			case "buildCity": sendBuild(this.ws, Catan.CITY, vx, vy, vd); break;
		}

		if (this.action == "buildCity") {
			this.pendingCity = { x: vx, y: vy, d: vd };
		}

		restoreDefaultButtons();
		delete this.action;

		function sendBuild(ws, type, x, y, d) {
			ws.send(JSON.stringify({ message: "build", type: type, x: x, y: y, d: d }));
		}
	}

	buyDevelop() {
		this.ws.send(JSON.stringify({ message: "buyDevelop" }));
	}

	offer(offer) {
		this.ws.send(JSON.stringify({ message: "offer", offer: offer }));
	}

	confirm(player) {
		this.ws.send(JSON.stringify({ message: "confirm", player: player }));
	}

	cancel() {
		this.ws.send(JSON.stringify({ message: "cancel" }));
	}

	steal(x, y) {
		this.robber = [x, y];
		this.action = "steal";

		let targets = this.board.robberTargets(x, y, this.player);

		// if there is no one to steal from, assume stealing has already been completed.
		if (targets.length == 0) {
			this.ws.send(JSON.stringify({ message: "robber", x: x, y: y }));
		}

		// add UI element to select player with event to send steal message
		let buttons = [];
		for (let target of targets) {
			let button = document.createElement("button");

			buttons.push(button);
			document.forms.trading.appendChild(button);

			button.innerHTML = "Steal From Player " + target;
			button.addEventListener("click", (event) => {
				event.preventDefault();

				this.ws.send(JSON.stringify({ message: "robber", x: x, y: y, player: target }));
				buttons.forEach((button) => document.forms.trading.removeChild(button));
			});
		}
	}

	endTurn() {
		this.ws.send(JSON.stringify({ message: "turn" }));
	}
	
	playRoadBuilding(){
		this.ws.send(JSON.stringify({ message: "develop", card:Catan.ROAD_BUILDING }));
	}
	
	playYearOfPlenty(){
		// Prompt for resources
		showYopModal();
	}
	
	playKnight(){
		console.log("K");
		//this.ws.send(JSON.stringify({ message: "develop", card:Catan.KNIGHT}));
	}
	
	playMonopoly(){		
		showMonopolyModal();
	}
}

Play.resourceNames = {
	[Catan.ORE]: "ore",
	[Catan.WOOD]: "wood",
	[Catan.WOOL]: "wool",
	[Catan.GRAIN]: "grain",
	[Catan.BRICK]: "brick",
};

Play.pieceNames = {
	[Catan.ROAD]: "roads",
	[Catan.TOWN]: "towns",
	[Catan.CITY]: "cities",
};

Play.cardNames = {
	[Catan.KNIGHT]: "knights",
	[Catan.YEAR_OF_PLENTY]: "year of plenty",
	[Catan.MONOPOLY]: "monopoly",
	[Catan.VICTORY_POINT]: "victory points",
	[Catan.ROAD_BUILDING]: "road building",
};

ResourceSprite = class {
	constructor(type, start, end) {
		this.type = type;
		this.start = start;
		this.end = end;

		this.count = 0;
	}

	move() {
		let t = this.count / 120;
		this.count += 1;

		this.scale = lerp(0.5, 1, 3 * t);
		this.pos = lerp2(this.start, this.end, 1.2 * t - 0.2);

		return t > 1;

		function lerp(a, b, t) {
			t = Math.min(Math.max(0, t), 1);
			return (1 - t) * a + t * b;
		}
		function lerp2([ax, ay], [bx, by], t) { return [lerp(ax, bx, t), lerp(ay, by, t)]; }
	}
};

let canvas = document.getElementById("canvas");
canvas.width = Hex.width;
canvas.height = Hex.height;

// board

canvas.addEventListener("mousemove", function (event) {
	let rect = canvas.getBoundingClientRect();
	let mouseX = currentState.mouseX = event.clientX - rect.left;
	let mouseY = currentState.mouseY = event.clientY - rect.top;

	currentState.tile = Hex.pixelsToTile(mouseX, mouseY);
	currentState.vertex = Hex.pixelsToVertex(mouseX, mouseY);
	currentState.edge = Hex.pixelsToEdge(mouseX, mouseY);
});

canvas.addEventListener("click", function (event) {
	event.preventDefault();
	
	// If there is no pending state, they are free to build a card
	if (!currentState.action) {

		for (let card in currentState.hand.cards) {
			if (currentState.hand.cards[card] > 0) {
				let curCard = currentState.devCardSprites[card];
				if(curCard.inCard(currentState.mouseX, currentState.mouseY)){
					switch(curCard.type){
						case Catan.KNIGHT:					currentState.playKnight(); 				break;
						case Catan.YEAR_OF_PLENTY: 	currentState.playYearOfPlenty(); 	break;
						case Catan.MONOPOLY: 				currentState.playMonopoly(); 			break;						
						case Catan.ROAD_BUILDING: 	currentState.playRoadBuilding(); 	break;
					}
				}
			}
		}
			
		return; 
	}

	currentState.click();
});

// building
{
	let form = document.forms.building;

	let modalActions = ["moveRobber", "steal"];

	["buildRoad", "buildTown", "buildCity"].forEach(function (id, _, ids) {
		form[id].addEventListener("click", function (event) {
			event.preventDefault();
			if (modalActions.indexOf(currentState.action) > -1) { return; }

			if (currentState.action == id) {
				restoreDefaultButtons();
				delete currentState.action;
				return;
			}

			currentState.action = id;
			form[id].innerHTML = "Cancel";
		});
	});

	form.buildCard.addEventListener("click", function (event) {
		event.preventDefault();
		if (modalActions.indexOf(currentState.action) > -1) { return; }

		currentState.buyDevelop();
	});

	form.endTurn.addEventListener("click", function (event) {
		event.preventDefault();
		if (modalActions.indexOf(currentState.action) > -1) { return; }

		if (currentState.action) {
			restoreDefaultButtons();
			delete currentState.action;
		}

		currentState.endTurn();
	});
}

function restoreDefaultButtons() {
	let form = document.forms.building;
	form.buildRoad.innerHTML = "Build Road";
	form.buildTown.innerHTML = "Build Town";
	form.buildCity.innerHTML = "Build City";
}

// trading
{
	let form = document.forms.trading;

	form.offer.addEventListener("click", function (event) {
		event.preventDefault();
		currentState.offer({
			[Catan.ORE]: +form.ore.value,
			[Catan.WOOD]: +form.wood.value,
			[Catan.WOOL]: +form.wool.value,
			[Catan.GRAIN]: +form.grain.value,
			[Catan.BRICK]: +form.brick.value,
		});
	});

	form.cancel.addEventListener("click", function (event) {
		event.preventDefault();
		currentState.cancel();
	});

	[
		form.accept0, form.accept1, form.accept2, form.accept3
	].forEach(function (button, i) {
		button.addEventListener("click", function (event) {
			event.preventDefault();
			currentState.confirm(i);
		});
	});
}

// discarding
{
	let form = document.forms.discard;

	form.discard.addEventListener("click", function (event) {
		event.preventDefault();

		let resources = {
			[Catan.ORE]: +form.ore.value,
			[Catan.WOOD]: +form.wood.value,
			[Catan.WOOL]: +form.wool.value,
			[Catan.GRAIN]: +form.grain.value,
			[Catan.BRICK]: +form.brick.value,
		};

		let toDiscard = Math.floor(Player.countResources(currentState.hand.resources) / 2);
		let discarded = Player.countResources(resources);
		if (discarded != toDiscard) {
			alert("You must discard half your resources.");
			return;
		}

		currentState.ws.send(JSON.stringify({ message: "discard", resources: resources }));
	});

	[
		form.ore, form.wood, form.wool, form.grain, form.brick
	].forEach(function (input) { input.value = input.min = 0; });
}

function showDiscardModal(count) {
	let cards = (count > 1) ? "Cards" : "Card";
	document.getElementById("discard-amount").innerHTML = "Discard " + count + " " + cards;
	document.getElementById("discard-modal").style.display = "block";

	let form = document.forms.discard;
	form.ore.max = currentState.hand.resources[Catan.ORE];
	form.wood.max = currentState.hand.resources[Catan.WOOD];
	form.wool.max = currentState.hand.resources[Catan.WOOL];
	form.grain.max = currentState.hand.resources[Catan.GRAIN];
	form.brick.max = currentState.hand.resources[Catan.BRICK];
}

function hideDiscardModal() {
	document.getElementById('discard-modal').style.display = "none";
}

// chat
{
	let form = document.forms.chat;

	form.addEventListener("submit", function (event) {
		event.preventDefault();

		currentState.ws.send(JSON.stringify({ message: "chat", text: form.message.value }));
		form.reset();
	});
}

let showYopModal = function () {
	document.getElementById('yop-modal').style.display = "block";
}

let hideYopModal = function () {
	document.getElementById('yop-modal').style.display = "none";
}

document.getElementById('yop-btn').addEventListener("click", function (event) {
	event.preventDefault();
	let choice1 = +document.forms.yop.choice1.value;
	let choice2 = +document.forms.yop.choice2.value;
	this.ws.send(JSON.stringify({ message: "develop", card: Catan.YEAR_OF_PLENTY, resources: [choice1, choice2] }));
	hideYopModal();
}.bind(lobby));

let showMonopolyModal = function () {
	document.getElementById('monopoly-modal').style.display = "block";
}

let hideMonopolyModal = function () {
	document.getElementById('monopoly-modal').style.display = "none";
}

document.getElementById('monopoly-btn').addEventListener("click", function (event) {
	event.preventDefault();
	let choice = +document.forms.monopoly.choice.value;
	this.ws.send(JSON.stringify({ message: "develop", card: Catan.MONOPOLY, terrain: choice }));
	hideMonopolyModal();
}.bind(lobby));

let ctx = canvas.getContext("2d");
let lobby = new Lobby(ctx);
run(lobby);
