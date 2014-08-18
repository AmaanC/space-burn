var player = {};
player.x = 0;
player.y = 0;
player.width = 10;
player.height = 30;
player.angle = 0;

var speed = 0; // The current speed
var acc = 5; // Acceleration
var lim = 10; // Speed limit
var dSpeed;
var dX = 0, dY = 0;
player.gravity = function(elapsed) {
    dY -= 0.1;
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
    console.log(player.x, player.y);
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
};
player.friction = function(elapsed) {
    console.log('Friction:', speed);
    // speed -= 1 * acc;
    if (speed < 0) {
        speed = 0;
    }
    player.move(elapsed); // Try commenting this out. It's fun!
};
player.right = function(elapsed) {
    player.angle += elapsed * 7;
};
player.left = function(elapsed) {
    player.angle -= elapsed * 7;
};
player.flip = function() {
    player.angle += Math.PI;
};

player.draw = function(elapsed, ctx) {
    ctx.save();
    ctx.translate((player.x + player.width) / 2, (player.y + player.height) / 2);
    ctx.rotate(player.angle);
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
    // Flames
    ctx.fillStyle = 'red';
    ctx.fillRect(-player.width / 2, player.height / 2, player.width, 5);
    ctx.restore();
};

module.exports = player;
