import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app-check.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyClR_nY11CdpWKLmMy7TgTCKtS26s_h24g",
    authDomain: "fd-employee-data.firebaseapp.com",
    projectId: "fd-employee-data",
    storageBucket: "fd-employee-data.firebasestorage.app",
    messagingSenderId: "151106809716",
    appId: "1:151106809716:web:7f540e0ce6b77bd70f4621",
    measurementId: "G-Z4K2GGQTX6"
};

export const app = initializeApp(firebaseConfig);
export const fbAppId = 'falconix-letters';

export const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider('6Ldp4NMsAAAAAJ1hdoSHQ5bO9z0BGmSX2o-5Lnkx'), 
    isTokenAutoRefreshEnabled: true
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
