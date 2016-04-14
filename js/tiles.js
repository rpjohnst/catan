var v_id = 0;
class Vertex { constructor() { this.state = Catan.NONE; this.neighbors = [null, null, null]; this.id = v_id++; } }

/*

For tile (*), neighbor indices 0-5 will correspond to the tiles positioned like so:
   _
 _/1\_            0  (x-1), (y+1)
/0\_/2\           1  (x  ), (y+1)
\_/*\_/   *=(x,y) 2  (x+1), (y  )
/5\_/3\           3  (x+1), (y-1)
\_/4\_/           4  (x  ), (y-1)
  \_/             5  (x-1), (y  )
  
  Vertex indices work as follows: The left-most vertex is vertex 0. Increment by 1 for each turn clockwise.
  Edges are stored as a 
*/
class Tile
{
    next_to_road(edge, player)
    {
      var vertex = this.vertices[edge];
      
      // A road is valid if this edge is immediately adjacent to an existing road
      var t1 = vertex.neighbors[0] && vertex.neighbors[0].state == player.id;
      var t2 = vertex.neighbors[1] && vertex.neighbors[1].state == player.id;
      var t3 = vertex.neighbors[2] && vertex.neighbors[2].state == player.id;
      
      // It is also valid if there is a road by the vertex on the other end of this edge
      var neighbor = vertex.neighbors[Tile.road_dir(edge)].vertex;      
      var t4 = neighbor.neighbors[0] && neighbor.neighbors[0].state == player.id;
      var t5 = neighbor.neighbors[1] && neighbor.neighbors[1].state == player.id;
      var t6 = neighbor.neighbors[2] && neighbor.neighbors[2].state == player.id;
      
      return (t1 || t2 || t3 || t4 || t5 || t6);
    }
    
    /* Returns true if the edge associated with  */
    next_to_settlement(dir, player)
    {
      var vertex = this.vertices[dir];
      var t1 = vertex && vertex.state == player.id;
      var t2 = vertex.neighbors[Tile.road_dir(dir)] && vertex.neighbors[Tile.road_dir(dir)].vertex.state == player.id;
      return (t1 || t2);
    }
    
    static road_dir(dir)
    {
      // For even vertices:  0 = W; 1 = NE; 2 = SE
      // For odd vertices:   0 = E; 1 = SW; 2 = NW
      if(dir >= 3) dir -= 3;
      switch(dir){
        case 0: return 1;
        case 1: return 0;
        case 2: return 2;
      }
    }
    
    get_road_state(dir)
    {
      return this.vertices[dir].neighbors[Tile.road_dir(dir)].state;
    }
    
    /* */
    add_road(owner, dir)
    {      
            
      var road_dir = Tile.road_dir(dir);      
      this.vertices[dir].neighbors[road_dir].state = owner.id;
      this.vertices[dir].neighbors[road_dir].vertex.neighbors[road_dir].state = owner.id;
      
      var start = this.get_vertex(dir);
      var end   = this.get_vertex((dir+1)%6);
      
      var line = new PIXI.Graphics();
      line.lineStyle(this.pad, owner.color);
      line.moveTo(start[0], start[1]);
      line.lineTo(end[0], end[1]);
      
      stage.children[0].addChild(line);
    }
    
    get_vertex(i)
    {      
      
      switch(i){
        case 0: return [this.square.x - this.pad,this.square.y + this.size/2];
        case 1: return [this.square.x - this.pad/2 + this.size/4, this.square.y - this.pad/2];
        case 2: return [this.square.x + this.pad/2 + 3*this.size/4, this.square.y - this.pad/2];
        case 3: return [this.square.x + this.size + this.pad, this.square.y + this.size/2];
        case 4: return [this.square.x + this.pad/2 + 3*this.size/4, this.square.y + this.size + this.pad/2];
        case 5: return [this.square.x - this.pad/2 + this.size/4, this.square.y + this.size + this.pad/2];
      }
    }
   
    /* Fills any null neighbors of this tile with ocean tiles */
    generate_ocean(board)
    {
      var neighbors = [];

      for(var i=0; i < 6; i++){          
          if(this.neighbors[i] !== null) continue;          
          var xy = this.get_xy(i);
          var neighbor = new Tile(Catan.OCEAN, 0, this.x+xy[0], this.y+xy[1], board);          
          board[this.x+xy[0]][this.y+xy[1]] = neighbor;
          this.neighbors[i] = neighbor;          
          this.connect(neighbor, i);
          neighbors.push(neighbor);
      }
      
      
      return neighbors;
    }
    
      
    static shortest_path(source, target)
    {        
        var visited = {};        
        return Tile.shortest_path_r(source, target, visited, 0);
    }
    
