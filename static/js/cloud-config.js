/**
 * Configuração das APIs de Nuvem
 *
 * INSTRUÇÕES:
 * 1. Siga o guia GUIA_GOOGLE_DRIVE.md para obter Client ID
 * 2. Siga o guia GUIA_DROPBOX.md para obter App Key
 * 3. Substitua os valores abaixo pelas suas credenciais
 */

const CLOUD_CONFIG = {
    // ============================================
    // GOOGLE DRIVE
    // ============================================
    googleDrive: {
        enabled: false, // Mude para true após configurar
        clientId: 'SEU_CLIENT_ID_AQUI.apps.googleusercontent.com',
        apiKey: 'SUA_API_KEY_AQUI', // Opcional
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        scope: 'https://www.googleapis.com/auth/drive.file'
    },

    // ============================================
    // ONEDRIVE
    // ============================================
    onedrive: {
        enabled: false, // Mude para true após configurar
        clientId: 'SEU_CLIENT_ID_AQUI',
        redirectUri: window.location.origin + '/onedrive/callback',
        scopes: ['Files.ReadWrite', 'offline_access', 'User.Read'],
        authority: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
    }
};

// ============================================
// INICIALIZAÇÃO AUTOMÁTICA
// ============================================

class CloudIntegration {
    constructor() {
        this.googleDriveReady = false;
        this.onedriveReady = false;
        this.init();
    }

    init() {
        if (CLOUD_CONFIG.googleDrive.enabled) {
            this.initGoogleDrive();
        }

        if (CLOUD_CONFIG.onedrive.enabled) {
            this.initOneDrive();
        }
    }

    // ============================================
    // GOOGLE DRIVE
    // ============================================

    initGoogleDrive() {
        // Carregar API do Google
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => this.loadGoogleDriveClient();
        document.head.appendChild(script);
    }

    loadGoogleDriveClient() {
        gapi.load('client:auth2', () => {
            gapi.client.init({
                apiKey: CLOUD_CONFIG.googleDrive.apiKey,
                clientId: CLOUD_CONFIG.googleDrive.clientId,
                discoveryDocs: CLOUD_CONFIG.googleDrive.discoveryDocs,
                scope: CLOUD_CONFIG.googleDrive.scope
            }).then(() => {
                this.googleDriveReady = true;
                console.log('✅ Google Drive API pronta');
                this.updateUIStatus();
            }).catch(error => {
                console.error('❌ Erro ao inicializar Google Drive:', error);
            });
        });
    }

    async signInGoogleDrive() {
        try {
            await gapi.auth2.getAuthInstance().signIn();
            return true;
        } catch (error) {
            console.error('Erro ao fazer login no Google:', error);
            return false;
        }
    }

    async uploadToGoogleDrive(file) {
        if (!this.googleDriveReady) {
            if (typeof showToast === 'function') showToast('Google Drive não está configurado', 'warning');
            else console.warn('Google Drive não está configurado');
            return;
        }

        // Verificar se está autenticado
        const authInstance = gapi.auth2.getAuthInstance();
        if (!authInstance.isSignedIn.get()) {
            const success = await this.signInGoogleDrive();
            if (!success) return;
        }

        try {
            // Ler arquivo como base64
            const reader = new FileReader();
            reader.readAsDataURL(file);

            reader.onload = async () => {
                const base64Data = reader.result.split(',')[1];

                const metadata = {
                    name: file.name,
                    mimeType: file.type
                };

                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                form.append('file', file);

                const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + gapi.auth.getToken().access_token
                    },
                    body: form
                });

                const result = await response.json();

