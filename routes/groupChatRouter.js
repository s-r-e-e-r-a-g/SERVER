import express from "express";
import { protectRoute } from "../middlewares/authMiddleware.js";
import GroupChat from "../models/groupChatModel.js";
import GroupMessage from "../models/groupMessageModel.js";

const router = express.Router();

// Create a new group chat
router.post("/create", protectRoute, async (req, res) => {
    try {
        const { groupName, members } = req.body;
        if (!groupName || !members || members.length < 2) {
            return res.status(400).json({ error: "Group name and at least 2 members are required." });
        }

        const newGroup = new GroupChat({
            groupName,
            members,
            admin: req.user._id,
        });

        await newGroup.save();
        res.status(201).json(newGroup);
    } catch (error) {
        console.error("Error creating group chat:", error?.response?.data || error.message);
        res.status(500).json({ error: "Server error." });
    }
});

// Get all group chats for a user
router.get("/", protectRoute, async (req, res) => {
    try {
        const groups = await GroupChat.find({ members: req.user._id }).populate("members", "name profilePic");
        res.json(groups);
    } catch (error) {
        console.error("Error fetching group chats:", error);
        res.status(500).json({ error: "Server error." });
    }
});

router.get("/:groupId", protectRoute, async (req, res) => {
    try {
        const { groupId } = req.params;
        const messages = await GroupMessage.find({ chatId: groupId })
            .sort({ createdAt: 1 })
            .populate("senderId", "name");

        res.json(messages);
    } catch (error) {
        console.error("Error fetching group messages:", error);
        res.status(500).json({ error: "Server error." });
    }
});

// Send a message in a group chat
router.post("/:groupId/send", protectRoute, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: "Message text is required." });
        }

        const newMessage = new GroupMessage({
            chatId: req.params.groupId,
            senderId: req.user._id,
            text,
        });

        await newMessage.save();
        res.status(201).json(newMessage);
    } catch (error) {
        console.error("Error sending group message:", error);
        res.status(500).json({ error: "Server error." });
    }
});

router.put('/chatlist', protectRoute, async (req, res) => {
    try {
        const userId = req.user.id;

        // Find group chats where the user is a member
        const chats = await GroupChat.find({
            members: { $in: [userId] }
        })
            .sort({ updatedAt: -1 })
            .populate("members", "profilePic name")
            .populate("lastMessage.senderId", "name") // Populate senderId to get the sender's name
            .exec();

        const chatList = await Promise.all(
            chats.map(async (chat) => {
                // Exclude the logged-in user from the members list
                const otherMembers = chat.members.filter((member) => member._id.toString() !== userId);

                // Get unread message count for the user
                const unreadCount = await GroupMessage.countDocuments({
                    chatId: chat._id,
                    senderId: { $ne: userId },
                    isReadBy: { $nin: [userId] }
                });

                return {
                    groupId: chat._id, // Group Chat ID
                    groupName: chat.groupName,
                    admin: chat.admin,
                    members: otherMembers, // Other members in the group
                    lastMessage: chat.lastMessage?.text
                        ? chat.lastMessage.text.length > 15
                            ? chat.lastMessage.text.slice(0, 15) + "..."
                            : chat.lastMessage.text
                        : "No messages yet",
                    lastMessageSender: chat.lastMessage?.senderId?.name || "Unknown", // Include sender's name
                    latestMessageTime: chat.lastMessage?.createdAt || null,
                    lastMessageSenderId: chat.lastMessage?.senderId?._id || null,
                    unreadCount
                };
            })
        );

        res.status(200).json({ chats: chatList });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});


router.get("/details/:groupId", protectRoute, async (req, res) => {
    try {
        const { groupId } = req.params;
        const group = await GroupChat.findById(groupId).populate("members", "name profilePic");

        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        res.json(group);
    } catch (error) {
        console.error("Error fetching group details:", error);
        res.status(500).json({ error: "Server error" });
    }
});

router.put('/mark-read/:groupId', protectRoute, async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.id;

        await GroupMessage.updateMany(
            { chatId: groupId, isReadBy: { $nin: [userId] } },
            { $addToSet: { isReadBy: userId } } // Add userId if not present
        );

        res.status(200).json({ message: "Messages marked as read" });
    } catch (error) {
        console.error("Error marking group messages as read:", error);
        res.status(500).json({ error: "Failed to mark messages as read" });
    }
});




export default router;
