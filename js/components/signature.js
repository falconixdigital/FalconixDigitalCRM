import { inputs, currentLetterId, secureRecipientEmail, updatePreview } from '../core/state.js';
import { showToast } from './ui.js';
import { currentUser, loginUser, logoutUser, ALLOWED_EMAIL } from '../services/auth.js';
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, fbAppId } from '../config/firebase.js';

let isDrawing = false;
let sigCanvas, sigCtx;

export function initSignaturePad() {
    sigCanvas = document.getElementById('signature-pad');
    if (!sigCanvas) return;
    sigCtx = sigCanvas.getContext('2d');

    const getMousePos = (evt) => {
        const rect = sigCanvas.getBoundingClientRect();
        const clientX = evt.clientX || (evt.touches && evt.touches[0].clientX);
        const clientY = evt.clientY || (evt.touches && evt.touches[0].clientY);
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDraw = (e) => { e.preventDefault(); isDrawing = true; const pos = getMousePos(e); sigCtx.beginPath(); sigCtx.moveTo(pos.x, pos.y); };
    const draw = (e) => { e.preventDefault(); if (!isDrawing) return; const pos = getMousePos(e); sigCtx.lineTo(pos.x, pos.y); sigCtx.stroke(); };
    const stopDraw = (e) => { e.preventDefault(); if (isDrawing) { sigCtx.stroke(); sigCtx.closePath(); isDrawing = false; } };

    sigCanvas.addEventListener('mousedown', startDraw);
    sigCanvas.addEventListener('mousemove', draw);
    sigCanvas.addEventListener('mouseup', stopDraw);
    sigCanvas.addEventListener('mouseout', stopDraw);
    sigCanvas.addEventListener('touchstart', startDraw, {passive: false});
    sigCanvas.addEventListener('touchmove', draw, {passive: false});
    sigCanvas.addEventListener('touchend', stopDraw, {passive: false});
}

export async function openSignatureModal(isReadOnlyMode) {
    const recipientEmail = isReadOnlyMode ? secureRecipientEmail : inputs.toEmail.value.trim().toLowerCase();
    if (!recipientEmail) return showToast("Security Error: No recipient email specified.", "error");

    const isAuthorized = (email) => email.toLowerCase() === recipientEmail || email.toLowerCase() === ALLOWED_EMAIL.toLowerCase();

    if (!currentUser || !isAuthorized(currentUser.email)) {
        if (currentUser) await logoutUser();
        try {
            await loginUser();
            if (!isAuthorized(currentUser.email)) {
                await logoutUser();
                return showToast(`Access Denied! You must log in as: ${recipientEmail}`, "error");
            }
        } catch (err) {
            return showToast("Identity verification cancelled.", "error");
        }
    }

    const modal = document.getElementById('signature-modal');
    modal.classList.remove('hidden');
    const rect = sigCanvas.parentElement.getBoundingClientRect();
    sigCanvas.width = rect.width; sigCanvas.height = rect.height;
    sigCtx.strokeStyle = localStorage.theme === 'dark' ? '#fff' : '#000080';
    sigCtx.lineWidth = 3; sigCtx.lineCap = 'round'; sigCtx.lineJoin = 'round';
    clearSignature();
}

export function closeSignatureModal() { document.getElementById('signature-modal').classList.add('hidden'); }
export function clearSignature() { sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height); }

export async function saveSignature(isReadOnlyMode) {
    const recipientEmail = isReadOnlyMode ? secureRecipientEmail : inputs.toEmail.value.trim().toLowerCase();
    const isAuthorized = currentUser && (currentUser.email.toLowerCase() === recipientEmail || currentUser.email.toLowerCase() === ALLOWED_EMAIL.toLowerCase());
    
    if (!isAuthorized) return showToast("Security Block: Unauthorized identity detected.", "error");

    const btn = document.getElementById('btn-save-signature');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `<i class="ph ph-spinner animate-spin text-lg"></i> Saving...`;
    btn.disabled = true;

    const sigDataUrl = sigCanvas.toDataURL('image/png');
    inputs.partnerSignUrl.value = sigDataUrl;
    if(!inputs.partnerSignName.value.trim()) inputs.partnerSignName.value = inputs.toName.value.trim() || 'Client Signature';

    try {
        const docRef = doc(db, 'artifacts', fbAppId, 'public', 'data', 'saved_letters', currentLetterId);
        await updateDoc(docRef, { "data.partnerSignUrl": sigDataUrl, "data.partnerSignName": inputs.partnerSignName.value });
        updatePreview();
        closeSignatureModal();
        showToast("Signature attached successfully!", "success");
        document.getElementById('btn-ro-sign').classList.add('hidden');
    } catch (err) {
        showToast("Failed to save signature. Check Firestore Rules.", "error");
    } finally {
        btn.innerHTML = originalHtml; btn.disabled = false;
    }
}
