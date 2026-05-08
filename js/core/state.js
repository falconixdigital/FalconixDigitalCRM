import { showToast } from '../components/ui.js';
import { saveStateToHistory } from './history.js';

export const inputs = {
    template: document.getElementById('input-template'),
    date: document.getElementById('input-date'),
    ref: document.getElementById('input-ref'),
    deadline: document.getElementById('input-deadline'),
    isExpired: document.getElementById('input-is-expired'),
    toName: document.getElementById('input-to-name'),
    toEmail: document.getElementById('input-to-email'),
    toCompany: document.getElementById('input-to-company'),
    toAddress: document.getElementById('input-to-address'),
    subject: document.getElementById('input-subject'),
    body: document.getElementById('input-body'),
    signName: document.getElementById('input-sign-name'),
    signRole: document.getElementById('input-sign-role'),
    partnerSignName: document.getElementById('input-partner-sign-name'),
    partnerSignRole: document.getElementById('input-partner-sign-role'),
    partnerLogoUrl: document.getElementById('input-partner-logo-url'),
    partnerSignUrl: document.getElementById('input-partner-sign-url'),
    agencyPhone: document.getElementById('input-agency-phone'),
    agencyEmail: document.getElementById('input-agency-email'),
    agencyWeb: document.getElementById('input-agency-web'),
    agencyAddress: document.getElementById('input-agency-address'),
    logoUrl: document.getElementById('input-logo-url'),
    signUrl: document.getElementById('input-sign-url')
};

export let currentYear = new Date().getFullYear();
export let currentLetterId = crypto.randomUUID();
export let secureRecipientEmail = "";
export let customVars = {};
export let expectedNextCount = 1;

export const setCurrentLetterId = (id) => currentLetterId = id;
export const setSecureRecipientEmail = (email) => secureRecipientEmail = email;
export const setExpectedNextCount = (count) => expectedNextCount = count;

export function getCurrentState() {
    const state = {};
    Object.keys(inputs).forEach(key => {
        if (inputs[key]) {
            state[key] = inputs[key].type === 'checkbox' ? inputs[key].checked : inputs[key].value;
        }
    });
    state._customVars = { ...customVars };
    state.letterId = currentLetterId;
    return state;
}

export function applyState(stateData) {
    if (!stateData) return;
    Object.keys(inputs).forEach(key => {
        if (inputs[key] && stateData[key] !== undefined) {
            if (inputs[key].type === 'checkbox') {
                inputs[key].checked = stateData[key] === true || stateData[key] === "true";
            } else {
                inputs[key].value = stateData[key];
            }
        }
    });
    for (const key in customVars) delete customVars[key];
    Object.assign(customVars, stateData._customVars || {});
    
    const urlParams = new URLSearchParams(window.location.search);
    currentLetterId = stateData.letterId || urlParams.get('letterId') || crypto.randomUUID();
    renderCustomVariables();
    updatePreview();
}

export function addCustomVariable() {
    let name = prompt("Enter variable name (e.g., Salary, Joining Date):");
    if (!name) return;
    const tag = name.trim().startsWith('[') && name.trim().endsWith(']') ? name.trim() : `[${name.trim()}]`;
    if (customVars[tag] !== undefined) return showToast("Variable already exists!", "error");
    customVars[tag] = "";
    renderCustomVariables();
    updatePreview();
    saveStateToHistory(true);
}

export function removeCustomVariable(tag) {
    delete customVars[tag];
    renderCustomVariables();
    updatePreview();
    saveStateToHistory(true);
}

export function renderCustomVariables() {
    const container = document.getElementById('custom-variables-container');
    if(!container) return;
    container.innerHTML = '';
    const keys = Object.keys(customVars);
    if (keys.length === 0) { container.innerHTML = '<p class="text-xs text-gray-500 italic">No custom variables added yet.</p>'; return; }
    
    keys.forEach(tag => {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm';
        wrapper.innerHTML = `
            <label class="text-xs font-semibold text-brandAccent w-1/3 truncate" title="${tag}">${tag}</label>
            <input type="text" class="custom-var-input flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-sm outline-none text-gray-900 dark:text-white" data-tag="${tag}" value="${customVars[tag]}" placeholder="Value...">
            <button type="button" class="text-red-400 hover:text-red-600 transition-colors p-1" onclick="removeCustomVariable('${tag}')"><i class="ph ph-trash text-base"></i></button>
        `;
        container.appendChild(wrapper);
    });
    document.querySelectorAll('.custom-var-input').forEach(input => {
        input.addEventListener('input', (e) => { customVars[e.target.dataset.tag] = e.target.value; updatePreview(); saveStateToHistory(); });
    });
}

