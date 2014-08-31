var enemies = [];

var either = function(a, b) {
    return Math.random() < 0.5 ? a : b;
};

var SPAWN_RANGE = 100;
var MAX_SPEED = 10;
var MAX_WIDTH = 50, MAX_HEIGHT = 50;
var MIN_WIDTH = 5, MIN_HEIGHT = 5;
var WIDTH = 800, HEIGHT = 600;

var spawn = function(n) {
    console.log('Spawned enemies:', n);
    var obj;
    for (var i = 0; i < n; i++) {
        obj = {
            x: (either(-1, 1) * SPAWN_RANGE * Math.random()) + (either(0, 1) * WIDTH),
            y: (either(-1, 1) * SPAWN_RANGE * Math.random()) + (either(0, 1) * HEIGHT),
            width: Math.random() * (MAX_WIDTH - MIN_WIDTH) + MIN_WIDTH,
            height: Math.random() * (MAX_HEIGHT - MIN_HEIGHT) + MIN_HEIGHT,
            speed: Math.random() * MAX_SPEED
        };
        obj.angle = Math.atan2(HEIGHT / 2 - obj.y, WIDTH / 2 - obj.x);
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