var raf = require('./raf');
var player = require('./player');
var key = require('./keys');
var particles = require('./particles');
var enemies = require('./enemies');
var collisions = require('./collisions');

var canvas = document.querySelector('#game');
var ctx = canvas.getContext('2d');

raf.start(function(elapsed) {
    player.gravity(elapsed);
    if (key.up()) {
        player.up(elapsed);
        particles.createParticles(player.x + player.width / 2, player.y + player.height, player.angle, Math.PI / 10, 10, 10);
    } else {
        player.move(elapsed);
    }

    if (key.right()) {
        player.right(elapsed);
    }
    if (key.left()) {
        player.left(elapsed);
    }

    collisions.check(player, particles, enemies);

    // Clear the screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    enemies.loop(elapsed, ctx, player.offsetX, player.offsetY);
    particles.draw(elapsed, ctx, player);
    player.draw(elapsed, ctx);

});
