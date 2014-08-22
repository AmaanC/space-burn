var particles = require('./particles');

var player = {};
player.x = 0;
player.y = 0;
player.width = 10;
player.height = 30;
player.angle = 0;

// Half width, half height
var hW = player.width / 2;
var hH = player.height / 2;

var speed = 0; // The current speed
var dSpeed;
var dX = 0, dY = 0;

// YOU CAN CONFIGURE THESE! --------------------------
var acc = 7; // Acceleration
var lim = 8; // Speed limit
var turnSpeed = 3;
var grav = 0.075;
// NO MORE CONFIGURING! ------------------------------

player.gravity = function(elapsed) {
    dY -= grav;
};
player.move = function(elapsed) {
    player.x += dX;
    player.y -= dY;
    dX *= 0.99;
    dY *= 0.99;
};
player.up = function(elapsed) {
    speed += acc;
    dSpeed = elapsed * speed;
    // console.log(player.x, player.y);
    // console.log(Math.sin(player.angle) * dSpeed, Math.cos(player.angle) * dSpeed);
    dX += Math.sin(player.angle) * dSpeed;
    dY += Math.cos(player.angle) * dSpeed;
    player.move(elapsed);
    if (speed > lim) {
        speed = lim;
    }
    else if (speed < -lim) {
        speed = -lim;
    }

    particles.createParticles(player.x + hW, player.y + player.height, player.angle, Math.PI/10, 10, 10);
};
player.right = function(elapsed) {
    player.angle += elapsed * turnSpeed * Math.PI;
};
player.left = function(elapsed) {
    player.angle -= elapsed * turnSpeed * Math.PI;
};
player.flip = function() {
    player.angle += Math.PI;
};

player.draw = function(elapsed, ctx) {
    particles.draw(ctx, player);
    ctx.save();
    ctx.fillStyle = 'black';
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.rotate(player.angle);
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
    // Flames
    ctx.fillStyle = 'red';
    ctx.fillRect(-player.width / 2, player.height / 2, player.width, 5);
    ctx.restore();

    // ctx.fillRect(player.x, 300, 10, 10);
};

module.exports = player;
