var aabb = function (a, b) {
    if (
        Math.abs(a.x + a.width / 2 - b.x - b.width / 2) > (a.width + b.width) / 2 ||
        Math.abs(a.y + a.height / 2 - b.y - b.height / 2) > (a.height + b.height) / 2
    ) {
        return false;
    }
    return true;
};

var inArea = function(area, array) {
    var ret = [];
    var curElem;
    for (var i = 0; i < array.length; i++) {
        curElem = array[i];
        if (aabb(area, curElem)) {
            ret.push(curElem);
        }
    }
    return ret;
};

var playerArea = {
    x: 350,
    y: 250,
    width: 100,
    height: 100
};

var check = function(player, particles, enemies) {
    // Check for collisions between particles and enemies
    var enemiesToTest = inArea(playerArea, enemies);
};

module.exports = {
    check: check
};