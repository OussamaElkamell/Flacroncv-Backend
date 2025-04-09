
const UserModel = require('../models/User');

// Admin middleware - checks if the authenticated user is an admin
const admin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    
    // Admin emails list - in a real app, this should come from a database
    const adminEmails = ['oussema@gmail.com']; // Add admin emails here
    
    // Check if user is in the admin list
    if (adminEmails.includes(userEmail)) {
      return next();
    }
    
    // If not in admin list, check if user has admin role in database
    try {
      const user = await UserModel.findById(userId);
      if (user && user.role === 'admin') {
        return next();
      }
    } catch (dbError) {
      console.error('Database error in admin middleware:', dbError);
    }
    
    // If not an admin, return forbidden
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
    
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authorization'
    });
  }
};

module.exports = admin;
