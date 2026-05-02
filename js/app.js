import { setupThemeToggle, showToast } from './components/ui.js';
import * as state from './core/state.js';
import * as history from './core/history.js';
import * as auth from './services/auth.js';
import * as database from './services/database.js';
import * as exportServices from './services/export.js';
import * as signature from './components/signature.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { auth as fbAuth, db, fbAppId } from './config/firebase.js';
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const isReadOnlyMode = !!new URLSearchParams(window.location.search).get('letterId');

window.undo = history.undo;
window.redo = history.redo;
window.resetLetter = history.resetLetter;
window.saveCurrentDraft = history.saveCurrentDraft;
window.loadDraft = history.loadDraft;
window.addCustomVariable = state.addCustomVariable;
window.removeCustomVariable = state.removeCustomVariable;
window.insertFormat = state.insertFormat;
window.saveAsCustomTemplate = database.saveAsCustomTemplate;
window.deleteCustomTemplate = database.deleteCustomTemplate;
window.executePDFDownload = exportServices.executePDFDownload;

window.openSignatureModal = () => signature.openSignatureModal(isReadOnlyMode);
window.closeSignatureModal = signature.closeSignatureModal;
window.clearSignature = signature.clearSignature;

document.addEventListener('DOMContentLoaded', () => {
    setupThemeToggle();
    signature.initSignaturePad();

    document.getElementById('google-login-btn').addEventListener('click', auth.loginUser);
    document.getElementById('auth-logout-btn').addEventListener('click', auth.logoutUser);
    document.getElementById('btn-save-cloud').addEventListener('click', database.saveLetterToCloud);
    document.getElementById('btn-save-signature').addEventListener('click', () => signature.saveSignature(isReadOnlyMode));
    
    Object.values(state.inputs).forEach(input => {
        input.addEventListener('input', () => { state.updatePreview(); history.saveStateToHistory(); });
    });

    onAuthStateChanged(fbAuth, (user) => {
        if (isReadOnlyMode) { auth.setCurrentUser(user); return; }

        if (user && user.email === auth.ALLOWED_EMAIL) {
            auth.setCurrentUser(user);
            document.getElementById('login-wrapper').classList.add('hidden');
            document.getElementById('app-wrapper').classList.remove('hidden', 'opacity-0');
            
            history.loadAutoSave();
            history.updateDraftsDropdown();
            state.updatePreview();
            database.setupDatabaseListener(isReadOnlyMode, () => {}, () => {}, () => {});
        } else {
            auth.setCurrentUser(null);
            document.getElementById('app-wrapper').classList.add('hidden');
            document.getElementById('login-wrapper').classList.remove('hidden');
            if (user) { auth.logoutUser(); document.getElementById('login-error').classList.remove('hidden'); }
        }
    });

    if (isReadOnlyMode) {
        document.getElementById('login-wrapper').style.display = 'none';
        document.getElementById('app-wrapper').classList.remove('hidden', 'opacity-0');
        document.querySelector('header').classList.add('hidden');
        document.querySelector('section.lg\\:w-\\[450px\\]').classList.add('hidden'); 
        document.getElementById('read-only-controls').classList.remove('hidden');
        
        getDoc(doc(db, 'artifacts', fbAppId, 'public', 'data', 'saved_letters', new URLSearchParams(window.location.search).get('letterId')))
        .then(snap => {
            if(snap.exists()) {
                const snapData = snap.data().data;
                state.setSecureRecipientEmail((snapData.toEmail || "").trim().toLowerCase());
                state.applyState(snapData);
                if (snapData.partnerSignUrl && snapData.partnerSignUrl.trim() !== '') {
                    document.getElementById('btn-ro-sign').classList.add('hidden');
                }
            } else {
                document.getElementById('document-wrapper').innerHTML = '<div class="p-10 text-gray-500 font-bold">Letter not found.</div>';
            }
        });
    }
});
