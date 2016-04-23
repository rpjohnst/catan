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

	clients.forEach(function(ws, player) {
		ws.removeAllListeners("close");
		ws.send(JSON.stringify({ message: "start", board: board, player: player }));

		// TODO: handle pregame
		ws.send(JSON.stringify({ message: "turn", player: turn }));

		ws.on("message", function (messageJson) {
			console.log("received from player %d: %s", player, messageJson);

			if (player != turn) {
				sendError(ws, "turn");
				return;
			}

			let message = JSON.parse(messageJson);
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
				clients.forEach(function (ws, player) {
					ws.send(JSON.stringify({
						message: "build", type: message.type,
						x: message.x, y: message.y, d: message.d,
						player: turn
					}));
				});
				break;

			case "turn":
				turn = (turn + 1) % clients.length;

				let dice = Math.floor(Math.random() * 6 + 1) + Math.floor(Math.random() * 6 + 1);
				if (dice == 7) {
					console.log("thief!!!!");
					break; // TODO: Handle thief and discard
				}

				for (let [tx, ty] of board.hit[dice]) {
					let terrain = board.tiles[ty][tx];
					for (let [vx, vy, vd] of board.cornerVertices(tx, ty)) {
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
						pieces: players[player].pieces,
						resources: players[player].resources,
						cards: players[player].cards,
					}));
				});
				break;
			}
		}).on("close", function (code, message) {
			console.log("player %d left", player);
			close.emit("close", player);
		});
	});

	function sendError(ws, message) {
		ws.send(JSON.stringify({ message: "error", error: message }));
	}
});
