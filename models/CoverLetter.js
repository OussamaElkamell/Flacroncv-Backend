
const { db } = require('../services/firebase-admin');

const coverLettersRef = db.ref('coverLetters');

const CoverLetterModel = {
  // Create a new cover letter
  create: async (coverLetterData) => {
    try {
      const newCoverLetterRef = coverLettersRef.push();
      const coverLetterWithTimestamp = {
        ...coverLetterData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await newCoverLetterRef.set(coverLetterWithTimestamp);
      
      return {
        id: newCoverLetterRef.key,
        ...coverLetterWithTimestamp
      };
    } catch (error) {
      console.error('Error creating cover letter:', error);
      throw error;
    }
  },
  getAll: async () => {
    try {
      const snapshot = await coverLettersRef.once('value');
      const coverLetters = snapshot.val();
      
      if (!coverLetters) return [];
      
      return Object.keys(coverLetters).map(key => ({
        id: key,
        ...coverLetters[key]
      }));
    } catch (error) {
      console.error('Error getting all cover letters:', error);
      throw error;
    }
  },
  // Find cover letter by ID
  findById: async (coverLetterId) => {
    try {
      const snapshot = await coverLettersRef.child(coverLetterId).once('value');
      const coverLetter = snapshot.val();
      
      if (!coverLetter) return null;
      
      return {
        id: coverLetterId,
        ...coverLetter
      };
    } catch (error) {
      console.error('Error finding cover letter by ID:', error);
      throw error;
    }
  },
  
  // Find all cover letters for a user
  findByUserId: async (userId) => {
    try {
      const snapshot = await coverLettersRef.orderByChild('userId').equalTo(userId).once('value');
      const coverLetters = snapshot.val();
      
      if (!coverLetters) return [];
      
      return Object.keys(coverLetters).map(key => ({
        id: key,
        ...coverLetters[key]
      }));
    } catch (error) {
      console.error('Error finding cover letters by user ID:', error);
      throw error;
    }
  },
  
  // Update cover letter
  update: async (coverLetterId, updateData) => {
    try {
      const coverLetterRef = coverLettersRef.child(coverLetterId);
      await coverLetterRef.update({
        ...updateData,
        updatedAt: new Date().toISOString()
      });
      
      const updatedSnapshot = await coverLetterRef.once('value');
      return {
        id: coverLetterId,
        ...updatedSnapshot.val()
      };
    } catch (error) {
      console.error('Error updating cover letter:', error);
      throw error;
    }
  },
  
  // Delete cover letter
  delete: async (coverLetterId) => {
    try {
      await coverLettersRef.child(coverLetterId).remove();
      return true;
    } catch (error) {
      console.error('Error deleting cover letter:', error);
      throw error;
    }
  }
};

module.exports = CoverLetterModel;
