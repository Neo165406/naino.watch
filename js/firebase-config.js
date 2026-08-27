// ==========================================================================
// XIANO — Firebase & imgbb configuration
// ==========================================================================

const firebaseConfig = {
  apiKey: "AIzaSyB4GoBzWxTWL1Mzd6UyweHx5cwsFemCPPo",
  authDomain: "xiano-watch.firebaseapp.com",
  projectId: "xiano-watch",
  storageBucket: "xiano-watch.firebasestorage.app",
  messagingSenderId: "1098018384738",
  appId: "1:1098018384738:web:5067626c12ffa9d6cb1a3b"
};

const IMGBB_API_KEY = "d17f8586baf26cc082937e7a4b143bc9";

const WHATSAPP_NUMBER = "+880 1533-799704";

// --- Firebase init (uses the compat SDKs loaded via <script> tags in the HTML) ---
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
