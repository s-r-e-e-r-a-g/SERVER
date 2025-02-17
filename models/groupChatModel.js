import mongoose from "mongoose";

const GroupChatSchema = new mongoose.Schema({
    groupName: { type: String, required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastMessage: {
        text: { type: String, default: "" },
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now }
    }
}, { timestamps: true });

const GroupChat = mongoose.model("GroupChat", GroupChatSchema);
export default GroupChat;
