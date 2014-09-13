var loader = require('./loader.js');
var text = require('./text.js');
document.body.addEventListener('click', function() {
    if (window.state === 'menu') {
        window.state = 'game';
    }
}, false);

module.exports = {
    drawMenu: function(ctx) {
        ctx.fillStyle = '#0f0d20';
        ctx.fillRect(0, 0, 800, 600);
        text.write('Click to Play', 'center', 300, function() {
            ctx.fillStyle = 'white';
            ctx.font = '42pt Arial';
        });
    },
    drawEnd: function(ctx) {
        ctx.fillStyle = '#0f0d20';
        ctx.fillRect(0, 0, 800, 600);
        text.write('The end!', 'center', 300, function() {
            ctx.fillStyle = 'white';
            ctx.font = '42pt Arial';
        });
    },
    ingame: function (ctx, fuel, health) {
        ctx.drawImage(loader.images['power-bar-icon.png'], 30, 500);
        ctx.fillStyle = 'orange';
        ctx.fillRect(30, 490 - fuel, 20, fuel);


        ctx.drawImage(loader.images['health-bar-icon.png'], 70, 500);
        ctx.fillStyle = 'red';
        ctx.fillRect(70, 490 - health, 20, health);
    }
};