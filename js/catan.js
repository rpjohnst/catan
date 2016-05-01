/*

*/
class Catan
{
    static get NONE()    { return 5; } static get NUM_NONE()   { return 1; } static get NUM_PORT_NONE()    { return 9; }
                                                                             static get NUM_PORT_GENERIC() { return 4; }
    static get ORE()     { return 0; } static get NUM_ORE()    { return 3; } static get NUM_PORT_ORE()     { return 1; }
    static get WOOD()    { return 1; } static get NUM_WOOD()   { return 4; } static get NUM_PORT_WOOD()    { return 1; }
    static get WOOL()    { return 2; } static get NUM_WOOL()   { return 4; } static get NUM_PORT_WOOL()    { return 1; }
    static get GRAIN()   { return 3; } static get NUM_GRAIN()  { return 4; } static get NUM_PORT_GRAIN()   { return 1; }
    static get BRICK()   { return 4; } static get NUM_BRICK()  { return 3; } static get NUM_PORT_BRICK()   { return 1; }
    static get OCEAN()   { return 6; }
                
    static get KNIGHT()         { return 0; } static get NUM_DEV_CARD_KNIGHT()         { return 14; }
    static get YEAR_OF_PLENTY() { return 1; } static get NUM_DEV_CARD_YEAR_OF_PLENTY() { return 2;  }
    static get MONOPOLY()       { return 2; } static get NUM_DEV_CARD_MONOPOLY()       { return 2;  }
    static get VICTORY_POINT()  { return 3; } static get NUM_DEV_CARD_POINT()          { return 5;  }
    static get ROAD_BUILDING()  { return 4; } static get NUM_DEV_CARD_ROAD_BUILDING()  { return 2;  }
      
    /* Gets a default deck of development cards */
    static get DEF_DEV_CARD_POOL(){
      var dev_card_pool = [];
      
      for(var i=0; i < Catan.NUM_DEV_CARD_KNIGHT; i++)
        dev_card_pool.push(Catan.KNIGHT);
      for(var i=0; i < Catan.NUM_DEV_CARD_YEAR_OF_PLENTY; i++)
        dev_card_pool.push(Catan.YEAR_OF_PLENTY);
      for(var i=0; i < Catan.NUM_DEV_CARD_ROAD_BUILDING; i++)
        dev_card_pool.push(Catan.ROAD_BUILDING);
      for(var i=0; i < Catan.NUM_DEV_CARD_MONOPOLY; i++)
        dev_card_pool.push(Catan.MONOPOLY);
      for(var i=0; i < Catan.NUM_DEV_CARD_POINT; i++)
        dev_card_pool.push(Catan.VICTORY_POINT);
      
      return dev_card_pool;
    }
    
    /* Gets a default tile pool to be used in constructing the board */
    static get DEF_TILE_POOL(){
      var tile_pool = [];
      
      for(var i=0; i < Catan.NUM_NONE; i++)
        tile_pool.push(Catan.NONE);
      for(var i=0; i < Catan.NUM_ORE; i++)
        tile_pool.push(Catan.ORE);
      for(var i=0; i < Catan.NUM_BRICK; i++)
        tile_pool.push(Catan.BRICK);
      for(var i=0; i < Catan.NUM_WOOD; i++)
        tile_pool.push(Catan.WOOD);
      for(var i=0; i < Catan.NUM_GRAIN; i++)
        tile_pool.push(Catan.GRAIN);
      for(var i=0; i < Catan.NUM_WOOL; i++)
        tile_pool.push(Catan.WOOL);
      
      return tile_pool;
    }
    
    /* Gets a default chit pool to be used in constructing the board */
    static get DEF_CHIT_POOL() {
      var chit_pool = 
      [
        5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11
      ];
      
      // Add additional chits for non default numbers?
      
      return chit_pool;
    }
      
