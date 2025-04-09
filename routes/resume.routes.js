
const express = require('express');
const auth = require('../middleware/auth');
const ResumeModel = require('../models/Resume');
const OpenAIService = require('../services/openai.service');
const UserModel = require('../models/User');

const router = express.Router();

// POST /api/resume/generate
router.post('/generate', auth, async (req, res) => {
  try {
    const resumeData = req.body;
    const userId = req.user.id;
    
    // Check user's subscription
    const user = await UserModel.findById(userId);
    const hasPro = user && user.subscription === 'pro';
    
    // Enhance resume with OpenAI if user has Pro subscription
    let enhancedData = { ...resumeData };
    
    if (hasPro) {
      try {
        enhancedData = await OpenAIService.enhanceResume(resumeData);
      } catch (error) {
        console.error('OpenAI enhancement error:', error);
        // Continue with original data if enhancement fails
      }
    } else {
      console.log('User does not have Pro subscription, skipping AI enhancement');
    }
    
    // Add userId to the data
    enhancedData.userId = userId;
    
    // Save to database
    const savedResume = await ResumeModel.create(enhancedData);
    
    res.status(201).json({
      success: true,
      data: savedResume
    });
  } catch (error) {
    console.error('Resume generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate resume',
      error: error.message
    });
  }
});

// POST /api/resume/enhance
router.post('/enhance', auth, async (req, res) => {
  try {
    const { resumeData } = req.body;
    const userId = req.user.id;
    
    // Check user's subscription
    const user = await UserModel.findById(userId);
    const hasPro = user && user.subscription.plan === 'pro';
    
    if (!hasPro) {
      return res.status(403).json({
        success: false,
        message: 'Pro subscription required for AI enhancement'
      });
    }
    
    // Enhance with OpenAI
    try {
      const enhancedData = await OpenAIService.enhanceResume(resumeData);
      res.status(200).json({
        success: true,
        data: enhancedData
      });
    } catch (aiError) {
      console.error('OpenAI enhancement error:', aiError);
      res.status(500).json({
        success: false,
        message: 'Failed to enhance resume with AI'
      });
    }
  } catch (error) {
    console.error('Resume enhance API error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// GET /api/resume/:resumeId
router.get('/:resumeId', auth, async (req, res) => {
  try {
    const resumeId = req.params.resumeId;
    const userId = req.user.id;
    
    // Get resume from database
    const resume = await ResumeModel.findById(resumeId);
    
    // Check if resume exists and belongs to the user
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }
    
    if (resume.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this resume'
      });
    }
    
    res.status(200).json({
      success: true,
      data: resume
    });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resume',
      error: error.message
    });
  }
});

// GET /api/resume - Get all resumes for the current user
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all resumes for the user
    const resumes = await ResumeModel.findByUserId(userId);
    
    res.status(200).json({
      success: true,
      data: resumes
    });
  } catch (error) {
    console.error('Get resumes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resumes',
      error: error.message
    });
  }
});

module.exports = router;