    static shortest_path_r(source, target, visited, distance)
    {
      // Handle case that a previous neighbor led out of bounds
      if(source == null) return 9999;
     
      // Unwrap vertex object
      if(!source.neighbors) source = source.vertex;
      
      if(source == target) return 0;
      
      var t1 = 9999;
      var t2 = 9999;
      var t3 = 9999;
            
      if(!visited[source.id] || distance < visited[source.id]){
        visited[source.id] = distance + 1;        
        var t1 = 1 + Tile.shortest_path_r(source.neighbors[0], target, visited, distance + 1);
        var t2 = 1 + Tile.shortest_path_r(source.neighbors[1], target, visited, distance + 1);
        var t3 = 1 + Tile.shortest_path_r(source.neighbors[2], target, visited, distance + 1);
      }
      
      return Math.min(t1, Math.min(t2, t3));
    }
    
    /* Returns a string containing the number of pips associated with the given hit value */
    static get_pips(i) {
      switch(i){
        case 2: case 12: return "•";
        case 3: case 11: return "••";
        case 4: case 10: return "•••";
        case 5: case 9: return "••••";
        case 6: case 8: return "•••••";
      }
    }
    
    /* COMMENT */
    constructor(terrain, hit, x, y, board) {        
        //this.edges = [null, null, null, null, null, null];        
        this.neighbors = [null, null, null, null, null, null];
        this.vertices = [null, null, null, null, null, null];
        this.terrain = terrain;
        this.hit = hit;

        // Save logical coordinates and save this tile to the board
        this.x = x;
        this.y = y;
        board[x][y] = this;
        
        this.scale = 1.2;
        this.size = 50 * this.scale;
        this.pad = 5;
        
        // Construct the sprite using a 50x50 hexagon png; scale it as desired
        this.square = new PIXI.Sprite.fromImage('assets/hexagon.png');        
        this.square.scale = new PIXI.Point(this.scale,this.scale);        
        
        // Position the sprite based on logical coordinates of this tile and size of scaled sprite
        this.square.x = x * 4.0/5.0 * this.size + x*this.pad;
        this.square.y = 400 - y * this.size - (x * 1/2 * this.size) - y*this.pad;
        this.square.interactive = true;
        this.square.on("click", function() { console.log("got me: " + terrain + ":" + hit); });
        
        // Generate and position text to display the hit chance/pips
        var text = (terrain == Catan.NONE || terrain == Catan.OCEAN)? "": "" + hit + "\n" + Tile.get_pips(hit);        
        this.text = new PIXI.Text(text, {font : '16px Times New Roman', fill : 0xffffff, align : 'center'});
        this.text.x = this.square.x + this.size/4;
        this.text.y = this.square.y;
        
        switch(terrain)
        {
          case Catan.NONE : this.square.tint = 0xf4a460; break;
          case Catan.ORE  : this.square.tint = 0x666666; break;
          case Catan.WOOD : this.square.tint = 0x003200; break;
          case Catan.WOOL : this.square.tint = 0x006400; break;
          case Catan.GRAIN: this.square.tint = 0xffff00; break;          
          case Catan.BRICK: this.square.tint = 0x660000; break;
          case Catan.OCEAN: this.square.tint = 0x0000ff; break;
          default         : this.square.tint = 0x888888; break;
        }
    }
    
    /* Returns the offset leading to a neighbor in the specified direction */
    get_xy(neighbor)
    {
      switch(neighbor){
        case 0 : return [-1, 1];
        case 1 : return [0, 1];
        case 2 : return [1, 0];
        case 3 : return [1, -1];
        case 4 : return [0, -1];
        case 5 : return [-1, 0];
        default: return [0, 0];
      }
    }
    
    /* Generates up to 6 neighboring tiles, then connects and returns them */
    generate_neighbors(tile_pool, chit_pool, board)
    {
        var ret = [];
        
        // Generate neighbors in directions 0-5 (see class comment)
        for(var i=0; i < 6; i++){
          
          // No tiles left
          if(tile_pool.length <= 0) break;
          
          // Already a neighbor at this index
          if(this.neighbors[i] !== null) continue;
          
          // Get a terrain type, chit, and offset (special case: always use 0 for desert)
          var terrain = tile_pool.pop();          
          var chit = (terrain === Catan.NONE)? 0: chit_pool.pop();          
          var xy = this.get_xy(i);
                    
          // Construct the new neighbor, add it to the return array, and connect them
          var neighbor = new Tile(terrain, chit, this.x+xy[0], this.y+xy[1], board);          
          ret.push(neighbor);
          this.connect_both(neighbor, i);
        }
        
        // After all neighbors are generated, connect them to each other
        for(var i=0; i<6; i++)
        {
          var tile1 = this.neighbors[i];
          var tile2 = this.neighbors[(i+1)%6];
          
          if(tile1 && tile2)
            tile1.connect_both(tile2, (i+2)%6);
        }
        
        // Return any newly generated neighbors
        return ret;
    }

