// =====================================================================
// SISTEMA DE AUTENTICACIÓN PARA EC0301
// Manejo de sesiones y control de acceso a módulos
// =====================================================================

class AuthManager {
    constructor() {
        this.SESSION_KEY = 'skillscert_access_token';
        this.USER_KEY = 'skillscert_user_data';
        this.DEMO_MODE = true; // Cambiar a false en producción
    }

    // Verificar si el usuario está autenticado
    isAuthenticated() {
        if (this.DEMO_MODE) {
            return true; // En modo demo, siempre autenticado
        }
        
        const token = sessionStorage.getItem(this.SESSION_KEY);
        return token !== null && token !== '';
    }

    // Obtener datos del usuario actual
    getCurrentUser() {
        if (this.DEMO_MODE) {
            return {
                name: 'Usuario Demo',
                email: 'demo@skillscert.com',
                access_code: 'DEMO-ACCESS',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
            };
        }
        
        const userData = sessionStorage.getItem(this.USER_KEY);
        return userData ? JSON.parse(userData) : null;
    }

    // Establecer sesión de usuario
    setSession(token, userData) {
        sessionStorage.setItem(this.SESSION_KEY, token);
        sessionStorage.setItem(this.USER_KEY, JSON.stringify(userData));
        sessionStorage.setItem('current_user', userData.name || userData.email);
    }

    // Cerrar sesión
    logout() {
        sessionStorage.removeItem(this.SESSION_KEY);
        sessionStorage.removeItem(this.USER_KEY);
        sessionStorage.removeItem('current_user');
        
        if (!this.DEMO_MODE) {
            window.location.href = '/login.html';
        }
    }

    // Verificar acceso a módulo específico
    hasAccessToModule(moduleName) {
        if (!this.isAuthenticated()) {
            return false;
        }
        
        // En esta implementación, todos los módulos están disponibles
        // En producción, aquí se verificarían permisos específicos
        return true;
    }

    // Obtener información de la sesión
    getSessionInfo() {
        const user = this.getCurrentUser();
        if (!user) return null;
        
        return {
            user: user,
            isDemo: this.DEMO_MODE,
            expiresAt: user.expires_at,
            timeRemaining: this.getTimeRemaining(user.expires_at)
        };
    }

