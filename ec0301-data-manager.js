// =====================================================================
// MÓDULO DE GESTIÓN CENTRALIZADA DE DATOS EC0301
// Sistema de autorelleno y validación cruzada mejorado
// =====================================================================

class EC0301DataManager {
    constructor() {
        this.STORAGE_KEY = 'EC0301_CARTA_PRO';
        this.VERSION_KEY = 'EC0301_VERSIONS';
        this.AUDIT_LOG_KEY = 'EC0301_AUDIT_LOG';
        this.observers = new Map();
        this.validationRules = this.initializeValidationRules();
    }

    // =====================================================================
    // SISTEMA DE OBSERVADORES PARA AUTORELLENO
    // =====================================================================
    
    subscribe(module, callback) {
        if (!this.observers.has(module)) {
            this.observers.set(module, []);
        }
        this.observers.get(module).push(callback);
    }

    notify(changedFields) {
        this.observers.forEach((callbacks, module) => {
            callbacks.forEach(callback => {
                try {
                    callback(changedFields, this.getData());
                } catch (error) {
                    this.logError(`Error notificando a módulo ${module}:`, error);
                }
            });
        });
    }

    // =====================================================================
    // GESTIÓN DE DATOS CENTRALIZADA
    // =====================================================================
    
    saveData(newData, source = 'carta_descriptiva') {
        const currentData = this.getData();
        const mergedData = this.mergeData(currentData, newData);
        
        // Validar integridad
        const validation = this.validateData(mergedData);
        if (!validation.isValid) {
            throw new Error(`Errores de validación: ${validation.errors.join(', ')}`);
        }

        // Generar checksum para integridad
        mergedData._checksum = this.generateChecksum(mergedData);
        mergedData._lastUpdate = new Date().toISOString();
        mergedData._source = source;

        // Guardar versión anterior para auditoría
        this.saveVersion(currentData, source);
        
        // Guardar datos principales
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mergedData));
        
        // Registrar cambios en log de auditoría
        this.logChange(source, this.getChangedFields(currentData, mergedData));
        
        // Notificar a módulos suscritos
        this.notify(this.getChangedFields(currentData, mergedData));
        
        return mergedData;
    }

    getData() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (!data) return this.getDefaultStructure();
            
            const parsedData = JSON.parse(data);
            
            // Verificar integridad
            if (!this.verifyIntegrity(parsedData)) {
                this.logError('Integridad de datos comprometida, restaurando última versión válida');
                return this.restoreFromVersion();
            }
            
            return parsedData;
        } catch (error) {
            this.logError('Error cargando datos:', error);
            return this.getDefaultStructure();
        }
    }

    // =====================================================================
    // AUTORELLENO INTELIGENTE POR MÓDULO
    // =====================================================================
    
    // Para módulo de requerimientos
    getRequerimientosData() {
        const data = this.getData();
        return {
            curso: data.nombre || '',
            facilitador: data.facilitador || data.diseñador || '',
            lugar: data.lugar || '',
            duracion: data.duracion || '',
            participantes: data.num || '',
            instalaciones: data.rq?.inst || '',
            equipo: data.rq?.equipo || '',
            materiales: data.rq?.mats || '',
            fechas: data.fechas || ''
        };
    }

    // Para módulo de evaluaciones
    getEvaluacionesData() {
        const data = this.getData();
        return {
            nombre: data.nombre || '',
            facilitador: data.facilitador || data.diseñador || '',
            lugar: data.lugar || '',
            fechas: data.fechas || '',
            evaluacion: {
                diagnostica: {
                    porcentaje: data.ev?.diag?.pct || '0',
                    instrumento: data.ev?.diag?.inst || 'Cuestionario'
                },
                formativa: {
                    porcentaje: data.ev?.form?.pct || '40',
                    instrumento: data.ev?.form?.inst || 'Guía de Observación'
                },
                sumativa: {
                    porcentaje: data.ev?.sum?.pct || '60',
                    instrumento: data.ev?.sum?.inst || 'Examen Final'
                },
                minima: data.ev?.min || '80'
            },
            objetivos: this.extractObjetivosForEvaluacion(data)
        };
    }

    // Para módulo de manuales
    getManualesData() {
        const data = this.getData();
        return {
            nombre: data.nombre || '',
            diseñador: data.diseñador || '',
            facilitador: data.facilitador || '',
            perfil: data.psico || '',
            objetivo_general: this.buildObjetivoCompleto(data.og),
            objetivos_particulares: data.objetivos || [],
            temas: data.temas || [],
            requerimientos: data.rq || {},
            evaluacion: data.ev || {},
            duracion: data.duracion || '',
            participantes: data.num || ''
        };
    }

    // Para módulo de resultados
    getResultadosData() {
        const data = this.getData();
        return {
            nombre: data.nombre || '',
            facilitador: data.facilitador || data.diseñador || '',
            lugar: data.lugar || '',
            fechas: data.fechas || '',
            participantes: parseInt(data.num) || 10,
            evaluacion: {
                formativa_porcentaje: parseFloat(data.ev?.form?.pct) || 40,
                sumativa_porcentaje: parseFloat(data.ev?.sum?.pct?.replace('%', '')) || 60,
                calificacion_minima: parseFloat(data.ev?.min) || 80
            }
        };
    }

    // Para módulo de auditoría
    getAuditoriaData() {
        const data = this.getData();
        return {
            ...data,
            completitud: this.calculateCompleteness(data),
            validaciones: this.runValidations(data),
            recomendaciones: this.getRecommendations(data)
        };
    }

    // =====================================================================
    // VALIDACIONES CRUZADAS
    // =====================================================================
    
    initializeValidationRules() {
        return {
            required_fields: [
                'nombre', 'facilitador', 'og.accion', 'og.cond', 'og.criterio',
                'rq.inst', 'rq.equipo', 'rq.mats', 'ev.min'
            ],
            business_rules: [
                {
                    name: 'porcentajes_evaluacion',
                    validate: (data) => {
                        const formPct = parseFloat(data.ev?.form?.pct) || 0;
                        const sumPct = parseFloat(data.ev?.sum?.pct?.replace('%', '')) || 0;
                        return Math.abs((formPct + sumPct) - 100) < 0.1;
                    },
                    message: 'Los porcentajes de evaluación formativa y sumativa deben sumar 100%'
                },
                {
                    name: 'calificacion_minima_valida',
                    validate: (data) => {
                        const min = parseFloat(data.ev?.min) || 0;
                        return min >= 60 && min <= 90;
                    },
                    message: 'La calificación mínima debe estar entre 60 y 90'
                },
                {
                    name: 'temas_coherentes',
                    validate: (data) => {
                        return data.temas && data.temas.length >= 1;
                    },
                    message: 'Debe incluir al menos un tema de desarrollo'
                },
                {
                    name: 'objetivos_completos',
                    validate: (data) => {
                        return data.objetivos && data.objetivos.length >= 1;
                    },
                    message: 'Debe incluir al menos un objetivo particular'
                }
            ]
        };
    }

    validateData(data) {
        const errors = [];
        
        // Validar campos requeridos
        this.validationRules.required_fields.forEach(field => {
            if (!this.getNestedValue(data, field)) {
                errors.push(`Campo requerido faltante: ${field}`);
            }
        });

        // Validar reglas de negocio
        this.validationRules.business_rules.forEach(rule => {
            if (!rule.validate(data)) {
                errors.push(rule.message);
            }
        });

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // =====================================================================
    // MÉTODOS DE UTILIDAD
    // =====================================================================
    
    generateChecksum(data) {
        const criticalFields = ['nombre', 'facilitador', 'og', 'ev', 'temas'];
        const dataString = JSON.stringify(
            criticalFields.map(field => this.getNestedValue(data, field))
        );
        return btoa(dataString).slice(0, 16);
    }

    verifyIntegrity(data) {
        if (!data._checksum) return true; // Datos legacy sin checksum
        const currentChecksum = this.generateChecksum(data);
        return data._checksum === currentChecksum;
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((acc, key) => {
            if (!acc[key]) acc[key] = {};
            return acc[key];
        }, obj);
        target[lastKey] = value;
    }

    mergeData(current, newData) {
        return { ...current, ...newData };
    }

    getChangedFields(oldData, newData) {
        const changes = [];
        const checkField = (path, oldVal, newVal) => {
            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                changes.push(path);
            }
        };

        // Comparar campos principales
        ['nombre', 'facilitador', 'lugar', 'duracion', 'num'].forEach(field => {
            checkField(field, oldData[field], newData[field]);
        });

        return changes;
    }

    buildObjetivoCompleto(og) {
        if (!og) return '';
        return `${og.accion || ''} ${og.cond || ''} ${og.criterio || ''}`.trim();
    }

    extractObjetivosForEvaluacion(data) {
        const objetivos = [];
        if (data.og) {
            objetivos.push({
                tipo: 'General',
                descripcion: this.buildObjetivoCompleto(data.og)
            });
        }
        if (data.objetivos) {
            data.objetivos.forEach((obj, index) => {
                objetivos.push({
                    tipo: `Particular ${index + 1}`,
                    descripcion: obj.accion || ''
                });
            });
        }
        return objetivos;
    }

    calculateCompleteness(data) {
        const required = this.validationRules.required_fields;
        const completed = required.filter(field => this.getNestedValue(data, field));
        return Math.round((completed.length / required.length) * 100);
    }

    runValidations(data) {
        return this.validateData(data);
    }

    getRecommendations(data) {
        const recommendations = [];
        const validation = this.validateData(data);
        
        if (!validation.isValid) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Compliance',
                message: 'Completar campos requeridos para cumplimiento total'
            });
        }

        if (this.calculateCompleteness(data) < 80) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Calidad',
                message: 'Mejorar completitud de información para mayor calidad'
            });
        }

        return recommendations;
    }

    // =====================================================================
    // AUDITORÍA Y LOGGING
    // =====================================================================
    
    saveVersion(data, source) {
        const versions = JSON.parse(localStorage.getItem(this.VERSION_KEY) || '[]');
        versions.push({
            timestamp: new Date().toISOString(),
            source: source,
            data: data,
            checksum: this.generateChecksum(data)
        });
        
        // Mantener solo últimas 10 versiones
        if (versions.length > 10) versions.shift();
        
        localStorage.setItem(this.VERSION_KEY, JSON.stringify(versions));
    }

    logChange(source, changedFields) {
        const log = JSON.parse(localStorage.getItem(this.AUDIT_LOG_KEY) || '[]');
        log.push({
            timestamp: new Date().toISOString(),
            source: source,
            changes: changedFields,
            user: sessionStorage.getItem('current_user') || 'unknown'
        });
        
        // Mantener solo últimos 50 cambios
        if (log.length > 50) log.shift();
        
        localStorage.setItem(this.AUDIT_LOG_KEY, JSON.stringify(log));
    }

    logError(message, error) {
        console.error(`[EC0301DataManager] ${message}`, error);
    }

    restoreFromVersion() {
        const versions = JSON.parse(localStorage.getItem(this.VERSION_KEY) || '[]');
        if (versions.length > 0) {
            return versions[versions.length - 1].data;
        }
        return this.getDefaultStructure();
    }

    getDefaultStructure() {
        return {
            nombre: '',
            facilitador: '',
            diseñador: '',
            lugar: '',
            duracion: '',
            num: '',
            fechas: '',
            psico: '',
            og: { accion: '', cond: '', criterio: '' },
            objetivos: [],
            temas: [],
            rq: { inst: '', equipo: '', mats: '' },
            ev: {
                diag: { pct: '0', inst: 'Cuestionario' },
                form: { pct: '40', inst: 'Guía de Observación' },
                sum: { pct: '60%', inst: 'Examen Final' },
                min: '80'
            },
            _version: '1.0',
            _created: new Date().toISOString()
        };
    }

    // =====================================================================
    // MÉTODOS PÚBLICOS PARA MÓDULOS
    // =====================================================================
    
    // Método para que cada módulo obtenga sus datos específicos
    getModuleData(moduleName) {
        const methods = {
            'requerimientos': () => this.getRequerimientosData(),
            'evaluaciones': () => this.getEvaluacionesData(),
            'manuales': () => this.getManualesData(),
            'resultados': () => this.getResultadosData(),
            'auditoria': () => this.getAuditoriaData(),
            'logistica': () => this.getRequerimientosData() // Mismo que requerimientos
        };

        const method = methods[moduleName];
        if (!method) {
            throw new Error(`Módulo desconocido: ${moduleName}`);
        }

        return method();
    }

    // Método para suscribirse a cambios desde cualquier módulo
    onDataChange(moduleName, callback) {
        this.subscribe(moduleName, callback);
    }

    // Método para validar datos específicos de un módulo
    validateModuleData(moduleName, data) {
        // Implementar validaciones específicas por módulo
        return { isValid: true, errors: [] };
    }
}

// =====================================================================
// INICIALIZACIÓN GLOBAL
// =====================================================================

// Crear instancia global del gestor de datos
window.EC0301Manager = new EC0301DataManager();

// Función helper para compatibilidad con código existente
function getCartaData() {
    return window.EC0301Manager.getData();
}

function saveCartaData(data, source = 'manual') {
    return window.EC0301Manager.saveData(data, source);
}

// Export para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EC0301DataManager;
}
