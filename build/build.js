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
var bax;
var bay;
var dax;
var day;
var angledCollision = function(player, enemy) {
    var colliding = false;

    var x, y;

    var playerPoints = [
        {
            x: player.topLeft[0],
            y: player.topLeft[1]
        },
        {
            x: player.topRight[0],
            y: player.topRight[1]
        },
        {
            x: player.bottomLeft[0],
            y: player.bottomLeft[1]
        },
        {
            x: player.bottomRight[0],
            y: player.bottomRight[1]
        }
    ];

    for (var i = 0; i < playerPoints; i++) {
        x = playerPoints[i].x;
        y = playerPoints[i].y;

        if ((x - ax) * bax + (y - ay) * bay < 0.0) {
            continue;
        }
        if ((x - bx) * bax + (y - by) * bay > 0.0) {
            continue;
        }
        if ((x - ax) * dax + (y - ay) * day < 0.0) {
            continue;
        }
        if ((x - dx) * dax + (y - dy) * day > 0.0) {
            continue;
        }
        colliding = true;
    }
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
    bax = 100;
    bay = 0;
    dax = 100;
    day = 60;
    var enemiesToTest = inArea(playerArea, enemies);
    for (var i = 0; i < enemiesToTest.length; i++) {
        if (angledCollision(player, enemiesToTest[i])) {
            console.log('HIT');
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4vc3JjL21haW4iLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy9jb2xsaXNpb25zLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvSlMxM2svMjAxNC9zcmMvZW5lbWllcy5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvc3JjL2tleXMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy9wYXJ0aWNsZXMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy9wbGF5ZXIuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy9yYWYuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy90cmFuc2Zvcm0uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciByYWYgPSByZXF1aXJlKCcuL3JhZicpO1xudmFyIHBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyJyk7XG52YXIga2V5ID0gcmVxdWlyZSgnLi9rZXlzJyk7XG52YXIgcGFydGljbGVzID0gcmVxdWlyZSgnLi9wYXJ0aWNsZXMnKTtcbnZhciBlbmVtaWVzID0gcmVxdWlyZSgnLi9lbmVtaWVzJyk7XG52YXIgY29sbGlzaW9ucyA9IHJlcXVpcmUoJy4vY29sbGlzaW9ucycpO1xuXG52YXIgY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2dhbWUnKTtcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxucmFmLnN0YXJ0KGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBwbGF5ZXIuZ3Jhdml0eShlbGFwc2VkKTtcbiAgICBpZiAoa2V5LnVwKCkpIHtcbiAgICAgICAgcGxheWVyLnVwKGVsYXBzZWQpO1xuICAgICAgICBwYXJ0aWNsZXMuY3JlYXRlUGFydGljbGVzKHBsYXllci54ICsgcGxheWVyLndpZHRoIC8gMiwgcGxheWVyLnkgKyBwbGF5ZXIuaGVpZ2h0LCBwbGF5ZXIuYW5nbGUsIE1hdGguUEkgLyAxMCwgMTAsIDEwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwbGF5ZXIubW92ZShlbGFwc2VkKTtcbiAgICB9XG5cbiAgICBpZiAoa2V5LnJpZ2h0KCkpIHtcbiAgICAgICAgcGxheWVyLnJpZ2h0KGVsYXBzZWQpO1xuICAgIH1cbiAgICBpZiAoa2V5LmxlZnQoKSkge1xuICAgICAgICBwbGF5ZXIubGVmdChlbGFwc2VkKTtcbiAgICB9XG5cbiAgICBjb2xsaXNpb25zLmNoZWNrKHBsYXllciwgcGFydGljbGVzLCBlbmVtaWVzKTtcblxuICAgIC8vIENsZWFyIHRoZSBzY3JlZW5cbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XG5cbiAgICBlbmVtaWVzLmxvb3AoZWxhcHNlZCwgY3R4LCBwbGF5ZXIub2Zmc2V0WCwgcGxheWVyLm9mZnNldFkpO1xuICAgIHBhcnRpY2xlcy5kcmF3KGVsYXBzZWQsIGN0eCwgcGxheWVyKTtcbiAgICBwbGF5ZXIuZHJhdyhlbGFwc2VkLCBjdHgpO1xuXG59KTtcbiIsInZhciBiYXg7XG52YXIgYmF5O1xudmFyIGRheDtcbnZhciBkYXk7XG52YXIgYW5nbGVkQ29sbGlzaW9uID0gZnVuY3Rpb24ocGxheWVyLCBlbmVteSkge1xuICAgIHZhciBjb2xsaWRpbmcgPSBmYWxzZTtcblxuICAgIHZhciB4LCB5O1xuXG4gICAgdmFyIHBsYXllclBvaW50cyA9IFtcbiAgICAgICAge1xuICAgICAgICAgICAgeDogcGxheWVyLnRvcExlZnRbMF0sXG4gICAgICAgICAgICB5OiBwbGF5ZXIudG9wTGVmdFsxXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB4OiBwbGF5ZXIudG9wUmlnaHRbMF0sXG4gICAgICAgICAgICB5OiBwbGF5ZXIudG9wUmlnaHRbMV1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgeDogcGxheWVyLmJvdHRvbUxlZnRbMF0sXG4gICAgICAgICAgICB5OiBwbGF5ZXIuYm90dG9tTGVmdFsxXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB4OiBwbGF5ZXIuYm90dG9tUmlnaHRbMF0sXG4gICAgICAgICAgICB5OiBwbGF5ZXIuYm90dG9tUmlnaHRbMV1cbiAgICAgICAgfVxuICAgIF07XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBsYXllclBvaW50czsgaSsrKSB7XG4gICAgICAgIHggPSBwbGF5ZXJQb2ludHNbaV0ueDtcbiAgICAgICAgeSA9IHBsYXllclBvaW50c1tpXS55O1xuXG4gICAgICAgIGlmICgoeCAtIGF4KSAqIGJheCArICh5IC0gYXkpICogYmF5IDwgMC4wKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoKHggLSBieCkgKiBiYXggKyAoeSAtIGJ5KSAqIGJheSA+IDAuMCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCh4IC0gYXgpICogZGF4ICsgKHkgLSBheSkgKiBkYXkgPCAwLjApIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmICgoeCAtIGR4KSAqIGRheCArICh5IC0gZHkpICogZGF5ID4gMC4wKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjb2xsaWRpbmcgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gY29sbGlkaW5nO1xufTtcblxudmFyIGFhYmIgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgaWYgKFxuICAgICAgICBNYXRoLmFicyhhLnggKyBhLndpZHRoIC8gMiAtIGIueCAtIGIud2lkdGggLyAyKSA+IChhLndpZHRoICsgYi53aWR0aCkgLyAyIHx8XG4gICAgICAgIE1hdGguYWJzKGEueSArIGEuaGVpZ2h0IC8gMiAtIGIueSAtIGIuaGVpZ2h0IC8gMikgPiAoYS5oZWlnaHQgKyBiLmhlaWdodCkgLyAyXG4gICAgKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG52YXIgaW5BcmVhID0gZnVuY3Rpb24oYXJlYSwgYXJyYXksIHJlc3BDb2xsaWRpbmcsIHJlc3BOb3RDb2xsaWRpbmcpIHtcbiAgICB2YXIgcmV0ID0gW107XG4gICAgdmFyIGN1ckVsZW07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjdXJFbGVtID0gYXJyYXlbaV07XG4gICAgICAgIGlmIChhYWJiKGFyZWEsIGN1ckVsZW0pKSB7XG4gICAgICAgICAgICByZXQucHVzaChjdXJFbGVtKTtcbiAgICAgICAgICAgIGlmIChyZXNwQ29sbGlkaW5nKSB7XG4gICAgICAgICAgICAgICAgcmVzcENvbGxpZGluZyhjdXJFbGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChyZXNwTm90Q29sbGlkaW5nKSB7XG4gICAgICAgICAgICByZXNwTm90Q29sbGlkaW5nKGN1ckVsZW0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59O1xuXG52YXIgcGxheWVyQXJlYSA9IHtcbiAgICB4OiAzMjUsXG4gICAgeTogMjI1LFxuICAgIHdpZHRoOiAxNTAsXG4gICAgaGVpZ2h0OiAxNTBcbn07XG5cbnZhciBjYW1lcmEgPSB7XG4gICAgeDogLTQwMCxcbiAgICB5OiAtMzAwLFxuICAgIHdpZHRoOiAxNjAwLFxuICAgIGhlaWdodDogMTIwMFxufTtcblxudmFyIGNoZWNrID0gZnVuY3Rpb24ocGxheWVyLCBwYXJ0aWNsZXNNb2R1bGUsIGVuZW1pZXNNb2R1bGUpIHtcbiAgICB2YXIgcGFydGljbGVzID0gcGFydGljbGVzTW9kdWxlLmFycmF5O1xuICAgIHZhciBlbmVtaWVzID0gZW5lbWllc01vZHVsZS5hcnJheTtcbiAgICAvLyBNYW5hZ2UgZW5lbXkgc3Bhd25pbmdcbiAgICB2YXIgZW5lbWllc0luVmlldyA9IGluQXJlYShjYW1lcmEsIGVuZW1pZXMsIHVuZGVmaW5lZCwgZnVuY3Rpb24oZW5lbXkpIHtcbiAgICAgICAgZW5lbXkuYWxpdmUgPSBmYWxzZTtcbiAgICB9KTtcbiAgICBpZiAoZW5lbWllc0luVmlldy5sZW5ndGggPCAzMCkge1xuICAgICAgICBlbmVtaWVzTW9kdWxlLnNwYXduKE1hdGgucmFuZG9tKCkgKiAxMDApO1xuICAgIH1cblxuICAgIC8vIENvbGxpc2lvbnMgYmV0d2VlbiB0aGUgcGxheWVyIGFuZCByb2Nrc1xuICAgIGJheCA9IDEwMDtcbiAgICBiYXkgPSAwO1xuICAgIGRheCA9IDEwMDtcbiAgICBkYXkgPSA2MDtcbiAgICB2YXIgZW5lbWllc1RvVGVzdCA9IGluQXJlYShwbGF5ZXJBcmVhLCBlbmVtaWVzKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVuZW1pZXNUb1Rlc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGFuZ2xlZENvbGxpc2lvbihwbGF5ZXIsIGVuZW1pZXNUb1Rlc3RbaV0pKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnSElUJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgY29sbGlzaW9ucyBiZXR3ZWVuIHBhcnRpY2xlcyBhbmQgZW5lbWllc1xuICAgIHZhciBlbmVtaWVzSHVydCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydGljbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGluQXJlYShwYXJ0aWNsZXNbaV0sIGVuZW1pZXMsIGZ1bmN0aW9uKGVuZW15KSB7XG4gICAgICAgICAgICBpZiAocGFydGljbGVzW2ldLmFsaXZlKSB7XG4gICAgICAgICAgICAgICAgZW5lbXkuYWxpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY2hlY2s6IGNoZWNrXG59OyIsInZhciBlbmVtaWVzID0gW107XG5cbnZhciBzcHJpdGVzID0gW1xuICAgICdyb2NrLWFsdC01LnBuZycsXG4gICAgJ3JvY2stb2RkLTEucG5nJyxcbiAgICAncm9jay1vZGQtMy5wbmcnLFxuICAgICdyb2NrLW9kZC00LnBuZydcbl07XG5cbnZhciByb2NrcyA9IHt9O1xuZm9yICh2YXIgaSA9IDA7IGkgPCBzcHJpdGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgcm9ja3Nbc3ByaXRlc1tpXV0gPSBuZXcgSW1hZ2UoKTtcbiAgICByb2Nrc1tzcHJpdGVzW2ldXS5zcmMgPSAnaW1hZ2VzLycgKyBzcHJpdGVzW2ldO1xufVxuXG52YXIgcm5kID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCk7XG59O1xudmFyIGNob29zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcmd1bWVudHNbTWF0aC5mbG9vcihybmQoKSAqIGFyZ3VtZW50cy5sZW5ndGgpXTtcbn07XG5cbnZhciBTUEFXTl9SQU5HRSA9IDEwMDtcbnZhciBNSU5fU1BFRUQgPSAwLjMsIE1BWF9TUEVFRCA9IDI7XG52YXIgV0lEVEggPSA4MDAsIEhFSUdIVCA9IDYwMDtcblxudmFyIHNwYXduID0gZnVuY3Rpb24obikge1xuICAgIGNvbnNvbGUubG9nKCdTcGF3bmVkIGVuZW1pZXM6Jywgbik7XG4gICAgdmFyIG9iaiwgdGFyZ2V0WSwgdGFyZ2V0WDtcbiAgICB2YXIgc2lnblgsIHNpZ25ZLCBwb3NYLCBwb3NZO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIG9iaiA9IHtcbiAgICAgICAgICAgIHg6IChybmQoKSAqIFdJRFRIKSxcbiAgICAgICAgICAgIHk6IChybmQoKSAqIEhFSUdIVCksXG4gICAgICAgICAgICBzcGVlZDogcm5kKCkgKiAoTUFYX1NQRUVEIC0gTUlOX1NQRUVEKSArIE1JTl9TUEVFRCxcbiAgICAgICAgICAgIHR5cGU6IGNob29zZS5hcHBseSh0aGlzLCBzcHJpdGVzKSxcbiAgICAgICAgICAgIGhlYWx0aDogMTAwLFxuICAgICAgICAgICAgYWxpdmU6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgdGFyZ2V0WSA9IHJuZCgpICogV0lEVEg7XG4gICAgICAgIHRhcmdldFggPSBybmQoKSAqIEhFSUdIVDtcbiAgICAgICAgb2JqLmFuZ2xlID0gcm5kKCkgKiBNYXRoLlBJICogMjtcbiAgICAgICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLyBGSVggVEhJUywgVEhFIFdJRFRIIFNIT1VMRCBCRSBEWU5BTUlDIFdIRU4gWU9VIEFERCBBIFBSRUxPQURFUlxuICAgICAgICBvYmoud2lkdGggPSAxMDA7XG4gICAgICAgIG9iai5oZWlnaHQgPSA2MDtcblxuICAgICAgICBpZiAocm5kKCkgPiAwLjUpIHtcbiAgICAgICAgICAgIG9iai54ICs9IGNob29zZSgtMSwgMSkgKiAoV0lEVEggKyBvYmoud2lkdGgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgb2JqLnkgKz0gY2hvb3NlKC0xLCAxKSAqIChIRUlHSFQgKyBvYmouaGVpZ2h0KTtcbiAgICAgICAgfVxuICAgICAgICBlbmVtaWVzLnB1c2gob2JqKTtcbiAgICB9XG59O1xuXG52YXIgbG9vcCA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCwgb2Zmc2V0WCwgb2Zmc2V0WSkge1xuICAgIHZhciBlbmVteTtcbiAgICBmb3IgKHZhciBpID0gZW5lbWllcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICBlbmVteSA9IGVuZW1pZXNbaV07XG4gICAgICAgIGlmIChlbmVteS5hbGl2ZSkge1xuICAgICAgICAgICAgZW5lbXkueCArPSBNYXRoLmNvcyhlbmVteS5hbmdsZSkgKiBlbmVteS5zcGVlZCAtIG9mZnNldFg7XG4gICAgICAgICAgICBlbmVteS55ICs9IE1hdGguc2luKGVuZW15LmFuZ2xlKSAqIGVuZW15LnNwZWVkIC0gb2Zmc2V0WTtcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAncmVkJztcbiAgICAgICAgICAgIGN0eC5kcmF3SW1hZ2Uocm9ja3NbZW5lbXkudHlwZV0sIGVuZW15LngsIGVuZW15LnkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZW5lbWllcy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxvb3A6IGxvb3AsXG4gICAgYXJyYXk6IGVuZW1pZXMsXG4gICAgc3Bhd246IHNwYXduXG59OyIsInZhciBwbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpO1xudmFyIGtleXMgPSB7fTtcbmRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAoZS5rZXlDb2RlID09PSAzMikge1xuICAgICAgICBwbGF5ZXIuZmxpcCgpO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuICAgIGtleXNbZS5rZXlDb2RlXSA9IHRydWU7XG59KTtcbmRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdGlvbihlKSB7XG4gICAga2V5c1tlLmtleUNvZGVdID0gZmFsc2U7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbGVmdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzWzM3XTtcbiAgICB9LFxuICAgIHVwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbMzhdO1xuICAgIH0sXG4gICAgcmlnaHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1szOV07XG4gICAgfSxcbiAgICBkb3duOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbNDBdO1xuICAgIH0sXG4gICAgZmxpcDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzWzMyXTtcbiAgICB9XG59O1xuIiwidmFyIHBhcnRpY2xlcyA9IFtdO1xudmFyIFcgPSA1LCBIID0gNTtcbnZhciBQYXJ0aWNsZSA9IGZ1bmN0aW9uKHgsIHksIGFuZ2xlLCBzcGVlZCkge1xuICAgIHRoaXMuYWxpdmUgPSB0cnVlO1xuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgICB0aGlzLndpZHRoID0gVztcbiAgICB0aGlzLmhlaWdodCA9IEg7XG4gICAgdGhpcy5hbmdsZSA9IGFuZ2xlO1xuICAgIHRoaXMuc3BlZWQgPSBzcGVlZDtcbiAgICB0aGlzLm9wYWNpdHkgPSAxO1xuICAgIHRoaXMuZGVsYXkgPSBNYXRoLmNlaWwoTWF0aC5yYW5kb20oKSAqIDEwKTtcbiAgICB0aGlzLmxvb3AgPSBmdW5jdGlvbihjdHgsIHBsYXllcikge1xuICAgICAgICBpZiAodGhpcy5kZWxheSA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuZGVsYXktLTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnggKz0gTWF0aC5zaW4oLXRoaXMuYW5nbGUpICogc3BlZWQ7XG4gICAgICAgIHRoaXMueSArPSBNYXRoLmNvcygtdGhpcy5hbmdsZSkgKiBzcGVlZDtcbiAgICAgICAgdGhpcy5vcGFjaXR5IC09IDAuMTtcbiAgICAgICAgaWYgKHRoaXMub3BhY2l0eSA8PSAwKSB7XG4gICAgICAgICAgICB0aGlzLm9wYWNpdHkgPSAwO1xuICAgICAgICAgICAgdGhpcy5hbGl2ZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vIERyYXdcbiAgICAgICAgY3R4LnNhdmUoKTtcbiAgICAgICAgY3R4Lmdsb2JhbEFscGhhID0gdGhpcy5vcGFjaXR5O1xuICAgICAgICBjdHgudHJhbnNsYXRlKHRoaXMueCwgdGhpcy55KTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICdyZWQnO1xuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgVywgSCk7XG4gICAgICAgIGN0eC5yZXN0b3JlKCk7XG4gICAgfTtcbn07XG5cbi8vIHgsIHkgYXJlIGZpeGVkXG4vLyBQYXJ0aWNsZXMgYXJlIGNyZWF0ZWQgZnJvbSBhbmdsZS1yYW5nZSB0byBhbmdsZStyYW5nZVxuLy8gc3BlZWQgaXMgZml4ZWRcbnZhciBhbmdsZSA9IDA7XG52YXIgY3JlYXRlUGFydGljbGVzID0gZnVuY3Rpb24oeCwgeSwgcGxheWVyQW5nbGUsIHJhbmdlLCBzcGVlZCwgbikge1xuICAgIC8vIGNvbnNvbGUubG9nKCdDcmVhdGluZycsIHBhcnRpY2xlcyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgaWYgKHBhcnRpY2xlc1tpXSAmJiAhcGFydGljbGVzW2ldLmFsaXZlIHx8ICFwYXJ0aWNsZXNbaV0pIHtcbiAgICAgICAgICAgIGFuZ2xlID0gcGxheWVyQW5nbGUgLSByYW5nZSArIChNYXRoLnJhbmRvbSgpICogMiAqIHJhbmdlKTtcbiAgICAgICAgICAgIHBhcnRpY2xlc1tpXSA9IG5ldyBQYXJ0aWNsZSh4LCB5LCBhbmdsZSwgc3BlZWQpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxudmFyIGRyYXcgPSBmdW5jdGlvbihlbGFwc2VkLCBjdHgsIHBsYXllcikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydGljbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHBhcnRpY2xlc1tpXS5sb29wKGN0eCwgcGxheWVyKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjcmVhdGVQYXJ0aWNsZXM6IGNyZWF0ZVBhcnRpY2xlcyxcbiAgICBkcmF3OiBkcmF3LFxuICAgIGFycmF5OiBwYXJ0aWNsZXNcbn07XG4iLCJ2YXIgVHJhbnNmb3JtID0gcmVxdWlyZSgnLi90cmFuc2Zvcm0uanMnKTtcbnZhciBjYW52YXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZ2FtZScpO1xuXG53aW5kb3cucGxheWVyID0ge307XG5cbnBsYXllci5pZGxlID0gbmV3IEltYWdlKCk7XG5wbGF5ZXIuaWRsZS5zcmMgPSAnaW1hZ2VzL2FzdHJvLnBuZyc7XG5wbGF5ZXIuZmx5aW5nID0gbmV3IEltYWdlKCk7XG5wbGF5ZXIuZmx5aW5nLnNyYyA9ICdpbWFnZXMvYXN0cm8tZmx5aW5nLnBuZyc7XG5wbGF5ZXIuc3RhdGUgPSAnaWRsZSc7XG5cbnBsYXllci53aWR0aCA9IDUyO1xucGxheWVyLmhlaWdodCA9IDYwO1xucGxheWVyLnggPSAoY2FudmFzLndpZHRoIC0gcGxheWVyLndpZHRoKSAvIDI7XG5wbGF5ZXIueSA9IChjYW52YXMuaGVpZ2h0IC0gcGxheWVyLmhlaWdodCkgLyAyO1xucGxheWVyLmFuZ2xlID0gMDtcblxucGxheWVyLm9mZnNldFggPSBwbGF5ZXIub2Zmc2V0WSA9IDA7XG5cblxuLy8gSGFsZiB3aWR0aCwgaGFsZiBoZWlnaHRcbnZhciBoVyA9IHBsYXllci53aWR0aCAvIDI7XG52YXIgaEggPSBwbGF5ZXIuaGVpZ2h0IC8gMjtcblxudmFyIHNwZWVkID0gMDsgLy8gVGhlIGN1cnJlbnQgc3BlZWRcbnZhciBkU3BlZWQ7XG52YXIgZFggPSAwLCBkWSA9IDA7XG5cbi8vIFlPVSBDQU4gQ09ORklHVVJFIFRIRVNFISAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxudmFyIGFjYyA9IDc7IC8vIEFjY2VsZXJhdGlvblxudmFyIGxpbSA9IDEwOyAvLyBTcGVlZCBsaW1pdFxudmFyIHR1cm5TcGVlZCA9IDIuMjtcbnZhciBncmF2ID0gMC4wODtcbi8vIE5PIE1PUkUgQ09ORklHVVJJTkchIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5wbGF5ZXIuZ3Jhdml0eSA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBkWSAtPSBncmF2O1xufTtcbnBsYXllci5tb3ZlID0gZnVuY3Rpb24oZWxhcHNlZCwgZmx5aW5nKSB7XG4gICAgcGxheWVyLm9mZnNldFggPSBkWDtcbiAgICBwbGF5ZXIub2Zmc2V0WSA9IC1kWTtcbiAgICBkWCAqPSAwLjk5O1xuICAgIGRZICo9IDAuOTk7XG5cbiAgICBpZiAoIWZseWluZykge1xuICAgICAgICBwbGF5ZXIuc3RhdGUgPSAnaWRsZSc7XG4gICAgfVxufTtcbnBsYXllci51cCA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBwbGF5ZXIuc3RhdGUgPSAnZmx5aW5nJztcbiAgICBzcGVlZCArPSBhY2M7XG4gICAgZFNwZWVkID0gZWxhcHNlZCAqIHNwZWVkO1xuICAgIC8vIGNvbnNvbGUubG9nKHBsYXllci54LCBwbGF5ZXIueSk7XG4gICAgLy8gY29uc29sZS5sb2coTWF0aC5zaW4ocGxheWVyLmFuZ2xlKSAqIGRTcGVlZCwgTWF0aC5jb3MocGxheWVyLmFuZ2xlKSAqIGRTcGVlZCk7XG4gICAgZFggKz0gTWF0aC5zaW4ocGxheWVyLmFuZ2xlKSAqIGRTcGVlZDtcbiAgICBkWSArPSBNYXRoLmNvcyhwbGF5ZXIuYW5nbGUpICogZFNwZWVkO1xuICAgIHBsYXllci5tb3ZlKGVsYXBzZWQsIHRydWUpO1xuICAgIGlmIChzcGVlZCA+IGxpbSkge1xuICAgICAgICBzcGVlZCA9IGxpbTtcbiAgICB9XG4gICAgZWxzZSBpZiAoc3BlZWQgPCAtbGltKSB7XG4gICAgICAgIHNwZWVkID0gLWxpbTtcbiAgICB9XG5cbn07XG5wbGF5ZXIucmlnaHQgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgcGxheWVyLmFuZ2xlICs9IGVsYXBzZWQgKiB0dXJuU3BlZWQgKiBNYXRoLlBJO1xufTtcbnBsYXllci5sZWZ0ID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5hbmdsZSAtPSBlbGFwc2VkICogdHVyblNwZWVkICogTWF0aC5QSTtcbn07XG5wbGF5ZXIuZmxpcCA9IGZ1bmN0aW9uKCkge1xuICAgIHBsYXllci5hbmdsZSArPSBNYXRoLlBJO1xufTtcblxudmFyIHQgPSBuZXcgVHJhbnNmb3JtKCk7XG5cbnBsYXllci5kcmF3ID0gZnVuY3Rpb24oZWxhcHNlZCwgY3R4KSB7XG4gICAgLy8gUGxheWVyXG4gICAgY3R4LnNhdmUoKTtcbiAgICBjdHgudHJhbnNsYXRlKHBsYXllci54ICsgaFcsIHBsYXllci55ICsgaEgpO1xuICAgIHQudHJhbnNsYXRlKHBsYXllci54ICsgaFcsIHBsYXllci55ICsgaEgpO1xuICAgIGN0eC5yb3RhdGUocGxheWVyLmFuZ2xlKTtcbiAgICB0LnJvdGF0ZShwbGF5ZXIuYW5nbGUpO1xuICAgIGN0eC5kcmF3SW1hZ2UocGxheWVyW3BsYXllci5zdGF0ZV0sIC1oVywgLWhIKTtcbiAgICBjdHgucmVzdG9yZSgpO1xuXG4gICAgcGxheWVyLnRvcExlZnQgPSB0LnRyYW5zZm9ybVBvaW50KC1oVywgLWhIKTtcbiAgICBwbGF5ZXIudG9wUmlnaHQgPSB0LnRyYW5zZm9ybVBvaW50KGhXLCAtaEgpO1xuICAgIHBsYXllci5ib3R0b21MZWZ0ID0gdC50cmFuc2Zvcm1Qb2ludCgtaFcsIGhIKTtcbiAgICBwbGF5ZXIuYm90dG9tUmlnaHQgPSB0LnRyYW5zZm9ybVBvaW50KGhXLCBoSCk7XG4gICAgdC5yZXNldCgpO1xufTtcbm1vZHVsZS5leHBvcnRzID0gcGxheWVyO1xuIiwiLy8gSG9sZHMgbGFzdCBpdGVyYXRpb24gdGltZXN0YW1wLlxudmFyIHRpbWUgPSAwO1xuXG4vKipcbiAqIENhbGxzIGBmbmAgb24gbmV4dCBmcmFtZS5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm4gVGhlIGZ1bmN0aW9uXG4gKiBAcmV0dXJuIHtpbnR9IFRoZSByZXF1ZXN0IElEXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gcmFmKGZuKSB7XG4gIHJldHVybiB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgIHZhciBlbGFwc2VkID0gbm93IC0gdGltZTtcblxuICAgIGlmIChlbGFwc2VkID4gOTk5KSB7XG4gICAgICBlbGFwc2VkID0gMSAvIDYwO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbGFwc2VkIC89IDEwMDA7XG4gICAgfVxuXG4gICAgdGltZSA9IG5vdztcbiAgICBmbihlbGFwc2VkKTtcbiAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAvKipcbiAgICogQ2FsbHMgYGZuYCBvbiBldmVyeSBmcmFtZSB3aXRoIGBlbGFwc2VkYCBzZXQgdG8gdGhlIGVsYXBzZWRcbiAgICogdGltZSBpbiBtaWxsaXNlY29uZHMuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiBUaGUgZnVuY3Rpb25cbiAgICogQHJldHVybiB7aW50fSBUaGUgcmVxdWVzdCBJRFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgc3RhcnQ6IGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIHJhZihmdW5jdGlvbiB0aWNrKGVsYXBzZWQpIHtcbiAgICAgIGZuKGVsYXBzZWQpO1xuICAgICAgcmFmKHRpY2spO1xuICAgIH0pO1xuICB9LFxuICAvKipcbiAgICogQ2FuY2VscyB0aGUgc3BlY2lmaWVkIGFuaW1hdGlvbiBmcmFtZSByZXF1ZXN0LlxuICAgKlxuICAgKiBAcGFyYW0ge2ludH0gaWQgVGhlIHJlcXVlc3QgSURcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHN0b3A6IGZ1bmN0aW9uKGlkKSB7XG4gICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKGlkKTtcbiAgfVxufTtcbiIsIi8vIExhc3QgdXBkYXRlZCBOb3ZlbWJlciAyMDExXG4vLyBCeSBTaW1vbiBTYXJyaXNcbi8vIHd3dy5zaW1vbnNhcnJpcy5jb21cbi8vIHNhcnJpc0BhY20ub3JnXG4vL1xuLy8gRnJlZSB0byB1c2UgYW5kIGRpc3RyaWJ1dGUgYXQgd2lsbFxuLy8gU28gbG9uZyBhcyB5b3UgYXJlIG5pY2UgdG8gcGVvcGxlLCBldGNcblxuLy8gU2ltcGxlIGNsYXNzIGZvciBrZWVwaW5nIHRyYWNrIG9mIHRoZSBjdXJyZW50IHRyYW5zZm9ybWF0aW9uIG1hdHJpeFxuXG4vLyBGb3IgaW5zdGFuY2U6XG4vLyAgICB2YXIgdCA9IG5ldyBUcmFuc2Zvcm0oKTtcbi8vICAgIHQucm90YXRlKDUpO1xuLy8gICAgdmFyIG0gPSB0Lm07XG4vLyAgICBjdHguc2V0VHJhbnNmb3JtKG1bMF0sIG1bMV0sIG1bMl0sIG1bM10sIG1bNF0sIG1bNV0pO1xuXG4vLyBJcyBlcXVpdmFsZW50IHRvOlxuLy8gICAgY3R4LnJvdGF0ZSg1KTtcblxuLy8gQnV0IG5vdyB5b3UgY2FuIHJldHJpZXZlIGl0IDopXG5cbi8vIFJlbWVtYmVyIHRoYXQgdGhpcyBkb2VzIG5vdCBhY2NvdW50IGZvciBhbnkgQ1NTIHRyYW5zZm9ybXMgYXBwbGllZCB0byB0aGUgY2FudmFzXG5cbmZ1bmN0aW9uIFRyYW5zZm9ybSgpIHtcbiAgdGhpcy5yZXNldCgpO1xufVxuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMubSA9IFsxLDAsMCwxLDAsMF07XG59O1xuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLm11bHRpcGx5ID0gZnVuY3Rpb24obWF0cml4KSB7XG4gIHZhciBtMTEgPSB0aGlzLm1bMF0gKiBtYXRyaXgubVswXSArIHRoaXMubVsyXSAqIG1hdHJpeC5tWzFdO1xuICB2YXIgbTEyID0gdGhpcy5tWzFdICogbWF0cml4Lm1bMF0gKyB0aGlzLm1bM10gKiBtYXRyaXgubVsxXTtcblxuICB2YXIgbTIxID0gdGhpcy5tWzBdICogbWF0cml4Lm1bMl0gKyB0aGlzLm1bMl0gKiBtYXRyaXgubVszXTtcbiAgdmFyIG0yMiA9IHRoaXMubVsxXSAqIG1hdHJpeC5tWzJdICsgdGhpcy5tWzNdICogbWF0cml4Lm1bM107XG5cbiAgdmFyIGR4ID0gdGhpcy5tWzBdICogbWF0cml4Lm1bNF0gKyB0aGlzLm1bMl0gKiBtYXRyaXgubVs1XSArIHRoaXMubVs0XTtcbiAgdmFyIGR5ID0gdGhpcy5tWzFdICogbWF0cml4Lm1bNF0gKyB0aGlzLm1bM10gKiBtYXRyaXgubVs1XSArIHRoaXMubVs1XTtcblxuICB0aGlzLm1bMF0gPSBtMTE7XG4gIHRoaXMubVsxXSA9IG0xMjtcbiAgdGhpcy5tWzJdID0gbTIxO1xuICB0aGlzLm1bM10gPSBtMjI7XG4gIHRoaXMubVs0XSA9IGR4O1xuICB0aGlzLm1bNV0gPSBkeTtcbn07XG5cblRyYW5zZm9ybS5wcm90b3R5cGUuaW52ZXJ0ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBkID0gMSAvICh0aGlzLm1bMF0gKiB0aGlzLm1bM10gLSB0aGlzLm1bMV0gKiB0aGlzLm1bMl0pO1xuICB2YXIgbTAgPSB0aGlzLm1bM10gKiBkO1xuICB2YXIgbTEgPSAtdGhpcy5tWzFdICogZDtcbiAgdmFyIG0yID0gLXRoaXMubVsyXSAqIGQ7XG4gIHZhciBtMyA9IHRoaXMubVswXSAqIGQ7XG4gIHZhciBtNCA9IGQgKiAodGhpcy5tWzJdICogdGhpcy5tWzVdIC0gdGhpcy5tWzNdICogdGhpcy5tWzRdKTtcbiAgdmFyIG01ID0gZCAqICh0aGlzLm1bMV0gKiB0aGlzLm1bNF0gLSB0aGlzLm1bMF0gKiB0aGlzLm1bNV0pO1xuICB0aGlzLm1bMF0gPSBtMDtcbiAgdGhpcy5tWzFdID0gbTE7XG4gIHRoaXMubVsyXSA9IG0yO1xuICB0aGlzLm1bM10gPSBtMztcbiAgdGhpcy5tWzRdID0gbTQ7XG4gIHRoaXMubVs1XSA9IG01O1xufTtcblxuVHJhbnNmb3JtLnByb3RvdHlwZS5yb3RhdGUgPSBmdW5jdGlvbihyYWQpIHtcbiAgdmFyIGMgPSBNYXRoLmNvcyhyYWQpO1xuICB2YXIgcyA9IE1hdGguc2luKHJhZCk7XG4gIHZhciBtMTEgPSB0aGlzLm1bMF0gKiBjICsgdGhpcy5tWzJdICogcztcbiAgdmFyIG0xMiA9IHRoaXMubVsxXSAqIGMgKyB0aGlzLm1bM10gKiBzO1xuICB2YXIgbTIxID0gdGhpcy5tWzBdICogLXMgKyB0aGlzLm1bMl0gKiBjO1xuICB2YXIgbTIyID0gdGhpcy5tWzFdICogLXMgKyB0aGlzLm1bM10gKiBjO1xuICB0aGlzLm1bMF0gPSBtMTE7XG4gIHRoaXMubVsxXSA9IG0xMjtcbiAgdGhpcy5tWzJdID0gbTIxO1xuICB0aGlzLm1bM10gPSBtMjI7XG59O1xuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgdGhpcy5tWzRdICs9IHRoaXMubVswXSAqIHggKyB0aGlzLm1bMl0gKiB5O1xuICB0aGlzLm1bNV0gKz0gdGhpcy5tWzFdICogeCArIHRoaXMubVszXSAqIHk7XG59O1xuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnNjYWxlID0gZnVuY3Rpb24oc3gsIHN5KSB7XG4gIHRoaXMubVswXSAqPSBzeDtcbiAgdGhpcy5tWzFdICo9IHN4O1xuICB0aGlzLm1bMl0gKj0gc3k7XG4gIHRoaXMubVszXSAqPSBzeTtcbn07XG5cblRyYW5zZm9ybS5wcm90b3R5cGUudHJhbnNmb3JtUG9pbnQgPSBmdW5jdGlvbihweCwgcHkpIHtcbiAgdmFyIHggPSBweDtcbiAgdmFyIHkgPSBweTtcbiAgcHggPSB4ICogdGhpcy5tWzBdICsgeSAqIHRoaXMubVsyXSArIHRoaXMubVs0XTtcbiAgcHkgPSB4ICogdGhpcy5tWzFdICsgeSAqIHRoaXMubVszXSArIHRoaXMubVs1XTtcbiAgcmV0dXJuIFtweCwgcHldO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUcmFuc2Zvcm07Il19
