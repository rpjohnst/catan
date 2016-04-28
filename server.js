"use strict";

let EventEmitter = require("events").EventEmitter,
	Express = require("express"),
	WebSocket = require("ws"),
	Catan = require("./catan"),
	Player = require("./player");

let app = Express();
app.use(Express.static("public"));
app.listen(8080);

let wss = new WebSocket.Server({ port: 8081 });

let lobby = [];
wss.on("connection", function (ws) {
	// add a new player to the lobby; remove them if they disconnect before game start
	console.log("player joined lobby");

	ws.on("close", function (code, message) {
		console.log("player left lobby");
		lobby.splice(lobby.indexOf(ws), 1);
	});

	lobby.push(ws);
	if (lobby.length < 4) {
		return;
	}

	// when the lobby has 4 players, spin off a game
	console.log("starting new game");

	let clients = lobby;
	lobby = [];

	let board = new Catan();
	let turn = 0;

	let players = [];
	clients.forEach(function (ws, player) {
		players[player] = new Player();
	});

	let close = new EventEmitter();
	close.once("close", function (skip) {
		clients.forEach(function (ws, player) {
			if (player == skip) {
				return;
			}

			ws.send(JSON.stringify({ message: "end" }));
			ws.close();
		});
	});
	
	let tradingOngoing = false;
	let tradingOffers = [];
	
	let handlingRobber = false;
	let robberMoved = false;
	let resourceStolen = false;
	let resourcesToDiscard = [];

	clients.forEach(function(ws, player) {
		ws.removeAllListeners("close");
		ws.send(JSON.stringify({ message: "start", board: board, player: player }));

		// TODO: handle pregame
		ws.send(JSON.stringify({ message: "turn", player: turn }));

		// TODO: Distribute initial resources
		sendResources(ws, players[player]);

		ws.on("message", function (messageJson) {
			console.log("received from player %d: %s", player, messageJson);


			let message = JSON.parse(messageJson);
			
			
			if (player != turn && !(tradingOngoing && message.message === "offerTrade") && !(handlingRobber && message.message === "discardResources")) {
				sendError(ws, "turn");
				return;
			}
			
			// Handling robber mode
			if (handlingRobber) {
				switch (message.message) {
				default:
					sendError(ws, "message");
					break;
				
				case "discardResources":
					for (let resourceType in message.resources) {
						resourcesToDiscard[player] -= message.resources[resourceType];
						players[player].resources[resourceType] -= message.resources[resourceType];
					}
					sendResources(ws, players[player]);
					break;
				
				case "moveRobber":
					if (robberMoved || !board.tiles[message.y] || !board.tiles[message.y][message.x]) {
						sendError(ws, "moveRobber");
						break;
					}
					
					let terrain = board.tiles[message.y][message.x];
					if (terrain !== Catan.OCEAN) {
						board.robber[0] = message.x;
						board.robber[1] = message.y;
						
						let targets = [];
						for (let [vx, vy, vd] of board.cornerVertices(message.x, message.y)) {
							
							let building = board.buildings[vy][vx][vd];							
							if (building && building.player !== player) {
								let resourceSum = 0;
								let playerResources = players[building.player].resources;
								for (let resourceType in playerResources) {
									resourceSum += playerResources[resourceType];
								}
								if (resourceSum > 0) {
									targets.push(building);
								}
							}
						}
						
						
						let stealingPlayer = player;
						clients.forEach(function (ws, player) {
							if (player === stealingPlayer) {
								ws.send(JSON.stringify({
									message: "robberGood", 
									x: message.x, 
									y: message.y,
									targets: targets
								}));
							}
							ws.send(JSON.stringify({
								message: "robberGood", 
								x: message.x, 
								y: message.y,
							}));
						});
						
						// If there is no one to steal from, assume stealing has already been completed.
						if (targets.length == 0) {
							resourceStolen = true;
						}
						
					} else {
						sendError(ws, "moveRobber");
					}
					
					break;
					
				case "steal":
					if (resourceStolen) {
						sendError(ws, "steal");
						break;
					}
					
					let allResources = [];
					let playerResources = players[message.player].resources;
					for (resourceType in playerResources) {
						for (let i = 0; i < playerResources[resourceType]; i++) {
							allResources.push(resourceType);
						}
					}
					// Choose a random resource to steal
					let chosenIndex = Math.floor(Math.random() * allResources.length);
					let chosenResource = allResources[chosenIndex];
					players[player].resources[chosenResource]++;
					players[message.player].resources[chosenResource]--;
					// Update resource counts
					sendResources(ws, players[player]);
					sendResources(clients[message.player], players[message.player]);
				}
				
				// Check if we're done with "robber mode"
				let toDiscard = 0;
				for (let player in resourcesToDiscard) {
					toDiscard += resourcesToDiscard[player]
				}
				if (toDiscard === 0 && robberMoved && resourceStolen) {
					handlingRobber = false;
				}
				
				return;
			}
			
			// Normal operation
			switch (message.message) {
			default:
				sendError(ws, "message");
				break;

			case "build":
				if (
					!players[player].canAfford(message.type) ||
					!board.build(message.type, message.x, message.y, message.d, player)
				) {
					sendError(ws, "build");
					break;
				}

				players[turn].build(message.type);
				sendResources(clients[turn], players[turn]);
				clients.forEach(function (ws, player) {
					ws.send(JSON.stringify({
						message: "build", type: message.type,
						x: message.x, y: message.y, d: message.d,
						player: turn
					}));
				});
				break;
				
			case "offerTrade":
				if (!players[player].hasResources(message.offer)) {
					sendError(ws, "offer");
					break;
				}
				
				if (player == turn) {
					tradingOngoing = true;
					// TODO: Invalidate trades if offer changed?
				}
				
				tradingOffers[player] = message.offer;
				let offeringPlayer = player;
				clients.forEach(function (ws, player) {
					ws.send(JSON.stringify({
						message: "offerTrade", offer: message.offer,
						player: offeringPlayer
					}));
				});
				break;
				
			case "confirmTrade":
				if (!tradingOngoing || message.player == turn) {
					sendError(ws, "confirm");
					break;
				}
				
				for (let resourceType in tradingOffers[player]) {
					players[turn].resources[resourceType] += (tradingOffers[message.player][resourceType] - tradingOffers[turn][resourceType]);
					players[message.player].resources[resourceType] += (tradingOffers[turn][resourceType] - tradingOffers[message.player][resourceType]);
				}
				
				tradingOngoing = false;
				tradingOffers = [];
				
				sendResources(clients[turn], players[turn]);
				sendResources(clients[message.player], players[message.player]);
				clients.forEach(function (ws, player) {
					ws.send(JSON.stringify({ message: "endTrade" }));
				});
				break;
				
			case "cancelTrade":
				tradingOngoing = false;
				tradingOffers = [];
				clients.forEach(function (ws, player) {
					ws.send(JSON.stringify({ message: "endTrade" }));
				});
				break;

			case "turn":
				turn = (turn + 1) % clients.length;

				let dice = Math.floor(Math.random() * 6 + 1) + Math.floor(Math.random() * 6 + 1);
				
				console.log("Dice Roll: " + dice);
				
				// Assign resources
				for (let [tx, ty] of board.hit[dice]) {
					let terrain = board.tiles[ty][tx];
					for (let [vx, vy, vd] of board.cornerVertices(tx, ty)) {
						// If robber in space, don't assign resources
						if (board.robber[0] == vx && board.robber[1] == vy) {
							continue;
						}
						let building = board.buildings[vy][vx][vd];
						if (building) {
							let amount;
							if (building.type == Catan.TOWN) {
								amount = 1;
							} else if (building.type == Catan.CITY) {
								amount = 2;
							}
							players[building.player].resources[terrain] += amount;
						}
					}
				}

				
				clients.forEach(function (ws, player) {
					ws.send(JSON.stringify({
						message: "turn", player: turn, dice: dice,
					}));
					sendResources(ws, players[player]);
				});
				
				
				if (dice == 7) {
					handleRobber(turn);
					
				}
				
				break;
			}
		}).on("close", function (code, message) {
			console.log("player %d left", player);
			close.emit("close", player);
		});
	});
	
	function sendResources(ws, player) {
		ws.send(JSON.stringify({
			message: "resources", 
			resources: player.resources, 
			pieces: player.pieces, 
			cards: player.cards
			}));
	}

	function sendError(ws, message) {
		ws.send(JSON.stringify({ message: "error", error: message }));
	}
	
	function handleRobber(curPlayer) {
		handlingRobber = true;
		robberMoved = false;
		resourceStolen = false;
		resourcesToDiscard = [];
		for (let player in players) {
			let resourceSum = 0;
			let playerResources = players[player].resources;
			for (let resource in playerResources) {
				resourceSum += playerResources[resource];
			}
			if (resourceSum > 7) {
				resourcesToDiscard[player] = Math.floor(resourceSum / 2);
			}
		}
	}
	
	function moveRobber() {
		
	}
	
});
