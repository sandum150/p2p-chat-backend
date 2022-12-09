const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["*"]
    }
});

const awaitingPeerConnections = [];

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('message', (msg) => {
        console.log('message', socket.id);
        socket.send(`message only for ${socket.id}`);
    });

    socket.on('client-offer', (msg) => {
        const peerConnection = {
            inviterId: socket.id,
            offer: msg
        }

        const awaitingOffer = awaitingPeerConnections.find(conn => conn.inviterId === socket.id);

        if (awaitingOffer) {
            awaitingPeerConnections.splice(awaitingPeerConnections.indexOf(awaitingOffer), 1, peerConnection)
        } else {
            awaitingPeerConnections.push(peerConnection);
        }
        socket.emit('connection-awaiting', socket.id)
        console.log(awaitingPeerConnections);
    });

    socket.on('get-offer', (msg) => {
        const awaitingOffer = awaitingPeerConnections.find(conn => conn.inviterId === msg);
        if (awaitingOffer) {
            socket.emit('server-offer', awaitingOffer.offer)
        } else {
            socket.emit('fail', 'could not find invitation')
        }
    });

    socket.on('client-answer', (answerObj) => {
        const awaitingOffer = awaitingPeerConnections.find(conn => conn.inviterId === answerObj.inviterId);
        if(awaitingOffer) {
            socket.to(awaitingOffer.inviterId).emit('server-answer', answerObj.answer)
        } else {
            socket.emit('fail', 'inviter not found')
        }
        awaitingPeerConnections.splice(awaitingPeerConnections.indexOf(awaitingOffer), 1);
    });


    socket.on('disconnect', (msg) => {
        console.log(`client ${socket.id} disconnected`);
        const awaitingOffer = awaitingPeerConnections.find(conn => conn.inviterId === socket.id);
        if (awaitingOffer) {
            awaitingPeerConnections.splice(awaitingPeerConnections.indexOf(awaitingOffer), 1);
        }
    })
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});