    create_tiles(tile_pool, chit_pool, stage)
    {
      // The view is the primary game area
      this.view = new PIXI.Sprite();
      this.view.x = 25; this.view.y = 75;
      stage.addChild(this.view);

      // The overlay is used for settlements and the thief
      this.overlay = new PIXI.Sprite();
      this.overlay.x = 25; this.overlay.y = 75;
      stage.addChild(this.overlay);
      
      // Create the board array
      this.board = [];
      for(var i=0; i <= 6; i++)
        this.board[i] = [null, null, null, null, null, null, null];
      
      // Create the center of the board
      var terrain = tile_pool.pop();      
      var chit = (terrain === Catan.NONE)? 0: chit_pool.pop();
      this.center = new Tile(terrain, chit, 3, 3, this.board); // Using default center of (3,3). Generalize this?
      this.addEntry(this.center);      
      
      // Keep generating neighbors for previous pieces until the tile pool is exhausted
      var queue = this.center.generate_neighbors(tile_pool, chit_pool, this.board);
      while(queue.length > 0){
        var tile = queue.shift();
        this.addEntry(tile);
        queue = queue.concat(tile.generate_neighbors(tile_pool, chit_pool, this.board));
      }
            
      this.finalize_board();
                  
      // TODO: Remove hard-coded initial board state      
      this.add_town(this.board[3][3], 0);
      this.add_road(this.board[3][3], 0);
      this.add_town(this.board[4][1], 1);
      this.add_road(this.board[4][1], 1);
      this.cycle_turn();
      this.add_town(this.board[4][4], 4);
      this.add_road(this.board[4][3], 2);
      this.add_town(this.board[2][4], 1);
      this.add_road(this.board[2][4], 0);
      this.cycle_turn();
      this.add_town(this.board[3][5], 3);
      this.add_road(this.board[3][5], 3);
      this.add_town(this.board[1][3], 2);
      this.add_road(this.board[1][3], 2);
      this.cycle_turn();
      this.add_town(this.board[2][2], 5);
      this.add_road(this.board[2][2], 5);
      this.add_town(this.board[3][2], 5);
      this.add_road(this.board[3][1], 0);
      this.cycle_turn();
    }
    
    invalid_tile(tile) { return (!tile || tile.terrain == Catan.OCEAN); }
    
    valid_road(tile, dir)
    {
      // Invalid tile or occupied edge
      if(this.invalid_tile(tile) || tile.get_road_state(dir) !== Catan.NONE)
        return false;
            
      // Pregame: Roads must be placed adjacent to a settlement belonging to the current player
      if(!this.started && !tile.next_to_settlement(dir, this.current_player))
        return false;
      
      // Otherwise, a road is valid if next to a road or settlement belonging to the current player
      return tile.next_to_road(dir, this.current_player) || tile.next_to_settlement(dir, this.current_player);      
    }
    
    /* Checks that placing a town on tile 'tile' at vertex 'dir' is a valid move */
    valid_town(tile, dir)
    {
      // Invalid tile or occupied vertex
      if(this.invalid_tile(tile, dir) || tile.vertices[dir].state != Catan.NONE)
        return false;

      // Pre-game towns must be >=2 edges from any existing town
      var source      = tile.vertices[dir];
      for(var i=0; i<this.settlements.length; i++)
      {        
        var destination = this.settlements[i].location;
        var path_length = Tile.shortest_path(source, destination);
        if(path_length < 2) return false;
      }
      
      // Standard towns must obey above rule AND also must touch one of the current player's roads
      return !this.started || tile.next_to_road(dir, this.current_player);
    }
    
    /* Attempts to add a new town to the specified tile and vertex */
    add_town(tile, dir)
    {
      // If the game has started, ensure player can afford the town
      if(!this.current_player.cmp_resources(Player.TOWN_COST) && this.started)
        return false;
      
      if(this.current_player.num_towns <= 0)
        return false;
      
      // Ensure the town is in a valid location
      if(!this.valid_town(tile, dir))
        return false;
      
      // Purchase and place the town
      if(this.started) this.current_player.mod_resources(Player.TOWN_COST, false);
      this.current_player.num_towns--;
      this.current_player.victory_points++;
      this.settlements.push(new Settlement(tile, this.current_player, dir));
    }
    
    add_road(tile, dir)
    {      
      if(!this.current_player.cmp_resources(Player.ROAD_COST) && this.started)
        return false;
      
      // Out of road pieces
      if(this.current_player.num_roads <= 0)
        return false;
      
      // Check if location is valid    
      if(!this.valid_road(tile, dir))
        return false;

      //Check if player has enough resources, subtract them if so
      if(this.started) this.current_player.mod_resources(Player.ROAD_COST, false);
      this.current_player.num_roads--;
      tile.add_road(this.current_player, dir);
    }

