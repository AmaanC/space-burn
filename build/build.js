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
var store = require('./store');
var achievements = require('./achievements');

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
                particles.createParticles(player.x + player.width / 2, player.y + player.height / 2, 10, 1 / player.propRange, 10, player.colors, {
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
            player.draw(ctx);
            menus.ingame(ctx, player.fuel, player.health, player.money, player.equipped);

            player.money += 0.01;
            if (player.triggered === 'poison') {
                player.health -= 0.1;
            }

            if (player.health <= 0) {
                player.triggered = null;
                player.totalMoney += Math.round(player.money);
                window.state = 'end';
            }
        }
        else if (window.state === 'end') {
            audio.pause(sfx);
            menus.drawEnd(ctx, player.money);
        }
        else if(window.state === 'store') {
            menus.drawStore(ctx, player.totalMoney);
        }
        buttons.drawAll();
    });
});

window.resetGame = function() {
    window.state = 'game';
    player.reset();
    particles.reset();
    flyingObjects.reset();
};

var changeState = function() {
    if (window.state === 'menu') {
        window.state = 'game';
    }
    else if (window.state === 'end') {
        window.resetGame();
    }
};

// canvas.addEventListener('click', changeState, false);
document.body.addEventListener('keydown', function(e) {
    if (e.keyCode === 13) {
        changeState();
    }
}, false);

},{"./achievements":2,"./audio":3,"./buttons":4,"./collisions":5,"./keys":6,"./loader.js":7,"./menus":8,"./particles":9,"./player":10,"./raf":11,"./store":13,"./ufos":15}],2:[function(require,module,exports){
// SOURCE-CHECKER ACHIEVEMENT RECEIVED. Congrats, you've clearly achieved a lot.
var stats = {}; // This will be stored in localStorage and contains relevant info for achievements

var achievements = [
    {
        name: 'Rock Slayer',
        desc: 'Destroy X rocks',
        test: function() {
            return stats.rocks > 10;
        }
    },
    {
        name: 'Adrenaline Junky',
        desc: 'Keep thrusting for X seconds',
        test: function() {
            return stats.maxSecondsThrusted > 10;
        }
    }
];
},{}],3:[function(require,module,exports){
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
},{}],4:[function(require,module,exports){
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
            y >= button.y && y <= button.y + button.height &&
            window.state === button.screenState) {
            button.onclick();
            return true;
        }
    }
};
canvas.addEventListener('click', checkClick, false);
},{}],5:[function(require,module,exports){
var particlesModule = require('./particles');
var shake = require('./screenshake');

var playerHitBox = {
    x: 375,
    y: 270,
    width: 50,
    height: 60
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
    if (fo.image === 'power-icon.png') {
        return false;
    }
    particlesModule.createParticles(fo.x, fo.y, fo.speed, 0.01, fo.width * fo.height / 100, [fo.color], {
        range: Math.random() * 2 * Math.PI,
        noCollide: true,
        dx: fo.dx,
        dy: fo.dy
    });
};

var justExploded = false;
var ticks = 0;
var check = function(player, foModule) {
    // fo stands for flyingObjects
    var particles = particlesModule.array;
    var fos = foModule.array;
    // Manage flying object spawning
    var foInView = inArea(camera, fos, undefined, function(fo) {
        fo.alive = false;
    });
    if (foInView.length < 30 && justExploded !== true) {
        foModule.spawn(Math.random() * 100);
    }
    else if (justExploded === true) {
        ticks++;
        if (ticks >= 150) {
            ticks = 0;
            justExploded = false;
        }
    }

    // Collisions between the player and rocks
    var foToTest = inArea(playerArea, fos);
    var fo;
    for (var i = 0; i < foToTest.length; i++) {
        fo = foToTest[i];
        if (aabb(playerHitBox, fo)) {
            // console.log('HIT');
            fo.alive = false;
            if (fo.image === 'power-icon.png') {
                audio.play('collect');
                player.fuel += 10;
            }
            else {
                audio.play('collide');
                if (player.triggered !== 'invincibility') {
                    player.hit = true;
                    player.health -= (fo.width * fo.height) / 100;
                }
                else {
                    player.addMoney(fo);
                }
                explodeObj(fo);
                shake(5);
            }
        }
    }
    if (player.triggered === 'invincibility') {
        ticks++;
        if (ticks >= 600) {
            ticks = 0;
            player.triggered = null;
            player.equipped = null;
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
                player.addMoney(fo);
                explodeObj(fo);
                shake(2);
            }
        });
    }

    if (player.triggered === 'explode') {
        player.triggered = null;
        player.equipped = null;
        justExploded = true;

        shake(10);
        for (var i = 0; i < fos.length; i++) {
            fo = fos[i];
            if (fo.image !== 'power-icon.png') {
                fo.alive = false;
                player.addMoney(fo);
                explodeObj(fo);
            }
        }
    }
};

module.exports = {
    check: check
};
},{"./particles":9,"./screenshake":12}],6:[function(require,module,exports){
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
        player.trigger();
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
    }
};

},{"./player":10}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
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


buttons.addButton(
    {
        x: 200,
        y: 400,
        width: 200,
        height: 50
    },
    'end',
    function() {
        window.resetGame();
    },
    'Play again',
    '12pt Tempesta Five'
);
buttons.addButton(
    {
        x: 450,
        y: 400,
        width: 200,
        height: 50
    },
    'end',
    function() {
        window.state = 'store';
    },
    'Store',
    '12pt Tempesta Five'
);

module.exports = {
    drawMenu: function(ctx) {
        ctx.fillStyle = '#0f0d20';
        ctx.fillRect(0, 0, 800, 600);

        ctx.drawImage(loader.images['logo.png'], 314, 180);
        text.write('A GAME BY', 'center', 500);
        text.write('@AMAANC AND @MIKEDIDTHIS', 'center', 520, function(ctx) {
            ctx.fillStyle = '#DCFCF9';
            ctx.font = '12pt Tempesta Five';
        });

    },
    drawEnd: function(ctx, money) {
        ctx.fillStyle = '#0f0d20';
        ctx.fillRect(0, 0, 800, 600);
        text.write('You earned A$' + Math.round(money) + '.', 'center', 300, function() {
            ctx.fillStyle = 'white';
            ctx.font = '26pt Tempesta Five';
        });
    },
    ingame: function(ctx, fuel, health, money, equipped) {
        ctx.drawImage(loader.images['power-bar-icon.png'], 30, 500);
        ctx.fillStyle = 'orange';
        ctx.fillRect(30, 490 - fuel, 20, fuel);

        ctx.drawImage(loader.images['health-bar-icon.png'], 70, 500);
        ctx.fillStyle = 'red';
        ctx.fillRect(70, 490 - health, 20, health);

        text.write('A$: ' + Math.round(money), 30, 550, function() {
            ctx.font = '12pt Tempesta Five';
            ctx.fillStyle = 'white';
        });
        text.write('Equipped: ' + equipped, 30, 590, function() {
            ctx.font = '10pt Tempesta Five';
            ctx.fillStyle = 'white';
        });
    },
    drawStore: function(ctx, totalMoney) {
        ctx.fillStyle = '#0f0d20';
        ctx.fillRect(0, 0, 800, 600);
        text.write('STORE', 30, 50, function() {
            ctx.font = '16pt Tempesta Five';
            ctx.fillStyle = 'white';
        });
        text.write('Altarian Dollars: ' + totalMoney, 200, 50, function() {
            ctx.font = '16pt Tempesta Five';
            ctx.fillStyle = 'white';
        });
    }
};
},{"./buttons":4,"./loader":7,"./text":14}],9:[function(require,module,exports){
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
    this.loop = function(elapsed, ctx, player) {
        if (this.delay > 0) {
            if (this.delay <= 1) {
                this.angle = player.angle - this.range + (Math.random() * 2 * this.range);
            }
            this.delay--;
            return false;
        }
        this.x += 66.6 * elapsed * (this.dx - window.player.offsetX + Math.sin(-this.angle) * speed);
        this.y += 66.6 * elapsed * (this.dy - window.player.offsetY + Math.cos(-this.angle) * speed);
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
        particles[i].loop(elapsed, ctx, player);
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

},{}],10:[function(require,module,exports){
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

player.defaults = {
    money: 0,
    angle: 0,
    offsetY: 0,
    offsetX: 0,
    health: 10,
    fuel: 10,
    hit: false,
    propRange: 8.3,
    moneyMultiplier: 1
};

player.width = 52;
player.height = 60;
player.x = (canvas.width - player.width) / 2;
player.y = (canvas.height - player.height) / 2;
player.angle = 0;
player.totalMoney = player.money = 0;
player.colors = ['black', 'orange'];

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
    var keys = Object.keys(player.defaults);
    for (var i = 0; i < keys.length; i++) {
        player[keys[i]] = player.defaults[keys[i]];
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
player.trigger = function() {
    // Enable the equippable item
    player.triggered = player.equipped;
};

player.addMoney = function(fo) {
    player.money += player.moneyMultiplier * (fo.width * fo.height) / 1000;
};


var ticks = 0;
player.draw = function(ctx) {
    // Player
    ctx.save();
    ctx.translate(player.x + hW, player.y + hH);
    ctx.rotate(player.angle);
    // player.hit is set in collisions.js
    // If the player's been hit, we want it to flash white to indicate that
    if (player.triggered === 'invincibility') {
        ctx.drawImage(whiten(player[player.state].name, 'green'), -hW, -hH);
    }
    else if (player.hit) {
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

},{"./whiten":16}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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
},{}],13:[function(require,module,exports){
// Handles the market / store part of the game
var player = require('./player');
var buttons = require('./buttons');

var items = [
    {
        name: 'Health',
        desc: 'Increases starting health by 10',
        fn: function() {
            player.defaults.health += 10;
        }
    },
    {
        name: 'Fuel',
        desc: 'Increases starting fuel by 10',
        fn: function() {
            player.defaults.fuel += 10;
        }
    },
    {
        name: 'Colorful',
        desc: '',
        fn: function() {
            player.colors = ['blue', 'red'];
            // player.colors = ['white', 'anything'];
        }
    },
    {
        name: 'Gold Suit',
        desc: '',
        fn: function() {

        }
    },
    {
        name: 'Efficiency',
        desc: 'Increases efficiency of mining rocks so you get more Altarian Dollars per asteroid',
        fn: function() {
            player.defaults.moneyMultiplier += 0.1;
        }
    },
    {
        name: 'Indicators',
        desc: 'Find shit more easily. Indicators around the screen will show you where objects like XYZ are',
        fn: function() {

        }
    },
    {
        name: 'Range',
        desc: 'The propulsion particles go further away, making it easier to destroy rocks',
        fn: function() {
            player.defaults.propRange += 1;
        }
    },
    {
        name: 'Auto-shield',
        desc: 'A shield protects you from one hit in every game automatically',
        fn: function() {

        }
    },
    {
        name: 'Invincibility',
        desc: 'Press spacebar to become invincible to all asteroids, so you can be as careless as you want for 30 seconds',
        fn: function() {
            player.defaults.equipped = 'invincibility';
        }
    },
    {
        name: 'Panic explode',
        desc: 'Press spacebar to make all asteroids on screen explode',
        fn: function() {
            player.defaults.equipped = 'explode';
        }
    },
    {
        name: 'Poison',
        desc: 'Is death ever better than hardship? Yes, when you get an achievement for it. Press spacebar to die within 30 seconds.',
        fn: function() {
            player.defaults.equipped = 'poison';
        }
    },
    {
        name: '',
        desc: '',
        fn: function() {

        }
    }
];

var addItemButtons = function() {
    var item;
    for (var i = 0; i < items.length; i++) {
        item = items[i];
        buttons.addButton(
            {
                x: 100 + (i % 4) * 120,
                y: 100 + Math.floor(i / 4) * 120,
                width: 100,
                height: 100
            },
            'store',
            item.fn,
            item.name,
            '12pt Tempesta Five'
        );
    }

    buttons.addButton(
        {
            x: 'center',
            y: 470,
            width: 200,
            height: 50
        },
        'store',
        function() {
            window.resetGame();
        },
        'Play',
        '14pt Tempesta Five'
    );
};

addItemButtons();
},{"./buttons":4,"./player":10}],14:[function(require,module,exports){
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
},{}],15:[function(require,module,exports){
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
            obj.x += 66.6 * elapsed * (obj.dx - offsetX);
            obj.y += 66.6 * elapsed * (obj.dy - offsetY);
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
},{"./loader.js":7}],16:[function(require,module,exports){
// This file exports a function that lets you make images "flash" momentarily. Like the player when he gets hit by an asteroid
var loader = require('./loader');
var images = loader.images;

var cache = {};
var whiten = function(imgName, color) {
    if (!color) {
        color = 'white';
    }
    if (cache[imgName + '.' + color]) {
        return cache[imgName + '.' + color];
    }
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var img = images[imgName];

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, img.width, img.height);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, img.width, img.height);
    cache[imgName + '.' + color] = canvas;
    return canvas;
};

module.exports = whiten;
},{"./loader":7}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4vc3JjL21haW4iLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9hY2hpZXZlbWVudHMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9hdWRpby5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL2J1dHRvbnMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9jb2xsaXNpb25zLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMva2V5cy5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL2xvYWRlci5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL21lbnVzLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvcGFydGljbGVzLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvcGxheWVyLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvcmFmLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvc2NyZWVuc2hha2UuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9zdG9yZS5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL3RleHQuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy91Zm9zLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvd2hpdGVuLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBsb2FkZXIgPSByZXF1aXJlKCcuL2xvYWRlci5qcycpO1xuXG52YXIgcmFmID0gcmVxdWlyZSgnLi9yYWYnKTtcbnZhciBwbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpO1xudmFyIGtleSA9IHJlcXVpcmUoJy4va2V5cycpO1xudmFyIHBhcnRpY2xlcyA9IHJlcXVpcmUoJy4vcGFydGljbGVzJyk7XG52YXIgZmx5aW5nT2JqZWN0cyA9IHJlcXVpcmUoJy4vdWZvcycpO1xudmFyIGNvbGxpc2lvbnMgPSByZXF1aXJlKCcuL2NvbGxpc2lvbnMnKTtcbnZhciBtZW51cyA9IHJlcXVpcmUoJy4vbWVudXMnKTtcbnZhciBidXR0b25zID0gcmVxdWlyZSgnLi9idXR0b25zJyk7XG52YXIgYXVkaW8gPSByZXF1aXJlKCcuL2F1ZGlvJyk7XG52YXIgc3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlJyk7XG52YXIgYWNoaWV2ZW1lbnRzID0gcmVxdWlyZSgnLi9hY2hpZXZlbWVudHMnKTtcblxudmFyIGNhbnZhcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNnYW1lJyk7XG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbnZhciBzZnggPSBbJ2NvbGxlY3QnLCAnY29sbGlkZScsICdleHBsb2RlX21ldGVvcicsICdqZXRwYWNrJ107XG5sb2FkZXIuZG9uZShmdW5jdGlvbigpIHtcbiAgICBhdWRpby5tdXRlKCk7IC8vIEJlY2F1c2UgSSBkb24ndCB3YW50IGl0IGF1dG9wbGF5aW5nIHdoaWxlIEkgZGV2ZWxvcCBpdCFcblxuICAgIHdpbmRvdy5zdGF0ZSA9ICdtZW51JztcbiAgICByYWYuc3RhcnQoZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgICAgICBpZiAod2luZG93LnN0YXRlID09PSAnbWVudScpIHtcbiAgICAgICAgICAgIG1lbnVzLmRyYXdNZW51KGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAod2luZG93LnN0YXRlID09PSAnZ2FtZScpIHtcbiAgICAgICAgICAgIHBsYXllci5ncmF2aXR5KGVsYXBzZWQpO1xuICAgICAgICAgICAgaWYgKGtleS51cCgpICYmIHBsYXllci5mdWVsID4gMCkge1xuICAgICAgICAgICAgICAgIGF1ZGlvLnBsYXkoJ2pldHBhY2snKTtcbiAgICAgICAgICAgICAgICBwbGF5ZXIudXAoZWxhcHNlZCk7XG4gICAgICAgICAgICAgICAgcGFydGljbGVzLmNyZWF0ZVBhcnRpY2xlcyhwbGF5ZXIueCArIHBsYXllci53aWR0aCAvIDIsIHBsYXllci55ICsgcGxheWVyLmhlaWdodCAvIDIsIDEwLCAxIC8gcGxheWVyLnByb3BSYW5nZSwgMTAsIHBsYXllci5jb2xvcnMsIHtcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IE1hdGguUEkgLyAxMFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhdWRpby5wYXVzZSgnamV0cGFjaycpO1xuICAgICAgICAgICAgICAgIHBsYXllci5tb3ZlKGVsYXBzZWQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoa2V5LnJpZ2h0KCkpIHtcbiAgICAgICAgICAgICAgICBwbGF5ZXIucmlnaHQoZWxhcHNlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoa2V5LmxlZnQoKSkge1xuICAgICAgICAgICAgICAgIHBsYXllci5sZWZ0KGVsYXBzZWQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUaGlzIGZ1bmN0aW9uIGNoZWNrcyBmb3IgYWxsIHJlcXVpcmVkIGNvbGxpc2lvbnMsIGFuZCBjYWxscyB0aGUgY29ycmVzcG9uZGluZyBmdW5jdGlvbnMgYWZ0ZXIgdG9vXG4gICAgICAgICAgICBjb2xsaXNpb25zLmNoZWNrKHBsYXllciwgZmx5aW5nT2JqZWN0cyk7XG5cbiAgICAgICAgICAgIC8vIENsZWFyIHRoZSBzY3JlZW5cbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzBmMGQyMCc7XG4gICAgICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgODAwLCA2MDApO1xuXG4gICAgICAgICAgICBwYXJ0aWNsZXMuZHJhdyhlbGFwc2VkLCBjdHgsIHBsYXllcik7XG4gICAgICAgICAgICBmbHlpbmdPYmplY3RzLmxvb3AoZWxhcHNlZCwgY3R4LCBwbGF5ZXIub2Zmc2V0WCwgcGxheWVyLm9mZnNldFkpO1xuICAgICAgICAgICAgcGxheWVyLmRyYXcoY3R4KTtcbiAgICAgICAgICAgIG1lbnVzLmluZ2FtZShjdHgsIHBsYXllci5mdWVsLCBwbGF5ZXIuaGVhbHRoLCBwbGF5ZXIubW9uZXksIHBsYXllci5lcXVpcHBlZCk7XG5cbiAgICAgICAgICAgIHBsYXllci5tb25leSArPSAwLjAxO1xuICAgICAgICAgICAgaWYgKHBsYXllci50cmlnZ2VyZWQgPT09ICdwb2lzb24nKSB7XG4gICAgICAgICAgICAgICAgcGxheWVyLmhlYWx0aCAtPSAwLjE7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwbGF5ZXIuaGVhbHRoIDw9IDApIHtcbiAgICAgICAgICAgICAgICBwbGF5ZXIudHJpZ2dlcmVkID0gbnVsbDtcbiAgICAgICAgICAgICAgICBwbGF5ZXIudG90YWxNb25leSArPSBNYXRoLnJvdW5kKHBsYXllci5tb25leSk7XG4gICAgICAgICAgICAgICAgd2luZG93LnN0YXRlID0gJ2VuZCc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAod2luZG93LnN0YXRlID09PSAnZW5kJykge1xuICAgICAgICAgICAgYXVkaW8ucGF1c2Uoc2Z4KTtcbiAgICAgICAgICAgIG1lbnVzLmRyYXdFbmQoY3R4LCBwbGF5ZXIubW9uZXkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYod2luZG93LnN0YXRlID09PSAnc3RvcmUnKSB7XG4gICAgICAgICAgICBtZW51cy5kcmF3U3RvcmUoY3R4LCBwbGF5ZXIudG90YWxNb25leSk7XG4gICAgICAgIH1cbiAgICAgICAgYnV0dG9ucy5kcmF3QWxsKCk7XG4gICAgfSk7XG59KTtcblxud2luZG93LnJlc2V0R2FtZSA9IGZ1bmN0aW9uKCkge1xuICAgIHdpbmRvdy5zdGF0ZSA9ICdnYW1lJztcbiAgICBwbGF5ZXIucmVzZXQoKTtcbiAgICBwYXJ0aWNsZXMucmVzZXQoKTtcbiAgICBmbHlpbmdPYmplY3RzLnJlc2V0KCk7XG59O1xuXG52YXIgY2hhbmdlU3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAod2luZG93LnN0YXRlID09PSAnbWVudScpIHtcbiAgICAgICAgd2luZG93LnN0YXRlID0gJ2dhbWUnO1xuICAgIH1cbiAgICBlbHNlIGlmICh3aW5kb3cuc3RhdGUgPT09ICdlbmQnKSB7XG4gICAgICAgIHdpbmRvdy5yZXNldEdhbWUoKTtcbiAgICB9XG59O1xuXG4vLyBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjaGFuZ2VTdGF0ZSwgZmFsc2UpO1xuZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZSkge1xuICAgIGlmIChlLmtleUNvZGUgPT09IDEzKSB7XG4gICAgICAgIGNoYW5nZVN0YXRlKCk7XG4gICAgfVxufSwgZmFsc2UpO1xuIiwiLy8gU09VUkNFLUNIRUNLRVIgQUNISUVWRU1FTlQgUkVDRUlWRUQuIENvbmdyYXRzLCB5b3UndmUgY2xlYXJseSBhY2hpZXZlZCBhIGxvdC5cbnZhciBzdGF0cyA9IHt9OyAvLyBUaGlzIHdpbGwgYmUgc3RvcmVkIGluIGxvY2FsU3RvcmFnZSBhbmQgY29udGFpbnMgcmVsZXZhbnQgaW5mbyBmb3IgYWNoaWV2ZW1lbnRzXG5cbnZhciBhY2hpZXZlbWVudHMgPSBbXG4gICAge1xuICAgICAgICBuYW1lOiAnUm9jayBTbGF5ZXInLFxuICAgICAgICBkZXNjOiAnRGVzdHJveSBYIHJvY2tzJyxcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RhdHMucm9ja3MgPiAxMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBuYW1lOiAnQWRyZW5hbGluZSBKdW5reScsXG4gICAgICAgIGRlc2M6ICdLZWVwIHRocnVzdGluZyBmb3IgWCBzZWNvbmRzJyxcbiAgICAgICAgdGVzdDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RhdHMubWF4U2Vjb25kc1RocnVzdGVkID4gMTA7XG4gICAgICAgIH1cbiAgICB9XG5dOyIsInZhciBhdWRpbyA9IHdpbmRvdy5hdWRpbyA9IHt9OyAvLyBNYWRlIGl0IGEgZ2xvYmFsIHNvIEkgY2FuIGVhc2lseSB0ZXN0XG52YXIgZWxlbWVudHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdhdWRpbycpO1xudmFyIEZBREVfU1BFRUQgPSAwLjE7XG5cbmF1ZGlvLm11dGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBlbGVtZW50c1tpXS52b2x1bWUgPSAwO1xuICAgIH1cbn07XG5hdWRpby5zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZWxlbWVudHNbaV0ucGF1c2UoKTtcbiAgICB9XG59O1xuXG5hdWRpby5wbGF5ID0gZnVuY3Rpb24gKG5hbWUsIHNlZWtGcm9tKSB7XG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChuYW1lKTtcbiAgICBlbGVtLmN1cnJlbnRUaW1lID0gc2Vla0Zyb20gfHwgMDtcbiAgICBlbGVtLnBsYXkoKTtcbn07XG5hdWRpby5wYXVzZSA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgaWYgKHR5cGVvZiBuYW1lID09PSAnc3RyaW5nJykge1xuICAgICAgICB2YXIgbmFtZXMgPSBbbmFtZV07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBuYW1lcyA9IG5hbWU7XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChuYW1lc1tpXSk7XG4gICAgICAgIGVsZW0ucGF1c2UoKTtcbiAgICB9XG4gICAgXG59O1xuXG5hdWRpby5mYWRlb3V0ID0gZnVuY3Rpb24gKG5hbWUsIHNlZWtGcm9tLCBjYikge1xuICAgIHZhciBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobmFtZSk7XG4gICAgdmFyIHZvbHVtZSA9IGVsZW0udm9sdW1lO1xuICAgIHZhciBkZWNyZWFzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdm9sdW1lIC09IEZBREVfU1BFRUQ7XG4gICAgICAgIGNvbnNvbGUubG9nKHZvbHVtZSk7XG4gICAgICAgIGlmICh2b2x1bWUgPD0gMCkge1xuICAgICAgICAgICAgZWxlbS52b2x1bWUgPSAwO1xuICAgICAgICAgICAgZWxlbS5wYXVzZSgpO1xuICAgICAgICAgICAgY2IgJiYgY2IoZWxlbSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlbGVtLnZvbHVtZSA9IHZvbHVtZTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZGVjcmVhc2UsIDEwMC8zKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgZGVjcmVhc2UoKTtcbn1cbmF1ZGlvLmZhZGVpbiA9IGZ1bmN0aW9uIChuYW1lLCBzZWVrRnJvbSwgY2IpIHtcbiAgICB2YXIgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG5hbWUpO1xuICAgIHZhciB2b2x1bWUgPSBlbGVtLnZvbHVtZSA9IDA7XG4gICAgZWxlbS5wbGF5KCk7XG4gICAgdmFyIGluY3JlYXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2b2x1bWUgKz0gRkFERV9TUEVFRDtcbiAgICAgICAgaWYgKHZvbHVtZSA+PSAxKSB7XG4gICAgICAgICAgICBlbGVtLnZvbHVtZSA9IDE7XG4gICAgICAgICAgICBjYiAmJiBjYihlbGVtKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGVsZW0udm9sdW1lID0gdm9sdW1lO1xuICAgICAgICAgICAgc2V0VGltZW91dChpbmNyZWFzZSwgMTAwLzMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBpbmNyZWFzZSgpO1xufVxubW9kdWxlLmV4cG9ydHMgPSBhdWRpbzsiLCIvLyBNYWtlcyBpdCBlYXNpZXIgdG8gbWFrZSBtZW51IGJ1dHRvbnNcbnZhciBidXR0b25zID0gW107XG5cbnZhciBjYW52YXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZ2FtZScpO1xudmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG52YXIgZHJhd0J1dHRvbiA9IGZ1bmN0aW9uKGJ1dHRvbikge1xuICAgIGlmIChidXR0b24uaW1nKSB7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UoYnV0dG9uLngsIGJ1dHRvbi55LCBidXR0b24ud2lkdGgsIGJ1dHRvbi5oZWlnaHQpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgY3R4LnN0cm9rZVJlY3QoYnV0dG9uLngsIGJ1dHRvbi55LCBidXR0b24ud2lkdGgsIGJ1dHRvbi5oZWlnaHQpO1xuICAgIH1cbiAgICBpZiAoYnV0dG9uLnRleHQpIHtcblxuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgY3R4LmZvbnQgPSBidXR0b24uZm9udDtcbiAgICAgICAgdmFyIHRleHREaW0gPSBjdHgubWVhc3VyZVRleHQoYnV0dG9uLnRleHQpO1xuICAgICAgICBjdHguZmlsbFRleHQoYnV0dG9uLnRleHQsIGJ1dHRvbi54ICsgKGJ1dHRvbi53aWR0aCAtIHRleHREaW0ud2lkdGgpIC8gMiwgYnV0dG9uLnkgKyAoYnV0dG9uLmhlaWdodCArIDEwKSAvIDIpO1xuICAgIH1cbn07XG5cbi8vIGRpbSA9IGRpbWVuc2lvbnMgPSB7eCwgeSwgd2lkdGgsIGhlaWdodH0sXG4vLyBzY3JlZW5TdGF0ZTsgd2hlcmUgdGhlIGJ1dHRvbiBpcyB2aXNpYmxlXG4vLyB0ZXh0IHRvIHdyaXRlIG9uIGJ1dHRvbixcbi8vIGltZyB0byBwdXQgYmVoaW5kIHRleHQgKGlmIHVuZGVmaW5lZCwgaXQnbGwgZHJhdyBhIHdoaXRlIGJvcmRlciBhcm91bmQgdGhlIGJ1dHRvbiBhcmVhKVxudmFyIGFkZEJ1dHRvbiA9IGZ1bmN0aW9uKGRpbSwgc2NyZWVuU3RhdGUsIG9uY2xpY2ssIHRleHQsIGZvbnQsIGltZykge1xuICAgIHZhciBidXR0b24gPSB7fTtcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGRpbSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGJ1dHRvbltrZXlzW2ldXSA9IGRpbVtrZXlzW2ldXTtcbiAgICB9XG4gICAgaWYgKGJ1dHRvbi54ID09PSAnY2VudGVyJykge1xuICAgICAgICBidXR0b24ueCA9IChjYW52YXMud2lkdGggLSBidXR0b24ud2lkdGgpIC8gMjtcbiAgICB9XG4gICAgaWYgKGJ1dHRvbi55ID09PSAnY2VudGVyJykge1xuICAgICAgICBidXR0b24ueSA9IChjYW52YXMuaGVpZ2h0IC0gYnV0dG9uLmhlaWdodCkgLyAyO1xuICAgIH1cbiAgICBidXR0b24uc2NyZWVuU3RhdGUgPSBzY3JlZW5TdGF0ZSB8fCAnbWVudSc7XG4gICAgYnV0dG9uLm9uY2xpY2sgPSBvbmNsaWNrO1xuICAgIGJ1dHRvbi50ZXh0ID0gdGV4dCB8fCAnJztcbiAgICBidXR0b24uZm9udCA9IGZvbnQgfHwgJzEycHQgVGVtcGVzdGEgRml2ZSc7XG4gICAgYnV0dG9uLmltZyA9IGltZztcbiAgICBidXR0b25zLnB1c2goYnV0dG9uKTtcbn07XG5cbnZhciBkcmF3QWxsID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGJ1dHRvbjtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYnV0dG9uID0gYnV0dG9uc1tpXTtcbiAgICAgICAgaWYgKHdpbmRvdy5zdGF0ZSA9PT0gYnV0dG9uLnNjcmVlblN0YXRlKSB7XG4gICAgICAgICAgICBkcmF3QnV0dG9uKGJ1dHRvbik7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBkcmF3QWxsOiBkcmF3QWxsLFxuICAgIGFkZEJ1dHRvbjogYWRkQnV0dG9uXG59O1xuXG52YXIgY2hlY2tDbGljayA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgeCA9IGUucGFnZVggLSBjYW52YXMub2Zmc2V0TGVmdDtcbiAgICB2YXIgeSA9IGUucGFnZVkgLSBjYW52YXMub2Zmc2V0VG9wO1xuICAgIHZhciBidXR0b247XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBidXR0b25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGJ1dHRvbiA9IGJ1dHRvbnNbaV07XG4gICAgICAgIGlmICh4ID49IGJ1dHRvbi54ICYmIHggPD0gYnV0dG9uLnggKyBidXR0b24ud2lkdGggJiZcbiAgICAgICAgICAgIHkgPj0gYnV0dG9uLnkgJiYgeSA8PSBidXR0b24ueSArIGJ1dHRvbi5oZWlnaHQgJiZcbiAgICAgICAgICAgIHdpbmRvdy5zdGF0ZSA9PT0gYnV0dG9uLnNjcmVlblN0YXRlKSB7XG4gICAgICAgICAgICBidXR0b24ub25jbGljaygpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG59O1xuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2hlY2tDbGljaywgZmFsc2UpOyIsInZhciBwYXJ0aWNsZXNNb2R1bGUgPSByZXF1aXJlKCcuL3BhcnRpY2xlcycpO1xudmFyIHNoYWtlID0gcmVxdWlyZSgnLi9zY3JlZW5zaGFrZScpO1xuXG52YXIgcGxheWVySGl0Qm94ID0ge1xuICAgIHg6IDM3NSxcbiAgICB5OiAyNzAsXG4gICAgd2lkdGg6IDUwLFxuICAgIGhlaWdodDogNjBcbn07XG5cbnZhciBhYWJiID0gZnVuY3Rpb24oYSwgYikge1xuICAgIGlmIChcbiAgICAgICAgTWF0aC5hYnMoYS54ICsgYS53aWR0aCAvIDIgLSBiLnggLSBiLndpZHRoIC8gMikgPiAoYS53aWR0aCArIGIud2lkdGgpIC8gMiB8fFxuICAgICAgICBNYXRoLmFicyhhLnkgKyBhLmhlaWdodCAvIDIgLSBiLnkgLSBiLmhlaWdodCAvIDIpID4gKGEuaGVpZ2h0ICsgYi5oZWlnaHQpIC8gMlxuICAgICkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxudmFyIGluQXJlYSA9IGZ1bmN0aW9uKGFyZWEsIGFycmF5LCByZXNwQ29sbGlkaW5nLCByZXNwTm90Q29sbGlkaW5nKSB7XG4gICAgdmFyIHJldCA9IFtdO1xuICAgIHZhciBjdXJFbGVtO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY3VyRWxlbSA9IGFycmF5W2ldO1xuICAgICAgICBpZiAoYWFiYihhcmVhLCBjdXJFbGVtKSkge1xuICAgICAgICAgICAgcmV0LnB1c2goY3VyRWxlbSk7XG4gICAgICAgICAgICBpZiAocmVzcENvbGxpZGluZykge1xuICAgICAgICAgICAgICAgIHJlc3BDb2xsaWRpbmcoY3VyRWxlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocmVzcE5vdENvbGxpZGluZykge1xuICAgICAgICAgICAgcmVzcE5vdENvbGxpZGluZyhjdXJFbGVtKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufTtcblxudmFyIHBsYXllckFyZWEgPSB7XG4gICAgeDogMzI1LFxuICAgIHk6IDIyNSxcbiAgICB3aWR0aDogMTUwLFxuICAgIGhlaWdodDogMTUwXG59O1xuXG52YXIgY2FtZXJhID0ge1xuICAgIHg6IC00MDAsXG4gICAgeTogLTMwMCxcbiAgICB3aWR0aDogMTYwMCxcbiAgICBoZWlnaHQ6IDEyMDBcbn07XG5cbnZhciBleHBsb2RlT2JqID0gZnVuY3Rpb24oZm8pIHtcbiAgICBpZiAoZm8uaW1hZ2UgPT09ICdwb3dlci1pY29uLnBuZycpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBwYXJ0aWNsZXNNb2R1bGUuY3JlYXRlUGFydGljbGVzKGZvLngsIGZvLnksIGZvLnNwZWVkLCAwLjAxLCBmby53aWR0aCAqIGZvLmhlaWdodCAvIDEwMCwgW2ZvLmNvbG9yXSwge1xuICAgICAgICByYW5nZTogTWF0aC5yYW5kb20oKSAqIDIgKiBNYXRoLlBJLFxuICAgICAgICBub0NvbGxpZGU6IHRydWUsXG4gICAgICAgIGR4OiBmby5keCxcbiAgICAgICAgZHk6IGZvLmR5XG4gICAgfSk7XG59O1xuXG52YXIganVzdEV4cGxvZGVkID0gZmFsc2U7XG52YXIgdGlja3MgPSAwO1xudmFyIGNoZWNrID0gZnVuY3Rpb24ocGxheWVyLCBmb01vZHVsZSkge1xuICAgIC8vIGZvIHN0YW5kcyBmb3IgZmx5aW5nT2JqZWN0c1xuICAgIHZhciBwYXJ0aWNsZXMgPSBwYXJ0aWNsZXNNb2R1bGUuYXJyYXk7XG4gICAgdmFyIGZvcyA9IGZvTW9kdWxlLmFycmF5O1xuICAgIC8vIE1hbmFnZSBmbHlpbmcgb2JqZWN0IHNwYXduaW5nXG4gICAgdmFyIGZvSW5WaWV3ID0gaW5BcmVhKGNhbWVyYSwgZm9zLCB1bmRlZmluZWQsIGZ1bmN0aW9uKGZvKSB7XG4gICAgICAgIGZvLmFsaXZlID0gZmFsc2U7XG4gICAgfSk7XG4gICAgaWYgKGZvSW5WaWV3Lmxlbmd0aCA8IDMwICYmIGp1c3RFeHBsb2RlZCAhPT0gdHJ1ZSkge1xuICAgICAgICBmb01vZHVsZS5zcGF3bihNYXRoLnJhbmRvbSgpICogMTAwKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoanVzdEV4cGxvZGVkID09PSB0cnVlKSB7XG4gICAgICAgIHRpY2tzKys7XG4gICAgICAgIGlmICh0aWNrcyA+PSAxNTApIHtcbiAgICAgICAgICAgIHRpY2tzID0gMDtcbiAgICAgICAgICAgIGp1c3RFeHBsb2RlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ29sbGlzaW9ucyBiZXR3ZWVuIHRoZSBwbGF5ZXIgYW5kIHJvY2tzXG4gICAgdmFyIGZvVG9UZXN0ID0gaW5BcmVhKHBsYXllckFyZWEsIGZvcyk7XG4gICAgdmFyIGZvO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZm9Ub1Rlc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZm8gPSBmb1RvVGVzdFtpXTtcbiAgICAgICAgaWYgKGFhYmIocGxheWVySGl0Qm94LCBmbykpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdISVQnKTtcbiAgICAgICAgICAgIGZvLmFsaXZlID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoZm8uaW1hZ2UgPT09ICdwb3dlci1pY29uLnBuZycpIHtcbiAgICAgICAgICAgICAgICBhdWRpby5wbGF5KCdjb2xsZWN0Jyk7XG4gICAgICAgICAgICAgICAgcGxheWVyLmZ1ZWwgKz0gMTA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBhdWRpby5wbGF5KCdjb2xsaWRlJyk7XG4gICAgICAgICAgICAgICAgaWYgKHBsYXllci50cmlnZ2VyZWQgIT09ICdpbnZpbmNpYmlsaXR5Jykge1xuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuaGl0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcGxheWVyLmhlYWx0aCAtPSAoZm8ud2lkdGggKiBmby5oZWlnaHQpIC8gMTAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGxheWVyLmFkZE1vbmV5KGZvKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXhwbG9kZU9iaihmbyk7XG4gICAgICAgICAgICAgICAgc2hha2UoNSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKHBsYXllci50cmlnZ2VyZWQgPT09ICdpbnZpbmNpYmlsaXR5Jykge1xuICAgICAgICB0aWNrcysrO1xuICAgICAgICBpZiAodGlja3MgPj0gNjAwKSB7XG4gICAgICAgICAgICB0aWNrcyA9IDA7XG4gICAgICAgICAgICBwbGF5ZXIudHJpZ2dlcmVkID0gbnVsbDtcbiAgICAgICAgICAgIHBsYXllci5lcXVpcHBlZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgY29sbGlzaW9ucyBiZXR3ZWVuIHBhcnRpY2xlcyBhbmQgZm9cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRpY2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAocGFydGljbGVzW2ldLm5vQ29sbGlkZSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaW5BcmVhKHBhcnRpY2xlc1tpXSwgZm9zLCBmdW5jdGlvbihmbykge1xuICAgICAgICAgICAgaWYgKHBhcnRpY2xlc1tpXS5hbGl2ZSAmJiAhZm8uZ29vZCkge1xuICAgICAgICAgICAgICAgIGZvLmFsaXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgYXVkaW8ucGxheSgnZXhwbG9kZV9tZXRlb3InKTtcbiAgICAgICAgICAgICAgICBwbGF5ZXIuYWRkTW9uZXkoZm8pO1xuICAgICAgICAgICAgICAgIGV4cGxvZGVPYmooZm8pO1xuICAgICAgICAgICAgICAgIHNoYWtlKDIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAocGxheWVyLnRyaWdnZXJlZCA9PT0gJ2V4cGxvZGUnKSB7XG4gICAgICAgIHBsYXllci50cmlnZ2VyZWQgPSBudWxsO1xuICAgICAgICBwbGF5ZXIuZXF1aXBwZWQgPSBudWxsO1xuICAgICAgICBqdXN0RXhwbG9kZWQgPSB0cnVlO1xuXG4gICAgICAgIHNoYWtlKDEwKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmb3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGZvID0gZm9zW2ldO1xuICAgICAgICAgICAgaWYgKGZvLmltYWdlICE9PSAncG93ZXItaWNvbi5wbmcnKSB7XG4gICAgICAgICAgICAgICAgZm8uYWxpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBwbGF5ZXIuYWRkTW9uZXkoZm8pO1xuICAgICAgICAgICAgICAgIGV4cGxvZGVPYmooZm8pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY2hlY2s6IGNoZWNrXG59OyIsInZhciBwbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpO1xudmFyIGtleXMgPSB7fTtcbnZhciBDID0ge1xuICAgIFNQQUNFOiAzMixcbiAgICBMRUZUOiAzNyxcbiAgICBVUDogMzgsXG4gICAgUklHSFQ6IDM5LFxuICAgIERPV046IDQwXG59XG5kb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbihlKSB7XG4gICAgaWYgKGUua2V5Q29kZSA9PT0gQy5TUEFDRSkge1xuICAgICAgICBwbGF5ZXIudHJpZ2dlcigpO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGUua2V5Q29kZSA+PSAzNyAmJiBlLmtleUNvZGUgPD0gNDApIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cbiAgICBrZXlzW2Uua2V5Q29kZV0gPSB0cnVlO1xufSk7XG5kb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3Rpb24oZSkge1xuICAgIGtleXNbZS5rZXlDb2RlXSA9IGZhbHNlO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxlZnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1tDLkxFRlRdO1xuICAgIH0sXG4gICAgdXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1tDLlVQXTtcbiAgICB9LFxuICAgIHJpZ2h0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbQy5SSUdIVF07XG4gICAgfSxcbiAgICBkb3duOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbQy5ET1dOXTtcbiAgICB9XG59O1xuIiwidmFyIGltYWdlTmFtZXMgPSBbXG4gICAgJ2FzdHJvLnBuZycsXG4gICAgJ2FzdHJvLWZseWluZy5wbmcnLFxuICAgICdoZWFsdGgtYmFyLWljb24ucG5nJyxcbiAgICAnbG9nby5wbmcnLFxuICAgICdwb3dlci1iYXItaWNvbi5wbmcnLFxuICAgICdwb3dlci1pY29uLnBuZycsXG4gICAgJ3JvY2stNS5wbmcnLFxuICAgICdyb2NrLWFsdC01LnBuZycsXG4gICAgJ3JvY2stb2RkLTEucG5nJyxcbiAgICAncm9jay1vZGQtMy5wbmcnXG5dO1xuXG52YXIgaW1hZ2VzID0ge307XG52YXIgbG9hZGVkID0gMDtcbnZhciBkb25lID0gZnVuY3Rpb24oY2IpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGltYWdlTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaW1hZ2VzW2ltYWdlTmFtZXNbaV1dID0gbmV3IEltYWdlKCk7XG4gICAgICAgIGltYWdlc1tpbWFnZU5hbWVzW2ldXS5zcmMgPSAnaW1hZ2VzLycgKyBpbWFnZU5hbWVzW2ldO1xuICAgICAgICBpbWFnZXNbaW1hZ2VOYW1lc1tpXV0ub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBsb2FkZWQrKztcbiAgICAgICAgICAgIGlmIChsb2FkZWQgPT09IGltYWdlTmFtZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2IoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxpc3Q6IGltYWdlTmFtZXMsXG4gICAgaW1hZ2VzOiBpbWFnZXMsXG4gICAgZG9uZTogZG9uZSxcbiAgICBnZXQ6IGZ1bmN0aW9uKHN0cmluZykge1xuICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBpbWFnZU5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoaW1hZ2VOYW1lc1tpXS5pbmRleE9mKHN0cmluZykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgcmV0LnB1c2goaW1hZ2VOYW1lc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG59OyIsInZhciBsb2FkZXIgPSByZXF1aXJlKCcuL2xvYWRlcicpO1xudmFyIHRleHQgPSByZXF1aXJlKCcuL3RleHQnKTtcbnZhciBidXR0b25zID0gcmVxdWlyZSgnLi9idXR0b25zJyk7XG5cbmJ1dHRvbnMuYWRkQnV0dG9uKFxuICAgIHtcbiAgICAgICAgeDogJ2NlbnRlcicsXG4gICAgICAgIHk6IDMwMCxcbiAgICAgICAgd2lkdGg6IDIwMCxcbiAgICAgICAgaGVpZ2h0OiA1MFxuICAgIH0sXG4gICAgJ21lbnUnLFxuICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICB3aW5kb3cuc3RhdGUgPSAnZ2FtZSc7XG4gICAgfSxcbiAgICAnQ2xpY2sgdG8gcGxheScsXG4gICAgJzEycHQgVGVtcGVzdGEgRml2ZSdcbik7XG5cblxuYnV0dG9ucy5hZGRCdXR0b24oXG4gICAge1xuICAgICAgICB4OiAyMDAsXG4gICAgICAgIHk6IDQwMCxcbiAgICAgICAgd2lkdGg6IDIwMCxcbiAgICAgICAgaGVpZ2h0OiA1MFxuICAgIH0sXG4gICAgJ2VuZCcsXG4gICAgZnVuY3Rpb24oKSB7XG4gICAgICAgIHdpbmRvdy5yZXNldEdhbWUoKTtcbiAgICB9LFxuICAgICdQbGF5IGFnYWluJyxcbiAgICAnMTJwdCBUZW1wZXN0YSBGaXZlJ1xuKTtcbmJ1dHRvbnMuYWRkQnV0dG9uKFxuICAgIHtcbiAgICAgICAgeDogNDUwLFxuICAgICAgICB5OiA0MDAsXG4gICAgICAgIHdpZHRoOiAyMDAsXG4gICAgICAgIGhlaWdodDogNTBcbiAgICB9LFxuICAgICdlbmQnLFxuICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICB3aW5kb3cuc3RhdGUgPSAnc3RvcmUnO1xuICAgIH0sXG4gICAgJ1N0b3JlJyxcbiAgICAnMTJwdCBUZW1wZXN0YSBGaXZlJ1xuKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZHJhd01lbnU6IGZ1bmN0aW9uKGN0eCkge1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJyMwZjBkMjAnO1xuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgODAwLCA2MDApO1xuXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1snbG9nby5wbmcnXSwgMzE0LCAxODApO1xuICAgICAgICB0ZXh0LndyaXRlKCdBIEdBTUUgQlknLCAnY2VudGVyJywgNTAwKTtcbiAgICAgICAgdGV4dC53cml0ZSgnQEFNQUFOQyBBTkQgQE1JS0VESURUSElTJywgJ2NlbnRlcicsIDUyMCwgZnVuY3Rpb24oY3R4KSB7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJyNEQ0ZDRjknO1xuICAgICAgICAgICAgY3R4LmZvbnQgPSAnMTJwdCBUZW1wZXN0YSBGaXZlJztcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuICAgIGRyYXdFbmQ6IGZ1bmN0aW9uKGN0eCwgbW9uZXkpIHtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICcjMGYwZDIwJztcbiAgICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIDgwMCwgNjAwKTtcbiAgICAgICAgdGV4dC53cml0ZSgnWW91IGVhcm5lZCBBJCcgKyBNYXRoLnJvdW5kKG1vbmV5KSArICcuJywgJ2NlbnRlcicsIDMwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgICAgIGN0eC5mb250ID0gJzI2cHQgVGVtcGVzdGEgRml2ZSc7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgaW5nYW1lOiBmdW5jdGlvbihjdHgsIGZ1ZWwsIGhlYWx0aCwgbW9uZXksIGVxdWlwcGVkKSB7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1sncG93ZXItYmFyLWljb24ucG5nJ10sIDMwLCA1MDApO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ29yYW5nZSc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgzMCwgNDkwIC0gZnVlbCwgMjAsIGZ1ZWwpO1xuXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1snaGVhbHRoLWJhci1pY29uLnBuZyddLCA3MCwgNTAwKTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICdyZWQnO1xuICAgICAgICBjdHguZmlsbFJlY3QoNzAsIDQ5MCAtIGhlYWx0aCwgMjAsIGhlYWx0aCk7XG5cbiAgICAgICAgdGV4dC53cml0ZSgnQSQ6ICcgKyBNYXRoLnJvdW5kKG1vbmV5KSwgMzAsIDU1MCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjdHguZm9udCA9ICcxMnB0IFRlbXBlc3RhIEZpdmUnO1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZXh0LndyaXRlKCdFcXVpcHBlZDogJyArIGVxdWlwcGVkLCAzMCwgNTkwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGN0eC5mb250ID0gJzEwcHQgVGVtcGVzdGEgRml2ZSc7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBkcmF3U3RvcmU6IGZ1bmN0aW9uKGN0eCwgdG90YWxNb25leSkge1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJyMwZjBkMjAnO1xuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgODAwLCA2MDApO1xuICAgICAgICB0ZXh0LndyaXRlKCdTVE9SRScsIDMwLCA1MCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjdHguZm9udCA9ICcxNnB0IFRlbXBlc3RhIEZpdmUnO1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZXh0LndyaXRlKCdBbHRhcmlhbiBEb2xsYXJzOiAnICsgdG90YWxNb25leSwgMjAwLCA1MCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjdHguZm9udCA9ICcxNnB0IFRlbXBlc3RhIEZpdmUnO1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG4gICAgICAgIH0pO1xuICAgIH1cbn07IiwidmFyIHBhcnRpY2xlcyA9IFtdO1xudmFyIFcgPSA3LCBIID0gNztcbnZhciBERUNfUkFURSA9IDAuMTsgLy8gRGVmYXVsdCBkZWNyZWFzZSByYXRlLiBIaWdoZXIgcmF0ZSAtPiBwYXJ0aWNsZXMgZ28gZmFzdGVyXG52YXIgUGFydGljbGUgPSBmdW5jdGlvbih4LCB5LCBzcGVlZCwgZGVjUmF0ZSwgY29sb3JzKSB7XG4gICAgdGhpcy5hbGl2ZSA9IHRydWU7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICAgIHRoaXMuZHggPSB0aGlzLmR5ID0gMDtcbiAgICB0aGlzLndpZHRoID0gVztcbiAgICB0aGlzLmhlaWdodCA9IEg7XG4gICAgdGhpcy5hbmdsZSA9IDA7XG4gICAgdGhpcy5zcGVlZCA9IHNwZWVkO1xuICAgIHRoaXMub3BhY2l0eSA9IDE7XG4gICAgdGhpcy5kZWNSYXRlID0gZGVjUmF0ZSB8fCBERUNfUkFURTtcbiAgICB0aGlzLmRlbGF5ID0gTWF0aC5jZWlsKE1hdGgucmFuZG9tKCkgKiAxMCk7XG4gICAgaWYgKGNvbG9ycykge1xuICAgICAgICB0aGlzLmNvbG9yID0gY29sb3JzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNvbG9ycy5sZW5ndGgpXTtcbiAgICB9XG4gICAgdGhpcy5sb29wID0gZnVuY3Rpb24oZWxhcHNlZCwgY3R4LCBwbGF5ZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuZGVsYXkgPiAwKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kZWxheSA8PSAxKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hbmdsZSA9IHBsYXllci5hbmdsZSAtIHRoaXMucmFuZ2UgKyAoTWF0aC5yYW5kb20oKSAqIDIgKiB0aGlzLnJhbmdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZGVsYXktLTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnggKz0gNjYuNiAqIGVsYXBzZWQgKiAodGhpcy5keCAtIHdpbmRvdy5wbGF5ZXIub2Zmc2V0WCArIE1hdGguc2luKC10aGlzLmFuZ2xlKSAqIHNwZWVkKTtcbiAgICAgICAgdGhpcy55ICs9IDY2LjYgKiBlbGFwc2VkICogKHRoaXMuZHkgLSB3aW5kb3cucGxheWVyLm9mZnNldFkgKyBNYXRoLmNvcygtdGhpcy5hbmdsZSkgKiBzcGVlZCk7XG4gICAgICAgIHRoaXMub3BhY2l0eSAtPSB0aGlzLmRlY1JhdGU7XG4gICAgICAgIGlmICh0aGlzLm9wYWNpdHkgPD0gMCkge1xuICAgICAgICAgICAgdGhpcy5vcGFjaXR5ID0gMDtcbiAgICAgICAgICAgIHRoaXMuYWxpdmUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBEcmF3XG4gICAgICAgIGN0eC5zYXZlKCk7XG4gICAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IHRoaXMub3BhY2l0eTtcbiAgICAgICAgY3R4Lmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9ICdsaWdodGVyJztcbiAgICAgICAgY3R4LnRyYW5zbGF0ZSh0aGlzLngsIHRoaXMueSk7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmNvbG9yIHx8ICdyZWQnO1xuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgVywgSCk7XG4gICAgICAgIGN0eC5yZXN0b3JlKCk7XG4gICAgfTtcbn07XG5cbi8vIHgsIHkgYXJlIGZpeGVkXG4vLyBQYXJ0aWNsZXMgYXJlIGNyZWF0ZWQgZnJvbSBhbmdsZS1yYW5nZSB0byBhbmdsZStyYW5nZVxuLy8gc3BlZWQgaXMgZml4ZWRcbnZhciBhbmdsZSA9IDA7XG52YXIgY3JlYXRlUGFydGljbGVzID0gZnVuY3Rpb24oeCwgeSwgc3BlZWQsIGRlY1JhdGUsIG4sIGNvbG9ycywgcHJvcHMpIHtcbiAgICAvLyBjb25zb2xlLmxvZygnQ3JlYXRpbmcnLCBwYXJ0aWNsZXMpO1xuICAgIHZhciBjcmVhdGVkID0gMCwgaSA9IDA7XG4gICAgdmFyIHBhcnRpY2xlO1xuICAgIHdoaWxlKGNyZWF0ZWQgPCBuKSB7XG4gICAgICAgIHBhcnRpY2xlID0gcGFydGljbGVzW2ldO1xuICAgICAgICBpZiAocGFydGljbGUgJiYgIXBhcnRpY2xlLmFsaXZlIHx8ICFwYXJ0aWNsZSkge1xuICAgICAgICAgICAgcGFydGljbGVzW2ldID0gbmV3IFBhcnRpY2xlKHgsIHksIHNwZWVkLCBkZWNSYXRlLCBjb2xvcnMpO1xuICAgICAgICAgICAgY3JlYXRlZCsrO1xuICAgICAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhwcm9wcyk7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGtleXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBwYXJ0aWNsZXNbaV1ba2V5c1tqXV0gPSBwcm9wc1trZXlzW2pdXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFBvc3NpYmxlIHByb3BzOiByYW5nZSwgbm9Db2xsaWRlLCBkeCwgZHksIGNvbG9yXG4gICAgICAgIH1cbiAgICAgICAgaSsrO1xuICAgIH1cbn07XG5cbnZhciBkcmF3ID0gZnVuY3Rpb24oZWxhcHNlZCwgY3R4LCBwbGF5ZXIpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRpY2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBwYXJ0aWNsZXNbaV0ubG9vcChlbGFwc2VkLCBjdHgsIHBsYXllcik7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY3JlYXRlUGFydGljbGVzOiBjcmVhdGVQYXJ0aWNsZXMsXG4gICAgZHJhdzogZHJhdyxcbiAgICBhcnJheTogcGFydGljbGVzLFxuICAgIHJlc2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcGFydGljbGVzLmxlbmd0aCA9IDA7XG4gICAgfVxufTtcbiIsInZhciB3aGl0ZW4gPSByZXF1aXJlKCcuL3doaXRlbicpO1xudmFyIGNhbnZhcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNnYW1lJyk7XG5cbndpbmRvdy5wbGF5ZXIgPSB7fTtcblxucGxheWVyLmlkbGUgPSBuZXcgSW1hZ2UoKTtcbnBsYXllci5pZGxlLnNyYyA9ICdpbWFnZXMvYXN0cm8ucG5nJztcbnBsYXllci5pZGxlLm5hbWUgPSAnYXN0cm8ucG5nJztcbnBsYXllci5mbHlpbmcgPSBuZXcgSW1hZ2UoKTtcbnBsYXllci5mbHlpbmcuc3JjID0gJ2ltYWdlcy9hc3Ryby1mbHlpbmcucG5nJztcbnBsYXllci5mbHlpbmcubmFtZSA9ICdhc3Ryby1mbHlpbmcucG5nJztcbnBsYXllci5zdGF0ZSA9ICdpZGxlJztcblxucGxheWVyLmRlZmF1bHRzID0ge1xuICAgIG1vbmV5OiAwLFxuICAgIGFuZ2xlOiAwLFxuICAgIG9mZnNldFk6IDAsXG4gICAgb2Zmc2V0WDogMCxcbiAgICBoZWFsdGg6IDEwLFxuICAgIGZ1ZWw6IDEwLFxuICAgIGhpdDogZmFsc2UsXG4gICAgcHJvcFJhbmdlOiA4LjMsXG4gICAgbW9uZXlNdWx0aXBsaWVyOiAxXG59O1xuXG5wbGF5ZXIud2lkdGggPSA1MjtcbnBsYXllci5oZWlnaHQgPSA2MDtcbnBsYXllci54ID0gKGNhbnZhcy53aWR0aCAtIHBsYXllci53aWR0aCkgLyAyO1xucGxheWVyLnkgPSAoY2FudmFzLmhlaWdodCAtIHBsYXllci5oZWlnaHQpIC8gMjtcbnBsYXllci5hbmdsZSA9IDA7XG5wbGF5ZXIudG90YWxNb25leSA9IHBsYXllci5tb25leSA9IDA7XG5wbGF5ZXIuY29sb3JzID0gWydibGFjaycsICdvcmFuZ2UnXTtcblxucGxheWVyLm9mZnNldFggPSBwbGF5ZXIub2Zmc2V0WSA9IDA7XG5cblxuLy8gSGFsZiB3aWR0aCwgaGFsZiBoZWlnaHRcbnZhciBoVyA9IHBsYXllci53aWR0aCAvIDI7XG52YXIgaEggPSBwbGF5ZXIuaGVpZ2h0IC8gMjtcblxudmFyIHNwZWVkID0gMDsgLy8gVGhlIGN1cnJlbnQgc3BlZWRcbnZhciBkU3BlZWQ7XG52YXIgZFggPSAwLCBkWSA9IDA7XG5cbi8vIFlPVSBDQU4gQ09ORklHVVJFIFRIRVNFISAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxudmFyIGFjYyA9IDc7IC8vIEFjY2VsZXJhdGlvblxudmFyIGxpbSA9IDEwOyAvLyBTcGVlZCBsaW1pdFxudmFyIHR1cm5TcGVlZCA9IDIuMjtcbnZhciBncmF2ID0gMC4wMztcbi8vIE5PIE1PUkUgQ09ORklHVVJJTkchIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cblxucGxheWVyLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgZFggPSBkWSA9IHNwZWVkID0gZFNwZWVkID0gMDtcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHBsYXllci5kZWZhdWx0cyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHBsYXllcltrZXlzW2ldXSA9IHBsYXllci5kZWZhdWx0c1trZXlzW2ldXTtcbiAgICB9XG4gICAgcGxheWVyLm1vdmUoKTtcbn07XG5wbGF5ZXIuZ3Jhdml0eSA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBkWSAtPSBncmF2O1xufTtcbnBsYXllci5tb3ZlID0gZnVuY3Rpb24oZWxhcHNlZCwgZmx5aW5nKSB7XG4gICAgcGxheWVyLm9mZnNldFggPSBkWDtcbiAgICBwbGF5ZXIub2Zmc2V0WSA9IC1kWTtcbiAgICBkWCAqPSAwLjk5O1xuICAgIGRZICo9IDAuOTk7XG5cbiAgICBpZiAoIWZseWluZykge1xuICAgICAgICBwbGF5ZXIuc3RhdGUgPSAnaWRsZSc7XG4gICAgfVxufTtcbnBsYXllci51cCA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBwbGF5ZXIuZnVlbCAtPSAwLjI7XG4gICAgcGxheWVyLnN0YXRlID0gJ2ZseWluZyc7XG4gICAgc3BlZWQgKz0gYWNjO1xuICAgIGRTcGVlZCA9IGVsYXBzZWQgKiBzcGVlZDtcblxuICAgIGRYICs9IE1hdGguc2luKHBsYXllci5hbmdsZSkgKiBkU3BlZWQ7XG4gICAgZFkgKz0gTWF0aC5jb3MocGxheWVyLmFuZ2xlKSAqIGRTcGVlZDtcbiAgICBwbGF5ZXIubW92ZShlbGFwc2VkLCB0cnVlKTtcbiAgICBpZiAoc3BlZWQgPiBsaW0pIHtcbiAgICAgICAgc3BlZWQgPSBsaW07XG4gICAgfVxuICAgIGVsc2UgaWYgKHNwZWVkIDwgLWxpbSkge1xuICAgICAgICBzcGVlZCA9IC1saW07XG4gICAgfVxuXG59O1xucGxheWVyLnJpZ2h0ID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5hbmdsZSArPSBlbGFwc2VkICogdHVyblNwZWVkICogTWF0aC5QSTtcbn07XG5wbGF5ZXIubGVmdCA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBwbGF5ZXIuYW5nbGUgLT0gZWxhcHNlZCAqIHR1cm5TcGVlZCAqIE1hdGguUEk7XG59O1xucGxheWVyLnRyaWdnZXIgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBFbmFibGUgdGhlIGVxdWlwcGFibGUgaXRlbVxuICAgIHBsYXllci50cmlnZ2VyZWQgPSBwbGF5ZXIuZXF1aXBwZWQ7XG59O1xuXG5wbGF5ZXIuYWRkTW9uZXkgPSBmdW5jdGlvbihmbykge1xuICAgIHBsYXllci5tb25leSArPSBwbGF5ZXIubW9uZXlNdWx0aXBsaWVyICogKGZvLndpZHRoICogZm8uaGVpZ2h0KSAvIDEwMDA7XG59O1xuXG5cbnZhciB0aWNrcyA9IDA7XG5wbGF5ZXIuZHJhdyA9IGZ1bmN0aW9uKGN0eCkge1xuICAgIC8vIFBsYXllclxuICAgIGN0eC5zYXZlKCk7XG4gICAgY3R4LnRyYW5zbGF0ZShwbGF5ZXIueCArIGhXLCBwbGF5ZXIueSArIGhIKTtcbiAgICBjdHgucm90YXRlKHBsYXllci5hbmdsZSk7XG4gICAgLy8gcGxheWVyLmhpdCBpcyBzZXQgaW4gY29sbGlzaW9ucy5qc1xuICAgIC8vIElmIHRoZSBwbGF5ZXIncyBiZWVuIGhpdCwgd2Ugd2FudCBpdCB0byBmbGFzaCB3aGl0ZSB0byBpbmRpY2F0ZSB0aGF0XG4gICAgaWYgKHBsYXllci50cmlnZ2VyZWQgPT09ICdpbnZpbmNpYmlsaXR5Jykge1xuICAgICAgICBjdHguZHJhd0ltYWdlKHdoaXRlbihwbGF5ZXJbcGxheWVyLnN0YXRlXS5uYW1lLCAnZ3JlZW4nKSwgLWhXLCAtaEgpO1xuICAgIH1cbiAgICBlbHNlIGlmIChwbGF5ZXIuaGl0KSB7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2Uod2hpdGVuKHBsYXllcltwbGF5ZXIuc3RhdGVdLm5hbWUsICdwaW5rJyksIC1oVywgLWhIKTtcbiAgICAgICAgdGlja3MrKztcbiAgICAgICAgaWYgKHRpY2tzID49IDgpIHtcbiAgICAgICAgICAgIHBsYXllci5oaXQgPSBmYWxzZTtcbiAgICAgICAgICAgIHRpY2tzID0gMDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY3R4LmRyYXdJbWFnZShwbGF5ZXJbcGxheWVyLnN0YXRlXSwgLWhXLCAtaEgpO1xuICAgIH1cbiAgICBjdHgucmVzdG9yZSgpO1xuXG59O1xuXG5wbGF5ZXIucmVzZXQoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBwbGF5ZXI7XG4iLCIvLyBIb2xkcyBsYXN0IGl0ZXJhdGlvbiB0aW1lc3RhbXAuXG52YXIgdGltZSA9IDA7XG5cbi8qKlxuICogQ2FsbHMgYGZuYCBvbiBuZXh0IGZyYW1lLlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiBUaGUgZnVuY3Rpb25cbiAqIEByZXR1cm4ge2ludH0gVGhlIHJlcXVlc3QgSURcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiByYWYoZm4pIHtcbiAgcmV0dXJuIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgdmFyIGVsYXBzZWQgPSBub3cgLSB0aW1lO1xuXG4gICAgaWYgKGVsYXBzZWQgPiA5OTkpIHtcbiAgICAgIGVsYXBzZWQgPSAxIC8gNjA7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsYXBzZWQgLz0gMTAwMDtcbiAgICB9XG5cbiAgICB0aW1lID0gbm93O1xuICAgIGZuKGVsYXBzZWQpO1xuICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIC8qKlxuICAgKiBDYWxscyBgZm5gIG9uIGV2ZXJ5IGZyYW1lIHdpdGggYGVsYXBzZWRgIHNldCB0byB0aGUgZWxhcHNlZFxuICAgKiB0aW1lIGluIG1pbGxpc2Vjb25kcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuIFRoZSBmdW5jdGlvblxuICAgKiBAcmV0dXJuIHtpbnR9IFRoZSByZXF1ZXN0IElEXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzdGFydDogZnVuY3Rpb24oZm4pIHtcbiAgICByZXR1cm4gcmFmKGZ1bmN0aW9uIHRpY2soZWxhcHNlZCkge1xuICAgICAgZm4oZWxhcHNlZCk7XG4gICAgICByYWYodGljayk7XG4gICAgfSk7XG4gIH0sXG4gIC8qKlxuICAgKiBDYW5jZWxzIHRoZSBzcGVjaWZpZWQgYW5pbWF0aW9uIGZyYW1lIHJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSB7aW50fSBpZCBUaGUgcmVxdWVzdCBJRFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgc3RvcDogZnVuY3Rpb24oaWQpIHtcbiAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoaWQpO1xuICB9XG59O1xuIiwidmFyIGNhbnZhcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNnYW1lJyk7XG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbnZhciBwb2xhcml0eSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpID4gMC41ID8gMSA6IC0xO1xufTtcblxuLy8gQW1vdW50IHdlJ3ZlIG1vdmVkIHNvIGZhclxudmFyIHRvdGFsWCA9IDA7XG52YXIgdG90YWxZID0gMDtcblxudmFyIHNoYWtlID0gZnVuY3Rpb24oaW50ZW5zaXR5KSB7XG4gICAgaWYgKHRvdGFsWCA9PT0gMCkge1xuICAgICAgICBjdHguc2F2ZSgpO1xuICAgIH1cbiAgICBpZiAoIWludGVuc2l0eSkge1xuICAgICAgICBpbnRlbnNpdHkgPSAyO1xuICAgIH1cbiAgICB2YXIgZFggPSBNYXRoLnJhbmRvbSgpICogaW50ZW5zaXR5ICogcG9sYXJpdHkoKTtcbiAgICB2YXIgZFkgPSBNYXRoLnJhbmRvbSgpICogaW50ZW5zaXR5ICogcG9sYXJpdHkoKTtcbiAgICB0b3RhbFggKz0gZFg7XG4gICAgdG90YWxZICs9IGRZO1xuXG4gICAgLy8gQnJpbmcgdGhlIHNjcmVlbiBiYWNrIHRvIGl0cyB1c3VhbCBwb3NpdGlvbiBldmVyeSBcIjIgaW50ZW5zaXR5XCIgc28gYXMgbm90IHRvIGdldCB0b28gZmFyIGF3YXkgZnJvbSB0aGUgY2VudGVyXG4gICAgaWYgKGludGVuc2l0eSAlIDIgPCAwLjIpIHtcbiAgICAgICAgY3R4LnRyYW5zbGF0ZSgtdG90YWxYLCAtdG90YWxZKTtcbiAgICAgICAgdG90YWxYID0gdG90YWxZID0gMDtcbiAgICAgICAgaWYgKGludGVuc2l0eSA8PSAwLjE1KSB7XG4gICAgICAgICAgICBjdHgucmVzdG9yZSgpOyAvLyBKdXN0IHRvIG1ha2Ugc3VyZSBpdCBnb2VzIGJhY2sgdG8gbm9ybWFsXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjdHgudHJhbnNsYXRlKGRYLCBkWSk7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgc2hha2UoaW50ZW5zaXR5IC0gMC4xKTtcbiAgICB9LCA1KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gc2hha2U7IiwiLy8gSGFuZGxlcyB0aGUgbWFya2V0IC8gc3RvcmUgcGFydCBvZiB0aGUgZ2FtZVxudmFyIHBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyJyk7XG52YXIgYnV0dG9ucyA9IHJlcXVpcmUoJy4vYnV0dG9ucycpO1xuXG52YXIgaXRlbXMgPSBbXG4gICAge1xuICAgICAgICBuYW1lOiAnSGVhbHRoJyxcbiAgICAgICAgZGVzYzogJ0luY3JlYXNlcyBzdGFydGluZyBoZWFsdGggYnkgMTAnLFxuICAgICAgICBmbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZGVmYXVsdHMuaGVhbHRoICs9IDEwO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIG5hbWU6ICdGdWVsJyxcbiAgICAgICAgZGVzYzogJ0luY3JlYXNlcyBzdGFydGluZyBmdWVsIGJ5IDEwJyxcbiAgICAgICAgZm46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGxheWVyLmRlZmF1bHRzLmZ1ZWwgKz0gMTA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgbmFtZTogJ0NvbG9yZnVsJyxcbiAgICAgICAgZGVzYzogJycsXG4gICAgICAgIGZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBsYXllci5jb2xvcnMgPSBbJ2JsdWUnLCAncmVkJ107XG4gICAgICAgICAgICAvLyBwbGF5ZXIuY29sb3JzID0gWyd3aGl0ZScsICdhbnl0aGluZyddO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIG5hbWU6ICdHb2xkIFN1aXQnLFxuICAgICAgICBkZXNjOiAnJyxcbiAgICAgICAgZm46IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgbmFtZTogJ0VmZmljaWVuY3knLFxuICAgICAgICBkZXNjOiAnSW5jcmVhc2VzIGVmZmljaWVuY3kgb2YgbWluaW5nIHJvY2tzIHNvIHlvdSBnZXQgbW9yZSBBbHRhcmlhbiBEb2xsYXJzIHBlciBhc3Rlcm9pZCcsXG4gICAgICAgIGZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBsYXllci5kZWZhdWx0cy5tb25leU11bHRpcGxpZXIgKz0gMC4xO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIG5hbWU6ICdJbmRpY2F0b3JzJyxcbiAgICAgICAgZGVzYzogJ0ZpbmQgc2hpdCBtb3JlIGVhc2lseS4gSW5kaWNhdG9ycyBhcm91bmQgdGhlIHNjcmVlbiB3aWxsIHNob3cgeW91IHdoZXJlIG9iamVjdHMgbGlrZSBYWVogYXJlJyxcbiAgICAgICAgZm46IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgbmFtZTogJ1JhbmdlJyxcbiAgICAgICAgZGVzYzogJ1RoZSBwcm9wdWxzaW9uIHBhcnRpY2xlcyBnbyBmdXJ0aGVyIGF3YXksIG1ha2luZyBpdCBlYXNpZXIgdG8gZGVzdHJveSByb2NrcycsXG4gICAgICAgIGZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBsYXllci5kZWZhdWx0cy5wcm9wUmFuZ2UgKz0gMTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBuYW1lOiAnQXV0by1zaGllbGQnLFxuICAgICAgICBkZXNjOiAnQSBzaGllbGQgcHJvdGVjdHMgeW91IGZyb20gb25lIGhpdCBpbiBldmVyeSBnYW1lIGF1dG9tYXRpY2FsbHknLFxuICAgICAgICBmbjogZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBuYW1lOiAnSW52aW5jaWJpbGl0eScsXG4gICAgICAgIGRlc2M6ICdQcmVzcyBzcGFjZWJhciB0byBiZWNvbWUgaW52aW5jaWJsZSB0byBhbGwgYXN0ZXJvaWRzLCBzbyB5b3UgY2FuIGJlIGFzIGNhcmVsZXNzIGFzIHlvdSB3YW50IGZvciAzMCBzZWNvbmRzJyxcbiAgICAgICAgZm46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGxheWVyLmRlZmF1bHRzLmVxdWlwcGVkID0gJ2ludmluY2liaWxpdHknO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIG5hbWU6ICdQYW5pYyBleHBsb2RlJyxcbiAgICAgICAgZGVzYzogJ1ByZXNzIHNwYWNlYmFyIHRvIG1ha2UgYWxsIGFzdGVyb2lkcyBvbiBzY3JlZW4gZXhwbG9kZScsXG4gICAgICAgIGZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBsYXllci5kZWZhdWx0cy5lcXVpcHBlZCA9ICdleHBsb2RlJztcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBuYW1lOiAnUG9pc29uJyxcbiAgICAgICAgZGVzYzogJ0lzIGRlYXRoIGV2ZXIgYmV0dGVyIHRoYW4gaGFyZHNoaXA/IFllcywgd2hlbiB5b3UgZ2V0IGFuIGFjaGlldmVtZW50IGZvciBpdC4gUHJlc3Mgc3BhY2ViYXIgdG8gZGllIHdpdGhpbiAzMCBzZWNvbmRzLicsXG4gICAgICAgIGZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBsYXllci5kZWZhdWx0cy5lcXVpcHBlZCA9ICdwb2lzb24nO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIG5hbWU6ICcnLFxuICAgICAgICBkZXNjOiAnJyxcbiAgICAgICAgZm46IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIH1cbiAgICB9XG5dO1xuXG52YXIgYWRkSXRlbUJ1dHRvbnMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGl0ZW0gPSBpdGVtc1tpXTtcbiAgICAgICAgYnV0dG9ucy5hZGRCdXR0b24oXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgeDogMTAwICsgKGkgJSA0KSAqIDEyMCxcbiAgICAgICAgICAgICAgICB5OiAxMDAgKyBNYXRoLmZsb29yKGkgLyA0KSAqIDEyMCxcbiAgICAgICAgICAgICAgICB3aWR0aDogMTAwLFxuICAgICAgICAgICAgICAgIGhlaWdodDogMTAwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3N0b3JlJyxcbiAgICAgICAgICAgIGl0ZW0uZm4sXG4gICAgICAgICAgICBpdGVtLm5hbWUsXG4gICAgICAgICAgICAnMTJwdCBUZW1wZXN0YSBGaXZlJ1xuICAgICAgICApO1xuICAgIH1cblxuICAgIGJ1dHRvbnMuYWRkQnV0dG9uKFxuICAgICAgICB7XG4gICAgICAgICAgICB4OiAnY2VudGVyJyxcbiAgICAgICAgICAgIHk6IDQ3MCxcbiAgICAgICAgICAgIHdpZHRoOiAyMDAsXG4gICAgICAgICAgICBoZWlnaHQ6IDUwXG4gICAgICAgIH0sXG4gICAgICAgICdzdG9yZScsXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgd2luZG93LnJlc2V0R2FtZSgpO1xuICAgICAgICB9LFxuICAgICAgICAnUGxheScsXG4gICAgICAgICcxNHB0IFRlbXBlc3RhIEZpdmUnXG4gICAgKTtcbn07XG5cbmFkZEl0ZW1CdXR0b25zKCk7IiwidmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdjYW52YXMnKVswXTtcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbm1vZHVsZS5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24odGV4dCwgeCwgeSwgcHJlRnVuYywgc3Ryb2tlKXtcbiAgICBjdHguc2F2ZSgpO1xuICAgIGlmIChwcmVGdW5jKSB7XG4gICAgICAgIHByZUZ1bmMoY3R4KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuICAgICAgICBjdHguZm9udCA9ICcxMnB0IFRlbXBlc3RhIEZpdmUnO1xuICAgIH1cblxuICAgIHZhciB4UG9zID0geDtcbiAgICBpZiAoeCA9PT0gJ2NlbnRlcicpIHtcbiAgICAgICAgeFBvcyA9IChjYW52YXMud2lkdGggLSBjdHgubWVhc3VyZVRleHQodGV4dCkud2lkdGgpIC8gMjtcbiAgICB9XG5cbiAgICBpZiAoc3Ryb2tlKSB7XG4gICAgICAgIGN0eC5zdHJva2VUZXh0KHRleHQsIHhQb3MsIHkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY3R4LmZpbGxUZXh0KHRleHQsIHhQb3MsIHkpO1xuICAgIH1cbiAgICBjdHgucmVzdG9yZSgpO1xufTsiLCIvLyB1Zm9zLmpzXG4vLyBUaGlzIGZpbGUgZGVmaW5lcyBiZWhhdmlvciBmb3IgYWxsIHRoZSB1bmlkZW50aWZpZWQgZmx5aW5nIG9iamVjdHNcbi8vIEkgZ3Vlc3MgdGhleSAqYXJlKiBpZGVudGlmaWVkLCB0ZWNobmljYWxseS5cbi8vIEJ1dCB1Zm9zLmpzIGlzIGNvb2xlciB0aGFuIGlmb3MuanNcbi8vIEFzdGVyb2lkcyBhbmQgaGVhbHRoIC8gZnVlbCBwaWNrdXBzIGNvdW50IGFzIFVGT3NcblxudmFyIGZseWluZ09iamVjdHMgPSBbXTtcblxudmFyIGxvYWRlciA9IHJlcXVpcmUoJy4vbG9hZGVyLmpzJyk7XG5cbnZhciBybmQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKTtcbn07XG52YXIgY2hvb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50c1tNYXRoLmZsb29yKHJuZCgpICogYXJndW1lbnRzLmxlbmd0aCldO1xufTtcblxudmFyIFNQQVdOX1JBTkdFID0gMTAwO1xudmFyIE1JTl9TUEVFRCA9IDAuMywgTUFYX1NQRUVEID0gMjtcbnZhciBXSURUSCA9IDgwMCwgSEVJR0hUID0gNjAwO1xuXG52YXIgc3Bhd24gPSBmdW5jdGlvbihuKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ1NwYXduZWQgZmx5aW5nT2JqZWN0czonLCBuKTtcbiAgICB2YXIgb2JqLCB0YXJnZXRZLCB0YXJnZXRYO1xuICAgIHZhciBzaWduWCwgc2lnblksIHBvc1gsIHBvc1k7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgb2JqID0ge1xuICAgICAgICAgICAgeDogKHJuZCgpICogV0lEVEgpLFxuICAgICAgICAgICAgeTogKHJuZCgpICogSEVJR0hUKSxcbiAgICAgICAgICAgIHNwZWVkOiBybmQoKSAqIChNQVhfU1BFRUQgLSBNSU5fU1BFRUQpICsgTUlOX1NQRUVELFxuICAgICAgICAgICAgaW1hZ2U6IGNob29zZS5hcHBseSh0aGlzLCBsb2FkZXIuZ2V0KCdyb2NrJykuY29uY2F0KGxvYWRlci5nZXQoJ3Bvd2VyLWljb24nKSkpLFxuICAgICAgICAgICAgYWxpdmU6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgdGFyZ2V0WSA9IHJuZCgpICogV0lEVEg7XG4gICAgICAgIHRhcmdldFggPSBybmQoKSAqIEhFSUdIVDtcbiAgICAgICAgb2JqLmFuZ2xlID0gcm5kKCkgKiBNYXRoLlBJICogMjtcbiAgICAgICAgb2JqLmdvb2QgPSBvYmouaW1hZ2UuaW5kZXhPZigncm9jaycpID49IDAgPyBmYWxzZSA6IHRydWU7XG4gICAgICAgIG9iai53aWR0aCA9IGxvYWRlci5pbWFnZXNbb2JqLmltYWdlXS53aWR0aDtcbiAgICAgICAgb2JqLmhlaWdodCA9IGxvYWRlci5pbWFnZXNbb2JqLmltYWdlXS5oZWlnaHQ7XG4gICAgICAgIG9iai5keCA9IE1hdGguY29zKG9iai5hbmdsZSkgKiBvYmouc3BlZWQ7XG4gICAgICAgIG9iai5keSA9IE1hdGguc2luKG9iai5hbmdsZSkgKiBvYmouc3BlZWQ7XG5cbiAgICAgICAgaWYgKCFvYmouZ29vZCkge1xuICAgICAgICAgICAgb2JqLmNvbG9yID0gb2JqLmltYWdlLmluZGV4T2YoJ2FsdCcpIDwgMCA/ICcjNTI0QzRDJyA6ICcjYTc4MjU4JztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChybmQoKSA+IDAuNSkge1xuICAgICAgICAgICAgb2JqLnggKz0gY2hvb3NlKC0xLCAxKSAqIChXSURUSCArIG9iai53aWR0aCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvYmoueSArPSBjaG9vc2UoLTEsIDEpICogKEhFSUdIVCArIG9iai5oZWlnaHQpO1xuICAgICAgICB9XG4gICAgICAgIGZseWluZ09iamVjdHMucHVzaChvYmopO1xuICAgIH1cbn07XG5cbnZhciBsb29wID0gZnVuY3Rpb24oZWxhcHNlZCwgY3R4LCBvZmZzZXRYLCBvZmZzZXRZKSB7XG4gICAgdmFyIG9iajtcbiAgICBmb3IgKHZhciBpID0gZmx5aW5nT2JqZWN0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICBvYmogPSBmbHlpbmdPYmplY3RzW2ldO1xuICAgICAgICBpZiAob2JqLmFsaXZlKSB7XG4gICAgICAgICAgICBvYmoueCArPSA2Ni42ICogZWxhcHNlZCAqIChvYmouZHggLSBvZmZzZXRYKTtcbiAgICAgICAgICAgIG9iai55ICs9IDY2LjYgKiBlbGFwc2VkICogKG9iai5keSAtIG9mZnNldFkpO1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICdyZWQnO1xuICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShsb2FkZXIuaW1hZ2VzW29iai5pbWFnZV0sIG9iai54LCBvYmoueSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBmbHlpbmdPYmplY3RzLnNwbGljZShpLCAxKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbG9vcDogbG9vcCxcbiAgICBhcnJheTogZmx5aW5nT2JqZWN0cyxcbiAgICBzcGF3bjogc3Bhd24sXG4gICAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBmbHlpbmdPYmplY3RzLmxlbmd0aCA9IDA7XG4gICAgfVxufTsiLCIvLyBUaGlzIGZpbGUgZXhwb3J0cyBhIGZ1bmN0aW9uIHRoYXQgbGV0cyB5b3UgbWFrZSBpbWFnZXMgXCJmbGFzaFwiIG1vbWVudGFyaWx5LiBMaWtlIHRoZSBwbGF5ZXIgd2hlbiBoZSBnZXRzIGhpdCBieSBhbiBhc3Rlcm9pZFxudmFyIGxvYWRlciA9IHJlcXVpcmUoJy4vbG9hZGVyJyk7XG52YXIgaW1hZ2VzID0gbG9hZGVyLmltYWdlcztcblxudmFyIGNhY2hlID0ge307XG52YXIgd2hpdGVuID0gZnVuY3Rpb24oaW1nTmFtZSwgY29sb3IpIHtcbiAgICBpZiAoIWNvbG9yKSB7XG4gICAgICAgIGNvbG9yID0gJ3doaXRlJztcbiAgICB9XG4gICAgaWYgKGNhY2hlW2ltZ05hbWUgKyAnLicgKyBjb2xvcl0pIHtcbiAgICAgICAgcmV0dXJuIGNhY2hlW2ltZ05hbWUgKyAnLicgKyBjb2xvcl07XG4gICAgfVxuICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICB2YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgdmFyIGltZyA9IGltYWdlc1tpbWdOYW1lXTtcblxuICAgIGNhbnZhcy53aWR0aCA9IGltZy53aWR0aDtcbiAgICBjYW52YXMuaGVpZ2h0ID0gaW1nLmhlaWdodDtcbiAgICBjdHguZHJhd0ltYWdlKGltZywgMCwgMCwgaW1nLndpZHRoLCBpbWcuaGVpZ2h0KTtcbiAgICBjdHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gJ3NvdXJjZS1hdG9wJztcbiAgICBjdHguZmlsbFN0eWxlID0gY29sb3I7XG4gICAgY3R4LmZpbGxSZWN0KDAsIDAsIGltZy53aWR0aCwgaW1nLmhlaWdodCk7XG4gICAgY2FjaGVbaW1nTmFtZSArICcuJyArIGNvbG9yXSA9IGNhbnZhcztcbiAgICByZXR1cm4gY2FudmFzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB3aGl0ZW47Il19
