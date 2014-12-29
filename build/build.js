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
        range: Math.random() * 2 * Math.PI,
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
                player.hit = true;
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
var whiten = require('./whiten');
var canvas = document.querySelector('#game');

window.player = {};

player.idle = new Image();
player.idle.src = 'images/astro.png';
player.idle.name = 'astro.png';
player.flying = new Image();
player.flying.src = 'images/astro-flying.png';
player.flying.name = 'astro-flying.png';
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


var ticks = 0;
player.draw = function(elapsed, ctx) {
    // Player
    ctx.save();
    ctx.translate(player.x + hW, player.y + hH);
    ctx.rotate(player.angle);
    // player.hit is set in collisions.js
    // If the player's been hit, we want it to flash white to indicate that
    if (player.hit) {
        ctx.drawImage(whiten(player[player.state].name), -hW, -hH);
        ticks++;
        if (ticks >= 4) {
            player.hit = false;
            ticks = 0;
        }
    }
    else {
        ctx.drawImage(player[player.state], -hW, -hH);
    }
    ctx.restore();

};

player.reset();

module.exports = player;

},{"./whiten":13}],9:[function(require,module,exports){
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

    // Bring the screen back to its usual position every "2 intensity" so as not to get too far away from the center
    if (intensity % 2 < 0.2) {
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
},{"./loader.js":5}],13:[function(require,module,exports){
var loader = require('./loader');
var images = loader.images;

var cache = {};
var whiten = function(imgName) {
    if (cache[imgName]) {
        return cache[imgName];
    }
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var img = images[imgName];

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, img.width, img.height);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, img.width, img.height);
    cache[imgName] = canvas;
    return canvas;
};

module.exports = whiten;
},{"./loader":5}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4vc3JjL21haW4iLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9hdWRpby5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL2NvbGxpc2lvbnMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9rZXlzLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvbG9hZGVyLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvbWVudXMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9wYXJ0aWNsZXMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9wbGF5ZXIuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9yYWYuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9zY3JlZW5zaGFrZS5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL3RleHQuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy91Zm9zLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvd2hpdGVuLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGxvYWRlciA9IHJlcXVpcmUoJy4vbG9hZGVyLmpzJyk7XG5cbnZhciByYWYgPSByZXF1aXJlKCcuL3JhZicpO1xudmFyIHBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyJyk7XG52YXIga2V5ID0gcmVxdWlyZSgnLi9rZXlzJyk7XG52YXIgcGFydGljbGVzID0gcmVxdWlyZSgnLi9wYXJ0aWNsZXMnKTtcbnZhciBmbHlpbmdPYmplY3RzID0gcmVxdWlyZSgnLi91Zm9zJyk7XG52YXIgY29sbGlzaW9ucyA9IHJlcXVpcmUoJy4vY29sbGlzaW9ucycpO1xudmFyIG1lbnVzID0gcmVxdWlyZSgnLi9tZW51cycpO1xudmFyIGF1ZGlvID0gcmVxdWlyZSgnLi9hdWRpbycpO1xuXG52YXIgY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2dhbWUnKTtcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxudmFyIHNmeCA9IFsnY29sbGVjdCcsICdjb2xsaWRlJywgJ2V4cGxvZGVfbWV0ZW9yJywgJ2pldHBhY2snXTtcbmxvYWRlci5kb25lKGZ1bmN0aW9uKCkge1xuICAgIGF1ZGlvLm11dGUoKTsgLy8gQmVjYXVzZSBJIGRvbid0IHdhbnQgaXQgYXV0b3BsYXlpbmcgd2hpbGUgSSBkZXZlbG9wIGl0IVxuXG4gICAgd2luZG93LnN0YXRlID0gJ21lbnUnO1xuICAgIHJhZi5zdGFydChmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgICAgIGlmICh3aW5kb3cuc3RhdGUgPT09ICdtZW51Jykge1xuICAgICAgICAgICAgbWVudXMuZHJhd01lbnUoY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh3aW5kb3cuc3RhdGUgPT09ICdnYW1lJykge1xuICAgICAgICAgICAgcGxheWVyLmdyYXZpdHkoZWxhcHNlZCk7XG4gICAgICAgICAgICBpZiAoa2V5LnVwKCkgJiYgcGxheWVyLmZ1ZWwgPiAwKSB7XG4gICAgICAgICAgICAgICAgYXVkaW8ucGxheSgnamV0cGFjaycpO1xuICAgICAgICAgICAgICAgIHBsYXllci51cChlbGFwc2VkKTtcbiAgICAgICAgICAgICAgICBwYXJ0aWNsZXMuY3JlYXRlUGFydGljbGVzKHBsYXllci54ICsgcGxheWVyLndpZHRoIC8gMiwgcGxheWVyLnkgKyBwbGF5ZXIuaGVpZ2h0IC8gMiwgMTAsIDAuMSwgMTAsIHtcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IE1hdGguUEkgLyAxMFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhdWRpby5wYXVzZSgnamV0cGFjaycpO1xuICAgICAgICAgICAgICAgIHBsYXllci5tb3ZlKGVsYXBzZWQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoa2V5LnJpZ2h0KCkpIHtcbiAgICAgICAgICAgICAgICBwbGF5ZXIucmlnaHQoZWxhcHNlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoa2V5LmxlZnQoKSkge1xuICAgICAgICAgICAgICAgIHBsYXllci5sZWZ0KGVsYXBzZWQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUaGlzIGZ1bmN0aW9uIGNoZWNrcyBmb3IgYWxsIHJlcXVpcmVkIGNvbGxpc2lvbnMsIGFuZCBjYWxscyB0aGUgY29ycmVzcG9uZGluZyBmdW5jdGlvbnMgYWZ0ZXIgdG9vXG4gICAgICAgICAgICBjb2xsaXNpb25zLmNoZWNrKHBsYXllciwgZmx5aW5nT2JqZWN0cyk7XG5cbiAgICAgICAgICAgIC8vIENsZWFyIHRoZSBzY3JlZW5cbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzBmMGQyMCc7XG4gICAgICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgODAwLCA2MDApO1xuXG4gICAgICAgICAgICBmbHlpbmdPYmplY3RzLmxvb3AoZWxhcHNlZCwgY3R4LCBwbGF5ZXIub2Zmc2V0WCwgcGxheWVyLm9mZnNldFkpO1xuICAgICAgICAgICAgcGFydGljbGVzLmRyYXcoZWxhcHNlZCwgY3R4LCBwbGF5ZXIpO1xuICAgICAgICAgICAgcGxheWVyLmRyYXcoZWxhcHNlZCwgY3R4KTtcbiAgICAgICAgICAgIG1lbnVzLmluZ2FtZShjdHgsIHBsYXllci5mdWVsLCBwbGF5ZXIuaGVhbHRoLCBwbGF5ZXIuc2NvcmUpO1xuXG4gICAgICAgICAgICBwbGF5ZXIuc2NvcmUgKz0gMC4xO1xuXG4gICAgICAgICAgICBpZiAocGxheWVyLmhlYWx0aCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LnN0YXRlID0gJ2VuZCc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAod2luZG93LnN0YXRlID09PSAnZW5kJykge1xuICAgICAgICAgICAgYXVkaW8ucGF1c2Uoc2Z4KTtcbiAgICAgICAgICAgIG1lbnVzLmRyYXdFbmQoY3R4LCBwbGF5ZXIuc2NvcmUpO1xuICAgICAgICB9XG5cbiAgICB9KTtcbn0pO1xuXG52YXIgY2hhbmdlU3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAod2luZG93LnN0YXRlID09PSAnbWVudScpIHtcbiAgICAgICAgd2luZG93LnN0YXRlID0gJ2dhbWUnO1xuICAgIH1cbiAgICBlbHNlIGlmICh3aW5kb3cuc3RhdGUgPT09ICdlbmQnKSB7XG4gICAgICAgIHdpbmRvdy5zdGF0ZSA9ICdnYW1lJztcbiAgICAgICAgcGxheWVyLnNjb3JlID0gMDtcbiAgICAgICAgcGxheWVyLnJlc2V0KCk7XG4gICAgICAgIHBhcnRpY2xlcy5yZXNldCgpO1xuICAgICAgICBmbHlpbmdPYmplY3RzLnJlc2V0KCk7XG4gICAgfVxufTtcblxuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2hhbmdlU3RhdGUsIGZhbHNlKTtcbmRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAoZS5rZXlDb2RlID09PSAxMykge1xuICAgICAgICBjaGFuZ2VTdGF0ZSgpO1xuICAgIH1cbn0sIGZhbHNlKTtcbiIsInZhciBhdWRpbyA9IHdpbmRvdy5hdWRpbyA9IHt9OyAvLyBNYWRlIGl0IGEgZ2xvYmFsIHNvIEkgY2FuIGVhc2lseSB0ZXN0XG52YXIgZWxlbWVudHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdhdWRpbycpO1xudmFyIEZBREVfU1BFRUQgPSAwLjE7XG5cbmF1ZGlvLm11dGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBlbGVtZW50c1tpXS52b2x1bWUgPSAwO1xuICAgIH1cbn07XG5hdWRpby5zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZWxlbWVudHNbaV0ucGF1c2UoKTtcbiAgICB9XG59O1xuXG5hdWRpby5wbGF5ID0gZnVuY3Rpb24gKG5hbWUsIHNlZWtGcm9tKSB7XG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChuYW1lKTtcbiAgICBlbGVtLmN1cnJlbnRUaW1lID0gc2Vla0Zyb20gfHwgMDtcbiAgICBlbGVtLnBsYXkoKTtcbn07XG5hdWRpby5wYXVzZSA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgaWYgKHR5cGVvZiBuYW1lID09PSAnc3RyaW5nJykge1xuICAgICAgICB2YXIgbmFtZXMgPSBbbmFtZV07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBuYW1lcyA9IG5hbWU7XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChuYW1lc1tpXSk7XG4gICAgICAgIGVsZW0ucGF1c2UoKTtcbiAgICB9XG4gICAgXG59O1xuXG5hdWRpby5mYWRlb3V0ID0gZnVuY3Rpb24gKG5hbWUsIHNlZWtGcm9tLCBjYikge1xuICAgIHZhciBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobmFtZSk7XG4gICAgdmFyIHZvbHVtZSA9IGVsZW0udm9sdW1lO1xuICAgIHZhciBkZWNyZWFzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdm9sdW1lIC09IEZBREVfU1BFRUQ7XG4gICAgICAgIGNvbnNvbGUubG9nKHZvbHVtZSk7XG4gICAgICAgIGlmICh2b2x1bWUgPD0gMCkge1xuICAgICAgICAgICAgZWxlbS52b2x1bWUgPSAwO1xuICAgICAgICAgICAgZWxlbS5wYXVzZSgpO1xuICAgICAgICAgICAgY2IgJiYgY2IoZWxlbSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlbGVtLnZvbHVtZSA9IHZvbHVtZTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZGVjcmVhc2UsIDEwMC8zKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgZGVjcmVhc2UoKTtcbn1cbmF1ZGlvLmZhZGVpbiA9IGZ1bmN0aW9uIChuYW1lLCBzZWVrRnJvbSwgY2IpIHtcbiAgICB2YXIgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG5hbWUpO1xuICAgIHZhciB2b2x1bWUgPSBlbGVtLnZvbHVtZSA9IDA7XG4gICAgZWxlbS5wbGF5KCk7XG4gICAgdmFyIGluY3JlYXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2b2x1bWUgKz0gRkFERV9TUEVFRDtcbiAgICAgICAgaWYgKHZvbHVtZSA+PSAxKSB7XG4gICAgICAgICAgICBlbGVtLnZvbHVtZSA9IDE7XG4gICAgICAgICAgICBjYiAmJiBjYihlbGVtKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGVsZW0udm9sdW1lID0gdm9sdW1lO1xuICAgICAgICAgICAgc2V0VGltZW91dChpbmNyZWFzZSwgMTAwLzMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBpbmNyZWFzZSgpO1xufVxubW9kdWxlLmV4cG9ydHMgPSBhdWRpbzsiLCJ2YXIgcGFydGljbGVzTW9kdWxlID0gcmVxdWlyZSgnLi9wYXJ0aWNsZXMnKTtcbnZhciBzaGFrZSA9IHJlcXVpcmUoJy4vc2NyZWVuc2hha2UnKTtcblxudmFyIHBsYXllckhpdEJveCA9IHtcbiAgICB4OiAzNzUsXG4gICAgeTogMjcwLFxuICAgIHdpZHRoOiA1MCxcbiAgICBoZWlnaHQ6IDYwXG59O1xudmFyIGFuZ2xlZENvbGxpc2lvbiA9IGZ1bmN0aW9uKHBsYXllciwgZm8pIHtcbiAgICB2YXIgY29sbGlkaW5nID0gZmFsc2U7XG4gICAgY29sbGlkaW5nID0gYWFiYihwbGF5ZXJIaXRCb3gsIGZvKTtcbiAgICByZXR1cm4gY29sbGlkaW5nO1xufTtcblxudmFyIGFhYmIgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgaWYgKFxuICAgICAgICBNYXRoLmFicyhhLnggKyBhLndpZHRoIC8gMiAtIGIueCAtIGIud2lkdGggLyAyKSA+IChhLndpZHRoICsgYi53aWR0aCkgLyAyIHx8XG4gICAgICAgIE1hdGguYWJzKGEueSArIGEuaGVpZ2h0IC8gMiAtIGIueSAtIGIuaGVpZ2h0IC8gMikgPiAoYS5oZWlnaHQgKyBiLmhlaWdodCkgLyAyXG4gICAgKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG52YXIgaW5BcmVhID0gZnVuY3Rpb24oYXJlYSwgYXJyYXksIHJlc3BDb2xsaWRpbmcsIHJlc3BOb3RDb2xsaWRpbmcpIHtcbiAgICB2YXIgcmV0ID0gW107XG4gICAgdmFyIGN1ckVsZW07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjdXJFbGVtID0gYXJyYXlbaV07XG4gICAgICAgIGlmIChhYWJiKGFyZWEsIGN1ckVsZW0pKSB7XG4gICAgICAgICAgICByZXQucHVzaChjdXJFbGVtKTtcbiAgICAgICAgICAgIGlmIChyZXNwQ29sbGlkaW5nKSB7XG4gICAgICAgICAgICAgICAgcmVzcENvbGxpZGluZyhjdXJFbGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChyZXNwTm90Q29sbGlkaW5nKSB7XG4gICAgICAgICAgICByZXNwTm90Q29sbGlkaW5nKGN1ckVsZW0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59O1xuXG52YXIgcGxheWVyQXJlYSA9IHtcbiAgICB4OiAzMjUsXG4gICAgeTogMjI1LFxuICAgIHdpZHRoOiAxNTAsXG4gICAgaGVpZ2h0OiAxNTBcbn07XG5cbnZhciBjYW1lcmEgPSB7XG4gICAgeDogLTQwMCxcbiAgICB5OiAtMzAwLFxuICAgIHdpZHRoOiAxNjAwLFxuICAgIGhlaWdodDogMTIwMFxufTtcblxudmFyIGV4cGxvZGVPYmogPSBmdW5jdGlvbihmbykge1xuICAgIHBhcnRpY2xlc01vZHVsZS5jcmVhdGVQYXJ0aWNsZXMoZm8ueCwgZm8ueSwgZm8uc3BlZWQsIDAuMDEsIGZvLndpZHRoICogZm8uaGVpZ2h0IC8gMTAwLCB7XG4gICAgICAgIHJhbmdlOiBNYXRoLnJhbmRvbSgpICogMiAqIE1hdGguUEksXG4gICAgICAgIG5vQ29sbGlkZTogdHJ1ZSxcbiAgICAgICAgZHg6IGZvLmR4LFxuICAgICAgICBkeTogZm8uZHksXG4gICAgICAgIGNvbG9yOiBmby5jb2xvclxuICAgIH0pO1xufTtcblxudmFyIGNoZWNrID0gZnVuY3Rpb24ocGxheWVyLCBmb01vZHVsZSkge1xuICAgIC8vIGZvIHN0YW5kcyBmb3IgZmx5aW5nT2JqZWN0c1xuICAgIHZhciBwYXJ0aWNsZXMgPSBwYXJ0aWNsZXNNb2R1bGUuYXJyYXk7XG4gICAgdmFyIGZvcyA9IGZvTW9kdWxlLmFycmF5O1xuICAgIC8vIE1hbmFnZSBmbHlpbmcgb2JqZWN0IHNwYXduaW5nXG4gICAgdmFyIGZvSW5WaWV3ID0gaW5BcmVhKGNhbWVyYSwgZm9zLCB1bmRlZmluZWQsIGZ1bmN0aW9uKGZvKSB7XG4gICAgICAgIGZvLmFsaXZlID0gZmFsc2U7XG4gICAgfSk7XG4gICAgaWYgKGZvSW5WaWV3Lmxlbmd0aCA8IDMwKSB7XG4gICAgICAgIGZvTW9kdWxlLnNwYXduKE1hdGgucmFuZG9tKCkgKiAxMDApO1xuICAgIH1cblxuICAgIC8vIENvbGxpc2lvbnMgYmV0d2VlbiB0aGUgcGxheWVyIGFuZCByb2Nrc1xuICAgIHZhciBmb1RvVGVzdCA9IGluQXJlYShwbGF5ZXJBcmVhLCBmb3MpO1xuICAgIHZhciBmbztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZvVG9UZXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGZvID0gZm9Ub1Rlc3RbaV07XG4gICAgICAgIGlmIChhbmdsZWRDb2xsaXNpb24ocGxheWVyLCBmbykpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdISVQnKTtcbiAgICAgICAgICAgIGZvLmFsaXZlID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoZm8uaW1hZ2UgPT09ICdwb3dlci1pY29uLnBuZycpIHtcbiAgICAgICAgICAgICAgICBhdWRpby5wbGF5KCdjb2xsZWN0Jyk7XG4gICAgICAgICAgICAgICAgcGxheWVyLmZ1ZWwgKz0gMTA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBhdWRpby5wbGF5KCdjb2xsaWRlJyk7XG4gICAgICAgICAgICAgICAgcGxheWVyLmhpdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgcGxheWVyLmhlYWx0aCAtPSAoZm8ud2lkdGggKiBmby5oZWlnaHQpIC8gMTAwO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDb2xsaXNpb24gcGFydGljbGVzJyk7XG4gICAgICAgICAgICAgICAgZXhwbG9kZU9iaihmbyk7XG4gICAgICAgICAgICAgICAgc2hha2UoNSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgY29sbGlzaW9ucyBiZXR3ZWVuIHBhcnRpY2xlcyBhbmQgZm9cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRpY2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAocGFydGljbGVzW2ldLm5vQ29sbGlkZSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaW5BcmVhKHBhcnRpY2xlc1tpXSwgZm9zLCBmdW5jdGlvbihmbykge1xuICAgICAgICAgICAgaWYgKHBhcnRpY2xlc1tpXS5hbGl2ZSAmJiAhZm8uZ29vZCkge1xuICAgICAgICAgICAgICAgIGZvLmFsaXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgYXVkaW8ucGxheSgnZXhwbG9kZV9tZXRlb3InKTtcbiAgICAgICAgICAgICAgICBwbGF5ZXIuc2NvcmUgKz0gKGZvLndpZHRoICogZm8uaGVpZ2h0KSAvIDEwMDtcbiAgICAgICAgICAgICAgICBleHBsb2RlT2JqKGZvKTtcbiAgICAgICAgICAgICAgICBzaGFrZSgyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY2hlY2s6IGNoZWNrXG59OyIsInZhciBwbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpO1xudmFyIGtleXMgPSB7fTtcbnZhciBDID0ge1xuICAgIFNQQUNFOiAzMixcbiAgICBMRUZUOiAzNyxcbiAgICBVUDogMzgsXG4gICAgUklHSFQ6IDM5LFxuICAgIERPV046IDQwXG59XG5kb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbihlKSB7XG4gICAgaWYgKGUua2V5Q29kZSA9PT0gQy5TUEFDRSkge1xuICAgICAgICBwbGF5ZXIuZmxpcCgpO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGUua2V5Q29kZSA+PSAzNyAmJiBlLmtleUNvZGUgPD0gNDApIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cbiAgICBrZXlzW2Uua2V5Q29kZV0gPSB0cnVlO1xufSk7XG5kb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3Rpb24oZSkge1xuICAgIGtleXNbZS5rZXlDb2RlXSA9IGZhbHNlO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxlZnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1tDLkxFRlRdO1xuICAgIH0sXG4gICAgdXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1tDLlVQXTtcbiAgICB9LFxuICAgIHJpZ2h0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbQy5SSUdIVF07XG4gICAgfSxcbiAgICBkb3duOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbQy5ET1dOXTtcbiAgICB9LFxuICAgIGZsaXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1tDLlNQQUNFXTtcbiAgICB9XG59O1xuIiwidmFyIGltYWdlTmFtZXMgPSBbXG4gICAgJ2FzdHJvLnBuZycsXG4gICAgJ2FzdHJvLWZseWluZy5wbmcnLFxuICAgICdoZWFsdGgtYmFyLWljb24ucG5nJyxcbiAgICAnbG9nby5wbmcnLFxuICAgICdwb3dlci1iYXItaWNvbi5wbmcnLFxuICAgICdwb3dlci1pY29uLnBuZycsXG4gICAgJ3JvY2stNS5wbmcnLFxuICAgICdyb2NrLWFsdC01LnBuZycsXG4gICAgJ3JvY2stb2RkLTEucG5nJyxcbiAgICAncm9jay1vZGQtMy5wbmcnLFxuICAgICd0ZXh0LWNyZWRpdHMucG5nJyxcbiAgICAndGV4dC1wbGF5LnBuZydcbl07XG5cbnZhciBpbWFnZXMgPSB7fTtcbnZhciBsb2FkZWQgPSAwO1xudmFyIGRvbmUgPSBmdW5jdGlvbihjYikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW1hZ2VOYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpbWFnZXNbaW1hZ2VOYW1lc1tpXV0gPSBuZXcgSW1hZ2UoKTtcbiAgICAgICAgaW1hZ2VzW2ltYWdlTmFtZXNbaV1dLnNyYyA9ICdpbWFnZXMvJyArIGltYWdlTmFtZXNbaV07XG4gICAgICAgIGltYWdlc1tpbWFnZU5hbWVzW2ldXS5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGxvYWRlZCsrO1xuICAgICAgICAgICAgaWYgKGxvYWRlZCA9PT0gaW1hZ2VOYW1lcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjYigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbGlzdDogaW1hZ2VOYW1lcyxcbiAgICBpbWFnZXM6IGltYWdlcyxcbiAgICBkb25lOiBkb25lLFxuICAgIGdldDogZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGltYWdlTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChpbWFnZU5hbWVzW2ldLmluZGV4T2Yoc3RyaW5nKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICByZXQucHVzaChpbWFnZU5hbWVzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cbn07IiwidmFyIGxvYWRlciA9IHJlcXVpcmUoJy4vbG9hZGVyLmpzJyk7XG52YXIgdGV4dCA9IHJlcXVpcmUoJy4vdGV4dC5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBkcmF3TWVudTogZnVuY3Rpb24oY3R4KSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzBmMGQyMCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCA4MDAsIDYwMCk7XG5cbiAgICAgICAgY3R4LmRyYXdJbWFnZShsb2FkZXIuaW1hZ2VzWydsb2dvLnBuZyddLCAzMTQsIDE4MCk7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1sndGV4dC1wbGF5LnBuZyddLCAzMzMsIDMwMCk7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1sndGV4dC1jcmVkaXRzLnBuZyddLCAyODcsIDUwMCk7XG4gICAgfSxcbiAgICBkcmF3RW5kOiBmdW5jdGlvbihjdHgsIHNjb3JlKSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzBmMGQyMCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCA4MDAsIDYwMCk7XG4gICAgICAgIHRleHQud3JpdGUoJ1RoZSBlbmQhIFlvdSBzY29yZWQgJyArIE1hdGgucm91bmQoc2NvcmUpICsgJyBwb2ludHMhJywgJ2NlbnRlcicsIDMwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgICAgIGN0eC5mb250ID0gJzMycHQgQXJpYWwnO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC53cml0ZSgnQ2xpY2sgdG8gcGxheSBhZ2FpbicsICdjZW50ZXInLCA1MDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG4gICAgICAgICAgICBjdHguZm9udCA9ICcyMnB0IEFyaWFsJztcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBpbmdhbWU6IGZ1bmN0aW9uIChjdHgsIGZ1ZWwsIGhlYWx0aCwgc2NvcmUpIHtcbiAgICAgICAgY3R4LmRyYXdJbWFnZShsb2FkZXIuaW1hZ2VzWydwb3dlci1iYXItaWNvbi5wbmcnXSwgMzAsIDUwMCk7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnb3JhbmdlJztcbiAgICAgICAgY3R4LmZpbGxSZWN0KDMwLCA0OTAgLSBmdWVsLCAyMCwgZnVlbCk7XG5cblxuICAgICAgICBjdHguZHJhd0ltYWdlKGxvYWRlci5pbWFnZXNbJ2hlYWx0aC1iYXItaWNvbi5wbmcnXSwgNzAsIDUwMCk7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAncmVkJztcbiAgICAgICAgY3R4LmZpbGxSZWN0KDcwLCA0OTAgLSBoZWFsdGgsIDIwLCBoZWFsdGgpO1xuXG4gICAgICAgIGN0eC5mb250ID0gJzEycHQgQXJpYWwnO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgY3R4LmZpbGxUZXh0KCdTY29yZTogJyArIE1hdGgucm91bmQoc2NvcmUpLCAyNywgNTUwKTtcbiAgICB9XG59OyIsInZhciBwYXJ0aWNsZXMgPSBbXTtcbnZhciBXID0gNywgSCA9IDc7XG52YXIgREVDX1JBVEUgPSAwLjE7IC8vIERlZmF1bHQgZGVjcmVhc2UgcmF0ZS4gSGlnaGVyIHJhdGUgLT4gcGFydGljbGVzIGdvIGZhc3RlclxudmFyIFBhcnRpY2xlID0gZnVuY3Rpb24oeCwgeSwgc3BlZWQsIGRlY1JhdGUpIHtcbiAgICB0aGlzLmFsaXZlID0gdHJ1ZTtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy5keCA9IHRoaXMuZHkgPSAwO1xuICAgIHRoaXMud2lkdGggPSBXO1xuICAgIHRoaXMuaGVpZ2h0ID0gSDtcbiAgICB0aGlzLmFuZ2xlID0gMDtcbiAgICB0aGlzLnNwZWVkID0gc3BlZWQ7XG4gICAgdGhpcy5vcGFjaXR5ID0gMTtcbiAgICB0aGlzLmRlY1JhdGUgPSBkZWNSYXRlIHx8IERFQ19SQVRFO1xuICAgIHRoaXMuZGVsYXkgPSBNYXRoLmNlaWwoTWF0aC5yYW5kb20oKSAqIDEwKTtcbiAgICB0aGlzLmxvb3AgPSBmdW5jdGlvbihjdHgsIHBsYXllcikge1xuICAgICAgICBpZiAodGhpcy5kZWxheSA+IDApIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRlbGF5IDw9IDEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFuZ2xlID0gcGxheWVyLmFuZ2xlIC0gdGhpcy5yYW5nZSArIChNYXRoLnJhbmRvbSgpICogMiAqIHRoaXMucmFuZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5kZWxheS0tO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMueCArPSB0aGlzLmR4IC0gd2luZG93LnBsYXllci5vZmZzZXRYICsgTWF0aC5zaW4oLXRoaXMuYW5nbGUpICogc3BlZWQ7XG4gICAgICAgIHRoaXMueSArPSB0aGlzLmR5IC0gd2luZG93LnBsYXllci5vZmZzZXRZICsgTWF0aC5jb3MoLXRoaXMuYW5nbGUpICogc3BlZWQ7XG4gICAgICAgIHRoaXMub3BhY2l0eSAtPSB0aGlzLmRlY1JhdGU7XG4gICAgICAgIGlmICh0aGlzLm9wYWNpdHkgPD0gMCkge1xuICAgICAgICAgICAgdGhpcy5vcGFjaXR5ID0gMDtcbiAgICAgICAgICAgIHRoaXMuYWxpdmUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBEcmF3XG4gICAgICAgIGN0eC5zYXZlKCk7XG4gICAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IHRoaXMub3BhY2l0eTtcbiAgICAgICAgY3R4LnRyYW5zbGF0ZSh0aGlzLngsIHRoaXMueSk7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmNvbG9yIHx8ICdyZWQnO1xuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgVywgSCk7XG4gICAgICAgIGN0eC5yZXN0b3JlKCk7XG4gICAgfTtcbn07XG5cbi8vIHgsIHkgYXJlIGZpeGVkXG4vLyBQYXJ0aWNsZXMgYXJlIGNyZWF0ZWQgZnJvbSBhbmdsZS1yYW5nZSB0byBhbmdsZStyYW5nZVxuLy8gc3BlZWQgaXMgZml4ZWRcbnZhciBhbmdsZSA9IDA7XG52YXIgY3JlYXRlUGFydGljbGVzID0gZnVuY3Rpb24oeCwgeSwgc3BlZWQsIGRlY1JhdGUsIG4sIHByb3BzKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ0NyZWF0aW5nJywgcGFydGljbGVzKTtcbiAgICB2YXIgY3JlYXRlZCA9IDAsIGkgPSAwO1xuICAgIHZhciBwYXJ0aWNsZTtcbiAgICB3aGlsZShjcmVhdGVkIDwgbikge1xuICAgICAgICBwYXJ0aWNsZSA9IHBhcnRpY2xlc1tpXTtcbiAgICAgICAgaWYgKHBhcnRpY2xlICYmICFwYXJ0aWNsZS5hbGl2ZSB8fCAhcGFydGljbGUpIHtcbiAgICAgICAgICAgIHBhcnRpY2xlc1tpXSA9IG5ldyBQYXJ0aWNsZSh4LCB5LCBzcGVlZCwgZGVjUmF0ZSk7XG4gICAgICAgICAgICBjcmVhdGVkKys7XG4gICAgICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHByb3BzKTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwga2V5cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHBhcnRpY2xlc1tpXVtrZXlzW2pdXSA9IHByb3BzW2tleXNbal1dO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUG9zc2libGUgcHJvcHM6IHJhbmdlLCBub0NvbGxpZGUsIGR4LCBkeVxuICAgICAgICB9XG4gICAgICAgIGkrKztcbiAgICB9XG59O1xuXG52YXIgZHJhdyA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCwgcGxheWVyKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0aWNsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcGFydGljbGVzW2ldLmxvb3AoY3R4LCBwbGF5ZXIpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNyZWF0ZVBhcnRpY2xlczogY3JlYXRlUGFydGljbGVzLFxuICAgIGRyYXc6IGRyYXcsXG4gICAgYXJyYXk6IHBhcnRpY2xlcyxcbiAgICByZXNldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHBhcnRpY2xlcy5sZW5ndGggPSAwO1xuICAgIH1cbn07XG4iLCJ2YXIgd2hpdGVuID0gcmVxdWlyZSgnLi93aGl0ZW4nKTtcbnZhciBjYW52YXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZ2FtZScpO1xuXG53aW5kb3cucGxheWVyID0ge307XG5cbnBsYXllci5pZGxlID0gbmV3IEltYWdlKCk7XG5wbGF5ZXIuaWRsZS5zcmMgPSAnaW1hZ2VzL2FzdHJvLnBuZyc7XG5wbGF5ZXIuaWRsZS5uYW1lID0gJ2FzdHJvLnBuZyc7XG5wbGF5ZXIuZmx5aW5nID0gbmV3IEltYWdlKCk7XG5wbGF5ZXIuZmx5aW5nLnNyYyA9ICdpbWFnZXMvYXN0cm8tZmx5aW5nLnBuZyc7XG5wbGF5ZXIuZmx5aW5nLm5hbWUgPSAnYXN0cm8tZmx5aW5nLnBuZyc7XG5wbGF5ZXIuc3RhdGUgPSAnaWRsZSc7XG5cbnZhciBwbGF5ZXJEZWZhdWx0cyA9IHtcbiAgICBzY29yZTogMCxcbiAgICBhbmdsZTogMCxcbiAgICBvZmZzZXRZOiAwLFxuICAgIG9mZnNldFg6IDAsXG4gICAgaGVhbHRoOiAxMDAwMDAwLFxuICAgIGZ1ZWw6IDEwMDAwMDBcbn07XG5cbnBsYXllci53aWR0aCA9IDUyO1xucGxheWVyLmhlaWdodCA9IDYwO1xucGxheWVyLnggPSAoY2FudmFzLndpZHRoIC0gcGxheWVyLndpZHRoKSAvIDI7XG5wbGF5ZXIueSA9IChjYW52YXMuaGVpZ2h0IC0gcGxheWVyLmhlaWdodCkgLyAyO1xucGxheWVyLmFuZ2xlID0gMDtcblxucGxheWVyLm9mZnNldFggPSBwbGF5ZXIub2Zmc2V0WSA9IDA7XG5cblxuLy8gSGFsZiB3aWR0aCwgaGFsZiBoZWlnaHRcbnZhciBoVyA9IHBsYXllci53aWR0aCAvIDI7XG52YXIgaEggPSBwbGF5ZXIuaGVpZ2h0IC8gMjtcblxudmFyIHNwZWVkID0gMDsgLy8gVGhlIGN1cnJlbnQgc3BlZWRcbnZhciBkU3BlZWQ7XG52YXIgZFggPSAwLCBkWSA9IDA7XG5cbi8vIFlPVSBDQU4gQ09ORklHVVJFIFRIRVNFISAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxudmFyIGFjYyA9IDc7IC8vIEFjY2VsZXJhdGlvblxudmFyIGxpbSA9IDEwOyAvLyBTcGVlZCBsaW1pdFxudmFyIHR1cm5TcGVlZCA9IDIuMjtcbnZhciBncmF2ID0gMC4wMztcbi8vIE5PIE1PUkUgQ09ORklHVVJJTkchIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cblxucGxheWVyLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgZFggPSBkWSA9IHNwZWVkID0gZFNwZWVkID0gMDtcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHBsYXllckRlZmF1bHRzKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcGxheWVyW2tleXNbaV1dID0gcGxheWVyRGVmYXVsdHNba2V5c1tpXV07XG4gICAgfVxuICAgIHBsYXllci5tb3ZlKCk7XG59O1xucGxheWVyLmdyYXZpdHkgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgZFkgLT0gZ3Jhdjtcbn07XG5wbGF5ZXIubW92ZSA9IGZ1bmN0aW9uKGVsYXBzZWQsIGZseWluZykge1xuICAgIHBsYXllci5vZmZzZXRYID0gZFg7XG4gICAgcGxheWVyLm9mZnNldFkgPSAtZFk7XG4gICAgZFggKj0gMC45OTtcbiAgICBkWSAqPSAwLjk5O1xuXG4gICAgaWYgKCFmbHlpbmcpIHtcbiAgICAgICAgcGxheWVyLnN0YXRlID0gJ2lkbGUnO1xuICAgIH1cbn07XG5wbGF5ZXIudXAgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgcGxheWVyLmZ1ZWwgLT0gMC4yO1xuICAgIHBsYXllci5zdGF0ZSA9ICdmbHlpbmcnO1xuICAgIHNwZWVkICs9IGFjYztcbiAgICBkU3BlZWQgPSBlbGFwc2VkICogc3BlZWQ7XG4gICAgLy8gY29uc29sZS5sb2cocGxheWVyLngsIHBsYXllci55KTtcbiAgICAvLyBjb25zb2xlLmxvZyhNYXRoLnNpbihwbGF5ZXIuYW5nbGUpICogZFNwZWVkLCBNYXRoLmNvcyhwbGF5ZXIuYW5nbGUpICogZFNwZWVkKTtcbiAgICBkWCArPSBNYXRoLnNpbihwbGF5ZXIuYW5nbGUpICogZFNwZWVkO1xuICAgIGRZICs9IE1hdGguY29zKHBsYXllci5hbmdsZSkgKiBkU3BlZWQ7XG4gICAgcGxheWVyLm1vdmUoZWxhcHNlZCwgdHJ1ZSk7XG4gICAgaWYgKHNwZWVkID4gbGltKSB7XG4gICAgICAgIHNwZWVkID0gbGltO1xuICAgIH1cbiAgICBlbHNlIGlmIChzcGVlZCA8IC1saW0pIHtcbiAgICAgICAgc3BlZWQgPSAtbGltO1xuICAgIH1cblxufTtcbnBsYXllci5yaWdodCA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBwbGF5ZXIuYW5nbGUgKz0gZWxhcHNlZCAqIHR1cm5TcGVlZCAqIE1hdGguUEk7XG59O1xucGxheWVyLmxlZnQgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgcGxheWVyLmFuZ2xlIC09IGVsYXBzZWQgKiB0dXJuU3BlZWQgKiBNYXRoLlBJO1xufTtcbnBsYXllci5mbGlwID0gZnVuY3Rpb24oKSB7XG4gICAgcGxheWVyLmFuZ2xlICs9IE1hdGguUEk7XG59O1xuXG5cbnZhciB0aWNrcyA9IDA7XG5wbGF5ZXIuZHJhdyA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCkge1xuICAgIC8vIFBsYXllclxuICAgIGN0eC5zYXZlKCk7XG4gICAgY3R4LnRyYW5zbGF0ZShwbGF5ZXIueCArIGhXLCBwbGF5ZXIueSArIGhIKTtcbiAgICBjdHgucm90YXRlKHBsYXllci5hbmdsZSk7XG4gICAgLy8gcGxheWVyLmhpdCBpcyBzZXQgaW4gY29sbGlzaW9ucy5qc1xuICAgIC8vIElmIHRoZSBwbGF5ZXIncyBiZWVuIGhpdCwgd2Ugd2FudCBpdCB0byBmbGFzaCB3aGl0ZSB0byBpbmRpY2F0ZSB0aGF0XG4gICAgaWYgKHBsYXllci5oaXQpIHtcbiAgICAgICAgY3R4LmRyYXdJbWFnZSh3aGl0ZW4ocGxheWVyW3BsYXllci5zdGF0ZV0ubmFtZSksIC1oVywgLWhIKTtcbiAgICAgICAgdGlja3MrKztcbiAgICAgICAgaWYgKHRpY2tzID49IDQpIHtcbiAgICAgICAgICAgIHBsYXllci5oaXQgPSBmYWxzZTtcbiAgICAgICAgICAgIHRpY2tzID0gMDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY3R4LmRyYXdJbWFnZShwbGF5ZXJbcGxheWVyLnN0YXRlXSwgLWhXLCAtaEgpO1xuICAgIH1cbiAgICBjdHgucmVzdG9yZSgpO1xuXG59O1xuXG5wbGF5ZXIucmVzZXQoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBwbGF5ZXI7XG4iLCIvLyBIb2xkcyBsYXN0IGl0ZXJhdGlvbiB0aW1lc3RhbXAuXG52YXIgdGltZSA9IDA7XG5cbi8qKlxuICogQ2FsbHMgYGZuYCBvbiBuZXh0IGZyYW1lLlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiBUaGUgZnVuY3Rpb25cbiAqIEByZXR1cm4ge2ludH0gVGhlIHJlcXVlc3QgSURcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiByYWYoZm4pIHtcbiAgcmV0dXJuIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgdmFyIGVsYXBzZWQgPSBub3cgLSB0aW1lO1xuXG4gICAgaWYgKGVsYXBzZWQgPiA5OTkpIHtcbiAgICAgIGVsYXBzZWQgPSAxIC8gNjA7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsYXBzZWQgLz0gMTAwMDtcbiAgICB9XG5cbiAgICB0aW1lID0gbm93O1xuICAgIGZuKGVsYXBzZWQpO1xuICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIC8qKlxuICAgKiBDYWxscyBgZm5gIG9uIGV2ZXJ5IGZyYW1lIHdpdGggYGVsYXBzZWRgIHNldCB0byB0aGUgZWxhcHNlZFxuICAgKiB0aW1lIGluIG1pbGxpc2Vjb25kcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuIFRoZSBmdW5jdGlvblxuICAgKiBAcmV0dXJuIHtpbnR9IFRoZSByZXF1ZXN0IElEXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzdGFydDogZnVuY3Rpb24oZm4pIHtcbiAgICByZXR1cm4gcmFmKGZ1bmN0aW9uIHRpY2soZWxhcHNlZCkge1xuICAgICAgZm4oZWxhcHNlZCk7XG4gICAgICByYWYodGljayk7XG4gICAgfSk7XG4gIH0sXG4gIC8qKlxuICAgKiBDYW5jZWxzIHRoZSBzcGVjaWZpZWQgYW5pbWF0aW9uIGZyYW1lIHJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSB7aW50fSBpZCBUaGUgcmVxdWVzdCBJRFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgc3RvcDogZnVuY3Rpb24oaWQpIHtcbiAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoaWQpO1xuICB9XG59O1xuIiwidmFyIGNhbnZhcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNnYW1lJyk7XG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbnZhciBwb2xhcml0eSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpID4gMC41ID8gMSA6IC0xO1xufTtcblxuLy8gQW1vdW50IHdlJ3ZlIG1vdmVkIHNvIGZhclxudmFyIHRvdGFsWCA9IDA7XG52YXIgdG90YWxZID0gMDtcblxudmFyIHNoYWtlID0gZnVuY3Rpb24oaW50ZW5zaXR5KSB7XG4gICAgaWYgKCFpbnRlbnNpdHkpIHtcbiAgICAgICAgaW50ZW5zaXR5ID0gMjtcbiAgICB9XG4gICAgdmFyIGRYID0gTWF0aC5yYW5kb20oKSAqIGludGVuc2l0eSAqIHBvbGFyaXR5KCk7XG4gICAgdmFyIGRZID0gTWF0aC5yYW5kb20oKSAqIGludGVuc2l0eSAqIHBvbGFyaXR5KCk7XG4gICAgdG90YWxYICs9IGRYO1xuICAgIHRvdGFsWSArPSBkWTtcblxuICAgIC8vIEJyaW5nIHRoZSBzY3JlZW4gYmFjayB0byBpdHMgdXN1YWwgcG9zaXRpb24gZXZlcnkgXCIyIGludGVuc2l0eVwiIHNvIGFzIG5vdCB0byBnZXQgdG9vIGZhciBhd2F5IGZyb20gdGhlIGNlbnRlclxuICAgIGlmIChpbnRlbnNpdHkgJSAyIDwgMC4yKSB7XG4gICAgICAgIGN0eC50cmFuc2xhdGUoLXRvdGFsWCwgLXRvdGFsWSk7XG4gICAgICAgIHRvdGFsWCA9IHRvdGFsWSA9IDA7XG4gICAgICAgIGlmIChpbnRlbnNpdHkgPD0gMC4xNSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgY3R4LnRyYW5zbGF0ZShkWCwgZFkpO1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHNoYWtlKGludGVuc2l0eSAtIDAuMSk7XG4gICAgfSwgNSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHNoYWtlOyIsInZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnY2FudmFzJylbMF07XG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5tb2R1bGUuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uICh0ZXh0LCB4LCB5LCBwcmVGdW5jLCBzdHJva2Upe1xuICAgIGlmKHByZUZ1bmMpe1xuICAgICAgICBjdHguc2F2ZSgpO1xuICAgICAgICBwcmVGdW5jKGN0eCk7XG4gICAgfVxuXG4gICAgdmFyIHhQb3MgPSB4O1xuICAgIGlmKHggPT09ICdjZW50ZXInKXtcbiAgICAgICAgeFBvcyA9IChjYW52YXMud2lkdGggLSBjdHgubWVhc3VyZVRleHQodGV4dCkud2lkdGgpIC8gMjtcbiAgICB9XG5cbiAgICBpZihzdHJva2Upe1xuICAgICAgICBjdHguc3Ryb2tlVGV4dCh0ZXh0LCB4UG9zLCB5KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGN0eC5maWxsVGV4dCh0ZXh0LCB4UG9zLCB5KTtcbiAgICB9XG5cbiAgICBpZihwcmVGdW5jKXtcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICB9XG59OyIsIi8vIHVmb3MuanNcbi8vIFRoaXMgZmlsZSBkZWZpbmVzIGJlaGF2aW9yIGZvciBhbGwgdGhlIHVuaWRlbnRpZmllZCBmbHlpbmcgb2JqZWN0c1xuLy8gSSBndWVzcyB0aGV5ICphcmUqIGlkZW50aWZpZWQsIHRlY2huaWNhbGx5LlxuLy8gQnV0IHVmb3MuanMgaXMgY29vbGVyIHRoYW4gaWZvcy5qc1xuLy8gQXN0ZXJvaWRzIGFuZCBoZWFsdGggLyBmdWVsIHBpY2t1cHMgY291bnQgYXMgVUZPc1xuXG52YXIgZmx5aW5nT2JqZWN0cyA9IFtdO1xuXG52YXIgbG9hZGVyID0gcmVxdWlyZSgnLi9sb2FkZXIuanMnKTtcblxudmFyIHJuZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpO1xufTtcbnZhciBjaG9vc2UgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXJndW1lbnRzW01hdGguZmxvb3Iocm5kKCkgKiBhcmd1bWVudHMubGVuZ3RoKV07XG59O1xuXG52YXIgU1BBV05fUkFOR0UgPSAxMDA7XG52YXIgTUlOX1NQRUVEID0gMC4zLCBNQVhfU1BFRUQgPSAyO1xudmFyIFdJRFRIID0gODAwLCBIRUlHSFQgPSA2MDA7XG5cbnZhciBzcGF3biA9IGZ1bmN0aW9uKG4pIHtcbiAgICAvLyBjb25zb2xlLmxvZygnU3Bhd25lZCBmbHlpbmdPYmplY3RzOicsIG4pO1xuICAgIHZhciBvYmosIHRhcmdldFksIHRhcmdldFg7XG4gICAgdmFyIHNpZ25YLCBzaWduWSwgcG9zWCwgcG9zWTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICBvYmogPSB7XG4gICAgICAgICAgICB4OiAocm5kKCkgKiBXSURUSCksXG4gICAgICAgICAgICB5OiAocm5kKCkgKiBIRUlHSFQpLFxuICAgICAgICAgICAgc3BlZWQ6IHJuZCgpICogKE1BWF9TUEVFRCAtIE1JTl9TUEVFRCkgKyBNSU5fU1BFRUQsXG4gICAgICAgICAgICBpbWFnZTogY2hvb3NlLmFwcGx5KHRoaXMsIGxvYWRlci5nZXQoJ3JvY2snKS5jb25jYXQobG9hZGVyLmdldCgncG93ZXItaWNvbicpKSksXG4gICAgICAgICAgICBhbGl2ZTogdHJ1ZVxuICAgICAgICB9O1xuICAgICAgICB0YXJnZXRZID0gcm5kKCkgKiBXSURUSDtcbiAgICAgICAgdGFyZ2V0WCA9IHJuZCgpICogSEVJR0hUO1xuICAgICAgICBvYmouYW5nbGUgPSBybmQoKSAqIE1hdGguUEkgKiAyO1xuICAgICAgICBvYmouZ29vZCA9IG9iai5pbWFnZS5pbmRleE9mKCdyb2NrJykgPj0gMCA/IGZhbHNlIDogdHJ1ZTtcbiAgICAgICAgb2JqLndpZHRoID0gbG9hZGVyLmltYWdlc1tvYmouaW1hZ2VdLndpZHRoO1xuICAgICAgICBvYmouaGVpZ2h0ID0gbG9hZGVyLmltYWdlc1tvYmouaW1hZ2VdLmhlaWdodDtcbiAgICAgICAgb2JqLmR4ID0gTWF0aC5jb3Mob2JqLmFuZ2xlKSAqIG9iai5zcGVlZDtcbiAgICAgICAgb2JqLmR5ID0gTWF0aC5zaW4ob2JqLmFuZ2xlKSAqIG9iai5zcGVlZDtcblxuICAgICAgICBpZiAoIW9iai5nb29kKSB7XG4gICAgICAgICAgICBvYmouY29sb3IgPSBvYmouaW1hZ2UuaW5kZXhPZignYWx0JykgPCAwID8gJyNhYWFhYWEnIDogJyNhNzgyNTgnO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJuZCgpID4gMC41KSB7XG4gICAgICAgICAgICBvYmoueCArPSBjaG9vc2UoLTEsIDEpICogKFdJRFRIICsgb2JqLndpZHRoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG9iai55ICs9IGNob29zZSgtMSwgMSkgKiAoSEVJR0hUICsgb2JqLmhlaWdodCk7XG4gICAgICAgIH1cbiAgICAgICAgZmx5aW5nT2JqZWN0cy5wdXNoKG9iaik7XG4gICAgfVxufTtcblxudmFyIGxvb3AgPSBmdW5jdGlvbihlbGFwc2VkLCBjdHgsIG9mZnNldFgsIG9mZnNldFkpIHtcbiAgICB2YXIgb2JqO1xuICAgIGZvciAodmFyIGkgPSBmbHlpbmdPYmplY3RzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIG9iaiA9IGZseWluZ09iamVjdHNbaV07XG4gICAgICAgIGlmIChvYmouYWxpdmUpIHtcbiAgICAgICAgICAgIG9iai54ICs9IG9iai5keCAtIG9mZnNldFg7XG4gICAgICAgICAgICBvYmoueSArPSBvYmouZHkgLSBvZmZzZXRZO1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICdyZWQnO1xuICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShsb2FkZXIuaW1hZ2VzW29iai5pbWFnZV0sIG9iai54LCBvYmoueSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBmbHlpbmdPYmplY3RzLnNwbGljZShpLCAxKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbG9vcDogbG9vcCxcbiAgICBhcnJheTogZmx5aW5nT2JqZWN0cyxcbiAgICBzcGF3bjogc3Bhd24sXG4gICAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBmbHlpbmdPYmplY3RzLmxlbmd0aCA9IDA7XG4gICAgfVxufTsiLCJ2YXIgbG9hZGVyID0gcmVxdWlyZSgnLi9sb2FkZXInKTtcbnZhciBpbWFnZXMgPSBsb2FkZXIuaW1hZ2VzO1xuXG52YXIgY2FjaGUgPSB7fTtcbnZhciB3aGl0ZW4gPSBmdW5jdGlvbihpbWdOYW1lKSB7XG4gICAgaWYgKGNhY2hlW2ltZ05hbWVdKSB7XG4gICAgICAgIHJldHVybiBjYWNoZVtpbWdOYW1lXTtcbiAgICB9XG4gICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgIHZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICB2YXIgaW1nID0gaW1hZ2VzW2ltZ05hbWVdO1xuXG4gICAgY2FudmFzLndpZHRoID0gaW1nLndpZHRoO1xuICAgIGNhbnZhcy5oZWlnaHQgPSBpbWcuaGVpZ2h0O1xuICAgIGN0eC5kcmF3SW1hZ2UoaW1nLCAwLCAwLCBpbWcud2lkdGgsIGltZy5oZWlnaHQpO1xuICAgIGN0eC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSAnc291cmNlLWF0b3AnO1xuICAgIGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuICAgIGN0eC5maWxsUmVjdCgwLCAwLCBpbWcud2lkdGgsIGltZy5oZWlnaHQpO1xuICAgIGNhY2hlW2ltZ05hbWVdID0gY2FudmFzO1xuICAgIHJldHVybiBjYW52YXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHdoaXRlbjsiXX0=
