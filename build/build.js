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
        buttons.drawAll();
    });
});

// var changeState = function() {
//     if (window.state === 'menu') {
//         window.state = 'game';
//     }
//     else if (window.state === 'end') {
//         window.state = 'game';
//         player.score = 0;
//         player.reset();
//         particles.reset();
//         flyingObjects.reset();
//     }
// };

// canvas.addEventListener('click', changeState, false);
// document.body.addEventListener('keydown', function(e) {
//     if (e.keyCode === 13) {
//         changeState();
//     }
// }, false);

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
    console.log(x);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4vc3JjL21haW4iLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9hdWRpby5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL2J1dHRvbnMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9jb2xsaXNpb25zLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMva2V5cy5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL2xvYWRlci5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL21lbnVzLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvcGFydGljbGVzLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvcGxheWVyLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvcmFmLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvc2NyZWVuc2hha2UuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy90ZXh0LmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvdWZvcy5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL3doaXRlbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgbG9hZGVyID0gcmVxdWlyZSgnLi9sb2FkZXIuanMnKTtcblxudmFyIHJhZiA9IHJlcXVpcmUoJy4vcmFmJyk7XG52YXIgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcbnZhciBrZXkgPSByZXF1aXJlKCcuL2tleXMnKTtcbnZhciBwYXJ0aWNsZXMgPSByZXF1aXJlKCcuL3BhcnRpY2xlcycpO1xudmFyIGZseWluZ09iamVjdHMgPSByZXF1aXJlKCcuL3Vmb3MnKTtcbnZhciBjb2xsaXNpb25zID0gcmVxdWlyZSgnLi9jb2xsaXNpb25zJyk7XG52YXIgbWVudXMgPSByZXF1aXJlKCcuL21lbnVzJyk7XG52YXIgYnV0dG9ucyA9IHJlcXVpcmUoJy4vYnV0dG9ucycpO1xudmFyIGF1ZGlvID0gcmVxdWlyZSgnLi9hdWRpbycpO1xuXG52YXIgY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2dhbWUnKTtcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxudmFyIHNmeCA9IFsnY29sbGVjdCcsICdjb2xsaWRlJywgJ2V4cGxvZGVfbWV0ZW9yJywgJ2pldHBhY2snXTtcbmxvYWRlci5kb25lKGZ1bmN0aW9uKCkge1xuICAgIGF1ZGlvLm11dGUoKTsgLy8gQmVjYXVzZSBJIGRvbid0IHdhbnQgaXQgYXV0b3BsYXlpbmcgd2hpbGUgSSBkZXZlbG9wIGl0IVxuXG4gICAgd2luZG93LnN0YXRlID0gJ21lbnUnO1xuICAgIHJhZi5zdGFydChmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgICAgIGlmICh3aW5kb3cuc3RhdGUgPT09ICdtZW51Jykge1xuICAgICAgICAgICAgbWVudXMuZHJhd01lbnUoY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh3aW5kb3cuc3RhdGUgPT09ICdnYW1lJykge1xuICAgICAgICAgICAgcGxheWVyLmdyYXZpdHkoZWxhcHNlZCk7XG4gICAgICAgICAgICBpZiAoa2V5LnVwKCkgJiYgcGxheWVyLmZ1ZWwgPiAwKSB7XG4gICAgICAgICAgICAgICAgYXVkaW8ucGxheSgnamV0cGFjaycpO1xuICAgICAgICAgICAgICAgIHBsYXllci51cChlbGFwc2VkKTtcbiAgICAgICAgICAgICAgICBwYXJ0aWNsZXMuY3JlYXRlUGFydGljbGVzKHBsYXllci54ICsgcGxheWVyLndpZHRoIC8gMiwgcGxheWVyLnkgKyBwbGF5ZXIuaGVpZ2h0IC8gMiwgMTAsIDAuMSwgMTAsIFsnYmx1ZScsICdyZWQnXSwge1xuICAgICAgICAgICAgICAgICAgICByYW5nZTogTWF0aC5QSSAvIDEwXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGF1ZGlvLnBhdXNlKCdqZXRwYWNrJyk7XG4gICAgICAgICAgICAgICAgcGxheWVyLm1vdmUoZWxhcHNlZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChrZXkucmlnaHQoKSkge1xuICAgICAgICAgICAgICAgIHBsYXllci5yaWdodChlbGFwc2VkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChrZXkubGVmdCgpKSB7XG4gICAgICAgICAgICAgICAgcGxheWVyLmxlZnQoZWxhcHNlZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRoaXMgZnVuY3Rpb24gY2hlY2tzIGZvciBhbGwgcmVxdWlyZWQgY29sbGlzaW9ucywgYW5kIGNhbGxzIHRoZSBjb3JyZXNwb25kaW5nIGZ1bmN0aW9ucyBhZnRlciB0b29cbiAgICAgICAgICAgIGNvbGxpc2lvbnMuY2hlY2socGxheWVyLCBmbHlpbmdPYmplY3RzKTtcblxuICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIHNjcmVlblxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICcjMGYwZDIwJztcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCA4MDAsIDYwMCk7XG5cbiAgICAgICAgICAgIGZseWluZ09iamVjdHMubG9vcChlbGFwc2VkLCBjdHgsIHBsYXllci5vZmZzZXRYLCBwbGF5ZXIub2Zmc2V0WSk7XG4gICAgICAgICAgICBwYXJ0aWNsZXMuZHJhdyhlbGFwc2VkLCBjdHgsIHBsYXllcik7XG4gICAgICAgICAgICBwbGF5ZXIuZHJhdyhlbGFwc2VkLCBjdHgpO1xuICAgICAgICAgICAgbWVudXMuaW5nYW1lKGN0eCwgcGxheWVyLmZ1ZWwsIHBsYXllci5oZWFsdGgsIHBsYXllci5zY29yZSk7XG5cbiAgICAgICAgICAgIHBsYXllci5zY29yZSArPSAwLjE7XG5cbiAgICAgICAgICAgIGlmIChwbGF5ZXIuaGVhbHRoIDw9IDApIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cuc3RhdGUgPSAnZW5kJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh3aW5kb3cuc3RhdGUgPT09ICdlbmQnKSB7XG4gICAgICAgICAgICBhdWRpby5wYXVzZShzZngpO1xuICAgICAgICAgICAgbWVudXMuZHJhd0VuZChjdHgsIHBsYXllci5zY29yZSk7XG4gICAgICAgIH1cbiAgICAgICAgYnV0dG9ucy5kcmF3QWxsKCk7XG4gICAgfSk7XG59KTtcblxuLy8gdmFyIGNoYW5nZVN0YXRlID0gZnVuY3Rpb24oKSB7XG4vLyAgICAgaWYgKHdpbmRvdy5zdGF0ZSA9PT0gJ21lbnUnKSB7XG4vLyAgICAgICAgIHdpbmRvdy5zdGF0ZSA9ICdnYW1lJztcbi8vICAgICB9XG4vLyAgICAgZWxzZSBpZiAod2luZG93LnN0YXRlID09PSAnZW5kJykge1xuLy8gICAgICAgICB3aW5kb3cuc3RhdGUgPSAnZ2FtZSc7XG4vLyAgICAgICAgIHBsYXllci5zY29yZSA9IDA7XG4vLyAgICAgICAgIHBsYXllci5yZXNldCgpO1xuLy8gICAgICAgICBwYXJ0aWNsZXMucmVzZXQoKTtcbi8vICAgICAgICAgZmx5aW5nT2JqZWN0cy5yZXNldCgpO1xuLy8gICAgIH1cbi8vIH07XG5cbi8vIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGNoYW5nZVN0YXRlLCBmYWxzZSk7XG4vLyBkb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbihlKSB7XG4vLyAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTMpIHtcbi8vICAgICAgICAgY2hhbmdlU3RhdGUoKTtcbi8vICAgICB9XG4vLyB9LCBmYWxzZSk7XG4iLCJ2YXIgYXVkaW8gPSB3aW5kb3cuYXVkaW8gPSB7fTsgLy8gTWFkZSBpdCBhIGdsb2JhbCBzbyBJIGNhbiBlYXNpbHkgdGVzdFxudmFyIGVsZW1lbnRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnYXVkaW8nKTtcbnZhciBGQURFX1NQRUVEID0gMC4xO1xuXG5hdWRpby5tdXRlID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZWxlbWVudHNbaV0udm9sdW1lID0gMDtcbiAgICB9XG59O1xuYXVkaW8uc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGVsZW1lbnRzW2ldLnBhdXNlKCk7XG4gICAgfVxufTtcblxuYXVkaW8ucGxheSA9IGZ1bmN0aW9uIChuYW1lLCBzZWVrRnJvbSkge1xuICAgIHZhciBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobmFtZSk7XG4gICAgZWxlbS5jdXJyZW50VGltZSA9IHNlZWtGcm9tIHx8IDA7XG4gICAgZWxlbS5wbGF5KCk7XG59O1xuYXVkaW8ucGF1c2UgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdmFyIG5hbWVzID0gW25hbWVdO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgbmFtZXMgPSBuYW1lO1xuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobmFtZXNbaV0pO1xuICAgICAgICBlbGVtLnBhdXNlKCk7XG4gICAgfVxuICAgIFxufTtcblxuYXVkaW8uZmFkZW91dCA9IGZ1bmN0aW9uIChuYW1lLCBzZWVrRnJvbSwgY2IpIHtcbiAgICB2YXIgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG5hbWUpO1xuICAgIHZhciB2b2x1bWUgPSBlbGVtLnZvbHVtZTtcbiAgICB2YXIgZGVjcmVhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZvbHVtZSAtPSBGQURFX1NQRUVEO1xuICAgICAgICBjb25zb2xlLmxvZyh2b2x1bWUpO1xuICAgICAgICBpZiAodm9sdW1lIDw9IDApIHtcbiAgICAgICAgICAgIGVsZW0udm9sdW1lID0gMDtcbiAgICAgICAgICAgIGVsZW0ucGF1c2UoKTtcbiAgICAgICAgICAgIGNiICYmIGNiKGVsZW0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZWxlbS52b2x1bWUgPSB2b2x1bWU7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGRlY3JlYXNlLCAxMDAvMyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGRlY3JlYXNlKCk7XG59XG5hdWRpby5mYWRlaW4gPSBmdW5jdGlvbiAobmFtZSwgc2Vla0Zyb20sIGNiKSB7XG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChuYW1lKTtcbiAgICB2YXIgdm9sdW1lID0gZWxlbS52b2x1bWUgPSAwO1xuICAgIGVsZW0ucGxheSgpO1xuICAgIHZhciBpbmNyZWFzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdm9sdW1lICs9IEZBREVfU1BFRUQ7XG4gICAgICAgIGlmICh2b2x1bWUgPj0gMSkge1xuICAgICAgICAgICAgZWxlbS52b2x1bWUgPSAxO1xuICAgICAgICAgICAgY2IgJiYgY2IoZWxlbSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlbGVtLnZvbHVtZSA9IHZvbHVtZTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoaW5jcmVhc2UsIDEwMC8zKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgaW5jcmVhc2UoKTtcbn1cbm1vZHVsZS5leHBvcnRzID0gYXVkaW87IiwiLy8gTWFrZXMgaXQgZWFzaWVyIHRvIG1ha2UgbWVudSBidXR0b25zXG52YXIgYnV0dG9ucyA9IFtdO1xuXG52YXIgY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2dhbWUnKTtcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxudmFyIGRyYXdCdXR0b24gPSBmdW5jdGlvbihidXR0b24pIHtcbiAgICBpZiAoYnV0dG9uLmltZykge1xuICAgICAgICBjdHguZHJhd0ltYWdlKGJ1dHRvbi54LCBidXR0b24ueSwgYnV0dG9uLndpZHRoLCBidXR0b24uaGVpZ2h0KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9ICd3aGl0ZSc7XG4gICAgICAgIGN0eC5zdHJva2VSZWN0KGJ1dHRvbi54LCBidXR0b24ueSwgYnV0dG9uLndpZHRoLCBidXR0b24uaGVpZ2h0KTtcbiAgICB9XG4gICAgaWYgKGJ1dHRvbi50ZXh0KSB7XG5cbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG4gICAgICAgIGN0eC5mb250ID0gYnV0dG9uLmZvbnQ7XG4gICAgICAgIHZhciB0ZXh0RGltID0gY3R4Lm1lYXN1cmVUZXh0KGJ1dHRvbi50ZXh0KTtcbiAgICAgICAgY3R4LmZpbGxUZXh0KGJ1dHRvbi50ZXh0LCBidXR0b24ueCArIChidXR0b24ud2lkdGggLSB0ZXh0RGltLndpZHRoKSAvIDIsIGJ1dHRvbi55ICsgKGJ1dHRvbi5oZWlnaHQgKyAxMCkgLyAyKTtcbiAgICB9XG59O1xuXG4vLyBkaW0gPSBkaW1lbnNpb25zID0ge3gsIHksIHdpZHRoLCBoZWlnaHR9LFxuLy8gc2NyZWVuU3RhdGU7IHdoZXJlIHRoZSBidXR0b24gaXMgdmlzaWJsZVxuLy8gdGV4dCB0byB3cml0ZSBvbiBidXR0b24sXG4vLyBpbWcgdG8gcHV0IGJlaGluZCB0ZXh0IChpZiB1bmRlZmluZWQsIGl0J2xsIGRyYXcgYSB3aGl0ZSBib3JkZXIgYXJvdW5kIHRoZSBidXR0b24gYXJlYSlcbnZhciBhZGRCdXR0b24gPSBmdW5jdGlvbihkaW0sIHNjcmVlblN0YXRlLCBvbmNsaWNrLCB0ZXh0LCBmb250LCBpbWcpIHtcbiAgICB2YXIgYnV0dG9uID0ge307XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhkaW0pO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBidXR0b25ba2V5c1tpXV0gPSBkaW1ba2V5c1tpXV07XG4gICAgfVxuICAgIGlmIChidXR0b24ueCA9PT0gJ2NlbnRlcicpIHtcbiAgICAgICAgYnV0dG9uLnggPSAoY2FudmFzLndpZHRoIC0gYnV0dG9uLndpZHRoKSAvIDI7XG4gICAgfVxuICAgIGlmIChidXR0b24ueSA9PT0gJ2NlbnRlcicpIHtcbiAgICAgICAgYnV0dG9uLnkgPSAoY2FudmFzLmhlaWdodCAtIGJ1dHRvbi5oZWlnaHQpIC8gMjtcbiAgICB9XG4gICAgYnV0dG9uLnNjcmVlblN0YXRlID0gc2NyZWVuU3RhdGUgfHwgJ21lbnUnO1xuICAgIGJ1dHRvbi5vbmNsaWNrID0gb25jbGljaztcbiAgICBidXR0b24udGV4dCA9IHRleHQgfHwgJyc7XG4gICAgYnV0dG9uLmZvbnQgPSBmb250IHx8ICcxMnB0IFRlbXBlc3RhIEZpdmUnO1xuICAgIGJ1dHRvbi5pbWcgPSBpbWc7XG4gICAgYnV0dG9ucy5wdXNoKGJ1dHRvbik7XG59O1xuXG52YXIgZHJhd0FsbCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBidXR0b247XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBidXR0b25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGJ1dHRvbiA9IGJ1dHRvbnNbaV07XG4gICAgICAgIGlmICh3aW5kb3cuc3RhdGUgPT09IGJ1dHRvbi5zY3JlZW5TdGF0ZSkge1xuICAgICAgICAgICAgZHJhd0J1dHRvbihidXR0b24pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZHJhd0FsbDogZHJhd0FsbCxcbiAgICBhZGRCdXR0b246IGFkZEJ1dHRvblxufTtcblxudmFyIGNoZWNrQ2xpY2sgPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIHggPSBlLnBhZ2VYIC0gY2FudmFzLm9mZnNldExlZnQ7XG4gICAgdmFyIHkgPSBlLnBhZ2VZIC0gY2FudmFzLm9mZnNldFRvcDtcbiAgICBjb25zb2xlLmxvZyh4KTtcbiAgICB2YXIgYnV0dG9uO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnV0dG9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICBidXR0b24gPSBidXR0b25zW2ldO1xuICAgICAgICBpZiAoeCA+PSBidXR0b24ueCAmJiB4IDw9IGJ1dHRvbi54ICsgYnV0dG9uLndpZHRoICYmXG4gICAgICAgICAgICB5ID49IGJ1dHRvbi55ICYmIHkgPD0gYnV0dG9uLnkgKyBidXR0b24uaGVpZ2h0KSB7XG4gICAgICAgICAgICBidXR0b24ub25jbGljaygpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG59O1xuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2hlY2tDbGljaywgZmFsc2UpOyIsInZhciBwYXJ0aWNsZXNNb2R1bGUgPSByZXF1aXJlKCcuL3BhcnRpY2xlcycpO1xudmFyIHNoYWtlID0gcmVxdWlyZSgnLi9zY3JlZW5zaGFrZScpO1xuXG52YXIgcGxheWVySGl0Qm94ID0ge1xuICAgIHg6IDM3NSxcbiAgICB5OiAyNzAsXG4gICAgd2lkdGg6IDUwLFxuICAgIGhlaWdodDogNjBcbn07XG52YXIgYW5nbGVkQ29sbGlzaW9uID0gZnVuY3Rpb24ocGxheWVyLCBmbykge1xuICAgIHZhciBjb2xsaWRpbmcgPSBmYWxzZTtcbiAgICBjb2xsaWRpbmcgPSBhYWJiKHBsYXllckhpdEJveCwgZm8pO1xuICAgIHJldHVybiBjb2xsaWRpbmc7XG59O1xuXG52YXIgYWFiYiA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICBpZiAoXG4gICAgICAgIE1hdGguYWJzKGEueCArIGEud2lkdGggLyAyIC0gYi54IC0gYi53aWR0aCAvIDIpID4gKGEud2lkdGggKyBiLndpZHRoKSAvIDIgfHxcbiAgICAgICAgTWF0aC5hYnMoYS55ICsgYS5oZWlnaHQgLyAyIC0gYi55IC0gYi5oZWlnaHQgLyAyKSA+IChhLmhlaWdodCArIGIuaGVpZ2h0KSAvIDJcbiAgICApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbnZhciBpbkFyZWEgPSBmdW5jdGlvbihhcmVhLCBhcnJheSwgcmVzcENvbGxpZGluZywgcmVzcE5vdENvbGxpZGluZykge1xuICAgIHZhciByZXQgPSBbXTtcbiAgICB2YXIgY3VyRWxlbTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGN1ckVsZW0gPSBhcnJheVtpXTtcbiAgICAgICAgaWYgKGFhYmIoYXJlYSwgY3VyRWxlbSkpIHtcbiAgICAgICAgICAgIHJldC5wdXNoKGN1ckVsZW0pO1xuICAgICAgICAgICAgaWYgKHJlc3BDb2xsaWRpbmcpIHtcbiAgICAgICAgICAgICAgICByZXNwQ29sbGlkaW5nKGN1ckVsZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHJlc3BOb3RDb2xsaWRpbmcpIHtcbiAgICAgICAgICAgIHJlc3BOb3RDb2xsaWRpbmcoY3VyRWxlbSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbnZhciBwbGF5ZXJBcmVhID0ge1xuICAgIHg6IDMyNSxcbiAgICB5OiAyMjUsXG4gICAgd2lkdGg6IDE1MCxcbiAgICBoZWlnaHQ6IDE1MFxufTtcblxudmFyIGNhbWVyYSA9IHtcbiAgICB4OiAtNDAwLFxuICAgIHk6IC0zMDAsXG4gICAgd2lkdGg6IDE2MDAsXG4gICAgaGVpZ2h0OiAxMjAwXG59O1xuXG52YXIgZXhwbG9kZU9iaiA9IGZ1bmN0aW9uKGZvKSB7XG4gICAgcGFydGljbGVzTW9kdWxlLmNyZWF0ZVBhcnRpY2xlcyhmby54LCBmby55LCBmby5zcGVlZCwgMC4wMSwgZm8ud2lkdGggKiBmby5oZWlnaHQgLyAxMDAsIFtmby5jb2xvcl0sIHtcbiAgICAgICAgcmFuZ2U6IE1hdGgucmFuZG9tKCkgKiAyICogTWF0aC5QSSxcbiAgICAgICAgbm9Db2xsaWRlOiB0cnVlLFxuICAgICAgICBkeDogZm8uZHgsXG4gICAgICAgIGR5OiBmby5keVxuICAgIH0pO1xufTtcblxudmFyIGNoZWNrID0gZnVuY3Rpb24ocGxheWVyLCBmb01vZHVsZSkge1xuICAgIC8vIGZvIHN0YW5kcyBmb3IgZmx5aW5nT2JqZWN0c1xuICAgIHZhciBwYXJ0aWNsZXMgPSBwYXJ0aWNsZXNNb2R1bGUuYXJyYXk7XG4gICAgdmFyIGZvcyA9IGZvTW9kdWxlLmFycmF5O1xuICAgIC8vIE1hbmFnZSBmbHlpbmcgb2JqZWN0IHNwYXduaW5nXG4gICAgdmFyIGZvSW5WaWV3ID0gaW5BcmVhKGNhbWVyYSwgZm9zLCB1bmRlZmluZWQsIGZ1bmN0aW9uKGZvKSB7XG4gICAgICAgIGZvLmFsaXZlID0gZmFsc2U7XG4gICAgfSk7XG4gICAgaWYgKGZvSW5WaWV3Lmxlbmd0aCA8IDMwKSB7XG4gICAgICAgIGZvTW9kdWxlLnNwYXduKE1hdGgucmFuZG9tKCkgKiAxMDApO1xuICAgIH1cblxuICAgIC8vIENvbGxpc2lvbnMgYmV0d2VlbiB0aGUgcGxheWVyIGFuZCByb2Nrc1xuICAgIHZhciBmb1RvVGVzdCA9IGluQXJlYShwbGF5ZXJBcmVhLCBmb3MpO1xuICAgIHZhciBmbztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZvVG9UZXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGZvID0gZm9Ub1Rlc3RbaV07XG4gICAgICAgIGlmIChhbmdsZWRDb2xsaXNpb24ocGxheWVyLCBmbykpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdISVQnKTtcbiAgICAgICAgICAgIGZvLmFsaXZlID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoZm8uaW1hZ2UgPT09ICdwb3dlci1pY29uLnBuZycpIHtcbiAgICAgICAgICAgICAgICBhdWRpby5wbGF5KCdjb2xsZWN0Jyk7XG4gICAgICAgICAgICAgICAgcGxheWVyLmZ1ZWwgKz0gMTA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBhdWRpby5wbGF5KCdjb2xsaWRlJyk7XG4gICAgICAgICAgICAgICAgcGxheWVyLmhpdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgcGxheWVyLmhlYWx0aCAtPSAoZm8ud2lkdGggKiBmby5oZWlnaHQpIC8gMTAwO1xuICAgICAgICAgICAgICAgIGV4cGxvZGVPYmooZm8pO1xuICAgICAgICAgICAgICAgIHNoYWtlKDUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGNvbGxpc2lvbnMgYmV0d2VlbiBwYXJ0aWNsZXMgYW5kIGZvXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0aWNsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHBhcnRpY2xlc1tpXS5ub0NvbGxpZGUpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGluQXJlYShwYXJ0aWNsZXNbaV0sIGZvcywgZnVuY3Rpb24oZm8pIHtcbiAgICAgICAgICAgIGlmIChwYXJ0aWNsZXNbaV0uYWxpdmUgJiYgIWZvLmdvb2QpIHtcbiAgICAgICAgICAgICAgICBmby5hbGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGF1ZGlvLnBsYXkoJ2V4cGxvZGVfbWV0ZW9yJyk7XG4gICAgICAgICAgICAgICAgcGxheWVyLnNjb3JlICs9IChmby53aWR0aCAqIGZvLmhlaWdodCkgLyAxMDA7XG4gICAgICAgICAgICAgICAgZXhwbG9kZU9iaihmbyk7XG4gICAgICAgICAgICAgICAgc2hha2UoMik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNoZWNrOiBjaGVja1xufTsiLCJ2YXIgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcbnZhciBrZXlzID0ge307XG52YXIgQyA9IHtcbiAgICBTUEFDRTogMzIsXG4gICAgTEVGVDogMzcsXG4gICAgVVA6IDM4LFxuICAgIFJJR0hUOiAzOSxcbiAgICBET1dOOiA0MFxufVxuZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZSkge1xuICAgIGlmIChlLmtleUNvZGUgPT09IEMuU1BBQ0UpIHtcbiAgICAgICAgcGxheWVyLmZsaXAoKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cbiAgICBlbHNlIGlmIChlLmtleUNvZGUgPj0gMzcgJiYgZS5rZXlDb2RlIDw9IDQwKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG4gICAga2V5c1tlLmtleUNvZGVdID0gdHJ1ZTtcbn0pO1xuZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0aW9uKGUpIHtcbiAgICBrZXlzW2Uua2V5Q29kZV0gPSBmYWxzZTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBsZWZ0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbQy5MRUZUXTtcbiAgICB9LFxuICAgIHVwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbQy5VUF07XG4gICAgfSxcbiAgICByaWdodDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzW0MuUklHSFRdO1xuICAgIH0sXG4gICAgZG93bjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzW0MuRE9XTl07XG4gICAgfSxcbiAgICBmbGlwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbQy5TUEFDRV07XG4gICAgfVxufTtcbiIsInZhciBpbWFnZU5hbWVzID0gW1xuICAgICdhc3Ryby5wbmcnLFxuICAgICdhc3Ryby1mbHlpbmcucG5nJyxcbiAgICAnaGVhbHRoLWJhci1pY29uLnBuZycsXG4gICAgJ2xvZ28ucG5nJyxcbiAgICAncG93ZXItYmFyLWljb24ucG5nJyxcbiAgICAncG93ZXItaWNvbi5wbmcnLFxuICAgICdyb2NrLTUucG5nJyxcbiAgICAncm9jay1hbHQtNS5wbmcnLFxuICAgICdyb2NrLW9kZC0xLnBuZycsXG4gICAgJ3JvY2stb2RkLTMucG5nJ1xuXTtcblxudmFyIGltYWdlcyA9IHt9O1xudmFyIGxvYWRlZCA9IDA7XG52YXIgZG9uZSA9IGZ1bmN0aW9uKGNiKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbWFnZU5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGltYWdlc1tpbWFnZU5hbWVzW2ldXSA9IG5ldyBJbWFnZSgpO1xuICAgICAgICBpbWFnZXNbaW1hZ2VOYW1lc1tpXV0uc3JjID0gJ2ltYWdlcy8nICsgaW1hZ2VOYW1lc1tpXTtcbiAgICAgICAgaW1hZ2VzW2ltYWdlTmFtZXNbaV1dLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgbG9hZGVkKys7XG4gICAgICAgICAgICBpZiAobG9hZGVkID09PSBpbWFnZU5hbWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNiKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBsaXN0OiBpbWFnZU5hbWVzLFxuICAgIGltYWdlczogaW1hZ2VzLFxuICAgIGRvbmU6IGRvbmUsXG4gICAgZ2V0OiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgaW1hZ2VOYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKGltYWdlTmFtZXNbaV0uaW5kZXhPZihzdHJpbmcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHJldC5wdXNoKGltYWdlTmFtZXNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxufTsiLCJ2YXIgbG9hZGVyID0gcmVxdWlyZSgnLi9sb2FkZXInKTtcbnZhciB0ZXh0ID0gcmVxdWlyZSgnLi90ZXh0Jyk7XG52YXIgYnV0dG9ucyA9IHJlcXVpcmUoJy4vYnV0dG9ucycpO1xuXG5idXR0b25zLmFkZEJ1dHRvbihcbiAgICB7XG4gICAgICAgIHg6ICdjZW50ZXInLFxuICAgICAgICB5OiAzMDAsXG4gICAgICAgIHdpZHRoOiAyMDAsXG4gICAgICAgIGhlaWdodDogNTBcbiAgICB9LFxuICAgICdtZW51JyxcbiAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgd2luZG93LnN0YXRlID0gJ2dhbWUnO1xuICAgIH0sXG4gICAgJ0NsaWNrIHRvIHBsYXknLFxuICAgICcxMnB0IFRlbXBlc3RhIEZpdmUnXG4pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBkcmF3TWVudTogZnVuY3Rpb24oY3R4KSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzBmMGQyMCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCA4MDAsIDYwMCk7XG5cbiAgICAgICAgY3R4LmRyYXdJbWFnZShsb2FkZXIuaW1hZ2VzWydsb2dvLnBuZyddLCAzMTQsIDE4MCk7XG4gICAgICAgIC8vIHRleHQud3JpdGUoJ0NMSUNLIFRPIFBMQVknLCAnY2VudGVyJywgMzMwKTtcbiAgICAgICAgdGV4dC53cml0ZSgnQSBHQU1FIEJZJywgJ2NlbnRlcicsIDUwMCk7XG4gICAgICAgIHRleHQud3JpdGUoJ0BBTUFBTkMgQU5EIEBNSUtFRElEVEhJUycsICdjZW50ZXInLCA1MjAsIGZ1bmN0aW9uKGN0eCkge1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICcjRENGQ0Y5JztcbiAgICAgICAgICAgIGN0eC5mb250ID0gJzEycHQgVGVtcGVzdGEgRml2ZSc7XG4gICAgICAgIH0pO1xuXG4gICAgfSxcbiAgICBkcmF3RW5kOiBmdW5jdGlvbihjdHgsIHNjb3JlKSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzBmMGQyMCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCA4MDAsIDYwMCk7XG4gICAgICAgIHRleHQud3JpdGUoJ1RoZSBlbmQhIFlvdSBzY29yZWQgJyArIE1hdGgucm91bmQoc2NvcmUpICsgJyBwb2ludHMhJywgJ2NlbnRlcicsIDMwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgICAgIGN0eC5mb250ID0gJzI2cHQgVGVtcGVzdGEgRml2ZSc7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZXh0LndyaXRlKCdDbGljayB0byBwbGF5IGFnYWluJywgJ2NlbnRlcicsIDUwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgICAgIGN0eC5mb250ID0gJzIycHQgVGVtcGVzdGEgRml2ZSc7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgaW5nYW1lOiBmdW5jdGlvbiAoY3R4LCBmdWVsLCBoZWFsdGgsIHNjb3JlKSB7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1sncG93ZXItYmFyLWljb24ucG5nJ10sIDMwLCA1MDApO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ29yYW5nZSc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgzMCwgNDkwIC0gZnVlbCwgMjAsIGZ1ZWwpO1xuXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1snaGVhbHRoLWJhci1pY29uLnBuZyddLCA3MCwgNTAwKTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICdyZWQnO1xuICAgICAgICBjdHguZmlsbFJlY3QoNzAsIDQ5MCAtIGhlYWx0aCwgMjAsIGhlYWx0aCk7XG5cbiAgICAgICAgdGV4dC53cml0ZSgnU2NvcmU6ICcgKyBNYXRoLnJvdW5kKHNjb3JlKSwgMjAsIDU1MCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjdHguZm9udCA9ICcxMnB0IFRlbXBlc3RhIEZpdmUnO1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG4gICAgICAgIH0pO1xuICAgIH1cbn07IiwidmFyIHBhcnRpY2xlcyA9IFtdO1xudmFyIFcgPSA3LCBIID0gNztcbnZhciBERUNfUkFURSA9IDAuMTsgLy8gRGVmYXVsdCBkZWNyZWFzZSByYXRlLiBIaWdoZXIgcmF0ZSAtPiBwYXJ0aWNsZXMgZ28gZmFzdGVyXG52YXIgUGFydGljbGUgPSBmdW5jdGlvbih4LCB5LCBzcGVlZCwgZGVjUmF0ZSwgY29sb3JzKSB7XG4gICAgdGhpcy5hbGl2ZSA9IHRydWU7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICAgIHRoaXMuZHggPSB0aGlzLmR5ID0gMDtcbiAgICB0aGlzLndpZHRoID0gVztcbiAgICB0aGlzLmhlaWdodCA9IEg7XG4gICAgdGhpcy5hbmdsZSA9IDA7XG4gICAgdGhpcy5zcGVlZCA9IHNwZWVkO1xuICAgIHRoaXMub3BhY2l0eSA9IDE7XG4gICAgdGhpcy5kZWNSYXRlID0gZGVjUmF0ZSB8fCBERUNfUkFURTtcbiAgICB0aGlzLmRlbGF5ID0gTWF0aC5jZWlsKE1hdGgucmFuZG9tKCkgKiAxMCk7XG4gICAgaWYgKGNvbG9ycykge1xuICAgICAgICB0aGlzLmNvbG9yID0gY29sb3JzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNvbG9ycy5sZW5ndGgpXTtcbiAgICB9XG4gICAgdGhpcy5sb29wID0gZnVuY3Rpb24oY3R4LCBwbGF5ZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuZGVsYXkgPiAwKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kZWxheSA8PSAxKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hbmdsZSA9IHBsYXllci5hbmdsZSAtIHRoaXMucmFuZ2UgKyAoTWF0aC5yYW5kb20oKSAqIDIgKiB0aGlzLnJhbmdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZGVsYXktLTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnggKz0gdGhpcy5keCAtIHdpbmRvdy5wbGF5ZXIub2Zmc2V0WCArIE1hdGguc2luKC10aGlzLmFuZ2xlKSAqIHNwZWVkO1xuICAgICAgICB0aGlzLnkgKz0gdGhpcy5keSAtIHdpbmRvdy5wbGF5ZXIub2Zmc2V0WSArIE1hdGguY29zKC10aGlzLmFuZ2xlKSAqIHNwZWVkO1xuICAgICAgICB0aGlzLm9wYWNpdHkgLT0gdGhpcy5kZWNSYXRlO1xuICAgICAgICBpZiAodGhpcy5vcGFjaXR5IDw9IDApIHtcbiAgICAgICAgICAgIHRoaXMub3BhY2l0eSA9IDA7XG4gICAgICAgICAgICB0aGlzLmFsaXZlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRHJhd1xuICAgICAgICBjdHguc2F2ZSgpO1xuICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSB0aGlzLm9wYWNpdHk7XG4gICAgICAgIGN0eC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSAnbGlnaHRlcic7XG4gICAgICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5jb2xvciB8fCAncmVkJztcbiAgICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIFcsIEgpO1xuICAgICAgICBjdHgucmVzdG9yZSgpO1xuICAgIH07XG59O1xuXG4vLyB4LCB5IGFyZSBmaXhlZFxuLy8gUGFydGljbGVzIGFyZSBjcmVhdGVkIGZyb20gYW5nbGUtcmFuZ2UgdG8gYW5nbGUrcmFuZ2Vcbi8vIHNwZWVkIGlzIGZpeGVkXG52YXIgYW5nbGUgPSAwO1xudmFyIGNyZWF0ZVBhcnRpY2xlcyA9IGZ1bmN0aW9uKHgsIHksIHNwZWVkLCBkZWNSYXRlLCBuLCBjb2xvcnMsIHByb3BzKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ0NyZWF0aW5nJywgcGFydGljbGVzKTtcbiAgICB2YXIgY3JlYXRlZCA9IDAsIGkgPSAwO1xuICAgIHZhciBwYXJ0aWNsZTtcbiAgICB3aGlsZShjcmVhdGVkIDwgbikge1xuICAgICAgICBwYXJ0aWNsZSA9IHBhcnRpY2xlc1tpXTtcbiAgICAgICAgaWYgKHBhcnRpY2xlICYmICFwYXJ0aWNsZS5hbGl2ZSB8fCAhcGFydGljbGUpIHtcbiAgICAgICAgICAgIHBhcnRpY2xlc1tpXSA9IG5ldyBQYXJ0aWNsZSh4LCB5LCBzcGVlZCwgZGVjUmF0ZSwgY29sb3JzKTtcbiAgICAgICAgICAgIGNyZWF0ZWQrKztcbiAgICAgICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMocHJvcHMpO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBrZXlzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgcGFydGljbGVzW2ldW2tleXNbal1dID0gcHJvcHNba2V5c1tqXV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBQb3NzaWJsZSBwcm9wczogcmFuZ2UsIG5vQ29sbGlkZSwgZHgsIGR5LCBjb2xvclxuICAgICAgICB9XG4gICAgICAgIGkrKztcbiAgICB9XG59O1xuXG52YXIgZHJhdyA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCwgcGxheWVyKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0aWNsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcGFydGljbGVzW2ldLmxvb3AoY3R4LCBwbGF5ZXIpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNyZWF0ZVBhcnRpY2xlczogY3JlYXRlUGFydGljbGVzLFxuICAgIGRyYXc6IGRyYXcsXG4gICAgYXJyYXk6IHBhcnRpY2xlcyxcbiAgICByZXNldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHBhcnRpY2xlcy5sZW5ndGggPSAwO1xuICAgIH1cbn07XG4iLCJ2YXIgd2hpdGVuID0gcmVxdWlyZSgnLi93aGl0ZW4nKTtcbnZhciBjYW52YXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZ2FtZScpO1xuXG53aW5kb3cucGxheWVyID0ge307XG5cbnBsYXllci5pZGxlID0gbmV3IEltYWdlKCk7XG5wbGF5ZXIuaWRsZS5zcmMgPSAnaW1hZ2VzL2FzdHJvLnBuZyc7XG5wbGF5ZXIuaWRsZS5uYW1lID0gJ2FzdHJvLnBuZyc7XG5wbGF5ZXIuZmx5aW5nID0gbmV3IEltYWdlKCk7XG5wbGF5ZXIuZmx5aW5nLnNyYyA9ICdpbWFnZXMvYXN0cm8tZmx5aW5nLnBuZyc7XG5wbGF5ZXIuZmx5aW5nLm5hbWUgPSAnYXN0cm8tZmx5aW5nLnBuZyc7XG5wbGF5ZXIuc3RhdGUgPSAnaWRsZSc7XG5cbnZhciBwbGF5ZXJEZWZhdWx0cyA9IHtcbiAgICBzY29yZTogMCxcbiAgICBhbmdsZTogMCxcbiAgICBvZmZzZXRZOiAwLFxuICAgIG9mZnNldFg6IDAsXG4gICAgaGVhbHRoOiAxMDAsXG4gICAgZnVlbDogMTAwLFxuICAgIGhpdDogZmFsc2Vcbn07XG5cbnBsYXllci53aWR0aCA9IDUyO1xucGxheWVyLmhlaWdodCA9IDYwO1xucGxheWVyLnggPSAoY2FudmFzLndpZHRoIC0gcGxheWVyLndpZHRoKSAvIDI7XG5wbGF5ZXIueSA9IChjYW52YXMuaGVpZ2h0IC0gcGxheWVyLmhlaWdodCkgLyAyO1xucGxheWVyLmFuZ2xlID0gMDtcblxucGxheWVyLm9mZnNldFggPSBwbGF5ZXIub2Zmc2V0WSA9IDA7XG5cblxuLy8gSGFsZiB3aWR0aCwgaGFsZiBoZWlnaHRcbnZhciBoVyA9IHBsYXllci53aWR0aCAvIDI7XG52YXIgaEggPSBwbGF5ZXIuaGVpZ2h0IC8gMjtcblxudmFyIHNwZWVkID0gMDsgLy8gVGhlIGN1cnJlbnQgc3BlZWRcbnZhciBkU3BlZWQ7XG52YXIgZFggPSAwLCBkWSA9IDA7XG5cbi8vIFlPVSBDQU4gQ09ORklHVVJFIFRIRVNFISAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxudmFyIGFjYyA9IDc7IC8vIEFjY2VsZXJhdGlvblxudmFyIGxpbSA9IDEwOyAvLyBTcGVlZCBsaW1pdFxudmFyIHR1cm5TcGVlZCA9IDIuMjtcbnZhciBncmF2ID0gMC4wMztcbi8vIE5PIE1PUkUgQ09ORklHVVJJTkchIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cblxucGxheWVyLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgZFggPSBkWSA9IHNwZWVkID0gZFNwZWVkID0gMDtcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHBsYXllckRlZmF1bHRzKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcGxheWVyW2tleXNbaV1dID0gcGxheWVyRGVmYXVsdHNba2V5c1tpXV07XG4gICAgfVxuICAgIHBsYXllci5tb3ZlKCk7XG59O1xucGxheWVyLmdyYXZpdHkgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgZFkgLT0gZ3Jhdjtcbn07XG5wbGF5ZXIubW92ZSA9IGZ1bmN0aW9uKGVsYXBzZWQsIGZseWluZykge1xuICAgIHBsYXllci5vZmZzZXRYID0gZFg7XG4gICAgcGxheWVyLm9mZnNldFkgPSAtZFk7XG4gICAgZFggKj0gMC45OTtcbiAgICBkWSAqPSAwLjk5O1xuXG4gICAgaWYgKCFmbHlpbmcpIHtcbiAgICAgICAgcGxheWVyLnN0YXRlID0gJ2lkbGUnO1xuICAgIH1cbn07XG5wbGF5ZXIudXAgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgcGxheWVyLmZ1ZWwgLT0gMC4yO1xuICAgIHBsYXllci5zdGF0ZSA9ICdmbHlpbmcnO1xuICAgIHNwZWVkICs9IGFjYztcbiAgICBkU3BlZWQgPSBlbGFwc2VkICogc3BlZWQ7XG4gICAgLy8gY29uc29sZS5sb2cocGxheWVyLngsIHBsYXllci55KTtcbiAgICAvLyBjb25zb2xlLmxvZyhNYXRoLnNpbihwbGF5ZXIuYW5nbGUpICogZFNwZWVkLCBNYXRoLmNvcyhwbGF5ZXIuYW5nbGUpICogZFNwZWVkKTtcbiAgICBkWCArPSBNYXRoLnNpbihwbGF5ZXIuYW5nbGUpICogZFNwZWVkO1xuICAgIGRZICs9IE1hdGguY29zKHBsYXllci5hbmdsZSkgKiBkU3BlZWQ7XG4gICAgcGxheWVyLm1vdmUoZWxhcHNlZCwgdHJ1ZSk7XG4gICAgaWYgKHNwZWVkID4gbGltKSB7XG4gICAgICAgIHNwZWVkID0gbGltO1xuICAgIH1cbiAgICBlbHNlIGlmIChzcGVlZCA8IC1saW0pIHtcbiAgICAgICAgc3BlZWQgPSAtbGltO1xuICAgIH1cblxufTtcbnBsYXllci5yaWdodCA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBwbGF5ZXIuYW5nbGUgKz0gZWxhcHNlZCAqIHR1cm5TcGVlZCAqIE1hdGguUEk7XG59O1xucGxheWVyLmxlZnQgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgcGxheWVyLmFuZ2xlIC09IGVsYXBzZWQgKiB0dXJuU3BlZWQgKiBNYXRoLlBJO1xufTtcbnBsYXllci5mbGlwID0gZnVuY3Rpb24oKSB7XG4gICAgcGxheWVyLmFuZ2xlICs9IE1hdGguUEk7XG59O1xuXG5cbnZhciB0aWNrcyA9IDA7XG5wbGF5ZXIuZHJhdyA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCkge1xuICAgIC8vIFBsYXllclxuICAgIGN0eC5zYXZlKCk7XG4gICAgY3R4LnRyYW5zbGF0ZShwbGF5ZXIueCArIGhXLCBwbGF5ZXIueSArIGhIKTtcbiAgICBjdHgucm90YXRlKHBsYXllci5hbmdsZSk7XG4gICAgLy8gcGxheWVyLmhpdCBpcyBzZXQgaW4gY29sbGlzaW9ucy5qc1xuICAgIC8vIElmIHRoZSBwbGF5ZXIncyBiZWVuIGhpdCwgd2Ugd2FudCBpdCB0byBmbGFzaCB3aGl0ZSB0byBpbmRpY2F0ZSB0aGF0XG4gICAgaWYgKHBsYXllci5oaXQpIHtcbiAgICAgICAgY3R4LmRyYXdJbWFnZSh3aGl0ZW4ocGxheWVyW3BsYXllci5zdGF0ZV0ubmFtZSwgJ3BpbmsnKSwgLWhXLCAtaEgpO1xuICAgICAgICB0aWNrcysrO1xuICAgICAgICBpZiAodGlja3MgPj0gOCkge1xuICAgICAgICAgICAgcGxheWVyLmhpdCA9IGZhbHNlO1xuICAgICAgICAgICAgdGlja3MgPSAwO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjdHguZHJhd0ltYWdlKHBsYXllcltwbGF5ZXIuc3RhdGVdLCAtaFcsIC1oSCk7XG4gICAgfVxuICAgIGN0eC5yZXN0b3JlKCk7XG5cbn07XG5cbnBsYXllci5yZXNldCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBsYXllcjtcbiIsIi8vIEhvbGRzIGxhc3QgaXRlcmF0aW9uIHRpbWVzdGFtcC5cbnZhciB0aW1lID0gMDtcblxuLyoqXG4gKiBDYWxscyBgZm5gIG9uIG5leHQgZnJhbWUuXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuIFRoZSBmdW5jdGlvblxuICogQHJldHVybiB7aW50fSBUaGUgcmVxdWVzdCBJRFxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIHJhZihmbikge1xuICByZXR1cm4gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgICB2YXIgZWxhcHNlZCA9IG5vdyAtIHRpbWU7XG5cbiAgICBpZiAoZWxhcHNlZCA+IDk5OSkge1xuICAgICAgZWxhcHNlZCA9IDEgLyA2MDtcbiAgICB9IGVsc2Uge1xuICAgICAgZWxhcHNlZCAvPSAxMDAwO1xuICAgIH1cblxuICAgIHRpbWUgPSBub3c7XG4gICAgZm4oZWxhcHNlZCk7XG4gIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgLyoqXG4gICAqIENhbGxzIGBmbmAgb24gZXZlcnkgZnJhbWUgd2l0aCBgZWxhcHNlZGAgc2V0IHRvIHRoZSBlbGFwc2VkXG4gICAqIHRpbWUgaW4gbWlsbGlzZWNvbmRzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm4gVGhlIGZ1bmN0aW9uXG4gICAqIEByZXR1cm4ge2ludH0gVGhlIHJlcXVlc3QgSURcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHN0YXJ0OiBmdW5jdGlvbihmbikge1xuICAgIHJldHVybiByYWYoZnVuY3Rpb24gdGljayhlbGFwc2VkKSB7XG4gICAgICBmbihlbGFwc2VkKTtcbiAgICAgIHJhZih0aWNrKTtcbiAgICB9KTtcbiAgfSxcbiAgLyoqXG4gICAqIENhbmNlbHMgdGhlIHNwZWNpZmllZCBhbmltYXRpb24gZnJhbWUgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHtpbnR9IGlkIFRoZSByZXF1ZXN0IElEXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzdG9wOiBmdW5jdGlvbihpZCkge1xuICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZShpZCk7XG4gIH1cbn07XG4iLCJ2YXIgY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2dhbWUnKTtcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxudmFyIHBvbGFyaXR5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgPiAwLjUgPyAxIDogLTE7XG59O1xuXG4vLyBBbW91bnQgd2UndmUgbW92ZWQgc28gZmFyXG52YXIgdG90YWxYID0gMDtcbnZhciB0b3RhbFkgPSAwO1xuXG52YXIgc2hha2UgPSBmdW5jdGlvbihpbnRlbnNpdHkpIHtcbiAgICBpZiAodG90YWxYID09PSAwKSB7XG4gICAgICAgIGN0eC5zYXZlKCk7XG4gICAgfVxuICAgIGlmICghaW50ZW5zaXR5KSB7XG4gICAgICAgIGludGVuc2l0eSA9IDI7XG4gICAgfVxuICAgIHZhciBkWCA9IE1hdGgucmFuZG9tKCkgKiBpbnRlbnNpdHkgKiBwb2xhcml0eSgpO1xuICAgIHZhciBkWSA9IE1hdGgucmFuZG9tKCkgKiBpbnRlbnNpdHkgKiBwb2xhcml0eSgpO1xuICAgIHRvdGFsWCArPSBkWDtcbiAgICB0b3RhbFkgKz0gZFk7XG5cbiAgICAvLyBCcmluZyB0aGUgc2NyZWVuIGJhY2sgdG8gaXRzIHVzdWFsIHBvc2l0aW9uIGV2ZXJ5IFwiMiBpbnRlbnNpdHlcIiBzbyBhcyBub3QgdG8gZ2V0IHRvbyBmYXIgYXdheSBmcm9tIHRoZSBjZW50ZXJcbiAgICBpZiAoaW50ZW5zaXR5ICUgMiA8IDAuMikge1xuICAgICAgICBjdHgudHJhbnNsYXRlKC10b3RhbFgsIC10b3RhbFkpO1xuICAgICAgICB0b3RhbFggPSB0b3RhbFkgPSAwO1xuICAgICAgICBpZiAoaW50ZW5zaXR5IDw9IDAuMTUpIHtcbiAgICAgICAgICAgIGN0eC5yZXN0b3JlKCk7IC8vIEp1c3QgdG8gbWFrZSBzdXJlIGl0IGdvZXMgYmFjayB0byBub3JtYWxcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGN0eC50cmFuc2xhdGUoZFgsIGRZKTtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBzaGFrZShpbnRlbnNpdHkgLSAwLjEpO1xuICAgIH0sIDUpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzaGFrZTsiLCJ2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2NhbnZhcycpWzBdO1xudmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xubW9kdWxlLmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbih0ZXh0LCB4LCB5LCBwcmVGdW5jLCBzdHJva2Upe1xuICAgIGN0eC5zYXZlKCk7XG4gICAgaWYgKHByZUZ1bmMpIHtcbiAgICAgICAgcHJlRnVuYyhjdHgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG4gICAgICAgIGN0eC5mb250ID0gJzEycHQgVGVtcGVzdGEgRml2ZSc7XG4gICAgfVxuXG4gICAgdmFyIHhQb3MgPSB4O1xuICAgIGlmICh4ID09PSAnY2VudGVyJykge1xuICAgICAgICB4UG9zID0gKGNhbnZhcy53aWR0aCAtIGN0eC5tZWFzdXJlVGV4dCh0ZXh0KS53aWR0aCkgLyAyO1xuICAgIH1cblxuICAgIGlmIChzdHJva2UpIHtcbiAgICAgICAgY3R4LnN0cm9rZVRleHQodGV4dCwgeFBvcywgeSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjdHguZmlsbFRleHQodGV4dCwgeFBvcywgeSk7XG4gICAgfVxuICAgIGN0eC5yZXN0b3JlKCk7XG59OyIsIi8vIHVmb3MuanNcbi8vIFRoaXMgZmlsZSBkZWZpbmVzIGJlaGF2aW9yIGZvciBhbGwgdGhlIHVuaWRlbnRpZmllZCBmbHlpbmcgb2JqZWN0c1xuLy8gSSBndWVzcyB0aGV5ICphcmUqIGlkZW50aWZpZWQsIHRlY2huaWNhbGx5LlxuLy8gQnV0IHVmb3MuanMgaXMgY29vbGVyIHRoYW4gaWZvcy5qc1xuLy8gQXN0ZXJvaWRzIGFuZCBoZWFsdGggLyBmdWVsIHBpY2t1cHMgY291bnQgYXMgVUZPc1xuXG52YXIgZmx5aW5nT2JqZWN0cyA9IFtdO1xuXG52YXIgbG9hZGVyID0gcmVxdWlyZSgnLi9sb2FkZXIuanMnKTtcblxudmFyIHJuZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpO1xufTtcbnZhciBjaG9vc2UgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXJndW1lbnRzW01hdGguZmxvb3Iocm5kKCkgKiBhcmd1bWVudHMubGVuZ3RoKV07XG59O1xuXG52YXIgU1BBV05fUkFOR0UgPSAxMDA7XG52YXIgTUlOX1NQRUVEID0gMC4zLCBNQVhfU1BFRUQgPSAyO1xudmFyIFdJRFRIID0gODAwLCBIRUlHSFQgPSA2MDA7XG5cbnZhciBzcGF3biA9IGZ1bmN0aW9uKG4pIHtcbiAgICAvLyBjb25zb2xlLmxvZygnU3Bhd25lZCBmbHlpbmdPYmplY3RzOicsIG4pO1xuICAgIHZhciBvYmosIHRhcmdldFksIHRhcmdldFg7XG4gICAgdmFyIHNpZ25YLCBzaWduWSwgcG9zWCwgcG9zWTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICBvYmogPSB7XG4gICAgICAgICAgICB4OiAocm5kKCkgKiBXSURUSCksXG4gICAgICAgICAgICB5OiAocm5kKCkgKiBIRUlHSFQpLFxuICAgICAgICAgICAgc3BlZWQ6IHJuZCgpICogKE1BWF9TUEVFRCAtIE1JTl9TUEVFRCkgKyBNSU5fU1BFRUQsXG4gICAgICAgICAgICBpbWFnZTogY2hvb3NlLmFwcGx5KHRoaXMsIGxvYWRlci5nZXQoJ3JvY2snKS5jb25jYXQobG9hZGVyLmdldCgncG93ZXItaWNvbicpKSksXG4gICAgICAgICAgICBhbGl2ZTogdHJ1ZVxuICAgICAgICB9O1xuICAgICAgICB0YXJnZXRZID0gcm5kKCkgKiBXSURUSDtcbiAgICAgICAgdGFyZ2V0WCA9IHJuZCgpICogSEVJR0hUO1xuICAgICAgICBvYmouYW5nbGUgPSBybmQoKSAqIE1hdGguUEkgKiAyO1xuICAgICAgICBvYmouZ29vZCA9IG9iai5pbWFnZS5pbmRleE9mKCdyb2NrJykgPj0gMCA/IGZhbHNlIDogdHJ1ZTtcbiAgICAgICAgb2JqLndpZHRoID0gbG9hZGVyLmltYWdlc1tvYmouaW1hZ2VdLndpZHRoO1xuICAgICAgICBvYmouaGVpZ2h0ID0gbG9hZGVyLmltYWdlc1tvYmouaW1hZ2VdLmhlaWdodDtcbiAgICAgICAgb2JqLmR4ID0gTWF0aC5jb3Mob2JqLmFuZ2xlKSAqIG9iai5zcGVlZDtcbiAgICAgICAgb2JqLmR5ID0gTWF0aC5zaW4ob2JqLmFuZ2xlKSAqIG9iai5zcGVlZDtcblxuICAgICAgICBpZiAoIW9iai5nb29kKSB7XG4gICAgICAgICAgICBvYmouY29sb3IgPSBvYmouaW1hZ2UuaW5kZXhPZignYWx0JykgPCAwID8gJyM1MjRDNEMnIDogJyNhNzgyNTgnO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJuZCgpID4gMC41KSB7XG4gICAgICAgICAgICBvYmoueCArPSBjaG9vc2UoLTEsIDEpICogKFdJRFRIICsgb2JqLndpZHRoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG9iai55ICs9IGNob29zZSgtMSwgMSkgKiAoSEVJR0hUICsgb2JqLmhlaWdodCk7XG4gICAgICAgIH1cbiAgICAgICAgZmx5aW5nT2JqZWN0cy5wdXNoKG9iaik7XG4gICAgfVxufTtcblxudmFyIGxvb3AgPSBmdW5jdGlvbihlbGFwc2VkLCBjdHgsIG9mZnNldFgsIG9mZnNldFkpIHtcbiAgICB2YXIgb2JqO1xuICAgIGZvciAodmFyIGkgPSBmbHlpbmdPYmplY3RzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIG9iaiA9IGZseWluZ09iamVjdHNbaV07XG4gICAgICAgIGlmIChvYmouYWxpdmUpIHtcbiAgICAgICAgICAgIG9iai54ICs9IG9iai5keCAtIG9mZnNldFg7XG4gICAgICAgICAgICBvYmoueSArPSBvYmouZHkgLSBvZmZzZXRZO1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICdyZWQnO1xuICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShsb2FkZXIuaW1hZ2VzW29iai5pbWFnZV0sIG9iai54LCBvYmoueSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBmbHlpbmdPYmplY3RzLnNwbGljZShpLCAxKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbG9vcDogbG9vcCxcbiAgICBhcnJheTogZmx5aW5nT2JqZWN0cyxcbiAgICBzcGF3bjogc3Bhd24sXG4gICAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBmbHlpbmdPYmplY3RzLmxlbmd0aCA9IDA7XG4gICAgfVxufTsiLCIvLyBUaGlzIGZpbGUgZXhwb3J0cyBhIGZ1bmN0aW9uIHRoYXQgbGV0cyB5b3UgbWFrZSBpbWFnZXMgXCJmbGFzaFwiIG1vbWVudGFyaWx5LiBMaWtlIHRoZSBwbGF5ZXIgd2hlbiBoZSBnZXRzIGhpdCBieSBhbiBhc3Rlcm9pZFxudmFyIGxvYWRlciA9IHJlcXVpcmUoJy4vbG9hZGVyJyk7XG52YXIgaW1hZ2VzID0gbG9hZGVyLmltYWdlcztcblxudmFyIGNhY2hlID0ge307XG52YXIgd2hpdGVuID0gZnVuY3Rpb24oaW1nTmFtZSwgY29sb3IpIHtcbiAgICBpZiAoY2FjaGVbaW1nTmFtZV0pIHtcbiAgICAgICAgcmV0dXJuIGNhY2hlW2ltZ05hbWVdO1xuICAgIH1cbiAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgdmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgIHZhciBpbWcgPSBpbWFnZXNbaW1nTmFtZV07XG5cbiAgICBjYW52YXMud2lkdGggPSBpbWcud2lkdGg7XG4gICAgY2FudmFzLmhlaWdodCA9IGltZy5oZWlnaHQ7XG4gICAgY3R4LmRyYXdJbWFnZShpbWcsIDAsIDAsIGltZy53aWR0aCwgaW1nLmhlaWdodCk7XG4gICAgY3R4Lmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9ICdzb3VyY2UtYXRvcCc7XG4gICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yIHx8ICd3aGl0ZSc7XG4gICAgY3R4LmZpbGxSZWN0KDAsIDAsIGltZy53aWR0aCwgaW1nLmhlaWdodCk7XG4gICAgY2FjaGVbaW1nTmFtZV0gPSBjYW52YXM7XG4gICAgcmV0dXJuIGNhbnZhcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gd2hpdGVuOyJdfQ==
