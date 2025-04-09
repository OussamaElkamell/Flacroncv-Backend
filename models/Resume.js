
const { db } = require('../services/firebase-admin');

const resumesRef = db.ref('resumes');

const ResumeModel = {
  // Create a new resume
  create: async (resumeData) => {
    try {
      const newResumeRef = resumesRef.push();
      const resumeWithTimestamp = {
        ...resumeData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await newResumeRef.set(resumeWithTimestamp);
      
      return {
        id: newResumeRef.key,
        ...resumeWithTimestamp
      };
    } catch (error) {
      console.error('Error creating resume:', error);
      throw error;
    }
  },
  getAll: async () => {
    try {
      const snapshot = await resumesRef.once('value');
      const resumes = snapshot.val();
      
      if (!resumes) return [];
      
      return Object.keys(resumes).map(key => ({
        id: key,
        ...resumes[key]
      }));
    } catch (error) {
      console.error('Error getting all resumes:', error);
      throw error;
    }
  },
  // Find resume by ID
  findById: async (resumeId) => {
    try {
      const snapshot = await resumesRef.child(resumeId).once('value');
      const resume = snapshot.val();
      
      if (!resume) return null;
      
      return {
        id: resumeId,
        ...resume
      };
    } catch (error) {
      console.error('Error finding resume by ID:', error);
      throw error;
    }
  },
  
  // Find all resumes for a user
  findByUserId: async (userId) => {
    try {
      const snapshot = await resumesRef.orderByChild('userId').equalTo(userId).once('value');
      const resumes = snapshot.val();
      
      if (!resumes) return [];
      
      return Object.keys(resumes).map(key => ({
        id: key,
        ...resumes[key]
      }));
    } catch (error) {
      console.error('Error finding resumes by user ID:', error);
      throw error;
    }
  },
  
  // Update resume
  update: async (resumeId, updateData) => {
    try {
      const resumeRef = resumesRef.child(resumeId);
      await resumeRef.update({
        ...updateData,
        updatedAt: new Date().toISOString()
      });
      
      const updatedSnapshot = await resumeRef.once('value');
      return {
        id: resumeId,
        ...updatedSnapshot.val()
      };
    } catch (error) {
      console.error('Error updating resume:', error);
      throw error;
    }
  },
  
  // Delete resume
  delete: async (resumeId) => {
    try {
      await resumesRef.child(resumeId).remove();
      return true;
    } catch (error) {
      console.error('Error deleting resume:', error);
      throw error;
    }
  }
};

module.exports = ResumeModel;
