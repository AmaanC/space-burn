var raf = require('./raf');
var player = require('./player');
var key = require('./keys');
console.log(key);

var canvas = document.querySelector('#game');
var ctx = canvas.getContext('2d');

raf.start(function(elapsed) {
    // Clear the screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    player.draw(elapsed, ctx);
    player.gravity(elapsed);
    if (key.up()) {
        player.up(elapsed);
    } else {
        player.friction(elapsed);
    }

    if (key.right()) {
        player.right(elapsed);
    }
    if (key.left()) {
        player.left(elapsed);
    }
});
