import express from "express";
import { markMessagesAsRead, recieveMessageController, sendMessageController } from "../controllers/messageController.js";
import { protectRoute } from '../middlewares/authMiddleware.js'

const router = express.Router();

// Send a message (store in DB)
router.post("/send", sendMessageController);

// Retrieve messages between two users
router.get("/:senderId/:receiverId", recieveMessageController);

// mark as read
router.put("/mark-read/:chatId", protectRoute, markMessagesAsRead);

export default router;
