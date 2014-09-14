(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var loader = require('./loader.js');

var raf = require('./raf');
var player = require('./player');
var key = require('./keys');
var particles = require('./particles');
var enemies = require('./enemies');
var collisions = require('./collisions');
var menus = require('./menus.js');

var canvas = document.querySelector('#game');
var ctx = canvas.getContext('2d');
loader.done(function() {

    window.state = 'menu';
    raf.start(function(elapsed) {
        if (window.state === 'menu') {
            menus.drawMenu(ctx);
        }
        else if (window.state === 'game') {
            player.gravity(elapsed);
            if (key.up()) {
                player.up(elapsed);
                particles.createParticles(player.x + player.width / 2, player.y + player.height / 2, player.angle, Math.PI / 10, 10, 10);
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
            ctx.fillStyle = '#0f0d20';
            ctx.fillRect(0, 0, 800, 600);

            enemies.loop(elapsed, ctx, player.offsetX, player.offsetY);
            particles.draw(elapsed, ctx, player);
            player.draw(elapsed, ctx);
            menus.ingame(ctx, player.fuel, player.health, player.score);

            player.score += 0.1;

            if (player.health <= 0 || player.fuel <= 0) {
                window.state = 'end';
            }
        }
        else if (window.state === 'end') {
            menus.drawEnd(ctx, player.score);
        }

    });
});

var changeState = function() {
    console.log('Called');
    if (window.state === 'menu') {
        window.state = 'game';
    }
    else if (window.state === 'end') {
        window.state = 'game';
        player.score = 0;
        player.reset();
        particles.reset();
        enemies.reset();
    }
};

canvas.addEventListener('click', changeState, false);
document.body.addEventListener('keydown', function(e) {
    if (e.keyCode === 13) {
        changeState();
    }
}, false);

},{"./collisions":2,"./enemies":3,"./keys":4,"./loader.js":5,"./menus.js":6,"./particles":7,"./player":8,"./raf":9}],2:[function(require,module,exports){
var playerHitBox = {
    x: 375,
    y: 270,
    width: 50,
    height: 60
};
var angledCollision = function(player, enemy) {
    var colliding = false;
    colliding = aabb(playerHitBox, enemy);
    return colliding;
};

var aabb = function(a, b) {
    if (
        Math.abs(a.x + a.width / 2 - b.x - b.width / 2) > (a.width + b.width) / 2 ||
        Math.abs(a.y + a.height / 2 - b.y - b.height / 2) > (a.height + b.height) / 2
    ) {
        return false;
    }
    return true;
};

var inArea = function(area, array, respColliding, respNotColliding) {
    var ret = [];
    var curElem;
    for (var i = 0; i < array.length; i++) {
        curElem = array[i];
        if (aabb(area, curElem)) {
            ret.push(curElem);
            if (respColliding) {
                respColliding(curElem);
            }
        }
        else if (respNotColliding) {
            respNotColliding(curElem);
        }
    }
    return ret;
};

var playerArea = {
    x: 325,
    y: 225,
    width: 150,
    height: 150
};

var camera = {
    x: -400,
    y: -300,
    width: 1600,
    height: 1200
};

var check = function(player, particlesModule, enemiesModule) {
    var particles = particlesModule.array;
    var enemies = enemiesModule.array;
    // Manage enemy spawning
    var enemiesInView = inArea(camera, enemies, undefined, function(enemy) {
        enemy.alive = false;
    });
    if (enemiesInView.length < 30) {
        enemiesModule.spawn(Math.random() * 100);
    }

    // Collisions between the player and rocks
    var enemiesToTest = inArea(playerArea, enemies);
    for (var i = 0; i < enemiesToTest.length; i++) {
        if (angledCollision(player, enemiesToTest[i])) {
            // console.log('HIT');
            enemiesToTest[i].alive = false;
            if (enemiesToTest[i].type === 'power-icon.png') {
                player.fuel += 10;
            }
            else {
                player.health -= (enemiesToTest[i].width * enemiesToTest[i].height) / 100;
            }
        }
    }

    // Check for collisions between particles and enemies
    for (var i = 0; i < particles.length; i++) {
        inArea(particles[i], enemies, function(enemy) {
            if (particles[i].alive) {
                enemy.alive = false;
                player.score += (enemy.width * enemy.height) / 100
            }
        });
    }
};

module.exports = {
    check: check
};
},{}],3:[function(require,module,exports){
var enemies = [];

var loader = require('./loader.js');

var rnd = function() {
    return Math.random();
};
var choose = function() {
    return arguments[Math.floor(rnd() * arguments.length)];
};

var SPAWN_RANGE = 100;
var MIN_SPEED = 0.3, MAX_SPEED = 2;
var WIDTH = 800, HEIGHT = 600;

var spawn = function(n) {
    // console.log('Spawned enemies:', n);
    var obj, targetY, targetX;
    var signX, signY, posX, posY;
    for (var i = 0; i < n; i++) {
        obj = {
            x: (rnd() * WIDTH),
            y: (rnd() * HEIGHT),
            speed: rnd() * (MAX_SPEED - MIN_SPEED) + MIN_SPEED,
            type: choose.apply(this, loader.get('rock').concat(loader.get('power-icon'))),
            alive: true
        };
        targetY = rnd() * WIDTH;
        targetX = rnd() * HEIGHT;
        obj.angle = rnd() * Math.PI * 2;
        obj.width = loader.images[obj.type].width;
        obj.height = loader.images[obj.type].height;

        if (rnd() > 0.5) {
            obj.x += choose(-1, 1) * (WIDTH + obj.width);
        }
        else {
            obj.y += choose(-1, 1) * (HEIGHT + obj.height);
        }
        enemies.push(obj);
    }
};

var loop = function(elapsed, ctx, offsetX, offsetY) {
    var enemy;
    for (var i = enemies.length - 1; i >= 0; i--) {
        enemy = enemies[i];
        if (enemy.alive) {
            enemy.x += Math.cos(enemy.angle) * enemy.speed - offsetX;
            enemy.y += Math.sin(enemy.angle) * enemy.speed - offsetY;
            ctx.fillStyle = 'red';
            ctx.drawImage(loader.images[enemy.type], enemy.x, enemy.y);
        }
        else {
            enemies.splice(i, 1);
        }
    }
};


module.exports = {
    loop: loop,
    array: enemies,
    spawn: spawn,
    reset: function() {
        enemies.length = 0;
    }
};
},{"./loader.js":5}],4:[function(require,module,exports){
var player = require('./player');
var keys = {};
document.body.addEventListener('keydown', function(e) {
    if (e.keyCode === 32) {
        player.flip();
        e.preventDefault();
    }
    else if (e.keyCode >= 37 && e.keyCode <= 40) {
        e.preventDefault();
    }
    keys[e.keyCode] = true;
});
document.body.addEventListener('keyup', function(e) {
    keys[e.keyCode] = false;
});

module.exports = {
    left: function() {
        return keys[37];
    },
    up: function() {
        return keys[38];
    },
    right: function() {
        return keys[39];
    },
    down: function() {
        return keys[40];
    },
    flip: function() {
        return keys[32];
    }
};

},{"./player":8}],5:[function(require,module,exports){
var imageNames = [
    'astro.png',
    'astro-flying.png',
    'health-bar-icon.png',
    'logo.png',
    'power-bar-icon.png',
    'power-icon.png',
    'rock-5.png',
    'rock-alt-5.png',
    'rock-odd-1.png',
    'rock-odd-3.png',
    'text-credits.png',
    'text-play.png'
];

var images = {};
var loaded = 0;
var done = function(cb) {
    for (var i = 0; i < imageNames.length; i++) {
        images[imageNames[i]] = new Image();
        images[imageNames[i]].src = 'images/' + imageNames[i];
        images[imageNames[i]].onload = function() {
            loaded++;
            if (loaded === imageNames.length) {
                cb();
            }
        }
    }
};

module.exports = {
    list: imageNames,
    images: images,
    done: done,
    get: function(string) {
        var ret = [];
        for(var i = 0; i < imageNames.length; i++) {
            if (imageNames[i].indexOf(string) !== -1) {
                ret.push(imageNames[i]);
            }
        }
        return ret;
    }
};
},{}],6:[function(require,module,exports){
var loader = require('./loader.js');
var text = require('./text.js');

module.exports = {
    drawMenu: function(ctx) {
        ctx.fillStyle = '#0f0d20';
        ctx.fillRect(0, 0, 800, 600);

        ctx.drawImage(loader.images['logo.png'], 314, 180);
        ctx.drawImage(loader.images['text-play.png'], 333, 300);
        ctx.drawImage(loader.images['text-credits.png'], 287, 500);
    },
    drawEnd: function(ctx, score) {
        ctx.fillStyle = '#0f0d20';
        ctx.fillRect(0, 0, 800, 600);
        text.write('The end! You scored ' + Math.round(score) + ' points!', 'center', 300, function() {
            ctx.fillStyle = 'white';
            ctx.font = '32pt Arial';
        });
        text.write('Click to play again', 'center', 500, function() {
            ctx.fillStyle = 'white';
            ctx.font = '22pt Arial';
        });
    },
    ingame: function (ctx, fuel, health, score) {
        ctx.drawImage(loader.images['power-bar-icon.png'], 30, 500);
        ctx.fillStyle = 'orange';
        ctx.fillRect(30, 490 - fuel, 20, fuel);


        ctx.drawImage(loader.images['health-bar-icon.png'], 70, 500);
        ctx.fillStyle = 'red';
        ctx.fillRect(70, 490 - health, 20, health);

        ctx.font = '12pt Arial';
        ctx.fillStyle = 'white';
        ctx.fillText('Score: ' + Math.round(score), 27, 550);
    }
};
},{"./loader.js":5,"./text.js":10}],7:[function(require,module,exports){
var particles = [];
var W = 7, H = 7;
var DEC_RATE = 0.1; // Default decrease rate. Higher rate -> particles go faster
var Particle = function(x, y, speed, decRate) {
    this.alive = true;
    this.x = x;
    this.y = y;
    this.width = W;
    this.height = H;
    this.angle = 0;
    this.speed = speed;
    this.opacity = 1;
    this.decRate = decRate || DEC_RATE;
    this.delay = Math.ceil(Math.random() * 10);
    this.loop = function(ctx, player) {
        if (this.delay > 0) {
            if (this.delay <= 1) {
                this.angle = player.angle - this.range + (Math.random() * 2 * this.range);;
            }
            this.delay--;
            return false;
        }
        this.x += Math.sin(-this.angle) * speed;
        this.y += Math.cos(-this.angle) * speed;
        this.opacity -= this.decRate;
        if (this.opacity <= 0) {
            this.opacity = 0;
            this.alive = false;
        }
        // Draw
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    };
};

// x, y are fixed
// Particles are created from angle-range to angle+range
// speed is fixed
var angle = 0;
var createParticles = function(x, y, playerAngle, range, speed, n) {
    // console.log('Creating', particles);
    for (var i = 0; i < n; i++) {
        if (particles[i] && !particles[i].alive || !particles[i]) {
            particles[i] = new Particle(x, y, speed);
            particles[i].range = range;
            particles[i].player = true;
        }
    }
};

var draw = function(elapsed, ctx, player) {
    for (var i = 0; i < particles.length; i++) {
        particles[i].loop(ctx, player);
    }
};

module.exports = {
    createParticles: createParticles,
    draw: draw,
    array: particles,
    reset: function() {
        particles.length = 0;
    }
};

},{}],8:[function(require,module,exports){
var Transform = require('./transform.js');
var canvas = document.querySelector('#game');

window.player = {};

player.idle = new Image();
player.idle.src = 'images/astro.png';
player.flying = new Image();
player.flying.src = 'images/astro-flying.png';
player.state = 'idle';
player.fuel = 100;
player.health = 100;
player.score = 0;

player.width = 52;
player.height = 60;
player.x = (canvas.width - player.width) / 2;
player.y = (canvas.height - player.height) / 2;
player.angle = 0;

player.offsetX = player.offsetY = 0;


// Half width, half height
var hW = player.width / 2;
var hH = player.height / 2;

var speed = 0; // The current speed
var dSpeed;
var dX = 0, dY = 0;

// YOU CAN CONFIGURE THESE! --------------------------
var acc = 7; // Acceleration
var lim = 10; // Speed limit
var turnSpeed = 2.2;
var grav = 0.08;
// NO MORE CONFIGURING! ------------------------------

player.reset = function() {
    player.angle = player.offsetX = player.offsetY = dX = dY = speed = dSpeed = 0;
    player.health = player.fuel = 100;
    player.move();
};

player.gravity = function(elapsed) {
    dY -= grav;
};
player.move = function(elapsed, flying) {
    player.offsetX = dX;
    player.offsetY = -dY;
    dX *= 0.99;
    dY *= 0.99;

    if (!flying) {
        player.state = 'idle';
    }
};
player.up = function(elapsed) {
    player.fuel -= 0.2;
    player.state = 'flying';
    speed += acc;
    dSpeed = elapsed * speed;
    // console.log(player.x, player.y);
    // console.log(Math.sin(player.angle) * dSpeed, Math.cos(player.angle) * dSpeed);
    dX += Math.sin(player.angle) * dSpeed;
    dY += Math.cos(player.angle) * dSpeed;
    player.move(elapsed, true);
    if (speed > lim) {
        speed = lim;
    }
    else if (speed < -lim) {
        speed = -lim;
    }

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

// var t = new Transform();
player.draw = function(elapsed, ctx) {
    // ctx.fillRect(375, 270, 50, 60);
    // Player
    ctx.save();
    ctx.translate(player.x + hW, player.y + hH);
    // t.translate(player.x + hW, player.y + hH);
    ctx.rotate(player.angle);
    // t.rotate(player.angle);
    ctx.drawImage(player[player.state], -hW, -hH);
    ctx.restore();

    // player.topLeft = t.transformPoint(-hW, -hH);
    // player.topRight = t.transformPoint(hW, -hH);
    // player.bottomLeft = t.transformPoint(-hW, hH);
    // player.bottomRight = t.transformPoint(hW, hH);
    // t.reset();

};
module.exports = player;

},{"./transform.js":11}],9:[function(require,module,exports){
// Holds last iteration timestamp.
var time = 0;

/**
 * Calls `fn` on next frame.
 *
 * @param  {Function} fn The function
 * @return {int} The request ID
 * @api private
 */
function raf(fn) {
  return window.requestAnimationFrame(function() {
    var now = Date.now();
    var elapsed = now - time;

    if (elapsed > 999) {
      elapsed = 1 / 60;
    } else {
      elapsed /= 1000;
    }

    time = now;
    fn(elapsed);
  });
}

module.exports = {
  /**
   * Calls `fn` on every frame with `elapsed` set to the elapsed
   * time in milliseconds.
   *
   * @param  {Function} fn The function
   * @return {int} The request ID
   * @api public
   */
  start: function(fn) {
    return raf(function tick(elapsed) {
      fn(elapsed);
      raf(tick);
    });
  },
  /**
   * Cancels the specified animation frame request.
   *
   * @param {int} id The request ID
   * @api public
   */
  stop: function(id) {
    window.cancelAnimationFrame(id);
  }
};

},{}],10:[function(require,module,exports){
var canvas = document.getElementsByTagName('canvas')[0];
var ctx = canvas.getContext('2d');
module.exports.write = function (text, x, y, preFunc, stroke){
    if(preFunc){
        ctx.save();
        preFunc(ctx);
    }

    var xPos = x;
    if(x === 'center'){
        xPos = (canvas.width - ctx.measureText(text).width) / 2;
    }

    if(stroke){
        ctx.strokeText(text, xPos, y);
    }
    else {
        ctx.fillText(text, xPos, y);
    }

    if(preFunc){
        ctx.restore();
    }
};
},{}],11:[function(require,module,exports){
// Last updated November 2011
// By Simon Sarris
// www.simonsarris.com
// sarris@acm.org
//
// Free to use and distribute at will
// So long as you are nice to people, etc

// Simple class for keeping track of the current transformation matrix

// For instance:
//    var t = new Transform();
//    t.rotate(5);
//    var m = t.m;
//    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);

// Is equivalent to:
//    ctx.rotate(5);

// But now you can retrieve it :)

// Remember that this does not account for any CSS transforms applied to the canvas

function Transform() {
  this.reset();
}

Transform.prototype.reset = function() {
  this.m = [1,0,0,1,0,0];
};

Transform.prototype.multiply = function(matrix) {
  var m11 = this.m[0] * matrix.m[0] + this.m[2] * matrix.m[1];
  var m12 = this.m[1] * matrix.m[0] + this.m[3] * matrix.m[1];

  var m21 = this.m[0] * matrix.m[2] + this.m[2] * matrix.m[3];
  var m22 = this.m[1] * matrix.m[2] + this.m[3] * matrix.m[3];

  var dx = this.m[0] * matrix.m[4] + this.m[2] * matrix.m[5] + this.m[4];
  var dy = this.m[1] * matrix.m[4] + this.m[3] * matrix.m[5] + this.m[5];

  this.m[0] = m11;
  this.m[1] = m12;
  this.m[2] = m21;
  this.m[3] = m22;
  this.m[4] = dx;
  this.m[5] = dy;
};

Transform.prototype.invert = function() {
  var d = 1 / (this.m[0] * this.m[3] - this.m[1] * this.m[2]);
  var m0 = this.m[3] * d;
  var m1 = -this.m[1] * d;
  var m2 = -this.m[2] * d;
  var m3 = this.m[0] * d;
  var m4 = d * (this.m[2] * this.m[5] - this.m[3] * this.m[4]);
  var m5 = d * (this.m[1] * this.m[4] - this.m[0] * this.m[5]);
  this.m[0] = m0;
  this.m[1] = m1;
  this.m[2] = m2;
  this.m[3] = m3;
  this.m[4] = m4;
  this.m[5] = m5;
};

Transform.prototype.rotate = function(rad) {
  var c = Math.cos(rad);
  var s = Math.sin(rad);
  var m11 = this.m[0] * c + this.m[2] * s;
  var m12 = this.m[1] * c + this.m[3] * s;
  var m21 = this.m[0] * -s + this.m[2] * c;
  var m22 = this.m[1] * -s + this.m[3] * c;
  this.m[0] = m11;
  this.m[1] = m12;
  this.m[2] = m21;
  this.m[3] = m22;
};

Transform.prototype.translate = function(x, y) {
  this.m[4] += this.m[0] * x + this.m[2] * y;
  this.m[5] += this.m[1] * x + this.m[3] * y;
};

Transform.prototype.scale = function(sx, sy) {
  this.m[0] *= sx;
  this.m[1] *= sx;
  this.m[2] *= sy;
  this.m[3] *= sy;
};

Transform.prototype.transformPoint = function(px, py) {
  var x = px;
  var y = py;
  px = x * this.m[0] + y * this.m[2] + this.m[4];
  py = x * this.m[1] + y * this.m[3] + this.m[5];
  return [px, py];
};

module.exports = Transform;
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4vc3JjL21haW4iLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy9jb2xsaXNpb25zLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvSlMxM2svMjAxNC9zcmMvZW5lbWllcy5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvc3JjL2tleXMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy9sb2FkZXIuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy9tZW51cy5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvc3JjL3BhcnRpY2xlcy5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvc3JjL3BsYXllci5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvc3JjL3JhZi5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvc3JjL3RleHQuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy90cmFuc2Zvcm0uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBsb2FkZXIgPSByZXF1aXJlKCcuL2xvYWRlci5qcycpO1xuXG52YXIgcmFmID0gcmVxdWlyZSgnLi9yYWYnKTtcbnZhciBwbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpO1xudmFyIGtleSA9IHJlcXVpcmUoJy4va2V5cycpO1xudmFyIHBhcnRpY2xlcyA9IHJlcXVpcmUoJy4vcGFydGljbGVzJyk7XG52YXIgZW5lbWllcyA9IHJlcXVpcmUoJy4vZW5lbWllcycpO1xudmFyIGNvbGxpc2lvbnMgPSByZXF1aXJlKCcuL2NvbGxpc2lvbnMnKTtcbnZhciBtZW51cyA9IHJlcXVpcmUoJy4vbWVudXMuanMnKTtcblxudmFyIGNhbnZhcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNnYW1lJyk7XG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5sb2FkZXIuZG9uZShmdW5jdGlvbigpIHtcblxuICAgIHdpbmRvdy5zdGF0ZSA9ICdtZW51JztcbiAgICByYWYuc3RhcnQoZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgICAgICBpZiAod2luZG93LnN0YXRlID09PSAnbWVudScpIHtcbiAgICAgICAgICAgIG1lbnVzLmRyYXdNZW51KGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAod2luZG93LnN0YXRlID09PSAnZ2FtZScpIHtcbiAgICAgICAgICAgIHBsYXllci5ncmF2aXR5KGVsYXBzZWQpO1xuICAgICAgICAgICAgaWYgKGtleS51cCgpKSB7XG4gICAgICAgICAgICAgICAgcGxheWVyLnVwKGVsYXBzZWQpO1xuICAgICAgICAgICAgICAgIHBhcnRpY2xlcy5jcmVhdGVQYXJ0aWNsZXMocGxheWVyLnggKyBwbGF5ZXIud2lkdGggLyAyLCBwbGF5ZXIueSArIHBsYXllci5oZWlnaHQgLyAyLCBwbGF5ZXIuYW5nbGUsIE1hdGguUEkgLyAxMCwgMTAsIDEwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGxheWVyLm1vdmUoZWxhcHNlZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChrZXkucmlnaHQoKSkge1xuICAgICAgICAgICAgICAgIHBsYXllci5yaWdodChlbGFwc2VkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChrZXkubGVmdCgpKSB7XG4gICAgICAgICAgICAgICAgcGxheWVyLmxlZnQoZWxhcHNlZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbGxpc2lvbnMuY2hlY2socGxheWVyLCBwYXJ0aWNsZXMsIGVuZW1pZXMpO1xuXG4gICAgICAgICAgICAvLyBDbGVhciB0aGUgc2NyZWVuXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJyMwZjBkMjAnO1xuICAgICAgICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIDgwMCwgNjAwKTtcblxuICAgICAgICAgICAgZW5lbWllcy5sb29wKGVsYXBzZWQsIGN0eCwgcGxheWVyLm9mZnNldFgsIHBsYXllci5vZmZzZXRZKTtcbiAgICAgICAgICAgIHBhcnRpY2xlcy5kcmF3KGVsYXBzZWQsIGN0eCwgcGxheWVyKTtcbiAgICAgICAgICAgIHBsYXllci5kcmF3KGVsYXBzZWQsIGN0eCk7XG4gICAgICAgICAgICBtZW51cy5pbmdhbWUoY3R4LCBwbGF5ZXIuZnVlbCwgcGxheWVyLmhlYWx0aCwgcGxheWVyLnNjb3JlKTtcblxuICAgICAgICAgICAgcGxheWVyLnNjb3JlICs9IDAuMTtcblxuICAgICAgICAgICAgaWYgKHBsYXllci5oZWFsdGggPD0gMCB8fCBwbGF5ZXIuZnVlbCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LnN0YXRlID0gJ2VuZCc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAod2luZG93LnN0YXRlID09PSAnZW5kJykge1xuICAgICAgICAgICAgbWVudXMuZHJhd0VuZChjdHgsIHBsYXllci5zY29yZSk7XG4gICAgICAgIH1cblxuICAgIH0pO1xufSk7XG5cbnZhciBjaGFuZ2VTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKCdDYWxsZWQnKTtcbiAgICBpZiAod2luZG93LnN0YXRlID09PSAnbWVudScpIHtcbiAgICAgICAgd2luZG93LnN0YXRlID0gJ2dhbWUnO1xuICAgIH1cbiAgICBlbHNlIGlmICh3aW5kb3cuc3RhdGUgPT09ICdlbmQnKSB7XG4gICAgICAgIHdpbmRvdy5zdGF0ZSA9ICdnYW1lJztcbiAgICAgICAgcGxheWVyLnNjb3JlID0gMDtcbiAgICAgICAgcGxheWVyLnJlc2V0KCk7XG4gICAgICAgIHBhcnRpY2xlcy5yZXNldCgpO1xuICAgICAgICBlbmVtaWVzLnJlc2V0KCk7XG4gICAgfVxufTtcblxuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2hhbmdlU3RhdGUsIGZhbHNlKTtcbmRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAoZS5rZXlDb2RlID09PSAxMykge1xuICAgICAgICBjaGFuZ2VTdGF0ZSgpO1xuICAgIH1cbn0sIGZhbHNlKTtcbiIsInZhciBwbGF5ZXJIaXRCb3ggPSB7XG4gICAgeDogMzc1LFxuICAgIHk6IDI3MCxcbiAgICB3aWR0aDogNTAsXG4gICAgaGVpZ2h0OiA2MFxufTtcbnZhciBhbmdsZWRDb2xsaXNpb24gPSBmdW5jdGlvbihwbGF5ZXIsIGVuZW15KSB7XG4gICAgdmFyIGNvbGxpZGluZyA9IGZhbHNlO1xuICAgIGNvbGxpZGluZyA9IGFhYmIocGxheWVySGl0Qm94LCBlbmVteSk7XG4gICAgcmV0dXJuIGNvbGxpZGluZztcbn07XG5cbnZhciBhYWJiID0gZnVuY3Rpb24oYSwgYikge1xuICAgIGlmIChcbiAgICAgICAgTWF0aC5hYnMoYS54ICsgYS53aWR0aCAvIDIgLSBiLnggLSBiLndpZHRoIC8gMikgPiAoYS53aWR0aCArIGIud2lkdGgpIC8gMiB8fFxuICAgICAgICBNYXRoLmFicyhhLnkgKyBhLmhlaWdodCAvIDIgLSBiLnkgLSBiLmhlaWdodCAvIDIpID4gKGEuaGVpZ2h0ICsgYi5oZWlnaHQpIC8gMlxuICAgICkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxudmFyIGluQXJlYSA9IGZ1bmN0aW9uKGFyZWEsIGFycmF5LCByZXNwQ29sbGlkaW5nLCByZXNwTm90Q29sbGlkaW5nKSB7XG4gICAgdmFyIHJldCA9IFtdO1xuICAgIHZhciBjdXJFbGVtO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY3VyRWxlbSA9IGFycmF5W2ldO1xuICAgICAgICBpZiAoYWFiYihhcmVhLCBjdXJFbGVtKSkge1xuICAgICAgICAgICAgcmV0LnB1c2goY3VyRWxlbSk7XG4gICAgICAgICAgICBpZiAocmVzcENvbGxpZGluZykge1xuICAgICAgICAgICAgICAgIHJlc3BDb2xsaWRpbmcoY3VyRWxlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocmVzcE5vdENvbGxpZGluZykge1xuICAgICAgICAgICAgcmVzcE5vdENvbGxpZGluZyhjdXJFbGVtKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufTtcblxudmFyIHBsYXllckFyZWEgPSB7XG4gICAgeDogMzI1LFxuICAgIHk6IDIyNSxcbiAgICB3aWR0aDogMTUwLFxuICAgIGhlaWdodDogMTUwXG59O1xuXG52YXIgY2FtZXJhID0ge1xuICAgIHg6IC00MDAsXG4gICAgeTogLTMwMCxcbiAgICB3aWR0aDogMTYwMCxcbiAgICBoZWlnaHQ6IDEyMDBcbn07XG5cbnZhciBjaGVjayA9IGZ1bmN0aW9uKHBsYXllciwgcGFydGljbGVzTW9kdWxlLCBlbmVtaWVzTW9kdWxlKSB7XG4gICAgdmFyIHBhcnRpY2xlcyA9IHBhcnRpY2xlc01vZHVsZS5hcnJheTtcbiAgICB2YXIgZW5lbWllcyA9IGVuZW1pZXNNb2R1bGUuYXJyYXk7XG4gICAgLy8gTWFuYWdlIGVuZW15IHNwYXduaW5nXG4gICAgdmFyIGVuZW1pZXNJblZpZXcgPSBpbkFyZWEoY2FtZXJhLCBlbmVtaWVzLCB1bmRlZmluZWQsIGZ1bmN0aW9uKGVuZW15KSB7XG4gICAgICAgIGVuZW15LmFsaXZlID0gZmFsc2U7XG4gICAgfSk7XG4gICAgaWYgKGVuZW1pZXNJblZpZXcubGVuZ3RoIDwgMzApIHtcbiAgICAgICAgZW5lbWllc01vZHVsZS5zcGF3bihNYXRoLnJhbmRvbSgpICogMTAwKTtcbiAgICB9XG5cbiAgICAvLyBDb2xsaXNpb25zIGJldHdlZW4gdGhlIHBsYXllciBhbmQgcm9ja3NcbiAgICB2YXIgZW5lbWllc1RvVGVzdCA9IGluQXJlYShwbGF5ZXJBcmVhLCBlbmVtaWVzKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVuZW1pZXNUb1Rlc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGFuZ2xlZENvbGxpc2lvbihwbGF5ZXIsIGVuZW1pZXNUb1Rlc3RbaV0pKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnSElUJyk7XG4gICAgICAgICAgICBlbmVtaWVzVG9UZXN0W2ldLmFsaXZlID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoZW5lbWllc1RvVGVzdFtpXS50eXBlID09PSAncG93ZXItaWNvbi5wbmcnKSB7XG4gICAgICAgICAgICAgICAgcGxheWVyLmZ1ZWwgKz0gMTA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwbGF5ZXIuaGVhbHRoIC09IChlbmVtaWVzVG9UZXN0W2ldLndpZHRoICogZW5lbWllc1RvVGVzdFtpXS5oZWlnaHQpIC8gMTAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGNvbGxpc2lvbnMgYmV0d2VlbiBwYXJ0aWNsZXMgYW5kIGVuZW1pZXNcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRpY2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpbkFyZWEocGFydGljbGVzW2ldLCBlbmVtaWVzLCBmdW5jdGlvbihlbmVteSkge1xuICAgICAgICAgICAgaWYgKHBhcnRpY2xlc1tpXS5hbGl2ZSkge1xuICAgICAgICAgICAgICAgIGVuZW15LmFsaXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcGxheWVyLnNjb3JlICs9IChlbmVteS53aWR0aCAqIGVuZW15LmhlaWdodCkgLyAxMDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY2hlY2s6IGNoZWNrXG59OyIsInZhciBlbmVtaWVzID0gW107XG5cbnZhciBsb2FkZXIgPSByZXF1aXJlKCcuL2xvYWRlci5qcycpO1xuXG52YXIgcm5kID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCk7XG59O1xudmFyIGNob29zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcmd1bWVudHNbTWF0aC5mbG9vcihybmQoKSAqIGFyZ3VtZW50cy5sZW5ndGgpXTtcbn07XG5cbnZhciBTUEFXTl9SQU5HRSA9IDEwMDtcbnZhciBNSU5fU1BFRUQgPSAwLjMsIE1BWF9TUEVFRCA9IDI7XG52YXIgV0lEVEggPSA4MDAsIEhFSUdIVCA9IDYwMDtcblxudmFyIHNwYXduID0gZnVuY3Rpb24obikge1xuICAgIC8vIGNvbnNvbGUubG9nKCdTcGF3bmVkIGVuZW1pZXM6Jywgbik7XG4gICAgdmFyIG9iaiwgdGFyZ2V0WSwgdGFyZ2V0WDtcbiAgICB2YXIgc2lnblgsIHNpZ25ZLCBwb3NYLCBwb3NZO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIG9iaiA9IHtcbiAgICAgICAgICAgIHg6IChybmQoKSAqIFdJRFRIKSxcbiAgICAgICAgICAgIHk6IChybmQoKSAqIEhFSUdIVCksXG4gICAgICAgICAgICBzcGVlZDogcm5kKCkgKiAoTUFYX1NQRUVEIC0gTUlOX1NQRUVEKSArIE1JTl9TUEVFRCxcbiAgICAgICAgICAgIHR5cGU6IGNob29zZS5hcHBseSh0aGlzLCBsb2FkZXIuZ2V0KCdyb2NrJykuY29uY2F0KGxvYWRlci5nZXQoJ3Bvd2VyLWljb24nKSkpLFxuICAgICAgICAgICAgYWxpdmU6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgdGFyZ2V0WSA9IHJuZCgpICogV0lEVEg7XG4gICAgICAgIHRhcmdldFggPSBybmQoKSAqIEhFSUdIVDtcbiAgICAgICAgb2JqLmFuZ2xlID0gcm5kKCkgKiBNYXRoLlBJICogMjtcbiAgICAgICAgb2JqLndpZHRoID0gbG9hZGVyLmltYWdlc1tvYmoudHlwZV0ud2lkdGg7XG4gICAgICAgIG9iai5oZWlnaHQgPSBsb2FkZXIuaW1hZ2VzW29iai50eXBlXS5oZWlnaHQ7XG5cbiAgICAgICAgaWYgKHJuZCgpID4gMC41KSB7XG4gICAgICAgICAgICBvYmoueCArPSBjaG9vc2UoLTEsIDEpICogKFdJRFRIICsgb2JqLndpZHRoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG9iai55ICs9IGNob29zZSgtMSwgMSkgKiAoSEVJR0hUICsgb2JqLmhlaWdodCk7XG4gICAgICAgIH1cbiAgICAgICAgZW5lbWllcy5wdXNoKG9iaik7XG4gICAgfVxufTtcblxudmFyIGxvb3AgPSBmdW5jdGlvbihlbGFwc2VkLCBjdHgsIG9mZnNldFgsIG9mZnNldFkpIHtcbiAgICB2YXIgZW5lbXk7XG4gICAgZm9yICh2YXIgaSA9IGVuZW1pZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgZW5lbXkgPSBlbmVtaWVzW2ldO1xuICAgICAgICBpZiAoZW5lbXkuYWxpdmUpIHtcbiAgICAgICAgICAgIGVuZW15LnggKz0gTWF0aC5jb3MoZW5lbXkuYW5nbGUpICogZW5lbXkuc3BlZWQgLSBvZmZzZXRYO1xuICAgICAgICAgICAgZW5lbXkueSArPSBNYXRoLnNpbihlbmVteS5hbmdsZSkgKiBlbmVteS5zcGVlZCAtIG9mZnNldFk7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JlZCc7XG4gICAgICAgICAgICBjdHguZHJhd0ltYWdlKGxvYWRlci5pbWFnZXNbZW5lbXkudHlwZV0sIGVuZW15LngsIGVuZW15LnkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZW5lbWllcy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxvb3A6IGxvb3AsXG4gICAgYXJyYXk6IGVuZW1pZXMsXG4gICAgc3Bhd246IHNwYXduLFxuICAgIHJlc2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgZW5lbWllcy5sZW5ndGggPSAwO1xuICAgIH1cbn07IiwidmFyIHBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyJyk7XG52YXIga2V5cyA9IHt9O1xuZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZSkge1xuICAgIGlmIChlLmtleUNvZGUgPT09IDMyKSB7XG4gICAgICAgIHBsYXllci5mbGlwKCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZS5rZXlDb2RlID49IDM3ICYmIGUua2V5Q29kZSA8PSA0MCkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuICAgIGtleXNbZS5rZXlDb2RlXSA9IHRydWU7XG59KTtcbmRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdGlvbihlKSB7XG4gICAga2V5c1tlLmtleUNvZGVdID0gZmFsc2U7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbGVmdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzWzM3XTtcbiAgICB9LFxuICAgIHVwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbMzhdO1xuICAgIH0sXG4gICAgcmlnaHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1szOV07XG4gICAgfSxcbiAgICBkb3duOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbNDBdO1xuICAgIH0sXG4gICAgZmxpcDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzWzMyXTtcbiAgICB9XG59O1xuIiwidmFyIGltYWdlTmFtZXMgPSBbXG4gICAgJ2FzdHJvLnBuZycsXG4gICAgJ2FzdHJvLWZseWluZy5wbmcnLFxuICAgICdoZWFsdGgtYmFyLWljb24ucG5nJyxcbiAgICAnbG9nby5wbmcnLFxuICAgICdwb3dlci1iYXItaWNvbi5wbmcnLFxuICAgICdwb3dlci1pY29uLnBuZycsXG4gICAgJ3JvY2stNS5wbmcnLFxuICAgICdyb2NrLWFsdC01LnBuZycsXG4gICAgJ3JvY2stb2RkLTEucG5nJyxcbiAgICAncm9jay1vZGQtMy5wbmcnLFxuICAgICd0ZXh0LWNyZWRpdHMucG5nJyxcbiAgICAndGV4dC1wbGF5LnBuZydcbl07XG5cbnZhciBpbWFnZXMgPSB7fTtcbnZhciBsb2FkZWQgPSAwO1xudmFyIGRvbmUgPSBmdW5jdGlvbihjYikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW1hZ2VOYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpbWFnZXNbaW1hZ2VOYW1lc1tpXV0gPSBuZXcgSW1hZ2UoKTtcbiAgICAgICAgaW1hZ2VzW2ltYWdlTmFtZXNbaV1dLnNyYyA9ICdpbWFnZXMvJyArIGltYWdlTmFtZXNbaV07XG4gICAgICAgIGltYWdlc1tpbWFnZU5hbWVzW2ldXS5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGxvYWRlZCsrO1xuICAgICAgICAgICAgaWYgKGxvYWRlZCA9PT0gaW1hZ2VOYW1lcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjYigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbGlzdDogaW1hZ2VOYW1lcyxcbiAgICBpbWFnZXM6IGltYWdlcyxcbiAgICBkb25lOiBkb25lLFxuICAgIGdldDogZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGltYWdlTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChpbWFnZU5hbWVzW2ldLmluZGV4T2Yoc3RyaW5nKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICByZXQucHVzaChpbWFnZU5hbWVzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cbn07IiwidmFyIGxvYWRlciA9IHJlcXVpcmUoJy4vbG9hZGVyLmpzJyk7XG52YXIgdGV4dCA9IHJlcXVpcmUoJy4vdGV4dC5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBkcmF3TWVudTogZnVuY3Rpb24oY3R4KSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzBmMGQyMCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCA4MDAsIDYwMCk7XG5cbiAgICAgICAgY3R4LmRyYXdJbWFnZShsb2FkZXIuaW1hZ2VzWydsb2dvLnBuZyddLCAzMTQsIDE4MCk7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1sndGV4dC1wbGF5LnBuZyddLCAzMzMsIDMwMCk7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1sndGV4dC1jcmVkaXRzLnBuZyddLCAyODcsIDUwMCk7XG4gICAgfSxcbiAgICBkcmF3RW5kOiBmdW5jdGlvbihjdHgsIHNjb3JlKSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzBmMGQyMCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCA4MDAsIDYwMCk7XG4gICAgICAgIHRleHQud3JpdGUoJ1RoZSBlbmQhIFlvdSBzY29yZWQgJyArIE1hdGgucm91bmQoc2NvcmUpICsgJyBwb2ludHMhJywgJ2NlbnRlcicsIDMwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgICAgIGN0eC5mb250ID0gJzMycHQgQXJpYWwnO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC53cml0ZSgnQ2xpY2sgdG8gcGxheSBhZ2FpbicsICdjZW50ZXInLCA1MDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG4gICAgICAgICAgICBjdHguZm9udCA9ICcyMnB0IEFyaWFsJztcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBpbmdhbWU6IGZ1bmN0aW9uIChjdHgsIGZ1ZWwsIGhlYWx0aCwgc2NvcmUpIHtcbiAgICAgICAgY3R4LmRyYXdJbWFnZShsb2FkZXIuaW1hZ2VzWydwb3dlci1iYXItaWNvbi5wbmcnXSwgMzAsIDUwMCk7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnb3JhbmdlJztcbiAgICAgICAgY3R4LmZpbGxSZWN0KDMwLCA0OTAgLSBmdWVsLCAyMCwgZnVlbCk7XG5cblxuICAgICAgICBjdHguZHJhd0ltYWdlKGxvYWRlci5pbWFnZXNbJ2hlYWx0aC1iYXItaWNvbi5wbmcnXSwgNzAsIDUwMCk7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAncmVkJztcbiAgICAgICAgY3R4LmZpbGxSZWN0KDcwLCA0OTAgLSBoZWFsdGgsIDIwLCBoZWFsdGgpO1xuXG4gICAgICAgIGN0eC5mb250ID0gJzEycHQgQXJpYWwnO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgY3R4LmZpbGxUZXh0KCdTY29yZTogJyArIE1hdGgucm91bmQoc2NvcmUpLCAyNywgNTUwKTtcbiAgICB9XG59OyIsInZhciBwYXJ0aWNsZXMgPSBbXTtcbnZhciBXID0gNywgSCA9IDc7XG52YXIgREVDX1JBVEUgPSAwLjE7IC8vIERlZmF1bHQgZGVjcmVhc2UgcmF0ZS4gSGlnaGVyIHJhdGUgLT4gcGFydGljbGVzIGdvIGZhc3RlclxudmFyIFBhcnRpY2xlID0gZnVuY3Rpb24oeCwgeSwgc3BlZWQsIGRlY1JhdGUpIHtcbiAgICB0aGlzLmFsaXZlID0gdHJ1ZTtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy53aWR0aCA9IFc7XG4gICAgdGhpcy5oZWlnaHQgPSBIO1xuICAgIHRoaXMuYW5nbGUgPSAwO1xuICAgIHRoaXMuc3BlZWQgPSBzcGVlZDtcbiAgICB0aGlzLm9wYWNpdHkgPSAxO1xuICAgIHRoaXMuZGVjUmF0ZSA9IGRlY1JhdGUgfHwgREVDX1JBVEU7XG4gICAgdGhpcy5kZWxheSA9IE1hdGguY2VpbChNYXRoLnJhbmRvbSgpICogMTApO1xuICAgIHRoaXMubG9vcCA9IGZ1bmN0aW9uKGN0eCwgcGxheWVyKSB7XG4gICAgICAgIGlmICh0aGlzLmRlbGF5ID4gMCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGVsYXkgPD0gMSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYW5nbGUgPSBwbGF5ZXIuYW5nbGUgLSB0aGlzLnJhbmdlICsgKE1hdGgucmFuZG9tKCkgKiAyICogdGhpcy5yYW5nZSk7O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5kZWxheS0tO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMueCArPSBNYXRoLnNpbigtdGhpcy5hbmdsZSkgKiBzcGVlZDtcbiAgICAgICAgdGhpcy55ICs9IE1hdGguY29zKC10aGlzLmFuZ2xlKSAqIHNwZWVkO1xuICAgICAgICB0aGlzLm9wYWNpdHkgLT0gdGhpcy5kZWNSYXRlO1xuICAgICAgICBpZiAodGhpcy5vcGFjaXR5IDw9IDApIHtcbiAgICAgICAgICAgIHRoaXMub3BhY2l0eSA9IDA7XG4gICAgICAgICAgICB0aGlzLmFsaXZlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRHJhd1xuICAgICAgICBjdHguc2F2ZSgpO1xuICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSB0aGlzLm9wYWNpdHk7XG4gICAgICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JlZCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCBXLCBIKTtcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICB9O1xufTtcblxuLy8geCwgeSBhcmUgZml4ZWRcbi8vIFBhcnRpY2xlcyBhcmUgY3JlYXRlZCBmcm9tIGFuZ2xlLXJhbmdlIHRvIGFuZ2xlK3JhbmdlXG4vLyBzcGVlZCBpcyBmaXhlZFxudmFyIGFuZ2xlID0gMDtcbnZhciBjcmVhdGVQYXJ0aWNsZXMgPSBmdW5jdGlvbih4LCB5LCBwbGF5ZXJBbmdsZSwgcmFuZ2UsIHNwZWVkLCBuKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ0NyZWF0aW5nJywgcGFydGljbGVzKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICBpZiAocGFydGljbGVzW2ldICYmICFwYXJ0aWNsZXNbaV0uYWxpdmUgfHwgIXBhcnRpY2xlc1tpXSkge1xuICAgICAgICAgICAgcGFydGljbGVzW2ldID0gbmV3IFBhcnRpY2xlKHgsIHksIHNwZWVkKTtcbiAgICAgICAgICAgIHBhcnRpY2xlc1tpXS5yYW5nZSA9IHJhbmdlO1xuICAgICAgICAgICAgcGFydGljbGVzW2ldLnBsYXllciA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG52YXIgZHJhdyA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCwgcGxheWVyKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0aWNsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcGFydGljbGVzW2ldLmxvb3AoY3R4LCBwbGF5ZXIpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNyZWF0ZVBhcnRpY2xlczogY3JlYXRlUGFydGljbGVzLFxuICAgIGRyYXc6IGRyYXcsXG4gICAgYXJyYXk6IHBhcnRpY2xlcyxcbiAgICByZXNldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHBhcnRpY2xlcy5sZW5ndGggPSAwO1xuICAgIH1cbn07XG4iLCJ2YXIgVHJhbnNmb3JtID0gcmVxdWlyZSgnLi90cmFuc2Zvcm0uanMnKTtcbnZhciBjYW52YXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZ2FtZScpO1xuXG53aW5kb3cucGxheWVyID0ge307XG5cbnBsYXllci5pZGxlID0gbmV3IEltYWdlKCk7XG5wbGF5ZXIuaWRsZS5zcmMgPSAnaW1hZ2VzL2FzdHJvLnBuZyc7XG5wbGF5ZXIuZmx5aW5nID0gbmV3IEltYWdlKCk7XG5wbGF5ZXIuZmx5aW5nLnNyYyA9ICdpbWFnZXMvYXN0cm8tZmx5aW5nLnBuZyc7XG5wbGF5ZXIuc3RhdGUgPSAnaWRsZSc7XG5wbGF5ZXIuZnVlbCA9IDEwMDtcbnBsYXllci5oZWFsdGggPSAxMDA7XG5wbGF5ZXIuc2NvcmUgPSAwO1xuXG5wbGF5ZXIud2lkdGggPSA1MjtcbnBsYXllci5oZWlnaHQgPSA2MDtcbnBsYXllci54ID0gKGNhbnZhcy53aWR0aCAtIHBsYXllci53aWR0aCkgLyAyO1xucGxheWVyLnkgPSAoY2FudmFzLmhlaWdodCAtIHBsYXllci5oZWlnaHQpIC8gMjtcbnBsYXllci5hbmdsZSA9IDA7XG5cbnBsYXllci5vZmZzZXRYID0gcGxheWVyLm9mZnNldFkgPSAwO1xuXG5cbi8vIEhhbGYgd2lkdGgsIGhhbGYgaGVpZ2h0XG52YXIgaFcgPSBwbGF5ZXIud2lkdGggLyAyO1xudmFyIGhIID0gcGxheWVyLmhlaWdodCAvIDI7XG5cbnZhciBzcGVlZCA9IDA7IC8vIFRoZSBjdXJyZW50IHNwZWVkXG52YXIgZFNwZWVkO1xudmFyIGRYID0gMCwgZFkgPSAwO1xuXG4vLyBZT1UgQ0FOIENPTkZJR1VSRSBUSEVTRSEgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbnZhciBhY2MgPSA3OyAvLyBBY2NlbGVyYXRpb25cbnZhciBsaW0gPSAxMDsgLy8gU3BlZWQgbGltaXRcbnZhciB0dXJuU3BlZWQgPSAyLjI7XG52YXIgZ3JhdiA9IDAuMDg7XG4vLyBOTyBNT1JFIENPTkZJR1VSSU5HISAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxucGxheWVyLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgcGxheWVyLmFuZ2xlID0gcGxheWVyLm9mZnNldFggPSBwbGF5ZXIub2Zmc2V0WSA9IGRYID0gZFkgPSBzcGVlZCA9IGRTcGVlZCA9IDA7XG4gICAgcGxheWVyLmhlYWx0aCA9IHBsYXllci5mdWVsID0gMTAwO1xuICAgIHBsYXllci5tb3ZlKCk7XG59O1xuXG5wbGF5ZXIuZ3Jhdml0eSA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBkWSAtPSBncmF2O1xufTtcbnBsYXllci5tb3ZlID0gZnVuY3Rpb24oZWxhcHNlZCwgZmx5aW5nKSB7XG4gICAgcGxheWVyLm9mZnNldFggPSBkWDtcbiAgICBwbGF5ZXIub2Zmc2V0WSA9IC1kWTtcbiAgICBkWCAqPSAwLjk5O1xuICAgIGRZICo9IDAuOTk7XG5cbiAgICBpZiAoIWZseWluZykge1xuICAgICAgICBwbGF5ZXIuc3RhdGUgPSAnaWRsZSc7XG4gICAgfVxufTtcbnBsYXllci51cCA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBwbGF5ZXIuZnVlbCAtPSAwLjI7XG4gICAgcGxheWVyLnN0YXRlID0gJ2ZseWluZyc7XG4gICAgc3BlZWQgKz0gYWNjO1xuICAgIGRTcGVlZCA9IGVsYXBzZWQgKiBzcGVlZDtcbiAgICAvLyBjb25zb2xlLmxvZyhwbGF5ZXIueCwgcGxheWVyLnkpO1xuICAgIC8vIGNvbnNvbGUubG9nKE1hdGguc2luKHBsYXllci5hbmdsZSkgKiBkU3BlZWQsIE1hdGguY29zKHBsYXllci5hbmdsZSkgKiBkU3BlZWQpO1xuICAgIGRYICs9IE1hdGguc2luKHBsYXllci5hbmdsZSkgKiBkU3BlZWQ7XG4gICAgZFkgKz0gTWF0aC5jb3MocGxheWVyLmFuZ2xlKSAqIGRTcGVlZDtcbiAgICBwbGF5ZXIubW92ZShlbGFwc2VkLCB0cnVlKTtcbiAgICBpZiAoc3BlZWQgPiBsaW0pIHtcbiAgICAgICAgc3BlZWQgPSBsaW07XG4gICAgfVxuICAgIGVsc2UgaWYgKHNwZWVkIDwgLWxpbSkge1xuICAgICAgICBzcGVlZCA9IC1saW07XG4gICAgfVxuXG59O1xucGxheWVyLnJpZ2h0ID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5hbmdsZSArPSBlbGFwc2VkICogdHVyblNwZWVkICogTWF0aC5QSTtcbn07XG5wbGF5ZXIubGVmdCA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBwbGF5ZXIuYW5nbGUgLT0gZWxhcHNlZCAqIHR1cm5TcGVlZCAqIE1hdGguUEk7XG59O1xucGxheWVyLmZsaXAgPSBmdW5jdGlvbigpIHtcbiAgICBwbGF5ZXIuYW5nbGUgKz0gTWF0aC5QSTtcbn07XG5cbi8vIHZhciB0ID0gbmV3IFRyYW5zZm9ybSgpO1xucGxheWVyLmRyYXcgPSBmdW5jdGlvbihlbGFwc2VkLCBjdHgpIHtcbiAgICAvLyBjdHguZmlsbFJlY3QoMzc1LCAyNzAsIDUwLCA2MCk7XG4gICAgLy8gUGxheWVyXG4gICAgY3R4LnNhdmUoKTtcbiAgICBjdHgudHJhbnNsYXRlKHBsYXllci54ICsgaFcsIHBsYXllci55ICsgaEgpO1xuICAgIC8vIHQudHJhbnNsYXRlKHBsYXllci54ICsgaFcsIHBsYXllci55ICsgaEgpO1xuICAgIGN0eC5yb3RhdGUocGxheWVyLmFuZ2xlKTtcbiAgICAvLyB0LnJvdGF0ZShwbGF5ZXIuYW5nbGUpO1xuICAgIGN0eC5kcmF3SW1hZ2UocGxheWVyW3BsYXllci5zdGF0ZV0sIC1oVywgLWhIKTtcbiAgICBjdHgucmVzdG9yZSgpO1xuXG4gICAgLy8gcGxheWVyLnRvcExlZnQgPSB0LnRyYW5zZm9ybVBvaW50KC1oVywgLWhIKTtcbiAgICAvLyBwbGF5ZXIudG9wUmlnaHQgPSB0LnRyYW5zZm9ybVBvaW50KGhXLCAtaEgpO1xuICAgIC8vIHBsYXllci5ib3R0b21MZWZ0ID0gdC50cmFuc2Zvcm1Qb2ludCgtaFcsIGhIKTtcbiAgICAvLyBwbGF5ZXIuYm90dG9tUmlnaHQgPSB0LnRyYW5zZm9ybVBvaW50KGhXLCBoSCk7XG4gICAgLy8gdC5yZXNldCgpO1xuXG59O1xubW9kdWxlLmV4cG9ydHMgPSBwbGF5ZXI7XG4iLCIvLyBIb2xkcyBsYXN0IGl0ZXJhdGlvbiB0aW1lc3RhbXAuXG52YXIgdGltZSA9IDA7XG5cbi8qKlxuICogQ2FsbHMgYGZuYCBvbiBuZXh0IGZyYW1lLlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiBUaGUgZnVuY3Rpb25cbiAqIEByZXR1cm4ge2ludH0gVGhlIHJlcXVlc3QgSURcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiByYWYoZm4pIHtcbiAgcmV0dXJuIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgdmFyIGVsYXBzZWQgPSBub3cgLSB0aW1lO1xuXG4gICAgaWYgKGVsYXBzZWQgPiA5OTkpIHtcbiAgICAgIGVsYXBzZWQgPSAxIC8gNjA7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsYXBzZWQgLz0gMTAwMDtcbiAgICB9XG5cbiAgICB0aW1lID0gbm93O1xuICAgIGZuKGVsYXBzZWQpO1xuICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIC8qKlxuICAgKiBDYWxscyBgZm5gIG9uIGV2ZXJ5IGZyYW1lIHdpdGggYGVsYXBzZWRgIHNldCB0byB0aGUgZWxhcHNlZFxuICAgKiB0aW1lIGluIG1pbGxpc2Vjb25kcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuIFRoZSBmdW5jdGlvblxuICAgKiBAcmV0dXJuIHtpbnR9IFRoZSByZXF1ZXN0IElEXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzdGFydDogZnVuY3Rpb24oZm4pIHtcbiAgICByZXR1cm4gcmFmKGZ1bmN0aW9uIHRpY2soZWxhcHNlZCkge1xuICAgICAgZm4oZWxhcHNlZCk7XG4gICAgICByYWYodGljayk7XG4gICAgfSk7XG4gIH0sXG4gIC8qKlxuICAgKiBDYW5jZWxzIHRoZSBzcGVjaWZpZWQgYW5pbWF0aW9uIGZyYW1lIHJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSB7aW50fSBpZCBUaGUgcmVxdWVzdCBJRFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgc3RvcDogZnVuY3Rpb24oaWQpIHtcbiAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoaWQpO1xuICB9XG59O1xuIiwidmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdjYW52YXMnKVswXTtcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbm1vZHVsZS5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKHRleHQsIHgsIHksIHByZUZ1bmMsIHN0cm9rZSl7XG4gICAgaWYocHJlRnVuYyl7XG4gICAgICAgIGN0eC5zYXZlKCk7XG4gICAgICAgIHByZUZ1bmMoY3R4KTtcbiAgICB9XG5cbiAgICB2YXIgeFBvcyA9IHg7XG4gICAgaWYoeCA9PT0gJ2NlbnRlcicpe1xuICAgICAgICB4UG9zID0gKGNhbnZhcy53aWR0aCAtIGN0eC5tZWFzdXJlVGV4dCh0ZXh0KS53aWR0aCkgLyAyO1xuICAgIH1cblxuICAgIGlmKHN0cm9rZSl7XG4gICAgICAgIGN0eC5zdHJva2VUZXh0KHRleHQsIHhQb3MsIHkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY3R4LmZpbGxUZXh0KHRleHQsIHhQb3MsIHkpO1xuICAgIH1cblxuICAgIGlmKHByZUZ1bmMpe1xuICAgICAgICBjdHgucmVzdG9yZSgpO1xuICAgIH1cbn07IiwiLy8gTGFzdCB1cGRhdGVkIE5vdmVtYmVyIDIwMTFcbi8vIEJ5IFNpbW9uIFNhcnJpc1xuLy8gd3d3LnNpbW9uc2FycmlzLmNvbVxuLy8gc2FycmlzQGFjbS5vcmdcbi8vXG4vLyBGcmVlIHRvIHVzZSBhbmQgZGlzdHJpYnV0ZSBhdCB3aWxsXG4vLyBTbyBsb25nIGFzIHlvdSBhcmUgbmljZSB0byBwZW9wbGUsIGV0Y1xuXG4vLyBTaW1wbGUgY2xhc3MgZm9yIGtlZXBpbmcgdHJhY2sgb2YgdGhlIGN1cnJlbnQgdHJhbnNmb3JtYXRpb24gbWF0cml4XG5cbi8vIEZvciBpbnN0YW5jZTpcbi8vICAgIHZhciB0ID0gbmV3IFRyYW5zZm9ybSgpO1xuLy8gICAgdC5yb3RhdGUoNSk7XG4vLyAgICB2YXIgbSA9IHQubTtcbi8vICAgIGN0eC5zZXRUcmFuc2Zvcm0obVswXSwgbVsxXSwgbVsyXSwgbVszXSwgbVs0XSwgbVs1XSk7XG5cbi8vIElzIGVxdWl2YWxlbnQgdG86XG4vLyAgICBjdHgucm90YXRlKDUpO1xuXG4vLyBCdXQgbm93IHlvdSBjYW4gcmV0cmlldmUgaXQgOilcblxuLy8gUmVtZW1iZXIgdGhhdCB0aGlzIGRvZXMgbm90IGFjY291bnQgZm9yIGFueSBDU1MgdHJhbnNmb3JtcyBhcHBsaWVkIHRvIHRoZSBjYW52YXNcblxuZnVuY3Rpb24gVHJhbnNmb3JtKCkge1xuICB0aGlzLnJlc2V0KCk7XG59XG5cblRyYW5zZm9ybS5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5tID0gWzEsMCwwLDEsMCwwXTtcbn07XG5cblRyYW5zZm9ybS5wcm90b3R5cGUubXVsdGlwbHkgPSBmdW5jdGlvbihtYXRyaXgpIHtcbiAgdmFyIG0xMSA9IHRoaXMubVswXSAqIG1hdHJpeC5tWzBdICsgdGhpcy5tWzJdICogbWF0cml4Lm1bMV07XG4gIHZhciBtMTIgPSB0aGlzLm1bMV0gKiBtYXRyaXgubVswXSArIHRoaXMubVszXSAqIG1hdHJpeC5tWzFdO1xuXG4gIHZhciBtMjEgPSB0aGlzLm1bMF0gKiBtYXRyaXgubVsyXSArIHRoaXMubVsyXSAqIG1hdHJpeC5tWzNdO1xuICB2YXIgbTIyID0gdGhpcy5tWzFdICogbWF0cml4Lm1bMl0gKyB0aGlzLm1bM10gKiBtYXRyaXgubVszXTtcblxuICB2YXIgZHggPSB0aGlzLm1bMF0gKiBtYXRyaXgubVs0XSArIHRoaXMubVsyXSAqIG1hdHJpeC5tWzVdICsgdGhpcy5tWzRdO1xuICB2YXIgZHkgPSB0aGlzLm1bMV0gKiBtYXRyaXgubVs0XSArIHRoaXMubVszXSAqIG1hdHJpeC5tWzVdICsgdGhpcy5tWzVdO1xuXG4gIHRoaXMubVswXSA9IG0xMTtcbiAgdGhpcy5tWzFdID0gbTEyO1xuICB0aGlzLm1bMl0gPSBtMjE7XG4gIHRoaXMubVszXSA9IG0yMjtcbiAgdGhpcy5tWzRdID0gZHg7XG4gIHRoaXMubVs1XSA9IGR5O1xufTtcblxuVHJhbnNmb3JtLnByb3RvdHlwZS5pbnZlcnQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGQgPSAxIC8gKHRoaXMubVswXSAqIHRoaXMubVszXSAtIHRoaXMubVsxXSAqIHRoaXMubVsyXSk7XG4gIHZhciBtMCA9IHRoaXMubVszXSAqIGQ7XG4gIHZhciBtMSA9IC10aGlzLm1bMV0gKiBkO1xuICB2YXIgbTIgPSAtdGhpcy5tWzJdICogZDtcbiAgdmFyIG0zID0gdGhpcy5tWzBdICogZDtcbiAgdmFyIG00ID0gZCAqICh0aGlzLm1bMl0gKiB0aGlzLm1bNV0gLSB0aGlzLm1bM10gKiB0aGlzLm1bNF0pO1xuICB2YXIgbTUgPSBkICogKHRoaXMubVsxXSAqIHRoaXMubVs0XSAtIHRoaXMubVswXSAqIHRoaXMubVs1XSk7XG4gIHRoaXMubVswXSA9IG0wO1xuICB0aGlzLm1bMV0gPSBtMTtcbiAgdGhpcy5tWzJdID0gbTI7XG4gIHRoaXMubVszXSA9IG0zO1xuICB0aGlzLm1bNF0gPSBtNDtcbiAgdGhpcy5tWzVdID0gbTU7XG59O1xuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnJvdGF0ZSA9IGZ1bmN0aW9uKHJhZCkge1xuICB2YXIgYyA9IE1hdGguY29zKHJhZCk7XG4gIHZhciBzID0gTWF0aC5zaW4ocmFkKTtcbiAgdmFyIG0xMSA9IHRoaXMubVswXSAqIGMgKyB0aGlzLm1bMl0gKiBzO1xuICB2YXIgbTEyID0gdGhpcy5tWzFdICogYyArIHRoaXMubVszXSAqIHM7XG4gIHZhciBtMjEgPSB0aGlzLm1bMF0gKiAtcyArIHRoaXMubVsyXSAqIGM7XG4gIHZhciBtMjIgPSB0aGlzLm1bMV0gKiAtcyArIHRoaXMubVszXSAqIGM7XG4gIHRoaXMubVswXSA9IG0xMTtcbiAgdGhpcy5tWzFdID0gbTEyO1xuICB0aGlzLm1bMl0gPSBtMjE7XG4gIHRoaXMubVszXSA9IG0yMjtcbn07XG5cblRyYW5zZm9ybS5wcm90b3R5cGUudHJhbnNsYXRlID0gZnVuY3Rpb24oeCwgeSkge1xuICB0aGlzLm1bNF0gKz0gdGhpcy5tWzBdICogeCArIHRoaXMubVsyXSAqIHk7XG4gIHRoaXMubVs1XSArPSB0aGlzLm1bMV0gKiB4ICsgdGhpcy5tWzNdICogeTtcbn07XG5cblRyYW5zZm9ybS5wcm90b3R5cGUuc2NhbGUgPSBmdW5jdGlvbihzeCwgc3kpIHtcbiAgdGhpcy5tWzBdICo9IHN4O1xuICB0aGlzLm1bMV0gKj0gc3g7XG4gIHRoaXMubVsyXSAqPSBzeTtcbiAgdGhpcy5tWzNdICo9IHN5O1xufTtcblxuVHJhbnNmb3JtLnByb3RvdHlwZS50cmFuc2Zvcm1Qb2ludCA9IGZ1bmN0aW9uKHB4LCBweSkge1xuICB2YXIgeCA9IHB4O1xuICB2YXIgeSA9IHB5O1xuICBweCA9IHggKiB0aGlzLm1bMF0gKyB5ICogdGhpcy5tWzJdICsgdGhpcy5tWzRdO1xuICBweSA9IHggKiB0aGlzLm1bMV0gKyB5ICogdGhpcy5tWzNdICsgdGhpcy5tWzVdO1xuICByZXR1cm4gW3B4LCBweV07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zZm9ybTsiXX0=
