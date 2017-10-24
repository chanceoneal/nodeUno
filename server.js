var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.use(express.static('assets'));
app.use(express.static('public'));

var unoDeck = [];
var playedCards = [];

// Helpful Comment:
// io talks to everybody connected to the server
// socket.emit should only talk to the connected socket (player)

io.on('connection', function(socket){
    socket.on('new user', function(name) {
        io.emit('message', name + ' has connected.');
        socket.username = name;
    });
    
    socket.on('disconnect', function() {
        io.emit('message', socket.username + ' has disconnected.');
    });
    
    socket.on('new game', function(){
        console.log("New Game Button Clicked -- Server");
        io.emit('message', socket.username + " started a new game.");
        // Get a shuffled uno deck
        unoDeck = deckHandler();
        var tempCard = unoDeck.pop();
        playedCards.push(tempCard);
        if (tempCard.value == "wild" || tempCard.value == "draw four") {

            // Change wild card color to color of player's choice (player who started new game).
            io.emit('display card', tempCard);
            socket.on('change color', function(color) {
                tempCard.color = color;
                io.emit('message', "The curent card is a " + tempCard.value + ". The color is now " + tempCard.color + ".");
            }); 
        } else {
            io.emit('message', "The current card is a " + tempCard.color + " " + tempCard.value + ".");
            io.emit('display card', tempCard);
        }
    });
    
    socket.on('card get', function(msg){
        var tempCard = cardDrawHandler();
        io.emit('message', socket.username + " drew a card.");
        socket.emit('card get', tempCard);
    });
    
    socket.on('card get x', function(x) {
        for (var i = 0; i < x; i++) {
            var tempCard = cardDrawHandler();
            socket.emit('card get', tempCard);
        }
        
        io.emit('message', socket.username + " drew " + x + " cards.");
    });

    socket.on('card play', function(card){
        if (card == undefined) {
            return;
        }
        
        var lastPlayed = playedCards.slice(-1)[0];

        // Handle matching values, colors, or wild cards
        if (lastPlayed.value == card.value || lastPlayed.color == card.color || 
            card.value == "wild" || card.value == "draw four") {
            playedCards.push(card);
        } else {
            // Card was not valid
            io.emit('message', socket.username + " tried to play a " + card.color + " " + card.value + ", an action deemed invalid. Card was returned to hand.");
            socket.emit('card get', card);
            return;
        }
        
        // Handle message if wild card or not
        if (card.value == "wild" || card.value == "draw four") {
            io.emit('display card', card);
            // Changes wild card color to color of player's choice
            // in order to match next played card to chosen color.
            // Called from index.html 'display card' method.
            socket.on('change color', function(color) {
                card.color = color;
                io.emit('message', socket.username + " played a " + card.value + ". The color is now " + card.color + ".");
            });            
        } else {
            io.emit('message', socket.username + " played a " + card.color + " " + card.value + ".");
            io.emit('display card', card);
            //cardPlayHandler();
        }
    });
      
    socket.on('card undo', function(){
        if (playedCards.length < 2) {
            io.emit('message', socket.username + " selected undo. This is not an option at the moment, so nothing will be done.");
        } else {
            var undoCard = playedCards.pop();
            socket.emit('card get', undoCard);
            io.emit('message', socket.username + " selected undo and the " + undoCard.color + " " + undoCard.value + " was returned to hand.");
            io.emit('display card', playedCards.slice(-1)[0]);
        }
        //cardUndoHandler();
    });
    
    socket.on('call uno', function() {
        io.emit('message', socket.username + " has called Uno!");
    });
    
    socket.on('uno', function() {
        io.emit('message', socket.username + " has Uno!");
    });
    
    socket.on('victory', function() { 
        io.emit('message', socket.username + " has won. Congratulations!");
        io.emit('card clear');
    });
});

/*
function changeColor() {
    var color = prompt("What color?");
    color = color.toLowerCase();
    while (color != "red" || color != "blue" || color != "green" || color != "yellow") {
        color = prompt("Pick a proper color you ass.");
        color = color.toLowerCase();
    }
    return color;
}
*/


// This function handles drawing a card and returning it to the player
function cardDrawHandler() {
    console.log("Draw Card Button Clicked -- Server");
    if (unoDeck.length < 1) {
        unoDeck = deckHandler();
    }
    var tempCard = unoDeck.pop();
    console.log("The drawn card was -- " + JSON.stringify(tempCard));
    return tempCard;
}

function cardUndoHandler() {
    console.log("Undo Card Button Clicked -- Server");
}

// Creates and returns a full Uno deck
function deckHandler() {
    var tempDeck = [];
    var colors = ["red", "blue", "green", "yellow"];
    var values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9, "skip", "skip", "reverse", "reverse", "wild", "wild","draw two", "draw two", "draw four"];
    for (var i = 0; i < colors.length; i++) {
        for (var j = 0; j < values.length; j++) {
            tempDeck.push({"value": values[j], "color": colors[i]});
        }
    }
    shuffle(tempDeck);
    return tempDeck;
}

/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items The array containing the items.
 */
function shuffle(a) {
    for (let i = a.length; i; i--) {
        let j = Math.floor(Math.random() * i);
        [a[i - 1], a[j]] = [a[j], a[i - 1]];
    }
}

var port = process.env.PORT || 3030; //which you can run both on Azure or local
http.listen(process.env.PORT||3030, function() {
  console.log('listening on *:' + port);
});