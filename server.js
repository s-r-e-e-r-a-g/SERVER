import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import mongodbConnect from './config/mongodb.js';
import authRouter from './routes/authRouter.js';
import userRouter from './routes/userRouter.js';
import messageRouter from './routes/messageRouter.js'
import {app, server} from './config/socket.js'
import chatRouter from './routes/groupChatRouter.js'

// const app = express();
const PORT = process.env.PORT || 5000
mongodbConnect();

app.use(cors());
app.use(express.json());
app.use('/api', authRouter);
app.use('/user', userRouter);
app.use('/messages', messageRouter);
app.use('/group', chatRouter);

app.get('/',(req, res)=>{
    res.send("ChatVault API Working");
})

server.listen(PORT,()=>{
    console.log(`Server Running in ${PORT}`);
})