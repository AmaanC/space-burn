var enemies = [];

var rnd = function() {
    return Math.random();
};
var either = function(a, b) {
    return rnd() < 0.5 ? a : b;
};

var SPAWN_RANGE = 100;
var MIN_SPEED = 0.3, MAX_SPEED = 2;
var MAX_WIDTH = 50, MAX_HEIGHT = 50;
var MIN_WIDTH = 5, MIN_HEIGHT = 5;
var WIDTH = 800, HEIGHT = 600;

var spawn = function(n) {
    console.log('Spawned enemies:', n);
    var obj, targetY, targetX;
    for (var i = 0; i < n; i++) {
        obj = {
            x: (either(-1, 1) * SPAWN_RANGE * rnd()) + (either(0, 1) * WIDTH),
            y: (either(-1, 1) * SPAWN_RANGE * rnd()) + (either(0, 1) * HEIGHT),
            width: rnd() * (MAX_WIDTH - MIN_WIDTH) + MIN_WIDTH,
            height: rnd() * (MAX_HEIGHT - MIN_HEIGHT) + MIN_HEIGHT,
            speed: rnd() * (MAX_SPEED - MIN_SPEED) + MIN_SPEED
        };
        targetY = rnd() * WIDTH;
        targetX = rnd() * HEIGHT;
        obj.angle = Math.atan2(targetY - obj.y, targetX - obj.x);
        enemies.push(obj);
    }
};

var draw = function(elapsed, ctx) {
    var enemy;
    for (var i = 0, len = enemies.length; i < len; i++) {
        enemy = enemies[i];
        enemy.x += Math.cos(enemy.angle) * enemy.speed;
        enemy.y += Math.sin(enemy.angle) * enemy.speed;
        ctx.fillStyle = 'red';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    }
};


module.exports = {
    draw: draw,
    array: enemies,
    spawn: spawn
};