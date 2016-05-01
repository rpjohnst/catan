// Flag for whether audio is currently muted or not
var muted;

// PIXI stage for rendering
var stage;

// PIXI renderer
var renderer;

// Current catan game instance
var catan;

// TODO: Delete these. Temporary containers for testing game with basic input
var tX;
var tY;
var tDir;

//TODO delete this after handling input properly
function popTest()
{
  tX = parseInt($('#x').val()) || 0;
  tY = parseInt($('#y').val()) || 0;
  tDir = parseInt($('#dir').val()) || 0;
}

//TODO delete this after handling input properly
function cityMenu()
{
  var result = "";
  for(var i=0; i<catan.settlements.length; i++)
  {
    var settlement = catan.settlements[i];
    if(settlement.owner == catan.current_player && settlement.worth == 1)
    {
      result += ("<button onclick=\"catan.upgrade_settlement(" + i + "); $('#citymenu').html(''); displayResources();\">Settlement " + i + "</button>");
    }
  }
  $('#citymenu').html(result);
}

// TODO nicely formatted resource display
function displayResources()
{
  $('#resources').html("ore,wood,wool,grain,brick:<br/>" + catan.current_player.resources);
}

/*
  On document load, instantiate all member variables and prepare but don't
  start the initial game instance.
*/
$(function() {
    muted = false;
    stage = new PIXI.Container();
    stage.interactive = true;
    renderer = PIXI.autoDetectRenderer(525, 600, null);
    document.body.appendChild(renderer.view);
    catan = new Catan(stage);
    requestAnimationFrame(animate);
    
    catan.start_game();
    displayResources();
});

/*
  Main draw loop. Renders the canvas repeatedly.
*/
function animate() {
    requestAnimationFrame(animate);
    renderer.render(stage);    
}

/*
  Mutes/unmutes music and sound effects
*/
function toggle_sound(){  
  // Toggle muted flag
  muted = !muted;
  
  // Apply to all audio elements
  $('audio').each(function(){
    $(this)[0].volume = muted? 0: 1;
  });
}

// via http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }