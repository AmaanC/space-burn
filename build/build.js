(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./collisions":2,"./enemies":3,"./keys":4,"./particles":5,"./player":6,"./raf":7}],2:[function(require,module,exports){
var angledCollision = function(player, enemy) {
    var colliding = false;
    
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
        angledCollision(player, enemiesToTest[i]);
    }

    // Check for collisions between particles and enemies
    var enemiesHurt = [];
    for (var i = 0; i < particles.length; i++) {
        inArea(particles[i], enemies, function(enemy) {
            if (particles[i].alive) {
                enemy.alive = false;
            }
        });
    }
};

module.exports = {
    check: check
};
},{}],3:[function(require,module,exports){
var enemies = [];

var sprites = [
    'rock-alt-5.png',
    'rock-odd-1.png',
    'rock-odd-3.png',
    'rock-odd-4.png'
];

var rocks = {};
for (var i = 0; i < sprites.length; i++) {
    rocks[sprites[i]] = new Image();
    rocks[sprites[i]].src = 'images/' + sprites[i];
}

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
    console.log('Spawned enemies:', n);
    var obj, targetY, targetX;
    var signX, signY, posX, posY;
    for (var i = 0; i < n; i++) {
        obj = {
            x: (rnd() * WIDTH),
            y: (rnd() * HEIGHT),
            speed: rnd() * (MAX_SPEED - MIN_SPEED) + MIN_SPEED,
            type: choose.apply(this, sprites),
            health: 100,
            alive: true
        };
        targetY = rnd() * WIDTH;
        targetX = rnd() * HEIGHT;
        obj.angle = rnd() * Math.PI * 2;
        ///////////////////////////////////// FIX THIS, THE WIDTH SHOULD BE DYNAMIC WHEN YOU ADD A PRELOADER
        obj.width = 100;
        obj.height = 60;

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
            ctx.drawImage(rocks[enemy.type], enemy.x, enemy.y);
        }
        else {
            enemies.splice(i, 1);
        }
    }
};


