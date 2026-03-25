
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const DB_URL=process.env.DB_URL;

 const mongoConnect = async ()=>{
    try {
        await mongoose.connect(`${DB_URL}`);
        console.log("Connected to mongoDB");
        
    } catch (error) {
        console.log("Error in connecting to mongoDB", error);
    }
}
export default mongoConnect;    