    generate_vertices()
    {
      // Construct vertices or use existing reference      
      for(var i=0; i<6; i++)
      {          
        var tile1 = this.neighbors[i];           // +4%6 yields vertex
        var tile2 = this.neighbors[(i + 5)%6]; // +2%6 yields vertex
        
        if(tile1 && tile1.vertices[(i+4)%6])
          this.vertices[i] = tile1.vertices[(i+4)%6];
        else if(tile2 && tile2.vertices[(i+2)%6])
          this.vertices[i] = tile2.vertices[(i+2)%6];
        else
          this.vertices[i] = new Vertex();
      }
    }
    
    // For even vertices:  0 = W; 1 = NE; 2 = SE
    // For odd vertices:   0 = E; 1 = SW; 2 = NW
    /* Completes the graph by connecting neighboring vertices via the 'neighbors' property */
    connect_vertices()
    {
      // TODO: Clean this up a little? Put it in a loop
      // Neighbor (i*2)%3 comes from a different tile: it should reference this.neighbors[i].vertices[(i+5)%6]
      //Remaining two neighbors are (i+1)%6 and  (i+5)%6, in that order except for 2 and 5
      // 0: 1,5
      // 1: 2,0
      // 2: 1,3 (swapped?)
      // 3: 4,2 
      // 4: 5,3
      // 5: 4,0 (swapped?)
      
      this.vertices[0].neighbors[0] = this.neighbors[0]? {"vertex": this.neighbors[0].vertices[5], "state": Catan.NONE}: null;
      this.vertices[0].neighbors[1] =                    {"vertex": this.vertices[1], "state": Catan.NONE};
      this.vertices[0].neighbors[2] =                    {"vertex": this.vertices[5], "state": Catan.NONE};
      
      this.vertices[1].neighbors[0] =                    {"vertex": this.vertices[2], "state": Catan.NONE};
      this.vertices[1].neighbors[1] =                    {"vertex": this.vertices[0], "state": Catan.NONE};
      this.vertices[1].neighbors[2] = this.neighbors[1]? {"vertex": this.neighbors[1].vertices[0], "state": Catan.NONE}: null;
      
      this.vertices[2].neighbors[0] =                    {"vertex": this.vertices[1], "state": Catan.NONE};
      this.vertices[2].neighbors[1] = this.neighbors[2]? {"vertex": this.neighbors[2].vertices[1], "state": Catan.NONE}: null;
      this.vertices[2].neighbors[2] =                    {"vertex": this.vertices[3], "state": Catan.NONE};
      
      this.vertices[3].neighbors[0] = this.neighbors[3]? {"vertex": this.neighbors[3].vertices[2], "state": Catan.NONE}: null;
      this.vertices[3].neighbors[1] =                    {"vertex": this.vertices[4], "state": Catan.NONE};
      this.vertices[3].neighbors[2] =                    {"vertex": this.vertices[2], "state": Catan.NONE};
      
      this.vertices[4].neighbors[0] =                    {"vertex": this.vertices[5], "state": Catan.NONE};
      this.vertices[4].neighbors[1] =                    {"vertex": this.vertices[3], "state": Catan.NONE};
      this.vertices[4].neighbors[2] = this.neighbors[4]? {"vertex": this.neighbors[4].vertices[3], "state": Catan.NONE}: null;

      this.vertices[5].neighbors[0] =                    {"vertex": this.vertices[4], "state": Catan.NONE};
      this.vertices[5].neighbors[1] = this.neighbors[5]? {"vertex": this.neighbors[5].vertices[4], "state": Catan.NONE}: null;
      this.vertices[5].neighbors[2] =                    {"vertex": this.vertices[0], "state": Catan.NONE};      
    }
    
    /* Connects this tile to the specified tile and vice versa */
    connect_both(tile, dir){
      if(!tile) return;
      
      this.connect(tile, dir);
      tile.connect(this, (dir + 3) % 6 );      
    }

    /* Connects this tile to the specified tile using the specified direction */
    connect(tile, dir)
    {
      // Use the existing edge reference if possible, otherwise construct a new edge      
      this.neighbors[dir] = tile;            
    }
}