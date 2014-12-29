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
    console.log(images, imgName);

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4vc3JjL21haW4iLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9hdWRpby5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL2NvbGxpc2lvbnMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9rZXlzLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvbG9hZGVyLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvbWVudXMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9wYXJ0aWNsZXMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9wbGF5ZXIuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9yYWYuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9zY3JlZW5zaGFrZS5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL3RleHQuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy91Zm9zLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvd2hpdGVuLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgbG9hZGVyID0gcmVxdWlyZSgnLi9sb2FkZXIuanMnKTtcblxudmFyIHJhZiA9IHJlcXVpcmUoJy4vcmFmJyk7XG52YXIgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcbnZhciBrZXkgPSByZXF1aXJlKCcuL2tleXMnKTtcbnZhciBwYXJ0aWNsZXMgPSByZXF1aXJlKCcuL3BhcnRpY2xlcycpO1xudmFyIGZseWluZ09iamVjdHMgPSByZXF1aXJlKCcuL3Vmb3MnKTtcbnZhciBjb2xsaXNpb25zID0gcmVxdWlyZSgnLi9jb2xsaXNpb25zJyk7XG52YXIgbWVudXMgPSByZXF1aXJlKCcuL21lbnVzJyk7XG52YXIgYXVkaW8gPSByZXF1aXJlKCcuL2F1ZGlvJyk7XG5cbnZhciBjYW52YXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZ2FtZScpO1xudmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG52YXIgc2Z4ID0gWydjb2xsZWN0JywgJ2NvbGxpZGUnLCAnZXhwbG9kZV9tZXRlb3InLCAnamV0cGFjayddO1xubG9hZGVyLmRvbmUoZnVuY3Rpb24oKSB7XG4gICAgYXVkaW8ubXV0ZSgpOyAvLyBCZWNhdXNlIEkgZG9uJ3Qgd2FudCBpdCBhdXRvcGxheWluZyB3aGlsZSBJIGRldmVsb3AgaXQhXG5cbiAgICB3aW5kb3cuc3RhdGUgPSAnbWVudSc7XG4gICAgcmFmLnN0YXJ0KGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICAgICAgaWYgKHdpbmRvdy5zdGF0ZSA9PT0gJ21lbnUnKSB7XG4gICAgICAgICAgICBtZW51cy5kcmF3TWVudShjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHdpbmRvdy5zdGF0ZSA9PT0gJ2dhbWUnKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZ3Jhdml0eShlbGFwc2VkKTtcbiAgICAgICAgICAgIGlmIChrZXkudXAoKSAmJiBwbGF5ZXIuZnVlbCA+IDApIHtcbiAgICAgICAgICAgICAgICBhdWRpby5wbGF5KCdqZXRwYWNrJyk7XG4gICAgICAgICAgICAgICAgcGxheWVyLnVwKGVsYXBzZWQpO1xuICAgICAgICAgICAgICAgIHBhcnRpY2xlcy5jcmVhdGVQYXJ0aWNsZXMocGxheWVyLnggKyBwbGF5ZXIud2lkdGggLyAyLCBwbGF5ZXIueSArIHBsYXllci5oZWlnaHQgLyAyLCAxMCwgMC4xLCAxMCwge1xuICAgICAgICAgICAgICAgICAgICByYW5nZTogTWF0aC5QSSAvIDEwXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGF1ZGlvLnBhdXNlKCdqZXRwYWNrJyk7XG4gICAgICAgICAgICAgICAgcGxheWVyLm1vdmUoZWxhcHNlZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChrZXkucmlnaHQoKSkge1xuICAgICAgICAgICAgICAgIHBsYXllci5yaWdodChlbGFwc2VkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChrZXkubGVmdCgpKSB7XG4gICAgICAgICAgICAgICAgcGxheWVyLmxlZnQoZWxhcHNlZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRoaXMgZnVuY3Rpb24gY2hlY2tzIGZvciBhbGwgcmVxdWlyZWQgY29sbGlzaW9ucywgYW5kIGNhbGxzIHRoZSBjb3JyZXNwb25kaW5nIGZ1bmN0aW9ucyBhZnRlciB0b29cbiAgICAgICAgICAgIGNvbGxpc2lvbnMuY2hlY2socGxheWVyLCBmbHlpbmdPYmplY3RzKTtcblxuICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIHNjcmVlblxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICcjMGYwZDIwJztcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCA4MDAsIDYwMCk7XG5cbiAgICAgICAgICAgIGZseWluZ09iamVjdHMubG9vcChlbGFwc2VkLCBjdHgsIHBsYXllci5vZmZzZXRYLCBwbGF5ZXIub2Zmc2V0WSk7XG4gICAgICAgICAgICBwYXJ0aWNsZXMuZHJhdyhlbGFwc2VkLCBjdHgsIHBsYXllcik7XG4gICAgICAgICAgICBwbGF5ZXIuZHJhdyhlbGFwc2VkLCBjdHgpO1xuICAgICAgICAgICAgbWVudXMuaW5nYW1lKGN0eCwgcGxheWVyLmZ1ZWwsIHBsYXllci5oZWFsdGgsIHBsYXllci5zY29yZSk7XG5cbiAgICAgICAgICAgIHBsYXllci5zY29yZSArPSAwLjE7XG5cbiAgICAgICAgICAgIGlmIChwbGF5ZXIuaGVhbHRoIDw9IDApIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cuc3RhdGUgPSAnZW5kJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh3aW5kb3cuc3RhdGUgPT09ICdlbmQnKSB7XG4gICAgICAgICAgICBhdWRpby5wYXVzZShzZngpO1xuICAgICAgICAgICAgbWVudXMuZHJhd0VuZChjdHgsIHBsYXllci5zY29yZSk7XG4gICAgICAgIH1cblxuICAgIH0pO1xufSk7XG5cbnZhciBjaGFuZ2VTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh3aW5kb3cuc3RhdGUgPT09ICdtZW51Jykge1xuICAgICAgICB3aW5kb3cuc3RhdGUgPSAnZ2FtZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHdpbmRvdy5zdGF0ZSA9PT0gJ2VuZCcpIHtcbiAgICAgICAgd2luZG93LnN0YXRlID0gJ2dhbWUnO1xuICAgICAgICBwbGF5ZXIuc2NvcmUgPSAwO1xuICAgICAgICBwbGF5ZXIucmVzZXQoKTtcbiAgICAgICAgcGFydGljbGVzLnJlc2V0KCk7XG4gICAgICAgIGZseWluZ09iamVjdHMucmVzZXQoKTtcbiAgICB9XG59O1xuXG5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjaGFuZ2VTdGF0ZSwgZmFsc2UpO1xuZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZSkge1xuICAgIGlmIChlLmtleUNvZGUgPT09IDEzKSB7XG4gICAgICAgIGNoYW5nZVN0YXRlKCk7XG4gICAgfVxufSwgZmFsc2UpO1xuIiwidmFyIGF1ZGlvID0gd2luZG93LmF1ZGlvID0ge307IC8vIE1hZGUgaXQgYSBnbG9iYWwgc28gSSBjYW4gZWFzaWx5IHRlc3RcbnZhciBlbGVtZW50cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2F1ZGlvJyk7XG52YXIgRkFERV9TUEVFRCA9IDAuMTtcblxuYXVkaW8ubXV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGVsZW1lbnRzW2ldLnZvbHVtZSA9IDA7XG4gICAgfVxufTtcbmF1ZGlvLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBlbGVtZW50c1tpXS5wYXVzZSgpO1xuICAgIH1cbn07XG5cbmF1ZGlvLnBsYXkgPSBmdW5jdGlvbiAobmFtZSwgc2Vla0Zyb20pIHtcbiAgICB2YXIgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG5hbWUpO1xuICAgIGVsZW0uY3VycmVudFRpbWUgPSBzZWVrRnJvbSB8fCAwO1xuICAgIGVsZW0ucGxheSgpO1xufTtcbmF1ZGlvLnBhdXNlID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHZhciBuYW1lcyA9IFtuYW1lXTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIG5hbWVzID0gbmFtZTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG5hbWVzW2ldKTtcbiAgICAgICAgZWxlbS5wYXVzZSgpO1xuICAgIH1cbiAgICBcbn07XG5cbmF1ZGlvLmZhZGVvdXQgPSBmdW5jdGlvbiAobmFtZSwgc2Vla0Zyb20sIGNiKSB7XG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChuYW1lKTtcbiAgICB2YXIgdm9sdW1lID0gZWxlbS52b2x1bWU7XG4gICAgdmFyIGRlY3JlYXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2b2x1bWUgLT0gRkFERV9TUEVFRDtcbiAgICAgICAgY29uc29sZS5sb2codm9sdW1lKTtcbiAgICAgICAgaWYgKHZvbHVtZSA8PSAwKSB7XG4gICAgICAgICAgICBlbGVtLnZvbHVtZSA9IDA7XG4gICAgICAgICAgICBlbGVtLnBhdXNlKCk7XG4gICAgICAgICAgICBjYiAmJiBjYihlbGVtKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGVsZW0udm9sdW1lID0gdm9sdW1lO1xuICAgICAgICAgICAgc2V0VGltZW91dChkZWNyZWFzZSwgMTAwLzMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBkZWNyZWFzZSgpO1xufVxuYXVkaW8uZmFkZWluID0gZnVuY3Rpb24gKG5hbWUsIHNlZWtGcm9tLCBjYikge1xuICAgIHZhciBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobmFtZSk7XG4gICAgdmFyIHZvbHVtZSA9IGVsZW0udm9sdW1lID0gMDtcbiAgICBlbGVtLnBsYXkoKTtcbiAgICB2YXIgaW5jcmVhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZvbHVtZSArPSBGQURFX1NQRUVEO1xuICAgICAgICBpZiAodm9sdW1lID49IDEpIHtcbiAgICAgICAgICAgIGVsZW0udm9sdW1lID0gMTtcbiAgICAgICAgICAgIGNiICYmIGNiKGVsZW0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZWxlbS52b2x1bWUgPSB2b2x1bWU7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGluY3JlYXNlLCAxMDAvMyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGluY3JlYXNlKCk7XG59XG5tb2R1bGUuZXhwb3J0cyA9IGF1ZGlvOyIsInZhciBwYXJ0aWNsZXNNb2R1bGUgPSByZXF1aXJlKCcuL3BhcnRpY2xlcycpO1xudmFyIHNoYWtlID0gcmVxdWlyZSgnLi9zY3JlZW5zaGFrZScpO1xuXG52YXIgcGxheWVySGl0Qm94ID0ge1xuICAgIHg6IDM3NSxcbiAgICB5OiAyNzAsXG4gICAgd2lkdGg6IDUwLFxuICAgIGhlaWdodDogNjBcbn07XG52YXIgYW5nbGVkQ29sbGlzaW9uID0gZnVuY3Rpb24ocGxheWVyLCBmbykge1xuICAgIHZhciBjb2xsaWRpbmcgPSBmYWxzZTtcbiAgICBjb2xsaWRpbmcgPSBhYWJiKHBsYXllckhpdEJveCwgZm8pO1xuICAgIHJldHVybiBjb2xsaWRpbmc7XG59O1xuXG52YXIgYWFiYiA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICBpZiAoXG4gICAgICAgIE1hdGguYWJzKGEueCArIGEud2lkdGggLyAyIC0gYi54IC0gYi53aWR0aCAvIDIpID4gKGEud2lkdGggKyBiLndpZHRoKSAvIDIgfHxcbiAgICAgICAgTWF0aC5hYnMoYS55ICsgYS5oZWlnaHQgLyAyIC0gYi55IC0gYi5oZWlnaHQgLyAyKSA+IChhLmhlaWdodCArIGIuaGVpZ2h0KSAvIDJcbiAgICApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbnZhciBpbkFyZWEgPSBmdW5jdGlvbihhcmVhLCBhcnJheSwgcmVzcENvbGxpZGluZywgcmVzcE5vdENvbGxpZGluZykge1xuICAgIHZhciByZXQgPSBbXTtcbiAgICB2YXIgY3VyRWxlbTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGN1ckVsZW0gPSBhcnJheVtpXTtcbiAgICAgICAgaWYgKGFhYmIoYXJlYSwgY3VyRWxlbSkpIHtcbiAgICAgICAgICAgIHJldC5wdXNoKGN1ckVsZW0pO1xuICAgICAgICAgICAgaWYgKHJlc3BDb2xsaWRpbmcpIHtcbiAgICAgICAgICAgICAgICByZXNwQ29sbGlkaW5nKGN1ckVsZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHJlc3BOb3RDb2xsaWRpbmcpIHtcbiAgICAgICAgICAgIHJlc3BOb3RDb2xsaWRpbmcoY3VyRWxlbSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbnZhciBwbGF5ZXJBcmVhID0ge1xuICAgIHg6IDMyNSxcbiAgICB5OiAyMjUsXG4gICAgd2lkdGg6IDE1MCxcbiAgICBoZWlnaHQ6IDE1MFxufTtcblxudmFyIGNhbWVyYSA9IHtcbiAgICB4OiAtNDAwLFxuICAgIHk6IC0zMDAsXG4gICAgd2lkdGg6IDE2MDAsXG4gICAgaGVpZ2h0OiAxMjAwXG59O1xuXG52YXIgZXhwbG9kZU9iaiA9IGZ1bmN0aW9uKGZvKSB7XG4gICAgcGFydGljbGVzTW9kdWxlLmNyZWF0ZVBhcnRpY2xlcyhmby54LCBmby55LCBmby5zcGVlZCwgMC4wMSwgZm8ud2lkdGggKiBmby5oZWlnaHQgLyAxMDAsIHtcbiAgICAgICAgcmFuZ2U6IE1hdGgucmFuZG9tKCkgKiAyICogTWF0aC5QSSxcbiAgICAgICAgbm9Db2xsaWRlOiB0cnVlLFxuICAgICAgICBkeDogZm8uZHgsXG4gICAgICAgIGR5OiBmby5keSxcbiAgICAgICAgY29sb3I6IGZvLmNvbG9yXG4gICAgfSk7XG59O1xuXG52YXIgY2hlY2sgPSBmdW5jdGlvbihwbGF5ZXIsIGZvTW9kdWxlKSB7XG4gICAgLy8gZm8gc3RhbmRzIGZvciBmbHlpbmdPYmplY3RzXG4gICAgdmFyIHBhcnRpY2xlcyA9IHBhcnRpY2xlc01vZHVsZS5hcnJheTtcbiAgICB2YXIgZm9zID0gZm9Nb2R1bGUuYXJyYXk7XG4gICAgLy8gTWFuYWdlIGZseWluZyBvYmplY3Qgc3Bhd25pbmdcbiAgICB2YXIgZm9JblZpZXcgPSBpbkFyZWEoY2FtZXJhLCBmb3MsIHVuZGVmaW5lZCwgZnVuY3Rpb24oZm8pIHtcbiAgICAgICAgZm8uYWxpdmUgPSBmYWxzZTtcbiAgICB9KTtcbiAgICBpZiAoZm9JblZpZXcubGVuZ3RoIDwgMzApIHtcbiAgICAgICAgZm9Nb2R1bGUuc3Bhd24oTWF0aC5yYW5kb20oKSAqIDEwMCk7XG4gICAgfVxuXG4gICAgLy8gQ29sbGlzaW9ucyBiZXR3ZWVuIHRoZSBwbGF5ZXIgYW5kIHJvY2tzXG4gICAgdmFyIGZvVG9UZXN0ID0gaW5BcmVhKHBsYXllckFyZWEsIGZvcyk7XG4gICAgdmFyIGZvO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZm9Ub1Rlc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZm8gPSBmb1RvVGVzdFtpXTtcbiAgICAgICAgaWYgKGFuZ2xlZENvbGxpc2lvbihwbGF5ZXIsIGZvKSkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ0hJVCcpO1xuICAgICAgICAgICAgZm8uYWxpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChmby5pbWFnZSA9PT0gJ3Bvd2VyLWljb24ucG5nJykge1xuICAgICAgICAgICAgICAgIGF1ZGlvLnBsYXkoJ2NvbGxlY3QnKTtcbiAgICAgICAgICAgICAgICBwbGF5ZXIuZnVlbCArPSAxMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGF1ZGlvLnBsYXkoJ2NvbGxpZGUnKTtcbiAgICAgICAgICAgICAgICBwbGF5ZXIuaGl0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBwbGF5ZXIuaGVhbHRoIC09IChmby53aWR0aCAqIGZvLmhlaWdodCkgLyAxMDA7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0NvbGxpc2lvbiBwYXJ0aWNsZXMnKTtcbiAgICAgICAgICAgICAgICBleHBsb2RlT2JqKGZvKTtcbiAgICAgICAgICAgICAgICBzaGFrZSg1KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciBjb2xsaXNpb25zIGJldHdlZW4gcGFydGljbGVzIGFuZCBmb1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydGljbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChwYXJ0aWNsZXNbaV0ubm9Db2xsaWRlKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpbkFyZWEocGFydGljbGVzW2ldLCBmb3MsIGZ1bmN0aW9uKGZvKSB7XG4gICAgICAgICAgICBpZiAocGFydGljbGVzW2ldLmFsaXZlICYmICFmby5nb29kKSB7XG4gICAgICAgICAgICAgICAgZm8uYWxpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBhdWRpby5wbGF5KCdleHBsb2RlX21ldGVvcicpO1xuICAgICAgICAgICAgICAgIHBsYXllci5zY29yZSArPSAoZm8ud2lkdGggKiBmby5oZWlnaHQpIC8gMTAwO1xuICAgICAgICAgICAgICAgIGV4cGxvZGVPYmooZm8pO1xuICAgICAgICAgICAgICAgIHNoYWtlKDIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjaGVjazogY2hlY2tcbn07IiwidmFyIHBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyJyk7XG52YXIga2V5cyA9IHt9O1xudmFyIEMgPSB7XG4gICAgU1BBQ0U6IDMyLFxuICAgIExFRlQ6IDM3LFxuICAgIFVQOiAzOCxcbiAgICBSSUdIVDogMzksXG4gICAgRE9XTjogNDBcbn1cbmRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAoZS5rZXlDb2RlID09PSBDLlNQQUNFKSB7XG4gICAgICAgIHBsYXllci5mbGlwKCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZS5rZXlDb2RlID49IDM3ICYmIGUua2V5Q29kZSA8PSA0MCkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuICAgIGtleXNbZS5rZXlDb2RlXSA9IHRydWU7XG59KTtcbmRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdGlvbihlKSB7XG4gICAga2V5c1tlLmtleUNvZGVdID0gZmFsc2U7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbGVmdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzW0MuTEVGVF07XG4gICAgfSxcbiAgICB1cDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzW0MuVVBdO1xuICAgIH0sXG4gICAgcmlnaHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1tDLlJJR0hUXTtcbiAgICB9LFxuICAgIGRvd246IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1tDLkRPV05dO1xuICAgIH0sXG4gICAgZmxpcDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzW0MuU1BBQ0VdO1xuICAgIH1cbn07XG4iLCJ2YXIgaW1hZ2VOYW1lcyA9IFtcbiAgICAnYXN0cm8ucG5nJyxcbiAgICAnYXN0cm8tZmx5aW5nLnBuZycsXG4gICAgJ2hlYWx0aC1iYXItaWNvbi5wbmcnLFxuICAgICdsb2dvLnBuZycsXG4gICAgJ3Bvd2VyLWJhci1pY29uLnBuZycsXG4gICAgJ3Bvd2VyLWljb24ucG5nJyxcbiAgICAncm9jay01LnBuZycsXG4gICAgJ3JvY2stYWx0LTUucG5nJyxcbiAgICAncm9jay1vZGQtMS5wbmcnLFxuICAgICdyb2NrLW9kZC0zLnBuZycsXG4gICAgJ3RleHQtY3JlZGl0cy5wbmcnLFxuICAgICd0ZXh0LXBsYXkucG5nJ1xuXTtcblxudmFyIGltYWdlcyA9IHt9O1xudmFyIGxvYWRlZCA9IDA7XG52YXIgZG9uZSA9IGZ1bmN0aW9uKGNiKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbWFnZU5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGltYWdlc1tpbWFnZU5hbWVzW2ldXSA9IG5ldyBJbWFnZSgpO1xuICAgICAgICBpbWFnZXNbaW1hZ2VOYW1lc1tpXV0uc3JjID0gJ2ltYWdlcy8nICsgaW1hZ2VOYW1lc1tpXTtcbiAgICAgICAgaW1hZ2VzW2ltYWdlTmFtZXNbaV1dLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgbG9hZGVkKys7XG4gICAgICAgICAgICBpZiAobG9hZGVkID09PSBpbWFnZU5hbWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNiKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBsaXN0OiBpbWFnZU5hbWVzLFxuICAgIGltYWdlczogaW1hZ2VzLFxuICAgIGRvbmU6IGRvbmUsXG4gICAgZ2V0OiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgaW1hZ2VOYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKGltYWdlTmFtZXNbaV0uaW5kZXhPZihzdHJpbmcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHJldC5wdXNoKGltYWdlTmFtZXNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxufTsiLCJ2YXIgbG9hZGVyID0gcmVxdWlyZSgnLi9sb2FkZXIuanMnKTtcbnZhciB0ZXh0ID0gcmVxdWlyZSgnLi90ZXh0LmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGRyYXdNZW51OiBmdW5jdGlvbihjdHgpIHtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICcjMGYwZDIwJztcbiAgICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIDgwMCwgNjAwKTtcblxuICAgICAgICBjdHguZHJhd0ltYWdlKGxvYWRlci5pbWFnZXNbJ2xvZ28ucG5nJ10sIDMxNCwgMTgwKTtcbiAgICAgICAgY3R4LmRyYXdJbWFnZShsb2FkZXIuaW1hZ2VzWyd0ZXh0LXBsYXkucG5nJ10sIDMzMywgMzAwKTtcbiAgICAgICAgY3R4LmRyYXdJbWFnZShsb2FkZXIuaW1hZ2VzWyd0ZXh0LWNyZWRpdHMucG5nJ10sIDI4NywgNTAwKTtcbiAgICB9LFxuICAgIGRyYXdFbmQ6IGZ1bmN0aW9uKGN0eCwgc2NvcmUpIHtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICcjMGYwZDIwJztcbiAgICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIDgwMCwgNjAwKTtcbiAgICAgICAgdGV4dC53cml0ZSgnVGhlIGVuZCEgWW91IHNjb3JlZCAnICsgTWF0aC5yb3VuZChzY29yZSkgKyAnIHBvaW50cyEnLCAnY2VudGVyJywgMzAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuICAgICAgICAgICAgY3R4LmZvbnQgPSAnMzJwdCBBcmlhbCc7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZXh0LndyaXRlKCdDbGljayB0byBwbGF5IGFnYWluJywgJ2NlbnRlcicsIDUwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgICAgIGN0eC5mb250ID0gJzIycHQgQXJpYWwnO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGluZ2FtZTogZnVuY3Rpb24gKGN0eCwgZnVlbCwgaGVhbHRoLCBzY29yZSkge1xuICAgICAgICBjdHguZHJhd0ltYWdlKGxvYWRlci5pbWFnZXNbJ3Bvd2VyLWJhci1pY29uLnBuZyddLCAzMCwgNTAwKTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICdvcmFuZ2UnO1xuICAgICAgICBjdHguZmlsbFJlY3QoMzAsIDQ5MCAtIGZ1ZWwsIDIwLCBmdWVsKTtcblxuXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1snaGVhbHRoLWJhci1pY29uLnBuZyddLCA3MCwgNTAwKTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICdyZWQnO1xuICAgICAgICBjdHguZmlsbFJlY3QoNzAsIDQ5MCAtIGhlYWx0aCwgMjAsIGhlYWx0aCk7XG5cbiAgICAgICAgY3R4LmZvbnQgPSAnMTJwdCBBcmlhbCc7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuICAgICAgICBjdHguZmlsbFRleHQoJ1Njb3JlOiAnICsgTWF0aC5yb3VuZChzY29yZSksIDI3LCA1NTApO1xuICAgIH1cbn07IiwidmFyIHBhcnRpY2xlcyA9IFtdO1xudmFyIFcgPSA3LCBIID0gNztcbnZhciBERUNfUkFURSA9IDAuMTsgLy8gRGVmYXVsdCBkZWNyZWFzZSByYXRlLiBIaWdoZXIgcmF0ZSAtPiBwYXJ0aWNsZXMgZ28gZmFzdGVyXG52YXIgUGFydGljbGUgPSBmdW5jdGlvbih4LCB5LCBzcGVlZCwgZGVjUmF0ZSkge1xuICAgIHRoaXMuYWxpdmUgPSB0cnVlO1xuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgICB0aGlzLmR4ID0gdGhpcy5keSA9IDA7XG4gICAgdGhpcy53aWR0aCA9IFc7XG4gICAgdGhpcy5oZWlnaHQgPSBIO1xuICAgIHRoaXMuYW5nbGUgPSAwO1xuICAgIHRoaXMuc3BlZWQgPSBzcGVlZDtcbiAgICB0aGlzLm9wYWNpdHkgPSAxO1xuICAgIHRoaXMuZGVjUmF0ZSA9IGRlY1JhdGUgfHwgREVDX1JBVEU7XG4gICAgdGhpcy5kZWxheSA9IE1hdGguY2VpbChNYXRoLnJhbmRvbSgpICogMTApO1xuICAgIHRoaXMubG9vcCA9IGZ1bmN0aW9uKGN0eCwgcGxheWVyKSB7XG4gICAgICAgIGlmICh0aGlzLmRlbGF5ID4gMCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGVsYXkgPD0gMSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYW5nbGUgPSBwbGF5ZXIuYW5nbGUgLSB0aGlzLnJhbmdlICsgKE1hdGgucmFuZG9tKCkgKiAyICogdGhpcy5yYW5nZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmRlbGF5LS07XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy54ICs9IHRoaXMuZHggLSB3aW5kb3cucGxheWVyLm9mZnNldFggKyBNYXRoLnNpbigtdGhpcy5hbmdsZSkgKiBzcGVlZDtcbiAgICAgICAgdGhpcy55ICs9IHRoaXMuZHkgLSB3aW5kb3cucGxheWVyLm9mZnNldFkgKyBNYXRoLmNvcygtdGhpcy5hbmdsZSkgKiBzcGVlZDtcbiAgICAgICAgdGhpcy5vcGFjaXR5IC09IHRoaXMuZGVjUmF0ZTtcbiAgICAgICAgaWYgKHRoaXMub3BhY2l0eSA8PSAwKSB7XG4gICAgICAgICAgICB0aGlzLm9wYWNpdHkgPSAwO1xuICAgICAgICAgICAgdGhpcy5hbGl2ZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vIERyYXdcbiAgICAgICAgY3R4LnNhdmUoKTtcbiAgICAgICAgY3R4Lmdsb2JhbEFscGhhID0gdGhpcy5vcGFjaXR5O1xuICAgICAgICBjdHgudHJhbnNsYXRlKHRoaXMueCwgdGhpcy55KTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuY29sb3IgfHwgJ3JlZCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCBXLCBIKTtcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICB9O1xufTtcblxuLy8geCwgeSBhcmUgZml4ZWRcbi8vIFBhcnRpY2xlcyBhcmUgY3JlYXRlZCBmcm9tIGFuZ2xlLXJhbmdlIHRvIGFuZ2xlK3JhbmdlXG4vLyBzcGVlZCBpcyBmaXhlZFxudmFyIGFuZ2xlID0gMDtcbnZhciBjcmVhdGVQYXJ0aWNsZXMgPSBmdW5jdGlvbih4LCB5LCBzcGVlZCwgZGVjUmF0ZSwgbiwgcHJvcHMpIHtcbiAgICAvLyBjb25zb2xlLmxvZygnQ3JlYXRpbmcnLCBwYXJ0aWNsZXMpO1xuICAgIHZhciBjcmVhdGVkID0gMCwgaSA9IDA7XG4gICAgdmFyIHBhcnRpY2xlO1xuICAgIHdoaWxlKGNyZWF0ZWQgPCBuKSB7XG4gICAgICAgIHBhcnRpY2xlID0gcGFydGljbGVzW2ldO1xuICAgICAgICBpZiAocGFydGljbGUgJiYgIXBhcnRpY2xlLmFsaXZlIHx8ICFwYXJ0aWNsZSkge1xuICAgICAgICAgICAgcGFydGljbGVzW2ldID0gbmV3IFBhcnRpY2xlKHgsIHksIHNwZWVkLCBkZWNSYXRlKTtcbiAgICAgICAgICAgIGNyZWF0ZWQrKztcbiAgICAgICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMocHJvcHMpO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBrZXlzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgcGFydGljbGVzW2ldW2tleXNbal1dID0gcHJvcHNba2V5c1tqXV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBQb3NzaWJsZSBwcm9wczogcmFuZ2UsIG5vQ29sbGlkZSwgZHgsIGR5XG4gICAgICAgIH1cbiAgICAgICAgaSsrO1xuICAgIH1cbn07XG5cbnZhciBkcmF3ID0gZnVuY3Rpb24oZWxhcHNlZCwgY3R4LCBwbGF5ZXIpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRpY2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBwYXJ0aWNsZXNbaV0ubG9vcChjdHgsIHBsYXllcik7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY3JlYXRlUGFydGljbGVzOiBjcmVhdGVQYXJ0aWNsZXMsXG4gICAgZHJhdzogZHJhdyxcbiAgICBhcnJheTogcGFydGljbGVzLFxuICAgIHJlc2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcGFydGljbGVzLmxlbmd0aCA9IDA7XG4gICAgfVxufTtcbiIsInZhciB3aGl0ZW4gPSByZXF1aXJlKCcuL3doaXRlbicpO1xudmFyIGNhbnZhcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNnYW1lJyk7XG5cbndpbmRvdy5wbGF5ZXIgPSB7fTtcblxucGxheWVyLmlkbGUgPSBuZXcgSW1hZ2UoKTtcbnBsYXllci5pZGxlLnNyYyA9ICdpbWFnZXMvYXN0cm8ucG5nJztcbnBsYXllci5pZGxlLm5hbWUgPSAnYXN0cm8ucG5nJztcbnBsYXllci5mbHlpbmcgPSBuZXcgSW1hZ2UoKTtcbnBsYXllci5mbHlpbmcuc3JjID0gJ2ltYWdlcy9hc3Ryby1mbHlpbmcucG5nJztcbnBsYXllci5mbHlpbmcubmFtZSA9ICdhc3Ryby1mbHlpbmcucG5nJztcbnBsYXllci5zdGF0ZSA9ICdpZGxlJztcblxudmFyIHBsYXllckRlZmF1bHRzID0ge1xuICAgIHNjb3JlOiAwLFxuICAgIGFuZ2xlOiAwLFxuICAgIG9mZnNldFk6IDAsXG4gICAgb2Zmc2V0WDogMCxcbiAgICBoZWFsdGg6IDEwMDAwMDAsXG4gICAgZnVlbDogMTAwMDAwMFxufTtcblxucGxheWVyLndpZHRoID0gNTI7XG5wbGF5ZXIuaGVpZ2h0ID0gNjA7XG5wbGF5ZXIueCA9IChjYW52YXMud2lkdGggLSBwbGF5ZXIud2lkdGgpIC8gMjtcbnBsYXllci55ID0gKGNhbnZhcy5oZWlnaHQgLSBwbGF5ZXIuaGVpZ2h0KSAvIDI7XG5wbGF5ZXIuYW5nbGUgPSAwO1xuXG5wbGF5ZXIub2Zmc2V0WCA9IHBsYXllci5vZmZzZXRZID0gMDtcblxuXG4vLyBIYWxmIHdpZHRoLCBoYWxmIGhlaWdodFxudmFyIGhXID0gcGxheWVyLndpZHRoIC8gMjtcbnZhciBoSCA9IHBsYXllci5oZWlnaHQgLyAyO1xuXG52YXIgc3BlZWQgPSAwOyAvLyBUaGUgY3VycmVudCBzcGVlZFxudmFyIGRTcGVlZDtcbnZhciBkWCA9IDAsIGRZID0gMDtcblxuLy8gWU9VIENBTiBDT05GSUdVUkUgVEhFU0UhIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG52YXIgYWNjID0gNzsgLy8gQWNjZWxlcmF0aW9uXG52YXIgbGltID0gMTA7IC8vIFNwZWVkIGxpbWl0XG52YXIgdHVyblNwZWVkID0gMi4yO1xudmFyIGdyYXYgPSAwLjAzO1xuLy8gTk8gTU9SRSBDT05GSUdVUklORyEgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblxuXG5wbGF5ZXIucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgICBkWCA9IGRZID0gc3BlZWQgPSBkU3BlZWQgPSAwO1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMocGxheWVyRGVmYXVsdHMpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBwbGF5ZXJba2V5c1tpXV0gPSBwbGF5ZXJEZWZhdWx0c1trZXlzW2ldXTtcbiAgICB9XG4gICAgcGxheWVyLm1vdmUoKTtcbn07XG5wbGF5ZXIuZ3Jhdml0eSA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBkWSAtPSBncmF2O1xufTtcbnBsYXllci5tb3ZlID0gZnVuY3Rpb24oZWxhcHNlZCwgZmx5aW5nKSB7XG4gICAgcGxheWVyLm9mZnNldFggPSBkWDtcbiAgICBwbGF5ZXIub2Zmc2V0WSA9IC1kWTtcbiAgICBkWCAqPSAwLjk5O1xuICAgIGRZICo9IDAuOTk7XG5cbiAgICBpZiAoIWZseWluZykge1xuICAgICAgICBwbGF5ZXIuc3RhdGUgPSAnaWRsZSc7XG4gICAgfVxufTtcbnBsYXllci51cCA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBwbGF5ZXIuZnVlbCAtPSAwLjI7XG4gICAgcGxheWVyLnN0YXRlID0gJ2ZseWluZyc7XG4gICAgc3BlZWQgKz0gYWNjO1xuICAgIGRTcGVlZCA9IGVsYXBzZWQgKiBzcGVlZDtcbiAgICAvLyBjb25zb2xlLmxvZyhwbGF5ZXIueCwgcGxheWVyLnkpO1xuICAgIC8vIGNvbnNvbGUubG9nKE1hdGguc2luKHBsYXllci5hbmdsZSkgKiBkU3BlZWQsIE1hdGguY29zKHBsYXllci5hbmdsZSkgKiBkU3BlZWQpO1xuICAgIGRYICs9IE1hdGguc2luKHBsYXllci5hbmdsZSkgKiBkU3BlZWQ7XG4gICAgZFkgKz0gTWF0aC5jb3MocGxheWVyLmFuZ2xlKSAqIGRTcGVlZDtcbiAgICBwbGF5ZXIubW92ZShlbGFwc2VkLCB0cnVlKTtcbiAgICBpZiAoc3BlZWQgPiBsaW0pIHtcbiAgICAgICAgc3BlZWQgPSBsaW07XG4gICAgfVxuICAgIGVsc2UgaWYgKHNwZWVkIDwgLWxpbSkge1xuICAgICAgICBzcGVlZCA9IC1saW07XG4gICAgfVxuXG59O1xucGxheWVyLnJpZ2h0ID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5hbmdsZSArPSBlbGFwc2VkICogdHVyblNwZWVkICogTWF0aC5QSTtcbn07XG5wbGF5ZXIubGVmdCA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBwbGF5ZXIuYW5nbGUgLT0gZWxhcHNlZCAqIHR1cm5TcGVlZCAqIE1hdGguUEk7XG59O1xucGxheWVyLmZsaXAgPSBmdW5jdGlvbigpIHtcbiAgICBwbGF5ZXIuYW5nbGUgKz0gTWF0aC5QSTtcbn07XG5cblxudmFyIHRpY2tzID0gMDtcbnBsYXllci5kcmF3ID0gZnVuY3Rpb24oZWxhcHNlZCwgY3R4KSB7XG4gICAgLy8gUGxheWVyXG4gICAgY3R4LnNhdmUoKTtcbiAgICBjdHgudHJhbnNsYXRlKHBsYXllci54ICsgaFcsIHBsYXllci55ICsgaEgpO1xuICAgIGN0eC5yb3RhdGUocGxheWVyLmFuZ2xlKTtcbiAgICAvLyBwbGF5ZXIuaGl0IGlzIHNldCBpbiBjb2xsaXNpb25zLmpzXG4gICAgLy8gSWYgdGhlIHBsYXllcidzIGJlZW4gaGl0LCB3ZSB3YW50IGl0IHRvIGZsYXNoIHdoaXRlIHRvIGluZGljYXRlIHRoYXRcbiAgICBpZiAocGxheWVyLmhpdCkge1xuICAgICAgICBjdHguZHJhd0ltYWdlKHdoaXRlbihwbGF5ZXJbcGxheWVyLnN0YXRlXS5uYW1lKSwgLWhXLCAtaEgpO1xuICAgICAgICB0aWNrcysrO1xuICAgICAgICBpZiAodGlja3MgPj0gNCkge1xuICAgICAgICAgICAgcGxheWVyLmhpdCA9IGZhbHNlO1xuICAgICAgICAgICAgdGlja3MgPSAwO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjdHguZHJhd0ltYWdlKHBsYXllcltwbGF5ZXIuc3RhdGVdLCAtaFcsIC1oSCk7XG4gICAgfVxuICAgIGN0eC5yZXN0b3JlKCk7XG5cbn07XG5cbnBsYXllci5yZXNldCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBsYXllcjtcbiIsIi8vIEhvbGRzIGxhc3QgaXRlcmF0aW9uIHRpbWVzdGFtcC5cbnZhciB0aW1lID0gMDtcblxuLyoqXG4gKiBDYWxscyBgZm5gIG9uIG5leHQgZnJhbWUuXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuIFRoZSBmdW5jdGlvblxuICogQHJldHVybiB7aW50fSBUaGUgcmVxdWVzdCBJRFxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIHJhZihmbikge1xuICByZXR1cm4gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgICB2YXIgZWxhcHNlZCA9IG5vdyAtIHRpbWU7XG5cbiAgICBpZiAoZWxhcHNlZCA+IDk5OSkge1xuICAgICAgZWxhcHNlZCA9IDEgLyA2MDtcbiAgICB9IGVsc2Uge1xuICAgICAgZWxhcHNlZCAvPSAxMDAwO1xuICAgIH1cblxuICAgIHRpbWUgPSBub3c7XG4gICAgZm4oZWxhcHNlZCk7XG4gIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgLyoqXG4gICAqIENhbGxzIGBmbmAgb24gZXZlcnkgZnJhbWUgd2l0aCBgZWxhcHNlZGAgc2V0IHRvIHRoZSBlbGFwc2VkXG4gICAqIHRpbWUgaW4gbWlsbGlzZWNvbmRzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm4gVGhlIGZ1bmN0aW9uXG4gICAqIEByZXR1cm4ge2ludH0gVGhlIHJlcXVlc3QgSURcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHN0YXJ0OiBmdW5jdGlvbihmbikge1xuICAgIHJldHVybiByYWYoZnVuY3Rpb24gdGljayhlbGFwc2VkKSB7XG4gICAgICBmbihlbGFwc2VkKTtcbiAgICAgIHJhZih0aWNrKTtcbiAgICB9KTtcbiAgfSxcbiAgLyoqXG4gICAqIENhbmNlbHMgdGhlIHNwZWNpZmllZCBhbmltYXRpb24gZnJhbWUgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHtpbnR9IGlkIFRoZSByZXF1ZXN0IElEXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzdG9wOiBmdW5jdGlvbihpZCkge1xuICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZShpZCk7XG4gIH1cbn07XG4iLCJ2YXIgY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2dhbWUnKTtcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxudmFyIHBvbGFyaXR5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgPiAwLjUgPyAxIDogLTE7XG59O1xuXG4vLyBBbW91bnQgd2UndmUgbW92ZWQgc28gZmFyXG52YXIgdG90YWxYID0gMDtcbnZhciB0b3RhbFkgPSAwO1xuXG52YXIgc2hha2UgPSBmdW5jdGlvbihpbnRlbnNpdHkpIHtcbiAgICBpZiAoIWludGVuc2l0eSkge1xuICAgICAgICBpbnRlbnNpdHkgPSAyO1xuICAgIH1cbiAgICB2YXIgZFggPSBNYXRoLnJhbmRvbSgpICogaW50ZW5zaXR5ICogcG9sYXJpdHkoKTtcbiAgICB2YXIgZFkgPSBNYXRoLnJhbmRvbSgpICogaW50ZW5zaXR5ICogcG9sYXJpdHkoKTtcbiAgICB0b3RhbFggKz0gZFg7XG4gICAgdG90YWxZICs9IGRZO1xuXG4gICAgLy8gQnJpbmcgdGhlIHNjcmVlbiBiYWNrIHRvIGl0cyB1c3VhbCBwb3NpdGlvbiBldmVyeSBcIjIgaW50ZW5zaXR5XCIgc28gYXMgbm90IHRvIGdldCB0b28gZmFyIGF3YXkgZnJvbSB0aGUgY2VudGVyXG4gICAgaWYgKGludGVuc2l0eSAlIDIgPCAwLjIpIHtcbiAgICAgICAgY3R4LnRyYW5zbGF0ZSgtdG90YWxYLCAtdG90YWxZKTtcbiAgICAgICAgdG90YWxYID0gdG90YWxZID0gMDtcbiAgICAgICAgaWYgKGludGVuc2l0eSA8PSAwLjE1KSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjdHgudHJhbnNsYXRlKGRYLCBkWSk7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgc2hha2UoaW50ZW5zaXR5IC0gMC4xKTtcbiAgICB9LCA1KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gc2hha2U7IiwidmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdjYW52YXMnKVswXTtcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbm1vZHVsZS5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKHRleHQsIHgsIHksIHByZUZ1bmMsIHN0cm9rZSl7XG4gICAgaWYocHJlRnVuYyl7XG4gICAgICAgIGN0eC5zYXZlKCk7XG4gICAgICAgIHByZUZ1bmMoY3R4KTtcbiAgICB9XG5cbiAgICB2YXIgeFBvcyA9IHg7XG4gICAgaWYoeCA9PT0gJ2NlbnRlcicpe1xuICAgICAgICB4UG9zID0gKGNhbnZhcy53aWR0aCAtIGN0eC5tZWFzdXJlVGV4dCh0ZXh0KS53aWR0aCkgLyAyO1xuICAgIH1cblxuICAgIGlmKHN0cm9rZSl7XG4gICAgICAgIGN0eC5zdHJva2VUZXh0KHRleHQsIHhQb3MsIHkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY3R4LmZpbGxUZXh0KHRleHQsIHhQb3MsIHkpO1xuICAgIH1cblxuICAgIGlmKHByZUZ1bmMpe1xuICAgICAgICBjdHgucmVzdG9yZSgpO1xuICAgIH1cbn07IiwiLy8gdWZvcy5qc1xuLy8gVGhpcyBmaWxlIGRlZmluZXMgYmVoYXZpb3IgZm9yIGFsbCB0aGUgdW5pZGVudGlmaWVkIGZseWluZyBvYmplY3RzXG4vLyBJIGd1ZXNzIHRoZXkgKmFyZSogaWRlbnRpZmllZCwgdGVjaG5pY2FsbHkuXG4vLyBCdXQgdWZvcy5qcyBpcyBjb29sZXIgdGhhbiBpZm9zLmpzXG4vLyBBc3Rlcm9pZHMgYW5kIGhlYWx0aCAvIGZ1ZWwgcGlja3VwcyBjb3VudCBhcyBVRk9zXG5cbnZhciBmbHlpbmdPYmplY3RzID0gW107XG5cbnZhciBsb2FkZXIgPSByZXF1aXJlKCcuL2xvYWRlci5qcycpO1xuXG52YXIgcm5kID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCk7XG59O1xudmFyIGNob29zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcmd1bWVudHNbTWF0aC5mbG9vcihybmQoKSAqIGFyZ3VtZW50cy5sZW5ndGgpXTtcbn07XG5cbnZhciBTUEFXTl9SQU5HRSA9IDEwMDtcbnZhciBNSU5fU1BFRUQgPSAwLjMsIE1BWF9TUEVFRCA9IDI7XG52YXIgV0lEVEggPSA4MDAsIEhFSUdIVCA9IDYwMDtcblxudmFyIHNwYXduID0gZnVuY3Rpb24obikge1xuICAgIC8vIGNvbnNvbGUubG9nKCdTcGF3bmVkIGZseWluZ09iamVjdHM6Jywgbik7XG4gICAgdmFyIG9iaiwgdGFyZ2V0WSwgdGFyZ2V0WDtcbiAgICB2YXIgc2lnblgsIHNpZ25ZLCBwb3NYLCBwb3NZO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIG9iaiA9IHtcbiAgICAgICAgICAgIHg6IChybmQoKSAqIFdJRFRIKSxcbiAgICAgICAgICAgIHk6IChybmQoKSAqIEhFSUdIVCksXG4gICAgICAgICAgICBzcGVlZDogcm5kKCkgKiAoTUFYX1NQRUVEIC0gTUlOX1NQRUVEKSArIE1JTl9TUEVFRCxcbiAgICAgICAgICAgIGltYWdlOiBjaG9vc2UuYXBwbHkodGhpcywgbG9hZGVyLmdldCgncm9jaycpLmNvbmNhdChsb2FkZXIuZ2V0KCdwb3dlci1pY29uJykpKSxcbiAgICAgICAgICAgIGFsaXZlOiB0cnVlXG4gICAgICAgIH07XG4gICAgICAgIHRhcmdldFkgPSBybmQoKSAqIFdJRFRIO1xuICAgICAgICB0YXJnZXRYID0gcm5kKCkgKiBIRUlHSFQ7XG4gICAgICAgIG9iai5hbmdsZSA9IHJuZCgpICogTWF0aC5QSSAqIDI7XG4gICAgICAgIG9iai5nb29kID0gb2JqLmltYWdlLmluZGV4T2YoJ3JvY2snKSA+PSAwID8gZmFsc2UgOiB0cnVlO1xuICAgICAgICBvYmoud2lkdGggPSBsb2FkZXIuaW1hZ2VzW29iai5pbWFnZV0ud2lkdGg7XG4gICAgICAgIG9iai5oZWlnaHQgPSBsb2FkZXIuaW1hZ2VzW29iai5pbWFnZV0uaGVpZ2h0O1xuICAgICAgICBvYmouZHggPSBNYXRoLmNvcyhvYmouYW5nbGUpICogb2JqLnNwZWVkO1xuICAgICAgICBvYmouZHkgPSBNYXRoLnNpbihvYmouYW5nbGUpICogb2JqLnNwZWVkO1xuXG4gICAgICAgIGlmICghb2JqLmdvb2QpIHtcbiAgICAgICAgICAgIG9iai5jb2xvciA9IG9iai5pbWFnZS5pbmRleE9mKCdhbHQnKSA8IDAgPyAnI2FhYWFhYScgOiAnI2E3ODI1OCc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocm5kKCkgPiAwLjUpIHtcbiAgICAgICAgICAgIG9iai54ICs9IGNob29zZSgtMSwgMSkgKiAoV0lEVEggKyBvYmoud2lkdGgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgb2JqLnkgKz0gY2hvb3NlKC0xLCAxKSAqIChIRUlHSFQgKyBvYmouaGVpZ2h0KTtcbiAgICAgICAgfVxuICAgICAgICBmbHlpbmdPYmplY3RzLnB1c2gob2JqKTtcbiAgICB9XG59O1xuXG52YXIgbG9vcCA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCwgb2Zmc2V0WCwgb2Zmc2V0WSkge1xuICAgIHZhciBvYmo7XG4gICAgZm9yICh2YXIgaSA9IGZseWluZ09iamVjdHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgb2JqID0gZmx5aW5nT2JqZWN0c1tpXTtcbiAgICAgICAgaWYgKG9iai5hbGl2ZSkge1xuICAgICAgICAgICAgb2JqLnggKz0gb2JqLmR4IC0gb2Zmc2V0WDtcbiAgICAgICAgICAgIG9iai55ICs9IG9iai5keSAtIG9mZnNldFk7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JlZCc7XG4gICAgICAgICAgICBjdHguZHJhd0ltYWdlKGxvYWRlci5pbWFnZXNbb2JqLmltYWdlXSwgb2JqLngsIG9iai55KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGZseWluZ09iamVjdHMuc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBsb29wOiBsb29wLFxuICAgIGFycmF5OiBmbHlpbmdPYmplY3RzLFxuICAgIHNwYXduOiBzcGF3bixcbiAgICByZXNldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGZseWluZ09iamVjdHMubGVuZ3RoID0gMDtcbiAgICB9XG59OyIsInZhciBsb2FkZXIgPSByZXF1aXJlKCcuL2xvYWRlcicpO1xudmFyIGltYWdlcyA9IGxvYWRlci5pbWFnZXM7XG5cbnZhciBjYWNoZSA9IHt9O1xudmFyIHdoaXRlbiA9IGZ1bmN0aW9uKGltZ05hbWUpIHtcbiAgICBpZiAoY2FjaGVbaW1nTmFtZV0pIHtcbiAgICAgICAgcmV0dXJuIGNhY2hlW2ltZ05hbWVdO1xuICAgIH1cbiAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgdmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgIHZhciBpbWcgPSBpbWFnZXNbaW1nTmFtZV07XG4gICAgY29uc29sZS5sb2coaW1hZ2VzLCBpbWdOYW1lKTtcblxuICAgIGNhbnZhcy53aWR0aCA9IGltZy53aWR0aDtcbiAgICBjYW52YXMuaGVpZ2h0ID0gaW1nLmhlaWdodDtcbiAgICBjdHguZHJhd0ltYWdlKGltZywgMCwgMCwgaW1nLndpZHRoLCBpbWcuaGVpZ2h0KTtcbiAgICBjdHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gJ3NvdXJjZS1hdG9wJztcbiAgICBjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcbiAgICBjdHguZmlsbFJlY3QoMCwgMCwgaW1nLndpZHRoLCBpbWcuaGVpZ2h0KTtcbiAgICBjYWNoZVtpbWdOYW1lXSA9IGNhbnZhcztcbiAgICByZXR1cm4gY2FudmFzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB3aGl0ZW47Il19
