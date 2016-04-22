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

	let players = lobby;
	lobby = [];

	let player_hand = new Array();

	players.forEach(function (ws, player) {
		player_hand[player] = new Player();
	});

	let board = new Catan();
	let turn = 0;

	//ORE, WOOD, WOOL, GRAIN, BRICK
	console.log("WOOD: " + player_hand[0].getResourceCount(1));

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
				sendError(ws, "turn");
				// ws.send(JSON.stringify({ message: "error", error: "turn" }));
				return;
			}

			let message = JSON.parse(messageJson);
			switch (message.message) {
			default:
				sendError(ws, "message");
				// ws.send(JSON.stringify({ message: "error", error: "message" }));
				break;

			case "buildTown":
				if (board.addTown(message.x, message.y, message.d, player) && player_hand[player].remainingTowns() != 0) {
					console.log("Building Town");
					player_hand[turn].useTown();
					console.log("Player " + turn + " remaining towns: " +player_hand[turn].remainingTowns());
					players.forEach(function (ws, player) {
						ws.send(JSON.stringify({
							message: "buildTown",
							x: message.x, y: message.y, d: message.d,
							player: turn
						}));
					});
				} else {
					sendError(ws, "buildTown");
					//ws.send(JSON.stringify({ message: "error", error: "buildTown" }));
				}
				break;
			case "buildRoad":
				if(board.addRoad(message.x, message.y, message.d, player) && player_hand[player].remainingRoads() != 0){
					console.log("Building Road");
					player_hand[turn].useTown();
					players.forEach(function (ws, player) {
						ws.send(JSON.stringify({
							message: "buildRoad",
							x: message.x, y: message.y, d: message.d,
							player: turn
						}));
					});
				}else {
					sendError(ws, "buildRoad");
				}

				break;
			case "turn":
				updateTurn();
				var dice = rollDice();
				console.log(dice);
				players.forEach(function (ws, player) {
					ws.send(JSON.stringify({
						message: "diceRoll",
						value: dice
					}));
				});

				//need to iterate through every hex with value of the dice roll, and award adjacent towns/cities the appropriate number of resources

				break;
			}
		}).on("close", function (code, message) {
			console.log("player %d left", player);
			close.emit("close", player);
		});
	});
	//Method for updating the turn. 
	function updateTurn(){
		turn = (turn + 1) % players.length;
		players.forEach(function (ws, player){
			ws.send(JSON.stringify({message: "turn", player: turn}));
		});
	};
	//Method for sending an error to a socket.
	function sendError(ws, errorMessage){
		ws.send(JSON.stringify({message: "error", error: errorMessage}));
	};
	//Method for rolling the dice.
	function rollDice(){
		return Math.floor(Math.random()* (12 - 2)) + 2;
	}
});

