(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var loader = require('./loader.js');

var raf = require('./raf');
var player = require('./player');
var key = require('./keys');
var particles = require('./particles');
var flyingObjects = require('./ufos');
var collisions = require('./collisions');
var menus = require('./menus');
var audio = require('./audio');

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
                particles.createParticles(player.x + player.width / 2, player.y + player.height / 2, 10, 0.1, 10, {
                    range: Math.PI / 10
                });
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

},{"./audio":2,"./collisions":3,"./keys":4,"./loader.js":5,"./menus":6,"./particles":7,"./player":8,"./raf":9,"./ufos":12}],2:[function(require,module,exports){
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
var shake = require('./screenshake');

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

var explodeObj = function(fo) {
    particlesModule.createParticles(fo.x, fo.y, fo.speed, 0.01, fo.width * fo.height / 100, {
        range: 2 * Math.PI,
        noCollide: true,
        dx: fo.dx,
        dy: fo.dy,
        color: fo.color
    });
};

var check = function(player, foModule) {
    // fo stands for flyingObjects
    var particles = particlesModule.array;
    var fos = foModule.array;
    // Manage flying object spawning
    var foInView = inArea(camera, fos, undefined, function(fo) {
        fo.alive = false;
    });
    if (foInView.length < 30) {
        foModule.spawn(Math.random() * 100);
    }

    // Collisions between the player and rocks
    var foToTest = inArea(playerArea, fos);
    var fo;
    for (var i = 0; i < foToTest.length; i++) {
        fo = foToTest[i];
        if (angledCollision(player, fo)) {
            // console.log('HIT');
            fo.alive = false;
            if (fo.image === 'power-icon.png') {
                audio.play('collect');
                player.fuel += 10;
            }
            else {
                audio.play('collide');
                player.health -= (fo.width * fo.height) / 100;
                console.log('Collision particles');
                explodeObj(fo);
                shake(5);
            }
        }
    }

    // Check for collisions between particles and fo
    for (var i = 0; i < particles.length; i++) {
        if (particles[i].noCollide) {
            continue;
        }
        inArea(particles[i], fos, function(fo) {
            if (particles[i].alive && !fo.good) {
                fo.alive = false;
                audio.play('explode_meteor');
                player.score += (fo.width * fo.height) / 100;
                explodeObj(fo);
                shake(2);
            }
        });
    }
};

module.exports = {
    check: check
};
},{"./particles":7,"./screenshake":10}],4:[function(require,module,exports){
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
},{"./loader.js":5,"./text.js":11}],7:[function(require,module,exports){
var particles = [];
var W = 7, H = 7;
var DEC_RATE = 0.1; // Default decrease rate. Higher rate -> particles go faster
var Particle = function(x, y, speed, decRate) {
    this.alive = true;
    this.x = x;
    this.y = y;
    this.dx = this.dy = 0;
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
                this.angle = player.angle - this.range + (Math.random() * 2 * this.range);
            }
            this.delay--;
            return false;
        }
        this.x += this.dx - window.player.offsetX + Math.sin(-this.angle) * speed;
        this.y += this.dy - window.player.offsetY + Math.cos(-this.angle) * speed;
        this.opacity -= this.decRate;
        if (this.opacity <= 0) {
            this.opacity = 0;
            this.alive = false;
        }
        // Draw
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.fillStyle = this.color || 'red';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    };
};