    // Calcular tiempo restante de la sesión
    getTimeRemaining(expiresAt) {
        if (!expiresAt) return 'Indefinido';
        
        const now = new Date();
        const expires = new Date(expiresAt);
        const diff = expires - now;
        
        if (diff <= 0) return 'Expirado';
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (days > 0) return `${days} días, ${hours} horas`;
        if (hours > 0) return `${hours} horas`;
        
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${minutes} minutos`;
    }

    // Redirigir si no está autenticado
    requireAuth(redirectUrl = '/login.html') {
        if (!this.isAuthenticated()) {
            if (this.DEMO_MODE) {
                console.log('Demo mode: acceso permitido sin autenticación');
                return true;
            }
            
            console.log('Usuario no autenticado, redirigiendo a login');
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }

    // Verificar si la sesión está próxima a expirar
    isSessionExpiringSoon(minutesThreshold = 30) {
        const user = this.getCurrentUser();
        if (!user || !user.expires_at) return false;
        
        const now = new Date();
        const expires = new Date(user.expires_at);
        const diff = expires - now;
        
        return diff > 0 && diff <= (minutesThreshold * 60 * 1000);
    }

    // Mostrar advertencia de expiración
    showExpirationWarning() {
        if (!window.Swal) return; // Verificar que SweetAlert2 esté disponible
        
        const timeRemaining = this.getTimeRemaining(this.getCurrentUser().expires_at);
        
        Swal.fire({
            icon: 'warning',
            title: 'Sesión por Expirar',
            html: `
                <p>Tu sesión expirará en: <strong>${timeRemaining}</strong></p>
                <p>¿Deseas extender tu sesión?</p>
            `,
            showCancelButton: true,
            confirmButtonText: 'Extender Sesión',
            cancelButtonText: 'Cerrar Sesión',
            confirmButtonColor: '#1E3A8A',
            cancelButtonColor: '#EF4444'
        }).then((result) => {
            if (result.isConfirmed) {
                this.extendSession();
            } else if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
                this.logout();
            }
        });
    }

    // Extender sesión (solo en modo demo)
    extendSession() {
        if (this.DEMO_MODE) {
            const user = this.getCurrentUser();
            user.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
            
            if (window.Swal) {
                Swal.fire({
                    icon: 'success',
                    title: 'Sesión Extendida',
                    text: 'Tu sesión ha sido extendida por 24 horas más',
                    timer: 2000,
                    timerProgressBar: true
                });
            }
        }
    }

    // Inicializar sistema de autenticación
    init() {
        // Verificar autenticación al cargar la página
        if (!this.requireAuth()) {
            return false;
        }

        // Configurar verificación periódica de expiración
        if (!this.DEMO_MODE) {
            setInterval(() => {
                if (this.isSessionExpiringSoon()) {
                    this.showExpirationWarning();
                }
            }, 5 * 60 * 1000); // Verificar cada 5 minutos
        }

        // Mostrar información de usuario si está disponible
        this.displayUserInfo();
        
        return true;
    }

    // Mostrar información del usuario en la interfaz
    displayUserInfo() {
        const sessionInfo = this.getSessionInfo();
        if (!sessionInfo) return;

        // Buscar elementos donde mostrar información del usuario
        const userNameElements = document.querySelectorAll('[data-user-name]');
        const userEmailElements = document.querySelectorAll('[data-user-email]');
        const sessionInfoElements = document.querySelectorAll('[data-session-info]');

        userNameElements.forEach(el => {
            el.textContent = sessionInfo.user.name || sessionInfo.user.email;
        });

        userEmailElements.forEach(el => {
            el.textContent = sessionInfo.user.email;
        });

        sessionInfoElements.forEach(el => {
            el.innerHTML = `
                <div style="font-size: 0.875rem; color: #6B7280;">
                    <div><strong>Usuario:</strong> ${sessionInfo.user.name || sessionInfo.user.email}</div>
                    ${sessionInfo.isDemo ? '<div><strong>Modo:</strong> Demostración</div>' : ''}
                    <div><strong>Expira:</strong> ${sessionInfo.timeRemaining}</div>
                </div>
            `;
        });
    }

    // Crear botón de logout
    createLogoutButton(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const button = document.createElement('button');
        button.className = 'btn btn-secondary';
        button.innerHTML = '<i class="fa-solid fa-sign-out-alt"></i> Cerrar Sesión';
        button.onclick = () => this.logout();
        
        container.appendChild(button);
    }

    // Validar código de acceso (simulado)
    async validateAccessCode(email, code) {
        if (this.DEMO_MODE) {
            // En modo demo, aceptar cualquier código que empiece con DEMO
            if (code.toUpperCase().startsWith('DEMO')) {
                return {
                    success: true,
                    token: 'demo-token-' + Date.now(),
                    user: {
                        name: 'Usuario Demo',
                        email: email,
                        access_code: code
                    }
                };
            }
        }

        // Simular validación real
        return new Promise((resolve) => {
            setTimeout(() => {
                // Códigos de prueba válidos
                const validCodes = [
                    'SKILLSCERT-ABC123',
                    'SKILLSCERT-XYZ789',
                    'DEMO-ACCESS'
                ];

                if (validCodes.includes(code.toUpperCase())) {
                    resolve({
                        success: true,
                        token: 'valid-token-' + Date.now(),
                        user: {
                            name: 'Usuario Autorizado',
                            email: email,
                            access_code: code
                        }
                    });
                } else {
                    resolve({
                        success: false,
                        message: 'Código de acceso inválido o expirado'
                    });
                }
            }, 1000);
        });
    }
}

// =====================================================================
// INICIALIZACIÓN GLOBAL
// =====================================================================

// Crear instancia global del gestor de autenticación
window.AuthManager = new AuthManager();

// Función de conveniencia para verificar autenticación
function requireAuth() {
    return window.AuthManager.requireAuth();
}

// Función para obtener usuario actual
function getCurrentUser() {
    return window.AuthManager.getCurrentUser();
}

// Función para cerrar sesión
function logout() {
    window.AuthManager.logout();
}

// Auto-inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Solo inicializar si no estamos en la página de login o index
    const currentPath = window.location.pathname;
    const isPublicPage = currentPath.includes('login.html') || 
                        currentPath.includes('index.html') || 
                        currentPath === '/' || 
                        currentPath.includes('success.html') ||
                        currentPath.includes('cancelar.html');

    if (!isPublicPage) {
        window.AuthManager.init();
    }
});

// =====================================================================
// UTILIDADES ADICIONALES
// =====================================================================

// Función para log de auditoría
function logUserAction(action, details = {}) {
    const user = getCurrentUser();
    const logEntry = {
        timestamp: new Date().toISOString(),
        user: user ? user.email : 'anonymous',
        action: action,
        details: details,
        page: window.location.pathname
    };
    
    console.log('User Action:', logEntry);
    
    // En producción, esto se enviaría al servidor
    const auditLog = JSON.parse(localStorage.getItem('audit_log') || '[]');
    auditLog.push(logEntry);
    
    // Mantener solo últimas 100 entradas
    if (auditLog.length > 100) {
        auditLog.shift();
    }
    
    localStorage.setItem('audit_log', JSON.stringify(auditLog));
}

// Función para proteger URLs directas
function protectPage() {
    if (!window.AuthManager.isAuthenticated()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Export para uso en módulos ES6 si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, requireAuth, getCurrentUser, logout, logUserAction };
}
