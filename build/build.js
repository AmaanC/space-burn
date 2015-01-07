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
                particles.createParticles(player.x + player.width / 2, player.y + player.height / 2, 10, player.propRange, 10, ['blue', 'red'], {
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
        else if(window.state === 'store') {
            menus.drawStore(ctx);
        }
        buttons.drawAll();
    });
});

window.resetGame = function() {
    window.state = 'game';
    player.score = 0;
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
        text.write('You earned A$' + Math.round(score) + '.', 'center', 300, function() {
            ctx.fillStyle = 'white';
            ctx.font = '26pt Tempesta Five';
        });
        text.write('Click to play again', 'center', 500, function() {
            ctx.fillStyle = 'white';
            ctx.font = '22pt Tempesta Five';
        });
    },
    ingame: function(ctx, fuel, health, score) {
        ctx.drawImage(loader.images['power-bar-icon.png'], 30, 500);
        ctx.fillStyle = 'orange';
        ctx.fillRect(30, 490 - fuel, 20, fuel);

        ctx.drawImage(loader.images['health-bar-icon.png'], 70, 500);
        ctx.fillStyle = 'red';
        ctx.fillRect(70, 490 - health, 20, health);

        text.write('A$: ' + Math.round(score), 30, 550, function() {
            ctx.font = '12pt Tempesta Five';
            ctx.fillStyle = 'white';
        });
    },
    drawStore: function(ctx) {
        ctx.fillStyle = '#0f0d20';
        ctx.fillRect(0, 0, 800, 600);
        text.write('STORE', 30, 50, function() {
            ctx.font = '12pt Tempesta Five';
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
    score: 0,
    angle: 0,
    offsetY: 0,
    offsetX: 0,
    health: 100,
    fuel: 100,
    hit: false,
    propRange: 0.12
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
            player.defaults.health += 10;
        }
    },
    {
        name: 'Health',
        desc: 'Increases health by 10',
        fn: function() {
            player.defaults.health = 1000;
        }
    },
    {
        name: 'Health',
        desc: 'Increases health by 10',
        fn: function() {
            player.defaults.health = 1000;
        }
    }
];

