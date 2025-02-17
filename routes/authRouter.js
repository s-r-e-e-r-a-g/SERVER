import express from 'express';
import { loginController, registerController, verifyToken } from '../controllers/authControllers.js';

const router = express.Router();

router.post('/register', registerController )

router.post('/login', loginController )

router.post ('/verifytoken', verifyToken )



export default router