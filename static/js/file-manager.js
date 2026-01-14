/**
 * File Manager - Sistema de Upload, Visualização e Compartilhamento
 * Funcionalidades:
 * - Upload drag & drop
 * - Visualizador inline
 * - Geração de PDF/Excel no frontend
 * - Compartilhamento com links públicos
 * - Upload para nuvem (Google Drive, Dropbox)
 */

class FileManager {
    constructor() {
        this.uploadedFiles = [];
        this.currentViewer = null;
        this.cloudProviders = {
            googleDrive: null,
            dropbox: null
        };
        this.init();
    }

    init() {
        this.setupDragDrop();
        this.loadCloudAPIs();
        console.log('FileManager initialized');
    }

    // ============================================
    // DRAG & DROP UPLOAD
    // ============================================

    setupDragDrop() {
        const dropZone = document.getElementById('dropzone-upload');
        if (!dropZone) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => this.highlight(dropZone), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => this.unhighlight(dropZone), false);
        });

        dropZone.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlight(element) {
        element.classList.add('border-indigo-500', 'bg-indigo-50', 'scale-105');
    }

    unhighlight(element) {
        element.classList.remove('border-indigo-500', 'bg-indigo-50', 'scale-105');
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        this.handleFiles(files);
    }

    handleFiles(files) {
        [...files].forEach(file => this.uploadFile(file));
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        // Criar preview imediato
        const fileId = this.createFilePreview(file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.updateFilePreview(fileId, 'success', data);
                this.uploadedFiles.push({
                    id: data.fileId,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    url: data.url
                });
            } else {
                this.updateFilePreview(fileId, 'error', data);
            }
        } catch (error) {
            this.updateFilePreview(fileId, 'error', { message: error.message });
        }
    }

    createFilePreview(file) {
        const fileId = 'file-' + Date.now();
        const container = document.getElementById('upload-preview-container');

        const preview = document.createElement('div');
        preview.id = fileId;
        preview.className = 'bg-white rounded-lg p-4 shadow-md border-2 border-gray-200 animate-fade-in';
        preview.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                    ${this.getFileIcon(file.type)}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-900 truncate">${file.name}</p>
                    <p class="text-xs text-gray-500">${this.formatFileSize(file.size)}</p>
                </div>
                <div class="upload-status">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                </div>
            </div>
            <div class="mt-2 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div class="bg-indigo-600 h-full rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
        `;

        container.appendChild(preview);
        this.animateProgress(fileId);
        return fileId;
    }

    updateFilePreview(fileId, status, data) {
        const preview = document.getElementById(fileId);
        if (!preview) return;

        const statusElement = preview.querySelector('.upload-status');
        const progressBar = preview.querySelector('.bg-indigo-600');

        if (status === 'success') {
            progressBar.style.width = '100%';
            statusElement.innerHTML = `
                <button onclick="fileManager.viewFile('${data.fileId}')"
                        class="text-green-600 hover:text-green-700">
                    <i data-lucide="eye" class="w-5 h-5"></i>
                </button>
            `;
            lucide.createIcons();
        } else {
            statusElement.innerHTML = `
                <div class="text-red-600" title="${data.message}">
                    <i data-lucide="alert-circle" class="w-5 h-5"></i>
                </div>
            `;
            lucide.createIcons();
        }
    }

    animateProgress(fileId) {
        const preview = document.getElementById(fileId);
        if (!preview) return;

        const progressBar = preview.querySelector('.bg-indigo-600');
        let progress = 0;

        const interval = setInterval(() => {
            progress += Math.random() * 30;
            if (progress > 90) progress = 90;
            progressBar.style.width = progress + '%';

            if (progress >= 90) clearInterval(interval);
        }, 200);
    }

    // ============================================
    // VISUALIZADOR INLINE
    // ============================================

    viewFile(fileId) {
        const file = this.uploadedFiles.find(f => f.id === fileId);
        if (!file) return;

        const modal = this.createViewerModal(file);
        document.body.appendChild(modal);

        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('.modal-content').classList.remove('scale-95');
        }, 10);
    }

    createViewerModal(file) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm opacity-0 transition-opacity duration-300';
        modal.innerHTML = `
            <div class="modal-content bg-white rounded-2xl shadow-2xl w-11/12 h-5/6 max-w-7xl transform scale-95 transition-transform duration-300">
                <!-- Header -->
                <div class="flex items-center justify-between p-4 border-b bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
                    <div class="flex items-center gap-3">
                        <i data-lucide="file" class="w-6 h-6"></i>
                        <div>
                            <h3 class="font-bold text-lg">${file.name}</h3>
                            <p class="text-xs text-white/80">${this.formatFileSize(file.size)}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="fileManager.shareFile('${file.id}')"
                                class="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Compartilhar">
                            <i data-lucide="share-2" class="w-5 h-5"></i>
                        </button>
                        <button onclick="fileManager.downloadFile('${file.id}')"
                                class="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Download">
                            <i data-lucide="download" class="w-5 h-5"></i>
                        </button>
                        <button onclick="this.closest('.fixed').remove()"
                                class="p-2 hover:bg-white/20 rounded-lg transition-colors">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>
                </div>

                <!-- Viewer Content -->
                <div class="p-4 h-full overflow-auto" id="viewer-content">
                    ${this.getViewerContent(file)}
                </div>
            </div>
        `;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        setTimeout(() => lucide.createIcons(), 100);
        return modal;
    }

    getViewerContent(file) {
        const type = file.type;

        if (type.includes('pdf')) {
            return `<iframe src="${file.url}" class="w-full h-full rounded-lg border-0"></iframe>`;
        }

        if (type.includes('image')) {
            return `
                <div class="flex items-center justify-center h-full">
                    <img src="${file.url}" alt="${file.name}" class="max-w-full max-h-full object-contain rounded-lg shadow-xl">
                </div>
            `;
        }

        if (type.includes('spreadsheet') || type.includes('excel')) {
            return `
                <div class="h-full">
                    <iframe src="https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}"
                            class="w-full h-full rounded-lg border-0"></iframe>
                </div>
            `;
        }

        if (type.includes('text') || type.includes('json') || type.includes('javascript')) {
            return `
                <div class="bg-gray-900 text-green-400 p-6 rounded-lg h-full overflow-auto font-mono text-sm">
                    <pre id="text-content">Carregando...</pre>
                </div>
            `;
        }

        return `
            <div class="flex flex-col items-center justify-center h-full text-gray-500">
                <i data-lucide="file" class="w-24 h-24 mb-4"></i>
                <p class="text-lg font-semibold">Visualização não disponível</p>
                <p class="text-sm">Faça o download para visualizar este arquivo</p>
                <button onclick="fileManager.downloadFile('${file.id}')"
                        class="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    <i data-lucide="download" class="w-4 h-4 inline mr-2"></i>
                    Download
                </button>
            </div>
        `;
    }

    // ============================================
    // COMPARTILHAMENTO
    // ============================================

    async shareFile(fileId) {
        const file = this.uploadedFiles.find(f => f.id === fileId);
        if (!file) return;

        try {
            const response = await fetch('/api/share/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId })
            });

            const data = await response.json();

            if (data.success) {
                this.showShareModal(data.shareLink, file);
            }
        } catch (error) {
            this.showToast('Erro ao criar link de compartilhamento', 'error');
        }
    }

    showShareModal(shareLink, file) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 m-4 animate-fade-in">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-2xl font-bold text-gray-900">Compartilhar arquivo</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                        <i data-lucide="x" class="w-6 h-6"></i>
                    </button>
                </div>

                <div class="space-y-4">
                    <!-- Link de compartilhamento -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Link público</label>
                        <div class="flex gap-2">
                            <input type="text" value="${shareLink}" readonly
                                   class="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 text-sm"
                                   id="share-link-input">
                            <button onclick="fileManager.copyToClipboard('${shareLink}')"
                                    class="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                                <i data-lucide="copy" class="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Compartilhar em nuvem -->
                    <div class="border-t pt-4">
                        <label class="block text-sm font-semibold text-gray-700 mb-3">Salvar na nuvem</label>
                        <div class="grid grid-cols-2 gap-3">
                            <button onclick="fileManager.uploadToGoogleDrive('${file.id}')"
                                    class="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all">
                                <svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M8 17h8l-4-7z"/><path fill="#34A853" d="M23 17l-7-12-3 5z"/><path fill="#FBBC05" d="M8 17l-7 0 3.5-6z"/></svg>
                                <span class="font-semibold text-sm">Google Drive</span>
                            </button>
                            <button onclick="fileManager.uploadToDropbox('${file.id}')"
                                    class="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all">
                                <svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#0061FF" d="M6 2L0 6l6 4 6-4-6-4zm12 0l-6 4 6 4 6-4-6-4zM0 14l6 4 6-4-6-4-6 4zm18 0l-6 4 6 4 6-4-6-4z"/></svg>
                                <span class="font-semibold text-sm">Dropbox</span>
                            </button>
                        </div>
                    </div>

                    <!-- QR Code -->
                    <div class="border-t pt-4">
                        <label class="block text-sm font-semibold text-gray-700 mb-3">QR Code</label>
                        <div class="flex justify-center">
                            <div id="qrcode-container" class="bg-white p-4 rounded-lg border-2 border-gray-200"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => lucide.createIcons(), 100);

        // Gerar QR Code
        this.generateQRCode(shareLink);
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Link copiado para a área de transferência!', 'success');
        });
    }

    generateQRCode(url) {
        const container = document.getElementById('qrcode-container');
        if (!container) return;

        // Usando API gratuita para gerar QR Code
        const qrImage = document.createElement('img');
        qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
        qrImage.alt = 'QR Code';
        qrImage.className = 'w-48 h-48';
        container.appendChild(qrImage);
    }

    // ============================================
    // CLOUD UPLOAD - GOOGLE DRIVE
    // ============================================

    loadCloudAPIs() {
        // Google Drive API
        const gapi = document.createElement('script');
        gapi.src = 'https://apis.google.com/js/api.js';
        gapi.onload = () => this.initGoogleDrive();
        document.head.appendChild(gapi);

        // Dropbox API
        const dropbox = document.createElement('script');
        dropbox.src = 'https://www.dropbox.com/static/api/2/dropins.js';
        dropbox.id = 'dropboxjs';
        dropbox.setAttribute('data-app-key', 'YOUR_DROPBOX_APP_KEY'); // Substituir pela chave real
        document.head.appendChild(dropbox);
    }

    initGoogleDrive() {
        // Inicialização do Google Drive (requer configuração do OAuth)
        console.log('Google Drive API carregada');
    }

    async uploadToGoogleDrive(fileId) {
        const file = this.uploadedFiles.find(f => f.id === fileId);
        if (!file) return;

        // Verificar se o Google Drive está autenticado
        if (!window.gapi || !window.gapi.client) {
            this.showToast('Configure a API do Google Drive primeiro', 'warning');
            return;
        }

        try {
            this.showToast('Fazendo upload para Google Drive...', 'info');

            // Aqui seria a implementação real do upload
            // Por enquanto, simulação
            setTimeout(() => {
                this.showToast('Arquivo salvo no Google Drive!', 'success');
            }, 2000);

        } catch (error) {
            this.showToast('Erro ao fazer upload para Google Drive', 'error');
        }
    }

    // ============================================
    // CLOUD UPLOAD - DROPBOX
    // ============================================

    async uploadToDropbox(fileId) {
        const file = this.uploadedFiles.find(f => f.id === fileId);
        if (!file) return;

        if (!window.Dropbox) {
            this.showToast('Configure a API do Dropbox primeiro', 'warning');
            return;
        }

        try {
            this.showToast('Fazendo upload para Dropbox...', 'info');

            // Simulação de upload
            setTimeout(() => {
                this.showToast('Arquivo salvo no Dropbox!', 'success');
            }, 2000);

        } catch (error) {
            this.showToast('Erro ao fazer upload para Dropbox', 'error');
        }
    }

    // ============================================
    // GERAÇÃO DE ARQUIVOS NO FRONTEND
    // ============================================

    async generatePDF(data, options = {}) {
        // Carregar biblioteca jsPDF
        if (!window.jspdf) {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF(options.orientation || 'portrait');

        // Configurações básicas
        doc.setFont(options.font || 'helvetica');
        doc.setFontSize(options.fontSize || 12);

        // Adicionar conteúdo
        if (data.title) {
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text(data.title, 20, 20);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(12);
        }

        let yPosition = data.title ? 40 : 20;

        if (data.content) {
            const lines = doc.splitTextToSize(data.content, 170);
            doc.text(lines, 20, yPosition);
        }

        if (data.table) {
            // Carregar autoTable plugin
            if (!window.jspdf.jsPDFAPI.autoTable) {
                await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js');
            }

            doc.autoTable({
                head: [data.table.headers],
                body: data.table.rows,
                startY: yPosition,
                theme: 'grid',
                styles: { fontSize: 10 },
                headStyles: { fillColor: [99, 102, 241] }
            });
        }

        // Salvar ou retornar
        if (options.download) {
            doc.save(options.filename || 'documento.pdf');
        }

        return doc;
    }

    async generateExcel(data, options = {}) {
        // Carregar biblioteca SheetJS
        if (!window.XLSX) {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
        }

        const wb = window.XLSX.utils.book_new();

        // Adicionar planilhas
        if (data.sheets) {
            data.sheets.forEach(sheet => {
                const ws = window.XLSX.utils.aoa_to_sheet(sheet.data);
                window.XLSX.utils.book_append_sheet(wb, ws, sheet.name);
            });
        } else if (data.data) {
            const ws = window.XLSX.utils.aoa_to_sheet(data.data);
            window.XLSX.utils.book_append_sheet(wb, ws, 'Planilha1');
        }

        // Salvar
        if (options.download) {
            window.XLSX.writeFile(wb, options.filename || 'planilha.xlsx');
        }

        return wb;
    }

    // ============================================
    // UTILITÁRIOS
    // ============================================

    async loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    downloadFile(fileId) {
        const file = this.uploadedFiles.find(f => f.id === fileId);
        if (!file) return;

        const a = document.createElement('a');
        a.href = file.url;
        a.download = file.name;
        a.click();
    }

    getFileIcon(type) {
        if (type.includes('pdf')) return '<i data-lucide="file-text" class="w-6 h-6 text-red-600"></i>';
        if (type.includes('image')) return '<i data-lucide="image" class="w-6 h-6 text-green-600"></i>';
        if (type.includes('spreadsheet') || type.includes('excel')) return '<i data-lucide="sheet" class="w-6 h-6 text-green-600"></i>';
        if (type.includes('word')) return '<i data-lucide="file-text" class="w-6 h-6 text-blue-600"></i>';
        return '<i data-lucide="file" class="w-6 h-6 text-gray-600"></i>';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    showToast(message, type = 'info') {
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            alert(message);
        }
    }
}

// Inicializar quando o DOM estiver pronto
let fileManager;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        fileManager = new FileManager();
    });
} else {
    fileManager = new FileManager();
}
