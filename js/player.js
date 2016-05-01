/*
  A settlement is an instance of a town or city
*/
class Settlement
{
    constructor(tile, owner, dir){
      this.worth = 1;
      this.owner = owner;
      
      this.neighbors = [];
      this.neighbors.push(tile);
      if(tile.neighbors[(dir + 5)%6]) this.neighbors.push(tile.neighbors[(dir + 5)%6]);
      if(tile.neighbors[dir]) this.neighbors.push(tile.neighbors[dir]);
      
      var vertex = tile.get_vertex(dir);
      
      this.sprite = new PIXI.Sprite.fromImage('assets/town.png');
      this.sprite.tint = owner.color;
      
      // TODO: Avoid using hard-coded height and width?
      // town.height/width is 1 here, but 33 after rendering. Need to preload assets?
      var height = 33;
      var width = 33;
      this.sprite.x = vertex[0] - width/2; 
      this.sprite.y = vertex[1] - height/2;
      stage.children[1].addChild(this.sprite);
      
      tile.vertices[dir].state = owner.id;
      this.location = tile.vertices[dir];
    }
    
    upgrade() { this.worth = 2; this.sprite.texture = new PIXI.Texture.fromImage("assets/city.png"); }
    
    produce(hit){
      for(var i=0; i < this.worth; i++)
        for(var j=0; j<this.neighbors.length; j++)
          if(this.neighbors[j].hit == hit){
            this.owner.add_one(this.neighbors[j].terrain);
            console.log(this.owner.name + " gets " + this.neighbors[j].terrain);
          }
    }
}

class Player
{
      
    static get DEF_NUM_CITIES() { return 4; }
    static get DEF_NUM_TOWNS() { return 5; }
    static get DEF_NUM_ROADS() { return 15; }

    static get NONE()      { return [0,0,0,0,0]; }
    static get ROAD_COST() { var amt = Player.NONE; amt[Catan.WOOD] = 1; amt[Catan.BRICK] = 1; return amt; }
    static get TOWN_COST() { var amt = Player.ROAD_COST; amt[Catan.WOOL] = 1; amt[Catan.GRAIN] = 1; return amt; }
    static get CITY_COST() { var amt = Player.NONE; amt[Catan.GRAIN] = 2; amt[Catan.ORE] = 3; return amt; }
    static get CARD_COST() { var amt = Player.NONE; amt[Catan.GRAIN] = 1; amt[Catan.ORE] = 1; amt[Catan.WOOL] = 1; return amt;}
    
    add_one(type){ this.resources[type]++; }
    
    /* Adds or subtracts the specified number of resources from the player */
    mod_resources(amount, add)
    {
      for(var i=0; i<5; i++)
        this.resources[i] += (amount[i] * ((add)? 1:-1));
      return this.resources;
    }
    
    /* Returns true if this player has at least the specified amount of resources */
    cmp_resources(amount)
    {
      for(var i=0; i<6; i++)
        if(this.resources[i] < amount[i])
          return false;
        
      return true;
    }
    
    add_dev_card(card) { this.dev_cards.push(card); }
        
    constructor(id, color, name){
      this.num_cities = Player.DEF_NUM_CITIES;
      this.num_towns = Player.DEF_NUM_TOWNS;
      this.num_roads = Player.DEF_NUM_ROADS;
      
      this.resources = [0, 0, 0, 0, 0];
      this.dev_cards = [];            
      this.soldiers_used  = 0;      
      this.victory_points = 0;
      
      this.id    = id;
      this.color = color;
      this.name = name;
    }
}