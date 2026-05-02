export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    let bgClass = 'bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900';
    let icon = 'ph-info';
    if (type === 'success') { bgClass = 'bg-green-500 text-white'; icon = 'ph-check-circle'; } 
    else if (type === 'error') { bgClass = 'bg-red-500 text-white'; icon = 'ph-warning-circle'; }
    
    toast.className = `toast-enter flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl ${bgClass} pointer-events-auto`;
    toast.innerHTML = `<i class="ph ${icon} text-xl"></i><span class="font-medium text-sm">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export function setupThemeToggle() {
    const htmlEl = document.documentElement;
    const themeBtn = document.getElementById('theme-toggle');
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        htmlEl.classList.add('dark');
    } else {
        htmlEl.classList.remove('dark');
    }
    themeBtn.addEventListener('click', () => {
        htmlEl.classList.toggle('dark');
        localStorage.theme = htmlEl.classList.contains('dark') ? 'dark' : 'light';
    });
}
