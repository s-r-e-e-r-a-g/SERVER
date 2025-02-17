import mongoose from "mongoose";

const mongodbConnect = () => {
    mongoose.connect(process.env.MONGODB_URL).then(conn => {
        console.log(`Database connected: ${conn.connection.host}`);
    }).catch(err => {
        console.log(`ERROR: ${err.message}`);
        
    })
}

export default mongodbConnect;