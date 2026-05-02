import { showToast } from '../components/ui.js';
import { inputs, getCurrentState, currentLetterId, currentYear, updatePreview, customVars } from '../core/state.js';
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, fbAppId } from '../config/firebase.js';

export function executePDFDownload(btnId) {
    const wrapper = document.getElementById('document-wrapper');
    const previewContainer = document.querySelector('.preview-container');
    const mainContent = document.querySelector('main');
    const body = document.body;
    const btn = document.getElementById(btnId);
    const originalHtml = btn.innerHTML;
    
    btn.innerHTML = `<i class="ph ph-spinner animate-spin text-xl"></i> Generating PDF...`;
    btn.disabled = true;

    const origPreviewOverflow = previewContainer.style.overflow;
    const origMainOverflow = mainContent.style.overflow;
    previewContainer.style.overflow = 'visible';
    mainContent.style.overflow = 'visible';
    body.classList.remove('h-screen'); body.style.height = 'auto';
    wrapper.classList.remove('gap-8', 'pb-8');
    
    const pages = wrapper.querySelectorAll('.a4-page');
    pages.forEach(page => { page.classList.remove('shadow-2xl'); page.style.boxShadow = 'none'; page.style.margin = '0'; });

    const safeName = (inputs.subject.value.trim() || 'Document').replace(/[^a-zA-Z0-9\-]/g, '_');
    const opt = { margin: 0, filename: `${safeName}.pdf`, image: { type: 'jpeg', quality: 1 }, html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0, windowHeight: wrapper.scrollHeight }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: 'css', before: '.page-break-before' } };

    setTimeout(() => {
        html2pdf().set(opt).from(wrapper).save().then(() => {
            previewContainer.style.overflow = origPreviewOverflow;
            mainContent.style.overflow = origMainOverflow;
            body.classList.add('h-screen'); body.style.height = '';
            wrapper.classList.add('gap-8', 'pb-8');
            pages.forEach(page => { page.classList.add('shadow-2xl'); page.style.boxShadow = ''; page.style.margin = '0 auto'; });
            btn.innerHTML = `<i class="ph ph-check-circle text-xl"></i> Downloaded!`;
            setTimeout(() => { btn.innerHTML = originalHtml; btn.disabled = false; }, 2000);
        });
    }, 100);
}
