import express from 'express';
import http from 'http';
import socketio from 'socket.io';
import path from 'path';

const app = express();
const server = http.createServer(app);
const sockets = socketio(server);

const gameConfig = {
  width: 580,
  height: 320,
  maxScore: 10,
};

const game = {
  players: {},
  rooms: {},
  match: {},
};

sockets.on('connection', (socket) => {
  console.log(`${socket.id} conectado.`);

  socket.on('disconnect', () => {
    const player = game.players[socket.id];
    if (player) {
      console.log(`${player.name} desconectou.`);
      const playerId = socket.id;
      game.players[playerId].disconnected = new Date().getTime();
      const timerId = setTimeout(() => {
        removePlayer(playerId);
      }, 5000);
      game.players[playerId].timerId = timerId;
    } else {
      console.log(`${socket.id} desconectou.`);
    }
  });

  const removePlayer = (playerId) => {
    sendMessage(game.players[playerId], 'saiu');

    delete game.players[playerId];

    refreshPlayers();
  };

  socket.on('Reconnect', (reconnectedPlayer) => {
    console.log('Reconnect', reconnectedPlayer);
    const oldSocketId = reconnectedPlayer.socketId;
    const existingPlayer = game.players[oldSocketId];

    if (existingPlayer) {
      clearTimeout(game.players[oldSocketId].timerId);
      game.players[socket.id] = {
        ...existingPlayer,
        disconnected: undefined,
        socketId: socket.id,
      };

      delete game.players[oldSocketId];

      sendMessage(game.players[socket.id], 'reconectou');

    } else {
      console.log(`Player ${reconnectedPlayer.name} not found`);
    }
    refreshPlayers();
  });

  socket.on('Login', (name) => {
    console.log('Login', name);
    game.players[socket.id] = { name, socketId: socket.id };
    sendMessage(game.players[socket.id], 'entrou');
    refreshPlayers();
  });

  socket.on('SendMessage', (message) => {
    sendMessage(game.players[socket.id], message);
  });
});

const sendMessage = (player, message) => {
  if (player) {
    sockets.emit('ReceiveMessage', `${player.name}: ${message}`);
  } else {
    sockets.emit('ReceiveMessage', `${message}`);
  }
};

const refreshPlayers = () => {
  sockets.emit('PlayersRefresh', game.players);
};

app.use(express.static(path.resolve()));
app.use(express.static(path.join(path.resolve(), 'build')));

app.get('/ping', function (req, res) {
  return res.send('pong');
});

app.get('/*', function (req, res) {
  res.sendFile(path.join(path.resolve(), 'build', 'index.html'));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server rodando na porta ${PORT}!`));
