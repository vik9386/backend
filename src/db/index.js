import mongoos from "mongoose"
import { DB_NAME } from "../constatnts.js"


const connectDB = async ()=>{
    try {
        const connectionINstance =  await mongoos.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MONGODB Connected !! DB Host : ${connectionINstance.connection.host}`)
    } catch (error) {
        console.error("MONGODB connection error : ", error);
        process.exit(1)
    }
}

export default connectDB;