export function insertFormat(prefix, suffix) {
    const textarea = inputs.body;
    if(!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let finalPrefix = prefix;
    if ((prefix.includes('- ') || prefix.includes('---') || prefix.includes('|')) && start > 0 && textarea.value.charAt(start - 1) !== '\n') {
        finalPrefix = '\n' + prefix;
    }
    const insertion = finalPrefix + selectedText + suffix;
    textarea.value = textarea.value.substring(0, start) + insertion + textarea.value.substring(end);
    textarea.focus();
    textarea.selectionStart = start + (selectedText.length === 0 ? finalPrefix.length : insertion.length);
    textarea.selectionEnd = textarea.selectionStart;
    updatePreview();
    saveStateToHistory(true); 
}

function parseFormatting(text) {
    if (!text) return '<span class="text-gray-400 italic">[Your letter content will appear here.]</span>';
    let html = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html = html.replace(/==([^=]+)==/g, '<mark class="bg-brandAccent/40 px-1.5 py-0.5 rounded font-semibold text-gray-900">$1</mark>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
    html = html.replace(/\[center\]([\s\S]*?)\[\/center\]/g, '<div class="text-center">$1</div>');
    html = html.replace(/\[right\]([\s\S]*?)\[\/right\]/g, '<div class="text-right">$1</div>');
    
    const lines = html.split('\n');
    let inList = false; let inTable = false; let finalHtml = '';

    lines.forEach(line => {
        let tLine = line.trim();
        if (tLine.startsWith('- ')) {
            if (inTable) { finalHtml += '</tbody></table>'; inTable = false; }
            if (!inList) { finalHtml += '<ul class="list-disc pl-5 my-2 space-y-1">'; inList = true; }
            finalHtml += `<li>${line.substring(2)}</li>`;
        } else if (tLine.startsWith('|') && tLine.endsWith('|')) {
            if (inList) { finalHtml += '</ul>'; inList = false; }
            if (!inTable) { finalHtml += '<table class="w-full text-left border-collapse my-4 border border-gray-300 dark:border-gray-700"><thead>'; inTable = true; }
            if (tLine.includes('---')) { finalHtml += '</thead><tbody>'; } 
            else {
                const cells = tLine.substring(1, tLine.length - 1).split('|');
                finalHtml += '<tr>';
                cells.forEach(cell => {
                    const tag = finalHtml.includes('<tbody>') ? 'td' : 'th';
                    finalHtml += `<${tag} class="border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm">${cell.trim()}</${tag}>`;
                });
                finalHtml += '</tr>';
            }
        } else {
            if (inList) { finalHtml += '</ul>'; inList = false; }
            if (inTable) { finalHtml += '</tbody></table>'; inTable = false; }
            if (tLine.match(/^<div class="text-(center|right)">$/) || tLine === '</div>') finalHtml += tLine;
            else finalHtml += line + (tLine === '' ? '<br>' : '<br>'); 
        }
    });
    if (inList) finalHtml += '</ul>';
    if (inTable) { if(!finalHtml.includes('<tbody>')) finalHtml += '</thead>'; finalHtml += '</tbody></table>'; }
    return finalHtml.replace(/<br><ul/g, '<ul').replace(/<\/ul><br>/g, '</ul>');
}

export function updatePreview() {
    const today = new Date().toISOString().split('T')[0];
    const state = {
        date: inputs.date?.value || today, 
        ref: inputs.ref?.value.trim() || '-',
        toName: inputs.toName?.value.trim() || '[Recipient Name]', 
        toCompany: inputs.toCompany?.value.trim() || '',
        toAddress: inputs.toAddress?.value.trim() || '', 
        subject: inputs.subject?.value.trim() || '[Letter Subject]',
        body: inputs.body?.value || '', 
        signName: inputs.signName?.value.trim() || 'Signatory Name',
        signRole: inputs.signRole?.value.trim() || 'Designation', 
        signUrl: inputs.signUrl?.value.trim() || '',
        partnerSignName: inputs.partnerSignName?.value.trim() || '', 
        partnerSignRole: inputs.partnerSignRole?.value.trim() || '',
        partnerLogoUrl: inputs.partnerLogoUrl?.value.trim() || '', 
        partnerSignUrl: inputs.partnerSignUrl?.value.trim() || '',
        agencyPhone: inputs.agencyPhone?.value.trim() || '+91 86370 28337', 
        agencyEmail: inputs.agencyEmail?.value.trim() || 'digitalfalconix@gmail.com',
        agencyWeb: inputs.agencyWeb?.value.trim() || 'falconixdigital.netlify.app', 
        agencyAddress: inputs.agencyAddress?.value.trim() || 'Motihari, Bihar, India',
        logoUrl: inputs.logoUrl?.value.trim() || ''
    };

    localStorage.setItem('letter_autosave', JSON.stringify(getCurrentState()));

    const variableMap = {
        '[Recipient Name]': state.toName !== '[Recipient Name]' ? state.toName : '__________',
        '[Company Name]': 'Falconix Digital',
        '[Partner Name]': state.partnerSignName || '__________',
        '[Date]': state.date ? new Date(state.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '__________'
    };
    for (let key in customVars) variableMap[key] = customVars[key].trim() || '__________';

    // Safely check expiry conditions
    const isManualExpired = inputs.isExpired ? inputs.isExpired.checked : false;
    const deadlineVal = inputs.deadline ? inputs.deadline.value : null;
    let isPastDeadline = false;
    if (deadlineVal) {
        const deadlineDate = new Date(deadlineVal);
        deadlineDate.setHours(23, 59, 59, 999);
        if (new Date() > deadlineDate) isPastDeadline = true;
    }
    const isExpired = isManualExpired || isPastDeadline;


    const pages = (state.body || '').split(/(?:\r?\n)?---(?:\r?\n)?/);
    const staticQrCodeUrl = "https://i.ibb.co/4RpHrqMH/FD.jpg";
    const shareUrl = window.location.origin + window.location.pathname + '?letterId=' + currentLetterId;
    
    let dynamicQrCodeUrl = '';
    if (typeof qrcode !== 'undefined') {
        const qr = qrcode(0, 'M');
        qr.addData(shareUrl);
        qr.make();
        dynamicQrCodeUrl = qr.createDataURL(4, 0);
    }

    let html = '';
    pages.forEach((pageContent, index) => {
        const isFirst = index === 0; const isLast = index === pages.length - 1;
        let parsedContent = parseFormatting(pageContent);
        
        for (const [tag, actualValue] of Object.entries(variableMap)) {
            const regex = new RegExp(tag.replace(/\[/g, '\\[').replace(/\]/g, '\\]'), 'gi');
            const safeValue = actualValue.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            parsedContent = parsedContent.replace(regex, `<span class="bg-brandAccent/10 text-brandDark dark:text-brandAccent rounded px-1 font-semibold">${safeValue}</span>`);
        }

        html += `
        <div class="a4-page flex flex-col relative overflow-hidden bg-white ${isFirst ? '' : 'page-break-before shadow-2xl'}">
            
            ${isExpired ? `
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-[100] overflow-hidden">
                <div class="transform -rotate-45 text-red-600 opacity-10 pointer-events-none flex flex-col items-center justify-center border-[12px] border-red-600 rounded-3xl p-8" style="min-width: 600px;">
                    <span class="text-[140px] font-black tracking-[0.2em] leading-none text-center">EXPIRED</span>
                </div>
            </div>
            ` : ''}

            <div class="absolute top-32 bottom-20 left-0 right-0 flex items-center justify-center pointer-events-none z-0">
                <img src="${state.logoUrl}" class="w-3/4 max-w-lg opacity-[0.06] object-contain ${state.logoUrl ? '' : 'hidden'}" alt="Watermark" crossorigin="anonymous">
            </div>
            
            <div class="px-12 py-8 bg-darkBg flex justify-between items-center relative z-10 border-b border-gray-900 shadow-sm">
                <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brandAccent via-brand to-brandDark"></div>
                <div class="flex items-center gap-4">
                    ${state.logoUrl ? `<img src="${state.logoUrl}" class="h-20 w-auto object-contain drop-shadow-md" alt="Company Logo" crossorigin="anonymous">` : ''}
                    <div class="flex flex-col justify-center">
                        <h1 class="text-3xl font-black tracking-tight leading-none text-white" style="font-family: 'Inter', sans-serif;">Falconix <span class="text-brand">Digital</span></h1>
                        <p class="text-xs text-brandAccent font-bold tracking-widest uppercase mt-1.5 leading-none">Innovation In Flight</p>
                    </div>
                    ${state.partnerLogoUrl ? `<i class="ph ph-x text-gray-500 text-xl ml-4"></i><img src="${state.partnerLogoUrl}" class="h-16 w-auto object-contain drop-shadow-md" alt="Partner Logo" crossorigin="anonymous">` : ''}
                </div>
                <div class="text-right text-[11px] text-gray-300 leading-relaxed">
                    <p class="flex items-center justify-end gap-1.5"><i class="ph-fill ph-phone text-brandAccent"></i> <span>${state.agencyPhone}</span></p>
                    <p class="flex items-center justify-end gap-1.5"><i class="ph-fill ph-envelope-simple text-brandAccent"></i> <span>${state.agencyEmail}</span></p>
                    <p class="flex items-center justify-end gap-1.5"><i class="ph-fill ph-globe text-brandAccent"></i> <span>${state.agencyWeb}</span></p>
                </div>
            </div>

            <div class="px-12 py-10 flex-1 flex flex-col relative z-10 bg-white/0 min-h-0 overflow-hidden">
                ${isFirst ? `
                    <div class="flex justify-between items-start mb-8 text-sm text-gray-700">
                        <div class="font-medium"><p>Ref: <span class="text-black">${state.ref}</span></p></div>
                        <div class="font-medium"><p>Date: <span class="text-black">${new Date(state.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></p></div>
                    </div>
                    <div class="mb-8">
                        <p class="text-sm font-bold text-black mb-1">To,</p>
                        <p class="text-sm font-semibold text-black">${state.toName}</p>
                        ${state.toCompany ? `<p class="text-sm font-medium text-gray-800">${state.toCompany}</p>` : ''}
                        ${state.toAddress ? `<p class="text-sm text-gray-700 whitespace-pre-line mt-1">${state.toAddress}</p>` : ''}
                    </div>
                    <div class="mb-8 flex">
                        <span class="text-sm font-bold text-black w-20 shrink-0">Subject:</span>
                        <p class="text-sm font-bold text-black flex-1 underline underline-offset-4 decoration-brand">${state.subject}</p>
                    </div>
                ` : `<div class="mb-6"><span class="text-xs text-gray-400 uppercase tracking-wider font-bold">Continued...</span></div>`}

                <div class="text-sm text-gray-800 leading-[1.8] flex-1">
                    <div class="text-justify text-gray-800 space-y-2">
                        ${parsedContent}
                    </div>
                </div>

                ${isLast ? `
                    <div class="mt-16 pt-8 grid grid-cols-2 gap-8">
                        <div>
                            <p class="text-sm text-gray-800 mb-4">Sincerely,</p>
                            <div class="mb-2 relative w-max h-20 flex items-end">
                                ${state.signUrl ? `<img src="${state.signUrl}" class="h-20 object-contain mix-blend-multiply" alt="Signature" crossorigin="anonymous">` : `<p class="font-signature text-4xl text-blue-900 transform -rotate-3 opacity-90 pb-2 pr-4">${state.signName}</p>`}
                                ${state.logoUrl ? `<div class="absolute top-0 right-0 transform rotate-[-10deg] -translate-y-4 translate-x-10 pointer-events-none opacity-[0.15]"><img src="${state.logoUrl}" class="w-20 h-20 object-contain mix-blend-multiply" alt="Company Seal" crossorigin="anonymous"></div>` : ''}
                            </div>
                            <p class="text-sm font-bold text-black mt-2">${state.signName}</p>
                            <p class="text-xs font-medium text-gray-700">${state.signRole}</p>
                        </div>
                        ${(state.partnerSignName || state.partnerSignRole || state.partnerSignUrl) ? `
                        <div>
                            <p class="text-sm text-gray-800 mb-4">Acknowledged & Agreed,</p>
                            <div class="mb-2 relative w-max h-20 flex items-end">
                                ${state.partnerSignUrl ? `<img src="${state.partnerSignUrl}" class="h-20 object-contain mix-blend-multiply" alt="Partner Signature" crossorigin="anonymous">` : `<div class="h-20 w-40"></div>`}
                            </div>
                            <p class="text-sm font-bold text-black mt-2">${state.partnerSignName || 'Partner Name'}</p>
                            <p class="text-xs font-medium text-gray-700">${state.partnerSignRole || 'Partner Title'}</p>
                        </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>

            <div class="px-12 py-5 bg-darkBg flex justify-between items-center text-[10px] text-gray-400 relative z-10">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brandDark via-brand to-brandAccent"></div>
                <div class="flex items-center gap-3">
                    <div class="flex gap-2">
                        <div class="flex flex-col items-center justify-center">
                            <img src="${staticQrCodeUrl}" class="w-10 h-10 rounded bg-white p-0.5 object-cover" alt="Website QR" crossorigin="anonymous">
                            <span class="text-[6px] font-bold mt-1 text-gray-400 uppercase tracking-widest">Website</span>
                        </div>
                        <div class="flex flex-col items-center justify-center">
                            <img src="${dynamicQrCodeUrl}" class="w-10 h-10 rounded bg-white p-0.5 object-cover" alt="Verify QR">
                            <span class="text-[6px] font-bold mt-1 text-brandAccent uppercase tracking-widest">Verify</span>
                        </div>
                    </div>
                    <div class="flex flex-col justify-center border-l border-gray-700 pl-3 h-10">
                        <span class="font-bold text-gray-300 mb-0.5 text-[11px]">Falconix Digital</span>
                        <span>Address: ${state.agencyAddress}</span>
                    </div>
                </div>
                <p class="font-medium text-brandAccent tracking-widest uppercase text-right">
                    ${isLast ? 'CONFIDENTIAL' : `PAGE ${index + 1} OF ${pages.length}`}
                </p>
            </div>
        </div>
        `;
    });
    
    const wrapper = document.getElementById('document-wrapper');
    if(wrapper) wrapper.innerHTML = html;
}
