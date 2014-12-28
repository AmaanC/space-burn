(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var loader = require('./loader.js');

var raf = require('./raf');
var player = require('./player');
var key = require('./keys');
var particles = require('./particles');
var flyingObjects = require('./ufos');
var collisions = require('./collisions');
var menus = require('./menus.js');
var audio = require('./audio.js');

var canvas = document.querySelector('#game');
var ctx = canvas.getContext('2d');

var sfx = ['collect', 'collide', 'explode_meteor', 'jetpack'];
loader.done(function() {
    audio.mute(); // Because I don't want it autoplaying while I develop it!

    window.state = 'menu';
    raf.start(function(elapsed) {
        if (window.state === 'menu') {
            menus.drawMenu(ctx);
        }
        else if (window.state === 'game') {
            player.gravity(elapsed);
            if (key.up() && player.fuel > 0) {
                audio.play('jetpack');
                player.up(elapsed);
                particles.createParticles(player.x + player.width / 2, player.y + player.height / 2, player.angle, Math.PI / 10, 10, 10);
            } else {
                audio.pause('jetpack');
                player.move(elapsed);
            }

            if (key.right()) {
                player.right(elapsed);
            }
            if (key.left()) {
                player.left(elapsed);
            }

            // This function checks for all required collisions, and calls the corresponding functions after too
            collisions.check(player, flyingObjects);

            // Clear the screen
            ctx.fillStyle = '#0f0d20';
            ctx.fillRect(0, 0, 800, 600);

            flyingObjects.loop(elapsed, ctx, player.offsetX, player.offsetY);
            particles.draw(elapsed, ctx, player);
            player.draw(elapsed, ctx);
            menus.ingame(ctx, player.fuel, player.health, player.score);

            player.score += 0.1;

            if (player.health <= 0) {
                window.state = 'end';
            }
        }
        else if (window.state === 'end') {
            audio.pause(sfx);
            menus.drawEnd(ctx, player.score);
        }

    });
});

var changeState = function() {
    if (window.state === 'menu') {
        window.state = 'game';
    }
    else if (window.state === 'end') {
        window.state = 'game';
        player.score = 0;
        player.reset();
        particles.reset();
        flyingObjects.reset();
    }
};

canvas.addEventListener('click', changeState, false);
document.body.addEventListener('keydown', function(e) {
    if (e.keyCode === 13) {
        changeState();
    }
}, false);

},{"./audio.js":2,"./collisions":3,"./keys":4,"./loader.js":5,"./menus.js":6,"./particles":7,"./player":8,"./raf":9,"./ufos":11}],2:[function(require,module,exports){
var audio = window.audio = {}; // Made it a global so I can easily test
var elements = document.querySelectorAll('audio');
var FADE_SPEED = 0.1;

audio.mute = function () {
    for (var i = 0; i < elements.length; i++) {
        elements[i].volume = 0;
    }
};
audio.stop = function () {
    for (var i = 0; i < elements.length; i++) {
        elements[i].pause();
    }
};

audio.play = function (name, seekFrom) {
    var elem = document.getElementById(name);
    elem.currentTime = seekFrom || 0;
    elem.play();
};
audio.pause = function (name) {
    if (typeof name === 'string') {
        var names = [name];
    }
    else {
        names = name;
    }
    for (var i = 0; i < names.length; i++) {
        var elem = document.getElementById(names[i]);
        elem.pause();
    }
    
};

audio.fadeout = function (name, seekFrom, cb) {
    var elem = document.getElementById(name);
    var volume = elem.volume;
    var decrease = function () {
        volume -= FADE_SPEED;
        console.log(volume);
        if (volume <= 0) {
            elem.volume = 0;
            elem.pause();
            cb && cb(elem);
        }
        else {
            elem.volume = volume;
            setTimeout(decrease, 100/3);
        }
    };
    decrease();
}
audio.fadein = function (name, seekFrom, cb) {
    var elem = document.getElementById(name);
    var volume = elem.volume = 0;
    elem.play();
    var increase = function () {
        volume += FADE_SPEED;
        if (volume >= 1) {
            elem.volume = 1;
            cb && cb(elem);
        }
        else {
            elem.volume = volume;
            setTimeout(increase, 100/3);
        }
    };
    increase();
}
module.exports = audio;
},{}],3:[function(require,module,exports){
var particlesModule = require('./particles');

var playerHitBox = {
    x: 375,
    y: 270,
    width: 50,
    height: 60
};
var angledCollision = function(player, fo) {
    var colliding = false;
    colliding = aabb(playerHitBox, fo);
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

var check = function(player, foModule) {
    // fo stands for flyingObjects
    var particles = particlesModule.array;
    var fo = foModule.array;
    // Manage flying object spawning
    var foInView = inArea(camera, fo, undefined, function(fo) {
        fo.alive = false;
    });
    if (foInView.length < 30) {
        foModule.spawn(Math.random() * 100);
    }

    // Collisions between the player and rocks
    var foToTest = inArea(playerArea, fo);
    for (var i = 0; i < foToTest.length; i++) {
        if (angledCollision(player, foToTest[i])) {
            // console.log('HIT');
            foToTest[i].alive = false;
            if (foToTest[i].image === 'power-icon.png') {
                audio.play('collect');
                player.fuel += 10;
            }
            else {
                audio.play('collide');
                player.health -= (foToTest[i].width * foToTest[i].height) / 100;
            }
        }
    }

    // Check for collisions between particles and fo
    for (var i = 0; i < particles.length; i++) {
        inArea(particles[i], fo, function(fo) {
            if (particles[i].alive) {
                fo.alive = false;
                if (fo.good) {
                    audio.play('collect');
                }
                else {
                    audio.play('explode_meteor');
                }
                player.score += (fo.width * fo.height) / 100;
            }
        });
    }
};

module.exports = {
    check: check
};
},{"./particles":7}],4:[function(require,module,exports){
var player = require('./player');
var keys = {};
var C = {
    SPACE: 32,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40
}
document.body.addEventListener('keydown', function(e) {
    if (e.keyCode === C.SPACE) {
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
        return keys[C.LEFT];
    },
    up: function() {
        return keys[C.UP];
    },
    right: function() {
        return keys[C.RIGHT];
    },
    down: function() {
        return keys[C.DOWN];
    },
    flip: function() {
        return keys[C.SPACE];
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
// var Transform = require('./transform.js');
var canvas = document.querySelector('#game');

window.player = {};

player.idle = new Image();
player.idle.src = 'images/astro.png';
player.flying = new Image();
player.flying.src = 'images/astro-flying.png';
player.state = 'idle';

var playerDefaults = {
    score: 0,
    angle: 0,
    offsetY: 0,
    offsetX: 0,
    health: 100,
    fuel: 100
};

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
var grav = 0.03;
// NO MORE CONFIGURING! ------------------------------



player.reset = function() {
    dX = dY = speed = dSpeed = 0;
    var keys = Object.keys(playerDefaults);
    for (var i = 0; i < keys.length; i++) {
        player[keys[i]] = playerDefaults[keys[i]];
    }
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

player.reset();

module.exports = player;

},{}],9:[function(require,module,exports){
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
// ufos.js
// This file defines behavior for all the unidentified flying objects
// I guess they *are* identified, technically.
// But ufos.js is cooler than ifos.js
// Asteroids and health / fuel pickups count as UFOs

var flyingObjects = [];

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
    // console.log('Spawned flyingObjects:', n);
    var obj, targetY, targetX;
    var signX, signY, posX, posY;
    for (var i = 0; i < n; i++) {
        obj = {
            x: (rnd() * WIDTH),
            y: (rnd() * HEIGHT),
            speed: rnd() * (MAX_SPEED - MIN_SPEED) + MIN_SPEED,
            image: choose.apply(this, loader.get('rock').concat(loader.get('power-icon'))),
            alive: true
        };
        targetY = rnd() * WIDTH;
        targetX = rnd() * HEIGHT;
        obj.angle = rnd() * Math.PI * 2;
        obj.good = obj.image.indexOf('rock') < 0 ? false : true;
        obj.width = loader.images[obj.image].width;
        obj.height = loader.images[obj.image].height;

        if (rnd() > 0.5) {
            obj.x += choose(-1, 1) * (WIDTH + obj.width);
        }
        else {
            obj.y += choose(-1, 1) * (HEIGHT + obj.height);
        }
        flyingObjects.push(obj);
    }
};

var loop = function(elapsed, ctx, offsetX, offsetY) {
    var obj;
    for (var i = flyingObjects.length - 1; i >= 0; i--) {
        obj = flyingObjects[i];
        if (obj.alive) {
            obj.x += Math.cos(obj.angle) * obj.speed - offsetX;
            obj.y += Math.sin(obj.angle) * obj.speed - offsetY;
            ctx.fillStyle = 'red';
            ctx.drawImage(loader.images[obj.image], obj.x, obj.y);
        }
        else {
            flyingObjects.splice(i, 1);
        }
    }
};


module.exports = {
    loop: loop,
    array: flyingObjects,
    spawn: spawn,
    reset: function() {
        flyingObjects.length = 0;
    }
};
},{"./loader.js":5}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4vc3JjL21haW4iLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9hdWRpby5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL2NvbGxpc2lvbnMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9rZXlzLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvbG9hZGVyLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvbWVudXMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9wYXJ0aWNsZXMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9wbGF5ZXIuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9yYWYuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy90ZXh0LmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvdWZvcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgbG9hZGVyID0gcmVxdWlyZSgnLi9sb2FkZXIuanMnKTtcblxudmFyIHJhZiA9IHJlcXVpcmUoJy4vcmFmJyk7XG52YXIgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcbnZhciBrZXkgPSByZXF1aXJlKCcuL2tleXMnKTtcbnZhciBwYXJ0aWNsZXMgPSByZXF1aXJlKCcuL3BhcnRpY2xlcycpO1xudmFyIGZseWluZ09iamVjdHMgPSByZXF1aXJlKCcuL3Vmb3MnKTtcbnZhciBjb2xsaXNpb25zID0gcmVxdWlyZSgnLi9jb2xsaXNpb25zJyk7XG52YXIgbWVudXMgPSByZXF1aXJlKCcuL21lbnVzLmpzJyk7XG52YXIgYXVkaW8gPSByZXF1aXJlKCcuL2F1ZGlvLmpzJyk7XG5cbnZhciBjYW52YXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZ2FtZScpO1xudmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG52YXIgc2Z4ID0gWydjb2xsZWN0JywgJ2NvbGxpZGUnLCAnZXhwbG9kZV9tZXRlb3InLCAnamV0cGFjayddO1xubG9hZGVyLmRvbmUoZnVuY3Rpb24oKSB7XG4gICAgYXVkaW8ubXV0ZSgpOyAvLyBCZWNhdXNlIEkgZG9uJ3Qgd2FudCBpdCBhdXRvcGxheWluZyB3aGlsZSBJIGRldmVsb3AgaXQhXG5cbiAgICB3aW5kb3cuc3RhdGUgPSAnbWVudSc7XG4gICAgcmFmLnN0YXJ0KGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICAgICAgaWYgKHdpbmRvdy5zdGF0ZSA9PT0gJ21lbnUnKSB7XG4gICAgICAgICAgICBtZW51cy5kcmF3TWVudShjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHdpbmRvdy5zdGF0ZSA9PT0gJ2dhbWUnKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZ3Jhdml0eShlbGFwc2VkKTtcbiAgICAgICAgICAgIGlmIChrZXkudXAoKSAmJiBwbGF5ZXIuZnVlbCA+IDApIHtcbiAgICAgICAgICAgICAgICBhdWRpby5wbGF5KCdqZXRwYWNrJyk7XG4gICAgICAgICAgICAgICAgcGxheWVyLnVwKGVsYXBzZWQpO1xuICAgICAgICAgICAgICAgIHBhcnRpY2xlcy5jcmVhdGVQYXJ0aWNsZXMocGxheWVyLnggKyBwbGF5ZXIud2lkdGggLyAyLCBwbGF5ZXIueSArIHBsYXllci5oZWlnaHQgLyAyLCBwbGF5ZXIuYW5nbGUsIE1hdGguUEkgLyAxMCwgMTAsIDEwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYXVkaW8ucGF1c2UoJ2pldHBhY2snKTtcbiAgICAgICAgICAgICAgICBwbGF5ZXIubW92ZShlbGFwc2VkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGtleS5yaWdodCgpKSB7XG4gICAgICAgICAgICAgICAgcGxheWVyLnJpZ2h0KGVsYXBzZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGtleS5sZWZ0KCkpIHtcbiAgICAgICAgICAgICAgICBwbGF5ZXIubGVmdChlbGFwc2VkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVGhpcyBmdW5jdGlvbiBjaGVja3MgZm9yIGFsbCByZXF1aXJlZCBjb2xsaXNpb25zLCBhbmQgY2FsbHMgdGhlIGNvcnJlc3BvbmRpbmcgZnVuY3Rpb25zIGFmdGVyIHRvb1xuICAgICAgICAgICAgY29sbGlzaW9ucy5jaGVjayhwbGF5ZXIsIGZseWluZ09iamVjdHMpO1xuXG4gICAgICAgICAgICAvLyBDbGVhciB0aGUgc2NyZWVuXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJyMwZjBkMjAnO1xuICAgICAgICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIDgwMCwgNjAwKTtcblxuICAgICAgICAgICAgZmx5aW5nT2JqZWN0cy5sb29wKGVsYXBzZWQsIGN0eCwgcGxheWVyLm9mZnNldFgsIHBsYXllci5vZmZzZXRZKTtcbiAgICAgICAgICAgIHBhcnRpY2xlcy5kcmF3KGVsYXBzZWQsIGN0eCwgcGxheWVyKTtcbiAgICAgICAgICAgIHBsYXllci5kcmF3KGVsYXBzZWQsIGN0eCk7XG4gICAgICAgICAgICBtZW51cy5pbmdhbWUoY3R4LCBwbGF5ZXIuZnVlbCwgcGxheWVyLmhlYWx0aCwgcGxheWVyLnNjb3JlKTtcblxuICAgICAgICAgICAgcGxheWVyLnNjb3JlICs9IDAuMTtcblxuICAgICAgICAgICAgaWYgKHBsYXllci5oZWFsdGggPD0gMCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5zdGF0ZSA9ICdlbmQnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHdpbmRvdy5zdGF0ZSA9PT0gJ2VuZCcpIHtcbiAgICAgICAgICAgIGF1ZGlvLnBhdXNlKHNmeCk7XG4gICAgICAgICAgICBtZW51cy5kcmF3RW5kKGN0eCwgcGxheWVyLnNjb3JlKTtcbiAgICAgICAgfVxuXG4gICAgfSk7XG59KTtcblxudmFyIGNoYW5nZVN0YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHdpbmRvdy5zdGF0ZSA9PT0gJ21lbnUnKSB7XG4gICAgICAgIHdpbmRvdy5zdGF0ZSA9ICdnYW1lJztcbiAgICB9XG4gICAgZWxzZSBpZiAod2luZG93LnN0YXRlID09PSAnZW5kJykge1xuICAgICAgICB3aW5kb3cuc3RhdGUgPSAnZ2FtZSc7XG4gICAgICAgIHBsYXllci5zY29yZSA9IDA7XG4gICAgICAgIHBsYXllci5yZXNldCgpO1xuICAgICAgICBwYXJ0aWNsZXMucmVzZXQoKTtcbiAgICAgICAgZmx5aW5nT2JqZWN0cy5yZXNldCgpO1xuICAgIH1cbn07XG5cbmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGNoYW5nZVN0YXRlLCBmYWxzZSk7XG5kb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbihlKSB7XG4gICAgaWYgKGUua2V5Q29kZSA9PT0gMTMpIHtcbiAgICAgICAgY2hhbmdlU3RhdGUoKTtcbiAgICB9XG59LCBmYWxzZSk7XG4iLCJ2YXIgYXVkaW8gPSB3aW5kb3cuYXVkaW8gPSB7fTsgLy8gTWFkZSBpdCBhIGdsb2JhbCBzbyBJIGNhbiBlYXNpbHkgdGVzdFxudmFyIGVsZW1lbnRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnYXVkaW8nKTtcbnZhciBGQURFX1NQRUVEID0gMC4xO1xuXG5hdWRpby5tdXRlID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZWxlbWVudHNbaV0udm9sdW1lID0gMDtcbiAgICB9XG59O1xuYXVkaW8uc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGVsZW1lbnRzW2ldLnBhdXNlKCk7XG4gICAgfVxufTtcblxuYXVkaW8ucGxheSA9IGZ1bmN0aW9uIChuYW1lLCBzZWVrRnJvbSkge1xuICAgIHZhciBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobmFtZSk7XG4gICAgZWxlbS5jdXJyZW50VGltZSA9IHNlZWtGcm9tIHx8IDA7XG4gICAgZWxlbS5wbGF5KCk7XG59O1xuYXVkaW8ucGF1c2UgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdmFyIG5hbWVzID0gW25hbWVdO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgbmFtZXMgPSBuYW1lO1xuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobmFtZXNbaV0pO1xuICAgICAgICBlbGVtLnBhdXNlKCk7XG4gICAgfVxuICAgIFxufTtcblxuYXVkaW8uZmFkZW91dCA9IGZ1bmN0aW9uIChuYW1lLCBzZWVrRnJvbSwgY2IpIHtcbiAgICB2YXIgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG5hbWUpO1xuICAgIHZhciB2b2x1bWUgPSBlbGVtLnZvbHVtZTtcbiAgICB2YXIgZGVjcmVhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZvbHVtZSAtPSBGQURFX1NQRUVEO1xuICAgICAgICBjb25zb2xlLmxvZyh2b2x1bWUpO1xuICAgICAgICBpZiAodm9sdW1lIDw9IDApIHtcbiAgICAgICAgICAgIGVsZW0udm9sdW1lID0gMDtcbiAgICAgICAgICAgIGVsZW0ucGF1c2UoKTtcbiAgICAgICAgICAgIGNiICYmIGNiKGVsZW0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZWxlbS52b2x1bWUgPSB2b2x1bWU7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGRlY3JlYXNlLCAxMDAvMyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGRlY3JlYXNlKCk7XG59XG5hdWRpby5mYWRlaW4gPSBmdW5jdGlvbiAobmFtZSwgc2Vla0Zyb20sIGNiKSB7XG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChuYW1lKTtcbiAgICB2YXIgdm9sdW1lID0gZWxlbS52b2x1bWUgPSAwO1xuICAgIGVsZW0ucGxheSgpO1xuICAgIHZhciBpbmNyZWFzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdm9sdW1lICs9IEZBREVfU1BFRUQ7XG4gICAgICAgIGlmICh2b2x1bWUgPj0gMSkge1xuICAgICAgICAgICAgZWxlbS52b2x1bWUgPSAxO1xuICAgICAgICAgICAgY2IgJiYgY2IoZWxlbSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlbGVtLnZvbHVtZSA9IHZvbHVtZTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoaW5jcmVhc2UsIDEwMC8zKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgaW5jcmVhc2UoKTtcbn1cbm1vZHVsZS5leHBvcnRzID0gYXVkaW87IiwidmFyIHBhcnRpY2xlc01vZHVsZSA9IHJlcXVpcmUoJy4vcGFydGljbGVzJyk7XG5cbnZhciBwbGF5ZXJIaXRCb3ggPSB7XG4gICAgeDogMzc1LFxuICAgIHk6IDI3MCxcbiAgICB3aWR0aDogNTAsXG4gICAgaGVpZ2h0OiA2MFxufTtcbnZhciBhbmdsZWRDb2xsaXNpb24gPSBmdW5jdGlvbihwbGF5ZXIsIGZvKSB7XG4gICAgdmFyIGNvbGxpZGluZyA9IGZhbHNlO1xuICAgIGNvbGxpZGluZyA9IGFhYmIocGxheWVySGl0Qm94LCBmbyk7XG4gICAgcmV0dXJuIGNvbGxpZGluZztcbn07XG5cbnZhciBhYWJiID0gZnVuY3Rpb24oYSwgYikge1xuICAgIGlmIChcbiAgICAgICAgTWF0aC5hYnMoYS54ICsgYS53aWR0aCAvIDIgLSBiLnggLSBiLndpZHRoIC8gMikgPiAoYS53aWR0aCArIGIud2lkdGgpIC8gMiB8fFxuICAgICAgICBNYXRoLmFicyhhLnkgKyBhLmhlaWdodCAvIDIgLSBiLnkgLSBiLmhlaWdodCAvIDIpID4gKGEuaGVpZ2h0ICsgYi5oZWlnaHQpIC8gMlxuICAgICkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxudmFyIGluQXJlYSA9IGZ1bmN0aW9uKGFyZWEsIGFycmF5LCByZXNwQ29sbGlkaW5nLCByZXNwTm90Q29sbGlkaW5nKSB7XG4gICAgdmFyIHJldCA9IFtdO1xuICAgIHZhciBjdXJFbGVtO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY3VyRWxlbSA9IGFycmF5W2ldO1xuICAgICAgICBpZiAoYWFiYihhcmVhLCBjdXJFbGVtKSkge1xuICAgICAgICAgICAgcmV0LnB1c2goY3VyRWxlbSk7XG4gICAgICAgICAgICBpZiAocmVzcENvbGxpZGluZykge1xuICAgICAgICAgICAgICAgIHJlc3BDb2xsaWRpbmcoY3VyRWxlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocmVzcE5vdENvbGxpZGluZykge1xuICAgICAgICAgICAgcmVzcE5vdENvbGxpZGluZyhjdXJFbGVtKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufTtcblxudmFyIHBsYXllckFyZWEgPSB7XG4gICAgeDogMzI1LFxuICAgIHk6IDIyNSxcbiAgICB3aWR0aDogMTUwLFxuICAgIGhlaWdodDogMTUwXG59O1xuXG52YXIgY2FtZXJhID0ge1xuICAgIHg6IC00MDAsXG4gICAgeTogLTMwMCxcbiAgICB3aWR0aDogMTYwMCxcbiAgICBoZWlnaHQ6IDEyMDBcbn07XG5cbnZhciBjaGVjayA9IGZ1bmN0aW9uKHBsYXllciwgZm9Nb2R1bGUpIHtcbiAgICAvLyBmbyBzdGFuZHMgZm9yIGZseWluZ09iamVjdHNcbiAgICB2YXIgcGFydGljbGVzID0gcGFydGljbGVzTW9kdWxlLmFycmF5O1xuICAgIHZhciBmbyA9IGZvTW9kdWxlLmFycmF5O1xuICAgIC8vIE1hbmFnZSBmbHlpbmcgb2JqZWN0IHNwYXduaW5nXG4gICAgdmFyIGZvSW5WaWV3ID0gaW5BcmVhKGNhbWVyYSwgZm8sIHVuZGVmaW5lZCwgZnVuY3Rpb24oZm8pIHtcbiAgICAgICAgZm8uYWxpdmUgPSBmYWxzZTtcbiAgICB9KTtcbiAgICBpZiAoZm9JblZpZXcubGVuZ3RoIDwgMzApIHtcbiAgICAgICAgZm9Nb2R1bGUuc3Bhd24oTWF0aC5yYW5kb20oKSAqIDEwMCk7XG4gICAgfVxuXG4gICAgLy8gQ29sbGlzaW9ucyBiZXR3ZWVuIHRoZSBwbGF5ZXIgYW5kIHJvY2tzXG4gICAgdmFyIGZvVG9UZXN0ID0gaW5BcmVhKHBsYXllckFyZWEsIGZvKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZvVG9UZXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChhbmdsZWRDb2xsaXNpb24ocGxheWVyLCBmb1RvVGVzdFtpXSkpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdISVQnKTtcbiAgICAgICAgICAgIGZvVG9UZXN0W2ldLmFsaXZlID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoZm9Ub1Rlc3RbaV0uaW1hZ2UgPT09ICdwb3dlci1pY29uLnBuZycpIHtcbiAgICAgICAgICAgICAgICBhdWRpby5wbGF5KCdjb2xsZWN0Jyk7XG4gICAgICAgICAgICAgICAgcGxheWVyLmZ1ZWwgKz0gMTA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBhdWRpby5wbGF5KCdjb2xsaWRlJyk7XG4gICAgICAgICAgICAgICAgcGxheWVyLmhlYWx0aCAtPSAoZm9Ub1Rlc3RbaV0ud2lkdGggKiBmb1RvVGVzdFtpXS5oZWlnaHQpIC8gMTAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGNvbGxpc2lvbnMgYmV0d2VlbiBwYXJ0aWNsZXMgYW5kIGZvXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0aWNsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaW5BcmVhKHBhcnRpY2xlc1tpXSwgZm8sIGZ1bmN0aW9uKGZvKSB7XG4gICAgICAgICAgICBpZiAocGFydGljbGVzW2ldLmFsaXZlKSB7XG4gICAgICAgICAgICAgICAgZm8uYWxpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBpZiAoZm8uZ29vZCkge1xuICAgICAgICAgICAgICAgICAgICBhdWRpby5wbGF5KCdjb2xsZWN0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhdWRpby5wbGF5KCdleHBsb2RlX21ldGVvcicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwbGF5ZXIuc2NvcmUgKz0gKGZvLndpZHRoICogZm8uaGVpZ2h0KSAvIDEwMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY2hlY2s6IGNoZWNrXG59OyIsInZhciBwbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpO1xudmFyIGtleXMgPSB7fTtcbnZhciBDID0ge1xuICAgIFNQQUNFOiAzMixcbiAgICBMRUZUOiAzNyxcbiAgICBVUDogMzgsXG4gICAgUklHSFQ6IDM5LFxuICAgIERPV046IDQwXG59XG5kb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbihlKSB7XG4gICAgaWYgKGUua2V5Q29kZSA9PT0gQy5TUEFDRSkge1xuICAgICAgICBwbGF5ZXIuZmxpcCgpO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGUua2V5Q29kZSA+PSAzNyAmJiBlLmtleUNvZGUgPD0gNDApIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cbiAgICBrZXlzW2Uua2V5Q29kZV0gPSB0cnVlO1xufSk7XG5kb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3Rpb24oZSkge1xuICAgIGtleXNbZS5rZXlDb2RlXSA9IGZhbHNlO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxlZnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1tDLkxFRlRdO1xuICAgIH0sXG4gICAgdXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1tDLlVQXTtcbiAgICB9LFxuICAgIHJpZ2h0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbQy5SSUdIVF07XG4gICAgfSxcbiAgICBkb3duOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbQy5ET1dOXTtcbiAgICB9LFxuICAgIGZsaXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1tDLlNQQUNFXTtcbiAgICB9XG59O1xuIiwidmFyIGltYWdlTmFtZXMgPSBbXG4gICAgJ2FzdHJvLnBuZycsXG4gICAgJ2FzdHJvLWZseWluZy5wbmcnLFxuICAgICdoZWFsdGgtYmFyLWljb24ucG5nJyxcbiAgICAnbG9nby5wbmcnLFxuICAgICdwb3dlci1iYXItaWNvbi5wbmcnLFxuICAgICdwb3dlci1pY29uLnBuZycsXG4gICAgJ3JvY2stNS5wbmcnLFxuICAgICdyb2NrLWFsdC01LnBuZycsXG4gICAgJ3JvY2stb2RkLTEucG5nJyxcbiAgICAncm9jay1vZGQtMy5wbmcnLFxuICAgICd0ZXh0LWNyZWRpdHMucG5nJyxcbiAgICAndGV4dC1wbGF5LnBuZydcbl07XG5cbnZhciBpbWFnZXMgPSB7fTtcbnZhciBsb2FkZWQgPSAwO1xudmFyIGRvbmUgPSBmdW5jdGlvbihjYikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW1hZ2VOYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpbWFnZXNbaW1hZ2VOYW1lc1tpXV0gPSBuZXcgSW1hZ2UoKTtcbiAgICAgICAgaW1hZ2VzW2ltYWdlTmFtZXNbaV1dLnNyYyA9ICdpbWFnZXMvJyArIGltYWdlTmFtZXNbaV07XG4gICAgICAgIGltYWdlc1tpbWFnZU5hbWVzW2ldXS5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGxvYWRlZCsrO1xuICAgICAgICAgICAgaWYgKGxvYWRlZCA9PT0gaW1hZ2VOYW1lcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjYigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbGlzdDogaW1hZ2VOYW1lcyxcbiAgICBpbWFnZXM6IGltYWdlcyxcbiAgICBkb25lOiBkb25lLFxuICAgIGdldDogZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGltYWdlTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChpbWFnZU5hbWVzW2ldLmluZGV4T2Yoc3RyaW5nKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICByZXQucHVzaChpbWFnZU5hbWVzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cbn07IiwidmFyIGxvYWRlciA9IHJlcXVpcmUoJy4vbG9hZGVyLmpzJyk7XG52YXIgdGV4dCA9IHJlcXVpcmUoJy4vdGV4dC5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBkcmF3TWVudTogZnVuY3Rpb24oY3R4KSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzBmMGQyMCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCA4MDAsIDYwMCk7XG5cbiAgICAgICAgY3R4LmRyYXdJbWFnZShsb2FkZXIuaW1hZ2VzWydsb2dvLnBuZyddLCAzMTQsIDE4MCk7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1sndGV4dC1wbGF5LnBuZyddLCAzMzMsIDMwMCk7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1sndGV4dC1jcmVkaXRzLnBuZyddLCAyODcsIDUwMCk7XG4gICAgfSxcbiAgICBkcmF3RW5kOiBmdW5jdGlvbihjdHgsIHNjb3JlKSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzBmMGQyMCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCA4MDAsIDYwMCk7XG4gICAgICAgIHRleHQud3JpdGUoJ1RoZSBlbmQhIFlvdSBzY29yZWQgJyArIE1hdGgucm91bmQoc2NvcmUpICsgJyBwb2ludHMhJywgJ2NlbnRlcicsIDMwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgICAgIGN0eC5mb250ID0gJzMycHQgQXJpYWwnO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC53cml0ZSgnQ2xpY2sgdG8gcGxheSBhZ2FpbicsICdjZW50ZXInLCA1MDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG4gICAgICAgICAgICBjdHguZm9udCA9ICcyMnB0IEFyaWFsJztcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBpbmdhbWU6IGZ1bmN0aW9uIChjdHgsIGZ1ZWwsIGhlYWx0aCwgc2NvcmUpIHtcbiAgICAgICAgY3R4LmRyYXdJbWFnZShsb2FkZXIuaW1hZ2VzWydwb3dlci1iYXItaWNvbi5wbmcnXSwgMzAsIDUwMCk7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnb3JhbmdlJztcbiAgICAgICAgY3R4LmZpbGxSZWN0KDMwLCA0OTAgLSBmdWVsLCAyMCwgZnVlbCk7XG5cblxuICAgICAgICBjdHguZHJhd0ltYWdlKGxvYWRlci5pbWFnZXNbJ2hlYWx0aC1iYXItaWNvbi5wbmcnXSwgNzAsIDUwMCk7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAncmVkJztcbiAgICAgICAgY3R4LmZpbGxSZWN0KDcwLCA0OTAgLSBoZWFsdGgsIDIwLCBoZWFsdGgpO1xuXG4gICAgICAgIGN0eC5mb250ID0gJzEycHQgQXJpYWwnO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgY3R4LmZpbGxUZXh0KCdTY29yZTogJyArIE1hdGgucm91bmQoc2NvcmUpLCAyNywgNTUwKTtcbiAgICB9XG59OyIsInZhciBwYXJ0aWNsZXMgPSBbXTtcbnZhciBXID0gNywgSCA9IDc7XG52YXIgREVDX1JBVEUgPSAwLjE7IC8vIERlZmF1bHQgZGVjcmVhc2UgcmF0ZS4gSGlnaGVyIHJhdGUgLT4gcGFydGljbGVzIGdvIGZhc3RlclxudmFyIFBhcnRpY2xlID0gZnVuY3Rpb24oeCwgeSwgc3BlZWQsIGRlY1JhdGUpIHtcbiAgICB0aGlzLmFsaXZlID0gdHJ1ZTtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy53aWR0aCA9IFc7XG4gICAgdGhpcy5oZWlnaHQgPSBIO1xuICAgIHRoaXMuYW5nbGUgPSAwO1xuICAgIHRoaXMuc3BlZWQgPSBzcGVlZDtcbiAgICB0aGlzLm9wYWNpdHkgPSAxO1xuICAgIHRoaXMuZGVjUmF0ZSA9IGRlY1JhdGUgfHwgREVDX1JBVEU7XG4gICAgdGhpcy5kZWxheSA9IE1hdGguY2VpbChNYXRoLnJhbmRvbSgpICogMTApO1xuICAgIHRoaXMubG9vcCA9IGZ1bmN0aW9uKGN0eCwgcGxheWVyKSB7XG4gICAgICAgIGlmICh0aGlzLmRlbGF5ID4gMCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGVsYXkgPD0gMSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYW5nbGUgPSBwbGF5ZXIuYW5nbGUgLSB0aGlzLnJhbmdlICsgKE1hdGgucmFuZG9tKCkgKiAyICogdGhpcy5yYW5nZSk7O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5kZWxheS0tO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMueCArPSBNYXRoLnNpbigtdGhpcy5hbmdsZSkgKiBzcGVlZDtcbiAgICAgICAgdGhpcy55ICs9IE1hdGguY29zKC10aGlzLmFuZ2xlKSAqIHNwZWVkO1xuICAgICAgICB0aGlzLm9wYWNpdHkgLT0gdGhpcy5kZWNSYXRlO1xuICAgICAgICBpZiAodGhpcy5vcGFjaXR5IDw9IDApIHtcbiAgICAgICAgICAgIHRoaXMub3BhY2l0eSA9IDA7XG4gICAgICAgICAgICB0aGlzLmFsaXZlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRHJhd1xuICAgICAgICBjdHguc2F2ZSgpO1xuICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSB0aGlzLm9wYWNpdHk7XG4gICAgICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JlZCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCBXLCBIKTtcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICB9O1xufTtcblxuLy8geCwgeSBhcmUgZml4ZWRcbi8vIFBhcnRpY2xlcyBhcmUgY3JlYXRlZCBmcm9tIGFuZ2xlLXJhbmdlIHRvIGFuZ2xlK3JhbmdlXG4vLyBzcGVlZCBpcyBmaXhlZFxudmFyIGFuZ2xlID0gMDtcbnZhciBjcmVhdGVQYXJ0aWNsZXMgPSBmdW5jdGlvbih4LCB5LCBwbGF5ZXJBbmdsZSwgcmFuZ2UsIHNwZWVkLCBuKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ0NyZWF0aW5nJywgcGFydGljbGVzKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICBpZiAocGFydGljbGVzW2ldICYmICFwYXJ0aWNsZXNbaV0uYWxpdmUgfHwgIXBhcnRpY2xlc1tpXSkge1xuICAgICAgICAgICAgcGFydGljbGVzW2ldID0gbmV3IFBhcnRpY2xlKHgsIHksIHNwZWVkKTtcbiAgICAgICAgICAgIHBhcnRpY2xlc1tpXS5yYW5nZSA9IHJhbmdlO1xuICAgICAgICAgICAgcGFydGljbGVzW2ldLnBsYXllciA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG52YXIgZHJhdyA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCwgcGxheWVyKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0aWNsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcGFydGljbGVzW2ldLmxvb3AoY3R4LCBwbGF5ZXIpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNyZWF0ZVBhcnRpY2xlczogY3JlYXRlUGFydGljbGVzLFxuICAgIGRyYXc6IGRyYXcsXG4gICAgYXJyYXk6IHBhcnRpY2xlcyxcbiAgICByZXNldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHBhcnRpY2xlcy5sZW5ndGggPSAwO1xuICAgIH1cbn07XG4iLCIvLyB2YXIgVHJhbnNmb3JtID0gcmVxdWlyZSgnLi90cmFuc2Zvcm0uanMnKTtcbnZhciBjYW52YXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZ2FtZScpO1xuXG53aW5kb3cucGxheWVyID0ge307XG5cbnBsYXllci5pZGxlID0gbmV3IEltYWdlKCk7XG5wbGF5ZXIuaWRsZS5zcmMgPSAnaW1hZ2VzL2FzdHJvLnBuZyc7XG5wbGF5ZXIuZmx5aW5nID0gbmV3IEltYWdlKCk7XG5wbGF5ZXIuZmx5aW5nLnNyYyA9ICdpbWFnZXMvYXN0cm8tZmx5aW5nLnBuZyc7XG5wbGF5ZXIuc3RhdGUgPSAnaWRsZSc7XG5cbnZhciBwbGF5ZXJEZWZhdWx0cyA9IHtcbiAgICBzY29yZTogMCxcbiAgICBhbmdsZTogMCxcbiAgICBvZmZzZXRZOiAwLFxuICAgIG9mZnNldFg6IDAsXG4gICAgaGVhbHRoOiAxMDAsXG4gICAgZnVlbDogMTAwXG59O1xuXG5wbGF5ZXIud2lkdGggPSA1MjtcbnBsYXllci5oZWlnaHQgPSA2MDtcbnBsYXllci54ID0gKGNhbnZhcy53aWR0aCAtIHBsYXllci53aWR0aCkgLyAyO1xucGxheWVyLnkgPSAoY2FudmFzLmhlaWdodCAtIHBsYXllci5oZWlnaHQpIC8gMjtcbnBsYXllci5hbmdsZSA9IDA7XG5cbnBsYXllci5vZmZzZXRYID0gcGxheWVyLm9mZnNldFkgPSAwO1xuXG5cbi8vIEhhbGYgd2lkdGgsIGhhbGYgaGVpZ2h0XG52YXIgaFcgPSBwbGF5ZXIud2lkdGggLyAyO1xudmFyIGhIID0gcGxheWVyLmhlaWdodCAvIDI7XG5cbnZhciBzcGVlZCA9IDA7IC8vIFRoZSBjdXJyZW50IHNwZWVkXG52YXIgZFNwZWVkO1xudmFyIGRYID0gMCwgZFkgPSAwO1xuXG4vLyBZT1UgQ0FOIENPTkZJR1VSRSBUSEVTRSEgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbnZhciBhY2MgPSA3OyAvLyBBY2NlbGVyYXRpb25cbnZhciBsaW0gPSAxMDsgLy8gU3BlZWQgbGltaXRcbnZhciB0dXJuU3BlZWQgPSAyLjI7XG52YXIgZ3JhdiA9IDAuMDM7XG4vLyBOTyBNT1JFIENPTkZJR1VSSU5HISAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXG5cbnBsYXllci5yZXNldCA9IGZ1bmN0aW9uKCkge1xuICAgIGRYID0gZFkgPSBzcGVlZCA9IGRTcGVlZCA9IDA7XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhwbGF5ZXJEZWZhdWx0cyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHBsYXllcltrZXlzW2ldXSA9IHBsYXllckRlZmF1bHRzW2tleXNbaV1dO1xuICAgIH1cbiAgICBwbGF5ZXIubW92ZSgpO1xufTtcbnBsYXllci5ncmF2aXR5ID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIGRZIC09IGdyYXY7XG59O1xucGxheWVyLm1vdmUgPSBmdW5jdGlvbihlbGFwc2VkLCBmbHlpbmcpIHtcbiAgICBwbGF5ZXIub2Zmc2V0WCA9IGRYO1xuICAgIHBsYXllci5vZmZzZXRZID0gLWRZO1xuICAgIGRYICo9IDAuOTk7XG4gICAgZFkgKj0gMC45OTtcblxuICAgIGlmICghZmx5aW5nKSB7XG4gICAgICAgIHBsYXllci5zdGF0ZSA9ICdpZGxlJztcbiAgICB9XG59O1xucGxheWVyLnVwID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5mdWVsIC09IDAuMjtcbiAgICBwbGF5ZXIuc3RhdGUgPSAnZmx5aW5nJztcbiAgICBzcGVlZCArPSBhY2M7XG4gICAgZFNwZWVkID0gZWxhcHNlZCAqIHNwZWVkO1xuICAgIC8vIGNvbnNvbGUubG9nKHBsYXllci54LCBwbGF5ZXIueSk7XG4gICAgLy8gY29uc29sZS5sb2coTWF0aC5zaW4ocGxheWVyLmFuZ2xlKSAqIGRTcGVlZCwgTWF0aC5jb3MocGxheWVyLmFuZ2xlKSAqIGRTcGVlZCk7XG4gICAgZFggKz0gTWF0aC5zaW4ocGxheWVyLmFuZ2xlKSAqIGRTcGVlZDtcbiAgICBkWSArPSBNYXRoLmNvcyhwbGF5ZXIuYW5nbGUpICogZFNwZWVkO1xuICAgIHBsYXllci5tb3ZlKGVsYXBzZWQsIHRydWUpO1xuICAgIGlmIChzcGVlZCA+IGxpbSkge1xuICAgICAgICBzcGVlZCA9IGxpbTtcbiAgICB9XG4gICAgZWxzZSBpZiAoc3BlZWQgPCAtbGltKSB7XG4gICAgICAgIHNwZWVkID0gLWxpbTtcbiAgICB9XG5cbn07XG5wbGF5ZXIucmlnaHQgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgcGxheWVyLmFuZ2xlICs9IGVsYXBzZWQgKiB0dXJuU3BlZWQgKiBNYXRoLlBJO1xufTtcbnBsYXllci5sZWZ0ID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5hbmdsZSAtPSBlbGFwc2VkICogdHVyblNwZWVkICogTWF0aC5QSTtcbn07XG5wbGF5ZXIuZmxpcCA9IGZ1bmN0aW9uKCkge1xuICAgIHBsYXllci5hbmdsZSArPSBNYXRoLlBJO1xufTtcblxuLy8gdmFyIHQgPSBuZXcgVHJhbnNmb3JtKCk7XG5wbGF5ZXIuZHJhdyA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCkge1xuICAgIC8vIGN0eC5maWxsUmVjdCgzNzUsIDI3MCwgNTAsIDYwKTtcbiAgICAvLyBQbGF5ZXJcbiAgICBjdHguc2F2ZSgpO1xuICAgIGN0eC50cmFuc2xhdGUocGxheWVyLnggKyBoVywgcGxheWVyLnkgKyBoSCk7XG4gICAgLy8gdC50cmFuc2xhdGUocGxheWVyLnggKyBoVywgcGxheWVyLnkgKyBoSCk7XG4gICAgY3R4LnJvdGF0ZShwbGF5ZXIuYW5nbGUpO1xuICAgIC8vIHQucm90YXRlKHBsYXllci5hbmdsZSk7XG4gICAgY3R4LmRyYXdJbWFnZShwbGF5ZXJbcGxheWVyLnN0YXRlXSwgLWhXLCAtaEgpO1xuICAgIGN0eC5yZXN0b3JlKCk7XG5cbiAgICAvLyBwbGF5ZXIudG9wTGVmdCA9IHQudHJhbnNmb3JtUG9pbnQoLWhXLCAtaEgpO1xuICAgIC8vIHBsYXllci50b3BSaWdodCA9IHQudHJhbnNmb3JtUG9pbnQoaFcsIC1oSCk7XG4gICAgLy8gcGxheWVyLmJvdHRvbUxlZnQgPSB0LnRyYW5zZm9ybVBvaW50KC1oVywgaEgpO1xuICAgIC8vIHBsYXllci5ib3R0b21SaWdodCA9IHQudHJhbnNmb3JtUG9pbnQoaFcsIGhIKTtcbiAgICAvLyB0LnJlc2V0KCk7XG5cbn07XG5cbnBsYXllci5yZXNldCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBsYXllcjtcbiIsIi8vIEhvbGRzIGxhc3QgaXRlcmF0aW9uIHRpbWVzdGFtcC5cbnZhciB0aW1lID0gMDtcblxuLyoqXG4gKiBDYWxscyBgZm5gIG9uIG5leHQgZnJhbWUuXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuIFRoZSBmdW5jdGlvblxuICogQHJldHVybiB7aW50fSBUaGUgcmVxdWVzdCBJRFxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIHJhZihmbikge1xuICByZXR1cm4gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgICB2YXIgZWxhcHNlZCA9IG5vdyAtIHRpbWU7XG5cbiAgICBpZiAoZWxhcHNlZCA+IDk5OSkge1xuICAgICAgZWxhcHNlZCA9IDEgLyA2MDtcbiAgICB9IGVsc2Uge1xuICAgICAgZWxhcHNlZCAvPSAxMDAwO1xuICAgIH1cblxuICAgIHRpbWUgPSBub3c7XG4gICAgZm4oZWxhcHNlZCk7XG4gIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgLyoqXG4gICAqIENhbGxzIGBmbmAgb24gZXZlcnkgZnJhbWUgd2l0aCBgZWxhcHNlZGAgc2V0IHRvIHRoZSBlbGFwc2VkXG4gICAqIHRpbWUgaW4gbWlsbGlzZWNvbmRzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm4gVGhlIGZ1bmN0aW9uXG4gICAqIEByZXR1cm4ge2ludH0gVGhlIHJlcXVlc3QgSURcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHN0YXJ0OiBmdW5jdGlvbihmbikge1xuICAgIHJldHVybiByYWYoZnVuY3Rpb24gdGljayhlbGFwc2VkKSB7XG4gICAgICBmbihlbGFwc2VkKTtcbiAgICAgIHJhZih0aWNrKTtcbiAgICB9KTtcbiAgfSxcbiAgLyoqXG4gICAqIENhbmNlbHMgdGhlIHNwZWNpZmllZCBhbmltYXRpb24gZnJhbWUgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHtpbnR9IGlkIFRoZSByZXF1ZXN0IElEXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzdG9wOiBmdW5jdGlvbihpZCkge1xuICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZShpZCk7XG4gIH1cbn07XG4iLCJ2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2NhbnZhcycpWzBdO1xudmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xubW9kdWxlLmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbiAodGV4dCwgeCwgeSwgcHJlRnVuYywgc3Ryb2tlKXtcbiAgICBpZihwcmVGdW5jKXtcbiAgICAgICAgY3R4LnNhdmUoKTtcbiAgICAgICAgcHJlRnVuYyhjdHgpO1xuICAgIH1cblxuICAgIHZhciB4UG9zID0geDtcbiAgICBpZih4ID09PSAnY2VudGVyJyl7XG4gICAgICAgIHhQb3MgPSAoY2FudmFzLndpZHRoIC0gY3R4Lm1lYXN1cmVUZXh0KHRleHQpLndpZHRoKSAvIDI7XG4gICAgfVxuXG4gICAgaWYoc3Ryb2tlKXtcbiAgICAgICAgY3R4LnN0cm9rZVRleHQodGV4dCwgeFBvcywgeSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjdHguZmlsbFRleHQodGV4dCwgeFBvcywgeSk7XG4gICAgfVxuXG4gICAgaWYocHJlRnVuYyl7XG4gICAgICAgIGN0eC5yZXN0b3JlKCk7XG4gICAgfVxufTsiLCIvLyB1Zm9zLmpzXG4vLyBUaGlzIGZpbGUgZGVmaW5lcyBiZWhhdmlvciBmb3IgYWxsIHRoZSB1bmlkZW50aWZpZWQgZmx5aW5nIG9iamVjdHNcbi8vIEkgZ3Vlc3MgdGhleSAqYXJlKiBpZGVudGlmaWVkLCB0ZWNobmljYWxseS5cbi8vIEJ1dCB1Zm9zLmpzIGlzIGNvb2xlciB0aGFuIGlmb3MuanNcbi8vIEFzdGVyb2lkcyBhbmQgaGVhbHRoIC8gZnVlbCBwaWNrdXBzIGNvdW50IGFzIFVGT3NcblxudmFyIGZseWluZ09iamVjdHMgPSBbXTtcblxudmFyIGxvYWRlciA9IHJlcXVpcmUoJy4vbG9hZGVyLmpzJyk7XG5cbnZhciBybmQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKTtcbn07XG52YXIgY2hvb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50c1tNYXRoLmZsb29yKHJuZCgpICogYXJndW1lbnRzLmxlbmd0aCldO1xufTtcblxudmFyIFNQQVdOX1JBTkdFID0gMTAwO1xudmFyIE1JTl9TUEVFRCA9IDAuMywgTUFYX1NQRUVEID0gMjtcbnZhciBXSURUSCA9IDgwMCwgSEVJR0hUID0gNjAwO1xuXG52YXIgc3Bhd24gPSBmdW5jdGlvbihuKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ1NwYXduZWQgZmx5aW5nT2JqZWN0czonLCBuKTtcbiAgICB2YXIgb2JqLCB0YXJnZXRZLCB0YXJnZXRYO1xuICAgIHZhciBzaWduWCwgc2lnblksIHBvc1gsIHBvc1k7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgb2JqID0ge1xuICAgICAgICAgICAgeDogKHJuZCgpICogV0lEVEgpLFxuICAgICAgICAgICAgeTogKHJuZCgpICogSEVJR0hUKSxcbiAgICAgICAgICAgIHNwZWVkOiBybmQoKSAqIChNQVhfU1BFRUQgLSBNSU5fU1BFRUQpICsgTUlOX1NQRUVELFxuICAgICAgICAgICAgaW1hZ2U6IGNob29zZS5hcHBseSh0aGlzLCBsb2FkZXIuZ2V0KCdyb2NrJykuY29uY2F0KGxvYWRlci5nZXQoJ3Bvd2VyLWljb24nKSkpLFxuICAgICAgICAgICAgYWxpdmU6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgdGFyZ2V0WSA9IHJuZCgpICogV0lEVEg7XG4gICAgICAgIHRhcmdldFggPSBybmQoKSAqIEhFSUdIVDtcbiAgICAgICAgb2JqLmFuZ2xlID0gcm5kKCkgKiBNYXRoLlBJICogMjtcbiAgICAgICAgb2JqLmdvb2QgPSBvYmouaW1hZ2UuaW5kZXhPZigncm9jaycpIDwgMCA/IGZhbHNlIDogdHJ1ZTtcbiAgICAgICAgb2JqLndpZHRoID0gbG9hZGVyLmltYWdlc1tvYmouaW1hZ2VdLndpZHRoO1xuICAgICAgICBvYmouaGVpZ2h0ID0gbG9hZGVyLmltYWdlc1tvYmouaW1hZ2VdLmhlaWdodDtcblxuICAgICAgICBpZiAocm5kKCkgPiAwLjUpIHtcbiAgICAgICAgICAgIG9iai54ICs9IGNob29zZSgtMSwgMSkgKiAoV0lEVEggKyBvYmoud2lkdGgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgb2JqLnkgKz0gY2hvb3NlKC0xLCAxKSAqIChIRUlHSFQgKyBvYmouaGVpZ2h0KTtcbiAgICAgICAgfVxuICAgICAgICBmbHlpbmdPYmplY3RzLnB1c2gob2JqKTtcbiAgICB9XG59O1xuXG52YXIgbG9vcCA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCwgb2Zmc2V0WCwgb2Zmc2V0WSkge1xuICAgIHZhciBvYmo7XG4gICAgZm9yICh2YXIgaSA9IGZseWluZ09iamVjdHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgb2JqID0gZmx5aW5nT2JqZWN0c1tpXTtcbiAgICAgICAgaWYgKG9iai5hbGl2ZSkge1xuICAgICAgICAgICAgb2JqLnggKz0gTWF0aC5jb3Mob2JqLmFuZ2xlKSAqIG9iai5zcGVlZCAtIG9mZnNldFg7XG4gICAgICAgICAgICBvYmoueSArPSBNYXRoLnNpbihvYmouYW5nbGUpICogb2JqLnNwZWVkIC0gb2Zmc2V0WTtcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAncmVkJztcbiAgICAgICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1tvYmouaW1hZ2VdLCBvYmoueCwgb2JqLnkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZmx5aW5nT2JqZWN0cy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxvb3A6IGxvb3AsXG4gICAgYXJyYXk6IGZseWluZ09iamVjdHMsXG4gICAgc3Bhd246IHNwYXduLFxuICAgIHJlc2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgZmx5aW5nT2JqZWN0cy5sZW5ndGggPSAwO1xuICAgIH1cbn07Il19