    /* Places ocean tiles and the thief */
    finalize_board()
    {
      // Load the thief sprite
      this.thief = new PIXI.Sprite.fromImage('assets/pawn.png');
      this.overlay.addChild(this.thief);
      
      // Loop through the board and connect vertices
      for(var i=0; i<6; i++)
        for(var j=0; j<6; j++)
        {                    
          var tile = this.board[i][j];
          if(tile)
            tile.connect_vertices();
        }
      
      // Loop through the board array and place any missing ocean tiles
      for(var i=0; i<6; i++)
        for(var j=0; j<6; j++)
        {          
          var tile = this.board[i][j];
          if(!tile || tile.terrain == Catan.OCEAN) continue;
          
          var ocean = tile.generate_ocean(this.board);
          for(var k=0; k<ocean.length; k++)
            this.view.addChild(ocean[k].square);
            
          // Special case: Found the desert, place the thief.
          if(tile.terrain == Catan.NONE){
            this.thief.x = tile.square.x + 15;
            this.thief.y = tile.square.y + 10;
          }
        }
    }
      
    addEntry(tile){
      this.view.addChild(tile.square);
      this.view.addChild(tile.text);
      tile.generate_vertices();
    }
    
    /* Shifts the chits to get a slightly different placement on each playthough, but maintain order */
    shift_chits(chit_pool)
    {
      var new_chits = [];    
      var start = Math.floor(Math.random()*chit_pool.length);      
      for(var i=start; i < chit_pool.length + start; i++){        
        new_chits.push(chit_pool[i % chit_pool.length]);
      }
      console.log(new_chits);
      return new_chits;
    }
    
    // TODO:
    discard(){ }
    move_thief(){ }
    
    roll_dice()
    {      
      var result = (Math.floor(Math.random()*6)+1) + (Math.floor(Math.random()*6)+1);      
      if(!this.started) return result;        
      
      //TODO: Handle rolling 7
      if(result == 7)
      {
        this.discard();
        this.move_thief();          
        return result;
      }

      // Have each settlement check if it needs to add a resource to its owner
      for(var i=0; i<this.settlements.length; i++)
        this.settlements[i].produce(result);

      return result;
    }
    
    draw_dev_card()
    { 
      if(!this.current_player.cmp_resources(Player.CARD_COST))
        return false;
      
      // Out of cards
      if(this.dev_card_pool.length <= 0)
        return false;
      
      this.current_player.mod_resources(Player.CARD_COST, false);
      
      var result = this.dev_card_pool.shift();
      console.log(result);
      this.current_player.add_dev_card(result);
      return result;
    }
    
    upgrade_settlement(index) {       
      if(!this.current_player.cmp_resources(Player.CITY_COST) || this.current_player.num_cities <= 0)
        return false;
      
      this.current_player.num_cities--;
      this.current_player.num_towns++;
      this.current_player.victory_points++;
      
      this.current_player.mod_resources(Player.CITY_COST, false);
      this.settlements[index].upgrade(); 
    }
    
    play_card(player, card)
    {
      // TODO
    }
    
    /* Ends the pregame state and gives players their initial resources */
    start_game()
    {
      // Raise game started flag
      this.started = true;

      // Give each player their initial resources
      for(var k=2; k<=12; k++)
        for(var i=0; i<this.settlements.length; i++)
          this.settlements[i].produce(k);
    }
    
    /* Sets the current player to the next in line */
    cycle_turn()
    {
      this.player_turn++;
      if(this.player_turn > this.num_players)
        this.player_turn = 1;
      this.current_player = this.players[this.player_turn-1];
    }
    
    /*
      Constructs a new Catan game instance with a random board and card deck
    */
    constructor(stage) {
      
      // Started is flag raised after players place initial settlements/roads
      this.started = false;
      
      // All of the settlements currently in the game
      this.settlements = [];
      
      // Hard-coded players for front-end version
      this.num_players = 4; //TODO: Lobby system
      this.player_turn = 1; // Player indices start at 1      
      this.players = [new Player(1, 0xff0000, "A"),
                      new Player(2, 0xffffff, "B"),
                      new Player(3, 0x0000ff, "C"),
                      new Player(4, 0x00ff00, "D")];
      this.current_player = this.players[0];
      
      // Generate shuffled deck of development cards
      this.dev_card_pool = shuffle(Catan.DEF_DEV_CARD_POOL);      
      
      // Generate tiles and chits used to construct board
      var tile_pool = shuffle(Catan.DEF_TILE_POOL);
      var chit_pool = this.shift_chits(Catan.DEF_CHIT_POOL);      

      // Construct the board
      this.create_tiles(tile_pool, chit_pool, stage);
    }    
}