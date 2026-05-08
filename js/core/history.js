import { getCurrentState, applyState, updatePreview, inputs, customVars, setCurrentLetterId, currentYear } from './state.js';
import { showToast } from '../components/ui.js';
import { fetchNextRefNumber } from '../services/database.js';
import { currentUser } from '../services/auth.js';

let historyStack = [];
let historyIndex = -1;
let isUndoRedoAction = false;
let historyTimeout;

export function loadAutoSave() {
    try {
        const saved = localStorage.getItem('letter_autosave');
        if (saved) {
            applyState(JSON.parse(saved));
        }
    } catch (e) {
        console.error("Failed to load autosave data", e);
    }
}

export function saveStateToHistory(force = false) {
    if (isUndoRedoAction) return;
    const executeSave = () => {
        const stateStr = JSON.stringify(getCurrentState());
        if (historyIndex >= 0 && historyStack[historyIndex] === stateStr) return;
        historyStack = historyStack.slice(0, historyIndex + 1);
        historyStack.push(stateStr);
        if (historyStack.length > 50) historyStack.shift();
        else historyIndex++;
    };
    if (force) { clearTimeout(historyTimeout); executeSave(); } 
    else { clearTimeout(historyTimeout); historyTimeout = setTimeout(executeSave, 500); }
}

export function undo() {
    if (historyIndex > 0) {
        isUndoRedoAction = true;
        historyIndex--;
        applyState(JSON.parse(historyStack[historyIndex]));
        isUndoRedoAction = false;
    }
}

export function redo() {
    if (historyIndex < historyStack.length - 1) {
        isUndoRedoAction = true;
        historyIndex++;
        applyState(JSON.parse(historyStack[historyIndex]));
        isUndoRedoAction = false;
    }
}

export async function resetLetter(force = false) {
    if(!force && !confirm("Are you sure you want to reset the letter? This will clear all content.")) return;
    if(inputs.template) inputs.template.value = "blank";
    if(inputs.toName) inputs.toName.value = ""; 
    if(inputs.toEmail) inputs.toEmail.value = ""; 
    if(inputs.toCompany) inputs.toCompany.value = "";
    if(inputs.toAddress) inputs.toAddress.value = ""; 
    if(inputs.subject) inputs.subject.value = ""; 
    if(inputs.body) inputs.body.value = "";
    if(inputs.partnerSignName) inputs.partnerSignName.value = ""; 
    if(inputs.partnerSignRole) inputs.partnerSignRole.value = "";
    if(inputs.partnerLogoUrl) inputs.partnerLogoUrl.value = ""; 
    if(inputs.partnerSignUrl) inputs.partnerSignUrl.value = "";
    if(inputs.deadline) inputs.deadline.value = ""; 
    if(inputs.isExpired) inputs.isExpired.checked = false;
    
    for (const key in customVars) delete customVars[key];
    setCurrentLetterId(crypto.randomUUID());

    if (currentUser) await fetchNextRefNumber();
    else if(inputs.ref) inputs.ref.value = `FD-${currentYear}/001`;
    
    updatePreview();
    saveStateToHistory(true);
    if (!force) showToast("Letter reset to blank.", "success");
}

function getDrafts() { return JSON.parse(localStorage.getItem('letter_drafts') || '{"list":[]}'); }

export function saveCurrentDraft() {
    const name = prompt("Enter a name for this draft checkpoint:");
    if (!name) return;
    const draftsData = getDrafts();
    draftsData.list.push({ id: Date.now().toString(), name: name, timestamp: new Date().toISOString(), data: getCurrentState() });
    localStorage.setItem('letter_drafts', JSON.stringify(draftsData));
    updateDraftsDropdown();
    showToast("Local draft saved successfully!", "success");
}

export function loadDraft(id) {
    if (!id) return;
    const draft = getDrafts().list.find(d => d.id === id);
    if (draft) {
        applyState(draft.data);
        saveStateToHistory(true);
        showToast("Draft loaded successfully.", "success");
    }
    const draftsSelect = document.getElementById('input-drafts');
    if(draftsSelect) draftsSelect.value = ""; 
}

export function updateDraftsDropdown() {
    const select = document.getElementById('input-drafts');
    if(!select) return;
    select.innerHTML = '<option value="">-- Load a Local Draft --</option>';
    getDrafts().list.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id; opt.textContent = `${d.name} (${new Date(d.timestamp).toLocaleDateString()})`;
        select.appendChild(opt);
    });
}
