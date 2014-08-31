(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var raf = require('./raf');
var player = require('./player');
var key = require('./keys');
var enemies = require('./enemies');

var canvas = document.querySelector('#game');
var ctx = canvas.getContext('2d');

raf.start(function(elapsed) {
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

    if (enemies.array.length < 5) {
        enemies.spawn(Math.random() * 50);
    }

    // Clear the screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    enemies.draw(elapsed, ctx);
    player.draw(elapsed, ctx);
});

},{"./enemies":2,"./keys":3,"./player":5,"./raf":6}],2:[function(require,module,exports){
var enemies = [];

var either = function(a, b) {
    return Math.random() < 0.5 ? a : b;
};

var SPAWN_RANGE = 100;
var MAX_SPEED = 10;
var MAX_WIDTH = 50, MAX_HEIGHT = 50;
var MIN_WIDTH = 5, MIN_HEIGHT = 5;
var WIDTH = 800, HEIGHT = 600;

var spawn = function(n) {
    console.log('Spawned enemies:', n);
    var obj;
    for (var i = 0; i < n; i++) {
        obj = {
            x: (either(-1, 1) * SPAWN_RANGE * Math.random()) + (either(0, 1) * WIDTH),
            y: (either(-1, 1) * SPAWN_RANGE * Math.random()) + (either(0, 1) * HEIGHT),
            width: Math.random() * (MAX_WIDTH - MIN_WIDTH) + MIN_WIDTH,
            height: Math.random() * (MAX_HEIGHT - MIN_HEIGHT) + MIN_HEIGHT,
            speed: Math.random() * MAX_SPEED
        };
        obj.angle = Math.atan2(HEIGHT / 2 - obj.y, WIDTH / 2 - obj.x);
        enemies.push(obj);
    }
};

var draw = function(elapsed, ctx) {
    var enemy;
    for (var i = 0, len = enemies.length; i < len; i++) {
        enemy = enemies[i];
        enemy.x += Math.cos(enemy.angle) * enemy.speed;
        enemy.y += Math.sin(enemy.angle) * enemy.speed;
        ctx.fillStyle = 'red';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    }
};


module.exports = {
    draw: draw,
    array: enemies,
    spawn: spawn
};
},{}],3:[function(require,module,exports){
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

},{"./player":5}],4:[function(require,module,exports){
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
    this.loop = function(ctx, player) {
        if (this.delay > 0) {
            this.delay--;
            return false;
        }
        if (this.delay === 1) {
            this.x = player.x;
            this.y = player.y + player.height;
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
    // console.log('Creating', particles);
    for (var i = 0; i < n; i++) {
        angle = playerAngle - range + (Math.random() * 2 * range);
        if (particles[i] && !particles[i].alive || !particles[i]) {
            particles[i] = new Particle(x, y, angle, speed);
        }
    }
};

var draw = function(ctx, player) {
    for (var i = 0; i < particles.length; i++) {
        particles[i].loop(ctx, player);
    }
};

module.exports = {
    createParticles: createParticles,
    draw: draw
};

},{}],5:[function(require,module,exports){
var particles = require('./particles');
var SAT = require('./sat.min.js');

var player = new SAT.Polygon(new SAT.V(), [
  new SAT.V(),
  new SAT.V(0, 30),
  new SAT.V(10, 30),
  new SAT.V(10, 0)
]);

player.width = 10;
player.height = 30;
player.setAngle(0);


var rect = new SAT.Polygon(new SAT.V(), [
    new SAT.V(),
    new SAT.V(0, 300),
    new SAT.V(800, 300),
    new SAT.V(800, 0)
]);
rect.width = 800;
rect.height = 300;
rect.setAngle(Math.PI/6);
window.rect = rect;


// Half width, half height
var hW = player.width / 2;
var hH = player.height / 2;

var speed = 0; // The current speed
var dSpeed;
var dX = 0, dY = 0;

// YOU CAN CONFIGURE THESE! --------------------------
var acc = 7; // Acceleration
var lim = 8; // Speed limit
var turnSpeed = 2.2;
var grav = 0.08;
// NO MORE CONFIGURING! ------------------------------

player.gravity = function(elapsed) {
    dY -= grav;
};
player.move = function(elapsed) {
    player.pos.x += dX;
    player.pos.y -= dY;
    dX *= 0.99;
    dY *= 0.99;
};
player.up = function(elapsed) {
    speed += acc;
    dSpeed = elapsed * speed;
    // console.log(player.pos.x, player.pos.y);
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

    particles.createParticles(player.pos.x + hW, player.pos.y + player.height, player.angle, Math.PI / 10, 10, 10);
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

player.draw = function(elapsed, ctx) {
    particles.draw(ctx, player);

    ctx.save();
    ctx.translate(rect.pos.x, rect.pos.y);
    ctx.rotate(rect.angle);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = SAT.testPolygonPolygon(player, rect) ? 'green' : 'black';
    ctx.translate(player.pos.x + hW, player.pos.y + hH);
    ctx.rotate(player.angle);
    ctx.fillRect(-hW, -hH, player.width, player.height);
    // Flames
    ctx.fillStyle = 'red';
    ctx.fillRect(-hW, hH, player.width, 5);
    ctx.restore();

    // ctx.fillRect(player.pos.x, player.pos.y, 10, 10);
};
module.exports = player;

},{"./particles":4,"./sat.min.js":7}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
/* SAT.js - Version 0.4.1 - Copyright 2014 - Jim Riecken <jimr@jimr.ca> - released under the MIT License. https://github.com/jriecken/sat-js */
function w(){function a(b,k){this.x=b||0;this.y=k||0}function e(b,k){this.pos=b||new a;this.points=k||[];this.angle=0;this.offset=new a;this.recalc()}function u(b,k,c){this.pos=b||new a;this.w=k||0;this.h=c||0}function v(){this.b=this.a=null;this.overlapN=new a;this.overlapV=new a;this.clear()}function z(b,k,c){for(var a=Number.MAX_VALUE,f=-Number.MAX_VALUE,h=b.length,l=0;l<h;l++){var g=b[l].d(k);g<a&&(a=g);g>f&&(f=g)}c[0]=a;c[1]=f}function A(b,k,c,a,f,h){var l=q.pop(),g=q.pop();b=d.pop().c(k).sub(b);
k=b.d(f);z(c,f,l);z(a,f,g);g[0]+=k;g[1]+=k;if(l[0]>g[1]||g[0]>l[1])return d.push(b),q.push(l),q.push(g),!0;h&&(c=0,l[0]<g[0]?(h.aInB=!1,l[1]<g[1]?(c=l[1]-g[0],h.bInA=!1):(c=l[1]-g[0],a=g[1]-l[0],c=c<a?c:-a)):(h.bInA=!1,l[1]>g[1]?(c=l[0]-g[1],h.aInB=!1):(c=l[1]-g[0],a=g[1]-l[0],c=c<a?c:-a)),a=Math.abs(c),a<h.overlap&&(h.overlap=a,h.overlapN.c(f),0>c&&h.overlapN.reverse()));d.push(b);q.push(l);q.push(g);return!1}function x(b,k){var c=b.e(),a=k.d(b);return 0>a?-1:a>c?1:0}function B(b,k,c){for(var a=
d.pop().c(k.pos).sub(b.pos),f=k.r,h=f*f,l=b.calcPoints,g=l.length,s=d.pop(),p=d.pop(),m=0;m<g;m++){var e=m===g-1?0:m+1,q=0===m?g-1:m-1,t=0,r=null;s.c(b.edges[m]);p.c(a).sub(l[m]);c&&p.e()>h&&(c.aInB=!1);var n=x(s,p);if(-1===n){s.c(b.edges[q]);e=d.pop().c(a).sub(l[q]);n=x(s,e);if(1===n){n=p.f();if(n>f)return d.push(a),d.push(s),d.push(p),d.push(e),!1;c&&(c.bInA=!1,r=p.normalize(),t=f-n)}d.push(e)}else if(1===n){if(s.c(b.edges[e]),p.c(a).sub(l[e]),n=x(s,p),-1===n){n=p.f();if(n>f)return d.push(a),d.push(s),
d.push(p),!1;c&&(c.bInA=!1,r=p.normalize(),t=f-n)}}else{e=s.g().normalize();n=p.d(e);q=Math.abs(n);if(0<n&&q>f)return d.push(a),d.push(e),d.push(p),!1;c&&(r=e,t=f-n,0<=n||t<2*f)&&(c.bInA=!1)}r&&c&&Math.abs(t)<Math.abs(c.overlap)&&(c.overlap=t,c.overlapN.c(r))}c&&(c.a=b,c.b=k,c.overlapV.c(c.overlapN).scale(c.overlap));d.push(a);d.push(s);d.push(p);return!0}function C(b,a,c){for(var d=b.calcPoints,f=d.length,h=a.calcPoints,l=h.length,g=0;g<f;g++)if(A(b.pos,a.pos,d,h,b.normals[g],c))return!1;for(g=0;g<
l;g++)if(A(b.pos,a.pos,d,h,a.normals[g],c))return!1;c&&(c.a=b,c.b=a,c.overlapV.c(c.overlapN).scale(c.overlap));return!0}var m={};m.Vector=a;m.V=a;a.prototype.copy=a.prototype.c=function(b){this.x=b.x;this.y=b.y;return this};a.prototype.clone=a.prototype.i=function(){return new a(this.x,this.y)};a.prototype.perp=a.prototype.g=function(){var b=this.x;this.x=this.y;this.y=-b;return this};a.prototype.rotate=a.prototype.rotate=function(b){var a=this.x,c=this.y;this.x=a*Math.cos(b)-c*Math.sin(b);this.y=
a*Math.sin(b)+c*Math.cos(b);return this};a.prototype.reverse=a.prototype.reverse=function(){this.x=-this.x;this.y=-this.y;return this};a.prototype.normalize=a.prototype.normalize=function(){var b=this.f();0<b&&(this.x/=b,this.y/=b);return this};a.prototype.add=a.prototype.add=function(b){this.x+=b.x;this.y+=b.y;return this};a.prototype.sub=a.prototype.sub=function(b){this.x-=b.x;this.y-=b.y;return this};a.prototype.scale=a.prototype.scale=function(b,a){this.x*=b;this.y*=a||b;return this};a.prototype.project=
a.prototype.j=function(b){var a=this.d(b)/b.e();this.x=a*b.x;this.y=a*b.y;return this};a.prototype.projectN=a.prototype.k=function(b){var a=this.d(b);this.x=a*b.x;this.y=a*b.y;return this};a.prototype.reflect=function(b){var a=this.x,c=this.y;this.j(b).scale(2);this.x-=a;this.y-=c;return this};a.prototype.reflectN=function(b){var a=this.x,c=this.y;this.k(b).scale(2);this.x-=a;this.y-=c;return this};a.prototype.dot=a.prototype.d=function(b){return this.x*b.x+this.y*b.y};a.prototype.len2=a.prototype.e=
function(){return this.d(this)};a.prototype.len=a.prototype.f=function(){return Math.sqrt(this.e())};m.Circle=function(b,k){this.pos=b||new a;this.r=k||0};m.Polygon=e;e.prototype.setPoints=function(b){this.points=b;this.recalc();return this};e.prototype.setAngle=function(b){this.angle=b;this.recalc();return this};e.prototype.setOffset=function(b){this.offset=b;this.recalc();return this};e.prototype.rotate=e.prototype.rotate=function(b){for(var a=this.points,c=a.length,d=0;d<c;d++)a[d].rotate(b);this.recalc();
return this};e.prototype.translate=e.prototype.translate=function(b,a){for(var c=this.points,d=c.length,f=0;f<d;f++)c[f].x+=b,c[f].y+=a;this.recalc();return this};e.prototype.recalc=e.prototype.recalc=function(){var b,k=this.calcPoints=[],c=this.edges=[],d=this.normals=[],f=this.points,h=this.offset,l=this.angle,g=f.length;for(b=0;b<g;b++){var e=f[b].i();k.push(e);e.x+=h.x;e.y+=h.y;0!==l&&e.rotate(l)}for(b=0;b<g;b++)f=(new a).c(b<g-1?k[b+1]:k[0]).sub(k[b]),h=(new a).c(f).g().normalize(),c.push(f),
d.push(h);return this};m.Box=u;u.prototype.toPolygon=u.prototype.l=function(){var b=this.pos,k=this.w,c=this.h;return new e(new a(b.x,b.y),[new a,new a(k,0),new a(k,c),new a(0,c)])};m.Response=v;v.prototype.clear=v.prototype.clear=function(){this.bInA=this.aInB=!0;this.overlap=Number.MAX_VALUE;return this};for(var d=[],r=0;10>r;r++)d.push(new a);for(var q=[],r=0;5>r;r++)q.push([]);var y=new v,D=(new u(new a,1,1)).l();m.pointInCircle=function(b,a){var c=d.pop().c(b).sub(a.pos),e=a.r*a.r,f=c.e();d.push(c);
return f<=e};m.pointInPolygon=function(b,a){D.pos.c(b);y.clear();var c=C(D,a,y);c&&(c=y.aInB);return c};m.testCircleCircle=function(b,a,c){var e=d.pop().c(a.pos).sub(b.pos),f=b.r+a.r,h=e.e();if(h>f*f)return d.push(e),!1;c&&(h=Math.sqrt(h),c.a=b,c.b=a,c.overlap=f-h,c.overlapN.c(e.normalize()),c.overlapV.c(e).scale(c.overlap),c.aInB=b.r<=a.r&&h<=a.r-b.r,c.bInA=a.r<=b.r&&h<=b.r-a.r);d.push(e);return!0};m.testPolygonCircle=B;m.testCirclePolygon=function(a,d,c){if((a=B(d,a,c))&&c){d=c.a;var e=c.aInB;c.overlapN.reverse();
c.overlapV.reverse();c.a=c.b;c.b=d;c.aInB=c.bInA;c.bInA=e}return a};m.testPolygonPolygon=C;return m}"function"===typeof define&&define.amd?define(w):"object"===typeof exports?module.exports=w():this.SAT=w();
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9BcnNoaWUvanMxM2stMjAxNC9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiLi9zcmMvbWFpbiIsIi9Vc2Vycy9BcnNoaWUvanMxM2stMjAxNC9zcmMvZW5lbWllcy5qcyIsIi9Vc2Vycy9BcnNoaWUvanMxM2stMjAxNC9zcmMva2V5cy5qcyIsIi9Vc2Vycy9BcnNoaWUvanMxM2stMjAxNC9zcmMvcGFydGljbGVzLmpzIiwiL1VzZXJzL0Fyc2hpZS9qczEzay0yMDE0L3NyYy9wbGF5ZXIuanMiLCIvVXNlcnMvQXJzaGllL2pzMTNrLTIwMTQvc3JjL3JhZi5qcyIsIi9Vc2Vycy9BcnNoaWUvanMxM2stMjAxNC9zcmMvc2F0Lm1pbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIHJhZiA9IHJlcXVpcmUoJy4vcmFmJyk7XG52YXIgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcbnZhciBrZXkgPSByZXF1aXJlKCcuL2tleXMnKTtcbnZhciBlbmVtaWVzID0gcmVxdWlyZSgnLi9lbmVtaWVzJyk7XG5cbnZhciBjYW52YXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZ2FtZScpO1xudmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG5yYWYuc3RhcnQoZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5ncmF2aXR5KGVsYXBzZWQpO1xuICAgIGlmIChrZXkudXAoKSkge1xuICAgICAgICBwbGF5ZXIudXAoZWxhcHNlZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gY29uc29sZS5sb2cocGxheWVyLngsIHBsYXllci55KTtcbiAgICAgICAgcGxheWVyLm1vdmUoZWxhcHNlZCk7XG4gICAgfVxuXG4gICAgaWYgKGtleS5yaWdodCgpKSB7XG4gICAgICAgIHBsYXllci5yaWdodChlbGFwc2VkKTtcbiAgICB9XG4gICAgaWYgKGtleS5sZWZ0KCkpIHtcbiAgICAgICAgcGxheWVyLmxlZnQoZWxhcHNlZCk7XG4gICAgfVxuXG4gICAgaWYgKGVuZW1pZXMuYXJyYXkubGVuZ3RoIDwgNSkge1xuICAgICAgICBlbmVtaWVzLnNwYXduKE1hdGgucmFuZG9tKCkgKiA1MCk7XG4gICAgfVxuXG4gICAgLy8gQ2xlYXIgdGhlIHNjcmVlblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcbiAgICBlbmVtaWVzLmRyYXcoZWxhcHNlZCwgY3R4KTtcbiAgICBwbGF5ZXIuZHJhdyhlbGFwc2VkLCBjdHgpO1xufSk7XG4iLCJ2YXIgZW5lbWllcyA9IFtdO1xuXG52YXIgZWl0aGVyID0gZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpIDwgMC41ID8gYSA6IGI7XG59O1xuXG52YXIgU1BBV05fUkFOR0UgPSAxMDA7XG52YXIgTUFYX1NQRUVEID0gMTA7XG52YXIgTUFYX1dJRFRIID0gNTAsIE1BWF9IRUlHSFQgPSA1MDtcbnZhciBNSU5fV0lEVEggPSA1LCBNSU5fSEVJR0hUID0gNTtcbnZhciBXSURUSCA9IDgwMCwgSEVJR0hUID0gNjAwO1xuXG52YXIgc3Bhd24gPSBmdW5jdGlvbihuKSB7XG4gICAgY29uc29sZS5sb2coJ1NwYXduZWQgZW5lbWllczonLCBuKTtcbiAgICB2YXIgb2JqO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIG9iaiA9IHtcbiAgICAgICAgICAgIHg6IChlaXRoZXIoLTEsIDEpICogU1BBV05fUkFOR0UgKiBNYXRoLnJhbmRvbSgpKSArIChlaXRoZXIoMCwgMSkgKiBXSURUSCksXG4gICAgICAgICAgICB5OiAoZWl0aGVyKC0xLCAxKSAqIFNQQVdOX1JBTkdFICogTWF0aC5yYW5kb20oKSkgKyAoZWl0aGVyKDAsIDEpICogSEVJR0hUKSxcbiAgICAgICAgICAgIHdpZHRoOiBNYXRoLnJhbmRvbSgpICogKE1BWF9XSURUSCAtIE1JTl9XSURUSCkgKyBNSU5fV0lEVEgsXG4gICAgICAgICAgICBoZWlnaHQ6IE1hdGgucmFuZG9tKCkgKiAoTUFYX0hFSUdIVCAtIE1JTl9IRUlHSFQpICsgTUlOX0hFSUdIVCxcbiAgICAgICAgICAgIHNwZWVkOiBNYXRoLnJhbmRvbSgpICogTUFYX1NQRUVEXG4gICAgICAgIH07XG4gICAgICAgIG9iai5hbmdsZSA9IE1hdGguYXRhbjIoSEVJR0hUIC8gMiAtIG9iai55LCBXSURUSCAvIDIgLSBvYmoueCk7XG4gICAgICAgIGVuZW1pZXMucHVzaChvYmopO1xuICAgIH1cbn07XG5cbnZhciBkcmF3ID0gZnVuY3Rpb24oZWxhcHNlZCwgY3R4KSB7XG4gICAgdmFyIGVuZW15O1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBlbmVtaWVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGVuZW15ID0gZW5lbWllc1tpXTtcbiAgICAgICAgZW5lbXkueCArPSBNYXRoLmNvcyhlbmVteS5hbmdsZSkgKiBlbmVteS5zcGVlZDtcbiAgICAgICAgZW5lbXkueSArPSBNYXRoLnNpbihlbmVteS5hbmdsZSkgKiBlbmVteS5zcGVlZDtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICdyZWQnO1xuICAgICAgICBjdHguZmlsbFJlY3QoZW5lbXkueCwgZW5lbXkueSwgZW5lbXkud2lkdGgsIGVuZW15LmhlaWdodCk7XG4gICAgfVxufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBkcmF3OiBkcmF3LFxuICAgIGFycmF5OiBlbmVtaWVzLFxuICAgIHNwYXduOiBzcGF3blxufTsiLCJ2YXIgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcbnZhciBrZXlzID0ge307XG5kb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbihlKSB7XG4gICAgaWYgKGUua2V5Q29kZSA9PT0gMzIpIHtcbiAgICAgICAgcGxheWVyLmZsaXAoKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cbiAgICBrZXlzW2Uua2V5Q29kZV0gPSB0cnVlO1xufSk7XG5kb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3Rpb24oZSkge1xuICAgIGtleXNbZS5rZXlDb2RlXSA9IGZhbHNlO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxlZnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1szN107XG4gICAgfSxcbiAgICB1cDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzWzM4XTtcbiAgICB9LFxuICAgIHJpZ2h0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbMzldO1xuICAgIH0sXG4gICAgZG93bjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzWzQwXTtcbiAgICB9LFxuICAgIGZsaXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1szMl07XG4gICAgfVxufTtcbiIsInZhciBwYXJ0aWNsZXMgPSBbXTtcbnZhciBXID0gNSwgSCA9IDU7XG52YXIgUGFydGljbGUgPSBmdW5jdGlvbih4LCB5LCBhbmdsZSwgc3BlZWQpIHtcbiAgICB0aGlzLmFsaXZlID0gdHJ1ZTtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy5hbmdsZSA9IGFuZ2xlO1xuICAgIHRoaXMuc3BlZWQgPSBzcGVlZDtcbiAgICB0aGlzLm9wYWNpdHkgPSAxO1xuICAgIHRoaXMuZGVsYXkgPSBNYXRoLnJhbmRvbSgpICogMTA7XG4gICAgdGhpcy5sb29wID0gZnVuY3Rpb24oY3R4LCBwbGF5ZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuZGVsYXkgPiAwKSB7XG4gICAgICAgICAgICB0aGlzLmRlbGF5LS07XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZGVsYXkgPT09IDEpIHtcbiAgICAgICAgICAgIHRoaXMueCA9IHBsYXllci54O1xuICAgICAgICAgICAgdGhpcy55ID0gcGxheWVyLnkgKyBwbGF5ZXIuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMueCArPSBNYXRoLnNpbigtdGhpcy5hbmdsZSkgKiBzcGVlZDtcbiAgICAgICAgdGhpcy55ICs9IE1hdGguY29zKC10aGlzLmFuZ2xlKSAqIHNwZWVkO1xuICAgICAgICB0aGlzLm9wYWNpdHkgLT0gMC4xO1xuICAgICAgICBpZiAodGhpcy5vcGFjaXR5IDw9IDApIHtcbiAgICAgICAgICAgIHRoaXMub3BhY2l0eSA9IDA7XG4gICAgICAgICAgICB0aGlzLmFsaXZlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRHJhd1xuICAgICAgICBjdHguc2F2ZSgpO1xuICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSB0aGlzLm9wYWNpdHk7XG4gICAgICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JlZCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCBXLCBIKTtcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICB9O1xufTtcblxuLy8geCwgeSBhcmUgZml4ZWRcbi8vIFBhcnRpY2xlcyBhcmUgY3JlYXRlZCBmcm9tIGFuZ2xlLXJhbmdlIHRvIGFuZ2xlK3JhbmdlXG4vLyBzcGVlZCBpcyBmaXhlZFxudmFyIGFuZ2xlID0gMDtcbnZhciBjcmVhdGVQYXJ0aWNsZXMgPSBmdW5jdGlvbih4LCB5LCBwbGF5ZXJBbmdsZSwgcmFuZ2UsIHNwZWVkLCBuKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ0NyZWF0aW5nJywgcGFydGljbGVzKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICBhbmdsZSA9IHBsYXllckFuZ2xlIC0gcmFuZ2UgKyAoTWF0aC5yYW5kb20oKSAqIDIgKiByYW5nZSk7XG4gICAgICAgIGlmIChwYXJ0aWNsZXNbaV0gJiYgIXBhcnRpY2xlc1tpXS5hbGl2ZSB8fCAhcGFydGljbGVzW2ldKSB7XG4gICAgICAgICAgICBwYXJ0aWNsZXNbaV0gPSBuZXcgUGFydGljbGUoeCwgeSwgYW5nbGUsIHNwZWVkKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciBkcmF3ID0gZnVuY3Rpb24oY3R4LCBwbGF5ZXIpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRpY2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBwYXJ0aWNsZXNbaV0ubG9vcChjdHgsIHBsYXllcik7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY3JlYXRlUGFydGljbGVzOiBjcmVhdGVQYXJ0aWNsZXMsXG4gICAgZHJhdzogZHJhd1xufTtcbiIsInZhciBwYXJ0aWNsZXMgPSByZXF1aXJlKCcuL3BhcnRpY2xlcycpO1xudmFyIFNBVCA9IHJlcXVpcmUoJy4vc2F0Lm1pbi5qcycpO1xuXG52YXIgcGxheWVyID0gbmV3IFNBVC5Qb2x5Z29uKG5ldyBTQVQuVigpLCBbXG4gIG5ldyBTQVQuVigpLFxuICBuZXcgU0FULlYoMCwgMzApLFxuICBuZXcgU0FULlYoMTAsIDMwKSxcbiAgbmV3IFNBVC5WKDEwLCAwKVxuXSk7XG5cbnBsYXllci53aWR0aCA9IDEwO1xucGxheWVyLmhlaWdodCA9IDMwO1xucGxheWVyLnNldEFuZ2xlKDApO1xuXG5cbnZhciByZWN0ID0gbmV3IFNBVC5Qb2x5Z29uKG5ldyBTQVQuVigpLCBbXG4gICAgbmV3IFNBVC5WKCksXG4gICAgbmV3IFNBVC5WKDAsIDMwMCksXG4gICAgbmV3IFNBVC5WKDgwMCwgMzAwKSxcbiAgICBuZXcgU0FULlYoODAwLCAwKVxuXSk7XG5yZWN0LndpZHRoID0gODAwO1xucmVjdC5oZWlnaHQgPSAzMDA7XG5yZWN0LnNldEFuZ2xlKE1hdGguUEkvNik7XG53aW5kb3cucmVjdCA9IHJlY3Q7XG5cblxuLy8gSGFsZiB3aWR0aCwgaGFsZiBoZWlnaHRcbnZhciBoVyA9IHBsYXllci53aWR0aCAvIDI7XG52YXIgaEggPSBwbGF5ZXIuaGVpZ2h0IC8gMjtcblxudmFyIHNwZWVkID0gMDsgLy8gVGhlIGN1cnJlbnQgc3BlZWRcbnZhciBkU3BlZWQ7XG52YXIgZFggPSAwLCBkWSA9IDA7XG5cbi8vIFlPVSBDQU4gQ09ORklHVVJFIFRIRVNFISAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxudmFyIGFjYyA9IDc7IC8vIEFjY2VsZXJhdGlvblxudmFyIGxpbSA9IDg7IC8vIFNwZWVkIGxpbWl0XG52YXIgdHVyblNwZWVkID0gMi4yO1xudmFyIGdyYXYgPSAwLjA4O1xuLy8gTk8gTU9SRSBDT05GSUdVUklORyEgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbnBsYXllci5ncmF2aXR5ID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIGRZIC09IGdyYXY7XG59O1xucGxheWVyLm1vdmUgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgcGxheWVyLnBvcy54ICs9IGRYO1xuICAgIHBsYXllci5wb3MueSAtPSBkWTtcbiAgICBkWCAqPSAwLjk5O1xuICAgIGRZICo9IDAuOTk7XG59O1xucGxheWVyLnVwID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHNwZWVkICs9IGFjYztcbiAgICBkU3BlZWQgPSBlbGFwc2VkICogc3BlZWQ7XG4gICAgLy8gY29uc29sZS5sb2cocGxheWVyLnBvcy54LCBwbGF5ZXIucG9zLnkpO1xuICAgIC8vIGNvbnNvbGUubG9nKE1hdGguc2luKHBsYXllci5hbmdsZSkgKiBkU3BlZWQsIE1hdGguY29zKHBsYXllci5hbmdsZSkgKiBkU3BlZWQpO1xuICAgIGRYICs9IE1hdGguc2luKHBsYXllci5hbmdsZSkgKiBkU3BlZWQ7XG4gICAgZFkgKz0gTWF0aC5jb3MocGxheWVyLmFuZ2xlKSAqIGRTcGVlZDtcbiAgICBwbGF5ZXIubW92ZShlbGFwc2VkKTtcbiAgICBpZiAoc3BlZWQgPiBsaW0pIHtcbiAgICAgICAgc3BlZWQgPSBsaW07XG4gICAgfVxuICAgIGVsc2UgaWYgKHNwZWVkIDwgLWxpbSkge1xuICAgICAgICBzcGVlZCA9IC1saW07XG4gICAgfVxuXG4gICAgcGFydGljbGVzLmNyZWF0ZVBhcnRpY2xlcyhwbGF5ZXIucG9zLnggKyBoVywgcGxheWVyLnBvcy55ICsgcGxheWVyLmhlaWdodCwgcGxheWVyLmFuZ2xlLCBNYXRoLlBJIC8gMTAsIDEwLCAxMCk7XG59O1xucGxheWVyLnJpZ2h0ID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5hbmdsZSArPSBlbGFwc2VkICogdHVyblNwZWVkICogTWF0aC5QSTtcbn07XG5wbGF5ZXIubGVmdCA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBwbGF5ZXIuYW5nbGUgLT0gZWxhcHNlZCAqIHR1cm5TcGVlZCAqIE1hdGguUEk7XG59O1xucGxheWVyLmZsaXAgPSBmdW5jdGlvbigpIHtcbiAgICBwbGF5ZXIuYW5nbGUgKz0gTWF0aC5QSTtcbn07XG5cbnBsYXllci5kcmF3ID0gZnVuY3Rpb24oZWxhcHNlZCwgY3R4KSB7XG4gICAgcGFydGljbGVzLmRyYXcoY3R4LCBwbGF5ZXIpO1xuXG4gICAgY3R4LnNhdmUoKTtcbiAgICBjdHgudHJhbnNsYXRlKHJlY3QucG9zLngsIHJlY3QucG9zLnkpO1xuICAgIGN0eC5yb3RhdGUocmVjdC5hbmdsZSk7XG4gICAgY3R4LmZpbGxTdHlsZSA9ICdyZ2JhKDAsIDAsIDAsIDAuNSknO1xuICAgIGN0eC5maWxsUmVjdCgwLCAwLCByZWN0LndpZHRoLCByZWN0LmhlaWdodCk7XG4gICAgY3R4LnJlc3RvcmUoKTtcblxuICAgIGN0eC5zYXZlKCk7XG4gICAgY3R4LmZpbGxTdHlsZSA9IFNBVC50ZXN0UG9seWdvblBvbHlnb24ocGxheWVyLCByZWN0KSA/ICdncmVlbicgOiAnYmxhY2snO1xuICAgIGN0eC50cmFuc2xhdGUocGxheWVyLnBvcy54ICsgaFcsIHBsYXllci5wb3MueSArIGhIKTtcbiAgICBjdHgucm90YXRlKHBsYXllci5hbmdsZSk7XG4gICAgY3R4LmZpbGxSZWN0KC1oVywgLWhILCBwbGF5ZXIud2lkdGgsIHBsYXllci5oZWlnaHQpO1xuICAgIC8vIEZsYW1lc1xuICAgIGN0eC5maWxsU3R5bGUgPSAncmVkJztcbiAgICBjdHguZmlsbFJlY3QoLWhXLCBoSCwgcGxheWVyLndpZHRoLCA1KTtcbiAgICBjdHgucmVzdG9yZSgpO1xuXG4gICAgLy8gY3R4LmZpbGxSZWN0KHBsYXllci5wb3MueCwgcGxheWVyLnBvcy55LCAxMCwgMTApO1xufTtcbm1vZHVsZS5leHBvcnRzID0gcGxheWVyO1xuIiwiLy8gSG9sZHMgbGFzdCBpdGVyYXRpb24gdGltZXN0YW1wLlxudmFyIHRpbWUgPSAwO1xuXG4vKipcbiAqIENhbGxzIGBmbmAgb24gbmV4dCBmcmFtZS5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm4gVGhlIGZ1bmN0aW9uXG4gKiBAcmV0dXJuIHtpbnR9IFRoZSByZXF1ZXN0IElEXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gcmFmKGZuKSB7XG4gIHJldHVybiB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgIHZhciBlbGFwc2VkID0gbm93IC0gdGltZTtcblxuICAgIGlmIChlbGFwc2VkID4gOTk5KSB7XG4gICAgICBlbGFwc2VkID0gMSAvIDYwO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbGFwc2VkIC89IDEwMDA7XG4gICAgfVxuXG4gICAgdGltZSA9IG5vdztcbiAgICBmbihlbGFwc2VkKTtcbiAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAvKipcbiAgICogQ2FsbHMgYGZuYCBvbiBldmVyeSBmcmFtZSB3aXRoIGBlbGFwc2VkYCBzZXQgdG8gdGhlIGVsYXBzZWRcbiAgICogdGltZSBpbiBtaWxsaXNlY29uZHMuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiBUaGUgZnVuY3Rpb25cbiAgICogQHJldHVybiB7aW50fSBUaGUgcmVxdWVzdCBJRFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgc3RhcnQ6IGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIHJhZihmdW5jdGlvbiB0aWNrKGVsYXBzZWQpIHtcbiAgICAgIGZuKGVsYXBzZWQpO1xuICAgICAgcmFmKHRpY2spO1xuICAgIH0pO1xuICB9LFxuICAvKipcbiAgICogQ2FuY2VscyB0aGUgc3BlY2lmaWVkIGFuaW1hdGlvbiBmcmFtZSByZXF1ZXN0LlxuICAgKlxuICAgKiBAcGFyYW0ge2ludH0gaWQgVGhlIHJlcXVlc3QgSURcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHN0b3A6IGZ1bmN0aW9uKGlkKSB7XG4gICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKGlkKTtcbiAgfVxufTtcbiIsIi8qIFNBVC5qcyAtIFZlcnNpb24gMC40LjEgLSBDb3B5cmlnaHQgMjAxNCAtIEppbSBSaWVja2VuIDxqaW1yQGppbXIuY2E+IC0gcmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLiBodHRwczovL2dpdGh1Yi5jb20vanJpZWNrZW4vc2F0LWpzICovXG5mdW5jdGlvbiB3KCl7ZnVuY3Rpb24gYShiLGspe3RoaXMueD1ifHwwO3RoaXMueT1rfHwwfWZ1bmN0aW9uIGUoYixrKXt0aGlzLnBvcz1ifHxuZXcgYTt0aGlzLnBvaW50cz1rfHxbXTt0aGlzLmFuZ2xlPTA7dGhpcy5vZmZzZXQ9bmV3IGE7dGhpcy5yZWNhbGMoKX1mdW5jdGlvbiB1KGIsayxjKXt0aGlzLnBvcz1ifHxuZXcgYTt0aGlzLnc9a3x8MDt0aGlzLmg9Y3x8MH1mdW5jdGlvbiB2KCl7dGhpcy5iPXRoaXMuYT1udWxsO3RoaXMub3ZlcmxhcE49bmV3IGE7dGhpcy5vdmVybGFwVj1uZXcgYTt0aGlzLmNsZWFyKCl9ZnVuY3Rpb24geihiLGssYyl7Zm9yKHZhciBhPU51bWJlci5NQVhfVkFMVUUsZj0tTnVtYmVyLk1BWF9WQUxVRSxoPWIubGVuZ3RoLGw9MDtsPGg7bCsrKXt2YXIgZz1iW2xdLmQoayk7ZzxhJiYoYT1nKTtnPmYmJihmPWcpfWNbMF09YTtjWzFdPWZ9ZnVuY3Rpb24gQShiLGssYyxhLGYsaCl7dmFyIGw9cS5wb3AoKSxnPXEucG9wKCk7Yj1kLnBvcCgpLmMoaykuc3ViKGIpO1xuaz1iLmQoZik7eihjLGYsbCk7eihhLGYsZyk7Z1swXSs9aztnWzFdKz1rO2lmKGxbMF0+Z1sxXXx8Z1swXT5sWzFdKXJldHVybiBkLnB1c2goYikscS5wdXNoKGwpLHEucHVzaChnKSwhMDtoJiYoYz0wLGxbMF08Z1swXT8oaC5hSW5CPSExLGxbMV08Z1sxXT8oYz1sWzFdLWdbMF0saC5iSW5BPSExKTooYz1sWzFdLWdbMF0sYT1nWzFdLWxbMF0sYz1jPGE/YzotYSkpOihoLmJJbkE9ITEsbFsxXT5nWzFdPyhjPWxbMF0tZ1sxXSxoLmFJbkI9ITEpOihjPWxbMV0tZ1swXSxhPWdbMV0tbFswXSxjPWM8YT9jOi1hKSksYT1NYXRoLmFicyhjKSxhPGgub3ZlcmxhcCYmKGgub3ZlcmxhcD1hLGgub3ZlcmxhcE4uYyhmKSwwPmMmJmgub3ZlcmxhcE4ucmV2ZXJzZSgpKSk7ZC5wdXNoKGIpO3EucHVzaChsKTtxLnB1c2goZyk7cmV0dXJuITF9ZnVuY3Rpb24geChiLGspe3ZhciBjPWIuZSgpLGE9ay5kKGIpO3JldHVybiAwPmE/LTE6YT5jPzE6MH1mdW5jdGlvbiBCKGIsayxjKXtmb3IodmFyIGE9XG5kLnBvcCgpLmMoay5wb3MpLnN1YihiLnBvcyksZj1rLnIsaD1mKmYsbD1iLmNhbGNQb2ludHMsZz1sLmxlbmd0aCxzPWQucG9wKCkscD1kLnBvcCgpLG09MDttPGc7bSsrKXt2YXIgZT1tPT09Zy0xPzA6bSsxLHE9MD09PW0/Zy0xOm0tMSx0PTAscj1udWxsO3MuYyhiLmVkZ2VzW21dKTtwLmMoYSkuc3ViKGxbbV0pO2MmJnAuZSgpPmgmJihjLmFJbkI9ITEpO3ZhciBuPXgocyxwKTtpZigtMT09PW4pe3MuYyhiLmVkZ2VzW3FdKTtlPWQucG9wKCkuYyhhKS5zdWIobFtxXSk7bj14KHMsZSk7aWYoMT09PW4pe249cC5mKCk7aWYobj5mKXJldHVybiBkLnB1c2goYSksZC5wdXNoKHMpLGQucHVzaChwKSxkLnB1c2goZSksITE7YyYmKGMuYkluQT0hMSxyPXAubm9ybWFsaXplKCksdD1mLW4pfWQucHVzaChlKX1lbHNlIGlmKDE9PT1uKXtpZihzLmMoYi5lZGdlc1tlXSkscC5jKGEpLnN1YihsW2VdKSxuPXgocyxwKSwtMT09PW4pe249cC5mKCk7aWYobj5mKXJldHVybiBkLnB1c2goYSksZC5wdXNoKHMpLFxuZC5wdXNoKHApLCExO2MmJihjLmJJbkE9ITEscj1wLm5vcm1hbGl6ZSgpLHQ9Zi1uKX19ZWxzZXtlPXMuZygpLm5vcm1hbGl6ZSgpO249cC5kKGUpO3E9TWF0aC5hYnMobik7aWYoMDxuJiZxPmYpcmV0dXJuIGQucHVzaChhKSxkLnB1c2goZSksZC5wdXNoKHApLCExO2MmJihyPWUsdD1mLW4sMDw9bnx8dDwyKmYpJiYoYy5iSW5BPSExKX1yJiZjJiZNYXRoLmFicyh0KTxNYXRoLmFicyhjLm92ZXJsYXApJiYoYy5vdmVybGFwPXQsYy5vdmVybGFwTi5jKHIpKX1jJiYoYy5hPWIsYy5iPWssYy5vdmVybGFwVi5jKGMub3ZlcmxhcE4pLnNjYWxlKGMub3ZlcmxhcCkpO2QucHVzaChhKTtkLnB1c2gocyk7ZC5wdXNoKHApO3JldHVybiEwfWZ1bmN0aW9uIEMoYixhLGMpe2Zvcih2YXIgZD1iLmNhbGNQb2ludHMsZj1kLmxlbmd0aCxoPWEuY2FsY1BvaW50cyxsPWgubGVuZ3RoLGc9MDtnPGY7ZysrKWlmKEEoYi5wb3MsYS5wb3MsZCxoLGIubm9ybWFsc1tnXSxjKSlyZXR1cm4hMTtmb3IoZz0wO2c8XG5sO2crKylpZihBKGIucG9zLGEucG9zLGQsaCxhLm5vcm1hbHNbZ10sYykpcmV0dXJuITE7YyYmKGMuYT1iLGMuYj1hLGMub3ZlcmxhcFYuYyhjLm92ZXJsYXBOKS5zY2FsZShjLm92ZXJsYXApKTtyZXR1cm4hMH12YXIgbT17fTttLlZlY3Rvcj1hO20uVj1hO2EucHJvdG90eXBlLmNvcHk9YS5wcm90b3R5cGUuYz1mdW5jdGlvbihiKXt0aGlzLng9Yi54O3RoaXMueT1iLnk7cmV0dXJuIHRoaXN9O2EucHJvdG90eXBlLmNsb25lPWEucHJvdG90eXBlLmk9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGEodGhpcy54LHRoaXMueSl9O2EucHJvdG90eXBlLnBlcnA9YS5wcm90b3R5cGUuZz1mdW5jdGlvbigpe3ZhciBiPXRoaXMueDt0aGlzLng9dGhpcy55O3RoaXMueT0tYjtyZXR1cm4gdGhpc307YS5wcm90b3R5cGUucm90YXRlPWEucHJvdG90eXBlLnJvdGF0ZT1mdW5jdGlvbihiKXt2YXIgYT10aGlzLngsYz10aGlzLnk7dGhpcy54PWEqTWF0aC5jb3MoYiktYypNYXRoLnNpbihiKTt0aGlzLnk9XG5hKk1hdGguc2luKGIpK2MqTWF0aC5jb3MoYik7cmV0dXJuIHRoaXN9O2EucHJvdG90eXBlLnJldmVyc2U9YS5wcm90b3R5cGUucmV2ZXJzZT1mdW5jdGlvbigpe3RoaXMueD0tdGhpcy54O3RoaXMueT0tdGhpcy55O3JldHVybiB0aGlzfTthLnByb3RvdHlwZS5ub3JtYWxpemU9YS5wcm90b3R5cGUubm9ybWFsaXplPWZ1bmN0aW9uKCl7dmFyIGI9dGhpcy5mKCk7MDxiJiYodGhpcy54Lz1iLHRoaXMueS89Yik7cmV0dXJuIHRoaXN9O2EucHJvdG90eXBlLmFkZD1hLnByb3RvdHlwZS5hZGQ9ZnVuY3Rpb24oYil7dGhpcy54Kz1iLng7dGhpcy55Kz1iLnk7cmV0dXJuIHRoaXN9O2EucHJvdG90eXBlLnN1Yj1hLnByb3RvdHlwZS5zdWI9ZnVuY3Rpb24oYil7dGhpcy54LT1iLng7dGhpcy55LT1iLnk7cmV0dXJuIHRoaXN9O2EucHJvdG90eXBlLnNjYWxlPWEucHJvdG90eXBlLnNjYWxlPWZ1bmN0aW9uKGIsYSl7dGhpcy54Kj1iO3RoaXMueSo9YXx8YjtyZXR1cm4gdGhpc307YS5wcm90b3R5cGUucHJvamVjdD1cbmEucHJvdG90eXBlLmo9ZnVuY3Rpb24oYil7dmFyIGE9dGhpcy5kKGIpL2IuZSgpO3RoaXMueD1hKmIueDt0aGlzLnk9YSpiLnk7cmV0dXJuIHRoaXN9O2EucHJvdG90eXBlLnByb2plY3ROPWEucHJvdG90eXBlLms9ZnVuY3Rpb24oYil7dmFyIGE9dGhpcy5kKGIpO3RoaXMueD1hKmIueDt0aGlzLnk9YSpiLnk7cmV0dXJuIHRoaXN9O2EucHJvdG90eXBlLnJlZmxlY3Q9ZnVuY3Rpb24oYil7dmFyIGE9dGhpcy54LGM9dGhpcy55O3RoaXMuaihiKS5zY2FsZSgyKTt0aGlzLngtPWE7dGhpcy55LT1jO3JldHVybiB0aGlzfTthLnByb3RvdHlwZS5yZWZsZWN0Tj1mdW5jdGlvbihiKXt2YXIgYT10aGlzLngsYz10aGlzLnk7dGhpcy5rKGIpLnNjYWxlKDIpO3RoaXMueC09YTt0aGlzLnktPWM7cmV0dXJuIHRoaXN9O2EucHJvdG90eXBlLmRvdD1hLnByb3RvdHlwZS5kPWZ1bmN0aW9uKGIpe3JldHVybiB0aGlzLngqYi54K3RoaXMueSpiLnl9O2EucHJvdG90eXBlLmxlbjI9YS5wcm90b3R5cGUuZT1cbmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZCh0aGlzKX07YS5wcm90b3R5cGUubGVuPWEucHJvdG90eXBlLmY9ZnVuY3Rpb24oKXtyZXR1cm4gTWF0aC5zcXJ0KHRoaXMuZSgpKX07bS5DaXJjbGU9ZnVuY3Rpb24oYixrKXt0aGlzLnBvcz1ifHxuZXcgYTt0aGlzLnI9a3x8MH07bS5Qb2x5Z29uPWU7ZS5wcm90b3R5cGUuc2V0UG9pbnRzPWZ1bmN0aW9uKGIpe3RoaXMucG9pbnRzPWI7dGhpcy5yZWNhbGMoKTtyZXR1cm4gdGhpc307ZS5wcm90b3R5cGUuc2V0QW5nbGU9ZnVuY3Rpb24oYil7dGhpcy5hbmdsZT1iO3RoaXMucmVjYWxjKCk7cmV0dXJuIHRoaXN9O2UucHJvdG90eXBlLnNldE9mZnNldD1mdW5jdGlvbihiKXt0aGlzLm9mZnNldD1iO3RoaXMucmVjYWxjKCk7cmV0dXJuIHRoaXN9O2UucHJvdG90eXBlLnJvdGF0ZT1lLnByb3RvdHlwZS5yb3RhdGU9ZnVuY3Rpb24oYil7Zm9yKHZhciBhPXRoaXMucG9pbnRzLGM9YS5sZW5ndGgsZD0wO2Q8YztkKyspYVtkXS5yb3RhdGUoYik7dGhpcy5yZWNhbGMoKTtcbnJldHVybiB0aGlzfTtlLnByb3RvdHlwZS50cmFuc2xhdGU9ZS5wcm90b3R5cGUudHJhbnNsYXRlPWZ1bmN0aW9uKGIsYSl7Zm9yKHZhciBjPXRoaXMucG9pbnRzLGQ9Yy5sZW5ndGgsZj0wO2Y8ZDtmKyspY1tmXS54Kz1iLGNbZl0ueSs9YTt0aGlzLnJlY2FsYygpO3JldHVybiB0aGlzfTtlLnByb3RvdHlwZS5yZWNhbGM9ZS5wcm90b3R5cGUucmVjYWxjPWZ1bmN0aW9uKCl7dmFyIGIsaz10aGlzLmNhbGNQb2ludHM9W10sYz10aGlzLmVkZ2VzPVtdLGQ9dGhpcy5ub3JtYWxzPVtdLGY9dGhpcy5wb2ludHMsaD10aGlzLm9mZnNldCxsPXRoaXMuYW5nbGUsZz1mLmxlbmd0aDtmb3IoYj0wO2I8ZztiKyspe3ZhciBlPWZbYl0uaSgpO2sucHVzaChlKTtlLngrPWgueDtlLnkrPWgueTswIT09bCYmZS5yb3RhdGUobCl9Zm9yKGI9MDtiPGc7YisrKWY9KG5ldyBhKS5jKGI8Zy0xP2tbYisxXTprWzBdKS5zdWIoa1tiXSksaD0obmV3IGEpLmMoZikuZygpLm5vcm1hbGl6ZSgpLGMucHVzaChmKSxcbmQucHVzaChoKTtyZXR1cm4gdGhpc307bS5Cb3g9dTt1LnByb3RvdHlwZS50b1BvbHlnb249dS5wcm90b3R5cGUubD1mdW5jdGlvbigpe3ZhciBiPXRoaXMucG9zLGs9dGhpcy53LGM9dGhpcy5oO3JldHVybiBuZXcgZShuZXcgYShiLngsYi55KSxbbmV3IGEsbmV3IGEoaywwKSxuZXcgYShrLGMpLG5ldyBhKDAsYyldKX07bS5SZXNwb25zZT12O3YucHJvdG90eXBlLmNsZWFyPXYucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7dGhpcy5iSW5BPXRoaXMuYUluQj0hMDt0aGlzLm92ZXJsYXA9TnVtYmVyLk1BWF9WQUxVRTtyZXR1cm4gdGhpc307Zm9yKHZhciBkPVtdLHI9MDsxMD5yO3IrKylkLnB1c2gobmV3IGEpO2Zvcih2YXIgcT1bXSxyPTA7NT5yO3IrKylxLnB1c2goW10pO3ZhciB5PW5ldyB2LEQ9KG5ldyB1KG5ldyBhLDEsMSkpLmwoKTttLnBvaW50SW5DaXJjbGU9ZnVuY3Rpb24oYixhKXt2YXIgYz1kLnBvcCgpLmMoYikuc3ViKGEucG9zKSxlPWEuciphLnIsZj1jLmUoKTtkLnB1c2goYyk7XG5yZXR1cm4gZjw9ZX07bS5wb2ludEluUG9seWdvbj1mdW5jdGlvbihiLGEpe0QucG9zLmMoYik7eS5jbGVhcigpO3ZhciBjPUMoRCxhLHkpO2MmJihjPXkuYUluQik7cmV0dXJuIGN9O20udGVzdENpcmNsZUNpcmNsZT1mdW5jdGlvbihiLGEsYyl7dmFyIGU9ZC5wb3AoKS5jKGEucG9zKS5zdWIoYi5wb3MpLGY9Yi5yK2EucixoPWUuZSgpO2lmKGg+ZipmKXJldHVybiBkLnB1c2goZSksITE7YyYmKGg9TWF0aC5zcXJ0KGgpLGMuYT1iLGMuYj1hLGMub3ZlcmxhcD1mLWgsYy5vdmVybGFwTi5jKGUubm9ybWFsaXplKCkpLGMub3ZlcmxhcFYuYyhlKS5zY2FsZShjLm92ZXJsYXApLGMuYUluQj1iLnI8PWEuciYmaDw9YS5yLWIucixjLmJJbkE9YS5yPD1iLnImJmg8PWIuci1hLnIpO2QucHVzaChlKTtyZXR1cm4hMH07bS50ZXN0UG9seWdvbkNpcmNsZT1CO20udGVzdENpcmNsZVBvbHlnb249ZnVuY3Rpb24oYSxkLGMpe2lmKChhPUIoZCxhLGMpKSYmYyl7ZD1jLmE7dmFyIGU9Yy5hSW5CO2Mub3ZlcmxhcE4ucmV2ZXJzZSgpO1xuYy5vdmVybGFwVi5yZXZlcnNlKCk7Yy5hPWMuYjtjLmI9ZDtjLmFJbkI9Yy5iSW5BO2MuYkluQT1lfXJldHVybiBhfTttLnRlc3RQb2x5Z29uUG9seWdvbj1DO3JldHVybiBtfVwiZnVuY3Rpb25cIj09PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKHcpOlwib2JqZWN0XCI9PT10eXBlb2YgZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz13KCk6dGhpcy5TQVQ9dygpOyJdfQ==
