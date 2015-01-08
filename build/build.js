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
            menus.ingame(ctx, player.fuel, player.health, player.money);

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

},{"./audio":2,"./buttons":3,"./collisions":4,"./keys":5,"./loader.js":6,"./menus":7,"./particles":8,"./player":9,"./raf":10,"./store":12,"./ufos":14}],2:[function(require,module,exports){
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
            y >= button.y && y <= button.y + button.height &&
            window.state === button.screenState) {
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
        if (angledCollision(player, fo)) {
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
    ingame: function(ctx, fuel, health, money) {
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
},{"./buttons":3,"./loader":6,"./text":13}],8:[function(require,module,exports){
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

},{"./whiten":15}],10:[function(require,module,exports){
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
var player = require('./player');
var buttons = require('./buttons');

var items = [
    {
        name: 'Health',
        desc: 'Increases health by 10',
        fn: function() {
            player.defaults.health += 10;
        }
    },
    {
        name: 'Fuel',
        desc: 'Increases fuel by 10',
        fn: function() {
            player.defaults.fuel += 10;
        }
    },
    {
        name: 'Colorful',
        desc: '',
        fn: function() {
            player.colors = ['blue', 'red'];
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
},{"./buttons":3,"./player":9}],13:[function(require,module,exports){
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
},{}],14:[function(require,module,exports){
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
},{"./loader.js":6}],15:[function(require,module,exports){
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
},{"./loader":6}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4vc3JjL21haW4iLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9hdWRpby5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL2J1dHRvbnMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9jb2xsaXNpb25zLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMva2V5cy5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL2xvYWRlci5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL21lbnVzLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvcGFydGljbGVzLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvcGxheWVyLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvcmFmLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvc2NyZWVuc2hha2UuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9zdG9yZS5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL3RleHQuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy91Zm9zLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvd2hpdGVuLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgbG9hZGVyID0gcmVxdWlyZSgnLi9sb2FkZXIuanMnKTtcblxudmFyIHJhZiA9IHJlcXVpcmUoJy4vcmFmJyk7XG52YXIgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcbnZhciBrZXkgPSByZXF1aXJlKCcuL2tleXMnKTtcbnZhciBwYXJ0aWNsZXMgPSByZXF1aXJlKCcuL3BhcnRpY2xlcycpO1xudmFyIGZseWluZ09iamVjdHMgPSByZXF1aXJlKCcuL3Vmb3MnKTtcbnZhciBjb2xsaXNpb25zID0gcmVxdWlyZSgnLi9jb2xsaXNpb25zJyk7XG52YXIgbWVudXMgPSByZXF1aXJlKCcuL21lbnVzJyk7XG52YXIgYnV0dG9ucyA9IHJlcXVpcmUoJy4vYnV0dG9ucycpO1xudmFyIGF1ZGlvID0gcmVxdWlyZSgnLi9hdWRpbycpO1xudmFyIHN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZScpO1xuXG52YXIgY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2dhbWUnKTtcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxudmFyIHNmeCA9IFsnY29sbGVjdCcsICdjb2xsaWRlJywgJ2V4cGxvZGVfbWV0ZW9yJywgJ2pldHBhY2snXTtcbmxvYWRlci5kb25lKGZ1bmN0aW9uKCkge1xuICAgIGF1ZGlvLm11dGUoKTsgLy8gQmVjYXVzZSBJIGRvbid0IHdhbnQgaXQgYXV0b3BsYXlpbmcgd2hpbGUgSSBkZXZlbG9wIGl0IVxuXG4gICAgd2luZG93LnN0YXRlID0gJ21lbnUnO1xuICAgIHJhZi5zdGFydChmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgICAgIGlmICh3aW5kb3cuc3RhdGUgPT09ICdtZW51Jykge1xuICAgICAgICAgICAgbWVudXMuZHJhd01lbnUoY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh3aW5kb3cuc3RhdGUgPT09ICdnYW1lJykge1xuICAgICAgICAgICAgcGxheWVyLmdyYXZpdHkoZWxhcHNlZCk7XG4gICAgICAgICAgICBpZiAoa2V5LnVwKCkgJiYgcGxheWVyLmZ1ZWwgPiAwKSB7XG4gICAgICAgICAgICAgICAgYXVkaW8ucGxheSgnamV0cGFjaycpO1xuICAgICAgICAgICAgICAgIHBsYXllci51cChlbGFwc2VkKTtcbiAgICAgICAgICAgICAgICBwYXJ0aWNsZXMuY3JlYXRlUGFydGljbGVzKHBsYXllci54ICsgcGxheWVyLndpZHRoIC8gMiwgcGxheWVyLnkgKyBwbGF5ZXIuaGVpZ2h0IC8gMiwgMTAsIDEgLyBwbGF5ZXIucHJvcFJhbmdlLCAxMCwgcGxheWVyLmNvbG9ycywge1xuICAgICAgICAgICAgICAgICAgICByYW5nZTogTWF0aC5QSSAvIDEwXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGF1ZGlvLnBhdXNlKCdqZXRwYWNrJyk7XG4gICAgICAgICAgICAgICAgcGxheWVyLm1vdmUoZWxhcHNlZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChrZXkucmlnaHQoKSkge1xuICAgICAgICAgICAgICAgIHBsYXllci5yaWdodChlbGFwc2VkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChrZXkubGVmdCgpKSB7XG4gICAgICAgICAgICAgICAgcGxheWVyLmxlZnQoZWxhcHNlZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRoaXMgZnVuY3Rpb24gY2hlY2tzIGZvciBhbGwgcmVxdWlyZWQgY29sbGlzaW9ucywgYW5kIGNhbGxzIHRoZSBjb3JyZXNwb25kaW5nIGZ1bmN0aW9ucyBhZnRlciB0b29cbiAgICAgICAgICAgIGNvbGxpc2lvbnMuY2hlY2socGxheWVyLCBmbHlpbmdPYmplY3RzKTtcblxuICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIHNjcmVlblxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICcjMGYwZDIwJztcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCA4MDAsIDYwMCk7XG5cbiAgICAgICAgICAgIHBhcnRpY2xlcy5kcmF3KGVsYXBzZWQsIGN0eCwgcGxheWVyKTtcbiAgICAgICAgICAgIGZseWluZ09iamVjdHMubG9vcChlbGFwc2VkLCBjdHgsIHBsYXllci5vZmZzZXRYLCBwbGF5ZXIub2Zmc2V0WSk7XG4gICAgICAgICAgICBwbGF5ZXIuZHJhdyhjdHgpO1xuICAgICAgICAgICAgbWVudXMuaW5nYW1lKGN0eCwgcGxheWVyLmZ1ZWwsIHBsYXllci5oZWFsdGgsIHBsYXllci5tb25leSk7XG5cbiAgICAgICAgICAgIHBsYXllci5tb25leSArPSAwLjAxO1xuICAgICAgICAgICAgaWYgKHBsYXllci50cmlnZ2VyZWQgPT09ICdwb2lzb24nKSB7XG4gICAgICAgICAgICAgICAgcGxheWVyLmhlYWx0aCAtPSAwLjE7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwbGF5ZXIuaGVhbHRoIDw9IDApIHtcbiAgICAgICAgICAgICAgICBwbGF5ZXIudHJpZ2dlcmVkID0gbnVsbDtcbiAgICAgICAgICAgICAgICBwbGF5ZXIudG90YWxNb25leSArPSBNYXRoLnJvdW5kKHBsYXllci5tb25leSk7XG4gICAgICAgICAgICAgICAgd2luZG93LnN0YXRlID0gJ2VuZCc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAod2luZG93LnN0YXRlID09PSAnZW5kJykge1xuICAgICAgICAgICAgYXVkaW8ucGF1c2Uoc2Z4KTtcbiAgICAgICAgICAgIG1lbnVzLmRyYXdFbmQoY3R4LCBwbGF5ZXIubW9uZXkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYod2luZG93LnN0YXRlID09PSAnc3RvcmUnKSB7XG4gICAgICAgICAgICBtZW51cy5kcmF3U3RvcmUoY3R4LCBwbGF5ZXIudG90YWxNb25leSk7XG4gICAgICAgIH1cbiAgICAgICAgYnV0dG9ucy5kcmF3QWxsKCk7XG4gICAgfSk7XG59KTtcblxud2luZG93LnJlc2V0R2FtZSA9IGZ1bmN0aW9uKCkge1xuICAgIHdpbmRvdy5zdGF0ZSA9ICdnYW1lJztcbiAgICBwbGF5ZXIucmVzZXQoKTtcbiAgICBwYXJ0aWNsZXMucmVzZXQoKTtcbiAgICBmbHlpbmdPYmplY3RzLnJlc2V0KCk7XG59O1xuXG52YXIgY2hhbmdlU3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAod2luZG93LnN0YXRlID09PSAnbWVudScpIHtcbiAgICAgICAgd2luZG93LnN0YXRlID0gJ2dhbWUnO1xuICAgIH1cbiAgICBlbHNlIGlmICh3aW5kb3cuc3RhdGUgPT09ICdlbmQnKSB7XG4gICAgICAgIHdpbmRvdy5yZXNldEdhbWUoKTtcbiAgICB9XG59O1xuXG4vLyBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjaGFuZ2VTdGF0ZSwgZmFsc2UpO1xuZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZSkge1xuICAgIGlmIChlLmtleUNvZGUgPT09IDEzKSB7XG4gICAgICAgIGNoYW5nZVN0YXRlKCk7XG4gICAgfVxufSwgZmFsc2UpO1xuIiwidmFyIGF1ZGlvID0gd2luZG93LmF1ZGlvID0ge307IC8vIE1hZGUgaXQgYSBnbG9iYWwgc28gSSBjYW4gZWFzaWx5IHRlc3RcbnZhciBlbGVtZW50cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2F1ZGlvJyk7XG52YXIgRkFERV9TUEVFRCA9IDAuMTtcblxuYXVkaW8ubXV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGVsZW1lbnRzW2ldLnZvbHVtZSA9IDA7XG4gICAgfVxufTtcbmF1ZGlvLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBlbGVtZW50c1tpXS5wYXVzZSgpO1xuICAgIH1cbn07XG5cbmF1ZGlvLnBsYXkgPSBmdW5jdGlvbiAobmFtZSwgc2Vla0Zyb20pIHtcbiAgICB2YXIgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG5hbWUpO1xuICAgIGVsZW0uY3VycmVudFRpbWUgPSBzZWVrRnJvbSB8fCAwO1xuICAgIGVsZW0ucGxheSgpO1xufTtcbmF1ZGlvLnBhdXNlID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHZhciBuYW1lcyA9IFtuYW1lXTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIG5hbWVzID0gbmFtZTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG5hbWVzW2ldKTtcbiAgICAgICAgZWxlbS5wYXVzZSgpO1xuICAgIH1cbiAgICBcbn07XG5cbmF1ZGlvLmZhZGVvdXQgPSBmdW5jdGlvbiAobmFtZSwgc2Vla0Zyb20sIGNiKSB7XG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChuYW1lKTtcbiAgICB2YXIgdm9sdW1lID0gZWxlbS52b2x1bWU7XG4gICAgdmFyIGRlY3JlYXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2b2x1bWUgLT0gRkFERV9TUEVFRDtcbiAgICAgICAgY29uc29sZS5sb2codm9sdW1lKTtcbiAgICAgICAgaWYgKHZvbHVtZSA8PSAwKSB7XG4gICAgICAgICAgICBlbGVtLnZvbHVtZSA9IDA7XG4gICAgICAgICAgICBlbGVtLnBhdXNlKCk7XG4gICAgICAgICAgICBjYiAmJiBjYihlbGVtKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGVsZW0udm9sdW1lID0gdm9sdW1lO1xuICAgICAgICAgICAgc2V0VGltZW91dChkZWNyZWFzZSwgMTAwLzMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBkZWNyZWFzZSgpO1xufVxuYXVkaW8uZmFkZWluID0gZnVuY3Rpb24gKG5hbWUsIHNlZWtGcm9tLCBjYikge1xuICAgIHZhciBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobmFtZSk7XG4gICAgdmFyIHZvbHVtZSA9IGVsZW0udm9sdW1lID0gMDtcbiAgICBlbGVtLnBsYXkoKTtcbiAgICB2YXIgaW5jcmVhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZvbHVtZSArPSBGQURFX1NQRUVEO1xuICAgICAgICBpZiAodm9sdW1lID49IDEpIHtcbiAgICAgICAgICAgIGVsZW0udm9sdW1lID0gMTtcbiAgICAgICAgICAgIGNiICYmIGNiKGVsZW0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZWxlbS52b2x1bWUgPSB2b2x1bWU7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGluY3JlYXNlLCAxMDAvMyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGluY3JlYXNlKCk7XG59XG5tb2R1bGUuZXhwb3J0cyA9IGF1ZGlvOyIsIi8vIE1ha2VzIGl0IGVhc2llciB0byBtYWtlIG1lbnUgYnV0dG9uc1xudmFyIGJ1dHRvbnMgPSBbXTtcblxudmFyIGNhbnZhcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNnYW1lJyk7XG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbnZhciBkcmF3QnV0dG9uID0gZnVuY3Rpb24oYnV0dG9uKSB7XG4gICAgaWYgKGJ1dHRvbi5pbWcpIHtcbiAgICAgICAgY3R4LmRyYXdJbWFnZShidXR0b24ueCwgYnV0dG9uLnksIGJ1dHRvbi53aWR0aCwgYnV0dG9uLmhlaWdodCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSAnd2hpdGUnO1xuICAgICAgICBjdHguc3Ryb2tlUmVjdChidXR0b24ueCwgYnV0dG9uLnksIGJ1dHRvbi53aWR0aCwgYnV0dG9uLmhlaWdodCk7XG4gICAgfVxuICAgIGlmIChidXR0b24udGV4dCkge1xuXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuICAgICAgICBjdHguZm9udCA9IGJ1dHRvbi5mb250O1xuICAgICAgICB2YXIgdGV4dERpbSA9IGN0eC5tZWFzdXJlVGV4dChidXR0b24udGV4dCk7XG4gICAgICAgIGN0eC5maWxsVGV4dChidXR0b24udGV4dCwgYnV0dG9uLnggKyAoYnV0dG9uLndpZHRoIC0gdGV4dERpbS53aWR0aCkgLyAyLCBidXR0b24ueSArIChidXR0b24uaGVpZ2h0ICsgMTApIC8gMik7XG4gICAgfVxufTtcblxuLy8gZGltID0gZGltZW5zaW9ucyA9IHt4LCB5LCB3aWR0aCwgaGVpZ2h0fSxcbi8vIHNjcmVlblN0YXRlOyB3aGVyZSB0aGUgYnV0dG9uIGlzIHZpc2libGVcbi8vIHRleHQgdG8gd3JpdGUgb24gYnV0dG9uLFxuLy8gaW1nIHRvIHB1dCBiZWhpbmQgdGV4dCAoaWYgdW5kZWZpbmVkLCBpdCdsbCBkcmF3IGEgd2hpdGUgYm9yZGVyIGFyb3VuZCB0aGUgYnV0dG9uIGFyZWEpXG52YXIgYWRkQnV0dG9uID0gZnVuY3Rpb24oZGltLCBzY3JlZW5TdGF0ZSwgb25jbGljaywgdGV4dCwgZm9udCwgaW1nKSB7XG4gICAgdmFyIGJ1dHRvbiA9IHt9O1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZGltKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYnV0dG9uW2tleXNbaV1dID0gZGltW2tleXNbaV1dO1xuICAgIH1cbiAgICBpZiAoYnV0dG9uLnggPT09ICdjZW50ZXInKSB7XG4gICAgICAgIGJ1dHRvbi54ID0gKGNhbnZhcy53aWR0aCAtIGJ1dHRvbi53aWR0aCkgLyAyO1xuICAgIH1cbiAgICBpZiAoYnV0dG9uLnkgPT09ICdjZW50ZXInKSB7XG4gICAgICAgIGJ1dHRvbi55ID0gKGNhbnZhcy5oZWlnaHQgLSBidXR0b24uaGVpZ2h0KSAvIDI7XG4gICAgfVxuICAgIGJ1dHRvbi5zY3JlZW5TdGF0ZSA9IHNjcmVlblN0YXRlIHx8ICdtZW51JztcbiAgICBidXR0b24ub25jbGljayA9IG9uY2xpY2s7XG4gICAgYnV0dG9uLnRleHQgPSB0ZXh0IHx8ICcnO1xuICAgIGJ1dHRvbi5mb250ID0gZm9udCB8fCAnMTJwdCBUZW1wZXN0YSBGaXZlJztcbiAgICBidXR0b24uaW1nID0gaW1nO1xuICAgIGJ1dHRvbnMucHVzaChidXR0b24pO1xufTtcblxudmFyIGRyYXdBbGwgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYnV0dG9uO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnV0dG9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICBidXR0b24gPSBidXR0b25zW2ldO1xuICAgICAgICBpZiAod2luZG93LnN0YXRlID09PSBidXR0b24uc2NyZWVuU3RhdGUpIHtcbiAgICAgICAgICAgIGRyYXdCdXR0b24oYnV0dG9uKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGRyYXdBbGw6IGRyYXdBbGwsXG4gICAgYWRkQnV0dG9uOiBhZGRCdXR0b25cbn07XG5cbnZhciBjaGVja0NsaWNrID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciB4ID0gZS5wYWdlWCAtIGNhbnZhcy5vZmZzZXRMZWZ0O1xuICAgIHZhciB5ID0gZS5wYWdlWSAtIGNhbnZhcy5vZmZzZXRUb3A7XG4gICAgdmFyIGJ1dHRvbjtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYnV0dG9uID0gYnV0dG9uc1tpXTtcbiAgICAgICAgaWYgKHggPj0gYnV0dG9uLnggJiYgeCA8PSBidXR0b24ueCArIGJ1dHRvbi53aWR0aCAmJlxuICAgICAgICAgICAgeSA+PSBidXR0b24ueSAmJiB5IDw9IGJ1dHRvbi55ICsgYnV0dG9uLmhlaWdodCAmJlxuICAgICAgICAgICAgd2luZG93LnN0YXRlID09PSBidXR0b24uc2NyZWVuU3RhdGUpIHtcbiAgICAgICAgICAgIGJ1dHRvbi5vbmNsaWNrKCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjaGVja0NsaWNrLCBmYWxzZSk7IiwidmFyIHBhcnRpY2xlc01vZHVsZSA9IHJlcXVpcmUoJy4vcGFydGljbGVzJyk7XG52YXIgc2hha2UgPSByZXF1aXJlKCcuL3NjcmVlbnNoYWtlJyk7XG5cbnZhciBwbGF5ZXJIaXRCb3ggPSB7XG4gICAgeDogMzc1LFxuICAgIHk6IDI3MCxcbiAgICB3aWR0aDogNTAsXG4gICAgaGVpZ2h0OiA2MFxufTtcbnZhciBhbmdsZWRDb2xsaXNpb24gPSBmdW5jdGlvbihwbGF5ZXIsIGZvKSB7XG4gICAgdmFyIGNvbGxpZGluZyA9IGZhbHNlO1xuICAgIGNvbGxpZGluZyA9IGFhYmIocGxheWVySGl0Qm94LCBmbyk7XG4gICAgcmV0dXJuIGNvbGxpZGluZztcbn07XG5cbnZhciBhYWJiID0gZnVuY3Rpb24oYSwgYikge1xuICAgIGlmIChcbiAgICAgICAgTWF0aC5hYnMoYS54ICsgYS53aWR0aCAvIDIgLSBiLnggLSBiLndpZHRoIC8gMikgPiAoYS53aWR0aCArIGIud2lkdGgpIC8gMiB8fFxuICAgICAgICBNYXRoLmFicyhhLnkgKyBhLmhlaWdodCAvIDIgLSBiLnkgLSBiLmhlaWdodCAvIDIpID4gKGEuaGVpZ2h0ICsgYi5oZWlnaHQpIC8gMlxuICAgICkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxudmFyIGluQXJlYSA9IGZ1bmN0aW9uKGFyZWEsIGFycmF5LCByZXNwQ29sbGlkaW5nLCByZXNwTm90Q29sbGlkaW5nKSB7XG4gICAgdmFyIHJldCA9IFtdO1xuICAgIHZhciBjdXJFbGVtO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY3VyRWxlbSA9IGFycmF5W2ldO1xuICAgICAgICBpZiAoYWFiYihhcmVhLCBjdXJFbGVtKSkge1xuICAgICAgICAgICAgcmV0LnB1c2goY3VyRWxlbSk7XG4gICAgICAgICAgICBpZiAocmVzcENvbGxpZGluZykge1xuICAgICAgICAgICAgICAgIHJlc3BDb2xsaWRpbmcoY3VyRWxlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocmVzcE5vdENvbGxpZGluZykge1xuICAgICAgICAgICAgcmVzcE5vdENvbGxpZGluZyhjdXJFbGVtKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufTtcblxudmFyIHBsYXllckFyZWEgPSB7XG4gICAgeDogMzI1LFxuICAgIHk6IDIyNSxcbiAgICB3aWR0aDogMTUwLFxuICAgIGhlaWdodDogMTUwXG59O1xuXG52YXIgY2FtZXJhID0ge1xuICAgIHg6IC00MDAsXG4gICAgeTogLTMwMCxcbiAgICB3aWR0aDogMTYwMCxcbiAgICBoZWlnaHQ6IDEyMDBcbn07XG5cbnZhciBleHBsb2RlT2JqID0gZnVuY3Rpb24oZm8pIHtcbiAgICBpZiAoZm8uaW1hZ2UgPT09ICdwb3dlci1pY29uLnBuZycpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBwYXJ0aWNsZXNNb2R1bGUuY3JlYXRlUGFydGljbGVzKGZvLngsIGZvLnksIGZvLnNwZWVkLCAwLjAxLCBmby53aWR0aCAqIGZvLmhlaWdodCAvIDEwMCwgW2ZvLmNvbG9yXSwge1xuICAgICAgICByYW5nZTogTWF0aC5yYW5kb20oKSAqIDIgKiBNYXRoLlBJLFxuICAgICAgICBub0NvbGxpZGU6IHRydWUsXG4gICAgICAgIGR4OiBmby5keCxcbiAgICAgICAgZHk6IGZvLmR5XG4gICAgfSk7XG59O1xuXG52YXIganVzdEV4cGxvZGVkID0gZmFsc2U7XG52YXIgdGlja3MgPSAwO1xudmFyIGNoZWNrID0gZnVuY3Rpb24ocGxheWVyLCBmb01vZHVsZSkge1xuICAgIC8vIGZvIHN0YW5kcyBmb3IgZmx5aW5nT2JqZWN0c1xuICAgIHZhciBwYXJ0aWNsZXMgPSBwYXJ0aWNsZXNNb2R1bGUuYXJyYXk7XG4gICAgdmFyIGZvcyA9IGZvTW9kdWxlLmFycmF5O1xuICAgIC8vIE1hbmFnZSBmbHlpbmcgb2JqZWN0IHNwYXduaW5nXG4gICAgdmFyIGZvSW5WaWV3ID0gaW5BcmVhKGNhbWVyYSwgZm9zLCB1bmRlZmluZWQsIGZ1bmN0aW9uKGZvKSB7XG4gICAgICAgIGZvLmFsaXZlID0gZmFsc2U7XG4gICAgfSk7XG4gICAgaWYgKGZvSW5WaWV3Lmxlbmd0aCA8IDMwICYmIGp1c3RFeHBsb2RlZCAhPT0gdHJ1ZSkge1xuICAgICAgICBmb01vZHVsZS5zcGF3bihNYXRoLnJhbmRvbSgpICogMTAwKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoanVzdEV4cGxvZGVkID09PSB0cnVlKSB7XG4gICAgICAgIHRpY2tzKys7XG4gICAgICAgIGlmICh0aWNrcyA+PSAxNTApIHtcbiAgICAgICAgICAgIHRpY2tzID0gMDtcbiAgICAgICAgICAgIGp1c3RFeHBsb2RlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ29sbGlzaW9ucyBiZXR3ZWVuIHRoZSBwbGF5ZXIgYW5kIHJvY2tzXG4gICAgdmFyIGZvVG9UZXN0ID0gaW5BcmVhKHBsYXllckFyZWEsIGZvcyk7XG4gICAgdmFyIGZvO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZm9Ub1Rlc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZm8gPSBmb1RvVGVzdFtpXTtcbiAgICAgICAgaWYgKGFuZ2xlZENvbGxpc2lvbihwbGF5ZXIsIGZvKSkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ0hJVCcpO1xuICAgICAgICAgICAgZm8uYWxpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChmby5pbWFnZSA9PT0gJ3Bvd2VyLWljb24ucG5nJykge1xuICAgICAgICAgICAgICAgIGF1ZGlvLnBsYXkoJ2NvbGxlY3QnKTtcbiAgICAgICAgICAgICAgICBwbGF5ZXIuZnVlbCArPSAxMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGF1ZGlvLnBsYXkoJ2NvbGxpZGUnKTtcbiAgICAgICAgICAgICAgICBpZiAocGxheWVyLnRyaWdnZXJlZCAhPT0gJ2ludmluY2liaWxpdHknKSB7XG4gICAgICAgICAgICAgICAgICAgIHBsYXllci5oaXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuaGVhbHRoIC09IChmby53aWR0aCAqIGZvLmhlaWdodCkgLyAxMDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuYWRkTW9uZXkoZm8pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBleHBsb2RlT2JqKGZvKTtcbiAgICAgICAgICAgICAgICBzaGFrZSg1KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAocGxheWVyLnRyaWdnZXJlZCA9PT0gJ2ludmluY2liaWxpdHknKSB7XG4gICAgICAgIHRpY2tzKys7XG4gICAgICAgIGlmICh0aWNrcyA+PSA2MDApIHtcbiAgICAgICAgICAgIHRpY2tzID0gMDtcbiAgICAgICAgICAgIHBsYXllci50cmlnZ2VyZWQgPSBudWxsO1xuICAgICAgICAgICAgcGxheWVyLmVxdWlwcGVkID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciBjb2xsaXNpb25zIGJldHdlZW4gcGFydGljbGVzIGFuZCBmb1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydGljbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChwYXJ0aWNsZXNbaV0ubm9Db2xsaWRlKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpbkFyZWEocGFydGljbGVzW2ldLCBmb3MsIGZ1bmN0aW9uKGZvKSB7XG4gICAgICAgICAgICBpZiAocGFydGljbGVzW2ldLmFsaXZlICYmICFmby5nb29kKSB7XG4gICAgICAgICAgICAgICAgZm8uYWxpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBhdWRpby5wbGF5KCdleHBsb2RlX21ldGVvcicpO1xuICAgICAgICAgICAgICAgIHBsYXllci5hZGRNb25leShmbyk7XG4gICAgICAgICAgICAgICAgZXhwbG9kZU9iaihmbyk7XG4gICAgICAgICAgICAgICAgc2hha2UoMik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChwbGF5ZXIudHJpZ2dlcmVkID09PSAnZXhwbG9kZScpIHtcbiAgICAgICAgcGxheWVyLnRyaWdnZXJlZCA9IG51bGw7XG4gICAgICAgIHBsYXllci5lcXVpcHBlZCA9IG51bGw7XG4gICAgICAgIGp1c3RFeHBsb2RlZCA9IHRydWU7XG5cbiAgICAgICAgc2hha2UoMTApO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZvcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZm8gPSBmb3NbaV07XG4gICAgICAgICAgICBpZiAoZm8uaW1hZ2UgIT09ICdwb3dlci1pY29uLnBuZycpIHtcbiAgICAgICAgICAgICAgICBmby5hbGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHBsYXllci5hZGRNb25leShmbyk7XG4gICAgICAgICAgICAgICAgZXhwbG9kZU9iaihmbyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjaGVjazogY2hlY2tcbn07IiwidmFyIHBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyJyk7XG52YXIga2V5cyA9IHt9O1xudmFyIEMgPSB7XG4gICAgU1BBQ0U6IDMyLFxuICAgIExFRlQ6IDM3LFxuICAgIFVQOiAzOCxcbiAgICBSSUdIVDogMzksXG4gICAgRE9XTjogNDBcbn1cbmRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAoZS5rZXlDb2RlID09PSBDLlNQQUNFKSB7XG4gICAgICAgIHBsYXllci50cmlnZ2VyKCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZS5rZXlDb2RlID49IDM3ICYmIGUua2V5Q29kZSA8PSA0MCkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuICAgIGtleXNbZS5rZXlDb2RlXSA9IHRydWU7XG59KTtcbmRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdGlvbihlKSB7XG4gICAga2V5c1tlLmtleUNvZGVdID0gZmFsc2U7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbGVmdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzW0MuTEVGVF07XG4gICAgfSxcbiAgICB1cDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzW0MuVVBdO1xuICAgIH0sXG4gICAgcmlnaHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1tDLlJJR0hUXTtcbiAgICB9LFxuICAgIGRvd246IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1tDLkRPV05dO1xuICAgIH1cbn07XG4iLCJ2YXIgaW1hZ2VOYW1lcyA9IFtcbiAgICAnYXN0cm8ucG5nJyxcbiAgICAnYXN0cm8tZmx5aW5nLnBuZycsXG4gICAgJ2hlYWx0aC1iYXItaWNvbi5wbmcnLFxuICAgICdsb2dvLnBuZycsXG4gICAgJ3Bvd2VyLWJhci1pY29uLnBuZycsXG4gICAgJ3Bvd2VyLWljb24ucG5nJyxcbiAgICAncm9jay01LnBuZycsXG4gICAgJ3JvY2stYWx0LTUucG5nJyxcbiAgICAncm9jay1vZGQtMS5wbmcnLFxuICAgICdyb2NrLW9kZC0zLnBuZydcbl07XG5cbnZhciBpbWFnZXMgPSB7fTtcbnZhciBsb2FkZWQgPSAwO1xudmFyIGRvbmUgPSBmdW5jdGlvbihjYikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW1hZ2VOYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpbWFnZXNbaW1hZ2VOYW1lc1tpXV0gPSBuZXcgSW1hZ2UoKTtcbiAgICAgICAgaW1hZ2VzW2ltYWdlTmFtZXNbaV1dLnNyYyA9ICdpbWFnZXMvJyArIGltYWdlTmFtZXNbaV07XG4gICAgICAgIGltYWdlc1tpbWFnZU5hbWVzW2ldXS5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGxvYWRlZCsrO1xuICAgICAgICAgICAgaWYgKGxvYWRlZCA9PT0gaW1hZ2VOYW1lcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjYigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbGlzdDogaW1hZ2VOYW1lcyxcbiAgICBpbWFnZXM6IGltYWdlcyxcbiAgICBkb25lOiBkb25lLFxuICAgIGdldDogZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGltYWdlTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChpbWFnZU5hbWVzW2ldLmluZGV4T2Yoc3RyaW5nKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICByZXQucHVzaChpbWFnZU5hbWVzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cbn07IiwidmFyIGxvYWRlciA9IHJlcXVpcmUoJy4vbG9hZGVyJyk7XG52YXIgdGV4dCA9IHJlcXVpcmUoJy4vdGV4dCcpO1xudmFyIGJ1dHRvbnMgPSByZXF1aXJlKCcuL2J1dHRvbnMnKTtcblxuYnV0dG9ucy5hZGRCdXR0b24oXG4gICAge1xuICAgICAgICB4OiAnY2VudGVyJyxcbiAgICAgICAgeTogMzAwLFxuICAgICAgICB3aWR0aDogMjAwLFxuICAgICAgICBoZWlnaHQ6IDUwXG4gICAgfSxcbiAgICAnbWVudScsXG4gICAgZnVuY3Rpb24oKSB7XG4gICAgICAgIHdpbmRvdy5zdGF0ZSA9ICdnYW1lJztcbiAgICB9LFxuICAgICdDbGljayB0byBwbGF5JyxcbiAgICAnMTJwdCBUZW1wZXN0YSBGaXZlJ1xuKTtcblxuXG5idXR0b25zLmFkZEJ1dHRvbihcbiAgICB7XG4gICAgICAgIHg6IDIwMCxcbiAgICAgICAgeTogNDAwLFxuICAgICAgICB3aWR0aDogMjAwLFxuICAgICAgICBoZWlnaHQ6IDUwXG4gICAgfSxcbiAgICAnZW5kJyxcbiAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgd2luZG93LnJlc2V0R2FtZSgpO1xuICAgIH0sXG4gICAgJ1BsYXkgYWdhaW4nLFxuICAgICcxMnB0IFRlbXBlc3RhIEZpdmUnXG4pO1xuYnV0dG9ucy5hZGRCdXR0b24oXG4gICAge1xuICAgICAgICB4OiA0NTAsXG4gICAgICAgIHk6IDQwMCxcbiAgICAgICAgd2lkdGg6IDIwMCxcbiAgICAgICAgaGVpZ2h0OiA1MFxuICAgIH0sXG4gICAgJ2VuZCcsXG4gICAgZnVuY3Rpb24oKSB7XG4gICAgICAgIHdpbmRvdy5zdGF0ZSA9ICdzdG9yZSc7XG4gICAgfSxcbiAgICAnU3RvcmUnLFxuICAgICcxMnB0IFRlbXBlc3RhIEZpdmUnXG4pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBkcmF3TWVudTogZnVuY3Rpb24oY3R4KSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzBmMGQyMCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCA4MDAsIDYwMCk7XG5cbiAgICAgICAgY3R4LmRyYXdJbWFnZShsb2FkZXIuaW1hZ2VzWydsb2dvLnBuZyddLCAzMTQsIDE4MCk7XG4gICAgICAgIHRleHQud3JpdGUoJ0EgR0FNRSBCWScsICdjZW50ZXInLCA1MDApO1xuICAgICAgICB0ZXh0LndyaXRlKCdAQU1BQU5DIEFORCBATUlLRURJRFRISVMnLCAnY2VudGVyJywgNTIwLCBmdW5jdGlvbihjdHgpIHtcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnI0RDRkNGOSc7XG4gICAgICAgICAgICBjdHguZm9udCA9ICcxMnB0IFRlbXBlc3RhIEZpdmUnO1xuICAgICAgICB9KTtcblxuICAgIH0sXG4gICAgZHJhd0VuZDogZnVuY3Rpb24oY3R4LCBtb25leSkge1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJyMwZjBkMjAnO1xuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgODAwLCA2MDApO1xuICAgICAgICB0ZXh0LndyaXRlKCdZb3UgZWFybmVkIEEkJyArIE1hdGgucm91bmQobW9uZXkpICsgJy4nLCAnY2VudGVyJywgMzAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuICAgICAgICAgICAgY3R4LmZvbnQgPSAnMjZwdCBUZW1wZXN0YSBGaXZlJztcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBpbmdhbWU6IGZ1bmN0aW9uKGN0eCwgZnVlbCwgaGVhbHRoLCBtb25leSkge1xuICAgICAgICBjdHguZHJhd0ltYWdlKGxvYWRlci5pbWFnZXNbJ3Bvd2VyLWJhci1pY29uLnBuZyddLCAzMCwgNTAwKTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICdvcmFuZ2UnO1xuICAgICAgICBjdHguZmlsbFJlY3QoMzAsIDQ5MCAtIGZ1ZWwsIDIwLCBmdWVsKTtcblxuICAgICAgICBjdHguZHJhd0ltYWdlKGxvYWRlci5pbWFnZXNbJ2hlYWx0aC1iYXItaWNvbi5wbmcnXSwgNzAsIDUwMCk7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAncmVkJztcbiAgICAgICAgY3R4LmZpbGxSZWN0KDcwLCA0OTAgLSBoZWFsdGgsIDIwLCBoZWFsdGgpO1xuXG4gICAgICAgIHRleHQud3JpdGUoJ0EkOiAnICsgTWF0aC5yb3VuZChtb25leSksIDMwLCA1NTAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY3R4LmZvbnQgPSAnMTJwdCBUZW1wZXN0YSBGaXZlJztcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGRyYXdTdG9yZTogZnVuY3Rpb24oY3R4LCB0b3RhbE1vbmV5KSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzBmMGQyMCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCA4MDAsIDYwMCk7XG4gICAgICAgIHRleHQud3JpdGUoJ1NUT1JFJywgMzAsIDUwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGN0eC5mb250ID0gJzE2cHQgVGVtcGVzdGEgRml2ZSc7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgfSk7XG4gICAgICAgIHRleHQud3JpdGUoJ0FsdGFyaWFuIERvbGxhcnM6ICcgKyB0b3RhbE1vbmV5LCAyMDAsIDUwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGN0eC5mb250ID0gJzE2cHQgVGVtcGVzdGEgRml2ZSc7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgfSk7XG4gICAgfVxufTsiLCJ2YXIgcGFydGljbGVzID0gW107XG52YXIgVyA9IDcsIEggPSA3O1xudmFyIERFQ19SQVRFID0gMC4xOyAvLyBEZWZhdWx0IGRlY3JlYXNlIHJhdGUuIEhpZ2hlciByYXRlIC0+IHBhcnRpY2xlcyBnbyBmYXN0ZXJcbnZhciBQYXJ0aWNsZSA9IGZ1bmN0aW9uKHgsIHksIHNwZWVkLCBkZWNSYXRlLCBjb2xvcnMpIHtcbiAgICB0aGlzLmFsaXZlID0gdHJ1ZTtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy5keCA9IHRoaXMuZHkgPSAwO1xuICAgIHRoaXMud2lkdGggPSBXO1xuICAgIHRoaXMuaGVpZ2h0ID0gSDtcbiAgICB0aGlzLmFuZ2xlID0gMDtcbiAgICB0aGlzLnNwZWVkID0gc3BlZWQ7XG4gICAgdGhpcy5vcGFjaXR5ID0gMTtcbiAgICB0aGlzLmRlY1JhdGUgPSBkZWNSYXRlIHx8IERFQ19SQVRFO1xuICAgIHRoaXMuZGVsYXkgPSBNYXRoLmNlaWwoTWF0aC5yYW5kb20oKSAqIDEwKTtcbiAgICBpZiAoY29sb3JzKSB7XG4gICAgICAgIHRoaXMuY29sb3IgPSBjb2xvcnNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY29sb3JzLmxlbmd0aCldO1xuICAgIH1cbiAgICB0aGlzLmxvb3AgPSBmdW5jdGlvbihlbGFwc2VkLCBjdHgsIHBsYXllcikge1xuICAgICAgICBpZiAodGhpcy5kZWxheSA+IDApIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRlbGF5IDw9IDEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFuZ2xlID0gcGxheWVyLmFuZ2xlIC0gdGhpcy5yYW5nZSArIChNYXRoLnJhbmRvbSgpICogMiAqIHRoaXMucmFuZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5kZWxheS0tO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMueCArPSA2Ni42ICogZWxhcHNlZCAqICh0aGlzLmR4IC0gd2luZG93LnBsYXllci5vZmZzZXRYICsgTWF0aC5zaW4oLXRoaXMuYW5nbGUpICogc3BlZWQpO1xuICAgICAgICB0aGlzLnkgKz0gNjYuNiAqIGVsYXBzZWQgKiAodGhpcy5keSAtIHdpbmRvdy5wbGF5ZXIub2Zmc2V0WSArIE1hdGguY29zKC10aGlzLmFuZ2xlKSAqIHNwZWVkKTtcbiAgICAgICAgdGhpcy5vcGFjaXR5IC09IHRoaXMuZGVjUmF0ZTtcbiAgICAgICAgaWYgKHRoaXMub3BhY2l0eSA8PSAwKSB7XG4gICAgICAgICAgICB0aGlzLm9wYWNpdHkgPSAwO1xuICAgICAgICAgICAgdGhpcy5hbGl2ZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vIERyYXdcbiAgICAgICAgY3R4LnNhdmUoKTtcbiAgICAgICAgY3R4Lmdsb2JhbEFscGhhID0gdGhpcy5vcGFjaXR5O1xuICAgICAgICBjdHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gJ2xpZ2h0ZXInO1xuICAgICAgICBjdHgudHJhbnNsYXRlKHRoaXMueCwgdGhpcy55KTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuY29sb3IgfHwgJ3JlZCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCBXLCBIKTtcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICB9O1xufTtcblxuLy8geCwgeSBhcmUgZml4ZWRcbi8vIFBhcnRpY2xlcyBhcmUgY3JlYXRlZCBmcm9tIGFuZ2xlLXJhbmdlIHRvIGFuZ2xlK3JhbmdlXG4vLyBzcGVlZCBpcyBmaXhlZFxudmFyIGFuZ2xlID0gMDtcbnZhciBjcmVhdGVQYXJ0aWNsZXMgPSBmdW5jdGlvbih4LCB5LCBzcGVlZCwgZGVjUmF0ZSwgbiwgY29sb3JzLCBwcm9wcykge1xuICAgIC8vIGNvbnNvbGUubG9nKCdDcmVhdGluZycsIHBhcnRpY2xlcyk7XG4gICAgdmFyIGNyZWF0ZWQgPSAwLCBpID0gMDtcbiAgICB2YXIgcGFydGljbGU7XG4gICAgd2hpbGUoY3JlYXRlZCA8IG4pIHtcbiAgICAgICAgcGFydGljbGUgPSBwYXJ0aWNsZXNbaV07XG4gICAgICAgIGlmIChwYXJ0aWNsZSAmJiAhcGFydGljbGUuYWxpdmUgfHwgIXBhcnRpY2xlKSB7XG4gICAgICAgICAgICBwYXJ0aWNsZXNbaV0gPSBuZXcgUGFydGljbGUoeCwgeSwgc3BlZWQsIGRlY1JhdGUsIGNvbG9ycyk7XG4gICAgICAgICAgICBjcmVhdGVkKys7XG4gICAgICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHByb3BzKTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwga2V5cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHBhcnRpY2xlc1tpXVtrZXlzW2pdXSA9IHByb3BzW2tleXNbal1dO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUG9zc2libGUgcHJvcHM6IHJhbmdlLCBub0NvbGxpZGUsIGR4LCBkeSwgY29sb3JcbiAgICAgICAgfVxuICAgICAgICBpKys7XG4gICAgfVxufTtcblxudmFyIGRyYXcgPSBmdW5jdGlvbihlbGFwc2VkLCBjdHgsIHBsYXllcikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydGljbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHBhcnRpY2xlc1tpXS5sb29wKGVsYXBzZWQsIGN0eCwgcGxheWVyKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjcmVhdGVQYXJ0aWNsZXM6IGNyZWF0ZVBhcnRpY2xlcyxcbiAgICBkcmF3OiBkcmF3LFxuICAgIGFycmF5OiBwYXJ0aWNsZXMsXG4gICAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBwYXJ0aWNsZXMubGVuZ3RoID0gMDtcbiAgICB9XG59O1xuIiwidmFyIHdoaXRlbiA9IHJlcXVpcmUoJy4vd2hpdGVuJyk7XG52YXIgY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2dhbWUnKTtcblxud2luZG93LnBsYXllciA9IHt9O1xuXG5wbGF5ZXIuaWRsZSA9IG5ldyBJbWFnZSgpO1xucGxheWVyLmlkbGUuc3JjID0gJ2ltYWdlcy9hc3Ryby5wbmcnO1xucGxheWVyLmlkbGUubmFtZSA9ICdhc3Ryby5wbmcnO1xucGxheWVyLmZseWluZyA9IG5ldyBJbWFnZSgpO1xucGxheWVyLmZseWluZy5zcmMgPSAnaW1hZ2VzL2FzdHJvLWZseWluZy5wbmcnO1xucGxheWVyLmZseWluZy5uYW1lID0gJ2FzdHJvLWZseWluZy5wbmcnO1xucGxheWVyLnN0YXRlID0gJ2lkbGUnO1xuXG5wbGF5ZXIuZGVmYXVsdHMgPSB7XG4gICAgbW9uZXk6IDAsXG4gICAgYW5nbGU6IDAsXG4gICAgb2Zmc2V0WTogMCxcbiAgICBvZmZzZXRYOiAwLFxuICAgIGhlYWx0aDogMTAsXG4gICAgZnVlbDogMTAsXG4gICAgaGl0OiBmYWxzZSxcbiAgICBwcm9wUmFuZ2U6IDguMyxcbiAgICBtb25leU11bHRpcGxpZXI6IDFcbn07XG5cbnBsYXllci53aWR0aCA9IDUyO1xucGxheWVyLmhlaWdodCA9IDYwO1xucGxheWVyLnggPSAoY2FudmFzLndpZHRoIC0gcGxheWVyLndpZHRoKSAvIDI7XG5wbGF5ZXIueSA9IChjYW52YXMuaGVpZ2h0IC0gcGxheWVyLmhlaWdodCkgLyAyO1xucGxheWVyLmFuZ2xlID0gMDtcbnBsYXllci50b3RhbE1vbmV5ID0gcGxheWVyLm1vbmV5ID0gMDtcbnBsYXllci5jb2xvcnMgPSBbJ2JsYWNrJywgJ29yYW5nZSddO1xuXG5wbGF5ZXIub2Zmc2V0WCA9IHBsYXllci5vZmZzZXRZID0gMDtcblxuXG4vLyBIYWxmIHdpZHRoLCBoYWxmIGhlaWdodFxudmFyIGhXID0gcGxheWVyLndpZHRoIC8gMjtcbnZhciBoSCA9IHBsYXllci5oZWlnaHQgLyAyO1xuXG52YXIgc3BlZWQgPSAwOyAvLyBUaGUgY3VycmVudCBzcGVlZFxudmFyIGRTcGVlZDtcbnZhciBkWCA9IDAsIGRZID0gMDtcblxuLy8gWU9VIENBTiBDT05GSUdVUkUgVEhFU0UhIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG52YXIgYWNjID0gNzsgLy8gQWNjZWxlcmF0aW9uXG52YXIgbGltID0gMTA7IC8vIFNwZWVkIGxpbWl0XG52YXIgdHVyblNwZWVkID0gMi4yO1xudmFyIGdyYXYgPSAwLjAzO1xuLy8gTk8gTU9SRSBDT05GSUdVUklORyEgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblxuXG5wbGF5ZXIucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgICBkWCA9IGRZID0gc3BlZWQgPSBkU3BlZWQgPSAwO1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMocGxheWVyLmRlZmF1bHRzKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcGxheWVyW2tleXNbaV1dID0gcGxheWVyLmRlZmF1bHRzW2tleXNbaV1dO1xuICAgIH1cbiAgICBwbGF5ZXIubW92ZSgpO1xufTtcbnBsYXllci5ncmF2aXR5ID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIGRZIC09IGdyYXY7XG59O1xucGxheWVyLm1vdmUgPSBmdW5jdGlvbihlbGFwc2VkLCBmbHlpbmcpIHtcbiAgICBwbGF5ZXIub2Zmc2V0WCA9IGRYO1xuICAgIHBsYXllci5vZmZzZXRZID0gLWRZO1xuICAgIGRYICo9IDAuOTk7XG4gICAgZFkgKj0gMC45OTtcblxuICAgIGlmICghZmx5aW5nKSB7XG4gICAgICAgIHBsYXllci5zdGF0ZSA9ICdpZGxlJztcbiAgICB9XG59O1xucGxheWVyLnVwID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5mdWVsIC09IDAuMjtcbiAgICBwbGF5ZXIuc3RhdGUgPSAnZmx5aW5nJztcbiAgICBzcGVlZCArPSBhY2M7XG4gICAgZFNwZWVkID0gZWxhcHNlZCAqIHNwZWVkO1xuXG4gICAgZFggKz0gTWF0aC5zaW4ocGxheWVyLmFuZ2xlKSAqIGRTcGVlZDtcbiAgICBkWSArPSBNYXRoLmNvcyhwbGF5ZXIuYW5nbGUpICogZFNwZWVkO1xuICAgIHBsYXllci5tb3ZlKGVsYXBzZWQsIHRydWUpO1xuICAgIGlmIChzcGVlZCA+IGxpbSkge1xuICAgICAgICBzcGVlZCA9IGxpbTtcbiAgICB9XG4gICAgZWxzZSBpZiAoc3BlZWQgPCAtbGltKSB7XG4gICAgICAgIHNwZWVkID0gLWxpbTtcbiAgICB9XG5cbn07XG5wbGF5ZXIucmlnaHQgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgcGxheWVyLmFuZ2xlICs9IGVsYXBzZWQgKiB0dXJuU3BlZWQgKiBNYXRoLlBJO1xufTtcbnBsYXllci5sZWZ0ID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5hbmdsZSAtPSBlbGFwc2VkICogdHVyblNwZWVkICogTWF0aC5QSTtcbn07XG5wbGF5ZXIudHJpZ2dlciA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIEVuYWJsZSB0aGUgZXF1aXBwYWJsZSBpdGVtXG4gICAgcGxheWVyLnRyaWdnZXJlZCA9IHBsYXllci5lcXVpcHBlZDtcbn07XG5cbnBsYXllci5hZGRNb25leSA9IGZ1bmN0aW9uKGZvKSB7XG4gICAgcGxheWVyLm1vbmV5ICs9IHBsYXllci5tb25leU11bHRpcGxpZXIgKiAoZm8ud2lkdGggKiBmby5oZWlnaHQpIC8gMTAwMDtcbn07XG5cblxudmFyIHRpY2tzID0gMDtcbnBsYXllci5kcmF3ID0gZnVuY3Rpb24oY3R4KSB7XG4gICAgLy8gUGxheWVyXG4gICAgY3R4LnNhdmUoKTtcbiAgICBjdHgudHJhbnNsYXRlKHBsYXllci54ICsgaFcsIHBsYXllci55ICsgaEgpO1xuICAgIGN0eC5yb3RhdGUocGxheWVyLmFuZ2xlKTtcbiAgICAvLyBwbGF5ZXIuaGl0IGlzIHNldCBpbiBjb2xsaXNpb25zLmpzXG4gICAgLy8gSWYgdGhlIHBsYXllcidzIGJlZW4gaGl0LCB3ZSB3YW50IGl0IHRvIGZsYXNoIHdoaXRlIHRvIGluZGljYXRlIHRoYXRcbiAgICBpZiAocGxheWVyLnRyaWdnZXJlZCA9PT0gJ2ludmluY2liaWxpdHknKSB7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2Uod2hpdGVuKHBsYXllcltwbGF5ZXIuc3RhdGVdLm5hbWUsICdncmVlbicpLCAtaFcsIC1oSCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHBsYXllci5oaXQpIHtcbiAgICAgICAgY3R4LmRyYXdJbWFnZSh3aGl0ZW4ocGxheWVyW3BsYXllci5zdGF0ZV0ubmFtZSwgJ3BpbmsnKSwgLWhXLCAtaEgpO1xuICAgICAgICB0aWNrcysrO1xuICAgICAgICBpZiAodGlja3MgPj0gOCkge1xuICAgICAgICAgICAgcGxheWVyLmhpdCA9IGZhbHNlO1xuICAgICAgICAgICAgdGlja3MgPSAwO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjdHguZHJhd0ltYWdlKHBsYXllcltwbGF5ZXIuc3RhdGVdLCAtaFcsIC1oSCk7XG4gICAgfVxuICAgIGN0eC5yZXN0b3JlKCk7XG5cbn07XG5cbnBsYXllci5yZXNldCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBsYXllcjtcbiIsIi8vIEhvbGRzIGxhc3QgaXRlcmF0aW9uIHRpbWVzdGFtcC5cbnZhciB0aW1lID0gMDtcblxuLyoqXG4gKiBDYWxscyBgZm5gIG9uIG5leHQgZnJhbWUuXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuIFRoZSBmdW5jdGlvblxuICogQHJldHVybiB7aW50fSBUaGUgcmVxdWVzdCBJRFxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIHJhZihmbikge1xuICByZXR1cm4gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgICB2YXIgZWxhcHNlZCA9IG5vdyAtIHRpbWU7XG5cbiAgICBpZiAoZWxhcHNlZCA+IDk5OSkge1xuICAgICAgZWxhcHNlZCA9IDEgLyA2MDtcbiAgICB9IGVsc2Uge1xuICAgICAgZWxhcHNlZCAvPSAxMDAwO1xuICAgIH1cblxuICAgIHRpbWUgPSBub3c7XG4gICAgZm4oZWxhcHNlZCk7XG4gIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgLyoqXG4gICAqIENhbGxzIGBmbmAgb24gZXZlcnkgZnJhbWUgd2l0aCBgZWxhcHNlZGAgc2V0IHRvIHRoZSBlbGFwc2VkXG4gICAqIHRpbWUgaW4gbWlsbGlzZWNvbmRzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm4gVGhlIGZ1bmN0aW9uXG4gICAqIEByZXR1cm4ge2ludH0gVGhlIHJlcXVlc3QgSURcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHN0YXJ0OiBmdW5jdGlvbihmbikge1xuICAgIHJldHVybiByYWYoZnVuY3Rpb24gdGljayhlbGFwc2VkKSB7XG4gICAgICBmbihlbGFwc2VkKTtcbiAgICAgIHJhZih0aWNrKTtcbiAgICB9KTtcbiAgfSxcbiAgLyoqXG4gICAqIENhbmNlbHMgdGhlIHNwZWNpZmllZCBhbmltYXRpb24gZnJhbWUgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHtpbnR9IGlkIFRoZSByZXF1ZXN0IElEXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzdG9wOiBmdW5jdGlvbihpZCkge1xuICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZShpZCk7XG4gIH1cbn07XG4iLCJ2YXIgY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2dhbWUnKTtcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxudmFyIHBvbGFyaXR5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgPiAwLjUgPyAxIDogLTE7XG59O1xuXG4vLyBBbW91bnQgd2UndmUgbW92ZWQgc28gZmFyXG52YXIgdG90YWxYID0gMDtcbnZhciB0b3RhbFkgPSAwO1xuXG52YXIgc2hha2UgPSBmdW5jdGlvbihpbnRlbnNpdHkpIHtcbiAgICBpZiAodG90YWxYID09PSAwKSB7XG4gICAgICAgIGN0eC5zYXZlKCk7XG4gICAgfVxuICAgIGlmICghaW50ZW5zaXR5KSB7XG4gICAgICAgIGludGVuc2l0eSA9IDI7XG4gICAgfVxuICAgIHZhciBkWCA9IE1hdGgucmFuZG9tKCkgKiBpbnRlbnNpdHkgKiBwb2xhcml0eSgpO1xuICAgIHZhciBkWSA9IE1hdGgucmFuZG9tKCkgKiBpbnRlbnNpdHkgKiBwb2xhcml0eSgpO1xuICAgIHRvdGFsWCArPSBkWDtcbiAgICB0b3RhbFkgKz0gZFk7XG5cbiAgICAvLyBCcmluZyB0aGUgc2NyZWVuIGJhY2sgdG8gaXRzIHVzdWFsIHBvc2l0aW9uIGV2ZXJ5IFwiMiBpbnRlbnNpdHlcIiBzbyBhcyBub3QgdG8gZ2V0IHRvbyBmYXIgYXdheSBmcm9tIHRoZSBjZW50ZXJcbiAgICBpZiAoaW50ZW5zaXR5ICUgMiA8IDAuMikge1xuICAgICAgICBjdHgudHJhbnNsYXRlKC10b3RhbFgsIC10b3RhbFkpO1xuICAgICAgICB0b3RhbFggPSB0b3RhbFkgPSAwO1xuICAgICAgICBpZiAoaW50ZW5zaXR5IDw9IDAuMTUpIHtcbiAgICAgICAgICAgIGN0eC5yZXN0b3JlKCk7IC8vIEp1c3QgdG8gbWFrZSBzdXJlIGl0IGdvZXMgYmFjayB0byBub3JtYWxcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGN0eC50cmFuc2xhdGUoZFgsIGRZKTtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBzaGFrZShpbnRlbnNpdHkgLSAwLjEpO1xuICAgIH0sIDUpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzaGFrZTsiLCJ2YXIgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcbnZhciBidXR0b25zID0gcmVxdWlyZSgnLi9idXR0b25zJyk7XG5cbnZhciBpdGVtcyA9IFtcbiAgICB7XG4gICAgICAgIG5hbWU6ICdIZWFsdGgnLFxuICAgICAgICBkZXNjOiAnSW5jcmVhc2VzIGhlYWx0aCBieSAxMCcsXG4gICAgICAgIGZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBsYXllci5kZWZhdWx0cy5oZWFsdGggKz0gMTA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgbmFtZTogJ0Z1ZWwnLFxuICAgICAgICBkZXNjOiAnSW5jcmVhc2VzIGZ1ZWwgYnkgMTAnLFxuICAgICAgICBmbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZGVmYXVsdHMuZnVlbCArPSAxMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBuYW1lOiAnQ29sb3JmdWwnLFxuICAgICAgICBkZXNjOiAnJyxcbiAgICAgICAgZm46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGxheWVyLmNvbG9ycyA9IFsnYmx1ZScsICdyZWQnXTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBuYW1lOiAnR29sZCBTdWl0JyxcbiAgICAgICAgZGVzYzogJycsXG4gICAgICAgIGZuOiBmdW5jdGlvbigpIHtcblxuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIG5hbWU6ICdFZmZpY2llbmN5JyxcbiAgICAgICAgZGVzYzogJ0luY3JlYXNlcyBlZmZpY2llbmN5IG9mIG1pbmluZyByb2NrcyBzbyB5b3UgZ2V0IG1vcmUgQWx0YXJpYW4gRG9sbGFycyBwZXIgYXN0ZXJvaWQnLFxuICAgICAgICBmbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZGVmYXVsdHMubW9uZXlNdWx0aXBsaWVyICs9IDAuMTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBuYW1lOiAnSW5kaWNhdG9ycycsXG4gICAgICAgIGRlc2M6ICdGaW5kIHNoaXQgbW9yZSBlYXNpbHkuIEluZGljYXRvcnMgYXJvdW5kIHRoZSBzY3JlZW4gd2lsbCBzaG93IHlvdSB3aGVyZSBvYmplY3RzIGxpa2UgWFlaIGFyZScsXG4gICAgICAgIGZuOiBmdW5jdGlvbigpIHtcblxuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIG5hbWU6ICdSYW5nZScsXG4gICAgICAgIGRlc2M6ICdUaGUgcHJvcHVsc2lvbiBwYXJ0aWNsZXMgZ28gZnVydGhlciBhd2F5LCBtYWtpbmcgaXQgZWFzaWVyIHRvIGRlc3Ryb3kgcm9ja3MnLFxuICAgICAgICBmbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZGVmYXVsdHMucHJvcFJhbmdlICs9IDE7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgbmFtZTogJ0F1dG8tc2hpZWxkJyxcbiAgICAgICAgZGVzYzogJ0Egc2hpZWxkIHByb3RlY3RzIHlvdSBmcm9tIG9uZSBoaXQgaW4gZXZlcnkgZ2FtZSBhdXRvbWF0aWNhbGx5JyxcbiAgICAgICAgZm46IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgbmFtZTogJ0ludmluY2liaWxpdHknLFxuICAgICAgICBkZXNjOiAnUHJlc3Mgc3BhY2ViYXIgdG8gYmVjb21lIGludmluY2libGUgdG8gYWxsIGFzdGVyb2lkcywgc28geW91IGNhbiBiZSBhcyBjYXJlbGVzcyBhcyB5b3Ugd2FudCBmb3IgMzAgc2Vjb25kcycsXG4gICAgICAgIGZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBsYXllci5kZWZhdWx0cy5lcXVpcHBlZCA9ICdpbnZpbmNpYmlsaXR5JztcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBuYW1lOiAnUGFuaWMgZXhwbG9kZScsXG4gICAgICAgIGRlc2M6ICdQcmVzcyBzcGFjZWJhciB0byBtYWtlIGFsbCBhc3Rlcm9pZHMgb24gc2NyZWVuIGV4cGxvZGUnLFxuICAgICAgICBmbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZGVmYXVsdHMuZXF1aXBwZWQgPSAnZXhwbG9kZSc7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgbmFtZTogJ1BvaXNvbicsXG4gICAgICAgIGRlc2M6ICdJcyBkZWF0aCBldmVyIGJldHRlciB0aGFuIGhhcmRzaGlwPyBZZXMsIHdoZW4geW91IGdldCBhbiBhY2hpZXZlbWVudCBmb3IgaXQuIFByZXNzIHNwYWNlYmFyIHRvIGRpZSB3aXRoaW4gMzAgc2Vjb25kcy4nLFxuICAgICAgICBmbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZGVmYXVsdHMuZXF1aXBwZWQgPSAncG9pc29uJztcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBuYW1lOiAnJyxcbiAgICAgICAgZGVzYzogJycsXG4gICAgICAgIGZuOiBmdW5jdGlvbigpIHtcblxuICAgICAgICB9XG4gICAgfVxuXTtcblxudmFyIGFkZEl0ZW1CdXR0b25zID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpdGVtID0gaXRlbXNbaV07XG4gICAgICAgIGJ1dHRvbnMuYWRkQnV0dG9uKFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHg6IDEwMCArIChpICUgNCkgKiAxMjAsXG4gICAgICAgICAgICAgICAgeTogMTAwICsgTWF0aC5mbG9vcihpIC8gNCkgKiAxMjAsXG4gICAgICAgICAgICAgICAgd2lkdGg6IDEwMCxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDEwMFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdzdG9yZScsXG4gICAgICAgICAgICBpdGVtLmZuLFxuICAgICAgICAgICAgaXRlbS5uYW1lLFxuICAgICAgICAgICAgJzEycHQgVGVtcGVzdGEgRml2ZSdcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBidXR0b25zLmFkZEJ1dHRvbihcbiAgICAgICAge1xuICAgICAgICAgICAgeDogJ2NlbnRlcicsXG4gICAgICAgICAgICB5OiA0NzAsXG4gICAgICAgICAgICB3aWR0aDogMjAwLFxuICAgICAgICAgICAgaGVpZ2h0OiA1MFxuICAgICAgICB9LFxuICAgICAgICAnc3RvcmUnLFxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHdpbmRvdy5yZXNldEdhbWUoKTtcbiAgICAgICAgfSxcbiAgICAgICAgJ1BsYXknLFxuICAgICAgICAnMTRwdCBUZW1wZXN0YSBGaXZlJ1xuICAgICk7XG59O1xuXG5hZGRJdGVtQnV0dG9ucygpOyIsInZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnY2FudmFzJylbMF07XG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5tb2R1bGUuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uKHRleHQsIHgsIHksIHByZUZ1bmMsIHN0cm9rZSl7XG4gICAgY3R4LnNhdmUoKTtcbiAgICBpZiAocHJlRnVuYykge1xuICAgICAgICBwcmVGdW5jKGN0eCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgY3R4LmZvbnQgPSAnMTJwdCBUZW1wZXN0YSBGaXZlJztcbiAgICB9XG5cbiAgICB2YXIgeFBvcyA9IHg7XG4gICAgaWYgKHggPT09ICdjZW50ZXInKSB7XG4gICAgICAgIHhQb3MgPSAoY2FudmFzLndpZHRoIC0gY3R4Lm1lYXN1cmVUZXh0KHRleHQpLndpZHRoKSAvIDI7XG4gICAgfVxuXG4gICAgaWYgKHN0cm9rZSkge1xuICAgICAgICBjdHguc3Ryb2tlVGV4dCh0ZXh0LCB4UG9zLCB5KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGN0eC5maWxsVGV4dCh0ZXh0LCB4UG9zLCB5KTtcbiAgICB9XG4gICAgY3R4LnJlc3RvcmUoKTtcbn07IiwiLy8gdWZvcy5qc1xuLy8gVGhpcyBmaWxlIGRlZmluZXMgYmVoYXZpb3IgZm9yIGFsbCB0aGUgdW5pZGVudGlmaWVkIGZseWluZyBvYmplY3RzXG4vLyBJIGd1ZXNzIHRoZXkgKmFyZSogaWRlbnRpZmllZCwgdGVjaG5pY2FsbHkuXG4vLyBCdXQgdWZvcy5qcyBpcyBjb29sZXIgdGhhbiBpZm9zLmpzXG4vLyBBc3Rlcm9pZHMgYW5kIGhlYWx0aCAvIGZ1ZWwgcGlja3VwcyBjb3VudCBhcyBVRk9zXG5cbnZhciBmbHlpbmdPYmplY3RzID0gW107XG5cbnZhciBsb2FkZXIgPSByZXF1aXJlKCcuL2xvYWRlci5qcycpO1xuXG52YXIgcm5kID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCk7XG59O1xudmFyIGNob29zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcmd1bWVudHNbTWF0aC5mbG9vcihybmQoKSAqIGFyZ3VtZW50cy5sZW5ndGgpXTtcbn07XG5cbnZhciBTUEFXTl9SQU5HRSA9IDEwMDtcbnZhciBNSU5fU1BFRUQgPSAwLjMsIE1BWF9TUEVFRCA9IDI7XG52YXIgV0lEVEggPSA4MDAsIEhFSUdIVCA9IDYwMDtcblxudmFyIHNwYXduID0gZnVuY3Rpb24obikge1xuICAgIC8vIGNvbnNvbGUubG9nKCdTcGF3bmVkIGZseWluZ09iamVjdHM6Jywgbik7XG4gICAgdmFyIG9iaiwgdGFyZ2V0WSwgdGFyZ2V0WDtcbiAgICB2YXIgc2lnblgsIHNpZ25ZLCBwb3NYLCBwb3NZO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIG9iaiA9IHtcbiAgICAgICAgICAgIHg6IChybmQoKSAqIFdJRFRIKSxcbiAgICAgICAgICAgIHk6IChybmQoKSAqIEhFSUdIVCksXG4gICAgICAgICAgICBzcGVlZDogcm5kKCkgKiAoTUFYX1NQRUVEIC0gTUlOX1NQRUVEKSArIE1JTl9TUEVFRCxcbiAgICAgICAgICAgIGltYWdlOiBjaG9vc2UuYXBwbHkodGhpcywgbG9hZGVyLmdldCgncm9jaycpLmNvbmNhdChsb2FkZXIuZ2V0KCdwb3dlci1pY29uJykpKSxcbiAgICAgICAgICAgIGFsaXZlOiB0cnVlXG4gICAgICAgIH07XG4gICAgICAgIHRhcmdldFkgPSBybmQoKSAqIFdJRFRIO1xuICAgICAgICB0YXJnZXRYID0gcm5kKCkgKiBIRUlHSFQ7XG4gICAgICAgIG9iai5hbmdsZSA9IHJuZCgpICogTWF0aC5QSSAqIDI7XG4gICAgICAgIG9iai5nb29kID0gb2JqLmltYWdlLmluZGV4T2YoJ3JvY2snKSA+PSAwID8gZmFsc2UgOiB0cnVlO1xuICAgICAgICBvYmoud2lkdGggPSBsb2FkZXIuaW1hZ2VzW29iai5pbWFnZV0ud2lkdGg7XG4gICAgICAgIG9iai5oZWlnaHQgPSBsb2FkZXIuaW1hZ2VzW29iai5pbWFnZV0uaGVpZ2h0O1xuICAgICAgICBvYmouZHggPSBNYXRoLmNvcyhvYmouYW5nbGUpICogb2JqLnNwZWVkO1xuICAgICAgICBvYmouZHkgPSBNYXRoLnNpbihvYmouYW5nbGUpICogb2JqLnNwZWVkO1xuXG4gICAgICAgIGlmICghb2JqLmdvb2QpIHtcbiAgICAgICAgICAgIG9iai5jb2xvciA9IG9iai5pbWFnZS5pbmRleE9mKCdhbHQnKSA8IDAgPyAnIzUyNEM0QycgOiAnI2E3ODI1OCc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocm5kKCkgPiAwLjUpIHtcbiAgICAgICAgICAgIG9iai54ICs9IGNob29zZSgtMSwgMSkgKiAoV0lEVEggKyBvYmoud2lkdGgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgb2JqLnkgKz0gY2hvb3NlKC0xLCAxKSAqIChIRUlHSFQgKyBvYmouaGVpZ2h0KTtcbiAgICAgICAgfVxuICAgICAgICBmbHlpbmdPYmplY3RzLnB1c2gob2JqKTtcbiAgICB9XG59O1xuXG52YXIgbG9vcCA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCwgb2Zmc2V0WCwgb2Zmc2V0WSkge1xuICAgIHZhciBvYmo7XG4gICAgZm9yICh2YXIgaSA9IGZseWluZ09iamVjdHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgb2JqID0gZmx5aW5nT2JqZWN0c1tpXTtcbiAgICAgICAgaWYgKG9iai5hbGl2ZSkge1xuICAgICAgICAgICAgb2JqLnggKz0gNjYuNiAqIGVsYXBzZWQgKiAob2JqLmR4IC0gb2Zmc2V0WCk7XG4gICAgICAgICAgICBvYmoueSArPSA2Ni42ICogZWxhcHNlZCAqIChvYmouZHkgLSBvZmZzZXRZKTtcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAncmVkJztcbiAgICAgICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1tvYmouaW1hZ2VdLCBvYmoueCwgb2JqLnkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZmx5aW5nT2JqZWN0cy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxvb3A6IGxvb3AsXG4gICAgYXJyYXk6IGZseWluZ09iamVjdHMsXG4gICAgc3Bhd246IHNwYXduLFxuICAgIHJlc2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgZmx5aW5nT2JqZWN0cy5sZW5ndGggPSAwO1xuICAgIH1cbn07IiwiLy8gVGhpcyBmaWxlIGV4cG9ydHMgYSBmdW5jdGlvbiB0aGF0IGxldHMgeW91IG1ha2UgaW1hZ2VzIFwiZmxhc2hcIiBtb21lbnRhcmlseS4gTGlrZSB0aGUgcGxheWVyIHdoZW4gaGUgZ2V0cyBoaXQgYnkgYW4gYXN0ZXJvaWRcbnZhciBsb2FkZXIgPSByZXF1aXJlKCcuL2xvYWRlcicpO1xudmFyIGltYWdlcyA9IGxvYWRlci5pbWFnZXM7XG5cbnZhciBjYWNoZSA9IHt9O1xudmFyIHdoaXRlbiA9IGZ1bmN0aW9uKGltZ05hbWUsIGNvbG9yKSB7XG4gICAgaWYgKCFjb2xvcikge1xuICAgICAgICBjb2xvciA9ICd3aGl0ZSc7XG4gICAgfVxuICAgIGlmIChjYWNoZVtpbWdOYW1lICsgJy4nICsgY29sb3JdKSB7XG4gICAgICAgIHJldHVybiBjYWNoZVtpbWdOYW1lICsgJy4nICsgY29sb3JdO1xuICAgIH1cbiAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgdmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgIHZhciBpbWcgPSBpbWFnZXNbaW1nTmFtZV07XG5cbiAgICBjYW52YXMud2lkdGggPSBpbWcud2lkdGg7XG4gICAgY2FudmFzLmhlaWdodCA9IGltZy5oZWlnaHQ7XG4gICAgY3R4LmRyYXdJbWFnZShpbWcsIDAsIDAsIGltZy53aWR0aCwgaW1nLmhlaWdodCk7XG4gICAgY3R4Lmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9ICdzb3VyY2UtYXRvcCc7XG4gICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xuICAgIGN0eC5maWxsUmVjdCgwLCAwLCBpbWcud2lkdGgsIGltZy5oZWlnaHQpO1xuICAgIGNhY2hlW2ltZ05hbWUgKyAnLicgKyBjb2xvcl0gPSBjYW52YXM7XG4gICAgcmV0dXJuIGNhbnZhcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gd2hpdGVuOyJdfQ==
