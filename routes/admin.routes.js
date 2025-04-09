
const express = require('express');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const UserModel = require('../models/User');
const ResumeModel = require('../models/Resume');
const CoverLetterModel = require('../models/CoverLetter');

const router = express.Router();

// Middleware to protect all admin routes
router.use(auth);
router.use(admin);

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    // Get total users count
    const users = await UserModel.getAll();
    console.log('Retrieved users for stats:', users ? users.length : 0);
    
    // Get resume stats
    const resumes = await ResumeModel.getAll();
    console.log('Retrieved resumes:', resumes ? resumes.length : 0);
    
    // Get cover letter stats
    const coverLetters = await CoverLetterModel.getAll();
    console.log('Retrieved cover letters:', coverLetters ? coverLetters.length : 0);
    
    // Get recent users (last 5)
    const recentUsers = users
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
    
    res.status(200).json({
      success: true,
      data: {
        totalUsers: users.length,
        totalResumes: resumes.length,
        totalCoverLetters: coverLetters.length,
        recentUsers: recentUsers.map(u => ({ 
          id: u.id, 
          email: u.email, 
          subscription: u.subscription || 'free',
          createdAt: u.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get admin stats' 
    });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    console.log('Getting all users');
    const users = await UserModel.getAll();
    console.log(`Retrieved ${users ? users.length : 0} users`);
    
    res.status(200).json({
      success: true,
      data: users.map(u => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName || u.username || '',
        subscription: u.subscription || 'free',
        createdAt: u.createdAt
      }))
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get users list' 
    });
  }
});

// PUT /api/admin/users/:userId - Update a user
router.put('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userData = req.body;
    
    // Validate input
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Update user in database
    await UserModel.update(userId, userData);
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Admin user update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update user' 
    });
  }
});

// GET /api/admin/documents
router.get('/documents', async (req, res) => {
  try {
    // Get all resumes
    const resumes = await ResumeModel.getAll();
    const resumesWithType = resumes.map(r => ({ ...r, type: 'resume' }));
    
    // Get all cover letters
    const coverLetters = await CoverLetterModel.getAll();
    const coverLettersWithType = coverLetters.map(cl => ({ ...cl, type: 'coverLetter' }));
    
    // Combine and sort by creation date
    const allDocuments = [...resumesWithType, ...coverLettersWithType]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Get user info for each document
    const documentsWithUserInfo = await Promise.all(allDocuments.map(async (doc) => {
      try {
        const user = await UserModel.findById(doc.userId);
        return {
          ...doc,
          userEmail: user ? user.email : 'Unknown'
        };
      } catch (error) {
        console.error(`Error getting user info for document ${doc.id}:`, error);
        return {
          ...doc,
          userEmail: 'Unknown'
        };
      }
    }));
    
    res.status(200).json({
      success: true,
      data: documentsWithUserInfo
    });
  } catch (error) {
    console.error('Admin documents error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get documents list' 
    });
  }
});

// DELETE /api/admin/documents/:documentId - Delete a document
router.delete('/documents/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { type } = req.body;
    
    if (!documentId || !type) {
      return res.status(400).json({
        success: false,
        message: 'Document ID and type are required'
      });
    }
    
    // Delete the document based on its type
    if (type === 'resume') {
      await ResumeModel.delete(documentId);
    } else if (type === 'coverLetter') {
      await CoverLetterModel.delete(documentId);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Admin document delete error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete document' 
    });
  }
});

// POST /api/admin/webhooks
router.post('/webhooks', async (req, res) => {
  try {
    const { type, url } = req.body;
    
    if (!type || !url) {
      return res.status(400).json({
        success: false,
        message: 'Webhook type and URL are required'
      });
    }
    
    // Store webhook URL in database
    // Note: In a real implementation, you would save this to a database
    // For this example, we'll just return success
    
    res.status(200).json({
      success: true,
      message: `Webhook ${type} updated successfully`
    });
  } catch (error) {
    console.error('Admin webhook update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update webhook URL' 
    });
  }
});

module.exports = router;
