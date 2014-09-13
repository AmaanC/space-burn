var aabb = function (a, b) {
    if (
        Math.abs(a.x + a.width / 2 - b.x - b.width / 2) > (a.width + b.width) / 2 ||
        Math.abs(a.y + a.height / 2 - b.y - b.height / 2) > (a.height + b.height) / 2
    ) {
        return false;
    }
    return true;
};

var inArea = function(area, array, response) {
    var ret = [];
    var curElem;
    for (var i = 0; i < array.length; i++) {
        curElem = array[i];
        if (aabb(area, curElem)) {
            ret.push(curElem);
            if (response) {
                response(curElem);
            }
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

var check = function(player, particles, enemies, ctx) {
    // Check for collisions between particles and enemies
    var enemiesToTest = inArea(playerArea, enemies);
    console.log(enemiesToTest.length + ' hit');

    var enemiesHurt = [];
    for (var i = 0; i < particles.length; i++) {
        inArea(particles[i], enemies, function(enemy) {
            enemy.alive = false;
        });
    }

    ctx.fillRect(playerArea.x, playerArea.y, playerArea.width, playerArea.height);
};

module.exports = {
    check: check
};