//The code is used to make a request to the Firebase Auth REST API to generate an ID token for a user. The code uses the Firebase Admin SDK to initialize the app and get the ID token for a user using their email and password. The ID token is then logged to the console.
//It mimics the functionality of a frontend application that authenticates users using email and password and generates an ID token to access Firebase services.
// Import Firebase functions from the modular SDK
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Initialize Firebase Client SDK with the config object
const firebaseConfig = {
  apiKey: "AIzaSyD0iODZIMyuOJ19pVp6HHOflV1IzPq7goI",
    authDomain: "biryani-darbar-770a5.firebaseapp.com",
    projectId: "biryani-darbar-770a5",
    storageBucket: "biryani-darbar-770a5.appspot.com",
    messagingSenderId: "90536512568",
    appId: "1:90536512568:web:654acbb0e3efcfcaf1aacd",
    measurementId: "G-869Y2HDKNN",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Function to get ID token
const getIdToken = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    console.log("Generated ID Token:", idToken);
  } catch (error) {
    console.error("Error generating ID token:", error.message);
  }
};

// Replace these with actual email and password from your Firebase Auth
getIdToken('pavaniatmakuri@gmail.com', 'pavaniatmakuri');
