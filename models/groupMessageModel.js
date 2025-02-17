import mongoose from "mongoose";

const GroupMessageSchema = new mongoose.Schema(
    {
        chatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "GroupChat",
            required: true,
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        text: { type: String },
        image: { type: String },
        isReadBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // To track read status
    },
    { timestamps: true }
);

const GroupMessage = mongoose.model("GroupMessage", GroupMessageSchema);
export default GroupMessage;
