const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

// const app = express();
// const server = createServer(app);
const io = new Server({cors: {
    origin: "http://localhost:5173"
  }});

io.on("connection", async (socket) => {
    console.log(`Socket ${socket.id} connected`)
})

io.listen(4000, () => console.log(`Listening on port 4000`));