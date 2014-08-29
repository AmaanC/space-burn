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

},{}],4:[function(require,module,exports){
var particles = require('./particles');
var SAT = require('./sat.min.js');

window.player = new SAT.Polygon(new SAT.V(), [
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

},{"./particles":3,"./sat.min.js":6}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4vc3JjL21haW4iLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy9rZXlzLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvSlMxM2svMjAxNC9zcmMvcGFydGljbGVzLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvSlMxM2svMjAxNC9zcmMvcGxheWVyLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvSlMxM2svMjAxNC9zcmMvcmFmLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvSlMxM2svMjAxNC9zcmMvc2F0Lm1pbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgcmFmID0gcmVxdWlyZSgnLi9yYWYnKTtcbnZhciBwbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpO1xudmFyIGtleSA9IHJlcXVpcmUoJy4va2V5cycpO1xuXG52YXIgY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2dhbWUnKTtcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxucmFmLnN0YXJ0KGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICAvLyBDbGVhciB0aGUgc2NyZWVuXG4gICAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICAgIHBsYXllci5kcmF3KGVsYXBzZWQsIGN0eCk7XG4gICAgcGxheWVyLmdyYXZpdHkoZWxhcHNlZCk7XG4gICAgaWYgKGtleS51cCgpKSB7XG4gICAgICAgIHBsYXllci51cChlbGFwc2VkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhwbGF5ZXIueCwgcGxheWVyLnkpO1xuICAgICAgICBwbGF5ZXIubW92ZShlbGFwc2VkKTtcbiAgICB9XG5cbiAgICBpZiAoa2V5LnJpZ2h0KCkpIHtcbiAgICAgICAgcGxheWVyLnJpZ2h0KGVsYXBzZWQpO1xuICAgIH1cbiAgICBpZiAoa2V5LmxlZnQoKSkge1xuICAgICAgICBwbGF5ZXIubGVmdChlbGFwc2VkKTtcbiAgICB9XG59KTtcbiIsInZhciBwbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpO1xudmFyIGtleXMgPSB7fTtcbmRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAoZS5rZXlDb2RlID09PSAzMikge1xuICAgICAgICBwbGF5ZXIuZmxpcCgpO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuICAgIGtleXNbZS5rZXlDb2RlXSA9IHRydWU7XG59KTtcbmRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdGlvbihlKSB7XG4gICAga2V5c1tlLmtleUNvZGVdID0gZmFsc2U7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbGVmdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzWzM3XTtcbiAgICB9LFxuICAgIHVwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbMzhdO1xuICAgIH0sXG4gICAgcmlnaHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1szOV07XG4gICAgfSxcbiAgICBkb3duOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbNDBdO1xuICAgIH0sXG4gICAgZmxpcDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzWzMyXTtcbiAgICB9XG59O1xuIiwidmFyIHBhcnRpY2xlcyA9IFtdO1xudmFyIFcgPSA1LCBIID0gNTtcbnZhciBQYXJ0aWNsZSA9IGZ1bmN0aW9uKHgsIHksIGFuZ2xlLCBzcGVlZCkge1xuICAgIHRoaXMuYWxpdmUgPSB0cnVlO1xuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgICB0aGlzLmFuZ2xlID0gYW5nbGU7XG4gICAgdGhpcy5zcGVlZCA9IHNwZWVkO1xuICAgIHRoaXMub3BhY2l0eSA9IDE7XG4gICAgdGhpcy5kZWxheSA9IE1hdGgucmFuZG9tKCkgKiAxMDtcbiAgICB0aGlzLmxvb3AgPSBmdW5jdGlvbihjdHgsIHBsYXllcikge1xuICAgICAgICBpZiAodGhpcy5kZWxheSA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuZGVsYXktLTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5kZWxheSA9PT0gMSkge1xuICAgICAgICAgICAgdGhpcy54ID0gcGxheWVyLng7XG4gICAgICAgICAgICB0aGlzLnkgPSBwbGF5ZXIueSArIHBsYXllci5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy54ICs9IE1hdGguc2luKC10aGlzLmFuZ2xlKSAqIHNwZWVkO1xuICAgICAgICB0aGlzLnkgKz0gTWF0aC5jb3MoLXRoaXMuYW5nbGUpICogc3BlZWQ7XG4gICAgICAgIHRoaXMub3BhY2l0eSAtPSAwLjE7XG4gICAgICAgIGlmICh0aGlzLm9wYWNpdHkgPD0gMCkge1xuICAgICAgICAgICAgdGhpcy5vcGFjaXR5ID0gMDtcbiAgICAgICAgICAgIHRoaXMuYWxpdmUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBEcmF3XG4gICAgICAgIGN0eC5zYXZlKCk7XG4gICAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IHRoaXMub3BhY2l0eTtcbiAgICAgICAgY3R4LnRyYW5zbGF0ZSh0aGlzLngsIHRoaXMueSk7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAncmVkJztcbiAgICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIFcsIEgpO1xuICAgICAgICBjdHgucmVzdG9yZSgpO1xuICAgIH07XG59O1xuXG4vLyB4LCB5IGFyZSBmaXhlZFxuLy8gUGFydGljbGVzIGFyZSBjcmVhdGVkIGZyb20gYW5nbGUtcmFuZ2UgdG8gYW5nbGUrcmFuZ2Vcbi8vIHNwZWVkIGlzIGZpeGVkXG52YXIgYW5nbGUgPSAwO1xudmFyIGNyZWF0ZVBhcnRpY2xlcyA9IGZ1bmN0aW9uKHgsIHksIHBsYXllckFuZ2xlLCByYW5nZSwgc3BlZWQsIG4pIHtcbiAgICAvLyBjb25zb2xlLmxvZygnQ3JlYXRpbmcnLCBwYXJ0aWNsZXMpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGFuZ2xlID0gcGxheWVyQW5nbGUgLSByYW5nZSArIChNYXRoLnJhbmRvbSgpICogMiAqIHJhbmdlKTtcbiAgICAgICAgaWYgKHBhcnRpY2xlc1tpXSAmJiAhcGFydGljbGVzW2ldLmFsaXZlIHx8ICFwYXJ0aWNsZXNbaV0pIHtcbiAgICAgICAgICAgIHBhcnRpY2xlc1tpXSA9IG5ldyBQYXJ0aWNsZSh4LCB5LCBhbmdsZSwgc3BlZWQpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxudmFyIGRyYXcgPSBmdW5jdGlvbihjdHgsIHBsYXllcikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydGljbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHBhcnRpY2xlc1tpXS5sb29wKGN0eCwgcGxheWVyKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjcmVhdGVQYXJ0aWNsZXM6IGNyZWF0ZVBhcnRpY2xlcyxcbiAgICBkcmF3OiBkcmF3XG59O1xuIiwidmFyIHBhcnRpY2xlcyA9IHJlcXVpcmUoJy4vcGFydGljbGVzJyk7XG52YXIgU0FUID0gcmVxdWlyZSgnLi9zYXQubWluLmpzJyk7XG5cbndpbmRvdy5wbGF5ZXIgPSBuZXcgU0FULlBvbHlnb24obmV3IFNBVC5WKCksIFtcbiAgbmV3IFNBVC5WKCksXG4gIG5ldyBTQVQuVigwLCAzMCksXG4gIG5ldyBTQVQuVigxMCwgMzApLFxuICBuZXcgU0FULlYoMTAsIDApXG5dKTtcblxucGxheWVyLndpZHRoID0gMTA7XG5wbGF5ZXIuaGVpZ2h0ID0gMzA7XG5wbGF5ZXIuc2V0QW5nbGUoMCk7XG5cblxudmFyIHJlY3QgPSBuZXcgU0FULlBvbHlnb24obmV3IFNBVC5WKCksIFtcbiAgICBuZXcgU0FULlYoKSxcbiAgICBuZXcgU0FULlYoMCwgMzAwKSxcbiAgICBuZXcgU0FULlYoODAwLCAzMDApLFxuICAgIG5ldyBTQVQuVig4MDAsIDApXG5dKTtcbnJlY3Qud2lkdGggPSA4MDA7XG5yZWN0LmhlaWdodCA9IDMwMDtcbnJlY3Quc2V0QW5nbGUoTWF0aC5QSS82KTtcbndpbmRvdy5yZWN0ID0gcmVjdDtcblxuXG4vLyBIYWxmIHdpZHRoLCBoYWxmIGhlaWdodFxudmFyIGhXID0gcGxheWVyLndpZHRoIC8gMjtcbnZhciBoSCA9IHBsYXllci5oZWlnaHQgLyAyO1xuXG52YXIgc3BlZWQgPSAwOyAvLyBUaGUgY3VycmVudCBzcGVlZFxudmFyIGRTcGVlZDtcbnZhciBkWCA9IDAsIGRZID0gMDtcblxuLy8gWU9VIENBTiBDT05GSUdVUkUgVEhFU0UhIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG52YXIgYWNjID0gNzsgLy8gQWNjZWxlcmF0aW9uXG52YXIgbGltID0gODsgLy8gU3BlZWQgbGltaXRcbnZhciB0dXJuU3BlZWQgPSAyLjI7XG52YXIgZ3JhdiA9IDAuMDg7XG4vLyBOTyBNT1JFIENPTkZJR1VSSU5HISAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxucGxheWVyLmdyYXZpdHkgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgZFkgLT0gZ3Jhdjtcbn07XG5wbGF5ZXIubW92ZSA9IGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICBwbGF5ZXIucG9zLnggKz0gZFg7XG4gICAgcGxheWVyLnBvcy55IC09IGRZO1xuICAgIGRYICo9IDAuOTk7XG4gICAgZFkgKj0gMC45OTtcbn07XG5wbGF5ZXIudXAgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgc3BlZWQgKz0gYWNjO1xuICAgIGRTcGVlZCA9IGVsYXBzZWQgKiBzcGVlZDtcbiAgICAvLyBjb25zb2xlLmxvZyhwbGF5ZXIucG9zLngsIHBsYXllci5wb3MueSk7XG4gICAgLy8gY29uc29sZS5sb2coTWF0aC5zaW4ocGxheWVyLmFuZ2xlKSAqIGRTcGVlZCwgTWF0aC5jb3MocGxheWVyLmFuZ2xlKSAqIGRTcGVlZCk7XG4gICAgZFggKz0gTWF0aC5zaW4ocGxheWVyLmFuZ2xlKSAqIGRTcGVlZDtcbiAgICBkWSArPSBNYXRoLmNvcyhwbGF5ZXIuYW5nbGUpICogZFNwZWVkO1xuICAgIHBsYXllci5tb3ZlKGVsYXBzZWQpO1xuICAgIGlmIChzcGVlZCA+IGxpbSkge1xuICAgICAgICBzcGVlZCA9IGxpbTtcbiAgICB9XG4gICAgZWxzZSBpZiAoc3BlZWQgPCAtbGltKSB7XG4gICAgICAgIHNwZWVkID0gLWxpbTtcbiAgICB9XG5cbiAgICBwYXJ0aWNsZXMuY3JlYXRlUGFydGljbGVzKHBsYXllci5wb3MueCArIGhXLCBwbGF5ZXIucG9zLnkgKyBwbGF5ZXIuaGVpZ2h0LCBwbGF5ZXIuYW5nbGUsIE1hdGguUEkgLyAxMCwgMTAsIDEwKTtcbn07XG5wbGF5ZXIucmlnaHQgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgcGxheWVyLmFuZ2xlICs9IGVsYXBzZWQgKiB0dXJuU3BlZWQgKiBNYXRoLlBJO1xufTtcbnBsYXllci5sZWZ0ID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5hbmdsZSAtPSBlbGFwc2VkICogdHVyblNwZWVkICogTWF0aC5QSTtcbn07XG5wbGF5ZXIuZmxpcCA9IGZ1bmN0aW9uKCkge1xuICAgIHBsYXllci5hbmdsZSArPSBNYXRoLlBJO1xufTtcblxucGxheWVyLmRyYXcgPSBmdW5jdGlvbihlbGFwc2VkLCBjdHgpIHtcbiAgICBwYXJ0aWNsZXMuZHJhdyhjdHgsIHBsYXllcik7XG5cbiAgICBjdHguc2F2ZSgpO1xuICAgIGN0eC50cmFuc2xhdGUocmVjdC5wb3MueCwgcmVjdC5wb3MueSk7XG4gICAgY3R4LnJvdGF0ZShyZWN0LmFuZ2xlKTtcbiAgICBjdHguZmlsbFN0eWxlID0gJ3JnYmEoMCwgMCwgMCwgMC41KSc7XG4gICAgY3R4LmZpbGxSZWN0KDAsIDAsIHJlY3Qud2lkdGgsIHJlY3QuaGVpZ2h0KTtcbiAgICBjdHgucmVzdG9yZSgpO1xuXG4gICAgY3R4LnNhdmUoKTtcbiAgICBjdHguZmlsbFN0eWxlID0gU0FULnRlc3RQb2x5Z29uUG9seWdvbihwbGF5ZXIsIHJlY3QpID8gJ2dyZWVuJyA6ICdibGFjayc7XG4gICAgY3R4LnRyYW5zbGF0ZShwbGF5ZXIucG9zLnggKyBoVywgcGxheWVyLnBvcy55ICsgaEgpO1xuICAgIGN0eC5yb3RhdGUocGxheWVyLmFuZ2xlKTtcbiAgICBjdHguZmlsbFJlY3QoLWhXLCAtaEgsIHBsYXllci53aWR0aCwgcGxheWVyLmhlaWdodCk7XG4gICAgLy8gRmxhbWVzXG4gICAgY3R4LmZpbGxTdHlsZSA9ICdyZWQnO1xuICAgIGN0eC5maWxsUmVjdCgtaFcsIGhILCBwbGF5ZXIud2lkdGgsIDUpO1xuICAgIGN0eC5yZXN0b3JlKCk7XG5cbiAgICAvLyBjdHguZmlsbFJlY3QocGxheWVyLnBvcy54LCBwbGF5ZXIucG9zLnksIDEwLCAxMCk7XG59O1xubW9kdWxlLmV4cG9ydHMgPSBwbGF5ZXI7XG4iLCIvLyBIb2xkcyBsYXN0IGl0ZXJhdGlvbiB0aW1lc3RhbXAuXG52YXIgdGltZSA9IDA7XG5cbi8qKlxuICogQ2FsbHMgYGZuYCBvbiBuZXh0IGZyYW1lLlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiBUaGUgZnVuY3Rpb25cbiAqIEByZXR1cm4ge2ludH0gVGhlIHJlcXVlc3QgSURcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiByYWYoZm4pIHtcbiAgcmV0dXJuIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgdmFyIGVsYXBzZWQgPSBub3cgLSB0aW1lO1xuXG4gICAgaWYgKGVsYXBzZWQgPiA5OTkpIHtcbiAgICAgIGVsYXBzZWQgPSAxIC8gNjA7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsYXBzZWQgLz0gMTAwMDtcbiAgICB9XG5cbiAgICB0aW1lID0gbm93O1xuICAgIGZuKGVsYXBzZWQpO1xuICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIC8qKlxuICAgKiBDYWxscyBgZm5gIG9uIGV2ZXJ5IGZyYW1lIHdpdGggYGVsYXBzZWRgIHNldCB0byB0aGUgZWxhcHNlZFxuICAgKiB0aW1lIGluIG1pbGxpc2Vjb25kcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuIFRoZSBmdW5jdGlvblxuICAgKiBAcmV0dXJuIHtpbnR9IFRoZSByZXF1ZXN0IElEXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzdGFydDogZnVuY3Rpb24oZm4pIHtcbiAgICByZXR1cm4gcmFmKGZ1bmN0aW9uIHRpY2soZWxhcHNlZCkge1xuICAgICAgZm4oZWxhcHNlZCk7XG4gICAgICByYWYodGljayk7XG4gICAgfSk7XG4gIH0sXG4gIC8qKlxuICAgKiBDYW5jZWxzIHRoZSBzcGVjaWZpZWQgYW5pbWF0aW9uIGZyYW1lIHJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSB7aW50fSBpZCBUaGUgcmVxdWVzdCBJRFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgc3RvcDogZnVuY3Rpb24oaWQpIHtcbiAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoaWQpO1xuICB9XG59O1xuIiwiLyogU0FULmpzIC0gVmVyc2lvbiAwLjQuMSAtIENvcHlyaWdodCAyMDE0IC0gSmltIFJpZWNrZW4gPGppbXJAamltci5jYT4gLSByZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuIGh0dHBzOi8vZ2l0aHViLmNvbS9qcmllY2tlbi9zYXQtanMgKi9cbmZ1bmN0aW9uIHcoKXtmdW5jdGlvbiBhKGIsayl7dGhpcy54PWJ8fDA7dGhpcy55PWt8fDB9ZnVuY3Rpb24gZShiLGspe3RoaXMucG9zPWJ8fG5ldyBhO3RoaXMucG9pbnRzPWt8fFtdO3RoaXMuYW5nbGU9MDt0aGlzLm9mZnNldD1uZXcgYTt0aGlzLnJlY2FsYygpfWZ1bmN0aW9uIHUoYixrLGMpe3RoaXMucG9zPWJ8fG5ldyBhO3RoaXMudz1rfHwwO3RoaXMuaD1jfHwwfWZ1bmN0aW9uIHYoKXt0aGlzLmI9dGhpcy5hPW51bGw7dGhpcy5vdmVybGFwTj1uZXcgYTt0aGlzLm92ZXJsYXBWPW5ldyBhO3RoaXMuY2xlYXIoKX1mdW5jdGlvbiB6KGIsayxjKXtmb3IodmFyIGE9TnVtYmVyLk1BWF9WQUxVRSxmPS1OdW1iZXIuTUFYX1ZBTFVFLGg9Yi5sZW5ndGgsbD0wO2w8aDtsKyspe3ZhciBnPWJbbF0uZChrKTtnPGEmJihhPWcpO2c+ZiYmKGY9Zyl9Y1swXT1hO2NbMV09Zn1mdW5jdGlvbiBBKGIsayxjLGEsZixoKXt2YXIgbD1xLnBvcCgpLGc9cS5wb3AoKTtiPWQucG9wKCkuYyhrKS5zdWIoYik7XG5rPWIuZChmKTt6KGMsZixsKTt6KGEsZixnKTtnWzBdKz1rO2dbMV0rPWs7aWYobFswXT5nWzFdfHxnWzBdPmxbMV0pcmV0dXJuIGQucHVzaChiKSxxLnB1c2gobCkscS5wdXNoKGcpLCEwO2gmJihjPTAsbFswXTxnWzBdPyhoLmFJbkI9ITEsbFsxXTxnWzFdPyhjPWxbMV0tZ1swXSxoLmJJbkE9ITEpOihjPWxbMV0tZ1swXSxhPWdbMV0tbFswXSxjPWM8YT9jOi1hKSk6KGguYkluQT0hMSxsWzFdPmdbMV0/KGM9bFswXS1nWzFdLGguYUluQj0hMSk6KGM9bFsxXS1nWzBdLGE9Z1sxXS1sWzBdLGM9YzxhP2M6LWEpKSxhPU1hdGguYWJzKGMpLGE8aC5vdmVybGFwJiYoaC5vdmVybGFwPWEsaC5vdmVybGFwTi5jKGYpLDA+YyYmaC5vdmVybGFwTi5yZXZlcnNlKCkpKTtkLnB1c2goYik7cS5wdXNoKGwpO3EucHVzaChnKTtyZXR1cm4hMX1mdW5jdGlvbiB4KGIsayl7dmFyIGM9Yi5lKCksYT1rLmQoYik7cmV0dXJuIDA+YT8tMTphPmM/MTowfWZ1bmN0aW9uIEIoYixrLGMpe2Zvcih2YXIgYT1cbmQucG9wKCkuYyhrLnBvcykuc3ViKGIucG9zKSxmPWsucixoPWYqZixsPWIuY2FsY1BvaW50cyxnPWwubGVuZ3RoLHM9ZC5wb3AoKSxwPWQucG9wKCksbT0wO208ZzttKyspe3ZhciBlPW09PT1nLTE/MDptKzEscT0wPT09bT9nLTE6bS0xLHQ9MCxyPW51bGw7cy5jKGIuZWRnZXNbbV0pO3AuYyhhKS5zdWIobFttXSk7YyYmcC5lKCk+aCYmKGMuYUluQj0hMSk7dmFyIG49eChzLHApO2lmKC0xPT09bil7cy5jKGIuZWRnZXNbcV0pO2U9ZC5wb3AoKS5jKGEpLnN1YihsW3FdKTtuPXgocyxlKTtpZigxPT09bil7bj1wLmYoKTtpZihuPmYpcmV0dXJuIGQucHVzaChhKSxkLnB1c2gocyksZC5wdXNoKHApLGQucHVzaChlKSwhMTtjJiYoYy5iSW5BPSExLHI9cC5ub3JtYWxpemUoKSx0PWYtbil9ZC5wdXNoKGUpfWVsc2UgaWYoMT09PW4pe2lmKHMuYyhiLmVkZ2VzW2VdKSxwLmMoYSkuc3ViKGxbZV0pLG49eChzLHApLC0xPT09bil7bj1wLmYoKTtpZihuPmYpcmV0dXJuIGQucHVzaChhKSxkLnB1c2gocyksXG5kLnB1c2gocCksITE7YyYmKGMuYkluQT0hMSxyPXAubm9ybWFsaXplKCksdD1mLW4pfX1lbHNle2U9cy5nKCkubm9ybWFsaXplKCk7bj1wLmQoZSk7cT1NYXRoLmFicyhuKTtpZigwPG4mJnE+ZilyZXR1cm4gZC5wdXNoKGEpLGQucHVzaChlKSxkLnB1c2gocCksITE7YyYmKHI9ZSx0PWYtbiwwPD1ufHx0PDIqZikmJihjLmJJbkE9ITEpfXImJmMmJk1hdGguYWJzKHQpPE1hdGguYWJzKGMub3ZlcmxhcCkmJihjLm92ZXJsYXA9dCxjLm92ZXJsYXBOLmMocikpfWMmJihjLmE9YixjLmI9ayxjLm92ZXJsYXBWLmMoYy5vdmVybGFwTikuc2NhbGUoYy5vdmVybGFwKSk7ZC5wdXNoKGEpO2QucHVzaChzKTtkLnB1c2gocCk7cmV0dXJuITB9ZnVuY3Rpb24gQyhiLGEsYyl7Zm9yKHZhciBkPWIuY2FsY1BvaW50cyxmPWQubGVuZ3RoLGg9YS5jYWxjUG9pbnRzLGw9aC5sZW5ndGgsZz0wO2c8ZjtnKyspaWYoQShiLnBvcyxhLnBvcyxkLGgsYi5ub3JtYWxzW2ddLGMpKXJldHVybiExO2ZvcihnPTA7Zzxcbmw7ZysrKWlmKEEoYi5wb3MsYS5wb3MsZCxoLGEubm9ybWFsc1tnXSxjKSlyZXR1cm4hMTtjJiYoYy5hPWIsYy5iPWEsYy5vdmVybGFwVi5jKGMub3ZlcmxhcE4pLnNjYWxlKGMub3ZlcmxhcCkpO3JldHVybiEwfXZhciBtPXt9O20uVmVjdG9yPWE7bS5WPWE7YS5wcm90b3R5cGUuY29weT1hLnByb3RvdHlwZS5jPWZ1bmN0aW9uKGIpe3RoaXMueD1iLng7dGhpcy55PWIueTtyZXR1cm4gdGhpc307YS5wcm90b3R5cGUuY2xvbmU9YS5wcm90b3R5cGUuaT1mdW5jdGlvbigpe3JldHVybiBuZXcgYSh0aGlzLngsdGhpcy55KX07YS5wcm90b3R5cGUucGVycD1hLnByb3RvdHlwZS5nPWZ1bmN0aW9uKCl7dmFyIGI9dGhpcy54O3RoaXMueD10aGlzLnk7dGhpcy55PS1iO3JldHVybiB0aGlzfTthLnByb3RvdHlwZS5yb3RhdGU9YS5wcm90b3R5cGUucm90YXRlPWZ1bmN0aW9uKGIpe3ZhciBhPXRoaXMueCxjPXRoaXMueTt0aGlzLng9YSpNYXRoLmNvcyhiKS1jKk1hdGguc2luKGIpO3RoaXMueT1cbmEqTWF0aC5zaW4oYikrYypNYXRoLmNvcyhiKTtyZXR1cm4gdGhpc307YS5wcm90b3R5cGUucmV2ZXJzZT1hLnByb3RvdHlwZS5yZXZlcnNlPWZ1bmN0aW9uKCl7dGhpcy54PS10aGlzLng7dGhpcy55PS10aGlzLnk7cmV0dXJuIHRoaXN9O2EucHJvdG90eXBlLm5vcm1hbGl6ZT1hLnByb3RvdHlwZS5ub3JtYWxpemU9ZnVuY3Rpb24oKXt2YXIgYj10aGlzLmYoKTswPGImJih0aGlzLngvPWIsdGhpcy55Lz1iKTtyZXR1cm4gdGhpc307YS5wcm90b3R5cGUuYWRkPWEucHJvdG90eXBlLmFkZD1mdW5jdGlvbihiKXt0aGlzLngrPWIueDt0aGlzLnkrPWIueTtyZXR1cm4gdGhpc307YS5wcm90b3R5cGUuc3ViPWEucHJvdG90eXBlLnN1Yj1mdW5jdGlvbihiKXt0aGlzLngtPWIueDt0aGlzLnktPWIueTtyZXR1cm4gdGhpc307YS5wcm90b3R5cGUuc2NhbGU9YS5wcm90b3R5cGUuc2NhbGU9ZnVuY3Rpb24oYixhKXt0aGlzLngqPWI7dGhpcy55Kj1hfHxiO3JldHVybiB0aGlzfTthLnByb3RvdHlwZS5wcm9qZWN0PVxuYS5wcm90b3R5cGUuaj1mdW5jdGlvbihiKXt2YXIgYT10aGlzLmQoYikvYi5lKCk7dGhpcy54PWEqYi54O3RoaXMueT1hKmIueTtyZXR1cm4gdGhpc307YS5wcm90b3R5cGUucHJvamVjdE49YS5wcm90b3R5cGUuaz1mdW5jdGlvbihiKXt2YXIgYT10aGlzLmQoYik7dGhpcy54PWEqYi54O3RoaXMueT1hKmIueTtyZXR1cm4gdGhpc307YS5wcm90b3R5cGUucmVmbGVjdD1mdW5jdGlvbihiKXt2YXIgYT10aGlzLngsYz10aGlzLnk7dGhpcy5qKGIpLnNjYWxlKDIpO3RoaXMueC09YTt0aGlzLnktPWM7cmV0dXJuIHRoaXN9O2EucHJvdG90eXBlLnJlZmxlY3ROPWZ1bmN0aW9uKGIpe3ZhciBhPXRoaXMueCxjPXRoaXMueTt0aGlzLmsoYikuc2NhbGUoMik7dGhpcy54LT1hO3RoaXMueS09YztyZXR1cm4gdGhpc307YS5wcm90b3R5cGUuZG90PWEucHJvdG90eXBlLmQ9ZnVuY3Rpb24oYil7cmV0dXJuIHRoaXMueCpiLngrdGhpcy55KmIueX07YS5wcm90b3R5cGUubGVuMj1hLnByb3RvdHlwZS5lPVxuZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5kKHRoaXMpfTthLnByb3RvdHlwZS5sZW49YS5wcm90b3R5cGUuZj1mdW5jdGlvbigpe3JldHVybiBNYXRoLnNxcnQodGhpcy5lKCkpfTttLkNpcmNsZT1mdW5jdGlvbihiLGspe3RoaXMucG9zPWJ8fG5ldyBhO3RoaXMucj1rfHwwfTttLlBvbHlnb249ZTtlLnByb3RvdHlwZS5zZXRQb2ludHM9ZnVuY3Rpb24oYil7dGhpcy5wb2ludHM9Yjt0aGlzLnJlY2FsYygpO3JldHVybiB0aGlzfTtlLnByb3RvdHlwZS5zZXRBbmdsZT1mdW5jdGlvbihiKXt0aGlzLmFuZ2xlPWI7dGhpcy5yZWNhbGMoKTtyZXR1cm4gdGhpc307ZS5wcm90b3R5cGUuc2V0T2Zmc2V0PWZ1bmN0aW9uKGIpe3RoaXMub2Zmc2V0PWI7dGhpcy5yZWNhbGMoKTtyZXR1cm4gdGhpc307ZS5wcm90b3R5cGUucm90YXRlPWUucHJvdG90eXBlLnJvdGF0ZT1mdW5jdGlvbihiKXtmb3IodmFyIGE9dGhpcy5wb2ludHMsYz1hLmxlbmd0aCxkPTA7ZDxjO2QrKylhW2RdLnJvdGF0ZShiKTt0aGlzLnJlY2FsYygpO1xucmV0dXJuIHRoaXN9O2UucHJvdG90eXBlLnRyYW5zbGF0ZT1lLnByb3RvdHlwZS50cmFuc2xhdGU9ZnVuY3Rpb24oYixhKXtmb3IodmFyIGM9dGhpcy5wb2ludHMsZD1jLmxlbmd0aCxmPTA7ZjxkO2YrKyljW2ZdLngrPWIsY1tmXS55Kz1hO3RoaXMucmVjYWxjKCk7cmV0dXJuIHRoaXN9O2UucHJvdG90eXBlLnJlY2FsYz1lLnByb3RvdHlwZS5yZWNhbGM9ZnVuY3Rpb24oKXt2YXIgYixrPXRoaXMuY2FsY1BvaW50cz1bXSxjPXRoaXMuZWRnZXM9W10sZD10aGlzLm5vcm1hbHM9W10sZj10aGlzLnBvaW50cyxoPXRoaXMub2Zmc2V0LGw9dGhpcy5hbmdsZSxnPWYubGVuZ3RoO2ZvcihiPTA7YjxnO2IrKyl7dmFyIGU9ZltiXS5pKCk7ay5wdXNoKGUpO2UueCs9aC54O2UueSs9aC55OzAhPT1sJiZlLnJvdGF0ZShsKX1mb3IoYj0wO2I8ZztiKyspZj0obmV3IGEpLmMoYjxnLTE/a1tiKzFdOmtbMF0pLnN1YihrW2JdKSxoPShuZXcgYSkuYyhmKS5nKCkubm9ybWFsaXplKCksYy5wdXNoKGYpLFxuZC5wdXNoKGgpO3JldHVybiB0aGlzfTttLkJveD11O3UucHJvdG90eXBlLnRvUG9seWdvbj11LnByb3RvdHlwZS5sPWZ1bmN0aW9uKCl7dmFyIGI9dGhpcy5wb3Msaz10aGlzLncsYz10aGlzLmg7cmV0dXJuIG5ldyBlKG5ldyBhKGIueCxiLnkpLFtuZXcgYSxuZXcgYShrLDApLG5ldyBhKGssYyksbmV3IGEoMCxjKV0pfTttLlJlc3BvbnNlPXY7di5wcm90b3R5cGUuY2xlYXI9di5wcm90b3R5cGUuY2xlYXI9ZnVuY3Rpb24oKXt0aGlzLmJJbkE9dGhpcy5hSW5CPSEwO3RoaXMub3ZlcmxhcD1OdW1iZXIuTUFYX1ZBTFVFO3JldHVybiB0aGlzfTtmb3IodmFyIGQ9W10scj0wOzEwPnI7cisrKWQucHVzaChuZXcgYSk7Zm9yKHZhciBxPVtdLHI9MDs1PnI7cisrKXEucHVzaChbXSk7dmFyIHk9bmV3IHYsRD0obmV3IHUobmV3IGEsMSwxKSkubCgpO20ucG9pbnRJbkNpcmNsZT1mdW5jdGlvbihiLGEpe3ZhciBjPWQucG9wKCkuYyhiKS5zdWIoYS5wb3MpLGU9YS5yKmEucixmPWMuZSgpO2QucHVzaChjKTtcbnJldHVybiBmPD1lfTttLnBvaW50SW5Qb2x5Z29uPWZ1bmN0aW9uKGIsYSl7RC5wb3MuYyhiKTt5LmNsZWFyKCk7dmFyIGM9QyhELGEseSk7YyYmKGM9eS5hSW5CKTtyZXR1cm4gY307bS50ZXN0Q2lyY2xlQ2lyY2xlPWZ1bmN0aW9uKGIsYSxjKXt2YXIgZT1kLnBvcCgpLmMoYS5wb3MpLnN1YihiLnBvcyksZj1iLnIrYS5yLGg9ZS5lKCk7aWYoaD5mKmYpcmV0dXJuIGQucHVzaChlKSwhMTtjJiYoaD1NYXRoLnNxcnQoaCksYy5hPWIsYy5iPWEsYy5vdmVybGFwPWYtaCxjLm92ZXJsYXBOLmMoZS5ub3JtYWxpemUoKSksYy5vdmVybGFwVi5jKGUpLnNjYWxlKGMub3ZlcmxhcCksYy5hSW5CPWIucjw9YS5yJiZoPD1hLnItYi5yLGMuYkluQT1hLnI8PWIuciYmaDw9Yi5yLWEucik7ZC5wdXNoKGUpO3JldHVybiEwfTttLnRlc3RQb2x5Z29uQ2lyY2xlPUI7bS50ZXN0Q2lyY2xlUG9seWdvbj1mdW5jdGlvbihhLGQsYyl7aWYoKGE9QihkLGEsYykpJiZjKXtkPWMuYTt2YXIgZT1jLmFJbkI7Yy5vdmVybGFwTi5yZXZlcnNlKCk7XG5jLm92ZXJsYXBWLnJldmVyc2UoKTtjLmE9Yy5iO2MuYj1kO2MuYUluQj1jLmJJbkE7Yy5iSW5BPWV9cmV0dXJuIGF9O20udGVzdFBvbHlnb25Qb2x5Z29uPUM7cmV0dXJuIG19XCJmdW5jdGlvblwiPT09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUodyk6XCJvYmplY3RcIj09PXR5cGVvZiBleHBvcnRzP21vZHVsZS5leHBvcnRzPXcoKTp0aGlzLlNBVD13KCk7Il19
