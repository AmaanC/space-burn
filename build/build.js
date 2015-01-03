(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var loader = require('./loader.js');

var raf = require('./raf');
var player = require('./player');
var key = require('./keys');
var particles = require('./particles');
var flyingObjects = require('./ufos');
var collisions = require('./collisions');
var menus = require('./menus');
var buttons = require('./buttons');
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
                particles.createParticles(player.x + player.width / 2, player.y + player.height / 2, 10, 0.1, 10, ['blue', 'red'], {
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

            particles.draw(elapsed, ctx, player);
            flyingObjects.loop(elapsed, ctx, player.offsetX, player.offsetY);
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
        buttons.drawAll();
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

// canvas.addEventListener('click', changeState, false);
document.body.addEventListener('keydown', function(e) {
    if (e.keyCode === 13) {
        changeState();
    }
}, false);

},{"./audio":2,"./buttons":3,"./collisions":4,"./keys":5,"./loader.js":6,"./menus":7,"./particles":8,"./player":9,"./raf":10,"./ufos":13}],2:[function(require,module,exports){
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
// Makes it easier to make menu buttons
var buttons = [];

var canvas = document.querySelector('#game');
var ctx = canvas.getContext('2d');

var drawButton = function(button) {
    if (button.img) {
        ctx.drawImage(button.x, button.y, button.width, button.height);
    }
    else {
        ctx.strokeStyle = 'white';
        ctx.strokeRect(button.x, button.y, button.width, button.height);
    }
    if (button.text) {

        ctx.fillStyle = 'white';
        ctx.font = button.font;
        var textDim = ctx.measureText(button.text);
        ctx.fillText(button.text, button.x + (button.width - textDim.width) / 2, button.y + (button.height + 10) / 2);
    }
};

// dim = dimensions = {x, y, width, height},
// screenState; where the button is visible
// text to write on button,
// img to put behind text (if undefined, it'll draw a white border around the button area)
var addButton = function(dim, screenState, onclick, text, font, img) {
    var button = {};
    var keys = Object.keys(dim);
    for (var i = 0; i < keys.length; i++) {
        button[keys[i]] = dim[keys[i]];
    }
    if (button.x === 'center') {
        button.x = (canvas.width - button.width) / 2;
    }
    if (button.y === 'center') {
        button.y = (canvas.height - button.height) / 2;
    }
    button.screenState = screenState || 'menu';
    button.onclick = onclick;
    button.text = text || '';
    button.font = font || '12pt Tempesta Five';
    button.img = img;
    buttons.push(button);
};

var drawAll = function() {
    var button;
    for (var i = 0; i < buttons.length; i++) {
        button = buttons[i];
        if (window.state === button.screenState) {
            drawButton(button);
        }
    }
};

module.exports = {
    drawAll: drawAll,
    addButton: addButton
};

var checkClick = function(e) {
    var x = e.pageX - canvas.offsetLeft;
    var y = e.pageY - canvas.offsetTop;
    var button;
    for (var i = 0; i < buttons.length; i++) {
        button = buttons[i];
        if (x >= button.x && x <= button.x + button.width &&
            y >= button.y && y <= button.y + button.height) {
            button.onclick();
            return true;
        }
    }
};
canvas.addEventListener('click', checkClick, false);
},{}],4:[function(require,module,exports){
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
    particlesModule.createParticles(fo.x, fo.y, fo.speed, 0.01, fo.width * fo.height / 100, [fo.color], {
        range: Math.random() * 2 * Math.PI,
        noCollide: true,
        dx: fo.dx,
        dy: fo.dy
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
},{"./particles":8,"./screenshake":11}],5:[function(require,module,exports){
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

},{"./player":9}],6:[function(require,module,exports){
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
    'rock-odd-3.png'
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
},{}],7:[function(require,module,exports){
var loader = require('./loader');
var text = require('./text');
var buttons = require('./buttons');

buttons.addButton(
    {
        x: 'center',
        y: 300,
        width: 200,
        height: 50
    },
    'menu',
    function() {
        window.state = 'game';
    },
    'Click to play',
    '12pt Tempesta Five'
);

module.exports = {
    drawMenu: function(ctx) {
        ctx.fillStyle = '#0f0d20';
        ctx.fillRect(0, 0, 800, 600);

        ctx.drawImage(loader.images['logo.png'], 314, 180);
        // text.write('CLICK TO PLAY', 'center', 330);
        text.write('A GAME BY', 'center', 500);
        text.write('@AMAANC AND @MIKEDIDTHIS', 'center', 520, function(ctx) {
            ctx.fillStyle = '#DCFCF9';
            ctx.font = '12pt Tempesta Five';
        });

    },
    drawEnd: function(ctx, score) {
        ctx.fillStyle = '#0f0d20';
        ctx.fillRect(0, 0, 800, 600);
        text.write('The end! You scored ' + Math.round(score) + ' points!', 'center', 300, function() {
            ctx.fillStyle = 'white';
            ctx.font = '26pt Tempesta Five';
        });
        text.write('Click to play again', 'center', 500, function() {
            ctx.fillStyle = 'white';
            ctx.font = '22pt Tempesta Five';
        });
    },
    ingame: function (ctx, fuel, health, score) {
        ctx.drawImage(loader.images['power-bar-icon.png'], 30, 500);
        ctx.fillStyle = 'orange';
        ctx.fillRect(30, 490 - fuel, 20, fuel);

        ctx.drawImage(loader.images['health-bar-icon.png'], 70, 500);
        ctx.fillStyle = 'red';
        ctx.fillRect(70, 490 - health, 20, health);

        text.write('Score: ' + Math.round(score), 20, 550, function() {
            ctx.font = '12pt Tempesta Five';
            ctx.fillStyle = 'white';
        });
    }
};
},{"./buttons":3,"./loader":6,"./text":12}],8:[function(require,module,exports){
var particles = [];
var W = 7, H = 7;
var DEC_RATE = 0.1; // Default decrease rate. Higher rate -> particles go faster
var Particle = function(x, y, speed, decRate, colors) {
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
    if (colors) {
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }
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
        ctx.globalCompositeOperation = 'lighter';
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
var createParticles = function(x, y, speed, decRate, n, colors, props) {
    // console.log('Creating', particles);
    var created = 0, i = 0;
    var particle;
    while(created < n) {
        particle = particles[i];
        if (particle && !particle.alive || !particle) {
            particles[i] = new Particle(x, y, speed, decRate, colors);
            created++;
            var keys = Object.keys(props);
            for (var j = 0; j < keys.length; j++) {
                particles[i][keys[j]] = props[keys[j]];
            }
            // Possible props: range, noCollide, dx, dy, color
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

},{}],9:[function(require,module,exports){
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
    health: 100,
    fuel: 100,
    hit: false
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
        ctx.drawImage(whiten(player[player.state].name, 'pink'), -hW, -hH);
        ticks++;
        if (ticks >= 8) {
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

},{"./whiten":14}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
var canvas = document.querySelector('#game');
var ctx = canvas.getContext('2d');

var polarity = function() {
    return Math.random() > 0.5 ? 1 : -1;
};

// Amount we've moved so far
var totalX = 0;
var totalY = 0;

var shake = function(intensity) {
    if (totalX === 0) {
        ctx.save();
    }
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
            ctx.restore(); // Just to make sure it goes back to normal
            return true;
        }
    }
    ctx.translate(dX, dY);
    setTimeout(function() {
        shake(intensity - 0.1);
    }, 5);
};

module.exports = shake;
},{}],12:[function(require,module,exports){
var canvas = document.getElementsByTagName('canvas')[0];
var ctx = canvas.getContext('2d');
module.exports.write = function(text, x, y, preFunc, stroke){
    ctx.save();
    if (preFunc) {
        preFunc(ctx);
    }
    else {
        ctx.fillStyle = 'white';
        ctx.font = '12pt Tempesta Five';
    }

    var xPos = x;
    if (x === 'center') {
        xPos = (canvas.width - ctx.measureText(text).width) / 2;
    }

    if (stroke) {
        ctx.strokeText(text, xPos, y);
    }
    else {
        ctx.fillText(text, xPos, y);
    }
    ctx.restore();
};
},{}],13:[function(require,module,exports){
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
            obj.color = obj.image.indexOf('alt') < 0 ? '#524C4C' : '#a78258';
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
},{"./loader.js":6}],14:[function(require,module,exports){
// This file exports a function that lets you make images "flash" momentarily. Like the player when he gets hit by an asteroid
var loader = require('./loader');
var images = loader.images;

var cache = {};
var whiten = function(imgName, color) {
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
    ctx.fillStyle = color || 'white';
    ctx.fillRect(0, 0, img.width, img.height);
    cache[imgName] = canvas;
    return canvas;
};

module.exports = whiten;
},{"./loader":6}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4vc3JjL21haW4iLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9hdWRpby5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL2J1dHRvbnMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9jb2xsaXNpb25zLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMva2V5cy5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL2xvYWRlci5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL21lbnVzLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvcGFydGljbGVzLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvcGxheWVyLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvcmFmLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvc2NyZWVuc2hha2UuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy90ZXh0LmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvdWZvcy5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL3doaXRlbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGxvYWRlciA9IHJlcXVpcmUoJy4vbG9hZGVyLmpzJyk7XG5cbnZhciByYWYgPSByZXF1aXJlKCcuL3JhZicpO1xudmFyIHBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyJyk7XG52YXIga2V5ID0gcmVxdWlyZSgnLi9rZXlzJyk7XG52YXIgcGFydGljbGVzID0gcmVxdWlyZSgnLi9wYXJ0aWNsZXMnKTtcbnZhciBmbHlpbmdPYmplY3RzID0gcmVxdWlyZSgnLi91Zm9zJyk7XG52YXIgY29sbGlzaW9ucyA9IHJlcXVpcmUoJy4vY29sbGlzaW9ucycpO1xudmFyIG1lbnVzID0gcmVxdWlyZSgnLi9tZW51cycpO1xudmFyIGJ1dHRvbnMgPSByZXF1aXJlKCcuL2J1dHRvbnMnKTtcbnZhciBhdWRpbyA9IHJlcXVpcmUoJy4vYXVkaW8nKTtcblxudmFyIGNhbnZhcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNnYW1lJyk7XG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbnZhciBzZnggPSBbJ2NvbGxlY3QnLCAnY29sbGlkZScsICdleHBsb2RlX21ldGVvcicsICdqZXRwYWNrJ107XG5sb2FkZXIuZG9uZShmdW5jdGlvbigpIHtcbiAgICBhdWRpby5tdXRlKCk7IC8vIEJlY2F1c2UgSSBkb24ndCB3YW50IGl0IGF1dG9wbGF5aW5nIHdoaWxlIEkgZGV2ZWxvcCBpdCFcblxuICAgIHdpbmRvdy5zdGF0ZSA9ICdtZW51JztcbiAgICByYWYuc3RhcnQoZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgICAgICBpZiAod2luZG93LnN0YXRlID09PSAnbWVudScpIHtcbiAgICAgICAgICAgIG1lbnVzLmRyYXdNZW51KGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAod2luZG93LnN0YXRlID09PSAnZ2FtZScpIHtcbiAgICAgICAgICAgIHBsYXllci5ncmF2aXR5KGVsYXBzZWQpO1xuICAgICAgICAgICAgaWYgKGtleS51cCgpICYmIHBsYXllci5mdWVsID4gMCkge1xuICAgICAgICAgICAgICAgIGF1ZGlvLnBsYXkoJ2pldHBhY2snKTtcbiAgICAgICAgICAgICAgICBwbGF5ZXIudXAoZWxhcHNlZCk7XG4gICAgICAgICAgICAgICAgcGFydGljbGVzLmNyZWF0ZVBhcnRpY2xlcyhwbGF5ZXIueCArIHBsYXllci53aWR0aCAvIDIsIHBsYXllci55ICsgcGxheWVyLmhlaWdodCAvIDIsIDEwLCAwLjEsIDEwLCBbJ2JsdWUnLCAncmVkJ10sIHtcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IE1hdGguUEkgLyAxMFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhdWRpby5wYXVzZSgnamV0cGFjaycpO1xuICAgICAgICAgICAgICAgIHBsYXllci5tb3ZlKGVsYXBzZWQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoa2V5LnJpZ2h0KCkpIHtcbiAgICAgICAgICAgICAgICBwbGF5ZXIucmlnaHQoZWxhcHNlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoa2V5LmxlZnQoKSkge1xuICAgICAgICAgICAgICAgIHBsYXllci5sZWZ0KGVsYXBzZWQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUaGlzIGZ1bmN0aW9uIGNoZWNrcyBmb3IgYWxsIHJlcXVpcmVkIGNvbGxpc2lvbnMsIGFuZCBjYWxscyB0aGUgY29ycmVzcG9uZGluZyBmdW5jdGlvbnMgYWZ0ZXIgdG9vXG4gICAgICAgICAgICBjb2xsaXNpb25zLmNoZWNrKHBsYXllciwgZmx5aW5nT2JqZWN0cyk7XG5cbiAgICAgICAgICAgIC8vIENsZWFyIHRoZSBzY3JlZW5cbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzBmMGQyMCc7XG4gICAgICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgODAwLCA2MDApO1xuXG4gICAgICAgICAgICBwYXJ0aWNsZXMuZHJhdyhlbGFwc2VkLCBjdHgsIHBsYXllcik7XG4gICAgICAgICAgICBmbHlpbmdPYmplY3RzLmxvb3AoZWxhcHNlZCwgY3R4LCBwbGF5ZXIub2Zmc2V0WCwgcGxheWVyLm9mZnNldFkpO1xuICAgICAgICAgICAgcGxheWVyLmRyYXcoZWxhcHNlZCwgY3R4KTtcbiAgICAgICAgICAgIG1lbnVzLmluZ2FtZShjdHgsIHBsYXllci5mdWVsLCBwbGF5ZXIuaGVhbHRoLCBwbGF5ZXIuc2NvcmUpO1xuXG4gICAgICAgICAgICBwbGF5ZXIuc2NvcmUgKz0gMC4xO1xuXG4gICAgICAgICAgICBpZiAocGxheWVyLmhlYWx0aCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LnN0YXRlID0gJ2VuZCc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAod2luZG93LnN0YXRlID09PSAnZW5kJykge1xuICAgICAgICAgICAgYXVkaW8ucGF1c2Uoc2Z4KTtcbiAgICAgICAgICAgIG1lbnVzLmRyYXdFbmQoY3R4LCBwbGF5ZXIuc2NvcmUpO1xuICAgICAgICB9XG4gICAgICAgIGJ1dHRvbnMuZHJhd0FsbCgpO1xuICAgIH0pO1xufSk7XG5cbnZhciBjaGFuZ2VTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh3aW5kb3cuc3RhdGUgPT09ICdtZW51Jykge1xuICAgICAgICB3aW5kb3cuc3RhdGUgPSAnZ2FtZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHdpbmRvdy5zdGF0ZSA9PT0gJ2VuZCcpIHtcbiAgICAgICAgd2luZG93LnN0YXRlID0gJ2dhbWUnO1xuICAgICAgICBwbGF5ZXIuc2NvcmUgPSAwO1xuICAgICAgICBwbGF5ZXIucmVzZXQoKTtcbiAgICAgICAgcGFydGljbGVzLnJlc2V0KCk7XG4gICAgICAgIGZseWluZ09iamVjdHMucmVzZXQoKTtcbiAgICB9XG59O1xuXG4vLyBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjaGFuZ2VTdGF0ZSwgZmFsc2UpO1xuZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZSkge1xuICAgIGlmIChlLmtleUNvZGUgPT09IDEzKSB7XG4gICAgICAgIGNoYW5nZVN0YXRlKCk7XG4gICAgfVxufSwgZmFsc2UpO1xuIiwidmFyIGF1ZGlvID0gd2luZG93LmF1ZGlvID0ge307IC8vIE1hZGUgaXQgYSBnbG9iYWwgc28gSSBjYW4gZWFzaWx5IHRlc3RcbnZhciBlbGVtZW50cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2F1ZGlvJyk7XG52YXIgRkFERV9TUEVFRCA9IDAuMTtcblxuYXVkaW8ubXV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGVsZW1lbnRzW2ldLnZvbHVtZSA9IDA7XG4gICAgfVxufTtcbmF1ZGlvLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBlbGVtZW50c1tpXS5wYXVzZSgpO1xuICAgIH1cbn07XG5cbmF1ZGlvLnBsYXkgPSBmdW5jdGlvbiAobmFtZSwgc2Vla0Zyb20pIHtcbiAgICB2YXIgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG5hbWUpO1xuICAgIGVsZW0uY3VycmVudFRpbWUgPSBzZWVrRnJvbSB8fCAwO1xuICAgIGVsZW0ucGxheSgpO1xufTtcbmF1ZGlvLnBhdXNlID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHZhciBuYW1lcyA9IFtuYW1lXTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIG5hbWVzID0gbmFtZTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG5hbWVzW2ldKTtcbiAgICAgICAgZWxlbS5wYXVzZSgpO1xuICAgIH1cbiAgICBcbn07XG5cbmF1ZGlvLmZhZGVvdXQgPSBmdW5jdGlvbiAobmFtZSwgc2Vla0Zyb20sIGNiKSB7XG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChuYW1lKTtcbiAgICB2YXIgdm9sdW1lID0gZWxlbS52b2x1bWU7XG4gICAgdmFyIGRlY3JlYXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2b2x1bWUgLT0gRkFERV9TUEVFRDtcbiAgICAgICAgY29uc29sZS5sb2codm9sdW1lKTtcbiAgICAgICAgaWYgKHZvbHVtZSA8PSAwKSB7XG4gICAgICAgICAgICBlbGVtLnZvbHVtZSA9IDA7XG4gICAgICAgICAgICBlbGVtLnBhdXNlKCk7XG4gICAgICAgICAgICBjYiAmJiBjYihlbGVtKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGVsZW0udm9sdW1lID0gdm9sdW1lO1xuICAgICAgICAgICAgc2V0VGltZW91dChkZWNyZWFzZSwgMTAwLzMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBkZWNyZWFzZSgpO1xufVxuYXVkaW8uZmFkZWluID0gZnVuY3Rpb24gKG5hbWUsIHNlZWtGcm9tLCBjYikge1xuICAgIHZhciBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobmFtZSk7XG4gICAgdmFyIHZvbHVtZSA9IGVsZW0udm9sdW1lID0gMDtcbiAgICBlbGVtLnBsYXkoKTtcbiAgICB2YXIgaW5jcmVhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZvbHVtZSArPSBGQURFX1NQRUVEO1xuICAgICAgICBpZiAodm9sdW1lID49IDEpIHtcbiAgICAgICAgICAgIGVsZW0udm9sdW1lID0gMTtcbiAgICAgICAgICAgIGNiICYmIGNiKGVsZW0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZWxlbS52b2x1bWUgPSB2b2x1bWU7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGluY3JlYXNlLCAxMDAvMyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGluY3JlYXNlKCk7XG59XG5tb2R1bGUuZXhwb3J0cyA9IGF1ZGlvOyIsIi8vIE1ha2VzIGl0IGVhc2llciB0byBtYWtlIG1lbnUgYnV0dG9uc1xudmFyIGJ1dHRvbnMgPSBbXTtcblxudmFyIGNhbnZhcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNnYW1lJyk7XG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbnZhciBkcmF3QnV0dG9uID0gZnVuY3Rpb24oYnV0dG9uKSB7XG4gICAgaWYgKGJ1dHRvbi5pbWcpIHtcbiAgICAgICAgY3R4LmRyYXdJbWFnZShidXR0b24ueCwgYnV0dG9uLnksIGJ1dHRvbi53aWR0aCwgYnV0dG9uLmhlaWdodCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSAnd2hpdGUnO1xuICAgICAgICBjdHguc3Ryb2tlUmVjdChidXR0b24ueCwgYnV0dG9uLnksIGJ1dHRvbi53aWR0aCwgYnV0dG9uLmhlaWdodCk7XG4gICAgfVxuICAgIGlmIChidXR0b24udGV4dCkge1xuXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuICAgICAgICBjdHguZm9udCA9IGJ1dHRvbi5mb250O1xuICAgICAgICB2YXIgdGV4dERpbSA9IGN0eC5tZWFzdXJlVGV4dChidXR0b24udGV4dCk7XG4gICAgICAgIGN0eC5maWxsVGV4dChidXR0b24udGV4dCwgYnV0dG9uLnggKyAoYnV0dG9uLndpZHRoIC0gdGV4dERpbS53aWR0aCkgLyAyLCBidXR0b24ueSArIChidXR0b24uaGVpZ2h0ICsgMTApIC8gMik7XG4gICAgfVxufTtcblxuLy8gZGltID0gZGltZW5zaW9ucyA9IHt4LCB5LCB3aWR0aCwgaGVpZ2h0fSxcbi8vIHNjcmVlblN0YXRlOyB3aGVyZSB0aGUgYnV0dG9uIGlzIHZpc2libGVcbi8vIHRleHQgdG8gd3JpdGUgb24gYnV0dG9uLFxuLy8gaW1nIHRvIHB1dCBiZWhpbmQgdGV4dCAoaWYgdW5kZWZpbmVkLCBpdCdsbCBkcmF3IGEgd2hpdGUgYm9yZGVyIGFyb3VuZCB0aGUgYnV0dG9uIGFyZWEpXG52YXIgYWRkQnV0dG9uID0gZnVuY3Rpb24oZGltLCBzY3JlZW5TdGF0ZSwgb25jbGljaywgdGV4dCwgZm9udCwgaW1nKSB7XG4gICAgdmFyIGJ1dHRvbiA9IHt9O1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZGltKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYnV0dG9uW2tleXNbaV1dID0gZGltW2tleXNbaV1dO1xuICAgIH1cbiAgICBpZiAoYnV0dG9uLnggPT09ICdjZW50ZXInKSB7XG4gICAgICAgIGJ1dHRvbi54ID0gKGNhbnZhcy53aWR0aCAtIGJ1dHRvbi53aWR0aCkgLyAyO1xuICAgIH1cbiAgICBpZiAoYnV0dG9uLnkgPT09ICdjZW50ZXInKSB7XG4gICAgICAgIGJ1dHRvbi55ID0gKGNhbnZhcy5oZWlnaHQgLSBidXR0b24uaGVpZ2h0KSAvIDI7XG4gICAgfVxuICAgIGJ1dHRvbi5zY3JlZW5TdGF0ZSA9IHNjcmVlblN0YXRlIHx8ICdtZW51JztcbiAgICBidXR0b24ub25jbGljayA9IG9uY2xpY2s7XG4gICAgYnV0dG9uLnRleHQgPSB0ZXh0IHx8ICcnO1xuICAgIGJ1dHRvbi5mb250ID0gZm9udCB8fCAnMTJwdCBUZW1wZXN0YSBGaXZlJztcbiAgICBidXR0b24uaW1nID0gaW1nO1xuICAgIGJ1dHRvbnMucHVzaChidXR0b24pO1xufTtcblxudmFyIGRyYXdBbGwgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYnV0dG9uO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnV0dG9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICBidXR0b24gPSBidXR0b25zW2ldO1xuICAgICAgICBpZiAod2luZG93LnN0YXRlID09PSBidXR0b24uc2NyZWVuU3RhdGUpIHtcbiAgICAgICAgICAgIGRyYXdCdXR0b24oYnV0dG9uKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGRyYXdBbGw6IGRyYXdBbGwsXG4gICAgYWRkQnV0dG9uOiBhZGRCdXR0b25cbn07XG5cbnZhciBjaGVja0NsaWNrID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciB4ID0gZS5wYWdlWCAtIGNhbnZhcy5vZmZzZXRMZWZ0O1xuICAgIHZhciB5ID0gZS5wYWdlWSAtIGNhbnZhcy5vZmZzZXRUb3A7XG4gICAgdmFyIGJ1dHRvbjtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYnV0dG9uID0gYnV0dG9uc1tpXTtcbiAgICAgICAgaWYgKHggPj0gYnV0dG9uLnggJiYgeCA8PSBidXR0b24ueCArIGJ1dHRvbi53aWR0aCAmJlxuICAgICAgICAgICAgeSA+PSBidXR0b24ueSAmJiB5IDw9IGJ1dHRvbi55ICsgYnV0dG9uLmhlaWdodCkge1xuICAgICAgICAgICAgYnV0dG9uLm9uY2xpY2soKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxufTtcbmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGNoZWNrQ2xpY2ssIGZhbHNlKTsiLCJ2YXIgcGFydGljbGVzTW9kdWxlID0gcmVxdWlyZSgnLi9wYXJ0aWNsZXMnKTtcbnZhciBzaGFrZSA9IHJlcXVpcmUoJy4vc2NyZWVuc2hha2UnKTtcblxudmFyIHBsYXllckhpdEJveCA9IHtcbiAgICB4OiAzNzUsXG4gICAgeTogMjcwLFxuICAgIHdpZHRoOiA1MCxcbiAgICBoZWlnaHQ6IDYwXG59O1xudmFyIGFuZ2xlZENvbGxpc2lvbiA9IGZ1bmN0aW9uKHBsYXllciwgZm8pIHtcbiAgICB2YXIgY29sbGlkaW5nID0gZmFsc2U7XG4gICAgY29sbGlkaW5nID0gYWFiYihwbGF5ZXJIaXRCb3gsIGZvKTtcbiAgICByZXR1cm4gY29sbGlkaW5nO1xufTtcblxudmFyIGFhYmIgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgaWYgKFxuICAgICAgICBNYXRoLmFicyhhLnggKyBhLndpZHRoIC8gMiAtIGIueCAtIGIud2lkdGggLyAyKSA+IChhLndpZHRoICsgYi53aWR0aCkgLyAyIHx8XG4gICAgICAgIE1hdGguYWJzKGEueSArIGEuaGVpZ2h0IC8gMiAtIGIueSAtIGIuaGVpZ2h0IC8gMikgPiAoYS5oZWlnaHQgKyBiLmhlaWdodCkgLyAyXG4gICAgKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG52YXIgaW5BcmVhID0gZnVuY3Rpb24oYXJlYSwgYXJyYXksIHJlc3BDb2xsaWRpbmcsIHJlc3BOb3RDb2xsaWRpbmcpIHtcbiAgICB2YXIgcmV0ID0gW107XG4gICAgdmFyIGN1ckVsZW07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjdXJFbGVtID0gYXJyYXlbaV07XG4gICAgICAgIGlmIChhYWJiKGFyZWEsIGN1ckVsZW0pKSB7XG4gICAgICAgICAgICByZXQucHVzaChjdXJFbGVtKTtcbiAgICAgICAgICAgIGlmIChyZXNwQ29sbGlkaW5nKSB7XG4gICAgICAgICAgICAgICAgcmVzcENvbGxpZGluZyhjdXJFbGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChyZXNwTm90Q29sbGlkaW5nKSB7XG4gICAgICAgICAgICByZXNwTm90Q29sbGlkaW5nKGN1ckVsZW0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59O1xuXG52YXIgcGxheWVyQXJlYSA9IHtcbiAgICB4OiAzMjUsXG4gICAgeTogMjI1LFxuICAgIHdpZHRoOiAxNTAsXG4gICAgaGVpZ2h0OiAxNTBcbn07XG5cbnZhciBjYW1lcmEgPSB7XG4gICAgeDogLTQwMCxcbiAgICB5OiAtMzAwLFxuICAgIHdpZHRoOiAxNjAwLFxuICAgIGhlaWdodDogMTIwMFxufTtcblxudmFyIGV4cGxvZGVPYmogPSBmdW5jdGlvbihmbykge1xuICAgIHBhcnRpY2xlc01vZHVsZS5jcmVhdGVQYXJ0aWNsZXMoZm8ueCwgZm8ueSwgZm8uc3BlZWQsIDAuMDEsIGZvLndpZHRoICogZm8uaGVpZ2h0IC8gMTAwLCBbZm8uY29sb3JdLCB7XG4gICAgICAgIHJhbmdlOiBNYXRoLnJhbmRvbSgpICogMiAqIE1hdGguUEksXG4gICAgICAgIG5vQ29sbGlkZTogdHJ1ZSxcbiAgICAgICAgZHg6IGZvLmR4LFxuICAgICAgICBkeTogZm8uZHlcbiAgICB9KTtcbn07XG5cbnZhciBjaGVjayA9IGZ1bmN0aW9uKHBsYXllciwgZm9Nb2R1bGUpIHtcbiAgICAvLyBmbyBzdGFuZHMgZm9yIGZseWluZ09iamVjdHNcbiAgICB2YXIgcGFydGljbGVzID0gcGFydGljbGVzTW9kdWxlLmFycmF5O1xuICAgIHZhciBmb3MgPSBmb01vZHVsZS5hcnJheTtcbiAgICAvLyBNYW5hZ2UgZmx5aW5nIG9iamVjdCBzcGF3bmluZ1xuICAgIHZhciBmb0luVmlldyA9IGluQXJlYShjYW1lcmEsIGZvcywgdW5kZWZpbmVkLCBmdW5jdGlvbihmbykge1xuICAgICAgICBmby5hbGl2ZSA9IGZhbHNlO1xuICAgIH0pO1xuICAgIGlmIChmb0luVmlldy5sZW5ndGggPCAzMCkge1xuICAgICAgICBmb01vZHVsZS5zcGF3bihNYXRoLnJhbmRvbSgpICogMTAwKTtcbiAgICB9XG5cbiAgICAvLyBDb2xsaXNpb25zIGJldHdlZW4gdGhlIHBsYXllciBhbmQgcm9ja3NcbiAgICB2YXIgZm9Ub1Rlc3QgPSBpbkFyZWEocGxheWVyQXJlYSwgZm9zKTtcbiAgICB2YXIgZm87XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmb1RvVGVzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICBmbyA9IGZvVG9UZXN0W2ldO1xuICAgICAgICBpZiAoYW5nbGVkQ29sbGlzaW9uKHBsYXllciwgZm8pKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnSElUJyk7XG4gICAgICAgICAgICBmby5hbGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKGZvLmltYWdlID09PSAncG93ZXItaWNvbi5wbmcnKSB7XG4gICAgICAgICAgICAgICAgYXVkaW8ucGxheSgnY29sbGVjdCcpO1xuICAgICAgICAgICAgICAgIHBsYXllci5mdWVsICs9IDEwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYXVkaW8ucGxheSgnY29sbGlkZScpO1xuICAgICAgICAgICAgICAgIHBsYXllci5oaXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHBsYXllci5oZWFsdGggLT0gKGZvLndpZHRoICogZm8uaGVpZ2h0KSAvIDEwMDtcbiAgICAgICAgICAgICAgICBleHBsb2RlT2JqKGZvKTtcbiAgICAgICAgICAgICAgICBzaGFrZSg1KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciBjb2xsaXNpb25zIGJldHdlZW4gcGFydGljbGVzIGFuZCBmb1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydGljbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChwYXJ0aWNsZXNbaV0ubm9Db2xsaWRlKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpbkFyZWEocGFydGljbGVzW2ldLCBmb3MsIGZ1bmN0aW9uKGZvKSB7XG4gICAgICAgICAgICBpZiAocGFydGljbGVzW2ldLmFsaXZlICYmICFmby5nb29kKSB7XG4gICAgICAgICAgICAgICAgZm8uYWxpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBhdWRpby5wbGF5KCdleHBsb2RlX21ldGVvcicpO1xuICAgICAgICAgICAgICAgIHBsYXllci5zY29yZSArPSAoZm8ud2lkdGggKiBmby5oZWlnaHQpIC8gMTAwO1xuICAgICAgICAgICAgICAgIGV4cGxvZGVPYmooZm8pO1xuICAgICAgICAgICAgICAgIHNoYWtlKDIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjaGVjazogY2hlY2tcbn07IiwidmFyIHBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyJyk7XG52YXIga2V5cyA9IHt9O1xudmFyIEMgPSB7XG4gICAgU1BBQ0U6IDMyLFxuICAgIExFRlQ6IDM3LFxuICAgIFVQOiAzOCxcbiAgICBSSUdIVDogMzksXG4gICAgRE9XTjogNDBcbn1cbmRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAoZS5rZXlDb2RlID09PSBDLlNQQUNFKSB7XG4gICAgICAgIHBsYXllci5mbGlwKCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZS5rZXlDb2RlID49IDM3ICYmIGUua2V5Q29kZSA8PSA0MCkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuICAgIGtleXNbZS5rZXlDb2RlXSA9IHRydWU7XG59KTtcbmRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdGlvbihlKSB7XG4gICAga2V5c1tlLmtleUNvZGVdID0gZmFsc2U7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbGVmdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzW0MuTEVGVF07XG4gICAgfSxcbiAgICB1cDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzW0MuVVBdO1xuICAgIH0sXG4gICAgcmlnaHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1tDLlJJR0hUXTtcbiAgICB9LFxuICAgIGRvd246IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1tDLkRPV05dO1xuICAgIH0sXG4gICAgZmxpcDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzW0MuU1BBQ0VdO1xuICAgIH1cbn07XG4iLCJ2YXIgaW1hZ2VOYW1lcyA9IFtcbiAgICAnYXN0cm8ucG5nJyxcbiAgICAnYXN0cm8tZmx5aW5nLnBuZycsXG4gICAgJ2hlYWx0aC1iYXItaWNvbi5wbmcnLFxuICAgICdsb2dvLnBuZycsXG4gICAgJ3Bvd2VyLWJhci1pY29uLnBuZycsXG4gICAgJ3Bvd2VyLWljb24ucG5nJyxcbiAgICAncm9jay01LnBuZycsXG4gICAgJ3JvY2stYWx0LTUucG5nJyxcbiAgICAncm9jay1vZGQtMS5wbmcnLFxuICAgICdyb2NrLW9kZC0zLnBuZydcbl07XG5cbnZhciBpbWFnZXMgPSB7fTtcbnZhciBsb2FkZWQgPSAwO1xudmFyIGRvbmUgPSBmdW5jdGlvbihjYikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW1hZ2VOYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpbWFnZXNbaW1hZ2VOYW1lc1tpXV0gPSBuZXcgSW1hZ2UoKTtcbiAgICAgICAgaW1hZ2VzW2ltYWdlTmFtZXNbaV1dLnNyYyA9ICdpbWFnZXMvJyArIGltYWdlTmFtZXNbaV07XG4gICAgICAgIGltYWdlc1tpbWFnZU5hbWVzW2ldXS5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGxvYWRlZCsrO1xuICAgICAgICAgICAgaWYgKGxvYWRlZCA9PT0gaW1hZ2VOYW1lcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjYigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbGlzdDogaW1hZ2VOYW1lcyxcbiAgICBpbWFnZXM6IGltYWdlcyxcbiAgICBkb25lOiBkb25lLFxuICAgIGdldDogZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGltYWdlTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChpbWFnZU5hbWVzW2ldLmluZGV4T2Yoc3RyaW5nKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICByZXQucHVzaChpbWFnZU5hbWVzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cbn07IiwidmFyIGxvYWRlciA9IHJlcXVpcmUoJy4vbG9hZGVyJyk7XG52YXIgdGV4dCA9IHJlcXVpcmUoJy4vdGV4dCcpO1xudmFyIGJ1dHRvbnMgPSByZXF1aXJlKCcuL2J1dHRvbnMnKTtcblxuYnV0dG9ucy5hZGRCdXR0b24oXG4gICAge1xuICAgICAgICB4OiAnY2VudGVyJyxcbiAgICAgICAgeTogMzAwLFxuICAgICAgICB3aWR0aDogMjAwLFxuICAgICAgICBoZWlnaHQ6IDUwXG4gICAgfSxcbiAgICAnbWVudScsXG4gICAgZnVuY3Rpb24oKSB7XG4gICAgICAgIHdpbmRvdy5zdGF0ZSA9ICdnYW1lJztcbiAgICB9LFxuICAgICdDbGljayB0byBwbGF5JyxcbiAgICAnMTJwdCBUZW1wZXN0YSBGaXZlJ1xuKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZHJhd01lbnU6IGZ1bmN0aW9uKGN0eCkge1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJyMwZjBkMjAnO1xuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgODAwLCA2MDApO1xuXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1snbG9nby5wbmcnXSwgMzE0LCAxODApO1xuICAgICAgICAvLyB0ZXh0LndyaXRlKCdDTElDSyBUTyBQTEFZJywgJ2NlbnRlcicsIDMzMCk7XG4gICAgICAgIHRleHQud3JpdGUoJ0EgR0FNRSBCWScsICdjZW50ZXInLCA1MDApO1xuICAgICAgICB0ZXh0LndyaXRlKCdAQU1BQU5DIEFORCBATUlLRURJRFRISVMnLCAnY2VudGVyJywgNTIwLCBmdW5jdGlvbihjdHgpIHtcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnI0RDRkNGOSc7XG4gICAgICAgICAgICBjdHguZm9udCA9ICcxMnB0IFRlbXBlc3RhIEZpdmUnO1xuICAgICAgICB9KTtcblxuICAgIH0sXG4gICAgZHJhd0VuZDogZnVuY3Rpb24oY3R4LCBzY29yZSkge1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJyMwZjBkMjAnO1xuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgODAwLCA2MDApO1xuICAgICAgICB0ZXh0LndyaXRlKCdUaGUgZW5kISBZb3Ugc2NvcmVkICcgKyBNYXRoLnJvdW5kKHNjb3JlKSArICcgcG9pbnRzIScsICdjZW50ZXInLCAzMDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG4gICAgICAgICAgICBjdHguZm9udCA9ICcyNnB0IFRlbXBlc3RhIEZpdmUnO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC53cml0ZSgnQ2xpY2sgdG8gcGxheSBhZ2FpbicsICdjZW50ZXInLCA1MDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG4gICAgICAgICAgICBjdHguZm9udCA9ICcyMnB0IFRlbXBlc3RhIEZpdmUnO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGluZ2FtZTogZnVuY3Rpb24gKGN0eCwgZnVlbCwgaGVhbHRoLCBzY29yZSkge1xuICAgICAgICBjdHguZHJhd0ltYWdlKGxvYWRlci5pbWFnZXNbJ3Bvd2VyLWJhci1pY29uLnBuZyddLCAzMCwgNTAwKTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICdvcmFuZ2UnO1xuICAgICAgICBjdHguZmlsbFJlY3QoMzAsIDQ5MCAtIGZ1ZWwsIDIwLCBmdWVsKTtcblxuICAgICAgICBjdHguZHJhd0ltYWdlKGxvYWRlci5pbWFnZXNbJ2hlYWx0aC1iYXItaWNvbi5wbmcnXSwgNzAsIDUwMCk7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAncmVkJztcbiAgICAgICAgY3R4LmZpbGxSZWN0KDcwLCA0OTAgLSBoZWFsdGgsIDIwLCBoZWFsdGgpO1xuXG4gICAgICAgIHRleHQud3JpdGUoJ1Njb3JlOiAnICsgTWF0aC5yb3VuZChzY29yZSksIDIwLCA1NTAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY3R4LmZvbnQgPSAnMTJwdCBUZW1wZXN0YSBGaXZlJztcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuICAgICAgICB9KTtcbiAgICB9XG59OyIsInZhciBwYXJ0aWNsZXMgPSBbXTtcbnZhciBXID0gNywgSCA9IDc7XG52YXIgREVDX1JBVEUgPSAwLjE7IC8vIERlZmF1bHQgZGVjcmVhc2UgcmF0ZS4gSGlnaGVyIHJhdGUgLT4gcGFydGljbGVzIGdvIGZhc3RlclxudmFyIFBhcnRpY2xlID0gZnVuY3Rpb24oeCwgeSwgc3BlZWQsIGRlY1JhdGUsIGNvbG9ycykge1xuICAgIHRoaXMuYWxpdmUgPSB0cnVlO1xuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgICB0aGlzLmR4ID0gdGhpcy5keSA9IDA7XG4gICAgdGhpcy53aWR0aCA9IFc7XG4gICAgdGhpcy5oZWlnaHQgPSBIO1xuICAgIHRoaXMuYW5nbGUgPSAwO1xuICAgIHRoaXMuc3BlZWQgPSBzcGVlZDtcbiAgICB0aGlzLm9wYWNpdHkgPSAxO1xuICAgIHRoaXMuZGVjUmF0ZSA9IGRlY1JhdGUgfHwgREVDX1JBVEU7XG4gICAgdGhpcy5kZWxheSA9IE1hdGguY2VpbChNYXRoLnJhbmRvbSgpICogMTApO1xuICAgIGlmIChjb2xvcnMpIHtcbiAgICAgICAgdGhpcy5jb2xvciA9IGNvbG9yc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjb2xvcnMubGVuZ3RoKV07XG4gICAgfVxuICAgIHRoaXMubG9vcCA9IGZ1bmN0aW9uKGN0eCwgcGxheWVyKSB7XG4gICAgICAgIGlmICh0aGlzLmRlbGF5ID4gMCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGVsYXkgPD0gMSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYW5nbGUgPSBwbGF5ZXIuYW5nbGUgLSB0aGlzLnJhbmdlICsgKE1hdGgucmFuZG9tKCkgKiAyICogdGhpcy5yYW5nZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmRlbGF5LS07XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy54ICs9IHRoaXMuZHggLSB3aW5kb3cucGxheWVyLm9mZnNldFggKyBNYXRoLnNpbigtdGhpcy5hbmdsZSkgKiBzcGVlZDtcbiAgICAgICAgdGhpcy55ICs9IHRoaXMuZHkgLSB3aW5kb3cucGxheWVyLm9mZnNldFkgKyBNYXRoLmNvcygtdGhpcy5hbmdsZSkgKiBzcGVlZDtcbiAgICAgICAgdGhpcy5vcGFjaXR5IC09IHRoaXMuZGVjUmF0ZTtcbiAgICAgICAgaWYgKHRoaXMub3BhY2l0eSA8PSAwKSB7XG4gICAgICAgICAgICB0aGlzLm9wYWNpdHkgPSAwO1xuICAgICAgICAgICAgdGhpcy5hbGl2ZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vIERyYXdcbiAgICAgICAgY3R4LnNhdmUoKTtcbiAgICAgICAgY3R4Lmdsb2JhbEFscGhhID0gdGhpcy5vcGFjaXR5O1xuICAgICAgICBjdHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gJ2xpZ2h0ZXInO1xuICAgICAgICBjdHgudHJhbnNsYXRlKHRoaXMueCwgdGhpcy55KTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuY29sb3IgfHwgJ3JlZCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCBXLCBIKTtcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICB9O1xufTtcblxuLy8geCwgeSBhcmUgZml4ZWRcbi8vIFBhcnRpY2xlcyBhcmUgY3JlYXRlZCBmcm9tIGFuZ2xlLXJhbmdlIHRvIGFuZ2xlK3JhbmdlXG4vLyBzcGVlZCBpcyBmaXhlZFxudmFyIGFuZ2xlID0gMDtcbnZhciBjcmVhdGVQYXJ0aWNsZXMgPSBmdW5jdGlvbih4LCB5LCBzcGVlZCwgZGVjUmF0ZSwgbiwgY29sb3JzLCBwcm9wcykge1xuICAgIC8vIGNvbnNvbGUubG9nKCdDcmVhdGluZycsIHBhcnRpY2xlcyk7XG4gICAgdmFyIGNyZWF0ZWQgPSAwLCBpID0gMDtcbiAgICB2YXIgcGFydGljbGU7XG4gICAgd2hpbGUoY3JlYXRlZCA8IG4pIHtcbiAgICAgICAgcGFydGljbGUgPSBwYXJ0aWNsZXNbaV07XG4gICAgICAgIGlmIChwYXJ0aWNsZSAmJiAhcGFydGljbGUuYWxpdmUgfHwgIXBhcnRpY2xlKSB7XG4gICAgICAgICAgICBwYXJ0aWNsZXNbaV0gPSBuZXcgUGFydGljbGUoeCwgeSwgc3BlZWQsIGRlY1JhdGUsIGNvbG9ycyk7XG4gICAgICAgICAgICBjcmVhdGVkKys7XG4gICAgICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHByb3BzKTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwga2V5cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHBhcnRpY2xlc1tpXVtrZXlzW2pdXSA9IHByb3BzW2tleXNbal1dO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUG9zc2libGUgcHJvcHM6IHJhbmdlLCBub0NvbGxpZGUsIGR4LCBkeSwgY29sb3JcbiAgICAgICAgfVxuICAgICAgICBpKys7XG4gICAgfVxufTtcblxudmFyIGRyYXcgPSBmdW5jdGlvbihlbGFwc2VkLCBjdHgsIHBsYXllcikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydGljbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHBhcnRpY2xlc1tpXS5sb29wKGN0eCwgcGxheWVyKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjcmVhdGVQYXJ0aWNsZXM6IGNyZWF0ZVBhcnRpY2xlcyxcbiAgICBkcmF3OiBkcmF3LFxuICAgIGFycmF5OiBwYXJ0aWNsZXMsXG4gICAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBwYXJ0aWNsZXMubGVuZ3RoID0gMDtcbiAgICB9XG59O1xuIiwidmFyIHdoaXRlbiA9IHJlcXVpcmUoJy4vd2hpdGVuJyk7XG52YXIgY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2dhbWUnKTtcblxud2luZG93LnBsYXllciA9IHt9O1xuXG5wbGF5ZXIuaWRsZSA9IG5ldyBJbWFnZSgpO1xucGxheWVyLmlkbGUuc3JjID0gJ2ltYWdlcy9hc3Ryby5wbmcnO1xucGxheWVyLmlkbGUubmFtZSA9ICdhc3Ryby5wbmcnO1xucGxheWVyLmZseWluZyA9IG5ldyBJbWFnZSgpO1xucGxheWVyLmZseWluZy5zcmMgPSAnaW1hZ2VzL2FzdHJvLWZseWluZy5wbmcnO1xucGxheWVyLmZseWluZy5uYW1lID0gJ2FzdHJvLWZseWluZy5wbmcnO1xucGxheWVyLnN0YXRlID0gJ2lkbGUnO1xuXG52YXIgcGxheWVyRGVmYXVsdHMgPSB7XG4gICAgc2NvcmU6IDAsXG4gICAgYW5nbGU6IDAsXG4gICAgb2Zmc2V0WTogMCxcbiAgICBvZmZzZXRYOiAwLFxuICAgIGhlYWx0aDogMTAwLFxuICAgIGZ1ZWw6IDEwMCxcbiAgICBoaXQ6IGZhbHNlXG59O1xuXG5wbGF5ZXIud2lkdGggPSA1MjtcbnBsYXllci5oZWlnaHQgPSA2MDtcbnBsYXllci54ID0gKGNhbnZhcy53aWR0aCAtIHBsYXllci53aWR0aCkgLyAyO1xucGxheWVyLnkgPSAoY2FudmFzLmhlaWdodCAtIHBsYXllci5oZWlnaHQpIC8gMjtcbnBsYXllci5hbmdsZSA9IDA7XG5cbnBsYXllci5vZmZzZXRYID0gcGxheWVyLm9mZnNldFkgPSAwO1xuXG5cbi8vIEhhbGYgd2lkdGgsIGhhbGYgaGVpZ2h0XG52YXIgaFcgPSBwbGF5ZXIud2lkdGggLyAyO1xudmFyIGhIID0gcGxheWVyLmhlaWdodCAvIDI7XG5cbnZhciBzcGVlZCA9IDA7IC8vIFRoZSBjdXJyZW50IHNwZWVkXG52YXIgZFNwZWVkO1xudmFyIGRYID0gMCwgZFkgPSAwO1xuXG4vLyBZT1UgQ0FOIENPTkZJR1VSRSBUSEVTRSEgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbnZhciBhY2MgPSA3OyAvLyBBY2NlbGVyYXRpb25cbnZhciBsaW0gPSAxMDsgLy8gU3BlZWQgbGltaXRcbnZhciB0dXJuU3BlZWQgPSAyLjI7XG52YXIgZ3JhdiA9IDAuMDM7XG4vLyBOTyBNT1JFIENPTkZJR1VSSU5HISAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXG5cbnBsYXllci5yZXNldCA9IGZ1bmN0aW9uKCkge1xuICAgIGRYID0gZFkgPSBzcGVlZCA9IGRTcGVlZCA9IDA7XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhwbGF5ZXJEZWZhdWx0cyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHBsYXllcltrZXlzW2ldXSA9IHBsYXllckRlZmF1bHRzW2tleXNbaV1dO1xuICAgIH1cbiAgICBwbGF5ZXIubW92ZSgpO1xufTtcbnBsYXllci5ncmF2aXR5ID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIGRZIC09IGdyYXY7XG59O1xucGxheWVyLm1vdmUgPSBmdW5jdGlvbihlbGFwc2VkLCBmbHlpbmcpIHtcbiAgICBwbGF5ZXIub2Zmc2V0WCA9IGRYO1xuICAgIHBsYXllci5vZmZzZXRZID0gLWRZO1xuICAgIGRYICo9IDAuOTk7XG4gICAgZFkgKj0gMC45OTtcblxuICAgIGlmICghZmx5aW5nKSB7XG4gICAgICAgIHBsYXllci5zdGF0ZSA9ICdpZGxlJztcbiAgICB9XG59O1xucGxheWVyLnVwID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5mdWVsIC09IDAuMjtcbiAgICBwbGF5ZXIuc3RhdGUgPSAnZmx5aW5nJztcbiAgICBzcGVlZCArPSBhY2M7XG4gICAgZFNwZWVkID0gZWxhcHNlZCAqIHNwZWVkO1xuICAgIC8vIGNvbnNvbGUubG9nKHBsYXllci54LCBwbGF5ZXIueSk7XG4gICAgLy8gY29uc29sZS5sb2coTWF0aC5zaW4ocGxheWVyLmFuZ2xlKSAqIGRTcGVlZCwgTWF0aC5jb3MocGxheWVyLmFuZ2xlKSAqIGRTcGVlZCk7XG4gICAgZFggKz0gTWF0aC5zaW4ocGxheWVyLmFuZ2xlKSAqIGRTcGVlZDtcbiAgICBkWSArPSBNYXRoLmNvcyhwbGF5ZXIuYW5nbGUpICogZFNwZWVkO1xuICAgIHBsYXllci5tb3ZlKGVsYXBzZWQsIHRydWUpO1xuICAgIGlmIChzcGVlZCA+IGxpbSkge1xuICAgICAgICBzcGVlZCA9IGxpbTtcbiAgICB9XG4gICAgZWxzZSBpZiAoc3BlZWQgPCAtbGltKSB7XG4gICAgICAgIHNwZWVkID0gLWxpbTtcbiAgICB9XG5cbn07XG5wbGF5ZXIucmlnaHQgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgcGxheWVyLmFuZ2xlICs9IGVsYXBzZWQgKiB0dXJuU3BlZWQgKiBNYXRoLlBJO1xufTtcbnBsYXllci5sZWZ0ID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5hbmdsZSAtPSBlbGFwc2VkICogdHVyblNwZWVkICogTWF0aC5QSTtcbn07XG5wbGF5ZXIuZmxpcCA9IGZ1bmN0aW9uKCkge1xuICAgIHBsYXllci5hbmdsZSArPSBNYXRoLlBJO1xufTtcblxuXG52YXIgdGlja3MgPSAwO1xucGxheWVyLmRyYXcgPSBmdW5jdGlvbihlbGFwc2VkLCBjdHgpIHtcbiAgICAvLyBQbGF5ZXJcbiAgICBjdHguc2F2ZSgpO1xuICAgIGN0eC50cmFuc2xhdGUocGxheWVyLnggKyBoVywgcGxheWVyLnkgKyBoSCk7XG4gICAgY3R4LnJvdGF0ZShwbGF5ZXIuYW5nbGUpO1xuICAgIC8vIHBsYXllci5oaXQgaXMgc2V0IGluIGNvbGxpc2lvbnMuanNcbiAgICAvLyBJZiB0aGUgcGxheWVyJ3MgYmVlbiBoaXQsIHdlIHdhbnQgaXQgdG8gZmxhc2ggd2hpdGUgdG8gaW5kaWNhdGUgdGhhdFxuICAgIGlmIChwbGF5ZXIuaGl0KSB7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2Uod2hpdGVuKHBsYXllcltwbGF5ZXIuc3RhdGVdLm5hbWUsICdwaW5rJyksIC1oVywgLWhIKTtcbiAgICAgICAgdGlja3MrKztcbiAgICAgICAgaWYgKHRpY2tzID49IDgpIHtcbiAgICAgICAgICAgIHBsYXllci5oaXQgPSBmYWxzZTtcbiAgICAgICAgICAgIHRpY2tzID0gMDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY3R4LmRyYXdJbWFnZShwbGF5ZXJbcGxheWVyLnN0YXRlXSwgLWhXLCAtaEgpO1xuICAgIH1cbiAgICBjdHgucmVzdG9yZSgpO1xuXG59O1xuXG5wbGF5ZXIucmVzZXQoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBwbGF5ZXI7XG4iLCIvLyBIb2xkcyBsYXN0IGl0ZXJhdGlvbiB0aW1lc3RhbXAuXG52YXIgdGltZSA9IDA7XG5cbi8qKlxuICogQ2FsbHMgYGZuYCBvbiBuZXh0IGZyYW1lLlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiBUaGUgZnVuY3Rpb25cbiAqIEByZXR1cm4ge2ludH0gVGhlIHJlcXVlc3QgSURcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiByYWYoZm4pIHtcbiAgcmV0dXJuIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgdmFyIGVsYXBzZWQgPSBub3cgLSB0aW1lO1xuXG4gICAgaWYgKGVsYXBzZWQgPiA5OTkpIHtcbiAgICAgIGVsYXBzZWQgPSAxIC8gNjA7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsYXBzZWQgLz0gMTAwMDtcbiAgICB9XG5cbiAgICB0aW1lID0gbm93O1xuICAgIGZuKGVsYXBzZWQpO1xuICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIC8qKlxuICAgKiBDYWxscyBgZm5gIG9uIGV2ZXJ5IGZyYW1lIHdpdGggYGVsYXBzZWRgIHNldCB0byB0aGUgZWxhcHNlZFxuICAgKiB0aW1lIGluIG1pbGxpc2Vjb25kcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuIFRoZSBmdW5jdGlvblxuICAgKiBAcmV0dXJuIHtpbnR9IFRoZSByZXF1ZXN0IElEXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzdGFydDogZnVuY3Rpb24oZm4pIHtcbiAgICByZXR1cm4gcmFmKGZ1bmN0aW9uIHRpY2soZWxhcHNlZCkge1xuICAgICAgZm4oZWxhcHNlZCk7XG4gICAgICByYWYodGljayk7XG4gICAgfSk7XG4gIH0sXG4gIC8qKlxuICAgKiBDYW5jZWxzIHRoZSBzcGVjaWZpZWQgYW5pbWF0aW9uIGZyYW1lIHJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSB7aW50fSBpZCBUaGUgcmVxdWVzdCBJRFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgc3RvcDogZnVuY3Rpb24oaWQpIHtcbiAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoaWQpO1xuICB9XG59O1xuIiwidmFyIGNhbnZhcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNnYW1lJyk7XG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbnZhciBwb2xhcml0eSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpID4gMC41ID8gMSA6IC0xO1xufTtcblxuLy8gQW1vdW50IHdlJ3ZlIG1vdmVkIHNvIGZhclxudmFyIHRvdGFsWCA9IDA7XG52YXIgdG90YWxZID0gMDtcblxudmFyIHNoYWtlID0gZnVuY3Rpb24oaW50ZW5zaXR5KSB7XG4gICAgaWYgKHRvdGFsWCA9PT0gMCkge1xuICAgICAgICBjdHguc2F2ZSgpO1xuICAgIH1cbiAgICBpZiAoIWludGVuc2l0eSkge1xuICAgICAgICBpbnRlbnNpdHkgPSAyO1xuICAgIH1cbiAgICB2YXIgZFggPSBNYXRoLnJhbmRvbSgpICogaW50ZW5zaXR5ICogcG9sYXJpdHkoKTtcbiAgICB2YXIgZFkgPSBNYXRoLnJhbmRvbSgpICogaW50ZW5zaXR5ICogcG9sYXJpdHkoKTtcbiAgICB0b3RhbFggKz0gZFg7XG4gICAgdG90YWxZICs9IGRZO1xuXG4gICAgLy8gQnJpbmcgdGhlIHNjcmVlbiBiYWNrIHRvIGl0cyB1c3VhbCBwb3NpdGlvbiBldmVyeSBcIjIgaW50ZW5zaXR5XCIgc28gYXMgbm90IHRvIGdldCB0b28gZmFyIGF3YXkgZnJvbSB0aGUgY2VudGVyXG4gICAgaWYgKGludGVuc2l0eSAlIDIgPCAwLjIpIHtcbiAgICAgICAgY3R4LnRyYW5zbGF0ZSgtdG90YWxYLCAtdG90YWxZKTtcbiAgICAgICAgdG90YWxYID0gdG90YWxZID0gMDtcbiAgICAgICAgaWYgKGludGVuc2l0eSA8PSAwLjE1KSB7XG4gICAgICAgICAgICBjdHgucmVzdG9yZSgpOyAvLyBKdXN0IHRvIG1ha2Ugc3VyZSBpdCBnb2VzIGJhY2sgdG8gbm9ybWFsXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjdHgudHJhbnNsYXRlKGRYLCBkWSk7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgc2hha2UoaW50ZW5zaXR5IC0gMC4xKTtcbiAgICB9LCA1KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gc2hha2U7IiwidmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdjYW52YXMnKVswXTtcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbm1vZHVsZS5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24odGV4dCwgeCwgeSwgcHJlRnVuYywgc3Ryb2tlKXtcbiAgICBjdHguc2F2ZSgpO1xuICAgIGlmIChwcmVGdW5jKSB7XG4gICAgICAgIHByZUZ1bmMoY3R4KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuICAgICAgICBjdHguZm9udCA9ICcxMnB0IFRlbXBlc3RhIEZpdmUnO1xuICAgIH1cblxuICAgIHZhciB4UG9zID0geDtcbiAgICBpZiAoeCA9PT0gJ2NlbnRlcicpIHtcbiAgICAgICAgeFBvcyA9IChjYW52YXMud2lkdGggLSBjdHgubWVhc3VyZVRleHQodGV4dCkud2lkdGgpIC8gMjtcbiAgICB9XG5cbiAgICBpZiAoc3Ryb2tlKSB7XG4gICAgICAgIGN0eC5zdHJva2VUZXh0KHRleHQsIHhQb3MsIHkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY3R4LmZpbGxUZXh0KHRleHQsIHhQb3MsIHkpO1xuICAgIH1cbiAgICBjdHgucmVzdG9yZSgpO1xufTsiLCIvLyB1Zm9zLmpzXG4vLyBUaGlzIGZpbGUgZGVmaW5lcyBiZWhhdmlvciBmb3IgYWxsIHRoZSB1bmlkZW50aWZpZWQgZmx5aW5nIG9iamVjdHNcbi8vIEkgZ3Vlc3MgdGhleSAqYXJlKiBpZGVudGlmaWVkLCB0ZWNobmljYWxseS5cbi8vIEJ1dCB1Zm9zLmpzIGlzIGNvb2xlciB0aGFuIGlmb3MuanNcbi8vIEFzdGVyb2lkcyBhbmQgaGVhbHRoIC8gZnVlbCBwaWNrdXBzIGNvdW50IGFzIFVGT3NcblxudmFyIGZseWluZ09iamVjdHMgPSBbXTtcblxudmFyIGxvYWRlciA9IHJlcXVpcmUoJy4vbG9hZGVyLmpzJyk7XG5cbnZhciBybmQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKTtcbn07XG52YXIgY2hvb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50c1tNYXRoLmZsb29yKHJuZCgpICogYXJndW1lbnRzLmxlbmd0aCldO1xufTtcblxudmFyIFNQQVdOX1JBTkdFID0gMTAwO1xudmFyIE1JTl9TUEVFRCA9IDAuMywgTUFYX1NQRUVEID0gMjtcbnZhciBXSURUSCA9IDgwMCwgSEVJR0hUID0gNjAwO1xuXG52YXIgc3Bhd24gPSBmdW5jdGlvbihuKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ1NwYXduZWQgZmx5aW5nT2JqZWN0czonLCBuKTtcbiAgICB2YXIgb2JqLCB0YXJnZXRZLCB0YXJnZXRYO1xuICAgIHZhciBzaWduWCwgc2lnblksIHBvc1gsIHBvc1k7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgb2JqID0ge1xuICAgICAgICAgICAgeDogKHJuZCgpICogV0lEVEgpLFxuICAgICAgICAgICAgeTogKHJuZCgpICogSEVJR0hUKSxcbiAgICAgICAgICAgIHNwZWVkOiBybmQoKSAqIChNQVhfU1BFRUQgLSBNSU5fU1BFRUQpICsgTUlOX1NQRUVELFxuICAgICAgICAgICAgaW1hZ2U6IGNob29zZS5hcHBseSh0aGlzLCBsb2FkZXIuZ2V0KCdyb2NrJykuY29uY2F0KGxvYWRlci5nZXQoJ3Bvd2VyLWljb24nKSkpLFxuICAgICAgICAgICAgYWxpdmU6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgdGFyZ2V0WSA9IHJuZCgpICogV0lEVEg7XG4gICAgICAgIHRhcmdldFggPSBybmQoKSAqIEhFSUdIVDtcbiAgICAgICAgb2JqLmFuZ2xlID0gcm5kKCkgKiBNYXRoLlBJICogMjtcbiAgICAgICAgb2JqLmdvb2QgPSBvYmouaW1hZ2UuaW5kZXhPZigncm9jaycpID49IDAgPyBmYWxzZSA6IHRydWU7XG4gICAgICAgIG9iai53aWR0aCA9IGxvYWRlci5pbWFnZXNbb2JqLmltYWdlXS53aWR0aDtcbiAgICAgICAgb2JqLmhlaWdodCA9IGxvYWRlci5pbWFnZXNbb2JqLmltYWdlXS5oZWlnaHQ7XG4gICAgICAgIG9iai5keCA9IE1hdGguY29zKG9iai5hbmdsZSkgKiBvYmouc3BlZWQ7XG4gICAgICAgIG9iai5keSA9IE1hdGguc2luKG9iai5hbmdsZSkgKiBvYmouc3BlZWQ7XG5cbiAgICAgICAgaWYgKCFvYmouZ29vZCkge1xuICAgICAgICAgICAgb2JqLmNvbG9yID0gb2JqLmltYWdlLmluZGV4T2YoJ2FsdCcpIDwgMCA/ICcjNTI0QzRDJyA6ICcjYTc4MjU4JztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChybmQoKSA+IDAuNSkge1xuICAgICAgICAgICAgb2JqLnggKz0gY2hvb3NlKC0xLCAxKSAqIChXSURUSCArIG9iai53aWR0aCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvYmoueSArPSBjaG9vc2UoLTEsIDEpICogKEhFSUdIVCArIG9iai5oZWlnaHQpO1xuICAgICAgICB9XG4gICAgICAgIGZseWluZ09iamVjdHMucHVzaChvYmopO1xuICAgIH1cbn07XG5cbnZhciBsb29wID0gZnVuY3Rpb24oZWxhcHNlZCwgY3R4LCBvZmZzZXRYLCBvZmZzZXRZKSB7XG4gICAgdmFyIG9iajtcbiAgICBmb3IgKHZhciBpID0gZmx5aW5nT2JqZWN0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICBvYmogPSBmbHlpbmdPYmplY3RzW2ldO1xuICAgICAgICBpZiAob2JqLmFsaXZlKSB7XG4gICAgICAgICAgICBvYmoueCArPSBvYmouZHggLSBvZmZzZXRYO1xuICAgICAgICAgICAgb2JqLnkgKz0gb2JqLmR5IC0gb2Zmc2V0WTtcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAncmVkJztcbiAgICAgICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1tvYmouaW1hZ2VdLCBvYmoueCwgb2JqLnkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZmx5aW5nT2JqZWN0cy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxvb3A6IGxvb3AsXG4gICAgYXJyYXk6IGZseWluZ09iamVjdHMsXG4gICAgc3Bhd246IHNwYXduLFxuICAgIHJlc2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgZmx5aW5nT2JqZWN0cy5sZW5ndGggPSAwO1xuICAgIH1cbn07IiwiLy8gVGhpcyBmaWxlIGV4cG9ydHMgYSBmdW5jdGlvbiB0aGF0IGxldHMgeW91IG1ha2UgaW1hZ2VzIFwiZmxhc2hcIiBtb21lbnRhcmlseS4gTGlrZSB0aGUgcGxheWVyIHdoZW4gaGUgZ2V0cyBoaXQgYnkgYW4gYXN0ZXJvaWRcbnZhciBsb2FkZXIgPSByZXF1aXJlKCcuL2xvYWRlcicpO1xudmFyIGltYWdlcyA9IGxvYWRlci5pbWFnZXM7XG5cbnZhciBjYWNoZSA9IHt9O1xudmFyIHdoaXRlbiA9IGZ1bmN0aW9uKGltZ05hbWUsIGNvbG9yKSB7XG4gICAgaWYgKGNhY2hlW2ltZ05hbWVdKSB7XG4gICAgICAgIHJldHVybiBjYWNoZVtpbWdOYW1lXTtcbiAgICB9XG4gICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgIHZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICB2YXIgaW1nID0gaW1hZ2VzW2ltZ05hbWVdO1xuXG4gICAgY2FudmFzLndpZHRoID0gaW1nLndpZHRoO1xuICAgIGNhbnZhcy5oZWlnaHQgPSBpbWcuaGVpZ2h0O1xuICAgIGN0eC5kcmF3SW1hZ2UoaW1nLCAwLCAwLCBpbWcud2lkdGgsIGltZy5oZWlnaHQpO1xuICAgIGN0eC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSAnc291cmNlLWF0b3AnO1xuICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvciB8fCAnd2hpdGUnO1xuICAgIGN0eC5maWxsUmVjdCgwLCAwLCBpbWcud2lkdGgsIGltZy5oZWlnaHQpO1xuICAgIGNhY2hlW2ltZ05hbWVdID0gY2FudmFzO1xuICAgIHJldHVybiBjYW52YXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHdoaXRlbjsiXX0=
