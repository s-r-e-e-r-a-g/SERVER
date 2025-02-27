import express from "express";
import { protectRoute } from "../middlewares/authMiddleware.js";
import GroupChat from "../models/groupChatModel.js";
import GroupMessage from "../models/groupMessageModel.js";
import User from "../models/userModel.js";

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

router.post("/add/:groupId", protectRoute, async (req, res) => {
    try {
      const { groupId } = req.params;
      const { userId } = req.body;
  
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
  
      const group = await GroupChat.findById(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      // Check if the requester is an admin
      if (group.admin.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Only admins can add members" });
      }
  
      // Check if user is already a member
      if (group.members.includes(userId)) {
        return res.status(400).json({ error: "User is already in the group" });
      }
  
      // Add user to group
      group.members.push(userId);
      await group.save();
  
      const newUser = await User.findById(userId).select("name profilePic");
  
      res.status(200).json({ message: "User added successfully", newUser });
    } catch (error) {
      console.error("Error adding member:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.post("/remove/:groupId", protectRoute, async (req, res) => {
    try {
      const { groupId } = req.params;
      const { memberId } = req.body;
  
      if (!memberId) {
        return res.status(400).json({ error: "User ID is required" });
      }
  
      const group = await GroupChat.findById(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      console.log(group.admin,"--",req.user._id)
      // Only admins can remove members
      if (group.admin.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Only admins can remove members" });
      }
  
      // Check if user is in the group
      if (!group.members.includes(memberId)) {
        return res.status(400).json({ error: "User is not in the group" });
      }
  
      // Remove user from group
      group.members = group.members.filter((member) => member.toString() !== memberId);
      await group.save();
  
      res.status(200).json({ message: "User removed successfully" });
    } catch (error) {
      console.error("Error removing member:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.post("/exit/:groupId", protectRoute, async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = req.user._id; 
  
      let group = await GroupChat.findById(groupId);
      if (!group) return res.status(404).json({ error: "Group not found" });
  
      // Check if the user is in the group
      const isMember = group.members.some(member => member.toString() === userId.toString());
      if (!isMember) return res.status(400).json({ error: "User is not a member of this group" });
  
      // Remove the user from the group
      group.members = group.members.filter(member => member.toString() !== userId.toString());
  
      // If the exiting user is the admin
      if (group.admin.toString() === userId.toString()) {
        if (group.members.length > 0) {
          group.admin = group.members[0]; // Assign the first remaining member as admin
        } else {
          // If no members left, delete the group
          await GroupChat.findByIdAndDelete(groupId);
          return res.json({ message: "Group deleted as no members were left" });
        }
      }
  
      await group.save();
  
      res.json({ message: "Exited group successfully" });
    } catch (error) {
      console.error("Error exiting group:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  




export default router;
