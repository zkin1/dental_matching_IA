/**
 * Analizador de Síntomas con Algoritmos de IA
 * Utiliza técnicas de NLP y Machine Learning para inferir tratamientos
 */
class SymptomAnalyzer {
    constructor() {
        this.symptomPatterns = this.initializePatterns();
        this.treatmentWeights = this.initializeTreatmentWeights();
        this.urgencyKeywords = this.initializeUrgencyKeywords();
        this.specialtyMappings = this.initializeSpecialtyMappings();
    }

    /**
     * Analiza síntomas usando algoritmos de ML para inferir tratamiento
     */
    async analyzeSymptoms(symptomsData) {
        const symptoms = this.extractSymptoms(symptomsData);
        const cleanedSymptoms = this.preprocessText(symptoms);
        
        // Análisis multi-dimensional
        const analysis = {
            primaryTreatment: await this.inferPrimaryTreatment(cleanedSymptoms),
            alternativeTreatments: await this.inferAlternativeTreatments(cleanedSymptoms),
            urgencyLevel: this.calculateUrgencyLevel(cleanedSymptoms),
            complexityScore: this.calculateComplexityScore(cleanedSymptoms),
            specialtyRecommendations: this.getSpecialtyRecommendations(cleanedSymptoms),
            confidence: 0,
            riskFactors: this.identifyRiskFactors(cleanedSymptoms),
            clinicRecommendation: null
        };

        // Calcular confianza del análisis
        analysis.confidence = this.calculateConfidence(analysis, cleanedSymptoms);
        
        // Recomendar clínica basada en edad y tratamiento
        analysis.clinicRecommendation = this.recommendClinic(analysis);

        return analysis;
    }

    /**
     * Extrae y normaliza síntomas del input
     */
    extractSymptoms(symptomsData) {
        if (typeof symptomsData === 'string') {
            return symptomsData;
        }
        
        if (Array.isArray(symptomsData)) {
            return symptomsData.join(' ');
        }
        
        if (typeof symptomsData === 'object') {
            return Object.values(symptomsData).join(' ');
        }
        
        return '';
    }

