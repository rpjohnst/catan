# Settlers of Catan

## Running

Install node.js v5.10, then run this:

```
npm install
npm run build
node --harmony_destructuring server.js
```

This should start an HTTP server on port 8080 and a WebSockets server on port 8081.

## Overview

We have developed an online version of Settlers of Catan. For those unfamiliar with Catan, it is a board game in which players collect resources, trade, build settlements, and compete to expand their empire on an island made of randomly shuffled tiles. We implemented a majority of the full rule set (see http://www.catan.com/service/game-rules) as well as some extra features such as sound effects, some simple custom art assets, and chat. The back-end of the project pairs groups of four clients into games, maintains canonical game states, and pushes updates out to clients. We use Node.js on the back-end to make it so our representation of Catan uses the same objects on both the server and the client. The server and the clients communicate using web sockets. Data is transferred via a simple updated-based protocol making use of JSON. The front-end of the project renders the game state using an HTML5 canvas and allows the user to interact with the board. Both the front-end and the back-end will make use of ECMA6 classes to represent the component parts of the game, such as Tile and Player objects. A complete game is entirely possible in the current implementation. The only missing feature is ports.