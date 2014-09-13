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

    if (enemies.array.length < 5) {
        enemies.spawn(Math.random() * 50);
    }


    // Clear the screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    collisions.check(player, particles.array, enemies.array, ctx);
    
    enemies.loop(elapsed, ctx, player.offsetX, player.offsetY);
    particles.draw(elapsed, ctx, player);
    player.draw(elapsed, ctx);

});

},{"./collisions":2,"./enemies":3,"./keys":4,"./particles":5,"./player":6,"./raf":7}],2:[function(require,module,exports){
var aabb = function (a, b) {
    if (
        Math.abs(a.x + a.width / 2 - b.x - b.width / 2) > (a.width + b.width) / 2 ||
        Math.abs(a.y + a.height / 2 - b.y - b.height / 2) > (a.height + b.height) / 2
    ) {
        return false;
    }
    return true;
};

var inArea = function(area, array, response) {
    var ret = [];
    var curElem;
    for (var i = 0; i < array.length; i++) {
        curElem = array[i];
        if (aabb(area, curElem)) {
            ret.push(curElem);
            if (response) {
                response(curElem);
            }
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

var check = function(player, particles, enemies, ctx) {
    // Check for collisions between particles and enemies
    var enemiesToTest = inArea(playerArea, enemies);
    console.log(enemiesToTest.length + ' hit');

    var enemiesHurt = [];
    for (var i = 0; i < particles.length; i++) {
        inArea(particles[i], enemies, function(enemy) {
            enemy.alive = false;
        });
    }

    ctx.fillRect(playerArea.x, playerArea.y, playerArea.width, playerArea.height);
};

module.exports = {
    check: check
};
},{}],3:[function(require,module,exports){
var enemies = [];

var sprites = [
    'rock-1.png',
    'rock-2.png',
    'rock-3.png',
    'rock-4.png',
    'rock-5.png',
    'rock-alt-1.png',
    'rock-alt-2.png',
    'rock-alt-3.png',
    'rock-alt-4.png',
    'rock-alt-5.png',
    'rock-odd-1.png',
    'rock-odd-2.png',
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
    for (var i = 0; i < n; i++) {
        obj = {
            x: (choose(-1, 1) * SPAWN_RANGE * rnd()) + (choose(0, 1) * WIDTH),
            y: (choose(-1, 1) * SPAWN_RANGE * rnd()) + (choose(0, 1) * HEIGHT),
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
        enemies.push(obj);
    }
};

var loop = function(elapsed, ctx, offsetX, offsetY) {
    var enemy;
    for (var i = 0, len = enemies.length; i < len; i++) {
        enemy = enemies[i];
        if (enemy.alive) {
            enemy.x += Math.cos(enemy.angle) * enemy.speed - offsetX;
            enemy.y += Math.sin(enemy.angle) * enemy.speed - offsetY;
            ctx.fillStyle = 'red';
            ctx.drawImage(rocks[enemy.type], enemy.x, enemy.y);
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
    // player.angle += Math.PI;
};

player.draw = function(elapsed, ctx) {
    // Player
    ctx.save();
    ctx.translate(player.x + hW, player.y + hH);
    ctx.rotate(player.angle);
    ctx.drawImage(player[player.state], -hW, -hH);
    ctx.restore();
};
module.exports = player;

},{}],7:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4vc3JjL21haW4iLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy9jb2xsaXNpb25zLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvSlMxM2svMjAxNC9zcmMvZW5lbWllcy5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvc3JjL2tleXMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy9wYXJ0aWNsZXMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy9wbGF5ZXIuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy9yYWYuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciByYWYgPSByZXF1aXJlKCcuL3JhZicpO1xudmFyIHBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyJyk7XG52YXIga2V5ID0gcmVxdWlyZSgnLi9rZXlzJyk7XG52YXIgcGFydGljbGVzID0gcmVxdWlyZSgnLi9wYXJ0aWNsZXMnKTtcbnZhciBlbmVtaWVzID0gcmVxdWlyZSgnLi9lbmVtaWVzJyk7XG52YXIgY29sbGlzaW9ucyA9IHJlcXVpcmUoJy4vY29sbGlzaW9ucycpO1xuXG52YXIgY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2dhbWUnKTtcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxucmFmLnN0YXJ0KGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBwbGF5ZXIuZ3Jhdml0eShlbGFwc2VkKTtcbiAgICBpZiAoa2V5LnVwKCkpIHtcbiAgICAgICAgcGxheWVyLnVwKGVsYXBzZWQpO1xuICAgICAgICBwYXJ0aWNsZXMuY3JlYXRlUGFydGljbGVzKHBsYXllci54ICsgcGxheWVyLndpZHRoIC8gMiwgcGxheWVyLnkgKyBwbGF5ZXIuaGVpZ2h0LCBwbGF5ZXIuYW5nbGUsIE1hdGguUEkgLyAxMCwgMTAsIDEwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwbGF5ZXIubW92ZShlbGFwc2VkKTtcbiAgICB9XG5cbiAgICBpZiAoa2V5LnJpZ2h0KCkpIHtcbiAgICAgICAgcGxheWVyLnJpZ2h0KGVsYXBzZWQpO1xuICAgIH1cbiAgICBpZiAoa2V5LmxlZnQoKSkge1xuICAgICAgICBwbGF5ZXIubGVmdChlbGFwc2VkKTtcbiAgICB9XG5cbiAgICBpZiAoZW5lbWllcy5hcnJheS5sZW5ndGggPCA1KSB7XG4gICAgICAgIGVuZW1pZXMuc3Bhd24oTWF0aC5yYW5kb20oKSAqIDUwKTtcbiAgICB9XG5cblxuICAgIC8vIENsZWFyIHRoZSBzY3JlZW5cbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XG4gICAgY29sbGlzaW9ucy5jaGVjayhwbGF5ZXIsIHBhcnRpY2xlcy5hcnJheSwgZW5lbWllcy5hcnJheSwgY3R4KTtcbiAgICBcbiAgICBlbmVtaWVzLmxvb3AoZWxhcHNlZCwgY3R4LCBwbGF5ZXIub2Zmc2V0WCwgcGxheWVyLm9mZnNldFkpO1xuICAgIHBhcnRpY2xlcy5kcmF3KGVsYXBzZWQsIGN0eCwgcGxheWVyKTtcbiAgICBwbGF5ZXIuZHJhdyhlbGFwc2VkLCBjdHgpO1xuXG59KTtcbiIsInZhciBhYWJiID0gZnVuY3Rpb24gKGEsIGIpIHtcbiAgICBpZiAoXG4gICAgICAgIE1hdGguYWJzKGEueCArIGEud2lkdGggLyAyIC0gYi54IC0gYi53aWR0aCAvIDIpID4gKGEud2lkdGggKyBiLndpZHRoKSAvIDIgfHxcbiAgICAgICAgTWF0aC5hYnMoYS55ICsgYS5oZWlnaHQgLyAyIC0gYi55IC0gYi5oZWlnaHQgLyAyKSA+IChhLmhlaWdodCArIGIuaGVpZ2h0KSAvIDJcbiAgICApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbnZhciBpbkFyZWEgPSBmdW5jdGlvbihhcmVhLCBhcnJheSwgcmVzcG9uc2UpIHtcbiAgICB2YXIgcmV0ID0gW107XG4gICAgdmFyIGN1ckVsZW07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjdXJFbGVtID0gYXJyYXlbaV07XG4gICAgICAgIGlmIChhYWJiKGFyZWEsIGN1ckVsZW0pKSB7XG4gICAgICAgICAgICByZXQucHVzaChjdXJFbGVtKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlKGN1ckVsZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59O1xuXG52YXIgcGxheWVyQXJlYSA9IHtcbiAgICB4OiAzMjUsXG4gICAgeTogMjI1LFxuICAgIHdpZHRoOiAxNTAsXG4gICAgaGVpZ2h0OiAxNTBcbn07XG5cbnZhciBjaGVjayA9IGZ1bmN0aW9uKHBsYXllciwgcGFydGljbGVzLCBlbmVtaWVzLCBjdHgpIHtcbiAgICAvLyBDaGVjayBmb3IgY29sbGlzaW9ucyBiZXR3ZWVuIHBhcnRpY2xlcyBhbmQgZW5lbWllc1xuICAgIHZhciBlbmVtaWVzVG9UZXN0ID0gaW5BcmVhKHBsYXllckFyZWEsIGVuZW1pZXMpO1xuICAgIGNvbnNvbGUubG9nKGVuZW1pZXNUb1Rlc3QubGVuZ3RoICsgJyBoaXQnKTtcblxuICAgIHZhciBlbmVtaWVzSHVydCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydGljbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGluQXJlYShwYXJ0aWNsZXNbaV0sIGVuZW1pZXMsIGZ1bmN0aW9uKGVuZW15KSB7XG4gICAgICAgICAgICBlbmVteS5hbGl2ZSA9IGZhbHNlO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjdHguZmlsbFJlY3QocGxheWVyQXJlYS54LCBwbGF5ZXJBcmVhLnksIHBsYXllckFyZWEud2lkdGgsIHBsYXllckFyZWEuaGVpZ2h0KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNoZWNrOiBjaGVja1xufTsiLCJ2YXIgZW5lbWllcyA9IFtdO1xuXG52YXIgc3ByaXRlcyA9IFtcbiAgICAncm9jay0xLnBuZycsXG4gICAgJ3JvY2stMi5wbmcnLFxuICAgICdyb2NrLTMucG5nJyxcbiAgICAncm9jay00LnBuZycsXG4gICAgJ3JvY2stNS5wbmcnLFxuICAgICdyb2NrLWFsdC0xLnBuZycsXG4gICAgJ3JvY2stYWx0LTIucG5nJyxcbiAgICAncm9jay1hbHQtMy5wbmcnLFxuICAgICdyb2NrLWFsdC00LnBuZycsXG4gICAgJ3JvY2stYWx0LTUucG5nJyxcbiAgICAncm9jay1vZGQtMS5wbmcnLFxuICAgICdyb2NrLW9kZC0yLnBuZycsXG4gICAgJ3JvY2stb2RkLTMucG5nJyxcbiAgICAncm9jay1vZGQtNC5wbmcnXG5dO1xuXG52YXIgcm9ja3MgPSB7fTtcbmZvciAodmFyIGkgPSAwOyBpIDwgc3ByaXRlcy5sZW5ndGg7IGkrKykge1xuICAgIHJvY2tzW3Nwcml0ZXNbaV1dID0gbmV3IEltYWdlKCk7XG4gICAgcm9ja3Nbc3ByaXRlc1tpXV0uc3JjID0gJ2ltYWdlcy8nICsgc3ByaXRlc1tpXTtcbn1cblxudmFyIHJuZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpO1xufTtcbnZhciBjaG9vc2UgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXJndW1lbnRzW01hdGguZmxvb3Iocm5kKCkgKiBhcmd1bWVudHMubGVuZ3RoKV07XG59O1xuXG52YXIgU1BBV05fUkFOR0UgPSAxMDA7XG52YXIgTUlOX1NQRUVEID0gMC4zLCBNQVhfU1BFRUQgPSAyO1xudmFyIFdJRFRIID0gODAwLCBIRUlHSFQgPSA2MDA7XG5cbnZhciBzcGF3biA9IGZ1bmN0aW9uKG4pIHtcbiAgICBjb25zb2xlLmxvZygnU3Bhd25lZCBlbmVtaWVzOicsIG4pO1xuICAgIHZhciBvYmosIHRhcmdldFksIHRhcmdldFg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgb2JqID0ge1xuICAgICAgICAgICAgeDogKGNob29zZSgtMSwgMSkgKiBTUEFXTl9SQU5HRSAqIHJuZCgpKSArIChjaG9vc2UoMCwgMSkgKiBXSURUSCksXG4gICAgICAgICAgICB5OiAoY2hvb3NlKC0xLCAxKSAqIFNQQVdOX1JBTkdFICogcm5kKCkpICsgKGNob29zZSgwLCAxKSAqIEhFSUdIVCksXG4gICAgICAgICAgICBzcGVlZDogcm5kKCkgKiAoTUFYX1NQRUVEIC0gTUlOX1NQRUVEKSArIE1JTl9TUEVFRCxcbiAgICAgICAgICAgIHR5cGU6IGNob29zZS5hcHBseSh0aGlzLCBzcHJpdGVzKSxcbiAgICAgICAgICAgIGhlYWx0aDogMTAwLFxuICAgICAgICAgICAgYWxpdmU6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgdGFyZ2V0WSA9IHJuZCgpICogV0lEVEg7XG4gICAgICAgIHRhcmdldFggPSBybmQoKSAqIEhFSUdIVDtcbiAgICAgICAgb2JqLmFuZ2xlID0gcm5kKCkgKiBNYXRoLlBJICogMjtcbiAgICAgICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLyBGSVggVEhJUywgVEhFIFdJRFRIIFNIT1VMRCBCRSBEWU5BTUlDIFdIRU4gWU9VIEFERCBBIFBSRUxPQURFUlxuICAgICAgICBvYmoud2lkdGggPSAxMDA7XG4gICAgICAgIG9iai5oZWlnaHQgPSA2MDtcbiAgICAgICAgZW5lbWllcy5wdXNoKG9iaik7XG4gICAgfVxufTtcblxudmFyIGxvb3AgPSBmdW5jdGlvbihlbGFwc2VkLCBjdHgsIG9mZnNldFgsIG9mZnNldFkpIHtcbiAgICB2YXIgZW5lbXk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGVuZW1pZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgZW5lbXkgPSBlbmVtaWVzW2ldO1xuICAgICAgICBpZiAoZW5lbXkuYWxpdmUpIHtcbiAgICAgICAgICAgIGVuZW15LnggKz0gTWF0aC5jb3MoZW5lbXkuYW5nbGUpICogZW5lbXkuc3BlZWQgLSBvZmZzZXRYO1xuICAgICAgICAgICAgZW5lbXkueSArPSBNYXRoLnNpbihlbmVteS5hbmdsZSkgKiBlbmVteS5zcGVlZCAtIG9mZnNldFk7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JlZCc7XG4gICAgICAgICAgICBjdHguZHJhd0ltYWdlKHJvY2tzW2VuZW15LnR5cGVdLCBlbmVteS54LCBlbmVteS55KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbG9vcDogbG9vcCxcbiAgICBhcnJheTogZW5lbWllcyxcbiAgICBzcGF3bjogc3Bhd25cbn07IiwidmFyIHBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyJyk7XG52YXIga2V5cyA9IHt9O1xuZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZSkge1xuICAgIGlmIChlLmtleUNvZGUgPT09IDMyKSB7XG4gICAgICAgIHBsYXllci5mbGlwKCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG4gICAga2V5c1tlLmtleUNvZGVdID0gdHJ1ZTtcbn0pO1xuZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0aW9uKGUpIHtcbiAgICBrZXlzW2Uua2V5Q29kZV0gPSBmYWxzZTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBsZWZ0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbMzddO1xuICAgIH0sXG4gICAgdXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1szOF07XG4gICAgfSxcbiAgICByaWdodDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzWzM5XTtcbiAgICB9LFxuICAgIGRvd246IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1s0MF07XG4gICAgfSxcbiAgICBmbGlwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbMzJdO1xuICAgIH1cbn07XG4iLCJ2YXIgcGFydGljbGVzID0gW107XG52YXIgVyA9IDUsIEggPSA1O1xudmFyIFBhcnRpY2xlID0gZnVuY3Rpb24oeCwgeSwgYW5nbGUsIHNwZWVkKSB7XG4gICAgdGhpcy5hbGl2ZSA9IHRydWU7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICAgIHRoaXMud2lkdGggPSBXO1xuICAgIHRoaXMuaGVpZ2h0ID0gSDtcbiAgICB0aGlzLmFuZ2xlID0gYW5nbGU7XG4gICAgdGhpcy5zcGVlZCA9IHNwZWVkO1xuICAgIHRoaXMub3BhY2l0eSA9IDE7XG4gICAgdGhpcy5kZWxheSA9IE1hdGguY2VpbChNYXRoLnJhbmRvbSgpICogMTApO1xuICAgIHRoaXMubG9vcCA9IGZ1bmN0aW9uKGN0eCwgcGxheWVyKSB7XG4gICAgICAgIGlmICh0aGlzLmRlbGF5ID4gMCkge1xuICAgICAgICAgICAgdGhpcy5kZWxheS0tO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMueCArPSBNYXRoLnNpbigtdGhpcy5hbmdsZSkgKiBzcGVlZDtcbiAgICAgICAgdGhpcy55ICs9IE1hdGguY29zKC10aGlzLmFuZ2xlKSAqIHNwZWVkO1xuICAgICAgICB0aGlzLm9wYWNpdHkgLT0gMC4xO1xuICAgICAgICBpZiAodGhpcy5vcGFjaXR5IDw9IDApIHtcbiAgICAgICAgICAgIHRoaXMub3BhY2l0eSA9IDA7XG4gICAgICAgICAgICB0aGlzLmFsaXZlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRHJhd1xuICAgICAgICBjdHguc2F2ZSgpO1xuICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSB0aGlzLm9wYWNpdHk7XG4gICAgICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JlZCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCBXLCBIKTtcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICB9O1xufTtcblxuLy8geCwgeSBhcmUgZml4ZWRcbi8vIFBhcnRpY2xlcyBhcmUgY3JlYXRlZCBmcm9tIGFuZ2xlLXJhbmdlIHRvIGFuZ2xlK3JhbmdlXG4vLyBzcGVlZCBpcyBmaXhlZFxudmFyIGFuZ2xlID0gMDtcbnZhciBjcmVhdGVQYXJ0aWNsZXMgPSBmdW5jdGlvbih4LCB5LCBwbGF5ZXJBbmdsZSwgcmFuZ2UsIHNwZWVkLCBuKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ0NyZWF0aW5nJywgcGFydGljbGVzKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICBpZiAocGFydGljbGVzW2ldICYmICFwYXJ0aWNsZXNbaV0uYWxpdmUgfHwgIXBhcnRpY2xlc1tpXSkge1xuICAgICAgICAgICAgYW5nbGUgPSBwbGF5ZXJBbmdsZSAtIHJhbmdlICsgKE1hdGgucmFuZG9tKCkgKiAyICogcmFuZ2UpO1xuICAgICAgICAgICAgcGFydGljbGVzW2ldID0gbmV3IFBhcnRpY2xlKHgsIHksIGFuZ2xlLCBzcGVlZCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG52YXIgZHJhdyA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCwgcGxheWVyKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0aWNsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcGFydGljbGVzW2ldLmxvb3AoY3R4LCBwbGF5ZXIpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNyZWF0ZVBhcnRpY2xlczogY3JlYXRlUGFydGljbGVzLFxuICAgIGRyYXc6IGRyYXcsXG4gICAgYXJyYXk6IHBhcnRpY2xlc1xufTtcbiIsInZhciBjYW52YXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZ2FtZScpO1xuXG53aW5kb3cucGxheWVyID0ge307XG5cbnBsYXllci5pZGxlID0gbmV3IEltYWdlKCk7XG5wbGF5ZXIuaWRsZS5zcmMgPSAnaW1hZ2VzL2FzdHJvLnBuZyc7XG5wbGF5ZXIuZmx5aW5nID0gbmV3IEltYWdlKCk7XG5wbGF5ZXIuZmx5aW5nLnNyYyA9ICdpbWFnZXMvYXN0cm8tZmx5aW5nLnBuZyc7XG5wbGF5ZXIuc3RhdGUgPSAnaWRsZSc7XG5cbnBsYXllci53aWR0aCA9IDUyO1xucGxheWVyLmhlaWdodCA9IDYwO1xucGxheWVyLnggPSAoY2FudmFzLndpZHRoIC0gcGxheWVyLndpZHRoKSAvIDI7XG5wbGF5ZXIueSA9IChjYW52YXMuaGVpZ2h0IC0gcGxheWVyLmhlaWdodCkgLyAyO1xucGxheWVyLmFuZ2xlID0gMDtcblxucGxheWVyLm9mZnNldFggPSBwbGF5ZXIub2Zmc2V0WSA9IDA7XG5cblxuLy8gSGFsZiB3aWR0aCwgaGFsZiBoZWlnaHRcbnZhciBoVyA9IHBsYXllci53aWR0aCAvIDI7XG52YXIgaEggPSBwbGF5ZXIuaGVpZ2h0IC8gMjtcblxudmFyIHNwZWVkID0gMDsgLy8gVGhlIGN1cnJlbnQgc3BlZWRcbnZhciBkU3BlZWQ7XG52YXIgZFggPSAwLCBkWSA9IDA7XG5cbi8vIFlPVSBDQU4gQ09ORklHVVJFIFRIRVNFISAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxudmFyIGFjYyA9IDc7IC8vIEFjY2VsZXJhdGlvblxudmFyIGxpbSA9IDEwOyAvLyBTcGVlZCBsaW1pdFxudmFyIHR1cm5TcGVlZCA9IDIuMjtcbnZhciBncmF2ID0gMC4wODtcbi8vIE5PIE1PUkUgQ09ORklHVVJJTkchIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5wbGF5ZXIuZ3Jhdml0eSA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBkWSAtPSBncmF2O1xufTtcbnBsYXllci5tb3ZlID0gZnVuY3Rpb24oZWxhcHNlZCwgZmx5aW5nKSB7XG4gICAgcGxheWVyLm9mZnNldFggPSBkWDtcbiAgICBwbGF5ZXIub2Zmc2V0WSA9IC1kWTtcbiAgICBkWCAqPSAwLjk5O1xuICAgIGRZICo9IDAuOTk7XG5cbiAgICBpZiAoIWZseWluZykge1xuICAgICAgICBwbGF5ZXIuc3RhdGUgPSAnaWRsZSc7XG4gICAgfVxufTtcbnBsYXllci51cCA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBwbGF5ZXIuc3RhdGUgPSAnZmx5aW5nJztcbiAgICBzcGVlZCArPSBhY2M7XG4gICAgZFNwZWVkID0gZWxhcHNlZCAqIHNwZWVkO1xuICAgIC8vIGNvbnNvbGUubG9nKHBsYXllci54LCBwbGF5ZXIueSk7XG4gICAgLy8gY29uc29sZS5sb2coTWF0aC5zaW4ocGxheWVyLmFuZ2xlKSAqIGRTcGVlZCwgTWF0aC5jb3MocGxheWVyLmFuZ2xlKSAqIGRTcGVlZCk7XG4gICAgZFggKz0gTWF0aC5zaW4ocGxheWVyLmFuZ2xlKSAqIGRTcGVlZDtcbiAgICBkWSArPSBNYXRoLmNvcyhwbGF5ZXIuYW5nbGUpICogZFNwZWVkO1xuICAgIHBsYXllci5tb3ZlKGVsYXBzZWQsIHRydWUpO1xuICAgIGlmIChzcGVlZCA+IGxpbSkge1xuICAgICAgICBzcGVlZCA9IGxpbTtcbiAgICB9XG4gICAgZWxzZSBpZiAoc3BlZWQgPCAtbGltKSB7XG4gICAgICAgIHNwZWVkID0gLWxpbTtcbiAgICB9XG5cbn07XG5wbGF5ZXIucmlnaHQgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgcGxheWVyLmFuZ2xlICs9IGVsYXBzZWQgKiB0dXJuU3BlZWQgKiBNYXRoLlBJO1xufTtcbnBsYXllci5sZWZ0ID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5hbmdsZSAtPSBlbGFwc2VkICogdHVyblNwZWVkICogTWF0aC5QSTtcbn07XG5wbGF5ZXIuZmxpcCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIHBsYXllci5hbmdsZSArPSBNYXRoLlBJO1xufTtcblxucGxheWVyLmRyYXcgPSBmdW5jdGlvbihlbGFwc2VkLCBjdHgpIHtcbiAgICAvLyBQbGF5ZXJcbiAgICBjdHguc2F2ZSgpO1xuICAgIGN0eC50cmFuc2xhdGUocGxheWVyLnggKyBoVywgcGxheWVyLnkgKyBoSCk7XG4gICAgY3R4LnJvdGF0ZShwbGF5ZXIuYW5nbGUpO1xuICAgIGN0eC5kcmF3SW1hZ2UocGxheWVyW3BsYXllci5zdGF0ZV0sIC1oVywgLWhIKTtcbiAgICBjdHgucmVzdG9yZSgpO1xufTtcbm1vZHVsZS5leHBvcnRzID0gcGxheWVyO1xuIiwiLy8gSG9sZHMgbGFzdCBpdGVyYXRpb24gdGltZXN0YW1wLlxudmFyIHRpbWUgPSAwO1xuXG4vKipcbiAqIENhbGxzIGBmbmAgb24gbmV4dCBmcmFtZS5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm4gVGhlIGZ1bmN0aW9uXG4gKiBAcmV0dXJuIHtpbnR9IFRoZSByZXF1ZXN0IElEXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gcmFmKGZuKSB7XG4gIHJldHVybiB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgIHZhciBlbGFwc2VkID0gbm93IC0gdGltZTtcblxuICAgIGlmIChlbGFwc2VkID4gOTk5KSB7XG4gICAgICBlbGFwc2VkID0gMSAvIDYwO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbGFwc2VkIC89IDEwMDA7XG4gICAgfVxuXG4gICAgdGltZSA9IG5vdztcbiAgICBmbihlbGFwc2VkKTtcbiAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAvKipcbiAgICogQ2FsbHMgYGZuYCBvbiBldmVyeSBmcmFtZSB3aXRoIGBlbGFwc2VkYCBzZXQgdG8gdGhlIGVsYXBzZWRcbiAgICogdGltZSBpbiBtaWxsaXNlY29uZHMuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiBUaGUgZnVuY3Rpb25cbiAgICogQHJldHVybiB7aW50fSBUaGUgcmVxdWVzdCBJRFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgc3RhcnQ6IGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIHJhZihmdW5jdGlvbiB0aWNrKGVsYXBzZWQpIHtcbiAgICAgIGZuKGVsYXBzZWQpO1xuICAgICAgcmFmKHRpY2spO1xuICAgIH0pO1xuICB9LFxuICAvKipcbiAgICogQ2FuY2VscyB0aGUgc3BlY2lmaWVkIGFuaW1hdGlvbiBmcmFtZSByZXF1ZXN0LlxuICAgKlxuICAgKiBAcGFyYW0ge2ludH0gaWQgVGhlIHJlcXVlc3QgSURcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHN0b3A6IGZ1bmN0aW9uKGlkKSB7XG4gICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKGlkKTtcbiAgfVxufTtcbiJdfQ==
