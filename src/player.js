var particles = require('./particles');
var SAT = require('./sat.min.js');

var player = new SAT.Polygon(new SAT.V(), [
  new SAT.V(),
  new SAT.V(0, 30),
  new SAT.V(10, 30),
  new SAT.V(10, 0)
]);

player.width = 10;
player.height = 30;
player.setAngle(0);


var rect = new SAT.Polygon(new SAT.V(), [
    new SAT.V(),
    new SAT.V(0, 300),
    new SAT.V(800, 300),
    new SAT.V(800, 0)
]);
rect.width = 800;
rect.height = 300;
rect.setAngle(Math.PI/6);
window.rect = rect;


// Half width, half height
var hW = player.width / 2;
var hH = player.height / 2;

var speed = 0; // The current speed
var dSpeed;
var dX = 0, dY = 0;

// YOU CAN CONFIGURE THESE! --------------------------
var acc = 7; // Acceleration
var lim = 8; // Speed limit
var turnSpeed = 2.2;
var grav = 0.08;
// NO MORE CONFIGURING! ------------------------------

player.gravity = function(elapsed) {
    dY -= grav;
};
player.move = function(elapsed) {
    player.pos.x += dX;
    player.pos.y -= dY;
    dX *= 0.99;
    dY *= 0.99;
};
player.up = function(elapsed) {
    speed += acc;
    dSpeed = elapsed * speed;
    // console.log(player.pos.x, player.pos.y);
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

    particles.createParticles(player.pos.x + hW, player.pos.y + player.height, player.angle, Math.PI / 10, 10, 10);
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
    ctx.translate(rect.pos.x, rect.pos.y);
    ctx.rotate(rect.angle);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = SAT.testPolygonPolygon(player, rect) ? 'green' : 'black';
    ctx.translate(player.pos.x + hW, player.pos.y + hH);
    ctx.rotate(player.angle);
    ctx.fillRect(-hW, -hH, player.width, player.height);
    // Flames
    ctx.fillStyle = 'red';
    ctx.fillRect(-hW, hH, player.width, 5);
    ctx.restore();

    // ctx.fillRect(player.pos.x, player.pos.y, 10, 10);
};
module.exports = player;
