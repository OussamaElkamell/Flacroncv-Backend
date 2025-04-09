
const admin = require('firebase-admin');

// Initialize Firebase Admin with service account if not already initialized
if (!admin.apps.length) {
  try {
    console.log('Initializing Firebase Admin SDK');
    
    // Check if using service account from environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Parse the service account from the environment variable
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://flacroncv-9695f-default-rtdb.firebaseio.com'
      });
      console.log('Firebase Admin initialized with service account from environment');
    } else {
      // Fall back to application default credentials
      admin.initializeApp({
        databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://flacroncv-9695f-default-rtdb.firebaseio.com'
      });
      console.log('Firebase Admin initialized with application default credentials');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    // Initialize with minimal configuration to prevent further errors
    admin.initializeApp();
    console.log('Firebase Admin initialized with minimal configuration due to error');
  }
}

const db = admin.database();

module.exports = {
  admin,
  db
};
