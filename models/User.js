
const { db } = require('../services/firebase-admin');
const bcrypt = require('bcryptjs');

const usersRef = db.ref('users');

const UserModel = {
  // Create a new user
  create: async (userData) => {
    try {
      const { username, email, password, subscription } = userData;
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Create default subscription data if not provided
      const defaultSubscription = subscription || {
        id: null,
        status: 'active',
        plan: 'free',
        cancel_at_period_end: false
      };
      
      // Create user data object with timestamp
      const newUser = {
        username,
        email,
        password: hashedPassword,
        subscription: defaultSubscription,
        createdAt: new Date().toISOString()
      };
      
      // Push to Firebase creates a unique key
      const newUserRef = usersRef.push();
      await newUserRef.set(newUser);
      
      // Return the created user with its key as id
      return {
        id: newUserRef.key,
        ...newUser
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },
  
  // Find user by email
  findByEmail: async (email) => {
    try {
      const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
      const users = snapshot.val();
      
      if (!users) return null;
      
      // Get the first user (email should be unique)
      const userId = Object.keys(users)[0];
      return {
        id: userId,
        ...users[userId]
      };
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  },
  
  // Find user by ID
  findById: async (userId) => {
    try {
      const snapshot = await usersRef.child(userId).once('value');
      const user = snapshot.val();
      
      if (!user) return null;
      
      return {
        id: userId,
        ...user
      };
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  },
  
  // Update user
  update: async (userId, updateData) => {
    try {
      const userRef = usersRef.child(userId);
      await userRef.update({
        ...updateData,
        updatedAt: new Date().toISOString()
      });
      
      const updatedSnapshot = await userRef.once('value');
      return {
        id: userId,
        ...updatedSnapshot.val()
      };
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },
  
  // Get all users
  getAll: async () => {
    try {
      const snapshot = await usersRef.once('value');
      const usersData = snapshot.val();
      
      if (!usersData) return [];
      
      // Convert Firebase object to array with IDs
      return Object.entries(usersData).map(([id, userData]) => ({
        id,
        ...userData
      }));
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  },
  
  // Compare password
  comparePassword: async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
  }
};

module.exports = UserModel;