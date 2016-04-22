"use strict";

//Player Pieces
const CITY_COUNT = 4,
	TOWN_COUNT = 5,
	ROAD_COUNT = 15;
//Development Cards
const KNIGHT = 0,
	YEAR_OF_PLENTY = 1,
	MONOPOLY = 2,
	VICTORY_POINT = 3,
	ROAD_BUILDING = 4;
// //Resource Cards
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
		this.development_cards = [];

		//The player's victory points. 
		this.victory_points = 0;
	}

	/*
	DEVELOPMENT CARDS
	*/

	//Returns boolean.
	//Check if the player has a specific development card.
	haveDevelopCard(cardValue){

		return (this.development_cards.indexOf(cardValue) > -1);	
	}

	//Returns booolean --- True on success, false on failure.
	//Removes the development card of value "cardValue" from the players hand.
	useDevelopCard(cardValue){
		//Some browsers do not support indexOf.
		cardIndex = this.development_cards.indexOf(cardValue);
		if(cardIndex > -1){
			this.development_cards = this.development_cards.splice(cardIndex, 1);
			return true;
		} else{
			return false;
		}
	}

	//Adds the development card of a specific value to the players hand. 
	addDevelopCard(cardValue){
		this.development_cards.push(cardValue);
	}

	/*
	RESOURCE CARDS
	*/

	//Get the number of resources of a specific type that the player is holding. 
	getResourceCount(cardValue){
		return this.resource_cards[cardValue];
	}

	//Remove a specific number (number) of resources of a specific type (cardValue) from the players hand. 
	removeResourceCards(cardValue, number){
		if(number > this.resource_cards[cardValue]){
			return false;
		} else {
			this.resource_cards[cardValue] -= number;
			return true;
		}
	}

	//Adds one of a specific resource (cardValue) to the player's hand. 
	addResourceCard(cardValue)
	{
		this.resource_cards[cardValue] += 1;
	}

	/*
	STRUCTURES
	*/

	//Returns the number of roads a player has remaining
	remainingRoads(){
		return this.available_pieces[2];
	}

	//Returns the number of cities a player has remaining
	remainingCities(){
		return this.available_pieces[0];
	}

	//Returns the number of towns a player has remaining. 
	remainingTowns(){
		return this.available_pieces[1]
	}

	//Decreases the number of player cities by one --- returns true if success, false if failure.
	useRoad(){
		return this.removeStructure(2);
	}

	//Decreases the number of player cities by one --- returns true if success, false if failure.
	useCity(){
		return this.removeStructure(0);
	}

	//Decreases the number of player towns by one --- returns true if success, false if failure. 
	useTown(){
		return this.removeStructure(1);
	}

	//Helper function

	//Decreases the number of player <structures> by one --- returns true if success, false if failure. 
	removeStructure(structure)
	{
		if(this.available_pieces[structure] != 0){
			this.available_pieces[structure] -= 1;
			return true; 
		} else {
			return false;
		}
	}
};

module.exports = Player;