var addItemButtons = function() {
    var item;
    for (var i = 0; i < items.length; i++) {
        item = items[i];
        buttons.addButton(
            {
                x: 100 + (i % 3) * 130,
                y: 100 + Math.floor(i / 3) * 70,
                width: 100,
                height: 50
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
            y: 450,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4vc3JjL21haW4iLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9hdWRpby5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL2J1dHRvbnMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9jb2xsaXNpb25zLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMva2V5cy5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL2xvYWRlci5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL21lbnVzLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvcGFydGljbGVzLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvcGxheWVyLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvcmFmLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvc2NyZWVuc2hha2UuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy9zdG9yZS5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL1NwYWNlIEJ1cm4vc3JjL3RleHQuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9TcGFjZSBCdXJuL3NyYy91Zm9zLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvU3BhY2UgQnVybi9zcmMvd2hpdGVuLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgbG9hZGVyID0gcmVxdWlyZSgnLi9sb2FkZXIuanMnKTtcblxudmFyIHJhZiA9IHJlcXVpcmUoJy4vcmFmJyk7XG52YXIgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcbnZhciBrZXkgPSByZXF1aXJlKCcuL2tleXMnKTtcbnZhciBwYXJ0aWNsZXMgPSByZXF1aXJlKCcuL3BhcnRpY2xlcycpO1xudmFyIGZseWluZ09iamVjdHMgPSByZXF1aXJlKCcuL3Vmb3MnKTtcbnZhciBjb2xsaXNpb25zID0gcmVxdWlyZSgnLi9jb2xsaXNpb25zJyk7XG52YXIgbWVudXMgPSByZXF1aXJlKCcuL21lbnVzJyk7XG52YXIgYnV0dG9ucyA9IHJlcXVpcmUoJy4vYnV0dG9ucycpO1xudmFyIGF1ZGlvID0gcmVxdWlyZSgnLi9hdWRpbycpO1xudmFyIHN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZScpO1xuXG52YXIgY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2dhbWUnKTtcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxudmFyIHNmeCA9IFsnY29sbGVjdCcsICdjb2xsaWRlJywgJ2V4cGxvZGVfbWV0ZW9yJywgJ2pldHBhY2snXTtcbmxvYWRlci5kb25lKGZ1bmN0aW9uKCkge1xuICAgIGF1ZGlvLm11dGUoKTsgLy8gQmVjYXVzZSBJIGRvbid0IHdhbnQgaXQgYXV0b3BsYXlpbmcgd2hpbGUgSSBkZXZlbG9wIGl0IVxuXG4gICAgd2luZG93LnN0YXRlID0gJ21lbnUnO1xuICAgIHJhZi5zdGFydChmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgICAgIGlmICh3aW5kb3cuc3RhdGUgPT09ICdtZW51Jykge1xuICAgICAgICAgICAgbWVudXMuZHJhd01lbnUoY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh3aW5kb3cuc3RhdGUgPT09ICdnYW1lJykge1xuICAgICAgICAgICAgcGxheWVyLmdyYXZpdHkoZWxhcHNlZCk7XG4gICAgICAgICAgICBpZiAoa2V5LnVwKCkgJiYgcGxheWVyLmZ1ZWwgPiAwKSB7XG4gICAgICAgICAgICAgICAgYXVkaW8ucGxheSgnamV0cGFjaycpO1xuICAgICAgICAgICAgICAgIHBsYXllci51cChlbGFwc2VkKTtcbiAgICAgICAgICAgICAgICBwYXJ0aWNsZXMuY3JlYXRlUGFydGljbGVzKHBsYXllci54ICsgcGxheWVyLndpZHRoIC8gMiwgcGxheWVyLnkgKyBwbGF5ZXIuaGVpZ2h0IC8gMiwgMTAsIHBsYXllci5wcm9wUmFuZ2UsIDEwLCBbJ2JsdWUnLCAncmVkJ10sIHtcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IE1hdGguUEkgLyAxMFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhdWRpby5wYXVzZSgnamV0cGFjaycpO1xuICAgICAgICAgICAgICAgIHBsYXllci5tb3ZlKGVsYXBzZWQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoa2V5LnJpZ2h0KCkpIHtcbiAgICAgICAgICAgICAgICBwbGF5ZXIucmlnaHQoZWxhcHNlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoa2V5LmxlZnQoKSkge1xuICAgICAgICAgICAgICAgIHBsYXllci5sZWZ0KGVsYXBzZWQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUaGlzIGZ1bmN0aW9uIGNoZWNrcyBmb3IgYWxsIHJlcXVpcmVkIGNvbGxpc2lvbnMsIGFuZCBjYWxscyB0aGUgY29ycmVzcG9uZGluZyBmdW5jdGlvbnMgYWZ0ZXIgdG9vXG4gICAgICAgICAgICBjb2xsaXNpb25zLmNoZWNrKHBsYXllciwgZmx5aW5nT2JqZWN0cyk7XG5cbiAgICAgICAgICAgIC8vIENsZWFyIHRoZSBzY3JlZW5cbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzBmMGQyMCc7XG4gICAgICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgODAwLCA2MDApO1xuXG4gICAgICAgICAgICBwYXJ0aWNsZXMuZHJhdyhlbGFwc2VkLCBjdHgsIHBsYXllcik7XG4gICAgICAgICAgICBmbHlpbmdPYmplY3RzLmxvb3AoZWxhcHNlZCwgY3R4LCBwbGF5ZXIub2Zmc2V0WCwgcGxheWVyLm9mZnNldFkpO1xuICAgICAgICAgICAgcGxheWVyLmRyYXcoZWxhcHNlZCwgY3R4KTtcbiAgICAgICAgICAgIG1lbnVzLmluZ2FtZShjdHgsIHBsYXllci5mdWVsLCBwbGF5ZXIuaGVhbHRoLCBwbGF5ZXIuc2NvcmUpO1xuXG4gICAgICAgICAgICBwbGF5ZXIuc2NvcmUgKz0gMC4xO1xuXG4gICAgICAgICAgICBpZiAocGxheWVyLmhlYWx0aCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LnN0YXRlID0gJ2VuZCc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAod2luZG93LnN0YXRlID09PSAnZW5kJykge1xuICAgICAgICAgICAgYXVkaW8ucGF1c2Uoc2Z4KTtcbiAgICAgICAgICAgIG1lbnVzLmRyYXdFbmQoY3R4LCBwbGF5ZXIuc2NvcmUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYod2luZG93LnN0YXRlID09PSAnc3RvcmUnKSB7XG4gICAgICAgICAgICBtZW51cy5kcmF3U3RvcmUoY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBidXR0b25zLmRyYXdBbGwoKTtcbiAgICB9KTtcbn0pO1xuXG53aW5kb3cucmVzZXRHYW1lID0gZnVuY3Rpb24oKSB7XG4gICAgd2luZG93LnN0YXRlID0gJ2dhbWUnO1xuICAgIHBsYXllci5zY29yZSA9IDA7XG4gICAgcGxheWVyLnJlc2V0KCk7XG4gICAgcGFydGljbGVzLnJlc2V0KCk7XG4gICAgZmx5aW5nT2JqZWN0cy5yZXNldCgpO1xufTtcblxudmFyIGNoYW5nZVN0YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHdpbmRvdy5zdGF0ZSA9PT0gJ21lbnUnKSB7XG4gICAgICAgIHdpbmRvdy5zdGF0ZSA9ICdnYW1lJztcbiAgICB9XG4gICAgZWxzZSBpZiAod2luZG93LnN0YXRlID09PSAnZW5kJykge1xuICAgICAgICB3aW5kb3cucmVzZXRHYW1lKCk7XG4gICAgfVxufTtcblxuLy8gY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2hhbmdlU3RhdGUsIGZhbHNlKTtcbmRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAoZS5rZXlDb2RlID09PSAxMykge1xuICAgICAgICBjaGFuZ2VTdGF0ZSgpO1xuICAgIH1cbn0sIGZhbHNlKTtcbiIsInZhciBhdWRpbyA9IHdpbmRvdy5hdWRpbyA9IHt9OyAvLyBNYWRlIGl0IGEgZ2xvYmFsIHNvIEkgY2FuIGVhc2lseSB0ZXN0XG52YXIgZWxlbWVudHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdhdWRpbycpO1xudmFyIEZBREVfU1BFRUQgPSAwLjE7XG5cbmF1ZGlvLm11dGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBlbGVtZW50c1tpXS52b2x1bWUgPSAwO1xuICAgIH1cbn07XG5hdWRpby5zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZWxlbWVudHNbaV0ucGF1c2UoKTtcbiAgICB9XG59O1xuXG5hdWRpby5wbGF5ID0gZnVuY3Rpb24gKG5hbWUsIHNlZWtGcm9tKSB7XG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChuYW1lKTtcbiAgICBlbGVtLmN1cnJlbnRUaW1lID0gc2Vla0Zyb20gfHwgMDtcbiAgICBlbGVtLnBsYXkoKTtcbn07XG5hdWRpby5wYXVzZSA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgaWYgKHR5cGVvZiBuYW1lID09PSAnc3RyaW5nJykge1xuICAgICAgICB2YXIgbmFtZXMgPSBbbmFtZV07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBuYW1lcyA9IG5hbWU7XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChuYW1lc1tpXSk7XG4gICAgICAgIGVsZW0ucGF1c2UoKTtcbiAgICB9XG4gICAgXG59O1xuXG5hdWRpby5mYWRlb3V0ID0gZnVuY3Rpb24gKG5hbWUsIHNlZWtGcm9tLCBjYikge1xuICAgIHZhciBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobmFtZSk7XG4gICAgdmFyIHZvbHVtZSA9IGVsZW0udm9sdW1lO1xuICAgIHZhciBkZWNyZWFzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdm9sdW1lIC09IEZBREVfU1BFRUQ7XG4gICAgICAgIGNvbnNvbGUubG9nKHZvbHVtZSk7XG4gICAgICAgIGlmICh2b2x1bWUgPD0gMCkge1xuICAgICAgICAgICAgZWxlbS52b2x1bWUgPSAwO1xuICAgICAgICAgICAgZWxlbS5wYXVzZSgpO1xuICAgICAgICAgICAgY2IgJiYgY2IoZWxlbSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlbGVtLnZvbHVtZSA9IHZvbHVtZTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZGVjcmVhc2UsIDEwMC8zKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgZGVjcmVhc2UoKTtcbn1cbmF1ZGlvLmZhZGVpbiA9IGZ1bmN0aW9uIChuYW1lLCBzZWVrRnJvbSwgY2IpIHtcbiAgICB2YXIgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG5hbWUpO1xuICAgIHZhciB2b2x1bWUgPSBlbGVtLnZvbHVtZSA9IDA7XG4gICAgZWxlbS5wbGF5KCk7XG4gICAgdmFyIGluY3JlYXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2b2x1bWUgKz0gRkFERV9TUEVFRDtcbiAgICAgICAgaWYgKHZvbHVtZSA+PSAxKSB7XG4gICAgICAgICAgICBlbGVtLnZvbHVtZSA9IDE7XG4gICAgICAgICAgICBjYiAmJiBjYihlbGVtKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGVsZW0udm9sdW1lID0gdm9sdW1lO1xuICAgICAgICAgICAgc2V0VGltZW91dChpbmNyZWFzZSwgMTAwLzMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBpbmNyZWFzZSgpO1xufVxubW9kdWxlLmV4cG9ydHMgPSBhdWRpbzsiLCIvLyBNYWtlcyBpdCBlYXNpZXIgdG8gbWFrZSBtZW51IGJ1dHRvbnNcbnZhciBidXR0b25zID0gW107XG5cbnZhciBjYW52YXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZ2FtZScpO1xudmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG52YXIgZHJhd0J1dHRvbiA9IGZ1bmN0aW9uKGJ1dHRvbikge1xuICAgIGlmIChidXR0b24uaW1nKSB7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UoYnV0dG9uLngsIGJ1dHRvbi55LCBidXR0b24ud2lkdGgsIGJ1dHRvbi5oZWlnaHQpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgY3R4LnN0cm9rZVJlY3QoYnV0dG9uLngsIGJ1dHRvbi55LCBidXR0b24ud2lkdGgsIGJ1dHRvbi5oZWlnaHQpO1xuICAgIH1cbiAgICBpZiAoYnV0dG9uLnRleHQpIHtcblxuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgY3R4LmZvbnQgPSBidXR0b24uZm9udDtcbiAgICAgICAgdmFyIHRleHREaW0gPSBjdHgubWVhc3VyZVRleHQoYnV0dG9uLnRleHQpO1xuICAgICAgICBjdHguZmlsbFRleHQoYnV0dG9uLnRleHQsIGJ1dHRvbi54ICsgKGJ1dHRvbi53aWR0aCAtIHRleHREaW0ud2lkdGgpIC8gMiwgYnV0dG9uLnkgKyAoYnV0dG9uLmhlaWdodCArIDEwKSAvIDIpO1xuICAgIH1cbn07XG5cbi8vIGRpbSA9IGRpbWVuc2lvbnMgPSB7eCwgeSwgd2lkdGgsIGhlaWdodH0sXG4vLyBzY3JlZW5TdGF0ZTsgd2hlcmUgdGhlIGJ1dHRvbiBpcyB2aXNpYmxlXG4vLyB0ZXh0IHRvIHdyaXRlIG9uIGJ1dHRvbixcbi8vIGltZyB0byBwdXQgYmVoaW5kIHRleHQgKGlmIHVuZGVmaW5lZCwgaXQnbGwgZHJhdyBhIHdoaXRlIGJvcmRlciBhcm91bmQgdGhlIGJ1dHRvbiBhcmVhKVxudmFyIGFkZEJ1dHRvbiA9IGZ1bmN0aW9uKGRpbSwgc2NyZWVuU3RhdGUsIG9uY2xpY2ssIHRleHQsIGZvbnQsIGltZykge1xuICAgIHZhciBidXR0b24gPSB7fTtcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGRpbSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGJ1dHRvbltrZXlzW2ldXSA9IGRpbVtrZXlzW2ldXTtcbiAgICB9XG4gICAgaWYgKGJ1dHRvbi54ID09PSAnY2VudGVyJykge1xuICAgICAgICBidXR0b24ueCA9IChjYW52YXMud2lkdGggLSBidXR0b24ud2lkdGgpIC8gMjtcbiAgICB9XG4gICAgaWYgKGJ1dHRvbi55ID09PSAnY2VudGVyJykge1xuICAgICAgICBidXR0b24ueSA9IChjYW52YXMuaGVpZ2h0IC0gYnV0dG9uLmhlaWdodCkgLyAyO1xuICAgIH1cbiAgICBidXR0b24uc2NyZWVuU3RhdGUgPSBzY3JlZW5TdGF0ZSB8fCAnbWVudSc7XG4gICAgYnV0dG9uLm9uY2xpY2sgPSBvbmNsaWNrO1xuICAgIGJ1dHRvbi50ZXh0ID0gdGV4dCB8fCAnJztcbiAgICBidXR0b24uZm9udCA9IGZvbnQgfHwgJzEycHQgVGVtcGVzdGEgRml2ZSc7XG4gICAgYnV0dG9uLmltZyA9IGltZztcbiAgICBidXR0b25zLnB1c2goYnV0dG9uKTtcbn07XG5cbnZhciBkcmF3QWxsID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGJ1dHRvbjtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYnV0dG9uID0gYnV0dG9uc1tpXTtcbiAgICAgICAgaWYgKHdpbmRvdy5zdGF0ZSA9PT0gYnV0dG9uLnNjcmVlblN0YXRlKSB7XG4gICAgICAgICAgICBkcmF3QnV0dG9uKGJ1dHRvbik7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBkcmF3QWxsOiBkcmF3QWxsLFxuICAgIGFkZEJ1dHRvbjogYWRkQnV0dG9uXG59O1xuXG52YXIgY2hlY2tDbGljayA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgeCA9IGUucGFnZVggLSBjYW52YXMub2Zmc2V0TGVmdDtcbiAgICB2YXIgeSA9IGUucGFnZVkgLSBjYW52YXMub2Zmc2V0VG9wO1xuICAgIHZhciBidXR0b247XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBidXR0b25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGJ1dHRvbiA9IGJ1dHRvbnNbaV07XG4gICAgICAgIGlmICh4ID49IGJ1dHRvbi54ICYmIHggPD0gYnV0dG9uLnggKyBidXR0b24ud2lkdGggJiZcbiAgICAgICAgICAgIHkgPj0gYnV0dG9uLnkgJiYgeSA8PSBidXR0b24ueSArIGJ1dHRvbi5oZWlnaHQpIHtcbiAgICAgICAgICAgIGJ1dHRvbi5vbmNsaWNrKCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjaGVja0NsaWNrLCBmYWxzZSk7IiwidmFyIHBhcnRpY2xlc01vZHVsZSA9IHJlcXVpcmUoJy4vcGFydGljbGVzJyk7XG52YXIgc2hha2UgPSByZXF1aXJlKCcuL3NjcmVlbnNoYWtlJyk7XG5cbnZhciBwbGF5ZXJIaXRCb3ggPSB7XG4gICAgeDogMzc1LFxuICAgIHk6IDI3MCxcbiAgICB3aWR0aDogNTAsXG4gICAgaGVpZ2h0OiA2MFxufTtcbnZhciBhbmdsZWRDb2xsaXNpb24gPSBmdW5jdGlvbihwbGF5ZXIsIGZvKSB7XG4gICAgdmFyIGNvbGxpZGluZyA9IGZhbHNlO1xuICAgIGNvbGxpZGluZyA9IGFhYmIocGxheWVySGl0Qm94LCBmbyk7XG4gICAgcmV0dXJuIGNvbGxpZGluZztcbn07XG5cbnZhciBhYWJiID0gZnVuY3Rpb24oYSwgYikge1xuICAgIGlmIChcbiAgICAgICAgTWF0aC5hYnMoYS54ICsgYS53aWR0aCAvIDIgLSBiLnggLSBiLndpZHRoIC8gMikgPiAoYS53aWR0aCArIGIud2lkdGgpIC8gMiB8fFxuICAgICAgICBNYXRoLmFicyhhLnkgKyBhLmhlaWdodCAvIDIgLSBiLnkgLSBiLmhlaWdodCAvIDIpID4gKGEuaGVpZ2h0ICsgYi5oZWlnaHQpIC8gMlxuICAgICkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxudmFyIGluQXJlYSA9IGZ1bmN0aW9uKGFyZWEsIGFycmF5LCByZXNwQ29sbGlkaW5nLCByZXNwTm90Q29sbGlkaW5nKSB7XG4gICAgdmFyIHJldCA9IFtdO1xuICAgIHZhciBjdXJFbGVtO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY3VyRWxlbSA9IGFycmF5W2ldO1xuICAgICAgICBpZiAoYWFiYihhcmVhLCBjdXJFbGVtKSkge1xuICAgICAgICAgICAgcmV0LnB1c2goY3VyRWxlbSk7XG4gICAgICAgICAgICBpZiAocmVzcENvbGxpZGluZykge1xuICAgICAgICAgICAgICAgIHJlc3BDb2xsaWRpbmcoY3VyRWxlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocmVzcE5vdENvbGxpZGluZykge1xuICAgICAgICAgICAgcmVzcE5vdENvbGxpZGluZyhjdXJFbGVtKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufTtcblxudmFyIHBsYXllckFyZWEgPSB7XG4gICAgeDogMzI1LFxuICAgIHk6IDIyNSxcbiAgICB3aWR0aDogMTUwLFxuICAgIGhlaWdodDogMTUwXG59O1xuXG52YXIgY2FtZXJhID0ge1xuICAgIHg6IC00MDAsXG4gICAgeTogLTMwMCxcbiAgICB3aWR0aDogMTYwMCxcbiAgICBoZWlnaHQ6IDEyMDBcbn07XG5cbnZhciBleHBsb2RlT2JqID0gZnVuY3Rpb24oZm8pIHtcbiAgICBwYXJ0aWNsZXNNb2R1bGUuY3JlYXRlUGFydGljbGVzKGZvLngsIGZvLnksIGZvLnNwZWVkLCAwLjAxLCBmby53aWR0aCAqIGZvLmhlaWdodCAvIDEwMCwgW2ZvLmNvbG9yXSwge1xuICAgICAgICByYW5nZTogTWF0aC5yYW5kb20oKSAqIDIgKiBNYXRoLlBJLFxuICAgICAgICBub0NvbGxpZGU6IHRydWUsXG4gICAgICAgIGR4OiBmby5keCxcbiAgICAgICAgZHk6IGZvLmR5XG4gICAgfSk7XG59O1xuXG52YXIgY2hlY2sgPSBmdW5jdGlvbihwbGF5ZXIsIGZvTW9kdWxlKSB7XG4gICAgLy8gZm8gc3RhbmRzIGZvciBmbHlpbmdPYmplY3RzXG4gICAgdmFyIHBhcnRpY2xlcyA9IHBhcnRpY2xlc01vZHVsZS5hcnJheTtcbiAgICB2YXIgZm9zID0gZm9Nb2R1bGUuYXJyYXk7XG4gICAgLy8gTWFuYWdlIGZseWluZyBvYmplY3Qgc3Bhd25pbmdcbiAgICB2YXIgZm9JblZpZXcgPSBpbkFyZWEoY2FtZXJhLCBmb3MsIHVuZGVmaW5lZCwgZnVuY3Rpb24oZm8pIHtcbiAgICAgICAgZm8uYWxpdmUgPSBmYWxzZTtcbiAgICB9KTtcbiAgICBpZiAoZm9JblZpZXcubGVuZ3RoIDwgMzApIHtcbiAgICAgICAgZm9Nb2R1bGUuc3Bhd24oTWF0aC5yYW5kb20oKSAqIDEwMCk7XG4gICAgfVxuXG4gICAgLy8gQ29sbGlzaW9ucyBiZXR3ZWVuIHRoZSBwbGF5ZXIgYW5kIHJvY2tzXG4gICAgdmFyIGZvVG9UZXN0ID0gaW5BcmVhKHBsYXllckFyZWEsIGZvcyk7XG4gICAgdmFyIGZvO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZm9Ub1Rlc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZm8gPSBmb1RvVGVzdFtpXTtcbiAgICAgICAgaWYgKGFuZ2xlZENvbGxpc2lvbihwbGF5ZXIsIGZvKSkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ0hJVCcpO1xuICAgICAgICAgICAgZm8uYWxpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChmby5pbWFnZSA9PT0gJ3Bvd2VyLWljb24ucG5nJykge1xuICAgICAgICAgICAgICAgIGF1ZGlvLnBsYXkoJ2NvbGxlY3QnKTtcbiAgICAgICAgICAgICAgICBwbGF5ZXIuZnVlbCArPSAxMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGF1ZGlvLnBsYXkoJ2NvbGxpZGUnKTtcbiAgICAgICAgICAgICAgICBwbGF5ZXIuaGl0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBwbGF5ZXIuaGVhbHRoIC09IChmby53aWR0aCAqIGZvLmhlaWdodCkgLyAxMDA7XG4gICAgICAgICAgICAgICAgZXhwbG9kZU9iaihmbyk7XG4gICAgICAgICAgICAgICAgc2hha2UoNSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgY29sbGlzaW9ucyBiZXR3ZWVuIHBhcnRpY2xlcyBhbmQgZm9cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRpY2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAocGFydGljbGVzW2ldLm5vQ29sbGlkZSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaW5BcmVhKHBhcnRpY2xlc1tpXSwgZm9zLCBmdW5jdGlvbihmbykge1xuICAgICAgICAgICAgaWYgKHBhcnRpY2xlc1tpXS5hbGl2ZSAmJiAhZm8uZ29vZCkge1xuICAgICAgICAgICAgICAgIGZvLmFsaXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgYXVkaW8ucGxheSgnZXhwbG9kZV9tZXRlb3InKTtcbiAgICAgICAgICAgICAgICBwbGF5ZXIuc2NvcmUgKz0gKGZvLndpZHRoICogZm8uaGVpZ2h0KSAvIDEwMDtcbiAgICAgICAgICAgICAgICBleHBsb2RlT2JqKGZvKTtcbiAgICAgICAgICAgICAgICBzaGFrZSgyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY2hlY2s6IGNoZWNrXG59OyIsInZhciBwbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpO1xudmFyIGtleXMgPSB7fTtcbnZhciBDID0ge1xuICAgIFNQQUNFOiAzMixcbiAgICBMRUZUOiAzNyxcbiAgICBVUDogMzgsXG4gICAgUklHSFQ6IDM5LFxuICAgIERPV046IDQwXG59XG5kb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbihlKSB7XG4gICAgaWYgKGUua2V5Q29kZSA9PT0gQy5TUEFDRSkge1xuICAgICAgICBwbGF5ZXIuZmxpcCgpO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGUua2V5Q29kZSA+PSAzNyAmJiBlLmtleUNvZGUgPD0gNDApIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cbiAgICBrZXlzW2Uua2V5Q29kZV0gPSB0cnVlO1xufSk7XG5kb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3Rpb24oZSkge1xuICAgIGtleXNbZS5rZXlDb2RlXSA9IGZhbHNlO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxlZnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1tDLkxFRlRdO1xuICAgIH0sXG4gICAgdXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1tDLlVQXTtcbiAgICB9LFxuICAgIHJpZ2h0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbQy5SSUdIVF07XG4gICAgfSxcbiAgICBkb3duOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbQy5ET1dOXTtcbiAgICB9LFxuICAgIGZsaXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1tDLlNQQUNFXTtcbiAgICB9XG59O1xuIiwidmFyIGltYWdlTmFtZXMgPSBbXG4gICAgJ2FzdHJvLnBuZycsXG4gICAgJ2FzdHJvLWZseWluZy5wbmcnLFxuICAgICdoZWFsdGgtYmFyLWljb24ucG5nJyxcbiAgICAnbG9nby5wbmcnLFxuICAgICdwb3dlci1iYXItaWNvbi5wbmcnLFxuICAgICdwb3dlci1pY29uLnBuZycsXG4gICAgJ3JvY2stNS5wbmcnLFxuICAgICdyb2NrLWFsdC01LnBuZycsXG4gICAgJ3JvY2stb2RkLTEucG5nJyxcbiAgICAncm9jay1vZGQtMy5wbmcnXG5dO1xuXG52YXIgaW1hZ2VzID0ge307XG52YXIgbG9hZGVkID0gMDtcbnZhciBkb25lID0gZnVuY3Rpb24oY2IpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGltYWdlTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaW1hZ2VzW2ltYWdlTmFtZXNbaV1dID0gbmV3IEltYWdlKCk7XG4gICAgICAgIGltYWdlc1tpbWFnZU5hbWVzW2ldXS5zcmMgPSAnaW1hZ2VzLycgKyBpbWFnZU5hbWVzW2ldO1xuICAgICAgICBpbWFnZXNbaW1hZ2VOYW1lc1tpXV0ub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBsb2FkZWQrKztcbiAgICAgICAgICAgIGlmIChsb2FkZWQgPT09IGltYWdlTmFtZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2IoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxpc3Q6IGltYWdlTmFtZXMsXG4gICAgaW1hZ2VzOiBpbWFnZXMsXG4gICAgZG9uZTogZG9uZSxcbiAgICBnZXQ6IGZ1bmN0aW9uKHN0cmluZykge1xuICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBpbWFnZU5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoaW1hZ2VOYW1lc1tpXS5pbmRleE9mKHN0cmluZykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgcmV0LnB1c2goaW1hZ2VOYW1lc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG59OyIsInZhciBsb2FkZXIgPSByZXF1aXJlKCcuL2xvYWRlcicpO1xudmFyIHRleHQgPSByZXF1aXJlKCcuL3RleHQnKTtcbnZhciBidXR0b25zID0gcmVxdWlyZSgnLi9idXR0b25zJyk7XG5cbmJ1dHRvbnMuYWRkQnV0dG9uKFxuICAgIHtcbiAgICAgICAgeDogJ2NlbnRlcicsXG4gICAgICAgIHk6IDMwMCxcbiAgICAgICAgd2lkdGg6IDIwMCxcbiAgICAgICAgaGVpZ2h0OiA1MFxuICAgIH0sXG4gICAgJ21lbnUnLFxuICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICB3aW5kb3cuc3RhdGUgPSAnZ2FtZSc7XG4gICAgfSxcbiAgICAnQ2xpY2sgdG8gcGxheScsXG4gICAgJzEycHQgVGVtcGVzdGEgRml2ZSdcbik7XG5cblxuYnV0dG9ucy5hZGRCdXR0b24oXG4gICAge1xuICAgICAgICB4OiAyMDAsXG4gICAgICAgIHk6IDQwMCxcbiAgICAgICAgd2lkdGg6IDIwMCxcbiAgICAgICAgaGVpZ2h0OiA1MFxuICAgIH0sXG4gICAgJ2VuZCcsXG4gICAgZnVuY3Rpb24oKSB7XG4gICAgICAgIHdpbmRvdy5yZXNldEdhbWUoKTtcbiAgICB9LFxuICAgICdQbGF5IGFnYWluJyxcbiAgICAnMTJwdCBUZW1wZXN0YSBGaXZlJ1xuKTtcbmJ1dHRvbnMuYWRkQnV0dG9uKFxuICAgIHtcbiAgICAgICAgeDogNDUwLFxuICAgICAgICB5OiA0MDAsXG4gICAgICAgIHdpZHRoOiAyMDAsXG4gICAgICAgIGhlaWdodDogNTBcbiAgICB9LFxuICAgICdlbmQnLFxuICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICB3aW5kb3cuc3RhdGUgPSAnc3RvcmUnO1xuICAgIH0sXG4gICAgJ1N0b3JlJyxcbiAgICAnMTJwdCBUZW1wZXN0YSBGaXZlJ1xuKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZHJhd01lbnU6IGZ1bmN0aW9uKGN0eCkge1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJyMwZjBkMjAnO1xuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgODAwLCA2MDApO1xuXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1snbG9nby5wbmcnXSwgMzE0LCAxODApO1xuICAgICAgICAvLyB0ZXh0LndyaXRlKCdDTElDSyBUTyBQTEFZJywgJ2NlbnRlcicsIDMzMCk7XG4gICAgICAgIHRleHQud3JpdGUoJ0EgR0FNRSBCWScsICdjZW50ZXInLCA1MDApO1xuICAgICAgICB0ZXh0LndyaXRlKCdAQU1BQU5DIEFORCBATUlLRURJRFRISVMnLCAnY2VudGVyJywgNTIwLCBmdW5jdGlvbihjdHgpIHtcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnI0RDRkNGOSc7XG4gICAgICAgICAgICBjdHguZm9udCA9ICcxMnB0IFRlbXBlc3RhIEZpdmUnO1xuICAgICAgICB9KTtcblxuICAgIH0sXG4gICAgZHJhd0VuZDogZnVuY3Rpb24oY3R4LCBzY29yZSkge1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJyMwZjBkMjAnO1xuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgODAwLCA2MDApO1xuICAgICAgICB0ZXh0LndyaXRlKCdZb3UgZWFybmVkIEEkJyArIE1hdGgucm91bmQoc2NvcmUpICsgJy4nLCAnY2VudGVyJywgMzAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuICAgICAgICAgICAgY3R4LmZvbnQgPSAnMjZwdCBUZW1wZXN0YSBGaXZlJztcbiAgICAgICAgfSk7XG4gICAgICAgIHRleHQud3JpdGUoJ0NsaWNrIHRvIHBsYXkgYWdhaW4nLCAnY2VudGVyJywgNTAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuICAgICAgICAgICAgY3R4LmZvbnQgPSAnMjJwdCBUZW1wZXN0YSBGaXZlJztcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBpbmdhbWU6IGZ1bmN0aW9uKGN0eCwgZnVlbCwgaGVhbHRoLCBzY29yZSkge1xuICAgICAgICBjdHguZHJhd0ltYWdlKGxvYWRlci5pbWFnZXNbJ3Bvd2VyLWJhci1pY29uLnBuZyddLCAzMCwgNTAwKTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICdvcmFuZ2UnO1xuICAgICAgICBjdHguZmlsbFJlY3QoMzAsIDQ5MCAtIGZ1ZWwsIDIwLCBmdWVsKTtcblxuICAgICAgICBjdHguZHJhd0ltYWdlKGxvYWRlci5pbWFnZXNbJ2hlYWx0aC1iYXItaWNvbi5wbmcnXSwgNzAsIDUwMCk7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAncmVkJztcbiAgICAgICAgY3R4LmZpbGxSZWN0KDcwLCA0OTAgLSBoZWFsdGgsIDIwLCBoZWFsdGgpO1xuXG4gICAgICAgIHRleHQud3JpdGUoJ0EkOiAnICsgTWF0aC5yb3VuZChzY29yZSksIDMwLCA1NTAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY3R4LmZvbnQgPSAnMTJwdCBUZW1wZXN0YSBGaXZlJztcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGRyYXdTdG9yZTogZnVuY3Rpb24oY3R4KSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzBmMGQyMCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCA4MDAsIDYwMCk7XG4gICAgICAgIHRleHQud3JpdGUoJ1NUT1JFJywgMzAsIDUwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGN0eC5mb250ID0gJzEycHQgVGVtcGVzdGEgRml2ZSc7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgfSk7XG4gICAgfVxufTsiLCJ2YXIgcGFydGljbGVzID0gW107XG52YXIgVyA9IDcsIEggPSA3O1xudmFyIERFQ19SQVRFID0gMC4xOyAvLyBEZWZhdWx0IGRlY3JlYXNlIHJhdGUuIEhpZ2hlciByYXRlIC0+IHBhcnRpY2xlcyBnbyBmYXN0ZXJcbnZhciBQYXJ0aWNsZSA9IGZ1bmN0aW9uKHgsIHksIHNwZWVkLCBkZWNSYXRlLCBjb2xvcnMpIHtcbiAgICB0aGlzLmFsaXZlID0gdHJ1ZTtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy5keCA9IHRoaXMuZHkgPSAwO1xuICAgIHRoaXMud2lkdGggPSBXO1xuICAgIHRoaXMuaGVpZ2h0ID0gSDtcbiAgICB0aGlzLmFuZ2xlID0gMDtcbiAgICB0aGlzLnNwZWVkID0gc3BlZWQ7XG4gICAgdGhpcy5vcGFjaXR5ID0gMTtcbiAgICB0aGlzLmRlY1JhdGUgPSBkZWNSYXRlIHx8IERFQ19SQVRFO1xuICAgIHRoaXMuZGVsYXkgPSBNYXRoLmNlaWwoTWF0aC5yYW5kb20oKSAqIDEwKTtcbiAgICBpZiAoY29sb3JzKSB7XG4gICAgICAgIHRoaXMuY29sb3IgPSBjb2xvcnNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY29sb3JzLmxlbmd0aCldO1xuICAgIH1cbiAgICB0aGlzLmxvb3AgPSBmdW5jdGlvbihjdHgsIHBsYXllcikge1xuICAgICAgICBpZiAodGhpcy5kZWxheSA+IDApIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRlbGF5IDw9IDEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFuZ2xlID0gcGxheWVyLmFuZ2xlIC0gdGhpcy5yYW5nZSArIChNYXRoLnJhbmRvbSgpICogMiAqIHRoaXMucmFuZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5kZWxheS0tO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMueCArPSB0aGlzLmR4IC0gd2luZG93LnBsYXllci5vZmZzZXRYICsgTWF0aC5zaW4oLXRoaXMuYW5nbGUpICogc3BlZWQ7XG4gICAgICAgIHRoaXMueSArPSB0aGlzLmR5IC0gd2luZG93LnBsYXllci5vZmZzZXRZICsgTWF0aC5jb3MoLXRoaXMuYW5nbGUpICogc3BlZWQ7XG4gICAgICAgIHRoaXMub3BhY2l0eSAtPSB0aGlzLmRlY1JhdGU7XG4gICAgICAgIGlmICh0aGlzLm9wYWNpdHkgPD0gMCkge1xuICAgICAgICAgICAgdGhpcy5vcGFjaXR5ID0gMDtcbiAgICAgICAgICAgIHRoaXMuYWxpdmUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBEcmF3XG4gICAgICAgIGN0eC5zYXZlKCk7XG4gICAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IHRoaXMub3BhY2l0eTtcbiAgICAgICAgY3R4Lmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9ICdsaWdodGVyJztcbiAgICAgICAgY3R4LnRyYW5zbGF0ZSh0aGlzLngsIHRoaXMueSk7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmNvbG9yIHx8ICdyZWQnO1xuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgVywgSCk7XG4gICAgICAgIGN0eC5yZXN0b3JlKCk7XG4gICAgfTtcbn07XG5cbi8vIHgsIHkgYXJlIGZpeGVkXG4vLyBQYXJ0aWNsZXMgYXJlIGNyZWF0ZWQgZnJvbSBhbmdsZS1yYW5nZSB0byBhbmdsZStyYW5nZVxuLy8gc3BlZWQgaXMgZml4ZWRcbnZhciBhbmdsZSA9IDA7XG52YXIgY3JlYXRlUGFydGljbGVzID0gZnVuY3Rpb24oeCwgeSwgc3BlZWQsIGRlY1JhdGUsIG4sIGNvbG9ycywgcHJvcHMpIHtcbiAgICAvLyBjb25zb2xlLmxvZygnQ3JlYXRpbmcnLCBwYXJ0aWNsZXMpO1xuICAgIHZhciBjcmVhdGVkID0gMCwgaSA9IDA7XG4gICAgdmFyIHBhcnRpY2xlO1xuICAgIHdoaWxlKGNyZWF0ZWQgPCBuKSB7XG4gICAgICAgIHBhcnRpY2xlID0gcGFydGljbGVzW2ldO1xuICAgICAgICBpZiAocGFydGljbGUgJiYgIXBhcnRpY2xlLmFsaXZlIHx8ICFwYXJ0aWNsZSkge1xuICAgICAgICAgICAgcGFydGljbGVzW2ldID0gbmV3IFBhcnRpY2xlKHgsIHksIHNwZWVkLCBkZWNSYXRlLCBjb2xvcnMpO1xuICAgICAgICAgICAgY3JlYXRlZCsrO1xuICAgICAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhwcm9wcyk7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGtleXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBwYXJ0aWNsZXNbaV1ba2V5c1tqXV0gPSBwcm9wc1trZXlzW2pdXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFBvc3NpYmxlIHByb3BzOiByYW5nZSwgbm9Db2xsaWRlLCBkeCwgZHksIGNvbG9yXG4gICAgICAgIH1cbiAgICAgICAgaSsrO1xuICAgIH1cbn07XG5cbnZhciBkcmF3ID0gZnVuY3Rpb24oZWxhcHNlZCwgY3R4LCBwbGF5ZXIpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRpY2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBwYXJ0aWNsZXNbaV0ubG9vcChjdHgsIHBsYXllcik7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY3JlYXRlUGFydGljbGVzOiBjcmVhdGVQYXJ0aWNsZXMsXG4gICAgZHJhdzogZHJhdyxcbiAgICBhcnJheTogcGFydGljbGVzLFxuICAgIHJlc2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcGFydGljbGVzLmxlbmd0aCA9IDA7XG4gICAgfVxufTtcbiIsInZhciB3aGl0ZW4gPSByZXF1aXJlKCcuL3doaXRlbicpO1xudmFyIGNhbnZhcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNnYW1lJyk7XG5cbndpbmRvdy5wbGF5ZXIgPSB7fTtcblxucGxheWVyLmlkbGUgPSBuZXcgSW1hZ2UoKTtcbnBsYXllci5pZGxlLnNyYyA9ICdpbWFnZXMvYXN0cm8ucG5nJztcbnBsYXllci5pZGxlLm5hbWUgPSAnYXN0cm8ucG5nJztcbnBsYXllci5mbHlpbmcgPSBuZXcgSW1hZ2UoKTtcbnBsYXllci5mbHlpbmcuc3JjID0gJ2ltYWdlcy9hc3Ryby1mbHlpbmcucG5nJztcbnBsYXllci5mbHlpbmcubmFtZSA9ICdhc3Ryby1mbHlpbmcucG5nJztcbnBsYXllci5zdGF0ZSA9ICdpZGxlJztcblxucGxheWVyLmRlZmF1bHRzID0ge1xuICAgIHNjb3JlOiAwLFxuICAgIGFuZ2xlOiAwLFxuICAgIG9mZnNldFk6IDAsXG4gICAgb2Zmc2V0WDogMCxcbiAgICBoZWFsdGg6IDEwMCxcbiAgICBmdWVsOiAxMDAsXG4gICAgaGl0OiBmYWxzZSxcbiAgICBwcm9wUmFuZ2U6IDAuMTJcbn07XG5cbnBsYXllci53aWR0aCA9IDUyO1xucGxheWVyLmhlaWdodCA9IDYwO1xucGxheWVyLnggPSAoY2FudmFzLndpZHRoIC0gcGxheWVyLndpZHRoKSAvIDI7XG5wbGF5ZXIueSA9IChjYW52YXMuaGVpZ2h0IC0gcGxheWVyLmhlaWdodCkgLyAyO1xucGxheWVyLmFuZ2xlID0gMDtcblxucGxheWVyLm9mZnNldFggPSBwbGF5ZXIub2Zmc2V0WSA9IDA7XG5cblxuLy8gSGFsZiB3aWR0aCwgaGFsZiBoZWlnaHRcbnZhciBoVyA9IHBsYXllci53aWR0aCAvIDI7XG52YXIgaEggPSBwbGF5ZXIuaGVpZ2h0IC8gMjtcblxudmFyIHNwZWVkID0gMDsgLy8gVGhlIGN1cnJlbnQgc3BlZWRcbnZhciBkU3BlZWQ7XG52YXIgZFggPSAwLCBkWSA9IDA7XG5cbi8vIFlPVSBDQU4gQ09ORklHVVJFIFRIRVNFISAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxudmFyIGFjYyA9IDc7IC8vIEFjY2VsZXJhdGlvblxudmFyIGxpbSA9IDEwOyAvLyBTcGVlZCBsaW1pdFxudmFyIHR1cm5TcGVlZCA9IDIuMjtcbnZhciBncmF2ID0gMC4wMztcbi8vIE5PIE1PUkUgQ09ORklHVVJJTkchIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cblxucGxheWVyLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgZFggPSBkWSA9IHNwZWVkID0gZFNwZWVkID0gMDtcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHBsYXllci5kZWZhdWx0cyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHBsYXllcltrZXlzW2ldXSA9IHBsYXllci5kZWZhdWx0c1trZXlzW2ldXTtcbiAgICB9XG4gICAgcGxheWVyLm1vdmUoKTtcbn07XG5wbGF5ZXIuZ3Jhdml0eSA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBkWSAtPSBncmF2O1xufTtcbnBsYXllci5tb3ZlID0gZnVuY3Rpb24oZWxhcHNlZCwgZmx5aW5nKSB7XG4gICAgcGxheWVyLm9mZnNldFggPSBkWDtcbiAgICBwbGF5ZXIub2Zmc2V0WSA9IC1kWTtcbiAgICBkWCAqPSAwLjk5O1xuICAgIGRZICo9IDAuOTk7XG5cbiAgICBpZiAoIWZseWluZykge1xuICAgICAgICBwbGF5ZXIuc3RhdGUgPSAnaWRsZSc7XG4gICAgfVxufTtcbnBsYXllci51cCA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBwbGF5ZXIuZnVlbCAtPSAwLjI7XG4gICAgcGxheWVyLnN0YXRlID0gJ2ZseWluZyc7XG4gICAgc3BlZWQgKz0gYWNjO1xuICAgIGRTcGVlZCA9IGVsYXBzZWQgKiBzcGVlZDtcbiAgICAvLyBjb25zb2xlLmxvZyhwbGF5ZXIueCwgcGxheWVyLnkpO1xuICAgIC8vIGNvbnNvbGUubG9nKE1hdGguc2luKHBsYXllci5hbmdsZSkgKiBkU3BlZWQsIE1hdGguY29zKHBsYXllci5hbmdsZSkgKiBkU3BlZWQpO1xuICAgIGRYICs9IE1hdGguc2luKHBsYXllci5hbmdsZSkgKiBkU3BlZWQ7XG4gICAgZFkgKz0gTWF0aC5jb3MocGxheWVyLmFuZ2xlKSAqIGRTcGVlZDtcbiAgICBwbGF5ZXIubW92ZShlbGFwc2VkLCB0cnVlKTtcbiAgICBpZiAoc3BlZWQgPiBsaW0pIHtcbiAgICAgICAgc3BlZWQgPSBsaW07XG4gICAgfVxuICAgIGVsc2UgaWYgKHNwZWVkIDwgLWxpbSkge1xuICAgICAgICBzcGVlZCA9IC1saW07XG4gICAgfVxuXG59O1xucGxheWVyLnJpZ2h0ID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5hbmdsZSArPSBlbGFwc2VkICogdHVyblNwZWVkICogTWF0aC5QSTtcbn07XG5wbGF5ZXIubGVmdCA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBwbGF5ZXIuYW5nbGUgLT0gZWxhcHNlZCAqIHR1cm5TcGVlZCAqIE1hdGguUEk7XG59O1xucGxheWVyLmZsaXAgPSBmdW5jdGlvbigpIHtcbiAgICBwbGF5ZXIuYW5nbGUgKz0gTWF0aC5QSTtcbn07XG5cblxudmFyIHRpY2tzID0gMDtcbnBsYXllci5kcmF3ID0gZnVuY3Rpb24oZWxhcHNlZCwgY3R4KSB7XG4gICAgLy8gUGxheWVyXG4gICAgY3R4LnNhdmUoKTtcbiAgICBjdHgudHJhbnNsYXRlKHBsYXllci54ICsgaFcsIHBsYXllci55ICsgaEgpO1xuICAgIGN0eC5yb3RhdGUocGxheWVyLmFuZ2xlKTtcbiAgICAvLyBwbGF5ZXIuaGl0IGlzIHNldCBpbiBjb2xsaXNpb25zLmpzXG4gICAgLy8gSWYgdGhlIHBsYXllcidzIGJlZW4gaGl0LCB3ZSB3YW50IGl0IHRvIGZsYXNoIHdoaXRlIHRvIGluZGljYXRlIHRoYXRcbiAgICBpZiAocGxheWVyLmhpdCkge1xuICAgICAgICBjdHguZHJhd0ltYWdlKHdoaXRlbihwbGF5ZXJbcGxheWVyLnN0YXRlXS5uYW1lLCAncGluaycpLCAtaFcsIC1oSCk7XG4gICAgICAgIHRpY2tzKys7XG4gICAgICAgIGlmICh0aWNrcyA+PSA4KSB7XG4gICAgICAgICAgICBwbGF5ZXIuaGl0ID0gZmFsc2U7XG4gICAgICAgICAgICB0aWNrcyA9IDA7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UocGxheWVyW3BsYXllci5zdGF0ZV0sIC1oVywgLWhIKTtcbiAgICB9XG4gICAgY3R4LnJlc3RvcmUoKTtcblxufTtcblxucGxheWVyLnJlc2V0KCk7XG5cbm1vZHVsZS5leHBvcnRzID0gcGxheWVyO1xuIiwiLy8gSG9sZHMgbGFzdCBpdGVyYXRpb24gdGltZXN0YW1wLlxudmFyIHRpbWUgPSAwO1xuXG4vKipcbiAqIENhbGxzIGBmbmAgb24gbmV4dCBmcmFtZS5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm4gVGhlIGZ1bmN0aW9uXG4gKiBAcmV0dXJuIHtpbnR9IFRoZSByZXF1ZXN0IElEXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gcmFmKGZuKSB7XG4gIHJldHVybiB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgIHZhciBlbGFwc2VkID0gbm93IC0gdGltZTtcblxuICAgIGlmIChlbGFwc2VkID4gOTk5KSB7XG4gICAgICBlbGFwc2VkID0gMSAvIDYwO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbGFwc2VkIC89IDEwMDA7XG4gICAgfVxuXG4gICAgdGltZSA9IG5vdztcbiAgICBmbihlbGFwc2VkKTtcbiAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAvKipcbiAgICogQ2FsbHMgYGZuYCBvbiBldmVyeSBmcmFtZSB3aXRoIGBlbGFwc2VkYCBzZXQgdG8gdGhlIGVsYXBzZWRcbiAgICogdGltZSBpbiBtaWxsaXNlY29uZHMuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiBUaGUgZnVuY3Rpb25cbiAgICogQHJldHVybiB7aW50fSBUaGUgcmVxdWVzdCBJRFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgc3RhcnQ6IGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIHJhZihmdW5jdGlvbiB0aWNrKGVsYXBzZWQpIHtcbiAgICAgIGZuKGVsYXBzZWQpO1xuICAgICAgcmFmKHRpY2spO1xuICAgIH0pO1xuICB9LFxuICAvKipcbiAgICogQ2FuY2VscyB0aGUgc3BlY2lmaWVkIGFuaW1hdGlvbiBmcmFtZSByZXF1ZXN0LlxuICAgKlxuICAgKiBAcGFyYW0ge2ludH0gaWQgVGhlIHJlcXVlc3QgSURcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHN0b3A6IGZ1bmN0aW9uKGlkKSB7XG4gICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKGlkKTtcbiAgfVxufTtcbiIsInZhciBjYW52YXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZ2FtZScpO1xudmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG52YXIgcG9sYXJpdHkgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSA+IDAuNSA/IDEgOiAtMTtcbn07XG5cbi8vIEFtb3VudCB3ZSd2ZSBtb3ZlZCBzbyBmYXJcbnZhciB0b3RhbFggPSAwO1xudmFyIHRvdGFsWSA9IDA7XG5cbnZhciBzaGFrZSA9IGZ1bmN0aW9uKGludGVuc2l0eSkge1xuICAgIGlmICh0b3RhbFggPT09IDApIHtcbiAgICAgICAgY3R4LnNhdmUoKTtcbiAgICB9XG4gICAgaWYgKCFpbnRlbnNpdHkpIHtcbiAgICAgICAgaW50ZW5zaXR5ID0gMjtcbiAgICB9XG4gICAgdmFyIGRYID0gTWF0aC5yYW5kb20oKSAqIGludGVuc2l0eSAqIHBvbGFyaXR5KCk7XG4gICAgdmFyIGRZID0gTWF0aC5yYW5kb20oKSAqIGludGVuc2l0eSAqIHBvbGFyaXR5KCk7XG4gICAgdG90YWxYICs9IGRYO1xuICAgIHRvdGFsWSArPSBkWTtcblxuICAgIC8vIEJyaW5nIHRoZSBzY3JlZW4gYmFjayB0byBpdHMgdXN1YWwgcG9zaXRpb24gZXZlcnkgXCIyIGludGVuc2l0eVwiIHNvIGFzIG5vdCB0byBnZXQgdG9vIGZhciBhd2F5IGZyb20gdGhlIGNlbnRlclxuICAgIGlmIChpbnRlbnNpdHkgJSAyIDwgMC4yKSB7XG4gICAgICAgIGN0eC50cmFuc2xhdGUoLXRvdGFsWCwgLXRvdGFsWSk7XG4gICAgICAgIHRvdGFsWCA9IHRvdGFsWSA9IDA7XG4gICAgICAgIGlmIChpbnRlbnNpdHkgPD0gMC4xNSkge1xuICAgICAgICAgICAgY3R4LnJlc3RvcmUoKTsgLy8gSnVzdCB0byBtYWtlIHN1cmUgaXQgZ29lcyBiYWNrIHRvIG5vcm1hbFxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgY3R4LnRyYW5zbGF0ZShkWCwgZFkpO1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHNoYWtlKGludGVuc2l0eSAtIDAuMSk7XG4gICAgfSwgNSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHNoYWtlOyIsInZhciBwbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpO1xudmFyIGJ1dHRvbnMgPSByZXF1aXJlKCcuL2J1dHRvbnMnKTtcblxudmFyIGl0ZW1zID0gW1xuICAgIHtcbiAgICAgICAgbmFtZTogJ0hlYWx0aCcsXG4gICAgICAgIGRlc2M6ICdJbmNyZWFzZXMgaGVhbHRoIGJ5IDEwJyxcbiAgICAgICAgZm46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGxheWVyLmRlZmF1bHRzLmhlYWx0aCArPSAxMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBuYW1lOiAnRnVlbCcsXG4gICAgICAgIGRlc2M6ICdJbmNyZWFzZXMgZnVlbCBieSAxMCcsXG4gICAgICAgIGZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBsYXllci5kZWZhdWx0cy5oZWFsdGggKz0gMTA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgbmFtZTogJ0hlYWx0aCcsXG4gICAgICAgIGRlc2M6ICdJbmNyZWFzZXMgaGVhbHRoIGJ5IDEwJyxcbiAgICAgICAgZm46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGxheWVyLmRlZmF1bHRzLmhlYWx0aCA9IDEwMDA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgbmFtZTogJ0hlYWx0aCcsXG4gICAgICAgIGRlc2M6ICdJbmNyZWFzZXMgaGVhbHRoIGJ5IDEwJyxcbiAgICAgICAgZm46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGxheWVyLmRlZmF1bHRzLmhlYWx0aCA9IDEwMDA7XG4gICAgICAgIH1cbiAgICB9XG5dO1xuXG52YXIgYWRkSXRlbUJ1dHRvbnMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGl0ZW0gPSBpdGVtc1tpXTtcbiAgICAgICAgYnV0dG9ucy5hZGRCdXR0b24oXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgeDogMTAwICsgKGkgJSAzKSAqIDEzMCxcbiAgICAgICAgICAgICAgICB5OiAxMDAgKyBNYXRoLmZsb29yKGkgLyAzKSAqIDcwLFxuICAgICAgICAgICAgICAgIHdpZHRoOiAxMDAsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiA1MFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdzdG9yZScsXG4gICAgICAgICAgICBpdGVtLmZuLFxuICAgICAgICAgICAgaXRlbS5uYW1lLFxuICAgICAgICAgICAgJzEycHQgVGVtcGVzdGEgRml2ZSdcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBidXR0b25zLmFkZEJ1dHRvbihcbiAgICAgICAge1xuICAgICAgICAgICAgeDogJ2NlbnRlcicsXG4gICAgICAgICAgICB5OiA0NTAsXG4gICAgICAgICAgICB3aWR0aDogMjAwLFxuICAgICAgICAgICAgaGVpZ2h0OiA1MFxuICAgICAgICB9LFxuICAgICAgICAnc3RvcmUnLFxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHdpbmRvdy5yZXNldEdhbWUoKTtcbiAgICAgICAgfSxcbiAgICAgICAgJ1BsYXknLFxuICAgICAgICAnMTRwdCBUZW1wZXN0YSBGaXZlJ1xuICAgICk7XG59O1xuXG5hZGRJdGVtQnV0dG9ucygpOyIsInZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnY2FudmFzJylbMF07XG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5tb2R1bGUuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uKHRleHQsIHgsIHksIHByZUZ1bmMsIHN0cm9rZSl7XG4gICAgY3R4LnNhdmUoKTtcbiAgICBpZiAocHJlRnVuYykge1xuICAgICAgICBwcmVGdW5jKGN0eCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgY3R4LmZvbnQgPSAnMTJwdCBUZW1wZXN0YSBGaXZlJztcbiAgICB9XG5cbiAgICB2YXIgeFBvcyA9IHg7XG4gICAgaWYgKHggPT09ICdjZW50ZXInKSB7XG4gICAgICAgIHhQb3MgPSAoY2FudmFzLndpZHRoIC0gY3R4Lm1lYXN1cmVUZXh0KHRleHQpLndpZHRoKSAvIDI7XG4gICAgfVxuXG4gICAgaWYgKHN0cm9rZSkge1xuICAgICAgICBjdHguc3Ryb2tlVGV4dCh0ZXh0LCB4UG9zLCB5KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGN0eC5maWxsVGV4dCh0ZXh0LCB4UG9zLCB5KTtcbiAgICB9XG4gICAgY3R4LnJlc3RvcmUoKTtcbn07IiwiLy8gdWZvcy5qc1xuLy8gVGhpcyBmaWxlIGRlZmluZXMgYmVoYXZpb3IgZm9yIGFsbCB0aGUgdW5pZGVudGlmaWVkIGZseWluZyBvYmplY3RzXG4vLyBJIGd1ZXNzIHRoZXkgKmFyZSogaWRlbnRpZmllZCwgdGVjaG5pY2FsbHkuXG4vLyBCdXQgdWZvcy5qcyBpcyBjb29sZXIgdGhhbiBpZm9zLmpzXG4vLyBBc3Rlcm9pZHMgYW5kIGhlYWx0aCAvIGZ1ZWwgcGlja3VwcyBjb3VudCBhcyBVRk9zXG5cbnZhciBmbHlpbmdPYmplY3RzID0gW107XG5cbnZhciBsb2FkZXIgPSByZXF1aXJlKCcuL2xvYWRlci5qcycpO1xuXG52YXIgcm5kID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCk7XG59O1xudmFyIGNob29zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcmd1bWVudHNbTWF0aC5mbG9vcihybmQoKSAqIGFyZ3VtZW50cy5sZW5ndGgpXTtcbn07XG5cbnZhciBTUEFXTl9SQU5HRSA9IDEwMDtcbnZhciBNSU5fU1BFRUQgPSAwLjMsIE1BWF9TUEVFRCA9IDI7XG52YXIgV0lEVEggPSA4MDAsIEhFSUdIVCA9IDYwMDtcblxudmFyIHNwYXduID0gZnVuY3Rpb24obikge1xuICAgIC8vIGNvbnNvbGUubG9nKCdTcGF3bmVkIGZseWluZ09iamVjdHM6Jywgbik7XG4gICAgdmFyIG9iaiwgdGFyZ2V0WSwgdGFyZ2V0WDtcbiAgICB2YXIgc2lnblgsIHNpZ25ZLCBwb3NYLCBwb3NZO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIG9iaiA9IHtcbiAgICAgICAgICAgIHg6IChybmQoKSAqIFdJRFRIKSxcbiAgICAgICAgICAgIHk6IChybmQoKSAqIEhFSUdIVCksXG4gICAgICAgICAgICBzcGVlZDogcm5kKCkgKiAoTUFYX1NQRUVEIC0gTUlOX1NQRUVEKSArIE1JTl9TUEVFRCxcbiAgICAgICAgICAgIGltYWdlOiBjaG9vc2UuYXBwbHkodGhpcywgbG9hZGVyLmdldCgncm9jaycpLmNvbmNhdChsb2FkZXIuZ2V0KCdwb3dlci1pY29uJykpKSxcbiAgICAgICAgICAgIGFsaXZlOiB0cnVlXG4gICAgICAgIH07XG4gICAgICAgIHRhcmdldFkgPSBybmQoKSAqIFdJRFRIO1xuICAgICAgICB0YXJnZXRYID0gcm5kKCkgKiBIRUlHSFQ7XG4gICAgICAgIG9iai5hbmdsZSA9IHJuZCgpICogTWF0aC5QSSAqIDI7XG4gICAgICAgIG9iai5nb29kID0gb2JqLmltYWdlLmluZGV4T2YoJ3JvY2snKSA+PSAwID8gZmFsc2UgOiB0cnVlO1xuICAgICAgICBvYmoud2lkdGggPSBsb2FkZXIuaW1hZ2VzW29iai5pbWFnZV0ud2lkdGg7XG4gICAgICAgIG9iai5oZWlnaHQgPSBsb2FkZXIuaW1hZ2VzW29iai5pbWFnZV0uaGVpZ2h0O1xuICAgICAgICBvYmouZHggPSBNYXRoLmNvcyhvYmouYW5nbGUpICogb2JqLnNwZWVkO1xuICAgICAgICBvYmouZHkgPSBNYXRoLnNpbihvYmouYW5nbGUpICogb2JqLnNwZWVkO1xuXG4gICAgICAgIGlmICghb2JqLmdvb2QpIHtcbiAgICAgICAgICAgIG9iai5jb2xvciA9IG9iai5pbWFnZS5pbmRleE9mKCdhbHQnKSA8IDAgPyAnIzUyNEM0QycgOiAnI2E3ODI1OCc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocm5kKCkgPiAwLjUpIHtcbiAgICAgICAgICAgIG9iai54ICs9IGNob29zZSgtMSwgMSkgKiAoV0lEVEggKyBvYmoud2lkdGgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgb2JqLnkgKz0gY2hvb3NlKC0xLCAxKSAqIChIRUlHSFQgKyBvYmouaGVpZ2h0KTtcbiAgICAgICAgfVxuICAgICAgICBmbHlpbmdPYmplY3RzLnB1c2gob2JqKTtcbiAgICB9XG59O1xuXG52YXIgbG9vcCA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCwgb2Zmc2V0WCwgb2Zmc2V0WSkge1xuICAgIHZhciBvYmo7XG4gICAgZm9yICh2YXIgaSA9IGZseWluZ09iamVjdHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgb2JqID0gZmx5aW5nT2JqZWN0c1tpXTtcbiAgICAgICAgaWYgKG9iai5hbGl2ZSkge1xuICAgICAgICAgICAgb2JqLnggKz0gb2JqLmR4IC0gb2Zmc2V0WDtcbiAgICAgICAgICAgIG9iai55ICs9IG9iai5keSAtIG9mZnNldFk7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JlZCc7XG4gICAgICAgICAgICBjdHguZHJhd0ltYWdlKGxvYWRlci5pbWFnZXNbb2JqLmltYWdlXSwgb2JqLngsIG9iai55KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGZseWluZ09iamVjdHMuc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBsb29wOiBsb29wLFxuICAgIGFycmF5OiBmbHlpbmdPYmplY3RzLFxuICAgIHNwYXduOiBzcGF3bixcbiAgICByZXNldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGZseWluZ09iamVjdHMubGVuZ3RoID0gMDtcbiAgICB9XG59OyIsIi8vIFRoaXMgZmlsZSBleHBvcnRzIGEgZnVuY3Rpb24gdGhhdCBsZXRzIHlvdSBtYWtlIGltYWdlcyBcImZsYXNoXCIgbW9tZW50YXJpbHkuIExpa2UgdGhlIHBsYXllciB3aGVuIGhlIGdldHMgaGl0IGJ5IGFuIGFzdGVyb2lkXG52YXIgbG9hZGVyID0gcmVxdWlyZSgnLi9sb2FkZXInKTtcbnZhciBpbWFnZXMgPSBsb2FkZXIuaW1hZ2VzO1xuXG52YXIgY2FjaGUgPSB7fTtcbnZhciB3aGl0ZW4gPSBmdW5jdGlvbihpbWdOYW1lLCBjb2xvcikge1xuICAgIGlmIChjYWNoZVtpbWdOYW1lXSkge1xuICAgICAgICByZXR1cm4gY2FjaGVbaW1nTmFtZV07XG4gICAgfVxuICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICB2YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgdmFyIGltZyA9IGltYWdlc1tpbWdOYW1lXTtcblxuICAgIGNhbnZhcy53aWR0aCA9IGltZy53aWR0aDtcbiAgICBjYW52YXMuaGVpZ2h0ID0gaW1nLmhlaWdodDtcbiAgICBjdHguZHJhd0ltYWdlKGltZywgMCwgMCwgaW1nLndpZHRoLCBpbWcuaGVpZ2h0KTtcbiAgICBjdHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gJ3NvdXJjZS1hdG9wJztcbiAgICBjdHguZmlsbFN0eWxlID0gY29sb3IgfHwgJ3doaXRlJztcbiAgICBjdHguZmlsbFJlY3QoMCwgMCwgaW1nLndpZHRoLCBpbWcuaGVpZ2h0KTtcbiAgICBjYWNoZVtpbWdOYW1lXSA9IGNhbnZhcztcbiAgICByZXR1cm4gY2FudmFzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB3aGl0ZW47Il19
