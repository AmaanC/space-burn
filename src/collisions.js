var particlesModule = require('./particles');

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

var check = function(player, foModule) {
    // fo stands for flyingObjects
    var particles = particlesModule.array;
    var fo = foModule.array;
    // Manage flying object spawning
    var foInView = inArea(camera, fo, undefined, function(fo) {
        fo.alive = false;
    });
    if (foInView.length < 30) {
        foModule.spawn(Math.random() * 100);
    }

    // Collisions between the player and rocks
    var foToTest = inArea(playerArea, fo);
    for (var i = 0; i < foToTest.length; i++) {
        if (angledCollision(player, foToTest[i])) {
            // console.log('HIT');
            foToTest[i].alive = false;
            if (foToTest[i].type === 'power-icon.png') {
                audio.play('collect');
                player.fuel += 10;
            }
            else {
                audio.play('collide');
                player.health -= (foToTest[i].width * foToTest[i].height) / 100;
            }
        }
    }

    // Check for collisions between particles and fo
    for (var i = 0; i < particles.length; i++) {
        inArea(particles[i], fo, function(fo) {
            if (particles[i].alive) {
                fo.alive = false;
                if (fo.type === 'power-icon.png') {
                    audio.play('collect');
                }
                else {
                    audio.play('explode_meteor');
                }
                player.score += (fo.width * fo.height) / 100;
            }
        });
    }
};

module.exports = {
    check: check
};