module.exports = {
    loop: loop,
    array: enemies,
    spawn: spawn
};
},{}],4:[function(require,module,exports){
var player = require('./player');
var keys = {};
document.body.addEventListener('keydown', function(e) {
    if (e.keyCode === 32) {
        player.flip();
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

},{"./player":6}],5:[function(require,module,exports){
var particles = [];
var W = 5, H = 5;
var Particle = function(x, y, angle, speed) {
    this.alive = true;
    this.x = x;
    this.y = y;
    this.width = W;
    this.height = H;
    this.angle = angle;
    this.speed = speed;
    this.opacity = 1;
    this.delay = Math.ceil(Math.random() * 10);
    this.loop = function(ctx, player) {
        if (this.delay > 0) {
            this.delay--;
            return false;
        }
        this.x += Math.sin(-this.angle) * speed;
        this.y += Math.cos(-this.angle) * speed;
        this.opacity -= 0.1;
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
            angle = playerAngle - range + (Math.random() * 2 * range);
            particles[i] = new Particle(x, y, angle, speed);
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
    array: particles
};

},{}],6:[function(require,module,exports){
var Transform = require('./transform.js');
var canvas = document.querySelector('#game');

window.player = {};

player.idle = new Image();
player.idle.src = 'images/astro.png';
player.flying = new Image();
player.flying.src = 'images/astro-flying.png';
player.state = 'idle';

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

var t = new Transform();

player.draw = function(elapsed, ctx) {
    // Player
    ctx.save();
    ctx.translate(player.x + hW, player.y + hH);
    t.translate(player.x + hW, player.y + hH);
    ctx.rotate(player.angle);
    t.rotate(player.angle);
    ctx.drawImage(player[player.state], -hW, -hH);
    ctx.restore();

    player.topLeft = t.transformPoint(-hW, -hH);
    player.topRight = t.transformPoint(hW, -hH);
    player.bottomLeft = t.transformPoint(-hW, hH);
    player.bottomRight = t.transformPoint(hW, hH);
    t.reset();
};
module.exports = player;

},{"./transform.js":8}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4vc3JjL21haW4iLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy9jb2xsaXNpb25zLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvSlMxM2svMjAxNC9zcmMvZW5lbWllcy5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvc3JjL2tleXMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy9wYXJ0aWNsZXMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy9wbGF5ZXIuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy9yYWYuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy90cmFuc2Zvcm0uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIHJhZiA9IHJlcXVpcmUoJy4vcmFmJyk7XG52YXIgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcbnZhciBrZXkgPSByZXF1aXJlKCcuL2tleXMnKTtcbnZhciBwYXJ0aWNsZXMgPSByZXF1aXJlKCcuL3BhcnRpY2xlcycpO1xudmFyIGVuZW1pZXMgPSByZXF1aXJlKCcuL2VuZW1pZXMnKTtcbnZhciBjb2xsaXNpb25zID0gcmVxdWlyZSgnLi9jb2xsaXNpb25zJyk7XG5cbnZhciBjYW52YXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZ2FtZScpO1xudmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG5yYWYuc3RhcnQoZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5ncmF2aXR5KGVsYXBzZWQpO1xuICAgIGlmIChrZXkudXAoKSkge1xuICAgICAgICBwbGF5ZXIudXAoZWxhcHNlZCk7XG4gICAgICAgIHBhcnRpY2xlcy5jcmVhdGVQYXJ0aWNsZXMocGxheWVyLnggKyBwbGF5ZXIud2lkdGggLyAyLCBwbGF5ZXIueSArIHBsYXllci5oZWlnaHQsIHBsYXllci5hbmdsZSwgTWF0aC5QSSAvIDEwLCAxMCwgMTApO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHBsYXllci5tb3ZlKGVsYXBzZWQpO1xuICAgIH1cblxuICAgIGlmIChrZXkucmlnaHQoKSkge1xuICAgICAgICBwbGF5ZXIucmlnaHQoZWxhcHNlZCk7XG4gICAgfVxuICAgIGlmIChrZXkubGVmdCgpKSB7XG4gICAgICAgIHBsYXllci5sZWZ0KGVsYXBzZWQpO1xuICAgIH1cblxuICAgIGNvbGxpc2lvbnMuY2hlY2socGxheWVyLCBwYXJ0aWNsZXMsIGVuZW1pZXMpO1xuXG4gICAgLy8gQ2xlYXIgdGhlIHNjcmVlblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcblxuICAgIGVuZW1pZXMubG9vcChlbGFwc2VkLCBjdHgsIHBsYXllci5vZmZzZXRYLCBwbGF5ZXIub2Zmc2V0WSk7XG4gICAgcGFydGljbGVzLmRyYXcoZWxhcHNlZCwgY3R4LCBwbGF5ZXIpO1xuICAgIHBsYXllci5kcmF3KGVsYXBzZWQsIGN0eCk7XG5cbn0pO1xuIiwidmFyIGFuZ2xlZENvbGxpc2lvbiA9IGZ1bmN0aW9uKHBsYXllciwgZW5lbXkpIHtcbiAgICB2YXIgY29sbGlkaW5nID0gZmFsc2U7XG4gICAgXG59O1xuXG52YXIgYWFiYiA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICBpZiAoXG4gICAgICAgIE1hdGguYWJzKGEueCArIGEud2lkdGggLyAyIC0gYi54IC0gYi53aWR0aCAvIDIpID4gKGEud2lkdGggKyBiLndpZHRoKSAvIDIgfHxcbiAgICAgICAgTWF0aC5hYnMoYS55ICsgYS5oZWlnaHQgLyAyIC0gYi55IC0gYi5oZWlnaHQgLyAyKSA+IChhLmhlaWdodCArIGIuaGVpZ2h0KSAvIDJcbiAgICApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbnZhciBpbkFyZWEgPSBmdW5jdGlvbihhcmVhLCBhcnJheSwgcmVzcENvbGxpZGluZywgcmVzcE5vdENvbGxpZGluZykge1xuICAgIHZhciByZXQgPSBbXTtcbiAgICB2YXIgY3VyRWxlbTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGN1ckVsZW0gPSBhcnJheVtpXTtcbiAgICAgICAgaWYgKGFhYmIoYXJlYSwgY3VyRWxlbSkpIHtcbiAgICAgICAgICAgIHJldC5wdXNoKGN1ckVsZW0pO1xuICAgICAgICAgICAgaWYgKHJlc3BDb2xsaWRpbmcpIHtcbiAgICAgICAgICAgICAgICByZXNwQ29sbGlkaW5nKGN1ckVsZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHJlc3BOb3RDb2xsaWRpbmcpIHtcbiAgICAgICAgICAgIHJlc3BOb3RDb2xsaWRpbmcoY3VyRWxlbSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbnZhciBwbGF5ZXJBcmVhID0ge1xuICAgIHg6IDMyNSxcbiAgICB5OiAyMjUsXG4gICAgd2lkdGg6IDE1MCxcbiAgICBoZWlnaHQ6IDE1MFxufTtcblxudmFyIGNhbWVyYSA9IHtcbiAgICB4OiAtNDAwLFxuICAgIHk6IC0zMDAsXG4gICAgd2lkdGg6IDE2MDAsXG4gICAgaGVpZ2h0OiAxMjAwXG59O1xuXG52YXIgY2hlY2sgPSBmdW5jdGlvbihwbGF5ZXIsIHBhcnRpY2xlc01vZHVsZSwgZW5lbWllc01vZHVsZSkge1xuICAgIHZhciBwYXJ0aWNsZXMgPSBwYXJ0aWNsZXNNb2R1bGUuYXJyYXk7XG4gICAgdmFyIGVuZW1pZXMgPSBlbmVtaWVzTW9kdWxlLmFycmF5O1xuICAgIC8vIE1hbmFnZSBlbmVteSBzcGF3bmluZ1xuICAgIHZhciBlbmVtaWVzSW5WaWV3ID0gaW5BcmVhKGNhbWVyYSwgZW5lbWllcywgdW5kZWZpbmVkLCBmdW5jdGlvbihlbmVteSkge1xuICAgICAgICBlbmVteS5hbGl2ZSA9IGZhbHNlO1xuICAgIH0pO1xuICAgIGlmIChlbmVtaWVzSW5WaWV3Lmxlbmd0aCA8IDMwKSB7XG4gICAgICAgIGVuZW1pZXNNb2R1bGUuc3Bhd24oTWF0aC5yYW5kb20oKSAqIDEwMCk7XG4gICAgfVxuXG4gICAgLy8gQ29sbGlzaW9ucyBiZXR3ZWVuIHRoZSBwbGF5ZXIgYW5kIHJvY2tzXG4gICAgdmFyIGVuZW1pZXNUb1Rlc3QgPSBpbkFyZWEocGxheWVyQXJlYSwgZW5lbWllcyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbmVtaWVzVG9UZXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGFuZ2xlZENvbGxpc2lvbihwbGF5ZXIsIGVuZW1pZXNUb1Rlc3RbaV0pO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciBjb2xsaXNpb25zIGJldHdlZW4gcGFydGljbGVzIGFuZCBlbmVtaWVzXG4gICAgdmFyIGVuZW1pZXNIdXJ0ID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0aWNsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaW5BcmVhKHBhcnRpY2xlc1tpXSwgZW5lbWllcywgZnVuY3Rpb24oZW5lbXkpIHtcbiAgICAgICAgICAgIGlmIChwYXJ0aWNsZXNbaV0uYWxpdmUpIHtcbiAgICAgICAgICAgICAgICBlbmVteS5hbGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjaGVjazogY2hlY2tcbn07IiwidmFyIGVuZW1pZXMgPSBbXTtcblxudmFyIHNwcml0ZXMgPSBbXG4gICAgJ3JvY2stYWx0LTUucG5nJyxcbiAgICAncm9jay1vZGQtMS5wbmcnLFxuICAgICdyb2NrLW9kZC0zLnBuZycsXG4gICAgJ3JvY2stb2RkLTQucG5nJ1xuXTtcblxudmFyIHJvY2tzID0ge307XG5mb3IgKHZhciBpID0gMDsgaSA8IHNwcml0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICByb2Nrc1tzcHJpdGVzW2ldXSA9IG5ldyBJbWFnZSgpO1xuICAgIHJvY2tzW3Nwcml0ZXNbaV1dLnNyYyA9ICdpbWFnZXMvJyArIHNwcml0ZXNbaV07XG59XG5cbnZhciBybmQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKTtcbn07XG52YXIgY2hvb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50c1tNYXRoLmZsb29yKHJuZCgpICogYXJndW1lbnRzLmxlbmd0aCldO1xufTtcblxudmFyIFNQQVdOX1JBTkdFID0gMTAwO1xudmFyIE1JTl9TUEVFRCA9IDAuMywgTUFYX1NQRUVEID0gMjtcbnZhciBXSURUSCA9IDgwMCwgSEVJR0hUID0gNjAwO1xuXG52YXIgc3Bhd24gPSBmdW5jdGlvbihuKSB7XG4gICAgY29uc29sZS5sb2coJ1NwYXduZWQgZW5lbWllczonLCBuKTtcbiAgICB2YXIgb2JqLCB0YXJnZXRZLCB0YXJnZXRYO1xuICAgIHZhciBzaWduWCwgc2lnblksIHBvc1gsIHBvc1k7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgb2JqID0ge1xuICAgICAgICAgICAgeDogKHJuZCgpICogV0lEVEgpLFxuICAgICAgICAgICAgeTogKHJuZCgpICogSEVJR0hUKSxcbiAgICAgICAgICAgIHNwZWVkOiBybmQoKSAqIChNQVhfU1BFRUQgLSBNSU5fU1BFRUQpICsgTUlOX1NQRUVELFxuICAgICAgICAgICAgdHlwZTogY2hvb3NlLmFwcGx5KHRoaXMsIHNwcml0ZXMpLFxuICAgICAgICAgICAgaGVhbHRoOiAxMDAsXG4gICAgICAgICAgICBhbGl2ZTogdHJ1ZVxuICAgICAgICB9O1xuICAgICAgICB0YXJnZXRZID0gcm5kKCkgKiBXSURUSDtcbiAgICAgICAgdGFyZ2V0WCA9IHJuZCgpICogSEVJR0hUO1xuICAgICAgICBvYmouYW5nbGUgPSBybmQoKSAqIE1hdGguUEkgKiAyO1xuICAgICAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vIEZJWCBUSElTLCBUSEUgV0lEVEggU0hPVUxEIEJFIERZTkFNSUMgV0hFTiBZT1UgQUREIEEgUFJFTE9BREVSXG4gICAgICAgIG9iai53aWR0aCA9IDEwMDtcbiAgICAgICAgb2JqLmhlaWdodCA9IDYwO1xuXG4gICAgICAgIGlmIChybmQoKSA+IDAuNSkge1xuICAgICAgICAgICAgb2JqLnggKz0gY2hvb3NlKC0xLCAxKSAqIChXSURUSCArIG9iai53aWR0aCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvYmoueSArPSBjaG9vc2UoLTEsIDEpICogKEhFSUdIVCArIG9iai5oZWlnaHQpO1xuICAgICAgICB9XG4gICAgICAgIGVuZW1pZXMucHVzaChvYmopO1xuICAgIH1cbn07XG5cbnZhciBsb29wID0gZnVuY3Rpb24oZWxhcHNlZCwgY3R4LCBvZmZzZXRYLCBvZmZzZXRZKSB7XG4gICAgdmFyIGVuZW15O1xuICAgIGZvciAodmFyIGkgPSBlbmVtaWVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGVuZW15ID0gZW5lbWllc1tpXTtcbiAgICAgICAgaWYgKGVuZW15LmFsaXZlKSB7XG4gICAgICAgICAgICBlbmVteS54ICs9IE1hdGguY29zKGVuZW15LmFuZ2xlKSAqIGVuZW15LnNwZWVkIC0gb2Zmc2V0WDtcbiAgICAgICAgICAgIGVuZW15LnkgKz0gTWF0aC5zaW4oZW5lbXkuYW5nbGUpICogZW5lbXkuc3BlZWQgLSBvZmZzZXRZO1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICdyZWQnO1xuICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShyb2Nrc1tlbmVteS50eXBlXSwgZW5lbXkueCwgZW5lbXkueSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlbmVtaWVzLnNwbGljZShpLCAxKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbG9vcDogbG9vcCxcbiAgICBhcnJheTogZW5lbWllcyxcbiAgICBzcGF3bjogc3Bhd25cbn07IiwidmFyIHBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyJyk7XG52YXIga2V5cyA9IHt9O1xuZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZSkge1xuICAgIGlmIChlLmtleUNvZGUgPT09IDMyKSB7XG4gICAgICAgIHBsYXllci5mbGlwKCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG4gICAga2V5c1tlLmtleUNvZGVdID0gdHJ1ZTtcbn0pO1xuZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0aW9uKGUpIHtcbiAgICBrZXlzW2Uua2V5Q29kZV0gPSBmYWxzZTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBsZWZ0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbMzddO1xuICAgIH0sXG4gICAgdXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1szOF07XG4gICAgfSxcbiAgICByaWdodDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzWzM5XTtcbiAgICB9LFxuICAgIGRvd246IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1s0MF07XG4gICAgfSxcbiAgICBmbGlwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbMzJdO1xuICAgIH1cbn07XG4iLCJ2YXIgcGFydGljbGVzID0gW107XG52YXIgVyA9IDUsIEggPSA1O1xudmFyIFBhcnRpY2xlID0gZnVuY3Rpb24oeCwgeSwgYW5nbGUsIHNwZWVkKSB7XG4gICAgdGhpcy5hbGl2ZSA9IHRydWU7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICAgIHRoaXMud2lkdGggPSBXO1xuICAgIHRoaXMuaGVpZ2h0ID0gSDtcbiAgICB0aGlzLmFuZ2xlID0gYW5nbGU7XG4gICAgdGhpcy5zcGVlZCA9IHNwZWVkO1xuICAgIHRoaXMub3BhY2l0eSA9IDE7XG4gICAgdGhpcy5kZWxheSA9IE1hdGguY2VpbChNYXRoLnJhbmRvbSgpICogMTApO1xuICAgIHRoaXMubG9vcCA9IGZ1bmN0aW9uKGN0eCwgcGxheWVyKSB7XG4gICAgICAgIGlmICh0aGlzLmRlbGF5ID4gMCkge1xuICAgICAgICAgICAgdGhpcy5kZWxheS0tO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMueCArPSBNYXRoLnNpbigtdGhpcy5hbmdsZSkgKiBzcGVlZDtcbiAgICAgICAgdGhpcy55ICs9IE1hdGguY29zKC10aGlzLmFuZ2xlKSAqIHNwZWVkO1xuICAgICAgICB0aGlzLm9wYWNpdHkgLT0gMC4xO1xuICAgICAgICBpZiAodGhpcy5vcGFjaXR5IDw9IDApIHtcbiAgICAgICAgICAgIHRoaXMub3BhY2l0eSA9IDA7XG4gICAgICAgICAgICB0aGlzLmFsaXZlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRHJhd1xuICAgICAgICBjdHguc2F2ZSgpO1xuICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSB0aGlzLm9wYWNpdHk7XG4gICAgICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JlZCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCBXLCBIKTtcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICB9O1xufTtcblxuLy8geCwgeSBhcmUgZml4ZWRcbi8vIFBhcnRpY2xlcyBhcmUgY3JlYXRlZCBmcm9tIGFuZ2xlLXJhbmdlIHRvIGFuZ2xlK3JhbmdlXG4vLyBzcGVlZCBpcyBmaXhlZFxudmFyIGFuZ2xlID0gMDtcbnZhciBjcmVhdGVQYXJ0aWNsZXMgPSBmdW5jdGlvbih4LCB5LCBwbGF5ZXJBbmdsZSwgcmFuZ2UsIHNwZWVkLCBuKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ0NyZWF0aW5nJywgcGFydGljbGVzKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICBpZiAocGFydGljbGVzW2ldICYmICFwYXJ0aWNsZXNbaV0uYWxpdmUgfHwgIXBhcnRpY2xlc1tpXSkge1xuICAgICAgICAgICAgYW5nbGUgPSBwbGF5ZXJBbmdsZSAtIHJhbmdlICsgKE1hdGgucmFuZG9tKCkgKiAyICogcmFuZ2UpO1xuICAgICAgICAgICAgcGFydGljbGVzW2ldID0gbmV3IFBhcnRpY2xlKHgsIHksIGFuZ2xlLCBzcGVlZCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG52YXIgZHJhdyA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCwgcGxheWVyKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0aWNsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcGFydGljbGVzW2ldLmxvb3AoY3R4LCBwbGF5ZXIpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNyZWF0ZVBhcnRpY2xlczogY3JlYXRlUGFydGljbGVzLFxuICAgIGRyYXc6IGRyYXcsXG4gICAgYXJyYXk6IHBhcnRpY2xlc1xufTtcbiIsInZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKCcuL3RyYW5zZm9ybS5qcycpO1xudmFyIGNhbnZhcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNnYW1lJyk7XG5cbndpbmRvdy5wbGF5ZXIgPSB7fTtcblxucGxheWVyLmlkbGUgPSBuZXcgSW1hZ2UoKTtcbnBsYXllci5pZGxlLnNyYyA9ICdpbWFnZXMvYXN0cm8ucG5nJztcbnBsYXllci5mbHlpbmcgPSBuZXcgSW1hZ2UoKTtcbnBsYXllci5mbHlpbmcuc3JjID0gJ2ltYWdlcy9hc3Ryby1mbHlpbmcucG5nJztcbnBsYXllci5zdGF0ZSA9ICdpZGxlJztcblxucGxheWVyLndpZHRoID0gNTI7XG5wbGF5ZXIuaGVpZ2h0ID0gNjA7XG5wbGF5ZXIueCA9IChjYW52YXMud2lkdGggLSBwbGF5ZXIud2lkdGgpIC8gMjtcbnBsYXllci55ID0gKGNhbnZhcy5oZWlnaHQgLSBwbGF5ZXIuaGVpZ2h0KSAvIDI7XG5wbGF5ZXIuYW5nbGUgPSAwO1xuXG5wbGF5ZXIub2Zmc2V0WCA9IHBsYXllci5vZmZzZXRZID0gMDtcblxuXG4vLyBIYWxmIHdpZHRoLCBoYWxmIGhlaWdodFxudmFyIGhXID0gcGxheWVyLndpZHRoIC8gMjtcbnZhciBoSCA9IHBsYXllci5oZWlnaHQgLyAyO1xuXG52YXIgc3BlZWQgPSAwOyAvLyBUaGUgY3VycmVudCBzcGVlZFxudmFyIGRTcGVlZDtcbnZhciBkWCA9IDAsIGRZID0gMDtcblxuLy8gWU9VIENBTiBDT05GSUdVUkUgVEhFU0UhIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG52YXIgYWNjID0gNzsgLy8gQWNjZWxlcmF0aW9uXG52YXIgbGltID0gMTA7IC8vIFNwZWVkIGxpbWl0XG52YXIgdHVyblNwZWVkID0gMi4yO1xudmFyIGdyYXYgPSAwLjA4O1xuLy8gTk8gTU9SRSBDT05GSUdVUklORyEgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbnBsYXllci5ncmF2aXR5ID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIGRZIC09IGdyYXY7XG59O1xucGxheWVyLm1vdmUgPSBmdW5jdGlvbihlbGFwc2VkLCBmbHlpbmcpIHtcbiAgICBwbGF5ZXIub2Zmc2V0WCA9IGRYO1xuICAgIHBsYXllci5vZmZzZXRZID0gLWRZO1xuICAgIGRYICo9IDAuOTk7XG4gICAgZFkgKj0gMC45OTtcblxuICAgIGlmICghZmx5aW5nKSB7XG4gICAgICAgIHBsYXllci5zdGF0ZSA9ICdpZGxlJztcbiAgICB9XG59O1xucGxheWVyLnVwID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5zdGF0ZSA9ICdmbHlpbmcnO1xuICAgIHNwZWVkICs9IGFjYztcbiAgICBkU3BlZWQgPSBlbGFwc2VkICogc3BlZWQ7XG4gICAgLy8gY29uc29sZS5sb2cocGxheWVyLngsIHBsYXllci55KTtcbiAgICAvLyBjb25zb2xlLmxvZyhNYXRoLnNpbihwbGF5ZXIuYW5nbGUpICogZFNwZWVkLCBNYXRoLmNvcyhwbGF5ZXIuYW5nbGUpICogZFNwZWVkKTtcbiAgICBkWCArPSBNYXRoLnNpbihwbGF5ZXIuYW5nbGUpICogZFNwZWVkO1xuICAgIGRZICs9IE1hdGguY29zKHBsYXllci5hbmdsZSkgKiBkU3BlZWQ7XG4gICAgcGxheWVyLm1vdmUoZWxhcHNlZCwgdHJ1ZSk7XG4gICAgaWYgKHNwZWVkID4gbGltKSB7XG4gICAgICAgIHNwZWVkID0gbGltO1xuICAgIH1cbiAgICBlbHNlIGlmIChzcGVlZCA8IC1saW0pIHtcbiAgICAgICAgc3BlZWQgPSAtbGltO1xuICAgIH1cblxufTtcbnBsYXllci5yaWdodCA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBwbGF5ZXIuYW5nbGUgKz0gZWxhcHNlZCAqIHR1cm5TcGVlZCAqIE1hdGguUEk7XG59O1xucGxheWVyLmxlZnQgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgcGxheWVyLmFuZ2xlIC09IGVsYXBzZWQgKiB0dXJuU3BlZWQgKiBNYXRoLlBJO1xufTtcbnBsYXllci5mbGlwID0gZnVuY3Rpb24oKSB7XG4gICAgcGxheWVyLmFuZ2xlICs9IE1hdGguUEk7XG59O1xuXG52YXIgdCA9IG5ldyBUcmFuc2Zvcm0oKTtcblxucGxheWVyLmRyYXcgPSBmdW5jdGlvbihlbGFwc2VkLCBjdHgpIHtcbiAgICAvLyBQbGF5ZXJcbiAgICBjdHguc2F2ZSgpO1xuICAgIGN0eC50cmFuc2xhdGUocGxheWVyLnggKyBoVywgcGxheWVyLnkgKyBoSCk7XG4gICAgdC50cmFuc2xhdGUocGxheWVyLnggKyBoVywgcGxheWVyLnkgKyBoSCk7XG4gICAgY3R4LnJvdGF0ZShwbGF5ZXIuYW5nbGUpO1xuICAgIHQucm90YXRlKHBsYXllci5hbmdsZSk7XG4gICAgY3R4LmRyYXdJbWFnZShwbGF5ZXJbcGxheWVyLnN0YXRlXSwgLWhXLCAtaEgpO1xuICAgIGN0eC5yZXN0b3JlKCk7XG5cbiAgICBwbGF5ZXIudG9wTGVmdCA9IHQudHJhbnNmb3JtUG9pbnQoLWhXLCAtaEgpO1xuICAgIHBsYXllci50b3BSaWdodCA9IHQudHJhbnNmb3JtUG9pbnQoaFcsIC1oSCk7XG4gICAgcGxheWVyLmJvdHRvbUxlZnQgPSB0LnRyYW5zZm9ybVBvaW50KC1oVywgaEgpO1xuICAgIHBsYXllci5ib3R0b21SaWdodCA9IHQudHJhbnNmb3JtUG9pbnQoaFcsIGhIKTtcbiAgICB0LnJlc2V0KCk7XG59O1xubW9kdWxlLmV4cG9ydHMgPSBwbGF5ZXI7XG4iLCIvLyBIb2xkcyBsYXN0IGl0ZXJhdGlvbiB0aW1lc3RhbXAuXG52YXIgdGltZSA9IDA7XG5cbi8qKlxuICogQ2FsbHMgYGZuYCBvbiBuZXh0IGZyYW1lLlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiBUaGUgZnVuY3Rpb25cbiAqIEByZXR1cm4ge2ludH0gVGhlIHJlcXVlc3QgSURcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiByYWYoZm4pIHtcbiAgcmV0dXJuIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgdmFyIGVsYXBzZWQgPSBub3cgLSB0aW1lO1xuXG4gICAgaWYgKGVsYXBzZWQgPiA5OTkpIHtcbiAgICAgIGVsYXBzZWQgPSAxIC8gNjA7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsYXBzZWQgLz0gMTAwMDtcbiAgICB9XG5cbiAgICB0aW1lID0gbm93O1xuICAgIGZuKGVsYXBzZWQpO1xuICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIC8qKlxuICAgKiBDYWxscyBgZm5gIG9uIGV2ZXJ5IGZyYW1lIHdpdGggYGVsYXBzZWRgIHNldCB0byB0aGUgZWxhcHNlZFxuICAgKiB0aW1lIGluIG1pbGxpc2Vjb25kcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuIFRoZSBmdW5jdGlvblxuICAgKiBAcmV0dXJuIHtpbnR9IFRoZSByZXF1ZXN0IElEXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzdGFydDogZnVuY3Rpb24oZm4pIHtcbiAgICByZXR1cm4gcmFmKGZ1bmN0aW9uIHRpY2soZWxhcHNlZCkge1xuICAgICAgZm4oZWxhcHNlZCk7XG4gICAgICByYWYodGljayk7XG4gICAgfSk7XG4gIH0sXG4gIC8qKlxuICAgKiBDYW5jZWxzIHRoZSBzcGVjaWZpZWQgYW5pbWF0aW9uIGZyYW1lIHJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSB7aW50fSBpZCBUaGUgcmVxdWVzdCBJRFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgc3RvcDogZnVuY3Rpb24oaWQpIHtcbiAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoaWQpO1xuICB9XG59O1xuIiwiLy8gTGFzdCB1cGRhdGVkIE5vdmVtYmVyIDIwMTFcbi8vIEJ5IFNpbW9uIFNhcnJpc1xuLy8gd3d3LnNpbW9uc2FycmlzLmNvbVxuLy8gc2FycmlzQGFjbS5vcmdcbi8vXG4vLyBGcmVlIHRvIHVzZSBhbmQgZGlzdHJpYnV0ZSBhdCB3aWxsXG4vLyBTbyBsb25nIGFzIHlvdSBhcmUgbmljZSB0byBwZW9wbGUsIGV0Y1xuXG4vLyBTaW1wbGUgY2xhc3MgZm9yIGtlZXBpbmcgdHJhY2sgb2YgdGhlIGN1cnJlbnQgdHJhbnNmb3JtYXRpb24gbWF0cml4XG5cbi8vIEZvciBpbnN0YW5jZTpcbi8vICAgIHZhciB0ID0gbmV3IFRyYW5zZm9ybSgpO1xuLy8gICAgdC5yb3RhdGUoNSk7XG4vLyAgICB2YXIgbSA9IHQubTtcbi8vICAgIGN0eC5zZXRUcmFuc2Zvcm0obVswXSwgbVsxXSwgbVsyXSwgbVszXSwgbVs0XSwgbVs1XSk7XG5cbi8vIElzIGVxdWl2YWxlbnQgdG86XG4vLyAgICBjdHgucm90YXRlKDUpO1xuXG4vLyBCdXQgbm93IHlvdSBjYW4gcmV0cmlldmUgaXQgOilcblxuLy8gUmVtZW1iZXIgdGhhdCB0aGlzIGRvZXMgbm90IGFjY291bnQgZm9yIGFueSBDU1MgdHJhbnNmb3JtcyBhcHBsaWVkIHRvIHRoZSBjYW52YXNcblxuZnVuY3Rpb24gVHJhbnNmb3JtKCkge1xuICB0aGlzLnJlc2V0KCk7XG59XG5cblRyYW5zZm9ybS5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5tID0gWzEsMCwwLDEsMCwwXTtcbn07XG5cblRyYW5zZm9ybS5wcm90b3R5cGUubXVsdGlwbHkgPSBmdW5jdGlvbihtYXRyaXgpIHtcbiAgdmFyIG0xMSA9IHRoaXMubVswXSAqIG1hdHJpeC5tWzBdICsgdGhpcy5tWzJdICogbWF0cml4Lm1bMV07XG4gIHZhciBtMTIgPSB0aGlzLm1bMV0gKiBtYXRyaXgubVswXSArIHRoaXMubVszXSAqIG1hdHJpeC5tWzFdO1xuXG4gIHZhciBtMjEgPSB0aGlzLm1bMF0gKiBtYXRyaXgubVsyXSArIHRoaXMubVsyXSAqIG1hdHJpeC5tWzNdO1xuICB2YXIgbTIyID0gdGhpcy5tWzFdICogbWF0cml4Lm1bMl0gKyB0aGlzLm1bM10gKiBtYXRyaXgubVszXTtcblxuICB2YXIgZHggPSB0aGlzLm1bMF0gKiBtYXRyaXgubVs0XSArIHRoaXMubVsyXSAqIG1hdHJpeC5tWzVdICsgdGhpcy5tWzRdO1xuICB2YXIgZHkgPSB0aGlzLm1bMV0gKiBtYXRyaXgubVs0XSArIHRoaXMubVszXSAqIG1hdHJpeC5tWzVdICsgdGhpcy5tWzVdO1xuXG4gIHRoaXMubVswXSA9IG0xMTtcbiAgdGhpcy5tWzFdID0gbTEyO1xuICB0aGlzLm1bMl0gPSBtMjE7XG4gIHRoaXMubVszXSA9IG0yMjtcbiAgdGhpcy5tWzRdID0gZHg7XG4gIHRoaXMubVs1XSA9IGR5O1xufTtcblxuVHJhbnNmb3JtLnByb3RvdHlwZS5pbnZlcnQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGQgPSAxIC8gKHRoaXMubVswXSAqIHRoaXMubVszXSAtIHRoaXMubVsxXSAqIHRoaXMubVsyXSk7XG4gIHZhciBtMCA9IHRoaXMubVszXSAqIGQ7XG4gIHZhciBtMSA9IC10aGlzLm1bMV0gKiBkO1xuICB2YXIgbTIgPSAtdGhpcy5tWzJdICogZDtcbiAgdmFyIG0zID0gdGhpcy5tWzBdICogZDtcbiAgdmFyIG00ID0gZCAqICh0aGlzLm1bMl0gKiB0aGlzLm1bNV0gLSB0aGlzLm1bM10gKiB0aGlzLm1bNF0pO1xuICB2YXIgbTUgPSBkICogKHRoaXMubVsxXSAqIHRoaXMubVs0XSAtIHRoaXMubVswXSAqIHRoaXMubVs1XSk7XG4gIHRoaXMubVswXSA9IG0wO1xuICB0aGlzLm1bMV0gPSBtMTtcbiAgdGhpcy5tWzJdID0gbTI7XG4gIHRoaXMubVszXSA9IG0zO1xuICB0aGlzLm1bNF0gPSBtNDtcbiAgdGhpcy5tWzVdID0gbTU7XG59O1xuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnJvdGF0ZSA9IGZ1bmN0aW9uKHJhZCkge1xuICB2YXIgYyA9IE1hdGguY29zKHJhZCk7XG4gIHZhciBzID0gTWF0aC5zaW4ocmFkKTtcbiAgdmFyIG0xMSA9IHRoaXMubVswXSAqIGMgKyB0aGlzLm1bMl0gKiBzO1xuICB2YXIgbTEyID0gdGhpcy5tWzFdICogYyArIHRoaXMubVszXSAqIHM7XG4gIHZhciBtMjEgPSB0aGlzLm1bMF0gKiAtcyArIHRoaXMubVsyXSAqIGM7XG4gIHZhciBtMjIgPSB0aGlzLm1bMV0gKiAtcyArIHRoaXMubVszXSAqIGM7XG4gIHRoaXMubVswXSA9IG0xMTtcbiAgdGhpcy5tWzFdID0gbTEyO1xuICB0aGlzLm1bMl0gPSBtMjE7XG4gIHRoaXMubVszXSA9IG0yMjtcbn07XG5cblRyYW5zZm9ybS5wcm90b3R5cGUudHJhbnNsYXRlID0gZnVuY3Rpb24oeCwgeSkge1xuICB0aGlzLm1bNF0gKz0gdGhpcy5tWzBdICogeCArIHRoaXMubVsyXSAqIHk7XG4gIHRoaXMubVs1XSArPSB0aGlzLm1bMV0gKiB4ICsgdGhpcy5tWzNdICogeTtcbn07XG5cblRyYW5zZm9ybS5wcm90b3R5cGUuc2NhbGUgPSBmdW5jdGlvbihzeCwgc3kpIHtcbiAgdGhpcy5tWzBdICo9IHN4O1xuICB0aGlzLm1bMV0gKj0gc3g7XG4gIHRoaXMubVsyXSAqPSBzeTtcbiAgdGhpcy5tWzNdICo9IHN5O1xufTtcblxuVHJhbnNmb3JtLnByb3RvdHlwZS50cmFuc2Zvcm1Qb2ludCA9IGZ1bmN0aW9uKHB4LCBweSkge1xuICB2YXIgeCA9IHB4O1xuICB2YXIgeSA9IHB5O1xuICBweCA9IHggKiB0aGlzLm1bMF0gKyB5ICogdGhpcy5tWzJdICsgdGhpcy5tWzRdO1xuICBweSA9IHggKiB0aGlzLm1bMV0gKyB5ICogdGhpcy5tWzNdICsgdGhpcy5tWzVdO1xuICByZXR1cm4gW3B4LCBweV07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zZm9ybTsiXX0=
