import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import Message from '../models/messageModel.js';
import Chat from '../models/chatModel.js';
import GroupMessage from '../models/groupMessageModel.js';
import GroupChat from '../models/groupChatModel.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const users = {}; 

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Store user socket ID
    socket.on('addUser', ({ userId, socketId }) => {
        users[userId] = socketId; 
        console.log("Users list:", users);
    });
    socket.on('removeUser', ({ userId }) => {
        if (users[userId]) {
            delete users[userId]; 
            console.log("Updated Users list:", users);
        }
    });
    

    // Private Chat Messaging
    socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
        const newMessage = new Message({ senderId, receiverId, text: message });

        try {
            await newMessage.save();
            let chat = await Chat.findOne({ members: { $all: [senderId, receiverId] } });

            if (!chat) {
                chat = new Chat({
                    members: [senderId, receiverId],
                    lastMessage: { text: message, senderId, createdAt: new Date() }
                });
                await chat.save();
            } else {
                chat.lastMessage = { text: message, senderId, createdAt: new Date() };
                await chat.save();
            }

            const receiverSocketId = users[receiverId];
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("receiveMessage", { senderId, message });
            }
        } catch (error) {
            console.error("Message saving error:", error);
        }
    });

    // **Group Chat Messaging**
    socket.on("joinGroup", (groupId) => {
        socket.join(groupId);
        console.log(`User joined group: ${groupId}`);
    });

    socket.on("sendGroupMessage", async ({ chatId, senderId, text }) => {
        try {
            const newMessage = new GroupMessage({ chatId, senderId, text });
            await newMessage.save();

            let groupChat = await GroupChat.findById(chatId);
            if (groupChat) {
                groupChat.lastMessage = { text, senderId, createdAt: new Date() };
                await groupChat.save();
            }

            const populatedMessage = await GroupMessage.findById(newMessage._id).populate("senderId", "name");

            io.to(chatId).emit("receiveGroupMessage", populatedMessage);
        } catch (error) {
            console.error("Error sending group message:", error);
        }
    });

    // Handle Disconnect
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        Object.keys(users).forEach(userId => {
            if (users[userId] === socket.id) {
                delete users[userId];
            }
        });
    });
});

export { app, server };
