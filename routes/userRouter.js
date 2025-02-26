import express from 'express';
import { deleteAccount, deleteChat, getAllUser, getProfilePic, getUserChats, updateProfilePic } from '../controllers/userController.js';
import { protectRoute } from '../middlewares/authMiddleware.js';
import multer from 'multer';

const router = express.Router(); 

const upload = multer({ storage: multer.memoryStorage() }).single('profilePic');

router.get('/getusers', protectRoute, getAllUser);
router.put('/chat/chatlist', protectRoute, getUserChats);
router.get('/profilepic', protectRoute, getProfilePic);
router.delete('/:userId', protectRoute, deleteAccount);
router.post('/upload-profile-pic/:userId', upload, protectRoute,  updateProfilePic);
router.delete("/deletechat/:chatId/:userId", protectRoute, deleteChat);


export default router