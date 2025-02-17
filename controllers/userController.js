import cloudinary from "../config/cloudinary.js";
import Chat from "../models/chatModel.js";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";



export const getAllUser = async (req, res) => {
    const { _id } = req.user;

    try {
        const users = await User.find({ _id: { $ne: _id } })
            .select("-password")

        res.json({ success: true, users });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};


export const getUserChats = async (req, res) => {
    try {
        const userId = req.user.id;

        const chats = await Chat.find({
            members: { $in: [userId] }
        })
            .sort({ updatedAt: -1 })
            .populate("members", "name profilePic")
            .populate({
                path: "lastMessage.senderId",
                select: "name"
            }) // Populate senderId to get sender's name
            .exec();

        const chatList = await Promise.all(
            chats.map(async (chat) => {
                const otherUser = chat.members.find((member) => member._id.toString() !== userId);

                // 🔹 Count only unread messages sent by the other user to the logged-in user
                const unreadCount = await Message.countDocuments({
                    senderId: otherUser?._id, // Other user is the sender
                    receiverId: userId, // Logged-in user is the receiver
                    isRead: false,
                });

                return {
                    ...otherUser?._doc,
                    lastMessage: chat.lastMessage?.text
                        ? chat.lastMessage.text.length > 15
                            ? chat.lastMessage.text.slice(0, 15) + "..."
                            : chat.lastMessage.text
                        : "No messages yet",
                    lastMessageSender: chat.lastMessage?.senderId?.name || "Unknown",
                    lastMessageSenderId: chat.lastMessage?.senderId?._id || null,
                    latestMessageTime: chat.lastMessage?.createdAt || null,
                    chatId: chat._id, // This is the Chat document ID
                    unreadCount, // Unread count is correct for each chat
                };
            })
        );

        res.status(200).json({ chats: chatList });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
};




export const updateProfilePic = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        // Convert buffer to a readable stream
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'profile_pics' },
            async (error, result) => {
                if (error) return res.status(500).json({ error: error.message });

                const user = await User.findByIdAndUpdate(userId, { profilePic: result.secure_url }, { new: true });
                res.json({ message: 'Profile picture updated', profilePic: user.profilePic });
            }
        );

        stream.end(req.file.buffer); // Properly send buffer to Cloudinary
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getProfilePic = async (req, res) => {
    const { _id } = req.user;

    try {
        const users = await User.findOne({ _id })
            .select("profilePic")

        res.json({ success: true, users });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
}
