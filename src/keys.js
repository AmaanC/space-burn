var player = require('./player');
var keys = {};
document.body.addEventListener('keydown', function(e) {
    if (e.keyCode === 32) {
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
