
const jwt = require('jsonwebtoken');
const { admin } = require('../services/firebase-admin');

const auth = async (req, res, next) => {
  try {
    console.log('Auth middleware processing request');
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      console.warn('No Authorization header found');
      return res.status(401).json({ 
        success: false, 
        message: 'No authentication token, access denied' 
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      console.warn('Authorization header found but no token');
      return res.status(401).json({ 
        success: false, 
        message: 'No authentication token, access denied' 
      });
    }

    try {
      console.log('Verifying token');
      
      // First try to verify with Firebase Admin SDK
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        console.log('Firebase token verified successfully');
        
        // Set the user in the request
        req.user = { 
          id: decodedToken.uid,
          email: decodedToken.email
        };
        
        console.log('Authentication successful for user:', req.user.email);
        next();
      } 
      // If Firebase verification fails, try our JWT
      catch (firebaseError) {
        console.log('Firebase verification failed, trying JWT:', firebaseError.message);
        
        // Try with our own JWT as fallback
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { 
          algorithms: ['HS256'] 
        });
        
        // Set the user in the request
        req.user = { 
          id: decoded.uid,
          email: decoded.email
        };
        
        console.log('JWT Authentication successful for user:', req.user.email);
        next();
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      res.status(401).json({ 
        success: false, 
        message: 'Token is not valid' 
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error in authentication' 
    });
  }
};

module.exports = auth;
