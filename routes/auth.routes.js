
const express = require('express');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');
const auth = require('../middleware/auth');
const { admin } = require('../services/firebase-admin');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    console.log('Login request received:', req.body);
    const { uid, email } = req.body;
    
    if (!uid || !email) {
      return res.status(400).json({
        success: false,
        message: 'User ID and email are required'
      });
    }
    
    // Create a JWT token with Firebase user info
    const token = jwt.sign(
      { uid, email },
      process.env.JWT_SECRET,
      { 
        expiresIn: '7d',
        algorithm: 'HS256'
      }
    );
    
    console.log('JWT token created successfully for:', email);
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: uid,
          email
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', auth, (req, res) => {
  // Firebase logout happens on the client side
  res.json({ 
    success: true, 
    message: 'Logout handled by Firebase client' 
  });
});

// GET /api/auth/user
router.get('/user', auth, async (req, res) => {
  try {

    res.json({
      success: true,
      data: {
        id: req.user.id,
        email: req.user.email
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user data'
    });
  }
});

module.exports = router;
