var player = require('./player');
var buttons = require('./buttons');

var items = [
    {
        name: 'Health',
        desc: 'Increases health by 10',
        fn: function() {
            player.defaults.health += 10;
        }
    },
    {
        name: 'Fuel',
        desc: 'Increases fuel by 10',
        fn: function() {
            player.defaults.health += 10;
        }
    },
    {
        name: 'Health',
        desc: 'Increases health by 10',
        fn: function() {
            player.defaults.health = 1000;
        }
    },
    {
        name: 'Health',
        desc: 'Increases health by 10',
        fn: function() {
            player.defaults.health = 1000;
        }
    }
];

var addItemButtons = function() {
    var item;
    for (var i = 0; i < items.length; i++) {
        item = items[i];
        buttons.addButton(
            {
                x: 100 + (i % 3) * 130,
                y: 100 + Math.floor(i / 3) * 70,
                width: 100,
                height: 50
            },
            'store',
            item.fn,
            item.name,
            '12pt Tempesta Five'
        );
    }

    buttons.addButton(
        {
            x: 'center',
            y: 450,
            width: 200,
            height: 50
        },
        'store',
        function() {
            window.resetGame();
        },
        'Play',
        '14pt Tempesta Five'
    );
};

addItemButtons();