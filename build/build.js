(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
    enemies.draw(elapsed, ctx);
    player.draw(elapsed, ctx);
});

},{"./enemies":2,"./keys":3,"./player":5,"./raf":6}],2:[function(require,module,exports){
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
},{}],3:[function(require,module,exports){
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

},{"./player":5}],4:[function(require,module,exports){
var particles = [];
var W = 5, H = 5;
var Particle = function(x, y, angle, speed) {
    this.alive = true;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed;
    this.opacity = 1;
    this.delay = Math.random() * 10;
    this.loop = function(ctx, player) {
        if (this.delay > 0) {
            this.delay--;
            return false;
        }
        if (this.delay === 1) {
            this.x = player.x + player.width / 2;
            this.y = player.y + player.height;
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
        angle = playerAngle - range + (Math.random() * 2 * range);
        if (particles[i] && !particles[i].alive || !particles[i]) {
            particles[i] = new Particle(x, y, angle, speed);
        }
    }
};

var draw = function(ctx, player) {
    for (var i = 0; i < particles.length; i++) {
        particles[i].loop(ctx, player);
    }
};

module.exports = {
    createParticles: createParticles,
    draw: draw
};

},{}],5:[function(require,module,exports){
var particles = require('./particles');

var player = {};

player.idle = new Image();
player.idle.src = 'images/astro.png';
player.flying = new Image();
player.flying.src = 'images/astro-flying.png';
player.state = 'idle';

player.x = 0;
player.y = 0;
player.width = 52;
player.height = 60;
player.angle = 0;


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
    player.x += dX;
    player.y -= dY;
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

    particles.createParticles(player.x + hW, player.y + player.height, player.angle, Math.PI / 10, 10, 10);
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
    ctx.translate(player.x + hW, player.y + hH);
    ctx.rotate(player.angle);
    // ctx.fillRect(-hW, -hH, player.width, player.height);
    ctx.drawImage(player[player.state], -hW, -hH);
    // Flames
    ctx.fillStyle = 'red';
    ctx.fillRect(-hW, hH, player.width, 5);
    ctx.restore();

    // ctx.fillRect(player.x, player.y, 10, 10);
};
module.exports = player;

},{"./particles":4}],6:[function(require,module,exports){
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

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4vc3JjL21haW4iLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy9lbmVtaWVzLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvSlMxM2svMjAxNC9zcmMva2V5cy5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvc3JjL3BhcnRpY2xlcy5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvc3JjL3BsYXllci5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvc3JjL3JhZi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgcmFmID0gcmVxdWlyZSgnLi9yYWYnKTtcbnZhciBwbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpO1xudmFyIGtleSA9IHJlcXVpcmUoJy4va2V5cycpO1xudmFyIGVuZW1pZXMgPSByZXF1aXJlKCcuL2VuZW1pZXMnKTtcblxudmFyIGNhbnZhcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNnYW1lJyk7XG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbnJhZi5zdGFydChmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgcGxheWVyLmdyYXZpdHkoZWxhcHNlZCk7XG4gICAgaWYgKGtleS51cCgpKSB7XG4gICAgICAgIHBsYXllci51cChlbGFwc2VkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhwbGF5ZXIueCwgcGxheWVyLnkpO1xuICAgICAgICBwbGF5ZXIubW92ZShlbGFwc2VkKTtcbiAgICB9XG5cbiAgICBpZiAoa2V5LnJpZ2h0KCkpIHtcbiAgICAgICAgcGxheWVyLnJpZ2h0KGVsYXBzZWQpO1xuICAgIH1cbiAgICBpZiAoa2V5LmxlZnQoKSkge1xuICAgICAgICBwbGF5ZXIubGVmdChlbGFwc2VkKTtcbiAgICB9XG5cbiAgICBpZiAoZW5lbWllcy5hcnJheS5sZW5ndGggPCA1KSB7XG4gICAgICAgIGVuZW1pZXMuc3Bhd24oTWF0aC5yYW5kb20oKSAqIDUwKTtcbiAgICB9XG5cbiAgICAvLyBDbGVhciB0aGUgc2NyZWVuXG4gICAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICAgIGVuZW1pZXMuZHJhdyhlbGFwc2VkLCBjdHgpO1xuICAgIHBsYXllci5kcmF3KGVsYXBzZWQsIGN0eCk7XG59KTtcbiIsInZhciBlbmVtaWVzID0gW107XG5cbnZhciBybmQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKTtcbn07XG52YXIgZWl0aGVyID0gZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBybmQoKSA8IDAuNSA/IGEgOiBiO1xufTtcblxudmFyIFNQQVdOX1JBTkdFID0gMTAwO1xudmFyIE1JTl9TUEVFRCA9IDAuMywgTUFYX1NQRUVEID0gMjtcbnZhciBNQVhfV0lEVEggPSA1MCwgTUFYX0hFSUdIVCA9IDUwO1xudmFyIE1JTl9XSURUSCA9IDUsIE1JTl9IRUlHSFQgPSA1O1xudmFyIFdJRFRIID0gODAwLCBIRUlHSFQgPSA2MDA7XG5cbnZhciBzcGF3biA9IGZ1bmN0aW9uKG4pIHtcbiAgICBjb25zb2xlLmxvZygnU3Bhd25lZCBlbmVtaWVzOicsIG4pO1xuICAgIHZhciBvYmosIHRhcmdldFksIHRhcmdldFg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgb2JqID0ge1xuICAgICAgICAgICAgeDogKGVpdGhlcigtMSwgMSkgKiBTUEFXTl9SQU5HRSAqIHJuZCgpKSArIChlaXRoZXIoMCwgMSkgKiBXSURUSCksXG4gICAgICAgICAgICB5OiAoZWl0aGVyKC0xLCAxKSAqIFNQQVdOX1JBTkdFICogcm5kKCkpICsgKGVpdGhlcigwLCAxKSAqIEhFSUdIVCksXG4gICAgICAgICAgICB3aWR0aDogcm5kKCkgKiAoTUFYX1dJRFRIIC0gTUlOX1dJRFRIKSArIE1JTl9XSURUSCxcbiAgICAgICAgICAgIGhlaWdodDogcm5kKCkgKiAoTUFYX0hFSUdIVCAtIE1JTl9IRUlHSFQpICsgTUlOX0hFSUdIVCxcbiAgICAgICAgICAgIHNwZWVkOiBybmQoKSAqIChNQVhfU1BFRUQgLSBNSU5fU1BFRUQpICsgTUlOX1NQRUVEXG4gICAgICAgIH07XG4gICAgICAgIHRhcmdldFkgPSBybmQoKSAqIFdJRFRIO1xuICAgICAgICB0YXJnZXRYID0gcm5kKCkgKiBIRUlHSFQ7XG4gICAgICAgIG9iai5hbmdsZSA9IE1hdGguYXRhbjIodGFyZ2V0WSAtIG9iai55LCB0YXJnZXRYIC0gb2JqLngpO1xuICAgICAgICBlbmVtaWVzLnB1c2gob2JqKTtcbiAgICB9XG59O1xuXG52YXIgZHJhdyA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCkge1xuICAgIHZhciBlbmVteTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gZW5lbWllcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBlbmVteSA9IGVuZW1pZXNbaV07XG4gICAgICAgIGVuZW15LnggKz0gTWF0aC5jb3MoZW5lbXkuYW5nbGUpICogZW5lbXkuc3BlZWQ7XG4gICAgICAgIGVuZW15LnkgKz0gTWF0aC5zaW4oZW5lbXkuYW5nbGUpICogZW5lbXkuc3BlZWQ7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAncmVkJztcbiAgICAgICAgY3R4LmZpbGxSZWN0KGVuZW15LngsIGVuZW15LnksIGVuZW15LndpZHRoLCBlbmVteS5oZWlnaHQpO1xuICAgIH1cbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZHJhdzogZHJhdyxcbiAgICBhcnJheTogZW5lbWllcyxcbiAgICBzcGF3bjogc3Bhd25cbn07IiwidmFyIHBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyJyk7XG52YXIga2V5cyA9IHt9O1xuZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZSkge1xuICAgIGlmIChlLmtleUNvZGUgPT09IDMyKSB7XG4gICAgICAgIHBsYXllci5mbGlwKCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG4gICAga2V5c1tlLmtleUNvZGVdID0gdHJ1ZTtcbn0pO1xuZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0aW9uKGUpIHtcbiAgICBrZXlzW2Uua2V5Q29kZV0gPSBmYWxzZTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBsZWZ0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbMzddO1xuICAgIH0sXG4gICAgdXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1szOF07XG4gICAgfSxcbiAgICByaWdodDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzWzM5XTtcbiAgICB9LFxuICAgIGRvd246IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1s0MF07XG4gICAgfSxcbiAgICBmbGlwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbMzJdO1xuICAgIH1cbn07XG4iLCJ2YXIgcGFydGljbGVzID0gW107XG52YXIgVyA9IDUsIEggPSA1O1xudmFyIFBhcnRpY2xlID0gZnVuY3Rpb24oeCwgeSwgYW5nbGUsIHNwZWVkKSB7XG4gICAgdGhpcy5hbGl2ZSA9IHRydWU7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICAgIHRoaXMuYW5nbGUgPSBhbmdsZTtcbiAgICB0aGlzLnNwZWVkID0gc3BlZWQ7XG4gICAgdGhpcy5vcGFjaXR5ID0gMTtcbiAgICB0aGlzLmRlbGF5ID0gTWF0aC5yYW5kb20oKSAqIDEwO1xuICAgIHRoaXMubG9vcCA9IGZ1bmN0aW9uKGN0eCwgcGxheWVyKSB7XG4gICAgICAgIGlmICh0aGlzLmRlbGF5ID4gMCkge1xuICAgICAgICAgICAgdGhpcy5kZWxheS0tO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmRlbGF5ID09PSAxKSB7XG4gICAgICAgICAgICB0aGlzLnggPSBwbGF5ZXIueCArIHBsYXllci53aWR0aCAvIDI7XG4gICAgICAgICAgICB0aGlzLnkgPSBwbGF5ZXIueSArIHBsYXllci5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy54ICs9IE1hdGguc2luKC10aGlzLmFuZ2xlKSAqIHNwZWVkO1xuICAgICAgICB0aGlzLnkgKz0gTWF0aC5jb3MoLXRoaXMuYW5nbGUpICogc3BlZWQ7XG4gICAgICAgIHRoaXMub3BhY2l0eSAtPSAwLjE7XG4gICAgICAgIGlmICh0aGlzLm9wYWNpdHkgPD0gMCkge1xuICAgICAgICAgICAgdGhpcy5vcGFjaXR5ID0gMDtcbiAgICAgICAgICAgIHRoaXMuYWxpdmUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBEcmF3XG4gICAgICAgIGN0eC5zYXZlKCk7XG4gICAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IHRoaXMub3BhY2l0eTtcbiAgICAgICAgY3R4LnRyYW5zbGF0ZSh0aGlzLngsIHRoaXMueSk7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAncmVkJztcbiAgICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIFcsIEgpO1xuICAgICAgICBjdHgucmVzdG9yZSgpO1xuICAgIH07XG59O1xuXG4vLyB4LCB5IGFyZSBmaXhlZFxuLy8gUGFydGljbGVzIGFyZSBjcmVhdGVkIGZyb20gYW5nbGUtcmFuZ2UgdG8gYW5nbGUrcmFuZ2Vcbi8vIHNwZWVkIGlzIGZpeGVkXG52YXIgYW5nbGUgPSAwO1xudmFyIGNyZWF0ZVBhcnRpY2xlcyA9IGZ1bmN0aW9uKHgsIHksIHBsYXllckFuZ2xlLCByYW5nZSwgc3BlZWQsIG4pIHtcbiAgICAvLyBjb25zb2xlLmxvZygnQ3JlYXRpbmcnLCBwYXJ0aWNsZXMpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGFuZ2xlID0gcGxheWVyQW5nbGUgLSByYW5nZSArIChNYXRoLnJhbmRvbSgpICogMiAqIHJhbmdlKTtcbiAgICAgICAgaWYgKHBhcnRpY2xlc1tpXSAmJiAhcGFydGljbGVzW2ldLmFsaXZlIHx8ICFwYXJ0aWNsZXNbaV0pIHtcbiAgICAgICAgICAgIHBhcnRpY2xlc1tpXSA9IG5ldyBQYXJ0aWNsZSh4LCB5LCBhbmdsZSwgc3BlZWQpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxudmFyIGRyYXcgPSBmdW5jdGlvbihjdHgsIHBsYXllcikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydGljbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHBhcnRpY2xlc1tpXS5sb29wKGN0eCwgcGxheWVyKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjcmVhdGVQYXJ0aWNsZXM6IGNyZWF0ZVBhcnRpY2xlcyxcbiAgICBkcmF3OiBkcmF3XG59O1xuIiwidmFyIHBhcnRpY2xlcyA9IHJlcXVpcmUoJy4vcGFydGljbGVzJyk7XG5cbnZhciBwbGF5ZXIgPSB7fTtcblxucGxheWVyLmlkbGUgPSBuZXcgSW1hZ2UoKTtcbnBsYXllci5pZGxlLnNyYyA9ICdpbWFnZXMvYXN0cm8ucG5nJztcbnBsYXllci5mbHlpbmcgPSBuZXcgSW1hZ2UoKTtcbnBsYXllci5mbHlpbmcuc3JjID0gJ2ltYWdlcy9hc3Ryby1mbHlpbmcucG5nJztcbnBsYXllci5zdGF0ZSA9ICdpZGxlJztcblxucGxheWVyLnggPSAwO1xucGxheWVyLnkgPSAwO1xucGxheWVyLndpZHRoID0gNTI7XG5wbGF5ZXIuaGVpZ2h0ID0gNjA7XG5wbGF5ZXIuYW5nbGUgPSAwO1xuXG5cbi8vIEhhbGYgd2lkdGgsIGhhbGYgaGVpZ2h0XG52YXIgaFcgPSBwbGF5ZXIud2lkdGggLyAyO1xudmFyIGhIID0gcGxheWVyLmhlaWdodCAvIDI7XG5cbnZhciBzcGVlZCA9IDA7IC8vIFRoZSBjdXJyZW50IHNwZWVkXG52YXIgZFNwZWVkO1xudmFyIGRYID0gMCwgZFkgPSAwO1xuXG4vLyBZT1UgQ0FOIENPTkZJR1VSRSBUSEVTRSEgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbnZhciBhY2MgPSA3OyAvLyBBY2NlbGVyYXRpb25cbnZhciBsaW0gPSAxMDsgLy8gU3BlZWQgbGltaXRcbnZhciB0dXJuU3BlZWQgPSAyLjI7XG52YXIgZ3JhdiA9IDAuMDg7XG4vLyBOTyBNT1JFIENPTkZJR1VSSU5HISAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxucGxheWVyLmdyYXZpdHkgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgZFkgLT0gZ3Jhdjtcbn07XG5wbGF5ZXIubW92ZSA9IGZ1bmN0aW9uKGVsYXBzZWQsIGZseWluZykge1xuICAgIHBsYXllci54ICs9IGRYO1xuICAgIHBsYXllci55IC09IGRZO1xuICAgIGRYICo9IDAuOTk7XG4gICAgZFkgKj0gMC45OTtcblxuICAgIGlmICghZmx5aW5nKSB7XG4gICAgICAgIHBsYXllci5zdGF0ZSA9ICdpZGxlJztcbiAgICB9XG59O1xucGxheWVyLnVwID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5zdGF0ZSA9ICdmbHlpbmcnO1xuICAgIHNwZWVkICs9IGFjYztcbiAgICBkU3BlZWQgPSBlbGFwc2VkICogc3BlZWQ7XG4gICAgLy8gY29uc29sZS5sb2cocGxheWVyLngsIHBsYXllci55KTtcbiAgICAvLyBjb25zb2xlLmxvZyhNYXRoLnNpbihwbGF5ZXIuYW5nbGUpICogZFNwZWVkLCBNYXRoLmNvcyhwbGF5ZXIuYW5nbGUpICogZFNwZWVkKTtcbiAgICBkWCArPSBNYXRoLnNpbihwbGF5ZXIuYW5nbGUpICogZFNwZWVkO1xuICAgIGRZICs9IE1hdGguY29zKHBsYXllci5hbmdsZSkgKiBkU3BlZWQ7XG4gICAgcGxheWVyLm1vdmUoZWxhcHNlZCwgdHJ1ZSk7XG4gICAgaWYgKHNwZWVkID4gbGltKSB7XG4gICAgICAgIHNwZWVkID0gbGltO1xuICAgIH1cbiAgICBlbHNlIGlmIChzcGVlZCA8IC1saW0pIHtcbiAgICAgICAgc3BlZWQgPSAtbGltO1xuICAgIH1cblxuICAgIHBhcnRpY2xlcy5jcmVhdGVQYXJ0aWNsZXMocGxheWVyLnggKyBoVywgcGxheWVyLnkgKyBwbGF5ZXIuaGVpZ2h0LCBwbGF5ZXIuYW5nbGUsIE1hdGguUEkgLyAxMCwgMTAsIDEwKTtcbn07XG5wbGF5ZXIucmlnaHQgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgcGxheWVyLmFuZ2xlICs9IGVsYXBzZWQgKiB0dXJuU3BlZWQgKiBNYXRoLlBJO1xufTtcbnBsYXllci5sZWZ0ID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5hbmdsZSAtPSBlbGFwc2VkICogdHVyblNwZWVkICogTWF0aC5QSTtcbn07XG5wbGF5ZXIuZmxpcCA9IGZ1bmN0aW9uKCkge1xuICAgIHBsYXllci5hbmdsZSArPSBNYXRoLlBJO1xufTtcblxucGxheWVyLmRyYXcgPSBmdW5jdGlvbihlbGFwc2VkLCBjdHgpIHtcbiAgICBwYXJ0aWNsZXMuZHJhdyhjdHgsIHBsYXllcik7XG5cbiAgICBjdHguc2F2ZSgpO1xuICAgIGN0eC5maWxsU3R5bGUgPSAnYmxhY2snO1xuICAgIGN0eC50cmFuc2xhdGUocGxheWVyLnggKyBoVywgcGxheWVyLnkgKyBoSCk7XG4gICAgY3R4LnJvdGF0ZShwbGF5ZXIuYW5nbGUpO1xuICAgIC8vIGN0eC5maWxsUmVjdCgtaFcsIC1oSCwgcGxheWVyLndpZHRoLCBwbGF5ZXIuaGVpZ2h0KTtcbiAgICBjdHguZHJhd0ltYWdlKHBsYXllcltwbGF5ZXIuc3RhdGVdLCAtaFcsIC1oSCk7XG4gICAgLy8gRmxhbWVzXG4gICAgY3R4LmZpbGxTdHlsZSA9ICdyZWQnO1xuICAgIGN0eC5maWxsUmVjdCgtaFcsIGhILCBwbGF5ZXIud2lkdGgsIDUpO1xuICAgIGN0eC5yZXN0b3JlKCk7XG5cbiAgICAvLyBjdHguZmlsbFJlY3QocGxheWVyLngsIHBsYXllci55LCAxMCwgMTApO1xufTtcbm1vZHVsZS5leHBvcnRzID0gcGxheWVyO1xuIiwiLy8gSG9sZHMgbGFzdCBpdGVyYXRpb24gdGltZXN0YW1wLlxudmFyIHRpbWUgPSAwO1xuXG4vKipcbiAqIENhbGxzIGBmbmAgb24gbmV4dCBmcmFtZS5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm4gVGhlIGZ1bmN0aW9uXG4gKiBAcmV0dXJuIHtpbnR9IFRoZSByZXF1ZXN0IElEXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gcmFmKGZuKSB7XG4gIHJldHVybiB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgIHZhciBlbGFwc2VkID0gbm93IC0gdGltZTtcblxuICAgIGlmIChlbGFwc2VkID4gOTk5KSB7XG4gICAgICBlbGFwc2VkID0gMSAvIDYwO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbGFwc2VkIC89IDEwMDA7XG4gICAgfVxuXG4gICAgdGltZSA9IG5vdztcbiAgICBmbihlbGFwc2VkKTtcbiAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAvKipcbiAgICogQ2FsbHMgYGZuYCBvbiBldmVyeSBmcmFtZSB3aXRoIGBlbGFwc2VkYCBzZXQgdG8gdGhlIGVsYXBzZWRcbiAgICogdGltZSBpbiBtaWxsaXNlY29uZHMuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiBUaGUgZnVuY3Rpb25cbiAgICogQHJldHVybiB7aW50fSBUaGUgcmVxdWVzdCBJRFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgc3RhcnQ6IGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIHJhZihmdW5jdGlvbiB0aWNrKGVsYXBzZWQpIHtcbiAgICAgIGZuKGVsYXBzZWQpO1xuICAgICAgcmFmKHRpY2spO1xuICAgIH0pO1xuICB9LFxuICAvKipcbiAgICogQ2FuY2VscyB0aGUgc3BlY2lmaWVkIGFuaW1hdGlvbiBmcmFtZSByZXF1ZXN0LlxuICAgKlxuICAgKiBAcGFyYW0ge2ludH0gaWQgVGhlIHJlcXVlc3QgSURcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHN0b3A6IGZ1bmN0aW9uKGlkKSB7XG4gICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKGlkKTtcbiAgfVxufTtcbiJdfQ==
