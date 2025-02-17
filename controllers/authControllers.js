import User from "../models/userModel.js";
import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'


export const registerController = async (req, res) => {
    const { name, email, password } = req.body;
    if (name && email && password) {
        try {
            const user = await User.findOne({ email });
            if (user)
                return res.json({ success: false, message: "User already exists" });
            const hashedPassword = await bcryptjs.hash(password, 10);
            await User.create({
                name,
                email,
                password: hashedPassword
            })
            res.json({ success: true, message: "Account created successfully" })
        } catch (err) {
            res.json({ success: false, message: err.message })
        }
    } else {
        res.json({ success: false, message: "Field missing" })
    }
}

export const loginController = async (req, res) => {
    const { email, password } = req.body;
    if (email && password) {
        try {
            const user = await User.findOne({ email });
            if (!user)
                return res.json({ success: false, message: "User not found" })
            const isMatch = await bcryptjs.compare(password, user.password);
            if (isMatch) {
                const token = jwt.sign({ userId: user._id, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' })
                return res.json({ success: true, message: "Login successful", token })
            }
            else
                return res.json({ success: false, message: "Incorrect Password" })
        } catch (err) {
            res.json({ success: false, message: err.message })
        }
    } else {
        res.json({ success: false, message: "Field missing" })
    }
}

export const verifyToken = async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.json({ valid: false, message: 'No token found' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded && res.json({ valid: true, decoded });

    } catch (error) {
        return res.json({ valid: false, message: 'Invalid token' });
    }
}