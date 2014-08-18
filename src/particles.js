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