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
                particles.createParticles(player.x + player.width / 2, player.y + player.height / 2, 10, 1 / player.propRange, 10, ['blue', 'red'], {
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
            menus.ingame(ctx, player.fuel, player.health, player.money);

            player.money += 0.01;

            if (player.health <= 0) {
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
    if (!player.invincible) {
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
                player.money += player.moneyMultiplier * (fo.width * fo.height) / 1000;
                explodeObj(fo);
                shake(2);
            }
        });
    }

    if (player.equipped === 'explode') {
        player.equipped = null;
        justExploded = true;

        shake(10);
        for (var i = 0; i < fos.length; i++) {
            fo = fos[i];
            if (fo.image !== 'power-icon.png') {
                fo.alive = false;
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
        player.equip();
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
player.equipped = null;

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
player.equip = function() {
    // Enable the equippable item
    player.equipped = 'explode';
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
        name: 'Rainbow',
        desc: '',
        fn: function() {

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
            player.equipped = 'invincibility';
        }
    },
    {
        name: 'Panic explode',
        desc: 'Press spacebar to make all asteroids on screen explode',
        fn: function() {
            player.equipped = 'explode';
        }
    },
    {
        name: 'Poison',
        desc: 'Is death ever better than hardship? Yes, when you get an achievement for it. Press spacebar to die within 30 seconds.',
        fn: function() {
            player.equipped = 'poison';
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
},{"./loader.js":6}],15:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4vc3JjL21haW4iLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9hdWRpby5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL2J1dHRvbnMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9jb2xsaXNpb25zLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMva2V5cy5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL2xvYWRlci5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL21lbnVzLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvcGFydGljbGVzLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvcGxheWVyLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvcmFmLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvc2NyZWVuc2hha2UuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9zdG9yZS5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL3RleHQuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy91Zm9zLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvd2hpdGVuLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBsb2FkZXIgPSByZXF1aXJlKCcuL2xvYWRlci5qcycpO1xuXG52YXIgcmFmID0gcmVxdWlyZSgnLi9yYWYnKTtcbnZhciBwbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpO1xudmFyIGtleSA9IHJlcXVpcmUoJy4va2V5cycpO1xudmFyIHBhcnRpY2xlcyA9IHJlcXVpcmUoJy4vcGFydGljbGVzJyk7XG52YXIgZmx5aW5nT2JqZWN0cyA9IHJlcXVpcmUoJy4vdWZvcycpO1xudmFyIGNvbGxpc2lvbnMgPSByZXF1aXJlKCcuL2NvbGxpc2lvbnMnKTtcbnZhciBtZW51cyA9IHJlcXVpcmUoJy4vbWVudXMnKTtcbnZhciBidXR0b25zID0gcmVxdWlyZSgnLi9idXR0b25zJyk7XG52YXIgYXVkaW8gPSByZXF1aXJlKCcuL2F1ZGlvJyk7XG52YXIgc3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlJyk7XG5cbnZhciBjYW52YXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZ2FtZScpO1xudmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG52YXIgc2Z4ID0gWydjb2xsZWN0JywgJ2NvbGxpZGUnLCAnZXhwbG9kZV9tZXRlb3InLCAnamV0cGFjayddO1xubG9hZGVyLmRvbmUoZnVuY3Rpb24oKSB7XG4gICAgYXVkaW8ubXV0ZSgpOyAvLyBCZWNhdXNlIEkgZG9uJ3Qgd2FudCBpdCBhdXRvcGxheWluZyB3aGlsZSBJIGRldmVsb3AgaXQhXG5cbiAgICB3aW5kb3cuc3RhdGUgPSAnbWVudSc7XG4gICAgcmFmLnN0YXJ0KGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICAgICAgaWYgKHdpbmRvdy5zdGF0ZSA9PT0gJ21lbnUnKSB7XG4gICAgICAgICAgICBtZW51cy5kcmF3TWVudShjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHdpbmRvdy5zdGF0ZSA9PT0gJ2dhbWUnKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZ3Jhdml0eShlbGFwc2VkKTtcbiAgICAgICAgICAgIGlmIChrZXkudXAoKSAmJiBwbGF5ZXIuZnVlbCA+IDApIHtcbiAgICAgICAgICAgICAgICBhdWRpby5wbGF5KCdqZXRwYWNrJyk7XG4gICAgICAgICAgICAgICAgcGxheWVyLnVwKGVsYXBzZWQpO1xuICAgICAgICAgICAgICAgIHBhcnRpY2xlcy5jcmVhdGVQYXJ0aWNsZXMocGxheWVyLnggKyBwbGF5ZXIud2lkdGggLyAyLCBwbGF5ZXIueSArIHBsYXllci5oZWlnaHQgLyAyLCAxMCwgMSAvIHBsYXllci5wcm9wUmFuZ2UsIDEwLCBbJ2JsdWUnLCAncmVkJ10sIHtcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IE1hdGguUEkgLyAxMFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhdWRpby5wYXVzZSgnamV0cGFjaycpO1xuICAgICAgICAgICAgICAgIHBsYXllci5tb3ZlKGVsYXBzZWQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoa2V5LnJpZ2h0KCkpIHtcbiAgICAgICAgICAgICAgICBwbGF5ZXIucmlnaHQoZWxhcHNlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoa2V5LmxlZnQoKSkge1xuICAgICAgICAgICAgICAgIHBsYXllci5sZWZ0KGVsYXBzZWQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUaGlzIGZ1bmN0aW9uIGNoZWNrcyBmb3IgYWxsIHJlcXVpcmVkIGNvbGxpc2lvbnMsIGFuZCBjYWxscyB0aGUgY29ycmVzcG9uZGluZyBmdW5jdGlvbnMgYWZ0ZXIgdG9vXG4gICAgICAgICAgICBjb2xsaXNpb25zLmNoZWNrKHBsYXllciwgZmx5aW5nT2JqZWN0cyk7XG5cbiAgICAgICAgICAgIC8vIENsZWFyIHRoZSBzY3JlZW5cbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzBmMGQyMCc7XG4gICAgICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgODAwLCA2MDApO1xuXG4gICAgICAgICAgICBwYXJ0aWNsZXMuZHJhdyhlbGFwc2VkLCBjdHgsIHBsYXllcik7XG4gICAgICAgICAgICBmbHlpbmdPYmplY3RzLmxvb3AoZWxhcHNlZCwgY3R4LCBwbGF5ZXIub2Zmc2V0WCwgcGxheWVyLm9mZnNldFkpO1xuICAgICAgICAgICAgcGxheWVyLmRyYXcoZWxhcHNlZCwgY3R4KTtcbiAgICAgICAgICAgIG1lbnVzLmluZ2FtZShjdHgsIHBsYXllci5mdWVsLCBwbGF5ZXIuaGVhbHRoLCBwbGF5ZXIubW9uZXkpO1xuXG4gICAgICAgICAgICBwbGF5ZXIubW9uZXkgKz0gMC4wMTtcblxuICAgICAgICAgICAgaWYgKHBsYXllci5oZWFsdGggPD0gMCkge1xuICAgICAgICAgICAgICAgIHBsYXllci50b3RhbE1vbmV5ICs9IE1hdGgucm91bmQocGxheWVyLm1vbmV5KTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuc3RhdGUgPSAnZW5kJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh3aW5kb3cuc3RhdGUgPT09ICdlbmQnKSB7XG4gICAgICAgICAgICBhdWRpby5wYXVzZShzZngpO1xuICAgICAgICAgICAgbWVudXMuZHJhd0VuZChjdHgsIHBsYXllci5tb25leSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZih3aW5kb3cuc3RhdGUgPT09ICdzdG9yZScpIHtcbiAgICAgICAgICAgIG1lbnVzLmRyYXdTdG9yZShjdHgsIHBsYXllci50b3RhbE1vbmV5KTtcbiAgICAgICAgfVxuICAgICAgICBidXR0b25zLmRyYXdBbGwoKTtcbiAgICB9KTtcbn0pO1xuXG53aW5kb3cucmVzZXRHYW1lID0gZnVuY3Rpb24oKSB7XG4gICAgd2luZG93LnN0YXRlID0gJ2dhbWUnO1xuICAgIHBsYXllci5yZXNldCgpO1xuICAgIHBhcnRpY2xlcy5yZXNldCgpO1xuICAgIGZseWluZ09iamVjdHMucmVzZXQoKTtcbn07XG5cbnZhciBjaGFuZ2VTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh3aW5kb3cuc3RhdGUgPT09ICdtZW51Jykge1xuICAgICAgICB3aW5kb3cuc3RhdGUgPSAnZ2FtZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHdpbmRvdy5zdGF0ZSA9PT0gJ2VuZCcpIHtcbiAgICAgICAgd2luZG93LnJlc2V0R2FtZSgpO1xuICAgIH1cbn07XG5cbi8vIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGNoYW5nZVN0YXRlLCBmYWxzZSk7XG5kb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbihlKSB7XG4gICAgaWYgKGUua2V5Q29kZSA9PT0gMTMpIHtcbiAgICAgICAgY2hhbmdlU3RhdGUoKTtcbiAgICB9XG59LCBmYWxzZSk7XG4iLCJ2YXIgYXVkaW8gPSB3aW5kb3cuYXVkaW8gPSB7fTsgLy8gTWFkZSBpdCBhIGdsb2JhbCBzbyBJIGNhbiBlYXNpbHkgdGVzdFxudmFyIGVsZW1lbnRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnYXVkaW8nKTtcbnZhciBGQURFX1NQRUVEID0gMC4xO1xuXG5hdWRpby5tdXRlID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZWxlbWVudHNbaV0udm9sdW1lID0gMDtcbiAgICB9XG59O1xuYXVkaW8uc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGVsZW1lbnRzW2ldLnBhdXNlKCk7XG4gICAgfVxufTtcblxuYXVkaW8ucGxheSA9IGZ1bmN0aW9uIChuYW1lLCBzZWVrRnJvbSkge1xuICAgIHZhciBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobmFtZSk7XG4gICAgZWxlbS5jdXJyZW50VGltZSA9IHNlZWtGcm9tIHx8IDA7XG4gICAgZWxlbS5wbGF5KCk7XG59O1xuYXVkaW8ucGF1c2UgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdmFyIG5hbWVzID0gW25hbWVdO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgbmFtZXMgPSBuYW1lO1xuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobmFtZXNbaV0pO1xuICAgICAgICBlbGVtLnBhdXNlKCk7XG4gICAgfVxuICAgIFxufTtcblxuYXVkaW8uZmFkZW91dCA9IGZ1bmN0aW9uIChuYW1lLCBzZWVrRnJvbSwgY2IpIHtcbiAgICB2YXIgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG5hbWUpO1xuICAgIHZhciB2b2x1bWUgPSBlbGVtLnZvbHVtZTtcbiAgICB2YXIgZGVjcmVhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZvbHVtZSAtPSBGQURFX1NQRUVEO1xuICAgICAgICBjb25zb2xlLmxvZyh2b2x1bWUpO1xuICAgICAgICBpZiAodm9sdW1lIDw9IDApIHtcbiAgICAgICAgICAgIGVsZW0udm9sdW1lID0gMDtcbiAgICAgICAgICAgIGVsZW0ucGF1c2UoKTtcbiAgICAgICAgICAgIGNiICYmIGNiKGVsZW0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZWxlbS52b2x1bWUgPSB2b2x1bWU7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGRlY3JlYXNlLCAxMDAvMyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGRlY3JlYXNlKCk7XG59XG5hdWRpby5mYWRlaW4gPSBmdW5jdGlvbiAobmFtZSwgc2Vla0Zyb20sIGNiKSB7XG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChuYW1lKTtcbiAgICB2YXIgdm9sdW1lID0gZWxlbS52b2x1bWUgPSAwO1xuICAgIGVsZW0ucGxheSgpO1xuICAgIHZhciBpbmNyZWFzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdm9sdW1lICs9IEZBREVfU1BFRUQ7XG4gICAgICAgIGlmICh2b2x1bWUgPj0gMSkge1xuICAgICAgICAgICAgZWxlbS52b2x1bWUgPSAxO1xuICAgICAgICAgICAgY2IgJiYgY2IoZWxlbSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlbGVtLnZvbHVtZSA9IHZvbHVtZTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoaW5jcmVhc2UsIDEwMC8zKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgaW5jcmVhc2UoKTtcbn1cbm1vZHVsZS5leHBvcnRzID0gYXVkaW87IiwiLy8gTWFrZXMgaXQgZWFzaWVyIHRvIG1ha2UgbWVudSBidXR0b25zXG52YXIgYnV0dG9ucyA9IFtdO1xuXG52YXIgY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2dhbWUnKTtcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxudmFyIGRyYXdCdXR0b24gPSBmdW5jdGlvbihidXR0b24pIHtcbiAgICBpZiAoYnV0dG9uLmltZykge1xuICAgICAgICBjdHguZHJhd0ltYWdlKGJ1dHRvbi54LCBidXR0b24ueSwgYnV0dG9uLndpZHRoLCBidXR0b24uaGVpZ2h0KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9ICd3aGl0ZSc7XG4gICAgICAgIGN0eC5zdHJva2VSZWN0KGJ1dHRvbi54LCBidXR0b24ueSwgYnV0dG9uLndpZHRoLCBidXR0b24uaGVpZ2h0KTtcbiAgICB9XG4gICAgaWYgKGJ1dHRvbi50ZXh0KSB7XG5cbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG4gICAgICAgIGN0eC5mb250ID0gYnV0dG9uLmZvbnQ7XG4gICAgICAgIHZhciB0ZXh0RGltID0gY3R4Lm1lYXN1cmVUZXh0KGJ1dHRvbi50ZXh0KTtcbiAgICAgICAgY3R4LmZpbGxUZXh0KGJ1dHRvbi50ZXh0LCBidXR0b24ueCArIChidXR0b24ud2lkdGggLSB0ZXh0RGltLndpZHRoKSAvIDIsIGJ1dHRvbi55ICsgKGJ1dHRvbi5oZWlnaHQgKyAxMCkgLyAyKTtcbiAgICB9XG59O1xuXG4vLyBkaW0gPSBkaW1lbnNpb25zID0ge3gsIHksIHdpZHRoLCBoZWlnaHR9LFxuLy8gc2NyZWVuU3RhdGU7IHdoZXJlIHRoZSBidXR0b24gaXMgdmlzaWJsZVxuLy8gdGV4dCB0byB3cml0ZSBvbiBidXR0b24sXG4vLyBpbWcgdG8gcHV0IGJlaGluZCB0ZXh0IChpZiB1bmRlZmluZWQsIGl0J2xsIGRyYXcgYSB3aGl0ZSBib3JkZXIgYXJvdW5kIHRoZSBidXR0b24gYXJlYSlcbnZhciBhZGRCdXR0b24gPSBmdW5jdGlvbihkaW0sIHNjcmVlblN0YXRlLCBvbmNsaWNrLCB0ZXh0LCBmb250LCBpbWcpIHtcbiAgICB2YXIgYnV0dG9uID0ge307XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhkaW0pO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBidXR0b25ba2V5c1tpXV0gPSBkaW1ba2V5c1tpXV07XG4gICAgfVxuICAgIGlmIChidXR0b24ueCA9PT0gJ2NlbnRlcicpIHtcbiAgICAgICAgYnV0dG9uLnggPSAoY2FudmFzLndpZHRoIC0gYnV0dG9uLndpZHRoKSAvIDI7XG4gICAgfVxuICAgIGlmIChidXR0b24ueSA9PT0gJ2NlbnRlcicpIHtcbiAgICAgICAgYnV0dG9uLnkgPSAoY2FudmFzLmhlaWdodCAtIGJ1dHRvbi5oZWlnaHQpIC8gMjtcbiAgICB9XG4gICAgYnV0dG9uLnNjcmVlblN0YXRlID0gc2NyZWVuU3RhdGUgfHwgJ21lbnUnO1xuICAgIGJ1dHRvbi5vbmNsaWNrID0gb25jbGljaztcbiAgICBidXR0b24udGV4dCA9IHRleHQgfHwgJyc7XG4gICAgYnV0dG9uLmZvbnQgPSBmb250IHx8ICcxMnB0IFRlbXBlc3RhIEZpdmUnO1xuICAgIGJ1dHRvbi5pbWcgPSBpbWc7XG4gICAgYnV0dG9ucy5wdXNoKGJ1dHRvbik7XG59O1xuXG52YXIgZHJhd0FsbCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBidXR0b247XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBidXR0b25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGJ1dHRvbiA9IGJ1dHRvbnNbaV07XG4gICAgICAgIGlmICh3aW5kb3cuc3RhdGUgPT09IGJ1dHRvbi5zY3JlZW5TdGF0ZSkge1xuICAgICAgICAgICAgZHJhd0J1dHRvbihidXR0b24pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZHJhd0FsbDogZHJhd0FsbCxcbiAgICBhZGRCdXR0b246IGFkZEJ1dHRvblxufTtcblxudmFyIGNoZWNrQ2xpY2sgPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIHggPSBlLnBhZ2VYIC0gY2FudmFzLm9mZnNldExlZnQ7XG4gICAgdmFyIHkgPSBlLnBhZ2VZIC0gY2FudmFzLm9mZnNldFRvcDtcbiAgICB2YXIgYnV0dG9uO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnV0dG9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICBidXR0b24gPSBidXR0b25zW2ldO1xuICAgICAgICBpZiAoeCA+PSBidXR0b24ueCAmJiB4IDw9IGJ1dHRvbi54ICsgYnV0dG9uLndpZHRoICYmXG4gICAgICAgICAgICB5ID49IGJ1dHRvbi55ICYmIHkgPD0gYnV0dG9uLnkgKyBidXR0b24uaGVpZ2h0ICYmXG4gICAgICAgICAgICB3aW5kb3cuc3RhdGUgPT09IGJ1dHRvbi5zY3JlZW5TdGF0ZSkge1xuICAgICAgICAgICAgYnV0dG9uLm9uY2xpY2soKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxufTtcbmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGNoZWNrQ2xpY2ssIGZhbHNlKTsiLCJ2YXIgcGFydGljbGVzTW9kdWxlID0gcmVxdWlyZSgnLi9wYXJ0aWNsZXMnKTtcbnZhciBzaGFrZSA9IHJlcXVpcmUoJy4vc2NyZWVuc2hha2UnKTtcblxudmFyIHBsYXllckhpdEJveCA9IHtcbiAgICB4OiAzNzUsXG4gICAgeTogMjcwLFxuICAgIHdpZHRoOiA1MCxcbiAgICBoZWlnaHQ6IDYwXG59O1xudmFyIGFuZ2xlZENvbGxpc2lvbiA9IGZ1bmN0aW9uKHBsYXllciwgZm8pIHtcbiAgICB2YXIgY29sbGlkaW5nID0gZmFsc2U7XG4gICAgY29sbGlkaW5nID0gYWFiYihwbGF5ZXJIaXRCb3gsIGZvKTtcbiAgICByZXR1cm4gY29sbGlkaW5nO1xufTtcblxudmFyIGFhYmIgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgaWYgKFxuICAgICAgICBNYXRoLmFicyhhLnggKyBhLndpZHRoIC8gMiAtIGIueCAtIGIud2lkdGggLyAyKSA+IChhLndpZHRoICsgYi53aWR0aCkgLyAyIHx8XG4gICAgICAgIE1hdGguYWJzKGEueSArIGEuaGVpZ2h0IC8gMiAtIGIueSAtIGIuaGVpZ2h0IC8gMikgPiAoYS5oZWlnaHQgKyBiLmhlaWdodCkgLyAyXG4gICAgKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG52YXIgaW5BcmVhID0gZnVuY3Rpb24oYXJlYSwgYXJyYXksIHJlc3BDb2xsaWRpbmcsIHJlc3BOb3RDb2xsaWRpbmcpIHtcbiAgICB2YXIgcmV0ID0gW107XG4gICAgdmFyIGN1ckVsZW07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjdXJFbGVtID0gYXJyYXlbaV07XG4gICAgICAgIGlmIChhYWJiKGFyZWEsIGN1ckVsZW0pKSB7XG4gICAgICAgICAgICByZXQucHVzaChjdXJFbGVtKTtcbiAgICAgICAgICAgIGlmIChyZXNwQ29sbGlkaW5nKSB7XG4gICAgICAgICAgICAgICAgcmVzcENvbGxpZGluZyhjdXJFbGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChyZXNwTm90Q29sbGlkaW5nKSB7XG4gICAgICAgICAgICByZXNwTm90Q29sbGlkaW5nKGN1ckVsZW0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59O1xuXG52YXIgcGxheWVyQXJlYSA9IHtcbiAgICB4OiAzMjUsXG4gICAgeTogMjI1LFxuICAgIHdpZHRoOiAxNTAsXG4gICAgaGVpZ2h0OiAxNTBcbn07XG5cbnZhciBjYW1lcmEgPSB7XG4gICAgeDogLTQwMCxcbiAgICB5OiAtMzAwLFxuICAgIHdpZHRoOiAxNjAwLFxuICAgIGhlaWdodDogMTIwMFxufTtcblxudmFyIGV4cGxvZGVPYmogPSBmdW5jdGlvbihmbykge1xuICAgIHBhcnRpY2xlc01vZHVsZS5jcmVhdGVQYXJ0aWNsZXMoZm8ueCwgZm8ueSwgZm8uc3BlZWQsIDAuMDEsIGZvLndpZHRoICogZm8uaGVpZ2h0IC8gMTAwLCBbZm8uY29sb3JdLCB7XG4gICAgICAgIHJhbmdlOiBNYXRoLnJhbmRvbSgpICogMiAqIE1hdGguUEksXG4gICAgICAgIG5vQ29sbGlkZTogdHJ1ZSxcbiAgICAgICAgZHg6IGZvLmR4LFxuICAgICAgICBkeTogZm8uZHlcbiAgICB9KTtcbn07XG5cbnZhciBqdXN0RXhwbG9kZWQgPSBmYWxzZTtcbnZhciB0aWNrcyA9IDA7XG52YXIgY2hlY2sgPSBmdW5jdGlvbihwbGF5ZXIsIGZvTW9kdWxlKSB7XG4gICAgLy8gZm8gc3RhbmRzIGZvciBmbHlpbmdPYmplY3RzXG4gICAgdmFyIHBhcnRpY2xlcyA9IHBhcnRpY2xlc01vZHVsZS5hcnJheTtcbiAgICB2YXIgZm9zID0gZm9Nb2R1bGUuYXJyYXk7XG4gICAgLy8gTWFuYWdlIGZseWluZyBvYmplY3Qgc3Bhd25pbmdcbiAgICB2YXIgZm9JblZpZXcgPSBpbkFyZWEoY2FtZXJhLCBmb3MsIHVuZGVmaW5lZCwgZnVuY3Rpb24oZm8pIHtcbiAgICAgICAgZm8uYWxpdmUgPSBmYWxzZTtcbiAgICB9KTtcbiAgICBpZiAoZm9JblZpZXcubGVuZ3RoIDwgMzAgJiYganVzdEV4cGxvZGVkICE9PSB0cnVlKSB7XG4gICAgICAgIGZvTW9kdWxlLnNwYXduKE1hdGgucmFuZG9tKCkgKiAxMDApO1xuICAgIH1cbiAgICBlbHNlIGlmIChqdXN0RXhwbG9kZWQgPT09IHRydWUpIHtcbiAgICAgICAgdGlja3MrKztcbiAgICAgICAgaWYgKHRpY2tzID49IDE1MCkge1xuICAgICAgICAgICAgdGlja3MgPSAwO1xuICAgICAgICAgICAganVzdEV4cGxvZGVkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDb2xsaXNpb25zIGJldHdlZW4gdGhlIHBsYXllciBhbmQgcm9ja3NcbiAgICB2YXIgZm9Ub1Rlc3QgPSBpbkFyZWEocGxheWVyQXJlYSwgZm9zKTtcbiAgICB2YXIgZm87XG4gICAgaWYgKCFwbGF5ZXIuaW52aW5jaWJsZSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZvVG9UZXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBmbyA9IGZvVG9UZXN0W2ldO1xuICAgICAgICAgICAgaWYgKGFuZ2xlZENvbGxpc2lvbihwbGF5ZXIsIGZvKSkge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdISVQnKTtcbiAgICAgICAgICAgICAgICBmby5hbGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGlmIChmby5pbWFnZSA9PT0gJ3Bvd2VyLWljb24ucG5nJykge1xuICAgICAgICAgICAgICAgICAgICBhdWRpby5wbGF5KCdjb2xsZWN0Jyk7XG4gICAgICAgICAgICAgICAgICAgIHBsYXllci5mdWVsICs9IDEwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYXVkaW8ucGxheSgnY29sbGlkZScpO1xuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuaGl0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcGxheWVyLmhlYWx0aCAtPSAoZm8ud2lkdGggKiBmby5oZWlnaHQpIC8gMTAwO1xuICAgICAgICAgICAgICAgICAgICBleHBsb2RlT2JqKGZvKTtcbiAgICAgICAgICAgICAgICAgICAgc2hha2UoNSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGNvbGxpc2lvbnMgYmV0d2VlbiBwYXJ0aWNsZXMgYW5kIGZvXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0aWNsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHBhcnRpY2xlc1tpXS5ub0NvbGxpZGUpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGluQXJlYShwYXJ0aWNsZXNbaV0sIGZvcywgZnVuY3Rpb24oZm8pIHtcbiAgICAgICAgICAgIGlmIChwYXJ0aWNsZXNbaV0uYWxpdmUgJiYgIWZvLmdvb2QpIHtcbiAgICAgICAgICAgICAgICBmby5hbGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGF1ZGlvLnBsYXkoJ2V4cGxvZGVfbWV0ZW9yJyk7XG4gICAgICAgICAgICAgICAgcGxheWVyLm1vbmV5ICs9IHBsYXllci5tb25leU11bHRpcGxpZXIgKiAoZm8ud2lkdGggKiBmby5oZWlnaHQpIC8gMTAwMDtcbiAgICAgICAgICAgICAgICBleHBsb2RlT2JqKGZvKTtcbiAgICAgICAgICAgICAgICBzaGFrZSgyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHBsYXllci5lcXVpcHBlZCA9PT0gJ2V4cGxvZGUnKSB7XG4gICAgICAgIHBsYXllci5lcXVpcHBlZCA9IG51bGw7XG4gICAgICAgIGp1c3RFeHBsb2RlZCA9IHRydWU7XG5cbiAgICAgICAgc2hha2UoMTApO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZvcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZm8gPSBmb3NbaV07XG4gICAgICAgICAgICBpZiAoZm8uaW1hZ2UgIT09ICdwb3dlci1pY29uLnBuZycpIHtcbiAgICAgICAgICAgICAgICBmby5hbGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGV4cGxvZGVPYmooZm8pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY2hlY2s6IGNoZWNrXG59OyIsInZhciBwbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpO1xudmFyIGtleXMgPSB7fTtcbnZhciBDID0ge1xuICAgIFNQQUNFOiAzMixcbiAgICBMRUZUOiAzNyxcbiAgICBVUDogMzgsXG4gICAgUklHSFQ6IDM5LFxuICAgIERPV046IDQwXG59XG5kb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbihlKSB7XG4gICAgaWYgKGUua2V5Q29kZSA9PT0gQy5TUEFDRSkge1xuICAgICAgICBwbGF5ZXIuZXF1aXAoKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cbiAgICBlbHNlIGlmIChlLmtleUNvZGUgPj0gMzcgJiYgZS5rZXlDb2RlIDw9IDQwKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG4gICAga2V5c1tlLmtleUNvZGVdID0gdHJ1ZTtcbn0pO1xuZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0aW9uKGUpIHtcbiAgICBrZXlzW2Uua2V5Q29kZV0gPSBmYWxzZTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBsZWZ0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbQy5MRUZUXTtcbiAgICB9LFxuICAgIHVwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbQy5VUF07XG4gICAgfSxcbiAgICByaWdodDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzW0MuUklHSFRdO1xuICAgIH0sXG4gICAgZG93bjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzW0MuRE9XTl07XG4gICAgfVxufTtcbiIsInZhciBpbWFnZU5hbWVzID0gW1xuICAgICdhc3Ryby5wbmcnLFxuICAgICdhc3Ryby1mbHlpbmcucG5nJyxcbiAgICAnaGVhbHRoLWJhci1pY29uLnBuZycsXG4gICAgJ2xvZ28ucG5nJyxcbiAgICAncG93ZXItYmFyLWljb24ucG5nJyxcbiAgICAncG93ZXItaWNvbi5wbmcnLFxuICAgICdyb2NrLTUucG5nJyxcbiAgICAncm9jay1hbHQtNS5wbmcnLFxuICAgICdyb2NrLW9kZC0xLnBuZycsXG4gICAgJ3JvY2stb2RkLTMucG5nJ1xuXTtcblxudmFyIGltYWdlcyA9IHt9O1xudmFyIGxvYWRlZCA9IDA7XG52YXIgZG9uZSA9IGZ1bmN0aW9uKGNiKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbWFnZU5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGltYWdlc1tpbWFnZU5hbWVzW2ldXSA9IG5ldyBJbWFnZSgpO1xuICAgICAgICBpbWFnZXNbaW1hZ2VOYW1lc1tpXV0uc3JjID0gJ2ltYWdlcy8nICsgaW1hZ2VOYW1lc1tpXTtcbiAgICAgICAgaW1hZ2VzW2ltYWdlTmFtZXNbaV1dLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgbG9hZGVkKys7XG4gICAgICAgICAgICBpZiAobG9hZGVkID09PSBpbWFnZU5hbWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNiKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBsaXN0OiBpbWFnZU5hbWVzLFxuICAgIGltYWdlczogaW1hZ2VzLFxuICAgIGRvbmU6IGRvbmUsXG4gICAgZ2V0OiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgaW1hZ2VOYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKGltYWdlTmFtZXNbaV0uaW5kZXhPZihzdHJpbmcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHJldC5wdXNoKGltYWdlTmFtZXNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxufTsiLCJ2YXIgbG9hZGVyID0gcmVxdWlyZSgnLi9sb2FkZXInKTtcbnZhciB0ZXh0ID0gcmVxdWlyZSgnLi90ZXh0Jyk7XG52YXIgYnV0dG9ucyA9IHJlcXVpcmUoJy4vYnV0dG9ucycpO1xuXG5idXR0b25zLmFkZEJ1dHRvbihcbiAgICB7XG4gICAgICAgIHg6ICdjZW50ZXInLFxuICAgICAgICB5OiAzMDAsXG4gICAgICAgIHdpZHRoOiAyMDAsXG4gICAgICAgIGhlaWdodDogNTBcbiAgICB9LFxuICAgICdtZW51JyxcbiAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgd2luZG93LnN0YXRlID0gJ2dhbWUnO1xuICAgIH0sXG4gICAgJ0NsaWNrIHRvIHBsYXknLFxuICAgICcxMnB0IFRlbXBlc3RhIEZpdmUnXG4pO1xuXG5cbmJ1dHRvbnMuYWRkQnV0dG9uKFxuICAgIHtcbiAgICAgICAgeDogMjAwLFxuICAgICAgICB5OiA0MDAsXG4gICAgICAgIHdpZHRoOiAyMDAsXG4gICAgICAgIGhlaWdodDogNTBcbiAgICB9LFxuICAgICdlbmQnLFxuICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICB3aW5kb3cucmVzZXRHYW1lKCk7XG4gICAgfSxcbiAgICAnUGxheSBhZ2FpbicsXG4gICAgJzEycHQgVGVtcGVzdGEgRml2ZSdcbik7XG5idXR0b25zLmFkZEJ1dHRvbihcbiAgICB7XG4gICAgICAgIHg6IDQ1MCxcbiAgICAgICAgeTogNDAwLFxuICAgICAgICB3aWR0aDogMjAwLFxuICAgICAgICBoZWlnaHQ6IDUwXG4gICAgfSxcbiAgICAnZW5kJyxcbiAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgd2luZG93LnN0YXRlID0gJ3N0b3JlJztcbiAgICB9LFxuICAgICdTdG9yZScsXG4gICAgJzEycHQgVGVtcGVzdGEgRml2ZSdcbik7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGRyYXdNZW51OiBmdW5jdGlvbihjdHgpIHtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICcjMGYwZDIwJztcbiAgICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIDgwMCwgNjAwKTtcblxuICAgICAgICBjdHguZHJhd0ltYWdlKGxvYWRlci5pbWFnZXNbJ2xvZ28ucG5nJ10sIDMxNCwgMTgwKTtcbiAgICAgICAgdGV4dC53cml0ZSgnQSBHQU1FIEJZJywgJ2NlbnRlcicsIDUwMCk7XG4gICAgICAgIHRleHQud3JpdGUoJ0BBTUFBTkMgQU5EIEBNSUtFRElEVEhJUycsICdjZW50ZXInLCA1MjAsIGZ1bmN0aW9uKGN0eCkge1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICcjRENGQ0Y5JztcbiAgICAgICAgICAgIGN0eC5mb250ID0gJzEycHQgVGVtcGVzdGEgRml2ZSc7XG4gICAgICAgIH0pO1xuXG4gICAgfSxcbiAgICBkcmF3RW5kOiBmdW5jdGlvbihjdHgsIG1vbmV5KSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzBmMGQyMCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCA4MDAsIDYwMCk7XG4gICAgICAgIHRleHQud3JpdGUoJ1lvdSBlYXJuZWQgQSQnICsgTWF0aC5yb3VuZChtb25leSkgKyAnLicsICdjZW50ZXInLCAzMDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG4gICAgICAgICAgICBjdHguZm9udCA9ICcyNnB0IFRlbXBlc3RhIEZpdmUnO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGluZ2FtZTogZnVuY3Rpb24oY3R4LCBmdWVsLCBoZWFsdGgsIG1vbmV5KSB7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1sncG93ZXItYmFyLWljb24ucG5nJ10sIDMwLCA1MDApO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ29yYW5nZSc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgzMCwgNDkwIC0gZnVlbCwgMjAsIGZ1ZWwpO1xuXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1snaGVhbHRoLWJhci1pY29uLnBuZyddLCA3MCwgNTAwKTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICdyZWQnO1xuICAgICAgICBjdHguZmlsbFJlY3QoNzAsIDQ5MCAtIGhlYWx0aCwgMjAsIGhlYWx0aCk7XG5cbiAgICAgICAgdGV4dC53cml0ZSgnQSQ6ICcgKyBNYXRoLnJvdW5kKG1vbmV5KSwgMzAsIDU1MCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjdHguZm9udCA9ICcxMnB0IFRlbXBlc3RhIEZpdmUnO1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgZHJhd1N0b3JlOiBmdW5jdGlvbihjdHgsIHRvdGFsTW9uZXkpIHtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICcjMGYwZDIwJztcbiAgICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIDgwMCwgNjAwKTtcbiAgICAgICAgdGV4dC53cml0ZSgnU1RPUkUnLCAzMCwgNTAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY3R4LmZvbnQgPSAnMTZwdCBUZW1wZXN0YSBGaXZlJztcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC53cml0ZSgnQWx0YXJpYW4gRG9sbGFyczogJyArIHRvdGFsTW9uZXksIDIwMCwgNTAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY3R4LmZvbnQgPSAnMTZwdCBUZW1wZXN0YSBGaXZlJztcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuICAgICAgICB9KTtcbiAgICB9XG59OyIsInZhciBwYXJ0aWNsZXMgPSBbXTtcbnZhciBXID0gNywgSCA9IDc7XG52YXIgREVDX1JBVEUgPSAwLjE7IC8vIERlZmF1bHQgZGVjcmVhc2UgcmF0ZS4gSGlnaGVyIHJhdGUgLT4gcGFydGljbGVzIGdvIGZhc3RlclxudmFyIFBhcnRpY2xlID0gZnVuY3Rpb24oeCwgeSwgc3BlZWQsIGRlY1JhdGUsIGNvbG9ycykge1xuICAgIHRoaXMuYWxpdmUgPSB0cnVlO1xuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgICB0aGlzLmR4ID0gdGhpcy5keSA9IDA7XG4gICAgdGhpcy53aWR0aCA9IFc7XG4gICAgdGhpcy5oZWlnaHQgPSBIO1xuICAgIHRoaXMuYW5nbGUgPSAwO1xuICAgIHRoaXMuc3BlZWQgPSBzcGVlZDtcbiAgICB0aGlzLm9wYWNpdHkgPSAxO1xuICAgIHRoaXMuZGVjUmF0ZSA9IGRlY1JhdGUgfHwgREVDX1JBVEU7XG4gICAgdGhpcy5kZWxheSA9IE1hdGguY2VpbChNYXRoLnJhbmRvbSgpICogMTApO1xuICAgIGlmIChjb2xvcnMpIHtcbiAgICAgICAgdGhpcy5jb2xvciA9IGNvbG9yc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjb2xvcnMubGVuZ3RoKV07XG4gICAgfVxuICAgIHRoaXMubG9vcCA9IGZ1bmN0aW9uKGN0eCwgcGxheWVyKSB7XG4gICAgICAgIGlmICh0aGlzLmRlbGF5ID4gMCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGVsYXkgPD0gMSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYW5nbGUgPSBwbGF5ZXIuYW5nbGUgLSB0aGlzLnJhbmdlICsgKE1hdGgucmFuZG9tKCkgKiAyICogdGhpcy5yYW5nZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmRlbGF5LS07XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy54ICs9IHRoaXMuZHggLSB3aW5kb3cucGxheWVyLm9mZnNldFggKyBNYXRoLnNpbigtdGhpcy5hbmdsZSkgKiBzcGVlZDtcbiAgICAgICAgdGhpcy55ICs9IHRoaXMuZHkgLSB3aW5kb3cucGxheWVyLm9mZnNldFkgKyBNYXRoLmNvcygtdGhpcy5hbmdsZSkgKiBzcGVlZDtcbiAgICAgICAgdGhpcy5vcGFjaXR5IC09IHRoaXMuZGVjUmF0ZTtcbiAgICAgICAgaWYgKHRoaXMub3BhY2l0eSA8PSAwKSB7XG4gICAgICAgICAgICB0aGlzLm9wYWNpdHkgPSAwO1xuICAgICAgICAgICAgdGhpcy5hbGl2ZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vIERyYXdcbiAgICAgICAgY3R4LnNhdmUoKTtcbiAgICAgICAgY3R4Lmdsb2JhbEFscGhhID0gdGhpcy5vcGFjaXR5O1xuICAgICAgICBjdHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gJ2xpZ2h0ZXInO1xuICAgICAgICBjdHgudHJhbnNsYXRlKHRoaXMueCwgdGhpcy55KTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuY29sb3IgfHwgJ3JlZCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCBXLCBIKTtcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICB9O1xufTtcblxuLy8geCwgeSBhcmUgZml4ZWRcbi8vIFBhcnRpY2xlcyBhcmUgY3JlYXRlZCBmcm9tIGFuZ2xlLXJhbmdlIHRvIGFuZ2xlK3JhbmdlXG4vLyBzcGVlZCBpcyBmaXhlZFxudmFyIGFuZ2xlID0gMDtcbnZhciBjcmVhdGVQYXJ0aWNsZXMgPSBmdW5jdGlvbih4LCB5LCBzcGVlZCwgZGVjUmF0ZSwgbiwgY29sb3JzLCBwcm9wcykge1xuICAgIC8vIGNvbnNvbGUubG9nKCdDcmVhdGluZycsIHBhcnRpY2xlcyk7XG4gICAgdmFyIGNyZWF0ZWQgPSAwLCBpID0gMDtcbiAgICB2YXIgcGFydGljbGU7XG4gICAgd2hpbGUoY3JlYXRlZCA8IG4pIHtcbiAgICAgICAgcGFydGljbGUgPSBwYXJ0aWNsZXNbaV07XG4gICAgICAgIGlmIChwYXJ0aWNsZSAmJiAhcGFydGljbGUuYWxpdmUgfHwgIXBhcnRpY2xlKSB7XG4gICAgICAgICAgICBwYXJ0aWNsZXNbaV0gPSBuZXcgUGFydGljbGUoeCwgeSwgc3BlZWQsIGRlY1JhdGUsIGNvbG9ycyk7XG4gICAgICAgICAgICBjcmVhdGVkKys7XG4gICAgICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHByb3BzKTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwga2V5cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHBhcnRpY2xlc1tpXVtrZXlzW2pdXSA9IHByb3BzW2tleXNbal1dO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUG9zc2libGUgcHJvcHM6IHJhbmdlLCBub0NvbGxpZGUsIGR4LCBkeSwgY29sb3JcbiAgICAgICAgfVxuICAgICAgICBpKys7XG4gICAgfVxufTtcblxudmFyIGRyYXcgPSBmdW5jdGlvbihlbGFwc2VkLCBjdHgsIHBsYXllcikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydGljbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHBhcnRpY2xlc1tpXS5sb29wKGN0eCwgcGxheWVyKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjcmVhdGVQYXJ0aWNsZXM6IGNyZWF0ZVBhcnRpY2xlcyxcbiAgICBkcmF3OiBkcmF3LFxuICAgIGFycmF5OiBwYXJ0aWNsZXMsXG4gICAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBwYXJ0aWNsZXMubGVuZ3RoID0gMDtcbiAgICB9XG59O1xuIiwidmFyIHdoaXRlbiA9IHJlcXVpcmUoJy4vd2hpdGVuJyk7XG52YXIgY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2dhbWUnKTtcblxud2luZG93LnBsYXllciA9IHt9O1xuXG5wbGF5ZXIuaWRsZSA9IG5ldyBJbWFnZSgpO1xucGxheWVyLmlkbGUuc3JjID0gJ2ltYWdlcy9hc3Ryby5wbmcnO1xucGxheWVyLmlkbGUubmFtZSA9ICdhc3Ryby5wbmcnO1xucGxheWVyLmZseWluZyA9IG5ldyBJbWFnZSgpO1xucGxheWVyLmZseWluZy5zcmMgPSAnaW1hZ2VzL2FzdHJvLWZseWluZy5wbmcnO1xucGxheWVyLmZseWluZy5uYW1lID0gJ2FzdHJvLWZseWluZy5wbmcnO1xucGxheWVyLnN0YXRlID0gJ2lkbGUnO1xuXG5wbGF5ZXIuZGVmYXVsdHMgPSB7XG4gICAgbW9uZXk6IDAsXG4gICAgYW5nbGU6IDAsXG4gICAgb2Zmc2V0WTogMCxcbiAgICBvZmZzZXRYOiAwLFxuICAgIGhlYWx0aDogMTAsXG4gICAgZnVlbDogMTAsXG4gICAgaGl0OiBmYWxzZSxcbiAgICBwcm9wUmFuZ2U6IDguMyxcbiAgICBtb25leU11bHRpcGxpZXI6IDFcbn07XG5cbnBsYXllci53aWR0aCA9IDUyO1xucGxheWVyLmhlaWdodCA9IDYwO1xucGxheWVyLnggPSAoY2FudmFzLndpZHRoIC0gcGxheWVyLndpZHRoKSAvIDI7XG5wbGF5ZXIueSA9IChjYW52YXMuaGVpZ2h0IC0gcGxheWVyLmhlaWdodCkgLyAyO1xucGxheWVyLmFuZ2xlID0gMDtcbnBsYXllci50b3RhbE1vbmV5ID0gcGxheWVyLm1vbmV5ID0gMDtcbnBsYXllci5lcXVpcHBlZCA9IG51bGw7XG5cbnBsYXllci5vZmZzZXRYID0gcGxheWVyLm9mZnNldFkgPSAwO1xuXG5cbi8vIEhhbGYgd2lkdGgsIGhhbGYgaGVpZ2h0XG52YXIgaFcgPSBwbGF5ZXIud2lkdGggLyAyO1xudmFyIGhIID0gcGxheWVyLmhlaWdodCAvIDI7XG5cbnZhciBzcGVlZCA9IDA7IC8vIFRoZSBjdXJyZW50IHNwZWVkXG52YXIgZFNwZWVkO1xudmFyIGRYID0gMCwgZFkgPSAwO1xuXG4vLyBZT1UgQ0FOIENPTkZJR1VSRSBUSEVTRSEgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbnZhciBhY2MgPSA3OyAvLyBBY2NlbGVyYXRpb25cbnZhciBsaW0gPSAxMDsgLy8gU3BlZWQgbGltaXRcbnZhciB0dXJuU3BlZWQgPSAyLjI7XG52YXIgZ3JhdiA9IDAuMDM7XG4vLyBOTyBNT1JFIENPTkZJR1VSSU5HISAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXG5cbnBsYXllci5yZXNldCA9IGZ1bmN0aW9uKCkge1xuICAgIGRYID0gZFkgPSBzcGVlZCA9IGRTcGVlZCA9IDA7XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhwbGF5ZXIuZGVmYXVsdHMpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBwbGF5ZXJba2V5c1tpXV0gPSBwbGF5ZXIuZGVmYXVsdHNba2V5c1tpXV07XG4gICAgfVxuICAgIHBsYXllci5tb3ZlKCk7XG59O1xucGxheWVyLmdyYXZpdHkgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgZFkgLT0gZ3Jhdjtcbn07XG5wbGF5ZXIubW92ZSA9IGZ1bmN0aW9uKGVsYXBzZWQsIGZseWluZykge1xuICAgIHBsYXllci5vZmZzZXRYID0gZFg7XG4gICAgcGxheWVyLm9mZnNldFkgPSAtZFk7XG4gICAgZFggKj0gMC45OTtcbiAgICBkWSAqPSAwLjk5O1xuXG4gICAgaWYgKCFmbHlpbmcpIHtcbiAgICAgICAgcGxheWVyLnN0YXRlID0gJ2lkbGUnO1xuICAgIH1cbn07XG5wbGF5ZXIudXAgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgcGxheWVyLmZ1ZWwgLT0gMC4yO1xuICAgIHBsYXllci5zdGF0ZSA9ICdmbHlpbmcnO1xuICAgIHNwZWVkICs9IGFjYztcbiAgICBkU3BlZWQgPSBlbGFwc2VkICogc3BlZWQ7XG4gICAgLy8gY29uc29sZS5sb2cocGxheWVyLngsIHBsYXllci55KTtcbiAgICAvLyBjb25zb2xlLmxvZyhNYXRoLnNpbihwbGF5ZXIuYW5nbGUpICogZFNwZWVkLCBNYXRoLmNvcyhwbGF5ZXIuYW5nbGUpICogZFNwZWVkKTtcbiAgICBkWCArPSBNYXRoLnNpbihwbGF5ZXIuYW5nbGUpICogZFNwZWVkO1xuICAgIGRZICs9IE1hdGguY29zKHBsYXllci5hbmdsZSkgKiBkU3BlZWQ7XG4gICAgcGxheWVyLm1vdmUoZWxhcHNlZCwgdHJ1ZSk7XG4gICAgaWYgKHNwZWVkID4gbGltKSB7XG4gICAgICAgIHNwZWVkID0gbGltO1xuICAgIH1cbiAgICBlbHNlIGlmIChzcGVlZCA8IC1saW0pIHtcbiAgICAgICAgc3BlZWQgPSAtbGltO1xuICAgIH1cblxufTtcbnBsYXllci5yaWdodCA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBwbGF5ZXIuYW5nbGUgKz0gZWxhcHNlZCAqIHR1cm5TcGVlZCAqIE1hdGguUEk7XG59O1xucGxheWVyLmxlZnQgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgcGxheWVyLmFuZ2xlIC09IGVsYXBzZWQgKiB0dXJuU3BlZWQgKiBNYXRoLlBJO1xufTtcbnBsYXllci5mbGlwID0gZnVuY3Rpb24oKSB7XG4gICAgcGxheWVyLmFuZ2xlICs9IE1hdGguUEk7XG59O1xucGxheWVyLmVxdWlwID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gRW5hYmxlIHRoZSBlcXVpcHBhYmxlIGl0ZW1cbiAgICBwbGF5ZXIuZXF1aXBwZWQgPSAnZXhwbG9kZSc7XG59O1xuXG5cbnZhciB0aWNrcyA9IDA7XG5wbGF5ZXIuZHJhdyA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCkge1xuICAgIC8vIFBsYXllclxuICAgIGN0eC5zYXZlKCk7XG4gICAgY3R4LnRyYW5zbGF0ZShwbGF5ZXIueCArIGhXLCBwbGF5ZXIueSArIGhIKTtcbiAgICBjdHgucm90YXRlKHBsYXllci5hbmdsZSk7XG4gICAgLy8gcGxheWVyLmhpdCBpcyBzZXQgaW4gY29sbGlzaW9ucy5qc1xuICAgIC8vIElmIHRoZSBwbGF5ZXIncyBiZWVuIGhpdCwgd2Ugd2FudCBpdCB0byBmbGFzaCB3aGl0ZSB0byBpbmRpY2F0ZSB0aGF0XG4gICAgaWYgKHBsYXllci5oaXQpIHtcbiAgICAgICAgY3R4LmRyYXdJbWFnZSh3aGl0ZW4ocGxheWVyW3BsYXllci5zdGF0ZV0ubmFtZSwgJ3BpbmsnKSwgLWhXLCAtaEgpO1xuICAgICAgICB0aWNrcysrO1xuICAgICAgICBpZiAodGlja3MgPj0gOCkge1xuICAgICAgICAgICAgcGxheWVyLmhpdCA9IGZhbHNlO1xuICAgICAgICAgICAgdGlja3MgPSAwO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjdHguZHJhd0ltYWdlKHBsYXllcltwbGF5ZXIuc3RhdGVdLCAtaFcsIC1oSCk7XG4gICAgfVxuICAgIGN0eC5yZXN0b3JlKCk7XG5cbn07XG5cbnBsYXllci5yZXNldCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBsYXllcjtcbiIsIi8vIEhvbGRzIGxhc3QgaXRlcmF0aW9uIHRpbWVzdGFtcC5cbnZhciB0aW1lID0gMDtcblxuLyoqXG4gKiBDYWxscyBgZm5gIG9uIG5leHQgZnJhbWUuXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuIFRoZSBmdW5jdGlvblxuICogQHJldHVybiB7aW50fSBUaGUgcmVxdWVzdCBJRFxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIHJhZihmbikge1xuICByZXR1cm4gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgICB2YXIgZWxhcHNlZCA9IG5vdyAtIHRpbWU7XG5cbiAgICBpZiAoZWxhcHNlZCA+IDk5OSkge1xuICAgICAgZWxhcHNlZCA9IDEgLyA2MDtcbiAgICB9IGVsc2Uge1xuICAgICAgZWxhcHNlZCAvPSAxMDAwO1xuICAgIH1cblxuICAgIHRpbWUgPSBub3c7XG4gICAgZm4oZWxhcHNlZCk7XG4gIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgLyoqXG4gICAqIENhbGxzIGBmbmAgb24gZXZlcnkgZnJhbWUgd2l0aCBgZWxhcHNlZGAgc2V0IHRvIHRoZSBlbGFwc2VkXG4gICAqIHRpbWUgaW4gbWlsbGlzZWNvbmRzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm4gVGhlIGZ1bmN0aW9uXG4gICAqIEByZXR1cm4ge2ludH0gVGhlIHJlcXVlc3QgSURcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHN0YXJ0OiBmdW5jdGlvbihmbikge1xuICAgIHJldHVybiByYWYoZnVuY3Rpb24gdGljayhlbGFwc2VkKSB7XG4gICAgICBmbihlbGFwc2VkKTtcbiAgICAgIHJhZih0aWNrKTtcbiAgICB9KTtcbiAgfSxcbiAgLyoqXG4gICAqIENhbmNlbHMgdGhlIHNwZWNpZmllZCBhbmltYXRpb24gZnJhbWUgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHtpbnR9IGlkIFRoZSByZXF1ZXN0IElEXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzdG9wOiBmdW5jdGlvbihpZCkge1xuICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZShpZCk7XG4gIH1cbn07XG4iLCJ2YXIgY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2dhbWUnKTtcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxudmFyIHBvbGFyaXR5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgPiAwLjUgPyAxIDogLTE7XG59O1xuXG4vLyBBbW91bnQgd2UndmUgbW92ZWQgc28gZmFyXG52YXIgdG90YWxYID0gMDtcbnZhciB0b3RhbFkgPSAwO1xuXG52YXIgc2hha2UgPSBmdW5jdGlvbihpbnRlbnNpdHkpIHtcbiAgICBpZiAodG90YWxYID09PSAwKSB7XG4gICAgICAgIGN0eC5zYXZlKCk7XG4gICAgfVxuICAgIGlmICghaW50ZW5zaXR5KSB7XG4gICAgICAgIGludGVuc2l0eSA9IDI7XG4gICAgfVxuICAgIHZhciBkWCA9IE1hdGgucmFuZG9tKCkgKiBpbnRlbnNpdHkgKiBwb2xhcml0eSgpO1xuICAgIHZhciBkWSA9IE1hdGgucmFuZG9tKCkgKiBpbnRlbnNpdHkgKiBwb2xhcml0eSgpO1xuICAgIHRvdGFsWCArPSBkWDtcbiAgICB0b3RhbFkgKz0gZFk7XG5cbiAgICAvLyBCcmluZyB0aGUgc2NyZWVuIGJhY2sgdG8gaXRzIHVzdWFsIHBvc2l0aW9uIGV2ZXJ5IFwiMiBpbnRlbnNpdHlcIiBzbyBhcyBub3QgdG8gZ2V0IHRvbyBmYXIgYXdheSBmcm9tIHRoZSBjZW50ZXJcbiAgICBpZiAoaW50ZW5zaXR5ICUgMiA8IDAuMikge1xuICAgICAgICBjdHgudHJhbnNsYXRlKC10b3RhbFgsIC10b3RhbFkpO1xuICAgICAgICB0b3RhbFggPSB0b3RhbFkgPSAwO1xuICAgICAgICBpZiAoaW50ZW5zaXR5IDw9IDAuMTUpIHtcbiAgICAgICAgICAgIGN0eC5yZXN0b3JlKCk7IC8vIEp1c3QgdG8gbWFrZSBzdXJlIGl0IGdvZXMgYmFjayB0byBub3JtYWxcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGN0eC50cmFuc2xhdGUoZFgsIGRZKTtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBzaGFrZShpbnRlbnNpdHkgLSAwLjEpO1xuICAgIH0sIDUpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzaGFrZTsiLCJ2YXIgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcbnZhciBidXR0b25zID0gcmVxdWlyZSgnLi9idXR0b25zJyk7XG5cbnZhciBpdGVtcyA9IFtcbiAgICB7XG4gICAgICAgIG5hbWU6ICdIZWFsdGgnLFxuICAgICAgICBkZXNjOiAnSW5jcmVhc2VzIGhlYWx0aCBieSAxMCcsXG4gICAgICAgIGZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBsYXllci5kZWZhdWx0cy5oZWFsdGggKz0gMTA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgbmFtZTogJ0Z1ZWwnLFxuICAgICAgICBkZXNjOiAnSW5jcmVhc2VzIGZ1ZWwgYnkgMTAnLFxuICAgICAgICBmbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZGVmYXVsdHMuZnVlbCArPSAxMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBuYW1lOiAnUmFpbmJvdycsXG4gICAgICAgIGRlc2M6ICcnLFxuICAgICAgICBmbjogZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBuYW1lOiAnR29sZCBTdWl0JyxcbiAgICAgICAgZGVzYzogJycsXG4gICAgICAgIGZuOiBmdW5jdGlvbigpIHtcblxuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIG5hbWU6ICdFZmZpY2llbmN5JyxcbiAgICAgICAgZGVzYzogJ0luY3JlYXNlcyBlZmZpY2llbmN5IG9mIG1pbmluZyByb2NrcyBzbyB5b3UgZ2V0IG1vcmUgQWx0YXJpYW4gRG9sbGFycyBwZXIgYXN0ZXJvaWQnLFxuICAgICAgICBmbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZGVmYXVsdHMubW9uZXlNdWx0aXBsaWVyICs9IDAuMTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBuYW1lOiAnSW5kaWNhdG9ycycsXG4gICAgICAgIGRlc2M6ICdGaW5kIHNoaXQgbW9yZSBlYXNpbHkuIEluZGljYXRvcnMgYXJvdW5kIHRoZSBzY3JlZW4gd2lsbCBzaG93IHlvdSB3aGVyZSBvYmplY3RzIGxpa2UgWFlaIGFyZScsXG4gICAgICAgIGZuOiBmdW5jdGlvbigpIHtcblxuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIG5hbWU6ICdSYW5nZScsXG4gICAgICAgIGRlc2M6ICdUaGUgcHJvcHVsc2lvbiBwYXJ0aWNsZXMgZ28gZnVydGhlciBhd2F5LCBtYWtpbmcgaXQgZWFzaWVyIHRvIGRlc3Ryb3kgcm9ja3MnLFxuICAgICAgICBmbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZGVmYXVsdHMucHJvcFJhbmdlICs9IDE7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgbmFtZTogJ0F1dG8tc2hpZWxkJyxcbiAgICAgICAgZGVzYzogJ0Egc2hpZWxkIHByb3RlY3RzIHlvdSBmcm9tIG9uZSBoaXQgaW4gZXZlcnkgZ2FtZSBhdXRvbWF0aWNhbGx5JyxcbiAgICAgICAgZm46IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgbmFtZTogJ0ludmluY2liaWxpdHknLFxuICAgICAgICBkZXNjOiAnUHJlc3Mgc3BhY2ViYXIgdG8gYmVjb21lIGludmluY2libGUgdG8gYWxsIGFzdGVyb2lkcywgc28geW91IGNhbiBiZSBhcyBjYXJlbGVzcyBhcyB5b3Ugd2FudCBmb3IgMzAgc2Vjb25kcycsXG4gICAgICAgIGZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBsYXllci5lcXVpcHBlZCA9ICdpbnZpbmNpYmlsaXR5JztcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBuYW1lOiAnUGFuaWMgZXhwbG9kZScsXG4gICAgICAgIGRlc2M6ICdQcmVzcyBzcGFjZWJhciB0byBtYWtlIGFsbCBhc3Rlcm9pZHMgb24gc2NyZWVuIGV4cGxvZGUnLFxuICAgICAgICBmbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZXF1aXBwZWQgPSAnZXhwbG9kZSc7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgbmFtZTogJ1BvaXNvbicsXG4gICAgICAgIGRlc2M6ICdJcyBkZWF0aCBldmVyIGJldHRlciB0aGFuIGhhcmRzaGlwPyBZZXMsIHdoZW4geW91IGdldCBhbiBhY2hpZXZlbWVudCBmb3IgaXQuIFByZXNzIHNwYWNlYmFyIHRvIGRpZSB3aXRoaW4gMzAgc2Vjb25kcy4nLFxuICAgICAgICBmbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZXF1aXBwZWQgPSAncG9pc29uJztcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBuYW1lOiAnJyxcbiAgICAgICAgZGVzYzogJycsXG4gICAgICAgIGZuOiBmdW5jdGlvbigpIHtcblxuICAgICAgICB9XG4gICAgfVxuXTtcblxudmFyIGFkZEl0ZW1CdXR0b25zID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpdGVtID0gaXRlbXNbaV07XG4gICAgICAgIGJ1dHRvbnMuYWRkQnV0dG9uKFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHg6IDEwMCArIChpICUgNCkgKiAxMjAsXG4gICAgICAgICAgICAgICAgeTogMTAwICsgTWF0aC5mbG9vcihpIC8gNCkgKiAxMjAsXG4gICAgICAgICAgICAgICAgd2lkdGg6IDEwMCxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDEwMFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdzdG9yZScsXG4gICAgICAgICAgICBpdGVtLmZuLFxuICAgICAgICAgICAgaXRlbS5uYW1lLFxuICAgICAgICAgICAgJzEycHQgVGVtcGVzdGEgRml2ZSdcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBidXR0b25zLmFkZEJ1dHRvbihcbiAgICAgICAge1xuICAgICAgICAgICAgeDogJ2NlbnRlcicsXG4gICAgICAgICAgICB5OiA0NzAsXG4gICAgICAgICAgICB3aWR0aDogMjAwLFxuICAgICAgICAgICAgaGVpZ2h0OiA1MFxuICAgICAgICB9LFxuICAgICAgICAnc3RvcmUnLFxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHdpbmRvdy5yZXNldEdhbWUoKTtcbiAgICAgICAgfSxcbiAgICAgICAgJ1BsYXknLFxuICAgICAgICAnMTRwdCBUZW1wZXN0YSBGaXZlJ1xuICAgICk7XG59O1xuXG5hZGRJdGVtQnV0dG9ucygpOyIsInZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnY2FudmFzJylbMF07XG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5tb2R1bGUuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uKHRleHQsIHgsIHksIHByZUZ1bmMsIHN0cm9rZSl7XG4gICAgY3R4LnNhdmUoKTtcbiAgICBpZiAocHJlRnVuYykge1xuICAgICAgICBwcmVGdW5jKGN0eCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgY3R4LmZvbnQgPSAnMTJwdCBUZW1wZXN0YSBGaXZlJztcbiAgICB9XG5cbiAgICB2YXIgeFBvcyA9IHg7XG4gICAgaWYgKHggPT09ICdjZW50ZXInKSB7XG4gICAgICAgIHhQb3MgPSAoY2FudmFzLndpZHRoIC0gY3R4Lm1lYXN1cmVUZXh0KHRleHQpLndpZHRoKSAvIDI7XG4gICAgfVxuXG4gICAgaWYgKHN0cm9rZSkge1xuICAgICAgICBjdHguc3Ryb2tlVGV4dCh0ZXh0LCB4UG9zLCB5KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGN0eC5maWxsVGV4dCh0ZXh0LCB4UG9zLCB5KTtcbiAgICB9XG4gICAgY3R4LnJlc3RvcmUoKTtcbn07IiwiLy8gdWZvcy5qc1xuLy8gVGhpcyBmaWxlIGRlZmluZXMgYmVoYXZpb3IgZm9yIGFsbCB0aGUgdW5pZGVudGlmaWVkIGZseWluZyBvYmplY3RzXG4vLyBJIGd1ZXNzIHRoZXkgKmFyZSogaWRlbnRpZmllZCwgdGVjaG5pY2FsbHkuXG4vLyBCdXQgdWZvcy5qcyBpcyBjb29sZXIgdGhhbiBpZm9zLmpzXG4vLyBBc3Rlcm9pZHMgYW5kIGhlYWx0aCAvIGZ1ZWwgcGlja3VwcyBjb3VudCBhcyBVRk9zXG5cbnZhciBmbHlpbmdPYmplY3RzID0gW107XG5cbnZhciBsb2FkZXIgPSByZXF1aXJlKCcuL2xvYWRlci5qcycpO1xuXG52YXIgcm5kID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCk7XG59O1xudmFyIGNob29zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcmd1bWVudHNbTWF0aC5mbG9vcihybmQoKSAqIGFyZ3VtZW50cy5sZW5ndGgpXTtcbn07XG5cbnZhciBTUEFXTl9SQU5HRSA9IDEwMDtcbnZhciBNSU5fU1BFRUQgPSAwLjMsIE1BWF9TUEVFRCA9IDI7XG52YXIgV0lEVEggPSA4MDAsIEhFSUdIVCA9IDYwMDtcblxudmFyIHNwYXduID0gZnVuY3Rpb24obikge1xuICAgIC8vIGNvbnNvbGUubG9nKCdTcGF3bmVkIGZseWluZ09iamVjdHM6Jywgbik7XG4gICAgdmFyIG9iaiwgdGFyZ2V0WSwgdGFyZ2V0WDtcbiAgICB2YXIgc2lnblgsIHNpZ25ZLCBwb3NYLCBwb3NZO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIG9iaiA9IHtcbiAgICAgICAgICAgIHg6IChybmQoKSAqIFdJRFRIKSxcbiAgICAgICAgICAgIHk6IChybmQoKSAqIEhFSUdIVCksXG4gICAgICAgICAgICBzcGVlZDogcm5kKCkgKiAoTUFYX1NQRUVEIC0gTUlOX1NQRUVEKSArIE1JTl9TUEVFRCxcbiAgICAgICAgICAgIGltYWdlOiBjaG9vc2UuYXBwbHkodGhpcywgbG9hZGVyLmdldCgncm9jaycpLmNvbmNhdChsb2FkZXIuZ2V0KCdwb3dlci1pY29uJykpKSxcbiAgICAgICAgICAgIGFsaXZlOiB0cnVlXG4gICAgICAgIH07XG4gICAgICAgIHRhcmdldFkgPSBybmQoKSAqIFdJRFRIO1xuICAgICAgICB0YXJnZXRYID0gcm5kKCkgKiBIRUlHSFQ7XG4gICAgICAgIG9iai5hbmdsZSA9IHJuZCgpICogTWF0aC5QSSAqIDI7XG4gICAgICAgIG9iai5nb29kID0gb2JqLmltYWdlLmluZGV4T2YoJ3JvY2snKSA+PSAwID8gZmFsc2UgOiB0cnVlO1xuICAgICAgICBvYmoud2lkdGggPSBsb2FkZXIuaW1hZ2VzW29iai5pbWFnZV0ud2lkdGg7XG4gICAgICAgIG9iai5oZWlnaHQgPSBsb2FkZXIuaW1hZ2VzW29iai5pbWFnZV0uaGVpZ2h0O1xuICAgICAgICBvYmouZHggPSBNYXRoLmNvcyhvYmouYW5nbGUpICogb2JqLnNwZWVkO1xuICAgICAgICBvYmouZHkgPSBNYXRoLnNpbihvYmouYW5nbGUpICogb2JqLnNwZWVkO1xuXG4gICAgICAgIGlmICghb2JqLmdvb2QpIHtcbiAgICAgICAgICAgIG9iai5jb2xvciA9IG9iai5pbWFnZS5pbmRleE9mKCdhbHQnKSA8IDAgPyAnIzUyNEM0QycgOiAnI2E3ODI1OCc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocm5kKCkgPiAwLjUpIHtcbiAgICAgICAgICAgIG9iai54ICs9IGNob29zZSgtMSwgMSkgKiAoV0lEVEggKyBvYmoud2lkdGgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgb2JqLnkgKz0gY2hvb3NlKC0xLCAxKSAqIChIRUlHSFQgKyBvYmouaGVpZ2h0KTtcbiAgICAgICAgfVxuICAgICAgICBmbHlpbmdPYmplY3RzLnB1c2gob2JqKTtcbiAgICB9XG59O1xuXG52YXIgbG9vcCA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCwgb2Zmc2V0WCwgb2Zmc2V0WSkge1xuICAgIHZhciBvYmo7XG4gICAgZm9yICh2YXIgaSA9IGZseWluZ09iamVjdHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgb2JqID0gZmx5aW5nT2JqZWN0c1tpXTtcbiAgICAgICAgaWYgKG9iai5hbGl2ZSkge1xuICAgICAgICAgICAgb2JqLnggKz0gb2JqLmR4IC0gb2Zmc2V0WDtcbiAgICAgICAgICAgIG9iai55ICs9IG9iai5keSAtIG9mZnNldFk7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JlZCc7XG4gICAgICAgICAgICBjdHguZHJhd0ltYWdlKGxvYWRlci5pbWFnZXNbb2JqLmltYWdlXSwgb2JqLngsIG9iai55KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGZseWluZ09iamVjdHMuc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBsb29wOiBsb29wLFxuICAgIGFycmF5OiBmbHlpbmdPYmplY3RzLFxuICAgIHNwYXduOiBzcGF3bixcbiAgICByZXNldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGZseWluZ09iamVjdHMubGVuZ3RoID0gMDtcbiAgICB9XG59OyIsIi8vIFRoaXMgZmlsZSBleHBvcnRzIGEgZnVuY3Rpb24gdGhhdCBsZXRzIHlvdSBtYWtlIGltYWdlcyBcImZsYXNoXCIgbW9tZW50YXJpbHkuIExpa2UgdGhlIHBsYXllciB3aGVuIGhlIGdldHMgaGl0IGJ5IGFuIGFzdGVyb2lkXG52YXIgbG9hZGVyID0gcmVxdWlyZSgnLi9sb2FkZXInKTtcbnZhciBpbWFnZXMgPSBsb2FkZXIuaW1hZ2VzO1xuXG52YXIgY2FjaGUgPSB7fTtcbnZhciB3aGl0ZW4gPSBmdW5jdGlvbihpbWdOYW1lLCBjb2xvcikge1xuICAgIGlmIChjYWNoZVtpbWdOYW1lXSkge1xuICAgICAgICByZXR1cm4gY2FjaGVbaW1nTmFtZV07XG4gICAgfVxuICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICB2YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgdmFyIGltZyA9IGltYWdlc1tpbWdOYW1lXTtcblxuICAgIGNhbnZhcy53aWR0aCA9IGltZy53aWR0aDtcbiAgICBjYW52YXMuaGVpZ2h0ID0gaW1nLmhlaWdodDtcbiAgICBjdHguZHJhd0ltYWdlKGltZywgMCwgMCwgaW1nLndpZHRoLCBpbWcuaGVpZ2h0KTtcbiAgICBjdHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gJ3NvdXJjZS1hdG9wJztcbiAgICBjdHguZmlsbFN0eWxlID0gY29sb3IgfHwgJ3doaXRlJztcbiAgICBjdHguZmlsbFJlY3QoMCwgMCwgaW1nLndpZHRoLCBpbWcuaGVpZ2h0KTtcbiAgICBjYWNoZVtpbWdOYW1lXSA9IGNhbnZhcztcbiAgICByZXR1cm4gY2FudmFzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB3aGl0ZW47Il19
