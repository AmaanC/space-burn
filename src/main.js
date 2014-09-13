var raf = require('./raf');
var player = require('./player');
var key = require('./keys');
var enemies = require('./enemies');

var canvas = document.querySelector('#game');
var ctx = canvas.getContext('2d');

raf.start(function(elapsed) {
    player.gravity(elapsed);
    if (key.up()) {
        player.up(elapsed);
    } else {
        // console.log(player.x, player.y);
        player.move(elapsed);
    }

    if (key.right()) {
        player.right(elapsed);
    }
    if (key.left()) {
        player.left(elapsed);
    }

    if (enemies.array.length < 5) {
        enemies.spawn(Math.random() * 50);
    }

    // Clear the screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    enemies.draw(elapsed, ctx, player.offsetX, player.offsetY);
    player.draw(elapsed, ctx);
});
