document.body.addEventListener('click', function() {
    if (window.state === 'menu') {
        window.state = 'game';
    }
}, false);

module.exports = {
    drawMenu: function(elapsed, ctx) {
        ctx.fillStyle = '#0f0d20';
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = 'white';
        ctx.font = '42pt Arial';
        ctx.fillText('Click to Play', 100, 100);
    }
};