                if (result.id) {
                    this.showToast('✅ Arquivo salvo no Google Drive!', 'success');
                    return result;
                } else {
                    throw new Error('Falha no upload');
                }
            };
        } catch (error) {
            console.error('Erro no upload:', error);
            this.showToast('❌ Erro ao salvar no Google Drive', 'error');
        }
    }

    // ============================================
    // ONEDRIVE
    // ============================================

    initOneDrive() {
        // OneDrive usa OAuth 2.0 via backend
        // Verificar se usuário já está autenticado
        fetch('/api/onedrive/status')
            .then(r => r.json())
            .then(data => {
                this.onedriveReady = data.authenticated || false;
                if (this.onedriveReady) {
                    console.log('✅ OneDrive autenticado');
                } else {
                    console.log('⚠️ OneDrive não autenticado');
                }
                this.updateUIStatus();
            })
            .catch(err => {
                console.log('OneDrive API não disponível');
                this.updateUIStatus();
            });
    }

    async uploadToOneDrive(file) {
        if (!CLOUD_CONFIG.onedrive.enabled) {
            if (typeof showToast === 'function') showToast('OneDrive não está configurado', 'warning');
            else console.warn('OneDrive não está configurado');
            return;
        }

        try {
            // Verificar autenticação
            const statusResponse = await fetch('/api/onedrive/status');
            const status = await statusResponse.json();

            if (!status.authenticated) {
                // Redirecionar para login OneDrive
                this.showToast('Redirecionando para login do OneDrive...', 'info');
                window.location.href = '/onedrive/login';
                return;
            }

            // Upload do arquivo
            this.showToast('Fazendo upload para OneDrive...', 'info');

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/onedrive/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('✅ Arquivo salvo no OneDrive!', 'success');
                return result;
            } else {
                throw new Error(result.message || 'Erro ao fazer upload');
            }
        } catch (error) {
            console.error('Erro no upload:', error);
            this.showToast('❌ Erro ao salvar no OneDrive', 'error');
        }
    }

    // ============================================
    // COMPARTILHAR DO ONEDRIVE
    // ============================================

    async shareOneDriveFile(fileId) {
        if (!this.onedriveReady) {
            if (typeof showToast === 'function') showToast('OneDrive não está autenticado', 'warning');
            else console.warn('OneDrive não está autenticado');
            return;
        }

        try {
            const response = await fetch(`/api/onedrive/share/${fileId}`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                return result.shareLink;
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Erro ao compartilhar:', error);
            this.showToast('❌ Erro ao criar link de compartilhamento', 'error');
        }
    }

    // ============================================
    // UTILITÁRIOS
    // ============================================

    updateUIStatus() {
        // Atualizar botões da interface
        const googleBtn = document.querySelector('[data-cloud="google-drive"]');
        const onedriveBtn = document.querySelector('[data-cloud="onedrive"]');

        if (googleBtn) {
            if (this.googleDriveReady) {
                googleBtn.disabled = false;
                googleBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                googleBtn.disabled = true;
                googleBtn.classList.add('opacity-50', 'cursor-not-allowed');
                googleBtn.title = 'Configure o Google Drive primeiro';
            }
        }

        if (onedriveBtn) {
            if (this.onedriveReady) {
                onedriveBtn.disabled = false;
                onedriveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                onedriveBtn.disabled = true;
                onedriveBtn.classList.add('opacity-50', 'cursor-not-allowed');
                onedriveBtn.title = 'Configure o OneDrive primeiro';
            }
        }
    }

    showToast(message, type = 'info') {
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            console.log(message);
        }
    }

    getStatus() {
        return {
            googleDrive: {
                enabled: CLOUD_CONFIG.googleDrive.enabled,
                ready: this.googleDriveReady,
                authenticated: this.googleDriveReady && gapi.auth2?.getAuthInstance()?.isSignedIn.get()
            },
            onedrive: {
                enabled: CLOUD_CONFIG.onedrive.enabled,
                ready: this.onedriveReady
            }
        };
    }
}

// Inicializar automaticamente
let cloudIntegration;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        cloudIntegration = new CloudIntegration();
    });
} else {
    cloudIntegration = new CloudIntegration();
}

// Expor globalmente para fácil acesso
window.cloudIntegration = cloudIntegration;

// ============================================
// FUNÇÕES DE CONVENIÊNCIA
// ============================================

// Upload rápido para Google Drive
async function uploadToGoogleDrive(file) {
    if (!window.cloudIntegration) {
        console.error('Cloud integration não inicializada');
        return;
    }
    return await window.cloudIntegration.uploadToGoogleDrive(file);
}

// Upload rápido para OneDrive
async function uploadToOneDrive(file) {
    if (!window.cloudIntegration) {
        console.error('Cloud integration não inicializada');
        return;
    }
    return await window.cloudIntegration.uploadToOneDrive(file);
}

// Compartilhar arquivo do OneDrive
async function shareOneDriveFile(fileId) {
    if (!window.cloudIntegration) {
        console.error('Cloud integration não inicializada');
        return;
    }
    return await window.cloudIntegration.shareOneDriveFile(fileId);
}

// Verificar status das integrações
function getCloudStatus() {
    if (!window.cloudIntegration) {
        return { googleDrive: { ready: false }, onedrive: { ready: false } };
    }
    return window.cloudIntegration.getStatus();
}
