"use strict";

let dfs = module.exports.dfs = function(board, road, player) {
	let buildVisited = function () {
		let visited = [];
		for (let y = 0; y < 7; y++) {
			visited[y] = [];
			for (let x = 0; x < 7; x++) {
				visited[y][x] = [];
				visited[y][x].push({ visited: false, endNode: false });
				visited[y][x].push({ visited: false, endNode: false });
				visited[y][x].push({ visited: false, endNode: false });
			}
		}
		return visited;
	};

	let visited = buildVisited();
	dfs_r(board, road, visited, player);

	let global_max = board.maxRoadLength;
	let global_player = board.maxRoadPlayer;
	// Now visited contains markers for end nodes
	for (let y = 0; y < 7; y++) {
		for (let x = 0; x < 7; x++) {
			for (let d = 0; d < 3; d++) {
				if (visited[y][x][d].endNode) {
					let visited_cost = buildVisited();
					let max = dfs_cost(board, { x: x, y: y, d: d }, 0, 0, player, visited_cost, []);
					if (max > global_max) {
						global_max = max;
						global_player = player;
					}
				}
			}
		}
	}
	return [global_max, global_player];
};

let dfs_split = module.exports.dfs_split = function(board){
	let older_owner = board.maxRoadPlayer;
	//Resetting longest road globals
	board.maxRoadLength = 4; board.maxRoadPlayer = null;
	//Temporary variables for finding longest road
	let temp_max = 0; let candidate_longest_roads = [];
	//Loop through every road and find the longest road from there.
	for(let y = 0; y < 7; y++){
		for(let x = 0; x < 7; x++){
			for(let d = 0; d < 3; d++){
				//Only DFS roads that exist
				if(board.roads[y][x][d] != null){
					//Find the maximum length and owner
					let dfs_max = dfs(board, { x: x, y: y, d: d }, board.roads[y][x][d]);
					//If the new length is the longest we have seen, set it to max and reset list of players
					if(dfs_max[0] > temp_max){
						temp_max = dfs_max[0];
						candidate_longest_roads = [dfs_max[1]];
					} else if (dfs_max[0] == temp_max) {
						//If the player is not in the list of candidates, add him.
						if(candidate_longest_roads.indexOf(dfs_max[1]) < 0)
							candidate_longest_roads.push(dfs_max[1]);
					}
				}
			}
		}
	}
	let new_player = board.maxRoadPlayer;
	if(candidate_longest_roads.indexOf(older_owner) > -1){
		new_player = older_owner;
	} else if (candidate_longest_roads.length == 1){
		new_player = candidate_longest_roads[0];							
	}
	return [temp_max, new_player];
}

function dfs_cost(board, road, depth, max, player, visited_cost, old_neighbors) {
	depth++;
	visited_cost[road.y][road.x][road.d].visited = true;
	let neighbors = road_neighbors(board, road, player);
	neighbors.forEach(neighbor => {				
		if (depth > max) {
			max = depth;
		}
		let can_recurse = true;
		if(!visited_cost[neighbor.y][neighbor.x][neighbor.d].visited) { 
			old_neighbors.forEach(old_neighbor => {
				if((old_neighbor.x == neighbor.x && old_neighbor.y == neighbor.y && old_neighbor.d == neighbor.d)
					&& visited_cost[old_neighbor.y][old_neighbor.x][old_neighbor.d]){
					can_recurse = false;
				}
			});
			if(can_recurse)
				max = dfs_cost(board, neighbor, depth, max, player, visited_cost, neighbors);
		}
	});
	visited_cost[road.y][road.x][road.d].visited = false;
	return max;
}

function road_neighbors(board, road, player) {
	let neighbors = [];
	let endpoints = board.endpointVertices(road.x, road.y, road.d);
	endpoints.forEach(([ex, ey, ed]) => {
		if(board.buildings[ey][ex][ed] == null || board.buildings[ey][ex][ed].player == player ){
			let candidates = board.protrudeEdges(ex, ey, ed);
			candidates.forEach(candidate => {
				let cx = candidate[0];
				let cy = candidate[1];
				let cd = candidate[2];

				if ((cx != road.x || cy != road.y || cd != road.d) && player == board.roads[cy][cx][cd]) { 
					neighbors.push({x:cx, y:cy,d :cd});
				}
			});
		}
	});

	return neighbors;
};

function dfs_r(board, road, visited, player) { 
	visited[road.y][road.x][road.d].visited = true;
	visited[road.y][road.x][road.d].endNode = true;

	var neighbors = road_neighbors(board, road, player);
	neighbors.forEach(neighbor => {		
		let cx = neighbor.x;
		let cy = neighbor.y;
		let cd = neighbor.d;
		if(!visited[cy][cx][cd].visited) { 
			visited[road.y][road.x][road.d].endNode = false;
			dfs_r(board, neighbor, visited, player);
		}
	});
};