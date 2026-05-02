import { db, fbAppId } from '../config/firebase.js';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { showToast } from '../components/ui.js';
import { inputs, currentYear, expectedNextCount, setExpectedNextCount, updatePreview, currentLetterId, getCurrentState } from '../core/state.js';
import { currentUser } from './auth.js';
import { resetLetter } from '../core/history.js';

export let lettersList = [];
export let customTemplatesList = [];
let unsubscribeLetters = null;
let unsubscribeCustomTemplates = null;

const formatDate = (ms) => new Date(ms).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export async function fetchNextRefNumber() {
    if (!currentUser) return;
    let maxCount = 0;
    const prefix = `FD-${currentYear}/`;
    lettersList.forEach(letter => {
        if (letter.ref && letter.ref.startsWith(prefix)) {
            const num = parseInt(letter.ref.replace(prefix, ''), 10);
            if (!isNaN(num) && num > maxCount) maxCount = num;
        }
    });
    setExpectedNextCount(maxCount + 1);
    inputs.ref.value = `${prefix}${String(expectedNextCount).padStart(3, '0')}`;
    updatePreview();
}

export async function saveLetterToCloud() {
    if (!currentUser) return showToast("You must be logged in.", "error");

    const currentRef = inputs.ref.value.trim();
    if (currentRef !== "" && lettersList.some(l => l.ref === currentRef && l.id !== currentLetterId)) {
        return showToast("A letter with this Reference Number already exists!", "error");
    }

    const btnSaveCloud = document.getElementById('btn-save-cloud');
    const originalHtml = btnSaveCloud.innerHTML;
    btnSaveCloud.innerHTML = '<i class="ph ph-spinner animate-spin text-lg"></i> Saving...';
    btnSaveCloud.disabled = true;

    try {
        await setDoc(doc(db, 'artifacts', fbAppId, 'public', 'data', 'saved_letters', currentLetterId), {
            data: getCurrentState(), type: inputs.template.value || 'blank',
            subject: inputs.subject.value.trim() || 'Untitled Document', recipient: inputs.toName.value.trim() || 'Unknown Recipient',
            ref: inputs.ref.value.trim(), createdAt: Date.now()
        });
        showToast("Letter saved securely to the cloud.", "success");
        await resetLetter(true);
    } catch (error) { showToast("Failed to save to cloud.", "error"); } 
    finally { btnSaveCloud.innerHTML = originalHtml; btnSaveCloud.disabled = false; }
}

export async function saveAsCustomTemplate() {
    if (!currentUser) return showToast("You must be logged in to save templates.", "error");
    const name = prompt("Enter a name for this Custom Template:");
    if (!name) return;
    await setDoc(doc(db, 'artifacts', fbAppId, 'public', 'data', 'custom_templates', crypto.randomUUID()), {
        name: name.trim(), subject: inputs.subject.value.trim(), body: inputs.body.value,
        createdAt: Date.now(), createdBy: currentUser.email
    });
    showToast("Custom template saved to cloud!", "success");
}

export async function deleteCustomTemplate(id) {
    if (!confirm("Are you sure you want to delete this custom template?")) return;
    await deleteDoc(doc(db, 'artifacts', fbAppId, 'public', 'data', 'custom_templates', id));
    showToast("Template deleted.", "success");
}

export async function deleteCloudLetter(id) {
    if (!currentUser) return;
    if (!confirm("Are you sure you want to permanently delete this archived letter?")) return;
    await deleteDoc(doc(db, 'artifacts', fbAppId, 'public', 'data', 'saved_letters', id));
    showToast("Letter deleted securely.", "success");
}

export function setupDatabaseListener(isReadOnlyMode, renderTemplateDropdown, renderCloudLetters, renderManageTemplates) {
    if (!currentUser) return;
    unsubscribeLetters = onSnapshot(collection(db, 'artifacts', fbAppId, 'public', 'data', 'saved_letters'), (snapshot) => {
        lettersList = [];
        snapshot.forEach(doc => lettersList.push({ id: doc.id, ...doc.data() }));
        lettersList.sort((a, b) => b.createdAt - a.createdAt);
        if (inputs.template.value === 'blank' && !isReadOnlyMode) fetchNextRefNumber();
        renderCloudLetters();
    });

    unsubscribeCustomTemplates = onSnapshot(collection(db, 'artifacts', fbAppId, 'public', 'data', 'custom_templates'), (snapshot) => {
        customTemplatesList = [];
        snapshot.forEach(doc => customTemplatesList.push({ id: doc.id, ...doc.data() }));
        renderTemplateDropdown();
        renderManageTemplates();
    });
}
