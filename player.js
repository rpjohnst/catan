"use strict";

//Player Piece Counts
const CITY_COUNT = 4,
	TOWN_COUNT = 5,
	ROAD_COUNT = 15;
//Player Piece ID
const CITY = 0,
	TOWN = 1,
	ROAD = 2;	
//Development Cards
const KNIGHT = 0,
	YEAR_OF_PLENTY = 1,
	MONOPOLY = 2,
	VICTORY_POINT = 3,
	ROAD_BUILDING = 4;
//Resource Cards
const ORE = 1,
	WOOD = 2,
	WOOL = 3,
	GRAIN = 4,
	BRICK = 5;


class Player{

	constructor(){
		//Initialize everything necessary for the players hand.

		//The initial number of pieces a player has. 
		this.available_pieces = [CITY_COUNT, TOWN_COUNT, ROAD_COUNT];

		//The hand of resource cards
		this.resource_cards = new Array();
		//ORE, WOOD, WOOL, GRAIN, BRICK
		for(var i = 1; i <= 5; i++){
			this.resource_cards[i] = 0;
		}
		//The development cards a player has.
		this.development_cards = new Array();
		for(var i = 0; i <= 4; i++){
			this.development_cards[i] = 0;
		}

		//The player's victory points. 
		this.victory_points = 0;

		this.knights = 0;
	}

	/*
	DEVELOPMENT CARDS
	*/

	//Returns boolean.
	//Check if the player has a specific development card.
	haveDevelopCard(cardValue){
		return this.development_cards[cardValue] > 0;	
	}

	//Removes the development card of value "cardValue" from the players hand. 
	//Assumes that the player has the development card
	useDevelopCard(cardValue){
		this.development_cards[cardValue] -= 1;
	}

	//Adds the development card of a specific value to the players hand. 
	addDevelopCard(cardValue){
		this.development_cards[cardValue] += 1;
	}

	getDevelopList(){
		return this.development_cards;
	}

	getKnightCount(){
		return this.knights;
	}

	/*
	RESOURCE CARDS
	*/

	//Returns the number of resource cards in the players hand. 
	totalResourceCount(){
		var total = 0;
		for(var i = 1; i <= 5; i++){
			total += this.resource_cards[i];
		}
		return total;
	}

	getResourceList(){
		return this.resource_cards;
	}

	woodCount(){
		return this.getResourceCount(WOOD);
	}

	oreCount(){
		return this.getResourceCount(ORE);
	}

	grainCount(){
		return this.getResourceCount(GRAIN);
	}

	woolCount(){
		return this.getResourceCount(WOOL);
	}

	brickCount(){
		return this.getResourceCount(BRICK);
	}

	//Get the number of resources of a specific type that the player is holding. 
	getResourceCount(cardValue){
		return this.resource_cards[cardValue];
	}

	//Remove a specific number (number) of resources of a specific type (cardValue) from the players hand. 
	//Return boolean - true if successfully removed, false otherwise.
	removeResourceCards(cardValue, number){
		if(number > this.resource_cards[cardValue]){
			return false;
		} else {
			this.resource_cards[cardValue] -= number;
			return true;
		}
	}

	//Adds one of a specific resource (cardValue) to the player's hand. 
	addResourceCard(cardValue){
		this.resource_cards[cardValue] += 1;
	}

	//Adds <number> of a specific resource <cardValue> to the player's hand. 
	addResourceCard(cardValue, number){
		this.resource_cards[cardValue] += number;
	}

	/*
	STRUCTURES
	*/

	//Returns the number of roads a player has remaining
	remainingRoads(){
		return this.available_pieces[ROAD];
	}

	//Returns the number of cities a player has remaining
	remainingCities(){
		return this.available_pieces[CITY];
	}

	//Returns the number of towns a player has remaining. 
	remainingTowns(){
		return this.available_pieces[TOWN]
	}

	getStructureList(){
		return this.available_pieces;
	}

	//Decreases the number of player cities by one and consumes the resources required.
	//Assume that the player has the remaining piece and can afford it.
	useRoad(){
		this.removeResourceCards(WOOD, 1);
		this.removeResourceCards(BRICK, 1);
		this.removeStructure(ROAD);			
	}

	//Decreases the number of player cities by one and consumes the resources required.
	//Assume that the player has the remaining piece and can afford it.
	useCity(){
		this.removeResourceCards(ORE, 3);
		this.removeResourceCards(GRAIN, 2);
		this.removeStructure(CITY);
		//Building a city should restore a town to the player. 
		this.available_pieces[TOWN] += 1;
	}

	//Decreases the number of player towns by one and consumes the resources required.
	//Assume that the player has the remaining piece and can afford it.
	useTown(){
		this.removeResourceCards(BRICK, 1);
		this.removeResourceCards(WOOD, 1);
		this.removeResourceCards(WOOL, 1);
		this.removeResourceCards(GRAIN, 1);
		this.removeStructure(TOWN);
	}

	//Return boolean whether the player has enough resources for a specific piece.
	canAfford(structure){
		switch(structure){
			case CITY:
				return this.getResourceCount(GRAIN) > 1 && this.getResourceCount(ORE) > 2;
				break;
			case TOWN:
				return this.getResourceCount(WOOD) > 0 && this.getResourceCount(GRAIN) > 0 && this.getResourceCount(WOOL) > 0 && this.getResourceCount(BRICK);
				break;
			case ROAD:
				return this.getResourceCount(WOOD) > 0 && this.getResourceCount(BRICK) > 0;
				break;
		}
	}

	/*
	VICTORY POINTS
	*/

	getVictoryPoints(){
		return this.victory_points;
	}

	incrementVictoryPoints(){
		this.victory_points += 1;
	}

	//Helper function

	//Decreases the number of player <structures> by one --- returns true if success, false if failure. 
	removeStructure(structure)
	{
		this.available_pieces[structure] -= 1;
	}
};

module.exports = Player;