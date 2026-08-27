// ==========================================================================
// XIANO — Firebase & imgbb configuration
// --------------------------------------------------------------------------
// Replace every value below with your own. Get the firebaseConfig object
// from: Firebase Console -> Project Settings -> General -> "Your apps" ->
// SDK setup and configuration -> Config.
// Get an imgbb key free at https://api.imgbb.com/  (sign up -> "Add API key")
// ==========================================================================

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const IMGBB_API_KEY = "YOUR_IMGBB_KEY";

// WhatsApp number customers land on after checkout confirmation (digits only, country code, no + or spaces)
const WHATSAPP_NUMBER = "8801XXXXXXXXX";

// --- Firebase init (uses the compat SDKs loaded via <script> tags in the HTML) ---
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
