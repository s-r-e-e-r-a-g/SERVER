import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema({ // To differentiate between private and group chats
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastMessage: {
        text: { type: String, default: "" },
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now }
    }
}, { timestamps: true });

const Chat = mongoose.model("Chat", ChatSchema);

export default Chat;
