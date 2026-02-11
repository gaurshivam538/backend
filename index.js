
import {app} from './src/app.js'
import mongoConnect from './src/db/index.js';
import dotenv from 'dotenv';
dotenv.config();
import http from 'http'
import { initSocket } from './socketserver.js';
import { connectRedis } from './src/redis.js';

const port = process.env.PORT;
const server = http.createServer(app);

initSocket(server);

mongoConnect()
    .then(async () => {
        await connectRedis();
        server.listen(port, () => {     
            console.log(`App listening on the port http://localhost:${port}`);
        });
    }).catch((err) => {
        console.log("Error is connecting the mongodb to url")
    })

