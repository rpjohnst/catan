"use strict";

let EventEmitter = require("events").EventEmitter,
	Express = require("express"),
	WebSocket = require("ws"),
	Catan = require("./catan");

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

	let players = lobby;
	lobby = [];

	let board = new Catan();
	let turn = 0;

	let close = new EventEmitter();
	close.once("close", function (skip) {
		players.forEach(function (ws, player) {
			if (player == skip) {
				return;
			}

			ws.send(JSON.stringify({ message: "end" }));
			ws.close();
		});
	});

	players.forEach(function(ws, player) {
		ws.removeAllListeners("close");
		ws.send(JSON.stringify({ message: "start", board: board, player: player }));
		ws.send(JSON.stringify({ message: "turn", player: turn }));

		ws.on("message", function (messageJson) {
			console.log("received from player %d: %s", player, messageJson);

			if (player != turn) {
				ws.send(JSON.stringify({ message: "error", error: "turn" }));
				return;
			}

			let message = JSON.parse(messageJson);
			switch (message.message) {
			default:
				ws.send(JSON.stringify({ message: "error", error: "message" }));
				break;

			case "buildTown":
				if (board.addTown(message.x, message.y, message.d, player)) {
					players.forEach(function (ws, player) {
						ws.send(JSON.stringify({
							message: "buildTown",
							x: message.x, y: message.y, d: message.d,
							player: turn
						}));
					});
				} else {
					ws.send(JSON.stringify({ message: "error", error: "buildTown" }));
				}
				break;

			case "turn":
				turn = (turn + 1) % players.length;
				players.forEach(function (ws, player) {
					ws.send(JSON.stringify({ message: "turn", player: turn }));
				});
				break;
			}
		}).on("close", function (code, message) {
			console.log("player %d left", player);
			close.emit("close", player);
		});
	});
});
