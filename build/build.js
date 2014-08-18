(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var raf = require('./raf');
var player = require('./player');
var key = require('./keys');

var canvas = document.querySelector('#game');
var ctx = canvas.getContext('2d');

raf.start(function(elapsed) {
    // Clear the screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    player.draw(elapsed, ctx);
    player.gravity(elapsed);
    if (key.up()) {
        player.up(elapsed);
    } else {
        // console.log(player.x, player.y);
        player.move(elapsed);
    }

    if (key.right()) {
        player.right(elapsed);
    }
    if (key.left()) {
        player.left(elapsed);
    }
});

},{"./keys":2,"./player":4,"./raf":5}],2:[function(require,module,exports){
var player = require('./player');
var keys = {};
document.body.addEventListener('keydown', function(e) {
    if (e.keyCode === 32) {
        player.flip();
        e.preventDefault();
    }
    keys[e.keyCode] = true;
});
document.body.addEventListener('keyup', function(e) {
    keys[e.keyCode] = false;
});

module.exports = {
    left: function() {
        return keys[37];
    },
    up: function() {
        return keys[38];
    },
    right: function() {
        return keys[39];
    },
    down: function() {
        return keys[40];
    },
    flip: function() {
        return keys[32];
    }
};

},{"./player":4}],3:[function(require,module,exports){
var particles = [];
var W = 5, H = 5;
var Particle = function(x, y, angle, speed) {
    this.alive = true;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed;
    this.opacity = 1;
    this.delay = Math.random() * 10;
    this.loop = function(ctx) {
        if (this.delay > 0) {
            this.delay--;
            return false;
        }
        this.x += Math.sin(-this.angle) * speed;
        this.y += Math.cos(-this.angle) * speed;
        this.opacity -= 0.1;
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
    console.log('Creating', particles);
    for(var i = 0; i < n; i++) {
        angle = playerAngle - range + (Math.random() * 2 * range);
        if (particles[i] && !particles[i].alive || !particles[i]) {
            particles[i] = new Particle(x, y, angle, speed);
        }
    }
};

var draw = function(ctx) {
    for(var i = 0; i < particles.length; i++) {
        particles[i].loop(ctx);
    }
};

module.exports = {
    createParticles: createParticles,
    draw: draw
};
},{}],4:[function(require,module,exports){
var particles = require('./particles');

var player = {};
player.x = 0;
player.y = 0;
player.width = 10;
player.height = 30;
player.angle = 0;

// Half width, half height
var hW = player.width / 2;
var hH = player.height / 2;

var speed = 0; // The current speed
var acc = 5; // Acceleration
var lim = 8; // Speed limit
var dSpeed;
var dX = 0, dY = 0;
player.gravity = function(elapsed) {
    dY -= 0.1;
};
player.move = function(elapsed) {
    player.x += dX;
    player.y -= dY;
    dX *= 0.99;
    dY *= 0.99;
};
player.up = function(elapsed) {
    speed += acc;
    dSpeed = elapsed * speed;
    // console.log(player.x, player.y);
    // console.log(Math.sin(player.angle) * dSpeed, Math.cos(player.angle) * dSpeed);
    dX += Math.sin(player.angle) * dSpeed;
    dY += Math.cos(player.angle) * dSpeed;
    player.move(elapsed);
    if (speed > lim) {
        speed = lim;
    }
    else if (speed < -lim) {
        speed = -lim;
    }

    particles.createParticles(player.x + hW, player.y + player.height, player.angle, Math.PI/10, 10, 10);
};
player.right = function(elapsed) {
    player.angle += elapsed * 2 * Math.PI;
};
player.left = function(elapsed) {
    player.angle -= elapsed * 2 * Math.PI;
};
player.flip = function() {
    player.angle += Math.PI;
};

player.draw = function(elapsed, ctx) {
    ctx.save();
    ctx.fillStyle = 'black';
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.rotate(player.angle);
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
    // Flames
    ctx.fillStyle = 'red';
    ctx.fillRect(-player.width / 2, player.height / 2, player.width, 5);
    ctx.restore();
    particles.draw(ctx);

    // ctx.fillRect(player.x, 300, 10, 10);
};

module.exports = player;

},{"./particles":3}],5:[function(require,module,exports){
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

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4vc3JjL21haW4iLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy9rZXlzLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvSlMxM2svMjAxNC9zcmMvcGFydGljbGVzLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvSlMxM2svMjAxNC9zcmMvcGxheWVyLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvSlMxM2svMjAxNC9zcmMvcmFmLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIHJhZiA9IHJlcXVpcmUoJy4vcmFmJyk7XG52YXIgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcbnZhciBrZXkgPSByZXF1aXJlKCcuL2tleXMnKTtcblxudmFyIGNhbnZhcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNnYW1lJyk7XG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbnJhZi5zdGFydChmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgLy8gQ2xlYXIgdGhlIHNjcmVlblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcbiAgICBwbGF5ZXIuZHJhdyhlbGFwc2VkLCBjdHgpO1xuICAgIHBsYXllci5ncmF2aXR5KGVsYXBzZWQpO1xuICAgIGlmIChrZXkudXAoKSkge1xuICAgICAgICBwbGF5ZXIudXAoZWxhcHNlZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gY29uc29sZS5sb2cocGxheWVyLngsIHBsYXllci55KTtcbiAgICAgICAgcGxheWVyLm1vdmUoZWxhcHNlZCk7XG4gICAgfVxuXG4gICAgaWYgKGtleS5yaWdodCgpKSB7XG4gICAgICAgIHBsYXllci5yaWdodChlbGFwc2VkKTtcbiAgICB9XG4gICAgaWYgKGtleS5sZWZ0KCkpIHtcbiAgICAgICAgcGxheWVyLmxlZnQoZWxhcHNlZCk7XG4gICAgfVxufSk7XG4iLCJ2YXIgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcbnZhciBrZXlzID0ge307XG5kb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbihlKSB7XG4gICAgaWYgKGUua2V5Q29kZSA9PT0gMzIpIHtcbiAgICAgICAgcGxheWVyLmZsaXAoKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cbiAgICBrZXlzW2Uua2V5Q29kZV0gPSB0cnVlO1xufSk7XG5kb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3Rpb24oZSkge1xuICAgIGtleXNbZS5rZXlDb2RlXSA9IGZhbHNlO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxlZnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1szN107XG4gICAgfSxcbiAgICB1cDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzWzM4XTtcbiAgICB9LFxuICAgIHJpZ2h0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbMzldO1xuICAgIH0sXG4gICAgZG93bjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzWzQwXTtcbiAgICB9LFxuICAgIGZsaXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1szMl07XG4gICAgfVxufTtcbiIsInZhciBwYXJ0aWNsZXMgPSBbXTtcbnZhciBXID0gNSwgSCA9IDU7XG52YXIgUGFydGljbGUgPSBmdW5jdGlvbih4LCB5LCBhbmdsZSwgc3BlZWQpIHtcbiAgICB0aGlzLmFsaXZlID0gdHJ1ZTtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy5hbmdsZSA9IGFuZ2xlO1xuICAgIHRoaXMuc3BlZWQgPSBzcGVlZDtcbiAgICB0aGlzLm9wYWNpdHkgPSAxO1xuICAgIHRoaXMuZGVsYXkgPSBNYXRoLnJhbmRvbSgpICogMTA7XG4gICAgdGhpcy5sb29wID0gZnVuY3Rpb24oY3R4KSB7XG4gICAgICAgIGlmICh0aGlzLmRlbGF5ID4gMCkge1xuICAgICAgICAgICAgdGhpcy5kZWxheS0tO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMueCArPSBNYXRoLnNpbigtdGhpcy5hbmdsZSkgKiBzcGVlZDtcbiAgICAgICAgdGhpcy55ICs9IE1hdGguY29zKC10aGlzLmFuZ2xlKSAqIHNwZWVkO1xuICAgICAgICB0aGlzLm9wYWNpdHkgLT0gMC4xO1xuICAgICAgICBpZiAodGhpcy5vcGFjaXR5IDw9IDApIHtcbiAgICAgICAgICAgIHRoaXMub3BhY2l0eSA9IDA7XG4gICAgICAgICAgICB0aGlzLmFsaXZlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRHJhd1xuICAgICAgICBjdHguc2F2ZSgpO1xuICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSB0aGlzLm9wYWNpdHk7XG4gICAgICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JlZCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCBXLCBIKTtcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICB9O1xufTtcblxuLy8geCwgeSBhcmUgZml4ZWRcbi8vIFBhcnRpY2xlcyBhcmUgY3JlYXRlZCBmcm9tIGFuZ2xlLXJhbmdlIHRvIGFuZ2xlK3JhbmdlXG4vLyBzcGVlZCBpcyBmaXhlZFxudmFyIGFuZ2xlID0gMDtcbnZhciBjcmVhdGVQYXJ0aWNsZXMgPSBmdW5jdGlvbih4LCB5LCBwbGF5ZXJBbmdsZSwgcmFuZ2UsIHNwZWVkLCBuKSB7XG4gICAgY29uc29sZS5sb2coJ0NyZWF0aW5nJywgcGFydGljbGVzKTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGFuZ2xlID0gcGxheWVyQW5nbGUgLSByYW5nZSArIChNYXRoLnJhbmRvbSgpICogMiAqIHJhbmdlKTtcbiAgICAgICAgaWYgKHBhcnRpY2xlc1tpXSAmJiAhcGFydGljbGVzW2ldLmFsaXZlIHx8ICFwYXJ0aWNsZXNbaV0pIHtcbiAgICAgICAgICAgIHBhcnRpY2xlc1tpXSA9IG5ldyBQYXJ0aWNsZSh4LCB5LCBhbmdsZSwgc3BlZWQpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxudmFyIGRyYXcgPSBmdW5jdGlvbihjdHgpIHtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgcGFydGljbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHBhcnRpY2xlc1tpXS5sb29wKGN0eCk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY3JlYXRlUGFydGljbGVzOiBjcmVhdGVQYXJ0aWNsZXMsXG4gICAgZHJhdzogZHJhd1xufTsiLCJ2YXIgcGFydGljbGVzID0gcmVxdWlyZSgnLi9wYXJ0aWNsZXMnKTtcblxudmFyIHBsYXllciA9IHt9O1xucGxheWVyLnggPSAwO1xucGxheWVyLnkgPSAwO1xucGxheWVyLndpZHRoID0gMTA7XG5wbGF5ZXIuaGVpZ2h0ID0gMzA7XG5wbGF5ZXIuYW5nbGUgPSAwO1xuXG4vLyBIYWxmIHdpZHRoLCBoYWxmIGhlaWdodFxudmFyIGhXID0gcGxheWVyLndpZHRoIC8gMjtcbnZhciBoSCA9IHBsYXllci5oZWlnaHQgLyAyO1xuXG52YXIgc3BlZWQgPSAwOyAvLyBUaGUgY3VycmVudCBzcGVlZFxudmFyIGFjYyA9IDU7IC8vIEFjY2VsZXJhdGlvblxudmFyIGxpbSA9IDg7IC8vIFNwZWVkIGxpbWl0XG52YXIgZFNwZWVkO1xudmFyIGRYID0gMCwgZFkgPSAwO1xucGxheWVyLmdyYXZpdHkgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgZFkgLT0gMC4xO1xufTtcbnBsYXllci5tb3ZlID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci54ICs9IGRYO1xuICAgIHBsYXllci55IC09IGRZO1xuICAgIGRYICo9IDAuOTk7XG4gICAgZFkgKj0gMC45OTtcbn07XG5wbGF5ZXIudXAgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgc3BlZWQgKz0gYWNjO1xuICAgIGRTcGVlZCA9IGVsYXBzZWQgKiBzcGVlZDtcbiAgICAvLyBjb25zb2xlLmxvZyhwbGF5ZXIueCwgcGxheWVyLnkpO1xuICAgIC8vIGNvbnNvbGUubG9nKE1hdGguc2luKHBsYXllci5hbmdsZSkgKiBkU3BlZWQsIE1hdGguY29zKHBsYXllci5hbmdsZSkgKiBkU3BlZWQpO1xuICAgIGRYICs9IE1hdGguc2luKHBsYXllci5hbmdsZSkgKiBkU3BlZWQ7XG4gICAgZFkgKz0gTWF0aC5jb3MocGxheWVyLmFuZ2xlKSAqIGRTcGVlZDtcbiAgICBwbGF5ZXIubW92ZShlbGFwc2VkKTtcbiAgICBpZiAoc3BlZWQgPiBsaW0pIHtcbiAgICAgICAgc3BlZWQgPSBsaW07XG4gICAgfVxuICAgIGVsc2UgaWYgKHNwZWVkIDwgLWxpbSkge1xuICAgICAgICBzcGVlZCA9IC1saW07XG4gICAgfVxuXG4gICAgcGFydGljbGVzLmNyZWF0ZVBhcnRpY2xlcyhwbGF5ZXIueCArIGhXLCBwbGF5ZXIueSArIHBsYXllci5oZWlnaHQsIHBsYXllci5hbmdsZSwgTWF0aC5QSS8xMCwgMTAsIDEwKTtcbn07XG5wbGF5ZXIucmlnaHQgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgcGxheWVyLmFuZ2xlICs9IGVsYXBzZWQgKiAyICogTWF0aC5QSTtcbn07XG5wbGF5ZXIubGVmdCA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBwbGF5ZXIuYW5nbGUgLT0gZWxhcHNlZCAqIDIgKiBNYXRoLlBJO1xufTtcbnBsYXllci5mbGlwID0gZnVuY3Rpb24oKSB7XG4gICAgcGxheWVyLmFuZ2xlICs9IE1hdGguUEk7XG59O1xuXG5wbGF5ZXIuZHJhdyA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCkge1xuICAgIGN0eC5zYXZlKCk7XG4gICAgY3R4LmZpbGxTdHlsZSA9ICdibGFjayc7XG4gICAgY3R4LnRyYW5zbGF0ZShwbGF5ZXIueCArIHBsYXllci53aWR0aCAvIDIsIHBsYXllci55ICsgcGxheWVyLmhlaWdodCAvIDIpO1xuICAgIGN0eC5yb3RhdGUocGxheWVyLmFuZ2xlKTtcbiAgICBjdHguZmlsbFJlY3QoLXBsYXllci53aWR0aCAvIDIsIC1wbGF5ZXIuaGVpZ2h0IC8gMiwgcGxheWVyLndpZHRoLCBwbGF5ZXIuaGVpZ2h0KTtcbiAgICAvLyBGbGFtZXNcbiAgICBjdHguZmlsbFN0eWxlID0gJ3JlZCc7XG4gICAgY3R4LmZpbGxSZWN0KC1wbGF5ZXIud2lkdGggLyAyLCBwbGF5ZXIuaGVpZ2h0IC8gMiwgcGxheWVyLndpZHRoLCA1KTtcbiAgICBjdHgucmVzdG9yZSgpO1xuICAgIHBhcnRpY2xlcy5kcmF3KGN0eCk7XG5cbiAgICAvLyBjdHguZmlsbFJlY3QocGxheWVyLngsIDMwMCwgMTAsIDEwKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gcGxheWVyO1xuIiwiLy8gSG9sZHMgbGFzdCBpdGVyYXRpb24gdGltZXN0YW1wLlxudmFyIHRpbWUgPSAwO1xuXG4vKipcbiAqIENhbGxzIGBmbmAgb24gbmV4dCBmcmFtZS5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm4gVGhlIGZ1bmN0aW9uXG4gKiBAcmV0dXJuIHtpbnR9IFRoZSByZXF1ZXN0IElEXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gcmFmKGZuKSB7XG4gIHJldHVybiB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgIHZhciBlbGFwc2VkID0gbm93IC0gdGltZTtcblxuICAgIGlmIChlbGFwc2VkID4gOTk5KSB7XG4gICAgICBlbGFwc2VkID0gMSAvIDYwO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbGFwc2VkIC89IDEwMDA7XG4gICAgfVxuXG4gICAgdGltZSA9IG5vdztcbiAgICBmbihlbGFwc2VkKTtcbiAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAvKipcbiAgICogQ2FsbHMgYGZuYCBvbiBldmVyeSBmcmFtZSB3aXRoIGBlbGFwc2VkYCBzZXQgdG8gdGhlIGVsYXBzZWRcbiAgICogdGltZSBpbiBtaWxsaXNlY29uZHMuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiBUaGUgZnVuY3Rpb25cbiAgICogQHJldHVybiB7aW50fSBUaGUgcmVxdWVzdCBJRFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgc3RhcnQ6IGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIHJhZihmdW5jdGlvbiB0aWNrKGVsYXBzZWQpIHtcbiAgICAgIGZuKGVsYXBzZWQpO1xuICAgICAgcmFmKHRpY2spO1xuICAgIH0pO1xuICB9LFxuICAvKipcbiAgICogQ2FuY2VscyB0aGUgc3BlY2lmaWVkIGFuaW1hdGlvbiBmcmFtZSByZXF1ZXN0LlxuICAgKlxuICAgKiBAcGFyYW0ge2ludH0gaWQgVGhlIHJlcXVlc3QgSURcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHN0b3A6IGZ1bmN0aW9uKGlkKSB7XG4gICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKGlkKTtcbiAgfVxufTtcbiJdfQ==
