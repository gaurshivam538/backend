
import express, { urlencoded } from 'express';
import dotenv from 'dotenv';
import cors from 'cors'
import cookieParser from 'cookie-parser';
dotenv.config();
const app = express();

app.use(express.json({
    limit: "20kb"
}));


app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true,
}))
app.use(express.urlencoded({
    extended:true,
    limit:"30kb"
}))
app.use(express.static("public"))
app.use(cookieParser());



//router import
import UserRouter from "./routes/userRoutes.js"
import VideoRouter from "./routes/videoRouter.js"
import CommentRouter from "./routes/commentRouter.js"
import LikeRouter from "./routes/likeRouter.js"
import TweetRouter from "./routes/tweetRouter.js"
import PlaylistRouter from "./routes/playlistRouter.js"
import SubscriptionRouter from "./routes/subscriptionRouter.js"
import DashboardRouter from "./routes/dashboardRouter.js"
import SearchbarRouter from "./routes/searchbarRouter.js"
import client from './redis.js';
//router declaration
// app.get("/", async (req, res) => {
//    await client.json.set(
//   "user:1",   // key
//   "$",        // root path
//   {
//     name: "Harshit",
//     age: 22,
//     skills: ["Node", "Redis"]
//   }
// );
// ;
//     console.log("Hai");


// });

app.use("/api/v1/users", UserRouter);
app.use("/api/v1/users", VideoRouter);
app.use("/api/v1/users", CommentRouter);
app.use("/api/v1/users", LikeRouter);
app.use("/api/v1/users", TweetRouter);
app.use("/api/v1/users", PlaylistRouter);
app.use("/api/v1/users", SubscriptionRouter);
app.use("/api/v1/users", DashboardRouter);
app.use("/api/v1/users", SearchbarRouter);


export {app};
