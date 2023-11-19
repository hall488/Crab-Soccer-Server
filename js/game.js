const config = {
  type: Phaser.HEADLESS,
  autoFocus: false,
  parent: "phaser-example",
  width: 1210,
  height: 910,
  physics: {
    default: "matter",
    matter: {
      debug: true,
      gravity: { y: 0 },
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

const players = {};

function preload() {
  this.load.svg("crab", "./assets/crab.svg", {
    width: 350 / 4,
    height: 198 / 2,
  });
  this.load.image("ball", "./assets/ball.svg");
  this.load.svg("bg", "./assets/field.svg", { width: 1210, height: 910 });
  this.load.svg("goal", "./assets/goal.svg", { width: 100, height: 320 });
}
function create() {
  const self = this;

  this.score = { red: 0, blue: 1 };
  this.scoreState = false;

  this.matter.world.setBounds(0, 0, 1210, 910, 32, false, false, true, true);
  this.goal1 = this.matter.add.rectangle(-5, 455, 10, 310, {
    isSensor: true,
  });

  this.goal2 = this.matter.add.rectangle(1215, 455, 10, 310, {
    isSensor: true,
  });

  //left goal
  this.matter.add.rectangle(-15, 150, 30, 300, {
    isStatic: true,
  });

  this.matter.add.rectangle(-15, 760, 30, 300, {
    isStatic: true,
  });

  this.matter.add.rectangle(-80, 285, 100, 30, {
    isStatic: true,
  });

  this.matter.add.rectangle(-80, 625, 100, 30, {
    isStatic: true,
  });

  this.matter.add.rectangle(-115, 455, 30, 310, {
    isStatic: true,
  });

  //right goal
  this.matter.add.rectangle(1225, 150, 30, 300, {
    isStatic: true,
  });

  this.matter.add.rectangle(1225, 760, 30, 300, {
    isStatic: true,
  });

  this.matter.add.rectangle(1290, 285, 100, 30, {
    isStatic: true,
  });

  this.matter.add.rectangle(1290, 625, 100, 30, {
    isStatic: true,
  });

  this.matter.add.rectangle(1325, 455, 30, 310, {
    isStatic: true,
  });

  this.ball = this.matter.add
    .image(1210 / 2, 910 / 2, "ball")
    .setCircle(121 / 2);
  this.ball.setScale(0.5);

  this.ball.body.restitution = 1;
  this.ball.setBounce(0.8);

  this.players = this.add.group();
  this.redTeam = this.add.group();
  this.blueTeam = this.add.group();

  io.on("connection", function (socket) {
    console.log("a user connected");
    // create a new player and add it to our players object
    let team = Math.floor(Math.random() * 2) == 0 ? "red" : "blue";
    let startPos = posMap(team, self[team+"Team"].getChildren().length);
    players[socket.id] = {
      x: startPos.x,
      y: startPos.y,
      playerId: socket.id,
      team: team,
      input: {
        up: false,
        left: false,
        down: false,
        right: false,
      },
      velocity: 5,
    };
    // add player to server
    addPlayer(self, players[socket.id]);

    // send the players object to the new player
    socket.emit("currentPlayers", players);
    // update all other players of the new player
    socket.broadcast.emit("newPlayer", players[socket.id]);

    socket.on("disconnect", function () {
      console.log("user disconnected");
      // remove player from server
      removePlayer(self, socket.id);
      // remove this player from our players object
      delete players[socket.id];
      // emit a message to all players to remove this player
      io.emit("removePlayer", socket.id);
    });

    socket.on("playerInput", function (inputData) {
      handlePlayerInput(self, socket.id, inputData);
    });
  });
}

function update() {
  this.players.getChildren().forEach((player) => {
    const { input, velocity } = players[player.playerId];

    let newVel = { x: 0, y: 0 };
    if (input.up) {
      newVel.y -= velocity;
    }
    if (input.left) {
      newVel.x -= velocity;
    }
    if (input.down) {
      newVel.y += velocity;
    }
    if (input.right) {
      newVel.x += velocity;
    }
    player.setVelocity(newVel.x, newVel.y);

    players[player.playerId].x = player.x;
    players[player.playerId].y = player.y;

    if (this.matter.collision.collides(player.body, this.ball.body)) {
      this.matter.body.setSpeed(this.ball.body, this.ball.body.speed * 1.2);
    }
  });

  if (
    this.matter.collision.collides(this.goal1, this.ball.body) &&
    !this.scoreState
  ) {
    this.scoreState = true;
    this.score.blue += 1;
    resetField(this, this.players, this.ball);
  }

  if (
    this.matter.collision.collides(this.goal2, this.ball.body) &&
    !this.scoreState
  ) {
    this.scoreState = true;
    this.score.red += 1;
    resetField(this, this.players, this.ball);
  }

  io.emit("gameUpdates", { players, ball: this.ball, score: this.score });
}

function posMap(team, spot) {
  let map = team == "red" ? {
    0: {
      x: 1210/2 - 120,
      y: 910/2
    } ,
    1:  {
      x: 1210/2 - 75,
      y: 910/2 - 100
    },
    2: {
      x: 1210/2 - 75,
      y: 910/2 + 100
    }
  } : {
    0: {
      x: 1210/2 + 120,
      y: 910/2
    } ,
    1:  {
      x: 1210/2 + 75,
      y: 910/2 - 100
    },
    2: {
      x: 1210/2 + 75,
      y: 910/2 + 100
    }
  }

  return map[spot];
}

function resetField(self, players, ball) {
  setTimeout(() => {
    ball.setPosition(1210 / 2, 910 / 2);
    self.scoreState = false;
    ball.setVelocity(0);
    ball.setAngularVelocity(0);

    self.redTeam.getChildren().forEach((player,index) => {
      let startPos = posMap(player.team, index);
      player.setPosition(startPos.x, startPos.y);
    });

    self.blueTeam.getChildren().forEach((player, index) => {
      let startPos = posMap(player.team, index);
      player.setPosition(startPos.x, startPos.y);
    });
  }, 500);
}

function handlePlayerInput(self, playerId, input) {
  self.players.getChildren().forEach((player) => {
    if (playerId === player.playerId) {
      players[player.playerId].input = input;
    }
  });
}

function addPlayer(self, playerInfo) {
  const player = self.matter.add.image(playerInfo.x, playerInfo.y, "crab");
  player.playerId = playerInfo.playerId;

  self.matter.body.setVertices(
    player.body,
    createEllipseVertices(0.7, 50, 200)
  );

  player.setScale(0.25);
  player.setFixedRotation(0);

  player.team = playerInfo.team;
  self[playerInfo.team+"Team"].add(player);
  self.players.add(player);
}

function removePlayer(self, playerId) {
  self.players.getChildren().forEach((player) => {
    if (playerId === player.playerId) {
      player.destroy();
    }
  });
}

function createEllipseVertices(ellipseFlatness, ellipseVertices, ellipseSize) {
  let ellipseVerticesArray = [];

  for (let i = 0; i < ellipseVertices; i++) {
    let x = ellipseSize * Math.cos(i);
    let y = ellipseFlatness * ellipseSize * Math.sin(i);
    ellipseVerticesArray.push({ x: x, y: y });
  }

  return ellipseVerticesArray;
}

const game = new Phaser.Game(config);
window.gameLoaded();
