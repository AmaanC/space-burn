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