// x, y are fixed
// Particles are created from angle-range to angle+range
// speed is fixed
var angle = 0;
var createParticles = function(x, y, speed, decRate, n, props) {
    // console.log('Creating', particles);
    var created = 0, i = 0;
    var particle;
    while(created < n) {
        particle = particles[i];
        if (particle && !particle.alive || !particle) {
            particles[i] = new Particle(x, y, speed, decRate);
            created++;
            var keys = Object.keys(props);
            for (var j = 0; j < keys.length; j++) {
                particles[i][keys[j]] = props[keys[j]];
            }
            // Possible props: range, noCollide, dx, dy
        }
        i++;
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
    health: 1000000,
    fuel: 1000000
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
var canvas = document.querySelector('#game');
var ctx = canvas.getContext('2d');

var polarity = function() {
    return Math.random() > 0.5 ? 1 : -1;
};

// Amount we've moved so far
var totalX = 0;
var totalY = 0;

var shake = function(intensity) {
    if (!intensity) {
        intensity = 2;
    }
    var dX = Math.random() * intensity * polarity();
    var dY = Math.random() * intensity * polarity();
    totalX += dX;
    totalY += dY;

    if (Math.round(intensity) % 2 === 0) {
        ctx.translate(-totalX, -totalY);
        totalX = totalY = 0;
        if (intensity <= 0.15) {
            return true;
        }
    }
    ctx.translate(dX, dY);
    setTimeout(function() {
        shake(intensity - 0.1);
    }, 5);
};

module.exports = shake;
},{}],11:[function(require,module,exports){
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
},{}],12:[function(require,module,exports){
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
        obj.good = obj.image.indexOf('rock') >= 0 ? false : true;
        obj.width = loader.images[obj.image].width;
        obj.height = loader.images[obj.image].height;
        obj.dx = Math.cos(obj.angle) * obj.speed;
        obj.dy = Math.sin(obj.angle) * obj.speed;

        if (!obj.good) {
            obj.color = obj.image.indexOf('alt') < 0 ? '#aaaaaa' : '#a78258';
        }

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
            obj.x += obj.dx - offsetX;
            obj.y += obj.dy - offsetY;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4vc3JjL21haW4iLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9hdWRpby5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL2NvbGxpc2lvbnMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9rZXlzLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvbG9hZGVyLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvbWVudXMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9wYXJ0aWNsZXMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9wbGF5ZXIuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9yYWYuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9zY3JlZW5zaGFrZS5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL3RleHQuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy91Zm9zLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgbG9hZGVyID0gcmVxdWlyZSgnLi9sb2FkZXIuanMnKTtcblxudmFyIHJhZiA9IHJlcXVpcmUoJy4vcmFmJyk7XG52YXIgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcbnZhciBrZXkgPSByZXF1aXJlKCcuL2tleXMnKTtcbnZhciBwYXJ0aWNsZXMgPSByZXF1aXJlKCcuL3BhcnRpY2xlcycpO1xudmFyIGZseWluZ09iamVjdHMgPSByZXF1aXJlKCcuL3Vmb3MnKTtcbnZhciBjb2xsaXNpb25zID0gcmVxdWlyZSgnLi9jb2xsaXNpb25zJyk7XG52YXIgbWVudXMgPSByZXF1aXJlKCcuL21lbnVzJyk7XG52YXIgYXVkaW8gPSByZXF1aXJlKCcuL2F1ZGlvJyk7XG5cbnZhciBjYW52YXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZ2FtZScpO1xudmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG52YXIgc2Z4ID0gWydjb2xsZWN0JywgJ2NvbGxpZGUnLCAnZXhwbG9kZV9tZXRlb3InLCAnamV0cGFjayddO1xubG9hZGVyLmRvbmUoZnVuY3Rpb24oKSB7XG4gICAgYXVkaW8ubXV0ZSgpOyAvLyBCZWNhdXNlIEkgZG9uJ3Qgd2FudCBpdCBhdXRvcGxheWluZyB3aGlsZSBJIGRldmVsb3AgaXQhXG5cbiAgICB3aW5kb3cuc3RhdGUgPSAnbWVudSc7XG4gICAgcmFmLnN0YXJ0KGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICAgICAgaWYgKHdpbmRvdy5zdGF0ZSA9PT0gJ21lbnUnKSB7XG4gICAgICAgICAgICBtZW51cy5kcmF3TWVudShjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHdpbmRvdy5zdGF0ZSA9PT0gJ2dhbWUnKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZ3Jhdml0eShlbGFwc2VkKTtcbiAgICAgICAgICAgIGlmIChrZXkudXAoKSAmJiBwbGF5ZXIuZnVlbCA+IDApIHtcbiAgICAgICAgICAgICAgICBhdWRpby5wbGF5KCdqZXRwYWNrJyk7XG4gICAgICAgICAgICAgICAgcGxheWVyLnVwKGVsYXBzZWQpO1xuICAgICAgICAgICAgICAgIHBhcnRpY2xlcy5jcmVhdGVQYXJ0aWNsZXMocGxheWVyLnggKyBwbGF5ZXIud2lkdGggLyAyLCBwbGF5ZXIueSArIHBsYXllci5oZWlnaHQgLyAyLCAxMCwgMC4xLCAxMCwge1xuICAgICAgICAgICAgICAgICAgICByYW5nZTogTWF0aC5QSSAvIDEwXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGF1ZGlvLnBhdXNlKCdqZXRwYWNrJyk7XG4gICAgICAgICAgICAgICAgcGxheWVyLm1vdmUoZWxhcHNlZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChrZXkucmlnaHQoKSkge1xuICAgICAgICAgICAgICAgIHBsYXllci5yaWdodChlbGFwc2VkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChrZXkubGVmdCgpKSB7XG4gICAgICAgICAgICAgICAgcGxheWVyLmxlZnQoZWxhcHNlZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRoaXMgZnVuY3Rpb24gY2hlY2tzIGZvciBhbGwgcmVxdWlyZWQgY29sbGlzaW9ucywgYW5kIGNhbGxzIHRoZSBjb3JyZXNwb25kaW5nIGZ1bmN0aW9ucyBhZnRlciB0b29cbiAgICAgICAgICAgIGNvbGxpc2lvbnMuY2hlY2socGxheWVyLCBmbHlpbmdPYmplY3RzKTtcblxuICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIHNjcmVlblxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICcjMGYwZDIwJztcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCA4MDAsIDYwMCk7XG5cbiAgICAgICAgICAgIGZseWluZ09iamVjdHMubG9vcChlbGFwc2VkLCBjdHgsIHBsYXllci5vZmZzZXRYLCBwbGF5ZXIub2Zmc2V0WSk7XG4gICAgICAgICAgICBwYXJ0aWNsZXMuZHJhdyhlbGFwc2VkLCBjdHgsIHBsYXllcik7XG4gICAgICAgICAgICBwbGF5ZXIuZHJhdyhlbGFwc2VkLCBjdHgpO1xuICAgICAgICAgICAgbWVudXMuaW5nYW1lKGN0eCwgcGxheWVyLmZ1ZWwsIHBsYXllci5oZWFsdGgsIHBsYXllci5zY29yZSk7XG5cbiAgICAgICAgICAgIHBsYXllci5zY29yZSArPSAwLjE7XG5cbiAgICAgICAgICAgIGlmIChwbGF5ZXIuaGVhbHRoIDw9IDApIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cuc3RhdGUgPSAnZW5kJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh3aW5kb3cuc3RhdGUgPT09ICdlbmQnKSB7XG4gICAgICAgICAgICBhdWRpby5wYXVzZShzZngpO1xuICAgICAgICAgICAgbWVudXMuZHJhd0VuZChjdHgsIHBsYXllci5zY29yZSk7XG4gICAgICAgIH1cblxuICAgIH0pO1xufSk7XG5cbnZhciBjaGFuZ2VTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh3aW5kb3cuc3RhdGUgPT09ICdtZW51Jykge1xuICAgICAgICB3aW5kb3cuc3RhdGUgPSAnZ2FtZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHdpbmRvdy5zdGF0ZSA9PT0gJ2VuZCcpIHtcbiAgICAgICAgd2luZG93LnN0YXRlID0gJ2dhbWUnO1xuICAgICAgICBwbGF5ZXIuc2NvcmUgPSAwO1xuICAgICAgICBwbGF5ZXIucmVzZXQoKTtcbiAgICAgICAgcGFydGljbGVzLnJlc2V0KCk7XG4gICAgICAgIGZseWluZ09iamVjdHMucmVzZXQoKTtcbiAgICB9XG59O1xuXG5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjaGFuZ2VTdGF0ZSwgZmFsc2UpO1xuZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZSkge1xuICAgIGlmIChlLmtleUNvZGUgPT09IDEzKSB7XG4gICAgICAgIGNoYW5nZVN0YXRlKCk7XG4gICAgfVxufSwgZmFsc2UpO1xuIiwidmFyIGF1ZGlvID0gd2luZG93LmF1ZGlvID0ge307IC8vIE1hZGUgaXQgYSBnbG9iYWwgc28gSSBjYW4gZWFzaWx5IHRlc3RcbnZhciBlbGVtZW50cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2F1ZGlvJyk7XG52YXIgRkFERV9TUEVFRCA9IDAuMTtcblxuYXVkaW8ubXV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGVsZW1lbnRzW2ldLnZvbHVtZSA9IDA7XG4gICAgfVxufTtcbmF1ZGlvLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBlbGVtZW50c1tpXS5wYXVzZSgpO1xuICAgIH1cbn07XG5cbmF1ZGlvLnBsYXkgPSBmdW5jdGlvbiAobmFtZSwgc2Vla0Zyb20pIHtcbiAgICB2YXIgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG5hbWUpO1xuICAgIGVsZW0uY3VycmVudFRpbWUgPSBzZWVrRnJvbSB8fCAwO1xuICAgIGVsZW0ucGxheSgpO1xufTtcbmF1ZGlvLnBhdXNlID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHZhciBuYW1lcyA9IFtuYW1lXTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIG5hbWVzID0gbmFtZTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG5hbWVzW2ldKTtcbiAgICAgICAgZWxlbS5wYXVzZSgpO1xuICAgIH1cbiAgICBcbn07XG5cbmF1ZGlvLmZhZGVvdXQgPSBmdW5jdGlvbiAobmFtZSwgc2Vla0Zyb20sIGNiKSB7XG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChuYW1lKTtcbiAgICB2YXIgdm9sdW1lID0gZWxlbS52b2x1bWU7XG4gICAgdmFyIGRlY3JlYXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2b2x1bWUgLT0gRkFERV9TUEVFRDtcbiAgICAgICAgY29uc29sZS5sb2codm9sdW1lKTtcbiAgICAgICAgaWYgKHZvbHVtZSA8PSAwKSB7XG4gICAgICAgICAgICBlbGVtLnZvbHVtZSA9IDA7XG4gICAgICAgICAgICBlbGVtLnBhdXNlKCk7XG4gICAgICAgICAgICBjYiAmJiBjYihlbGVtKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGVsZW0udm9sdW1lID0gdm9sdW1lO1xuICAgICAgICAgICAgc2V0VGltZW91dChkZWNyZWFzZSwgMTAwLzMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBkZWNyZWFzZSgpO1xufVxuYXVkaW8uZmFkZWluID0gZnVuY3Rpb24gKG5hbWUsIHNlZWtGcm9tLCBjYikge1xuICAgIHZhciBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobmFtZSk7XG4gICAgdmFyIHZvbHVtZSA9IGVsZW0udm9sdW1lID0gMDtcbiAgICBlbGVtLnBsYXkoKTtcbiAgICB2YXIgaW5jcmVhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZvbHVtZSArPSBGQURFX1NQRUVEO1xuICAgICAgICBpZiAodm9sdW1lID49IDEpIHtcbiAgICAgICAgICAgIGVsZW0udm9sdW1lID0gMTtcbiAgICAgICAgICAgIGNiICYmIGNiKGVsZW0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZWxlbS52b2x1bWUgPSB2b2x1bWU7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGluY3JlYXNlLCAxMDAvMyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGluY3JlYXNlKCk7XG59XG5tb2R1bGUuZXhwb3J0cyA9IGF1ZGlvOyIsInZhciBwYXJ0aWNsZXNNb2R1bGUgPSByZXF1aXJlKCcuL3BhcnRpY2xlcycpO1xudmFyIHNoYWtlID0gcmVxdWlyZSgnLi9zY3JlZW5zaGFrZScpO1xuXG52YXIgcGxheWVySGl0Qm94ID0ge1xuICAgIHg6IDM3NSxcbiAgICB5OiAyNzAsXG4gICAgd2lkdGg6IDUwLFxuICAgIGhlaWdodDogNjBcbn07XG52YXIgYW5nbGVkQ29sbGlzaW9uID0gZnVuY3Rpb24ocGxheWVyLCBmbykge1xuICAgIHZhciBjb2xsaWRpbmcgPSBmYWxzZTtcbiAgICBjb2xsaWRpbmcgPSBhYWJiKHBsYXllckhpdEJveCwgZm8pO1xuICAgIHJldHVybiBjb2xsaWRpbmc7XG59O1xuXG52YXIgYWFiYiA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICBpZiAoXG4gICAgICAgIE1hdGguYWJzKGEueCArIGEud2lkdGggLyAyIC0gYi54IC0gYi53aWR0aCAvIDIpID4gKGEud2lkdGggKyBiLndpZHRoKSAvIDIgfHxcbiAgICAgICAgTWF0aC5hYnMoYS55ICsgYS5oZWlnaHQgLyAyIC0gYi55IC0gYi5oZWlnaHQgLyAyKSA+IChhLmhlaWdodCArIGIuaGVpZ2h0KSAvIDJcbiAgICApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbnZhciBpbkFyZWEgPSBmdW5jdGlvbihhcmVhLCBhcnJheSwgcmVzcENvbGxpZGluZywgcmVzcE5vdENvbGxpZGluZykge1xuICAgIHZhciByZXQgPSBbXTtcbiAgICB2YXIgY3VyRWxlbTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGN1ckVsZW0gPSBhcnJheVtpXTtcbiAgICAgICAgaWYgKGFhYmIoYXJlYSwgY3VyRWxlbSkpIHtcbiAgICAgICAgICAgIHJldC5wdXNoKGN1ckVsZW0pO1xuICAgICAgICAgICAgaWYgKHJlc3BDb2xsaWRpbmcpIHtcbiAgICAgICAgICAgICAgICByZXNwQ29sbGlkaW5nKGN1ckVsZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHJlc3BOb3RDb2xsaWRpbmcpIHtcbiAgICAgICAgICAgIHJlc3BOb3RDb2xsaWRpbmcoY3VyRWxlbSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbnZhciBwbGF5ZXJBcmVhID0ge1xuICAgIHg6IDMyNSxcbiAgICB5OiAyMjUsXG4gICAgd2lkdGg6IDE1MCxcbiAgICBoZWlnaHQ6IDE1MFxufTtcblxudmFyIGNhbWVyYSA9IHtcbiAgICB4OiAtNDAwLFxuICAgIHk6IC0zMDAsXG4gICAgd2lkdGg6IDE2MDAsXG4gICAgaGVpZ2h0OiAxMjAwXG59O1xuXG52YXIgZXhwbG9kZU9iaiA9IGZ1bmN0aW9uKGZvKSB7XG4gICAgcGFydGljbGVzTW9kdWxlLmNyZWF0ZVBhcnRpY2xlcyhmby54LCBmby55LCBmby5zcGVlZCwgMC4wMSwgZm8ud2lkdGggKiBmby5oZWlnaHQgLyAxMDAsIHtcbiAgICAgICAgcmFuZ2U6IDIgKiBNYXRoLlBJLFxuICAgICAgICBub0NvbGxpZGU6IHRydWUsXG4gICAgICAgIGR4OiBmby5keCxcbiAgICAgICAgZHk6IGZvLmR5LFxuICAgICAgICBjb2xvcjogZm8uY29sb3JcbiAgICB9KTtcbn07XG5cbnZhciBjaGVjayA9IGZ1bmN0aW9uKHBsYXllciwgZm9Nb2R1bGUpIHtcbiAgICAvLyBmbyBzdGFuZHMgZm9yIGZseWluZ09iamVjdHNcbiAgICB2YXIgcGFydGljbGVzID0gcGFydGljbGVzTW9kdWxlLmFycmF5O1xuICAgIHZhciBmb3MgPSBmb01vZHVsZS5hcnJheTtcbiAgICAvLyBNYW5hZ2UgZmx5aW5nIG9iamVjdCBzcGF3bmluZ1xuICAgIHZhciBmb0luVmlldyA9IGluQXJlYShjYW1lcmEsIGZvcywgdW5kZWZpbmVkLCBmdW5jdGlvbihmbykge1xuICAgICAgICBmby5hbGl2ZSA9IGZhbHNlO1xuICAgIH0pO1xuICAgIGlmIChmb0luVmlldy5sZW5ndGggPCAzMCkge1xuICAgICAgICBmb01vZHVsZS5zcGF3bihNYXRoLnJhbmRvbSgpICogMTAwKTtcbiAgICB9XG5cbiAgICAvLyBDb2xsaXNpb25zIGJldHdlZW4gdGhlIHBsYXllciBhbmQgcm9ja3NcbiAgICB2YXIgZm9Ub1Rlc3QgPSBpbkFyZWEocGxheWVyQXJlYSwgZm9zKTtcbiAgICB2YXIgZm87XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmb1RvVGVzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICBmbyA9IGZvVG9UZXN0W2ldO1xuICAgICAgICBpZiAoYW5nbGVkQ29sbGlzaW9uKHBsYXllciwgZm8pKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnSElUJyk7XG4gICAgICAgICAgICBmby5hbGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKGZvLmltYWdlID09PSAncG93ZXItaWNvbi5wbmcnKSB7XG4gICAgICAgICAgICAgICAgYXVkaW8ucGxheSgnY29sbGVjdCcpO1xuICAgICAgICAgICAgICAgIHBsYXllci5mdWVsICs9IDEwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYXVkaW8ucGxheSgnY29sbGlkZScpO1xuICAgICAgICAgICAgICAgIHBsYXllci5oZWFsdGggLT0gKGZvLndpZHRoICogZm8uaGVpZ2h0KSAvIDEwMDtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQ29sbGlzaW9uIHBhcnRpY2xlcycpO1xuICAgICAgICAgICAgICAgIGV4cGxvZGVPYmooZm8pO1xuICAgICAgICAgICAgICAgIHNoYWtlKDUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGNvbGxpc2lvbnMgYmV0d2VlbiBwYXJ0aWNsZXMgYW5kIGZvXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0aWNsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHBhcnRpY2xlc1tpXS5ub0NvbGxpZGUpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGluQXJlYShwYXJ0aWNsZXNbaV0sIGZvcywgZnVuY3Rpb24oZm8pIHtcbiAgICAgICAgICAgIGlmIChwYXJ0aWNsZXNbaV0uYWxpdmUgJiYgIWZvLmdvb2QpIHtcbiAgICAgICAgICAgICAgICBmby5hbGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGF1ZGlvLnBsYXkoJ2V4cGxvZGVfbWV0ZW9yJyk7XG4gICAgICAgICAgICAgICAgcGxheWVyLnNjb3JlICs9IChmby53aWR0aCAqIGZvLmhlaWdodCkgLyAxMDA7XG4gICAgICAgICAgICAgICAgZXhwbG9kZU9iaihmbyk7XG4gICAgICAgICAgICAgICAgc2hha2UoMik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNoZWNrOiBjaGVja1xufTsiLCJ2YXIgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcbnZhciBrZXlzID0ge307XG52YXIgQyA9IHtcbiAgICBTUEFDRTogMzIsXG4gICAgTEVGVDogMzcsXG4gICAgVVA6IDM4LFxuICAgIFJJR0hUOiAzOSxcbiAgICBET1dOOiA0MFxufVxuZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZSkge1xuICAgIGlmIChlLmtleUNvZGUgPT09IEMuU1BBQ0UpIHtcbiAgICAgICAgcGxheWVyLmZsaXAoKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cbiAgICBlbHNlIGlmIChlLmtleUNvZGUgPj0gMzcgJiYgZS5rZXlDb2RlIDw9IDQwKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG4gICAga2V5c1tlLmtleUNvZGVdID0gdHJ1ZTtcbn0pO1xuZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0aW9uKGUpIHtcbiAgICBrZXlzW2Uua2V5Q29kZV0gPSBmYWxzZTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBsZWZ0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbQy5MRUZUXTtcbiAgICB9LFxuICAgIHVwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbQy5VUF07XG4gICAgfSxcbiAgICByaWdodDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzW0MuUklHSFRdO1xuICAgIH0sXG4gICAgZG93bjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzW0MuRE9XTl07XG4gICAgfSxcbiAgICBmbGlwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbQy5TUEFDRV07XG4gICAgfVxufTtcbiIsInZhciBpbWFnZU5hbWVzID0gW1xuICAgICdhc3Ryby5wbmcnLFxuICAgICdhc3Ryby1mbHlpbmcucG5nJyxcbiAgICAnaGVhbHRoLWJhci1pY29uLnBuZycsXG4gICAgJ2xvZ28ucG5nJyxcbiAgICAncG93ZXItYmFyLWljb24ucG5nJyxcbiAgICAncG93ZXItaWNvbi5wbmcnLFxuICAgICdyb2NrLTUucG5nJyxcbiAgICAncm9jay1hbHQtNS5wbmcnLFxuICAgICdyb2NrLW9kZC0xLnBuZycsXG4gICAgJ3JvY2stb2RkLTMucG5nJyxcbiAgICAndGV4dC1jcmVkaXRzLnBuZycsXG4gICAgJ3RleHQtcGxheS5wbmcnXG5dO1xuXG52YXIgaW1hZ2VzID0ge307XG52YXIgbG9hZGVkID0gMDtcbnZhciBkb25lID0gZnVuY3Rpb24oY2IpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGltYWdlTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaW1hZ2VzW2ltYWdlTmFtZXNbaV1dID0gbmV3IEltYWdlKCk7XG4gICAgICAgIGltYWdlc1tpbWFnZU5hbWVzW2ldXS5zcmMgPSAnaW1hZ2VzLycgKyBpbWFnZU5hbWVzW2ldO1xuICAgICAgICBpbWFnZXNbaW1hZ2VOYW1lc1tpXV0ub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBsb2FkZWQrKztcbiAgICAgICAgICAgIGlmIChsb2FkZWQgPT09IGltYWdlTmFtZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2IoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxpc3Q6IGltYWdlTmFtZXMsXG4gICAgaW1hZ2VzOiBpbWFnZXMsXG4gICAgZG9uZTogZG9uZSxcbiAgICBnZXQ6IGZ1bmN0aW9uKHN0cmluZykge1xuICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBpbWFnZU5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoaW1hZ2VOYW1lc1tpXS5pbmRleE9mKHN0cmluZykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgcmV0LnB1c2goaW1hZ2VOYW1lc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG59OyIsInZhciBsb2FkZXIgPSByZXF1aXJlKCcuL2xvYWRlci5qcycpO1xudmFyIHRleHQgPSByZXF1aXJlKCcuL3RleHQuanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZHJhd01lbnU6IGZ1bmN0aW9uKGN0eCkge1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJyMwZjBkMjAnO1xuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgODAwLCA2MDApO1xuXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1snbG9nby5wbmcnXSwgMzE0LCAxODApO1xuICAgICAgICBjdHguZHJhd0ltYWdlKGxvYWRlci5pbWFnZXNbJ3RleHQtcGxheS5wbmcnXSwgMzMzLCAzMDApO1xuICAgICAgICBjdHguZHJhd0ltYWdlKGxvYWRlci5pbWFnZXNbJ3RleHQtY3JlZGl0cy5wbmcnXSwgMjg3LCA1MDApO1xuICAgIH0sXG4gICAgZHJhd0VuZDogZnVuY3Rpb24oY3R4LCBzY29yZSkge1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJyMwZjBkMjAnO1xuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgODAwLCA2MDApO1xuICAgICAgICB0ZXh0LndyaXRlKCdUaGUgZW5kISBZb3Ugc2NvcmVkICcgKyBNYXRoLnJvdW5kKHNjb3JlKSArICcgcG9pbnRzIScsICdjZW50ZXInLCAzMDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG4gICAgICAgICAgICBjdHguZm9udCA9ICczMnB0IEFyaWFsJztcbiAgICAgICAgfSk7XG4gICAgICAgIHRleHQud3JpdGUoJ0NsaWNrIHRvIHBsYXkgYWdhaW4nLCAnY2VudGVyJywgNTAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuICAgICAgICAgICAgY3R4LmZvbnQgPSAnMjJwdCBBcmlhbCc7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgaW5nYW1lOiBmdW5jdGlvbiAoY3R4LCBmdWVsLCBoZWFsdGgsIHNjb3JlKSB7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1sncG93ZXItYmFyLWljb24ucG5nJ10sIDMwLCA1MDApO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ29yYW5nZSc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgzMCwgNDkwIC0gZnVlbCwgMjAsIGZ1ZWwpO1xuXG5cbiAgICAgICAgY3R4LmRyYXdJbWFnZShsb2FkZXIuaW1hZ2VzWydoZWFsdGgtYmFyLWljb24ucG5nJ10sIDcwLCA1MDApO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JlZCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCg3MCwgNDkwIC0gaGVhbHRoLCAyMCwgaGVhbHRoKTtcblxuICAgICAgICBjdHguZm9udCA9ICcxMnB0IEFyaWFsJztcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG4gICAgICAgIGN0eC5maWxsVGV4dCgnU2NvcmU6ICcgKyBNYXRoLnJvdW5kKHNjb3JlKSwgMjcsIDU1MCk7XG4gICAgfVxufTsiLCJ2YXIgcGFydGljbGVzID0gW107XG52YXIgVyA9IDcsIEggPSA3O1xudmFyIERFQ19SQVRFID0gMC4xOyAvLyBEZWZhdWx0IGRlY3JlYXNlIHJhdGUuIEhpZ2hlciByYXRlIC0+IHBhcnRpY2xlcyBnbyBmYXN0ZXJcbnZhciBQYXJ0aWNsZSA9IGZ1bmN0aW9uKHgsIHksIHNwZWVkLCBkZWNSYXRlKSB7XG4gICAgdGhpcy5hbGl2ZSA9IHRydWU7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICAgIHRoaXMuZHggPSB0aGlzLmR5ID0gMDtcbiAgICB0aGlzLndpZHRoID0gVztcbiAgICB0aGlzLmhlaWdodCA9IEg7XG4gICAgdGhpcy5hbmdsZSA9IDA7XG4gICAgdGhpcy5zcGVlZCA9IHNwZWVkO1xuICAgIHRoaXMub3BhY2l0eSA9IDE7XG4gICAgdGhpcy5kZWNSYXRlID0gZGVjUmF0ZSB8fCBERUNfUkFURTtcbiAgICB0aGlzLmRlbGF5ID0gTWF0aC5jZWlsKE1hdGgucmFuZG9tKCkgKiAxMCk7XG4gICAgdGhpcy5sb29wID0gZnVuY3Rpb24oY3R4LCBwbGF5ZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuZGVsYXkgPiAwKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kZWxheSA8PSAxKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hbmdsZSA9IHBsYXllci5hbmdsZSAtIHRoaXMucmFuZ2UgKyAoTWF0aC5yYW5kb20oKSAqIDIgKiB0aGlzLnJhbmdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZGVsYXktLTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnggKz0gdGhpcy5keCAtIHdpbmRvdy5wbGF5ZXIub2Zmc2V0WCArIE1hdGguc2luKC10aGlzLmFuZ2xlKSAqIHNwZWVkO1xuICAgICAgICB0aGlzLnkgKz0gdGhpcy5keSAtIHdpbmRvdy5wbGF5ZXIub2Zmc2V0WSArIE1hdGguY29zKC10aGlzLmFuZ2xlKSAqIHNwZWVkO1xuICAgICAgICB0aGlzLm9wYWNpdHkgLT0gdGhpcy5kZWNSYXRlO1xuICAgICAgICBpZiAodGhpcy5vcGFjaXR5IDw9IDApIHtcbiAgICAgICAgICAgIHRoaXMub3BhY2l0eSA9IDA7XG4gICAgICAgICAgICB0aGlzLmFsaXZlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRHJhd1xuICAgICAgICBjdHguc2F2ZSgpO1xuICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSB0aGlzLm9wYWNpdHk7XG4gICAgICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5jb2xvciB8fCAncmVkJztcbiAgICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIFcsIEgpO1xuICAgICAgICBjdHgucmVzdG9yZSgpO1xuICAgIH07XG59O1xuXG4vLyB4LCB5IGFyZSBmaXhlZFxuLy8gUGFydGljbGVzIGFyZSBjcmVhdGVkIGZyb20gYW5nbGUtcmFuZ2UgdG8gYW5nbGUrcmFuZ2Vcbi8vIHNwZWVkIGlzIGZpeGVkXG52YXIgYW5nbGUgPSAwO1xudmFyIGNyZWF0ZVBhcnRpY2xlcyA9IGZ1bmN0aW9uKHgsIHksIHNwZWVkLCBkZWNSYXRlLCBuLCBwcm9wcykge1xuICAgIC8vIGNvbnNvbGUubG9nKCdDcmVhdGluZycsIHBhcnRpY2xlcyk7XG4gICAgdmFyIGNyZWF0ZWQgPSAwLCBpID0gMDtcbiAgICB2YXIgcGFydGljbGU7XG4gICAgd2hpbGUoY3JlYXRlZCA8IG4pIHtcbiAgICAgICAgcGFydGljbGUgPSBwYXJ0aWNsZXNbaV07XG4gICAgICAgIGlmIChwYXJ0aWNsZSAmJiAhcGFydGljbGUuYWxpdmUgfHwgIXBhcnRpY2xlKSB7XG4gICAgICAgICAgICBwYXJ0aWNsZXNbaV0gPSBuZXcgUGFydGljbGUoeCwgeSwgc3BlZWQsIGRlY1JhdGUpO1xuICAgICAgICAgICAgY3JlYXRlZCsrO1xuICAgICAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhwcm9wcyk7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGtleXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBwYXJ0aWNsZXNbaV1ba2V5c1tqXV0gPSBwcm9wc1trZXlzW2pdXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFBvc3NpYmxlIHByb3BzOiByYW5nZSwgbm9Db2xsaWRlLCBkeCwgZHlcbiAgICAgICAgfVxuICAgICAgICBpKys7XG4gICAgfVxufTtcblxudmFyIGRyYXcgPSBmdW5jdGlvbihlbGFwc2VkLCBjdHgsIHBsYXllcikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydGljbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHBhcnRpY2xlc1tpXS5sb29wKGN0eCwgcGxheWVyKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjcmVhdGVQYXJ0aWNsZXM6IGNyZWF0ZVBhcnRpY2xlcyxcbiAgICBkcmF3OiBkcmF3LFxuICAgIGFycmF5OiBwYXJ0aWNsZXMsXG4gICAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBwYXJ0aWNsZXMubGVuZ3RoID0gMDtcbiAgICB9XG59O1xuIiwiLy8gdmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vdHJhbnNmb3JtLmpzJyk7XG52YXIgY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2dhbWUnKTtcblxud2luZG93LnBsYXllciA9IHt9O1xuXG5wbGF5ZXIuaWRsZSA9IG5ldyBJbWFnZSgpO1xucGxheWVyLmlkbGUuc3JjID0gJ2ltYWdlcy9hc3Ryby5wbmcnO1xucGxheWVyLmZseWluZyA9IG5ldyBJbWFnZSgpO1xucGxheWVyLmZseWluZy5zcmMgPSAnaW1hZ2VzL2FzdHJvLWZseWluZy5wbmcnO1xucGxheWVyLnN0YXRlID0gJ2lkbGUnO1xuXG52YXIgcGxheWVyRGVmYXVsdHMgPSB7XG4gICAgc2NvcmU6IDAsXG4gICAgYW5nbGU6IDAsXG4gICAgb2Zmc2V0WTogMCxcbiAgICBvZmZzZXRYOiAwLFxuICAgIGhlYWx0aDogMTAwMDAwMCxcbiAgICBmdWVsOiAxMDAwMDAwXG59O1xuXG5wbGF5ZXIud2lkdGggPSA1MjtcbnBsYXllci5oZWlnaHQgPSA2MDtcbnBsYXllci54ID0gKGNhbnZhcy53aWR0aCAtIHBsYXllci53aWR0aCkgLyAyO1xucGxheWVyLnkgPSAoY2FudmFzLmhlaWdodCAtIHBsYXllci5oZWlnaHQpIC8gMjtcbnBsYXllci5hbmdsZSA9IDA7XG5cbnBsYXllci5vZmZzZXRYID0gcGxheWVyLm9mZnNldFkgPSAwO1xuXG5cbi8vIEhhbGYgd2lkdGgsIGhhbGYgaGVpZ2h0XG52YXIgaFcgPSBwbGF5ZXIud2lkdGggLyAyO1xudmFyIGhIID0gcGxheWVyLmhlaWdodCAvIDI7XG5cbnZhciBzcGVlZCA9IDA7IC8vIFRoZSBjdXJyZW50IHNwZWVkXG52YXIgZFNwZWVkO1xudmFyIGRYID0gMCwgZFkgPSAwO1xuXG4vLyBZT1UgQ0FOIENPTkZJR1VSRSBUSEVTRSEgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbnZhciBhY2MgPSA3OyAvLyBBY2NlbGVyYXRpb25cbnZhciBsaW0gPSAxMDsgLy8gU3BlZWQgbGltaXRcbnZhciB0dXJuU3BlZWQgPSAyLjI7XG52YXIgZ3JhdiA9IDAuMDM7XG4vLyBOTyBNT1JFIENPTkZJR1VSSU5HISAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXG5cbnBsYXllci5yZXNldCA9IGZ1bmN0aW9uKCkge1xuICAgIGRYID0gZFkgPSBzcGVlZCA9IGRTcGVlZCA9IDA7XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhwbGF5ZXJEZWZhdWx0cyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHBsYXllcltrZXlzW2ldXSA9IHBsYXllckRlZmF1bHRzW2tleXNbaV1dO1xuICAgIH1cbiAgICBwbGF5ZXIubW92ZSgpO1xufTtcbnBsYXllci5ncmF2aXR5ID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIGRZIC09IGdyYXY7XG59O1xucGxheWVyLm1vdmUgPSBmdW5jdGlvbihlbGFwc2VkLCBmbHlpbmcpIHtcbiAgICBwbGF5ZXIub2Zmc2V0WCA9IGRYO1xuICAgIHBsYXllci5vZmZzZXRZID0gLWRZO1xuICAgIGRYICo9IDAuOTk7XG4gICAgZFkgKj0gMC45OTtcblxuICAgIGlmICghZmx5aW5nKSB7XG4gICAgICAgIHBsYXllci5zdGF0ZSA9ICdpZGxlJztcbiAgICB9XG59O1xucGxheWVyLnVwID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5mdWVsIC09IDAuMjtcbiAgICBwbGF5ZXIuc3RhdGUgPSAnZmx5aW5nJztcbiAgICBzcGVlZCArPSBhY2M7XG4gICAgZFNwZWVkID0gZWxhcHNlZCAqIHNwZWVkO1xuICAgIC8vIGNvbnNvbGUubG9nKHBsYXllci54LCBwbGF5ZXIueSk7XG4gICAgLy8gY29uc29sZS5sb2coTWF0aC5zaW4ocGxheWVyLmFuZ2xlKSAqIGRTcGVlZCwgTWF0aC5jb3MocGxheWVyLmFuZ2xlKSAqIGRTcGVlZCk7XG4gICAgZFggKz0gTWF0aC5zaW4ocGxheWVyLmFuZ2xlKSAqIGRTcGVlZDtcbiAgICBkWSArPSBNYXRoLmNvcyhwbGF5ZXIuYW5nbGUpICogZFNwZWVkO1xuICAgIHBsYXllci5tb3ZlKGVsYXBzZWQsIHRydWUpO1xuICAgIGlmIChzcGVlZCA+IGxpbSkge1xuICAgICAgICBzcGVlZCA9IGxpbTtcbiAgICB9XG4gICAgZWxzZSBpZiAoc3BlZWQgPCAtbGltKSB7XG4gICAgICAgIHNwZWVkID0gLWxpbTtcbiAgICB9XG5cbn07XG5wbGF5ZXIucmlnaHQgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgcGxheWVyLmFuZ2xlICs9IGVsYXBzZWQgKiB0dXJuU3BlZWQgKiBNYXRoLlBJO1xufTtcbnBsYXllci5sZWZ0ID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5hbmdsZSAtPSBlbGFwc2VkICogdHVyblNwZWVkICogTWF0aC5QSTtcbn07XG5wbGF5ZXIuZmxpcCA9IGZ1bmN0aW9uKCkge1xuICAgIHBsYXllci5hbmdsZSArPSBNYXRoLlBJO1xufTtcblxuLy8gdmFyIHQgPSBuZXcgVHJhbnNmb3JtKCk7XG5wbGF5ZXIuZHJhdyA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCkge1xuICAgIC8vIGN0eC5maWxsUmVjdCgzNzUsIDI3MCwgNTAsIDYwKTtcbiAgICAvLyBQbGF5ZXJcbiAgICBjdHguc2F2ZSgpO1xuICAgIGN0eC50cmFuc2xhdGUocGxheWVyLnggKyBoVywgcGxheWVyLnkgKyBoSCk7XG4gICAgLy8gdC50cmFuc2xhdGUocGxheWVyLnggKyBoVywgcGxheWVyLnkgKyBoSCk7XG4gICAgY3R4LnJvdGF0ZShwbGF5ZXIuYW5nbGUpO1xuICAgIC8vIHQucm90YXRlKHBsYXllci5hbmdsZSk7XG4gICAgY3R4LmRyYXdJbWFnZShwbGF5ZXJbcGxheWVyLnN0YXRlXSwgLWhXLCAtaEgpO1xuICAgIGN0eC5yZXN0b3JlKCk7XG5cbiAgICAvLyBwbGF5ZXIudG9wTGVmdCA9IHQudHJhbnNmb3JtUG9pbnQoLWhXLCAtaEgpO1xuICAgIC8vIHBsYXllci50b3BSaWdodCA9IHQudHJhbnNmb3JtUG9pbnQoaFcsIC1oSCk7XG4gICAgLy8gcGxheWVyLmJvdHRvbUxlZnQgPSB0LnRyYW5zZm9ybVBvaW50KC1oVywgaEgpO1xuICAgIC8vIHBsYXllci5ib3R0b21SaWdodCA9IHQudHJhbnNmb3JtUG9pbnQoaFcsIGhIKTtcbiAgICAvLyB0LnJlc2V0KCk7XG5cbn07XG5cbnBsYXllci5yZXNldCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBsYXllcjtcbiIsIi8vIEhvbGRzIGxhc3QgaXRlcmF0aW9uIHRpbWVzdGFtcC5cbnZhciB0aW1lID0gMDtcblxuLyoqXG4gKiBDYWxscyBgZm5gIG9uIG5leHQgZnJhbWUuXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuIFRoZSBmdW5jdGlvblxuICogQHJldHVybiB7aW50fSBUaGUgcmVxdWVzdCBJRFxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIHJhZihmbikge1xuICByZXR1cm4gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgICB2YXIgZWxhcHNlZCA9IG5vdyAtIHRpbWU7XG5cbiAgICBpZiAoZWxhcHNlZCA+IDk5OSkge1xuICAgICAgZWxhcHNlZCA9IDEgLyA2MDtcbiAgICB9IGVsc2Uge1xuICAgICAgZWxhcHNlZCAvPSAxMDAwO1xuICAgIH1cblxuICAgIHRpbWUgPSBub3c7XG4gICAgZm4oZWxhcHNlZCk7XG4gIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgLyoqXG4gICAqIENhbGxzIGBmbmAgb24gZXZlcnkgZnJhbWUgd2l0aCBgZWxhcHNlZGAgc2V0IHRvIHRoZSBlbGFwc2VkXG4gICAqIHRpbWUgaW4gbWlsbGlzZWNvbmRzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm4gVGhlIGZ1bmN0aW9uXG4gICAqIEByZXR1cm4ge2ludH0gVGhlIHJlcXVlc3QgSURcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHN0YXJ0OiBmdW5jdGlvbihmbikge1xuICAgIHJldHVybiByYWYoZnVuY3Rpb24gdGljayhlbGFwc2VkKSB7XG4gICAgICBmbihlbGFwc2VkKTtcbiAgICAgIHJhZih0aWNrKTtcbiAgICB9KTtcbiAgfSxcbiAgLyoqXG4gICAqIENhbmNlbHMgdGhlIHNwZWNpZmllZCBhbmltYXRpb24gZnJhbWUgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHtpbnR9IGlkIFRoZSByZXF1ZXN0IElEXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzdG9wOiBmdW5jdGlvbihpZCkge1xuICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZShpZCk7XG4gIH1cbn07XG4iLCJ2YXIgY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2dhbWUnKTtcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxudmFyIHBvbGFyaXR5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgPiAwLjUgPyAxIDogLTE7XG59O1xuXG4vLyBBbW91bnQgd2UndmUgbW92ZWQgc28gZmFyXG52YXIgdG90YWxYID0gMDtcbnZhciB0b3RhbFkgPSAwO1xuXG52YXIgc2hha2UgPSBmdW5jdGlvbihpbnRlbnNpdHkpIHtcbiAgICBpZiAoIWludGVuc2l0eSkge1xuICAgICAgICBpbnRlbnNpdHkgPSAyO1xuICAgIH1cbiAgICB2YXIgZFggPSBNYXRoLnJhbmRvbSgpICogaW50ZW5zaXR5ICogcG9sYXJpdHkoKTtcbiAgICB2YXIgZFkgPSBNYXRoLnJhbmRvbSgpICogaW50ZW5zaXR5ICogcG9sYXJpdHkoKTtcbiAgICB0b3RhbFggKz0gZFg7XG4gICAgdG90YWxZICs9IGRZO1xuXG4gICAgaWYgKE1hdGgucm91bmQoaW50ZW5zaXR5KSAlIDIgPT09IDApIHtcbiAgICAgICAgY3R4LnRyYW5zbGF0ZSgtdG90YWxYLCAtdG90YWxZKTtcbiAgICAgICAgdG90YWxYID0gdG90YWxZID0gMDtcbiAgICAgICAgaWYgKGludGVuc2l0eSA8PSAwLjE1KSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjdHgudHJhbnNsYXRlKGRYLCBkWSk7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgc2hha2UoaW50ZW5zaXR5IC0gMC4xKTtcbiAgICB9LCA1KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gc2hha2U7IiwidmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdjYW52YXMnKVswXTtcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbm1vZHVsZS5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKHRleHQsIHgsIHksIHByZUZ1bmMsIHN0cm9rZSl7XG4gICAgaWYocHJlRnVuYyl7XG4gICAgICAgIGN0eC5zYXZlKCk7XG4gICAgICAgIHByZUZ1bmMoY3R4KTtcbiAgICB9XG5cbiAgICB2YXIgeFBvcyA9IHg7XG4gICAgaWYoeCA9PT0gJ2NlbnRlcicpe1xuICAgICAgICB4UG9zID0gKGNhbnZhcy53aWR0aCAtIGN0eC5tZWFzdXJlVGV4dCh0ZXh0KS53aWR0aCkgLyAyO1xuICAgIH1cblxuICAgIGlmKHN0cm9rZSl7XG4gICAgICAgIGN0eC5zdHJva2VUZXh0KHRleHQsIHhQb3MsIHkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY3R4LmZpbGxUZXh0KHRleHQsIHhQb3MsIHkpO1xuICAgIH1cblxuICAgIGlmKHByZUZ1bmMpe1xuICAgICAgICBjdHgucmVzdG9yZSgpO1xuICAgIH1cbn07IiwiLy8gdWZvcy5qc1xuLy8gVGhpcyBmaWxlIGRlZmluZXMgYmVoYXZpb3IgZm9yIGFsbCB0aGUgdW5pZGVudGlmaWVkIGZseWluZyBvYmplY3RzXG4vLyBJIGd1ZXNzIHRoZXkgKmFyZSogaWRlbnRpZmllZCwgdGVjaG5pY2FsbHkuXG4vLyBCdXQgdWZvcy5qcyBpcyBjb29sZXIgdGhhbiBpZm9zLmpzXG4vLyBBc3Rlcm9pZHMgYW5kIGhlYWx0aCAvIGZ1ZWwgcGlja3VwcyBjb3VudCBhcyBVRk9zXG5cbnZhciBmbHlpbmdPYmplY3RzID0gW107XG5cbnZhciBsb2FkZXIgPSByZXF1aXJlKCcuL2xvYWRlci5qcycpO1xuXG52YXIgcm5kID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCk7XG59O1xudmFyIGNob29zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcmd1bWVudHNbTWF0aC5mbG9vcihybmQoKSAqIGFyZ3VtZW50cy5sZW5ndGgpXTtcbn07XG5cbnZhciBTUEFXTl9SQU5HRSA9IDEwMDtcbnZhciBNSU5fU1BFRUQgPSAwLjMsIE1BWF9TUEVFRCA9IDI7XG52YXIgV0lEVEggPSA4MDAsIEhFSUdIVCA9IDYwMDtcblxudmFyIHNwYXduID0gZnVuY3Rpb24obikge1xuICAgIC8vIGNvbnNvbGUubG9nKCdTcGF3bmVkIGZseWluZ09iamVjdHM6Jywgbik7XG4gICAgdmFyIG9iaiwgdGFyZ2V0WSwgdGFyZ2V0WDtcbiAgICB2YXIgc2lnblgsIHNpZ25ZLCBwb3NYLCBwb3NZO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIG9iaiA9IHtcbiAgICAgICAgICAgIHg6IChybmQoKSAqIFdJRFRIKSxcbiAgICAgICAgICAgIHk6IChybmQoKSAqIEhFSUdIVCksXG4gICAgICAgICAgICBzcGVlZDogcm5kKCkgKiAoTUFYX1NQRUVEIC0gTUlOX1NQRUVEKSArIE1JTl9TUEVFRCxcbiAgICAgICAgICAgIGltYWdlOiBjaG9vc2UuYXBwbHkodGhpcywgbG9hZGVyLmdldCgncm9jaycpLmNvbmNhdChsb2FkZXIuZ2V0KCdwb3dlci1pY29uJykpKSxcbiAgICAgICAgICAgIGFsaXZlOiB0cnVlXG4gICAgICAgIH07XG4gICAgICAgIHRhcmdldFkgPSBybmQoKSAqIFdJRFRIO1xuICAgICAgICB0YXJnZXRYID0gcm5kKCkgKiBIRUlHSFQ7XG4gICAgICAgIG9iai5hbmdsZSA9IHJuZCgpICogTWF0aC5QSSAqIDI7XG4gICAgICAgIG9iai5nb29kID0gb2JqLmltYWdlLmluZGV4T2YoJ3JvY2snKSA+PSAwID8gZmFsc2UgOiB0cnVlO1xuICAgICAgICBvYmoud2lkdGggPSBsb2FkZXIuaW1hZ2VzW29iai5pbWFnZV0ud2lkdGg7XG4gICAgICAgIG9iai5oZWlnaHQgPSBsb2FkZXIuaW1hZ2VzW29iai5pbWFnZV0uaGVpZ2h0O1xuICAgICAgICBvYmouZHggPSBNYXRoLmNvcyhvYmouYW5nbGUpICogb2JqLnNwZWVkO1xuICAgICAgICBvYmouZHkgPSBNYXRoLnNpbihvYmouYW5nbGUpICogb2JqLnNwZWVkO1xuXG4gICAgICAgIGlmICghb2JqLmdvb2QpIHtcbiAgICAgICAgICAgIG9iai5jb2xvciA9IG9iai5pbWFnZS5pbmRleE9mKCdhbHQnKSA8IDAgPyAnI2FhYWFhYScgOiAnI2E3ODI1OCc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocm5kKCkgPiAwLjUpIHtcbiAgICAgICAgICAgIG9iai54ICs9IGNob29zZSgtMSwgMSkgKiAoV0lEVEggKyBvYmoud2lkdGgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgb2JqLnkgKz0gY2hvb3NlKC0xLCAxKSAqIChIRUlHSFQgKyBvYmouaGVpZ2h0KTtcbiAgICAgICAgfVxuICAgICAgICBmbHlpbmdPYmplY3RzLnB1c2gob2JqKTtcbiAgICB9XG59O1xuXG52YXIgbG9vcCA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCwgb2Zmc2V0WCwgb2Zmc2V0WSkge1xuICAgIHZhciBvYmo7XG4gICAgZm9yICh2YXIgaSA9IGZseWluZ09iamVjdHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgb2JqID0gZmx5aW5nT2JqZWN0c1tpXTtcbiAgICAgICAgaWYgKG9iai5hbGl2ZSkge1xuICAgICAgICAgICAgb2JqLnggKz0gb2JqLmR4IC0gb2Zmc2V0WDtcbiAgICAgICAgICAgIG9iai55ICs9IG9iai5keSAtIG9mZnNldFk7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JlZCc7XG4gICAgICAgICAgICBjdHguZHJhd0ltYWdlKGxvYWRlci5pbWFnZXNbb2JqLmltYWdlXSwgb2JqLngsIG9iai55KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGZseWluZ09iamVjdHMuc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBsb29wOiBsb29wLFxuICAgIGFycmF5OiBmbHlpbmdPYmplY3RzLFxuICAgIHNwYXduOiBzcGF3bixcbiAgICByZXNldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGZseWluZ09iamVjdHMubGVuZ3RoID0gMDtcbiAgICB9XG59OyJdfQ==
