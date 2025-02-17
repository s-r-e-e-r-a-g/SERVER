import Message from "../models/messageModel.js";

export const sendMessageController = async (req, res) => {
    try {
        const { senderId, receiverId, text, image } = req.body;

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image
        });

        await newMessage.save();
        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ error: "Failed to send message" });
    }
}

export const recieveMessageController = async (req, res) => {
    try {
        const { senderId, receiverId } = req.params;

        const messages = await Message.find({
            $or: [
                { senderId, receiverId },
                { senderId: receiverId, receiverId: senderId }
            ]
        }).sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve messages" });
    }
}

export const markMessagesAsRead = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user.id;

        await Message.updateMany(
            { senderId: chatId, receiverId: userId, isRead: false }, // Match only messages from the active chat
            { $set: { isRead: true } }
        );

        res.status(200).json({ success: true, message: "Messages marked as read" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to mark messages as read" });
    }
};




  