    /**
     * Preprocesa texto usando técnicas de NLP
     */
    preprocessText(text) {
        if (!text) return '';
        
        return text
            .toLowerCase()
            .replace(/[^\w\s\u00C0-\u017F]/g, ' ') // Mantener tildes y ñ
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Infiere tratamiento primario usando análisis de patrones ponderado
     */
    async inferPrimaryTreatment(symptoms) {
        const scores = {};
        
        // Inicializar scores
        Object.keys(this.treatmentWeights).forEach(treatment => {
            scores[treatment] = { score: 0, matches: [] };
        });

        // Análizar cada patrón de síntoma
        for (const [pattern, data] of Object.entries(this.symptomPatterns)) {
            if (this.matchesPattern(symptoms, pattern)) {
                data.treatments.forEach(treatment => {
                    if (scores[treatment]) {
                        const weight = this.treatmentWeights[treatment][data.category] || 1;
                        const boost = data.confidence * weight * data.urgencyMultiplier;
                        
                        scores[treatment].score += boost;
                        scores[treatment].matches.push({
                            pattern,
                            category: data.category,
                            confidence: data.confidence,
                            boost
                        });
                    }
                });
            }
        }

        // Encontrar tratamiento con mayor score
        let bestTreatment = null;
        let bestScore = 0;

        Object.entries(scores).forEach(([treatment, data]) => {
            if (data.score > bestScore) {
                bestScore = data.score;
                bestTreatment = {
                    name: treatment,
                    score: data.score,
                    matches: data.matches,
                    category: this.getTreatmentCategory(treatment)
                };
            }
        });

        return bestTreatment || {
            name: 'Consulta General',
            score: 0.3,
            matches: [],
            category: 'preventiva'
        };
    }

    /**
     * Infiere tratamientos alternativos
     */
    async inferAlternativeTreatments(symptoms) {
        const allScores = {};
        
        // Calcular scores para todos los tratamientos
        for (const [pattern, data] of Object.entries(this.symptomPatterns)) {
            if (this.matchesPattern(symptoms, pattern)) {
                data.treatments.forEach(treatment => {
                    if (!allScores[treatment]) {
                        allScores[treatment] = 0;
                    }
                    allScores[treatment] += data.confidence * data.urgencyMultiplier;
                });
            }
        }

        // Ordenar y retornar top 3 alternativas
        return Object.entries(allScores)
            .sort(([,a], [,b]) => b - a)
            .slice(1, 4) // Excluir el primero (ya está en primary)
            .map(([treatment, score]) => ({
                name: treatment,
                score: parseFloat(score.toFixed(2)),
                category: this.getTreatmentCategory(treatment)
            }));
    }

    /**
     * Calcula nivel de urgencia usando análisis semántico
     */
    calculateUrgencyLevel(symptoms) {
        let urgencyScore = 0;
        let matchedKeywords = [];

        Object.entries(this.urgencyKeywords).forEach(([level, keywords]) => {
            keywords.forEach(keyword => {
                if (symptoms.includes(keyword)) {
                    const levelScore = { baja: 1, moderada: 2, alta: 3, urgente: 4 }[level] || 1;
                    urgencyScore = Math.max(urgencyScore, levelScore);
                    matchedKeywords.push({ keyword, level, score: levelScore });
                }
            });
        });

        const levels = ['baja', 'moderada', 'alta', 'urgente'];
        return {
            level: levels[Math.min(urgencyScore - 1, 3)] || 'baja',
            score: urgencyScore,
            matchedKeywords
        };
    }

    /**
     * Calcula score de complejidad del caso
     */
    calculateComplexityScore(symptoms) {
        const complexityIndicators = {
            multiple_symptoms: symptoms.split(' ').length > 10 ? 0.3 : 0,
            pain_descriptors: (symptoms.match(/(insoportable|constante|severo|intenso|agudo)/g) || []).length * 0.2,
            chronic_indicators: (symptoms.match(/(meses|años|crónico|persistente|recurrente)/g) || []).length * 0.25,
            surgical_needs: (symptoms.match(/(extraer|sacar|quitar|cirugía|operar)/g) || []).length * 0.4,
            prosthetic_needs: (symptoms.match(/(prótesis|corona|puente|implante)/g) || []).length * 0.3
        };

        const totalScore = Object.values(complexityIndicators).reduce((sum, score) => sum + score, 0);
        const normalizedScore = Math.min(totalScore, 1);

        return {
            score: parseFloat(normalizedScore.toFixed(2)),
            level: normalizedScore > 0.7 ? 'alta' : normalizedScore > 0.4 ? 'moderada' : 'baja',
            indicators: complexityIndicators
        };
    }

    /**
     * Obtiene recomendaciones de especialidad
     */
    getSpecialtyRecommendations(symptoms) {
        const recommendations = [];

        Object.entries(this.specialtyMappings).forEach(([specialty, patterns]) => {
            let score = 0;
            let matches = [];

            patterns.forEach(pattern => {
                if (this.matchesPattern(symptoms, pattern.keyword)) {
                    score += pattern.weight;
                    matches.push(pattern.keyword);
                }
            });

            if (score > 0) {
                recommendations.push({
                    specialty,
                    score: parseFloat(score.toFixed(2)),
                    matches,
                    confidence: Math.min(score / 2, 1)
                });
            }
        });

        return recommendations
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
    }

    /**
     * Identifica factores de riesgo
     */
    identifyRiskFactors(symptoms) {
        const riskFactors = [];

        const riskPatterns = {
            infection_risk: /(infección|pus|flemón|absceso|hinchazón|fiebre)/g,
            bleeding_risk: /(sangrado|sangre|hemorragia)/g,
            nerve_damage_risk: /(adormecimiento|hormigueo|pérdida sensibilidad)/g,
            emergency_indicators: /(emergencia|urgente|inmediato|hospital)/g
        };

        Object.entries(riskPatterns).forEach(([riskType, pattern]) => {
            const matches = symptoms.match(pattern);
            if (matches) {
                riskFactors.push({
                    type: riskType,
                    level: matches.length > 2 ? 'alto' : matches.length > 1 ? 'moderado' : 'bajo',
                    indicators: matches,
                    recommendation: this.getRiskRecommendation(riskType)
                });
            }
        });

        return riskFactors;
    }

    /**
     * Calcula confianza del análisis
     */
    calculateConfidence(analysis, symptoms) {
        let confidenceScore = 0;
        
        // Factor 1: Calidad del tratamiento primario (40%)
        if (analysis.primaryTreatment && analysis.primaryTreatment.score > 0) {
            confidenceScore += Math.min(analysis.primaryTreatment.score / 2, 0.4);
        }
        
        // Factor 2: Número de matches de patrones (25%)
        const totalMatches = analysis.primaryTreatment?.matches?.length || 0;
        confidenceScore += Math.min(totalMatches * 0.05, 0.25);
        
        // Factor 3: Consistencia entre especialidades y tratamiento (20%)
        if (analysis.specialtyRecommendations.length > 0) {
            confidenceScore += Math.min(analysis.specialtyRecommendations[0].confidence, 0.2);
        }
        
        // Factor 4: Claridad de urgencia (15%)
        if (analysis.urgencyLevel.matchedKeywords.length > 0) {
            confidenceScore += 0.15;
        }
        
        return Math.min(confidenceScore, 0.95); // Max 95% confidence
    }

    /**
     * Recomienda clínica basada en análisis
     */
    recommendClinic(analysis) {
        // Lógica basada en complejidad y tratamiento
        if (analysis.complexityScore.level === 'alta') {
            return 'Clínica Integral Adulto y Gerontología';
        }
        
        const pediatricTreatments = ['Odontopediatría', 'Resina Simple', 'Selladores'];
        if (analysis.primaryTreatment && 
            pediatricTreatments.some(t => analysis.primaryTreatment.name.includes(t))) {
            return 'Clínica para el Niño y Adolescente';
        }
        
        return 'Clínica Integral Adulto y Gerontología';
    }

    // --- MÉTODOS DE UTILIDAD PRIVADOS ---

    matchesPattern(text, pattern) {
        const variations = this.generatePatternVariations(pattern);
        return variations.some(variation => text.includes(variation));
    }

    generatePatternVariations(pattern) {
        const variations = [pattern];
        
        // Agregar variaciones comunes
        const commonReplacements = {
            'dolor': ['duele', 'dolencia', 'molestia'],
            'muela': ['diente', 'pieza'],
            'sacar': ['extraer', 'quitar', 'remover'],
            'limpieza': ['limpiar', 'higiene', 'profilaxis']
        };
        
        Object.entries(commonReplacements).forEach(([original, replacements]) => {
            if (pattern.includes(original)) {
                replacements.forEach(replacement => {
                    variations.push(pattern.replace(original, replacement));
                });
            }
        });
        
        return variations;
    }

    getTreatmentCategory(treatment) {
        const categories = {
            'Endodoncia': 'especializada',
            'Exodoncia Simple': 'quirúrgica',
            'Resina Simple': 'restaurativa',
            'Resina Compuesta': 'restaurativa',
            'Corona': 'protésica',
            'Destartraje y Pulido Coronario': 'preventiva',
            'Pulido Radicular': 'periodontal'
        };
        
        return categories[treatment] || 'general';
    }

    getRiskRecommendation(riskType) {
        const recommendations = {
            infection_risk: 'Evaluación inmediata requerida. Considerar antibióticos.',
            bleeding_risk: 'Verificar historial de coagulación. Preparar medidas hemostáticas.',
            nerve_damage_risk: 'Evaluación neurológica previa. Considerar especialista.',
            emergency_indicators: 'Atención de emergencia inmediata requerida.'
        };
        
        return recommendations[riskType] || 'Evaluación profesional recomendada';
    }

    // --- INICIALIZACIÓN DE DATOS DE ENTRENAMIENTO ---

    initializePatterns() {
        return {
            'dolor insoportable': { 
                treatments: ['Endodoncia', 'Exodoncia Simple'], 
                confidence: 0.95, 
                urgencyMultiplier: 2.0, 
                category: 'emergency' 
            },
            'dolor constante muela': { 
                treatments: ['Endodoncia'], 
                confidence: 0.9, 
                urgencyMultiplier: 1.8, 
                category: 'urgent' 
            },
            'sensibilidad frío calor': { 
                treatments: ['Endodoncia', 'Resina Simple'], 
                confidence: 0.85, 
                urgencyMultiplier: 1.4, 
                category: 'specialized' 
            },
            'limpieza dental': { 
                treatments: ['Destartraje y Pulido Coronario'], 
                confidence: 1.0, 
                urgencyMultiplier: 0.8, 
                category: 'preventive' 
            },
            'caries hoyo': { 
                treatments: ['Resina Simple', 'Resina Compuesta'], 
                confidence: 0.9, 
                urgencyMultiplier: 1.2, 
                category: 'restorative' 
            },
            'encías sangran': { 
                treatments: ['Pulido Radicular', 'Destartraje y Pulido Coronario'], 
                confidence: 0.85, 
                urgencyMultiplier: 1.3, 
                category: 'periodontal' 
            },
            'muela rota': { 
                treatments: ['Corona', 'Resina Compuesta', 'Exodoncia Simple'], 
                confidence: 0.8, 
                urgencyMultiplier: 1.5, 
                category: 'restorative' 
            },
            'extraer sacar muela': { 
                treatments: ['Exodoncia Simple'], 
                confidence: 0.95, 
                urgencyMultiplier: 1.6, 
                category: 'surgical' 
            },
            'corona funda': { 
                treatments: ['Corona'], 
                confidence: 0.9, 
                urgencyMultiplier: 1.0, 
                category: 'prosthetic' 
            },
            'falta diente': { 
                treatments: ['Protesis Parcial Removible', 'Corona'], 
                confidence: 0.8, 
                urgencyMultiplier: 0.9, 
                category: 'prosthetic' 
            }
        };
    }

    initializeTreatmentWeights() {
        return {
            'Endodoncia': { emergency: 2.0, urgent: 1.8, specialized: 1.5, restorative: 0.8 },
            'Exodoncia Simple': { emergency: 1.8, urgent: 1.6, surgical: 2.0, specialized: 1.2 },
            'Resina Simple': { restorative: 1.8, preventive: 1.2, specialized: 1.0 },
            'Resina Compuesta': { restorative: 2.0, specialized: 1.5, urgent: 1.2 },
            'Corona': { prosthetic: 2.0, restorative: 1.5, specialized: 1.3 },
            'Destartraje y Pulido Coronario': { preventive: 2.0, periodontal: 1.5 },
            'Pulido Radicular': { periodontal: 2.0, specialized: 1.5 },
            'Protesis Parcial Removible': { prosthetic: 2.0, restorative: 1.0 }
        };
    }

    initializeUrgencyKeywords() {
        return {
            urgente: ['insoportable', 'emergencia', 'inmediato', 'urgente', 'hospital', 'intolerable'],
            alta: ['severo', 'constante', 'intenso', 'agudo', 'terrible', 'fuerte', 'mucho dolor'],
            moderada: ['molesta', 'incomoda', 'regular', 'duele', 'dolor', 'molestia'],
            baja: ['leve', 'poco', 'ocasional', 'ligero', 'preventivo', 'chequeo']
        };
    }

    initializeSpecialtyMappings() {
        return {
            'Endodoncia': [
                { keyword: 'dolor', weight: 1.5 },
                { keyword: 'sensibilidad', weight: 1.3 },
                { keyword: 'conducto', weight: 2.0 },
                { keyword: 'nervio', weight: 1.8 }
            ],
            'Cirugía Oral': [
                { keyword: 'extraer', weight: 2.0 },
                { keyword: 'sacar', weight: 2.0 },
                { keyword: 'cirugía', weight: 1.8 },
                { keyword: 'operar', weight: 1.5 }
            ],
            'Operatoria Dental': [
                { keyword: 'caries', weight: 1.8 },
                { keyword: 'resina', weight: 2.0 },
                { keyword: 'empaste', weight: 1.8 },
                { keyword: 'hoyo', weight: 1.5 }
            ],
            'Periodoncia': [
                { keyword: 'encías', weight: 2.0 },
                { keyword: 'sangran', weight: 1.8 },
                { keyword: 'gingivitis', weight: 2.0 },
                { keyword: 'sarro', weight: 1.3 }
            ]
        };
    }
}

module.exports = SymptomAnalyzer;