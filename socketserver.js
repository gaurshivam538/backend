import { Server } from "socket.io";

let io;
const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN,
            credentials: true,
        }, 
        pingTimeout: 600000,
        pingInterval: 25000,
    }),

    io.on("connection", (socket) => {
        console.log("Socket Connected", socket.id);

        //join user-specific room

        socket.on("join-video", (videoId) => {
            socket.join(`video_${videoId}`);
            console.log(`Joined room video_${videoId}`);
        })

        socket.on("disconnect", () => {
            console.log("Socket disconnect", socket.id);
        })

    })

};

const getIo = () => {
    if (!io) {
        throw new Error("Socket not initialized");
    }
    return io;
}

export {
    initSocket,
    getIo
};