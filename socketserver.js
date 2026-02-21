import { Server } from "socket.io";
import cookie from "cookie"
import jwt from "jsonwebtoken"
import { ApiError } from "./src/utils/ApiError.js";
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

    io.use((socket, next) => {
        try {
            // console.log("Socket-handshake", socket.handshake);
            // console.log("Socket-handshake-cookie", socket.handshake.headers.cookie);
            const cookiesheaders = socket.handshake.headers.cookie;
            const cookies = cookie.parse(cookiesheaders)
            // console.log("cookies", cookies);
            const token = cookies.accessToken;
            if (!token) {
                throw new ApiError(404, "Token can not provide");
            }
            const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            socket.socketUseruserId = payload._id;
            next();
        } catch (error) {
            
        }
    })

    io.on("connection", (socket) => {
        console.log("Socket Connected", socket.id);

        //join user-specific room
         socket.join(`user_${socket.socketUseruserId}`);
         socket.join(`notification_${socket.socketUseruserId}`);
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