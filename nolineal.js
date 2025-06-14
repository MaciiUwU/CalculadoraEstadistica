// Función para mostrar/ocultar secciones según sea necesario
function toggleSectionVisibility() {
    const residualsSection = document.querySelector('.residuals-section');
    const modelComparison = document.querySelector('.model-comparison');
    const results = document.getElementById('results');
    
    if (results.style.display !== 'none') {
        // Mostrar secciones solo cuando hay resultados
        residualsSection.classList.add('show');
        residualsSection.style.display = 'block';
    } else {
        // Ocultar secciones cuando no hay resultados
        residualsSection.classList.remove('show');
        residualsSection.style.display = 'none';
        modelComparison.classList.remove('show');
        modelComparison.style.display = 'none';
    }
}

// Función para mostrar la comparación de modelos
function showModelComparison() {
    const modelComparison = document.querySelector('.model-comparison');
    modelComparison.classList.add('show');
    modelComparison.style.display = 'block';
}

let regressionChart = null;
        let currentParams = null;
        let currentType = null;
        let originalData = [];

        // Información sobre las fórmulas
        const formulaInfo = {
            exponential: {
                formula: 'y = ae^(bx)',
                description: 'Crecimiento o decaimiento exponencial'
            },
            power: {
                formula: 'y = ax^b',
                description: 'Relación de potencia entre variables'
            },
            logarithmic: {
                formula: 'y = a + b*ln(x)',
                description: 'Crecimiento logarítmico (se satura)'
            },
            polynomial2: {
                formula: 'y = ax² + bx + c',
                description: 'Relación cuadrática (parábola)'
            },
            polynomial3: {
                formula: 'y = ax³ + bx² + cx + d',
                description: 'Relación cúbica (curva S)'
            },
            hyperbolic: {
                formula: 'y = a + b/x',
                description: 'Relación hiperbólica (asíntota)'
            }
        };

        // Event listeners
        document.getElementById('regressionType').addEventListener('change', updateFormulaInfo);
        document.getElementById('inputMethod').addEventListener('change', toggleInputMethod);

        function updateFormulaInfo() {
            const type = document.getElementById('regressionType').value;
            const info = formulaInfo[type];
            document.getElementById('formulaInfo').innerHTML = 
                `<strong>Fórmula:</strong> ${info.formula}<br>
                 <strong>Descripción:</strong> ${info.description}`;
        }

        function toggleInputMethod() {
            const method = document.getElementById('inputMethod').value;
            const manualInput = document.getElementById('manualInput');
            const bulkInput = document.getElementById('bulkInput');
            
            if (method === 'manual') {
                manualInput.style.display = 'block';
                bulkInput.style.display = 'none';
            } else {
                manualInput.style.display = 'none';
                bulkInput.style.display = 'block';
            }
        }

        function addDataPoint() {
            const dataPoints = document.getElementById('dataPoints');
            const newPoint = document.createElement('div');
            newPoint.className = 'data-point';
            newPoint.innerHTML = `
                <input type="number" class="x-value" placeholder="Valor X" step="any">
                <input type="number" class="y-value" placeholder="Valor Y" step="any">
                <button type="button" class="remove-btn" onclick="removeDataPoint(this)">×</button>
            `;
            dataPoints.appendChild(newPoint);
        }

        function removeDataPoint(button) {
            const dataPoints = document.getElementById('dataPoints');
            if (dataPoints.children.length > 2) {
                button.parentElement.remove();
            } else {
                showError('Debe mantener al menos 2 puntos de datos');
            }
        }

        function showError(message) {
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }

        function clearAll() {
            // Limpiar datos manuales
            const dataPoints = document.getElementById('dataPoints');
            dataPoints.innerHTML = `
                <div class="data-point">
                    <input type="number" class="x-value" placeholder="Valor X" step="any">
                    <input type="number" class="y-value" placeholder="Valor Y" step="any">
                    <button type="button" class="remove-btn" onclick="removeDataPoint(this)">×</button>
                </div>
                <div class="data-point">
                    <input type="number" class="x-value" placeholder="Valor X" step="any">
                    <input type="number" class="y-value" placeholder="Valor Y" step="any">
                    <button type="button" class="remove-btn" onclick="removeDataPoint(this)">×</button>
                </div>
            `;
            
            // Limpiar datos masivos
            document.getElementById('bulkData').value = '';
            
            // Limpiar proyección
            document.getElementById('projectionX').value = '';
            document.getElementById('projectionResult').style.display = 'none';
            
            // Ocultar resultados
            document.getElementById('results').style.display = 'none';
            document.getElementById('noResults').style.display = 'block';
            
            // Destruir gráfico
            if (regressionChart) {
                regressionChart.destroy();
                regressionChart = null;
            }
            
            originalData = [];
            currentParams = null;

            // Ocultar todas las secciones
            document.querySelector('.residuals-section').style.display = 'none';
            document.querySelector('.model-comparison').style.display = 'none';
            document.querySelector('.residuals-section').classList.remove('show');
            document.querySelector('.model-comparison').classList.remove('show');
        }

        function parseData() {
            const inputMethod = document.getElementById('inputMethod').value;
            let data = [];

            if (inputMethod === 'manual') {
                const xValues = document.querySelectorAll('.x-value');
                const yValues = document.querySelectorAll('.y-value');
                
                for (let i = 0; i < xValues.length; i++) {
                    const x = parseFloat(xValues[i].value);
                    const y = parseFloat(yValues[i].value);
                    
                    if (!isNaN(x) && !isNaN(y)) {
                        data.push({x, y});
                    }
                }
            } else {
                const bulkText = document.getElementById('bulkData').value.trim();
                const lines = bulkText.split('\n');
                
                for (let line of lines) {
                    line = line.trim();
                    if (line) {
                        const parts = line.split(/[,\s]+/);
                        if (parts.length >= 2) {
                            const x = parseFloat(parts[0]);
                            const y = parseFloat(parts[1]);
                            
                            if (!isNaN(x) && !isNaN(y)) {
                                data.push({x, y});
                            }
                        }
                    }
                }
            }

            return data;
        }

        function calculateRegression() {
            const data = parseData();
            if (data.length < 2) {
                showError('Se necesitan al menos 2 puntos de datos');
                return;
            }

            originalData = [...data];
            const type = document.getElementById('regressionType').value;
            currentType = type;
            // Validación especial para polinomial
            if (type.includes('polynomial')) {
                const degree = parseInt(type.replace('polynomial', ''));
                if (data.length <= degree) {
                    showError(`Para grado ${degree} se necesitan al menos ${degree + 1} puntos`);
                    return;
                }
            }

            try {
                let params;
                switch (type) {
                    case 'exponential':
                        params = calculateExponentialRegression(data);
                        break;
                    case 'power':
                        params = calculatePowerRegression(data);
                        break;
                    case 'logarithmic':
                        params = calculateLogarithmicRegression(data);
                        break;
                    case 'polynomial2':
                        params = calculatePolynomialRegression(data, 2);
                        break;
                    case 'polynomial3':
                        params = calculatePolynomialRegression(data, 3);
                        break;
                    case 'hyperbolic':
                        params = calculateHyperbolicRegression(data);
                        break;
                    default:
                        throw new Error('Tipo de regresión no soportado');
                }

                currentParams = params;
                displayResults(data, params, type);
                
            } catch (error) {
                showError(`Error en el cálculo: ${error.message}`);
            }
            try {
                let params;
                switch (type) {
                    case 'polynomial2':
                    case 'polynomial3':
                        const degree = parseInt(type.replace('polynomial', ''));
                        console.log("Datos de entrada:", data); // Verificar datos
                        params = calculatePolynomialRegression(data, degree);
                        console.log("Matriz del sistema:", params.matrix); // Verificar matriz
                        console.log("Coeficientes:", params.coefficients); // Verificar solución
                        break;
                    // ... otros casos ...
                }
                // ... resto del código ...
            } catch (error) {
                showError(`Error en el cálculo: ${error.message}`);
                console.error("Detalle del error:", error); // Debug detallado
            }
            toggleSectionVisibility();
        }

        // Regresión Exponencial: y = ae^(bx)
        function calculateExponentialRegression(data) {
            // Validar que todos los y > 0
            for (let point of data) {
                if (point.y <= 0) {
                    throw new Error('Para regresión exponencial, todos los valores Y deben ser positivos');
                }
            }

            // Crear tabla de cálculos intermedios
            const calculations = [];
            let sumX = 0, sumLnY = 0, sumXLnY = 0, sumX2 = 0;
            
            for (let point of data) {
                const lnY = Math.log(point.y);
                const x2 = point.x * point.x;
                const xLnY = point.x * lnY;
                
                calculations.push({
                    x: point.x,
                    y: point.y,
                    lnY: lnY,
                    x2: x2,
                    xLnY: xLnY
                });
                
                sumX += point.x;
                sumLnY += lnY;
                sumXLnY += xLnY;
                sumX2 += x2;
            }

            const n = data.length;

            // Calcular coeficientes según fórmulas del documento
            const denominator = n * sumX2 - sumX * sumX;
            const b = (n * sumXLnY - sumX * sumLnY) / denominator;
            const lnA = (sumLnY - b * sumX) / n;
            const a = Math.exp(lnA);

            return {
                a, b, 
                type: 'exponential',
                calculations: calculations,
                totals: { sumX, sumLnY, sumXLnY, sumX2, n },
                intermediateCalcs: { denominator, lnA }
            };
        }

        // Regresión Potencial: y = ax^b
        function calculatePowerRegression(data) {
            // Validar que todos los x > 0 y y > 0
            for (let point of data) {
                if (point.x <= 0 || point.y <= 0) {
                    throw new Error('Para regresión potencial, todos los valores X e Y deben ser positivos');
                }
            }

            // Crear tabla de cálculos intermedios
            const calculations = [];
            let sumLnX = 0, sumLnY = 0, sumLnXLnY = 0, sumLnX2 = 0;
            
            for (let point of data) {
                const lnX = Math.log(point.x);
                const lnY = Math.log(point.y);
                const lnX2 = lnX * lnX;
                const lnXLnY = lnX * lnY;
                
                calculations.push({
                    x: point.x,
                    y: point.y,
                    lnX: lnX,
                    lnY: lnY,
                    lnX2: lnX2,
                    lnXLnY: lnXLnY
                });
                
                sumLnX += lnX;
                sumLnY += lnY;
                sumLnXLnY += lnXLnY;
                sumLnX2 += lnX2;
            }

            const n = data.length;

            // Calcular coeficientes según fórmulas del documento
            const denominator = n * sumLnX2 - sumLnX * sumLnX;
            const b = (n * sumLnXLnY - sumLnX * sumLnY) / denominator;
            const lnA = (sumLnY - b * sumLnX) / n;
            const a = Math.exp(lnA);

            return {
                a, b, 
                type: 'power',
                calculations: calculations,
                totals: { sumLnX, sumLnY, sumLnXLnY, sumLnX2, n },
                intermediateCalcs: { denominator, lnA }
            };
        }

        // Regresión Logarítmica: y = a + b*ln(x)
        function calculateLogarithmicRegression(data) {
            // Validar que todos los x > 0
            for (let point of data) {
                if (point.x <= 0) {
                    throw new Error('Para regresión logarítmica, todos los valores X deben ser positivos');
                }
            }

            // Crear tabla de cálculos intermedios
            const calculations = [];
            let sumLnX = 0, sumY = 0, sumLnXY = 0, sumLnX2 = 0;
            
            for (let point of data) {
                const lnX = Math.log(point.x);
                const lnX2 = lnX * lnX;
                const lnXY = lnX * point.y;
                
                calculations.push({
                    x: point.x,
                    y: point.y,
                    lnX: lnX,
                    lnX2: lnX2,
                    lnXY: lnXY
                });
                
                sumLnX += lnX;
                sumY += point.y;
                sumLnXY += lnXY;
                sumLnX2 += lnX2;
            }

            const n = data.length;

            // Calcular coeficientes según fórmulas del documento
            const denominator = n * sumLnX2 - sumLnX * sumLnX;
            const b = (n * sumLnXY - sumLnX * sumY) / denominator;
            const a = (sumY - b * sumLnX) / n;

            return {
                a, b, 
                type: 'logarithmic',
                calculations: calculations,
                totals: { sumLnX, sumY, sumLnXY, sumLnX2, n },
                intermediateCalcs: { denominator }
            };
        }

        // Regresión Polinomial
        function calculatePolynomialRegression(data, degree) {
            const n = data.length;
            if (n <= degree) {
                throw new Error(`Se necesitan al menos ${degree + 1} puntos para regresión polinomial de grado ${degree}`);
            }

            // Inicializar todas las sumas necesarias
            const sums = {};
            for (let i = 0; i <= 2*degree; i++) {
                sums[`sumX${i}`] = 0;
            }
            for (let i = 0; i <= degree; i++) {
                sums[`sumX${i}Y`] = 0;
            }

            // Calcular todas las sumas
            const calculations = data.map(point => {
                const row = { x: point.x, y: point.y };
                for (let i = 1; i <= 2*degree; i++) {
                    row[`x${i}`] = Math.pow(point.x, i);
                    sums[`sumX${i}`] += row[`x${i}`];
                }
                for (let i = 0; i <= degree; i++) {
                    row[`x${i}y`] = Math.pow(point.x, i) * point.y;
                    sums[`sumX${i}Y`] += row[`x${i}y`];
                }
                return row;
            });

            // Construir matriz del sistema
            const matrix = [];
            for (let i = 0; i <= degree; i++) {
                const row = [];
                for (let j = 0; j <= degree; j++) {
                    row.push(sums[`sumX${i+j}`]);
                }
                row.push(sums[`sumX${i}Y`]);
                matrix.push(row);
            }

            // Resolver el sistema (versión más robusta)
            const coefficients = solveSystem(matrix);
            
            // Verificar que los coeficientes sean válidos
            if (coefficients.some(isNaN)) {
                throw new Error('El sistema de ecuaciones no tiene solución única. Revise los datos.');
            }

            return {
                coefficients,
                type: `polynomial${degree}`,
                calculations,
                sums,
                matrix
            };
        }

        function calculateHyperbolicRegression(data) {
            // Validar que todos los x ≠ 0
            for (let point of data) {
                if (point.x === 0) {
                    throw new Error('Para regresión hiperbólica, todos los valores X deben ser diferentes de cero');
                }
            }

            const calculations = [];
            let sumInvX = 0, sumY = 0, sumInvXY = 0, sumInvX2 = 0;
            
            for (let point of data) {
                const invX = 1 / point.x;
                const invX2 = invX * invX;
                const invXY = invX * point.y;
                
                calculations.push({
                    x: point.x,
                    y: point.y,
                    invX: invX,
                    invX2: invX2,
                    invXY: invXY
                });
                
                sumInvX += invX;
                sumY += point.y;
                sumInvXY += invXY;
                sumInvX2 += invX2;
            }

            const n = data.length;

            // Calcular coeficientes según fórmulas del documento
            const denominator = n * sumInvX2 - sumInvX * sumInvX;
            const b = (n * sumInvXY - sumInvX * sumY) / denominator;
            const a = (sumY - b * sumInvX) / n;

            return {
                a, b, 
                type: 'hyperbolic',
                calculations: calculations,
                totals: { sumInvX, sumY, sumInvXY, sumInvX2, n },
                intermediateCalcs: { denominator }
            };
        }
        function solveSystem(matrix) {
            const n = matrix.length;
            const clone = JSON.parse(JSON.stringify(matrix)); // Copia profunda
            
            // Eliminación hacia adelante
            for (let i = 0; i < n; i++) {
                // Pivoteo parcial para evitar división por cero
                let maxRow = i;
                for (let k = i + 1; k < n; k++) {
                    if (Math.abs(clone[k][i]) > Math.abs(clone[maxRow][i])) {
                        maxRow = k;
                    }
                }
                [clone[i], clone[maxRow]] = [clone[maxRow], clone[i]];
                
                // Hacer ceros debajo del pivote
                for (let k = i + 1; k < n; k++) {
                    const factor = clone[k][i] / clone[i][i];
                    for (let j = i; j <= n; j++) {
                        clone[k][j] -= factor * clone[i][j];
                    }
                }
            }
            
            // Sustitución hacia atrás
            const solution = new Array(n);
            for (let i = n - 1; i >= 0; i--) {
                solution[i] = clone[i][n] / clone[i][i];
                for (let j = i - 1; j >= 0; j--) {
                    clone[j][n] -= clone[j][i] * solution[i];
                }
            }
            
            return solution;
        }

        function displayResults(data, params, type) {
            // Mostrar la sección de resultados
            document.getElementById('results').style.display = 'block';
            document.getElementById('noResults').style.display = 'none';

            // Mostrar la ecuación
            let equationText = '';
            switch (type) {
                case 'exponential':
                    equationText = `y = ${params.a.toExponential(4)}e<sup>${params.b.toFixed(4)}x</sup>`;
                    break;
                case 'power':
                    equationText = `y = ${params.a.toExponential(4)}x<sup>${params.b.toFixed(4)}</sup>`;
                    break;
                case 'logarithmic':
                    equationText = `y = ${params.a.toFixed(4)} + ${params.b.toFixed(4)}·ln(x)`;
                    break;
                case 'polynomial2':
                    equationText = `y = ${params.coefficients[2].toFixed(4)}x² + ${params.coefficients[1].toFixed(4)}x + ${params.coefficients[0].toFixed(4)}`;
                    break;
                case 'polynomial3':
                    equationText = `y = ${params.coefficients[3].toFixed(4)}x³ + ${params.coefficients[2].toFixed(4)}x² + ${params.coefficients[1].toFixed(4)}x + ${params.coefficients[0].toFixed(4)}`;
                    break;
                case 'hyperbolic':
                    equationText = `y = ${params.a.toFixed(4)} + ${params.b.toFixed(4)}/x`;
                    break;
            }
            document.getElementById('equationDisplay').innerHTML = `Ecuación: ${equationText}`;

            // Calcular métricas de calidad
            const metrics = calculateMetrics(data, params, type);
            const additionalMetrics = calculateAdditionalMetrics(data, metrics.predictedValues, params, type);
            // Mostrar análisis de residuales
            const predictedValues = data.map(point => predictValue(point.x, params, type));
            analyzeResiduals(data, predictedValues, params, type);
            
            // Mostrar métricas
            document.getElementById('mseValue').textContent = metrics.mse.toFixed(6);
            document.getElementById('maeValue').textContent = metrics.mae.toFixed(6);
            document.getElementById('r2Value').textContent = metrics.r2.toFixed(6);
            document.getElementById('seValue').textContent = metrics.se.toFixed(6);
            document.getElementById('seeValue').textContent = additionalMetrics.SEE.toFixed(6);
            document.getElementById('r2adjValue').textContent = additionalMetrics.R2adj.toFixed(6);
            document.getElementById('aicValue').textContent = additionalMetrics.AIC.toFixed(4);
            document.getElementById('sstValue').textContent = additionalMetrics.SST.toFixed(6); // Nueva línea agregada

            // Mostrar cálculos intermedios
            displayIntermediateCalculations(params, type);

            // Mostrar gráfico
            drawChart(data, params, type);
            // Mostrar análisis de residuales
            analyzeResiduals(data, metrics.predictedValues, params, type);

            // Inicializar tooltips
            initTooltips();
        }

        function calculateMetrics(data, params, type) {
            const n = data.length;
            let sumSquaredErrors = 0;
            let sumAbsoluteErrors = 0;
            let sumY = 0;
            let sumY2 = 0;
            
            // Calcular valores predichos y errores
            const predictedValues = [];
            for (let point of data) {
                const predicted = predictValue(point.x, params, type);
                predictedValues.push(predicted);
                
                const error = point.y - predicted;
                sumSquaredErrors += error * error;
                sumAbsoluteErrors += Math.abs(error);
                sumY += point.y;
                sumY2 += point.y * point.y;
            }
            
            const meanY = sumY / n;
            
            // Calcular suma de cuadrados total
            let sumSquaredTotal = 0;
            for (let point of data) {
                sumSquaredTotal += (point.y - meanY) * (point.y - meanY);
            }
            
            // Calcular métricas
            const mse = sumSquaredErrors / n;
            const mae = sumAbsoluteErrors / n;
            const r2 = 1 - (sumSquaredErrors / sumSquaredTotal);
            const se = Math.sqrt(sumSquaredErrors / (n - (type.includes('polynomial') ? params.coefficients.length : 2)));
            
            return { mse, mae, r2, se, predictedValues };
        }
        //Métricas adicionales
        function calculateAdditionalMetrics(data, predictedValues, params, type) {
            const n = data.length;
            const p = type.includes('polynomial') ? params.coefficients.length : 2;
            const SSE = predictedValues.reduce((sum, yhat, i) => sum + Math.pow(data[i].y - yhat, 2), 0);
            const SST = data.reduce((sum, point) => sum + Math.pow(point.y - (data.reduce((a,b) => a + b.y, 0)/n), 2), 0);
            
            return {
                SEE: Math.sqrt(SSE / (n - p)), // Error Estándar de Estimación
                R2adj: 1 - (SSE/(n - p)) / (SST/(n - 1)), // R² ajustado
                AIC: n * Math.log(SSE) + 2 * p, // Criterio de Akaike
                SSE: SSE, // Suma de Cuadrados de los Errores
                SST: SST  // Suma de Cuadrados Total
            };
        }

        function predictValue(x, params, type) {
            switch (type) {
                case 'exponential':
                    return params.a * Math.exp(params.b * x);
                case 'power':
                    return params.a * Math.pow(x, params.b);
                case 'logarithmic':
                    return params.a + params.b * Math.log(x);
                case 'polynomial2':
                    return params.coefficients[0] + 
                        params.coefficients[1] * x + 
                        params.coefficients[2] * Math.pow(x, 2);
                case 'polynomial3':
                    return params.coefficients[0] + 
                        params.coefficients[1] * x + 
                        params.coefficients[2] * Math.pow(x, 2) + 
                        params.coefficients[3] * Math.pow(x, 3);
                case 'hyperbolic':
                    return params.a + params.b / x;
                default:
                    return 0;
            }
        }
        function analyzeResiduals(data, predictedValues, params, type) {
            // Calcular métricas de residuales
            const residuals = data.map((point, i) => {
                const residual = point.y - predictedValues[i];
                return {
                    x: point.x,
                    yReal: point.y,
                    yPred: predictedValues[i],
                    residual: residual,
                    percentError: (Math.abs(residual) / point.y) * 100
                };
            });

            // Mostrar tabla de residuales
            const tableBody = document.querySelector('#residualsTable tbody');
            tableBody.innerHTML = residuals.map(r => `
                <tr>
                    <td>${r.x.toFixed(4)}</td>
                    <td>${r.yReal.toFixed(4)}</td>
                    <td>${r.yPred.toFixed(4)}</td>
                    <td class="${r.residual >= 0 ? 'positive-res' : 'negative-res'}">
                        ${r.residual.toFixed(4)}
                    </td>
                    <td>${r.percentError.toFixed(2)}%</td>
                </tr>
            `).join('');

            // Graficar residuales
            plotResidualsChart(residuals);
        }

        function plotResidualsChart(residuals) {
            const ctx = document.getElementById('residualsChart').getContext('2d');
            
            // Destruir gráfico anterior si existe
            if (window.residualChart) {
                window.residualChart.destroy();
            }

            // Preparar datos para el gráfico
            const residualData = residuals.map(r => ({
                x: r.x,
                y: r.residual
            }));

            // Crear línea de referencia en cero
            const zeroLine = residuals.map(r => ({
                x: r.x,
                y: 0
            }));

            window.residualChart = new Chart(ctx, {
                type: 'scatter',
                data: {
                    datasets: [
                        {
                            label: 'Residuales',
                            data: residualData,
                            backgroundColor: 'rgba(255, 99, 132, 0.8)',
                            pointRadius: 6,
                            borderColor: 'rgba(255, 99, 132, 1)'
                        },
                        {
                            label: 'Línea Cero',
                            data: zeroLine,
                            type: 'line',
                            borderColor: 'rgba(0, 0, 0, 0.5)',
                            borderWidth: 1,
                            pointRadius: 0,
                            borderDash: [5, 5]
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Valores X',
                                font: {
                                    weight: 'bold'
                                }
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Residual (Yreal - Ypred)',
                                font: {
                                    weight: 'bold'
                                }
                            },
                            min: Math.min(...residuals.map(r => r.residual)) - 1,
                            max: Math.max(...residuals.map(r => r.residual)) + 1
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Residual: ${context.raw.y.toFixed(4)}`;
                                }
                            }
                        }
                    }
                }
            });
        }

        function compareModels() {
            const data = parseData();
            if (data.length < 3) {
                showError('Se necesitan al menos 3 puntos para comparar modelos');
                return;
            }

            const models = [
                'exponential', 'power', 'logarithmic', 
                'polynomial2', 'polynomial3', 'hyperbolic'
            ];

            const results = models.map(type => {
                try {
                    let params;
                    switch (type) {
                        case 'exponential': params = calculateExponentialRegression(data); break;
                        case 'power': params = calculatePowerRegression(data); break;
                        case 'logarithmic': params = calculateLogarithmicRegression(data); break;
                        case 'polynomial2': params = calculatePolynomialRegression(data, 2); break;
                        case 'polynomial3': params = calculatePolynomialRegression(data, 3); break;
                        case 'hyperbolic': params = calculateHyperbolicRegression(data); break;
                    }
                    const metrics = calculateMetrics(data, params, type);
                    const additional = calculateAdditionalMetrics(data, metrics.predictedValues, params, type);
                    return { type, metrics, additional };
                } catch (e) {
                    return { type, error: e.message };
                }
            });

            displayModelsComparison(results);
            showModelComparison();
        }

        function displayModelsComparison(results) {
            const tableBody = document.querySelector('#modelsComparisonTable tbody');
            let bestR2 = -Infinity;
            let bestModel = '';

            // Encontrar el mejor modelo (mayor R²)
            results.forEach(result => {
                if (!result.error && result.metrics.r2 > bestR2) {
                    bestR2 = result.metrics.r2;
                    bestModel = result.type;
                }
            });

            tableBody.innerHTML = results.map(result => {
                if (result.error) {
                    return `
                        <tr>
                            <td>${formulaInfo[result.type].formula}</td>
                            <td colspan="4" class="text-error">${result.error}</td>
                        </tr>
                    `;
                }

                const isBest = result.type === bestModel;
                return `
                    <tr class="${isBest ? 'best-model' : ''}">
                        <td>${formulaInfo[result.type].formula}</td>
                        <td>${result.metrics.mse.toFixed(6)}</td>
                        <td>${result.metrics.r2.toFixed(6)}</td>
                        <td>${result.additional.AIC.toFixed(4)}</td>
                        <td>${isBest ? '⭐ Mejor' : ''}</td>
                    </tr>
                `;
            }).join('');
        }

        const helpContent = {
            exponential: {
                title: "Regresión Exponencial",
                content: `
                    <p><strong>Fórmula:</strong> y = ae<sup>bx</sup></p>
                    <p><strong>Uso recomendado:</strong> Cuando los datos muestran crecimiento o decaimiento exponencial.</p>
                    <p><strong>Requisitos:</strong> Todos los valores Y deben ser positivos (y > 0).</p>
                    <p><strong>Interpretación:</strong></p>
                    <ul>
                        <li><strong>a:</strong> Valor inicial cuando x = 0</li>
                        <li><strong>b:</strong> Tasa de crecimiento (si b > 0) o decaimiento (si b < 0)</li>
                    </ul>
                    <p><strong>Ejemplos aplicados:</strong></p>
                    <ul>
                        <li>Crecimiento bacteriano</li>
                        <li>Desintegración radiactiva</li>
                        <li>Interés compuesto</li>
                    </ul>
                `
            },
            power: {
                title: "Regresión Potencial",
                content: `
                    <p><strong>Fórmula:</strong> y = ax<sup>b</sup></p>
                    <p><strong>Uso recomendado:</strong> Cuando la tasa de crecimiento varía según una potencia fija.</p>
                    <p><strong>Requisitos:</strong> Todos los valores X e Y deben ser positivos (x > 0, y > 0).</p>
                    <p><strong>Interpretación:</strong></p>
                    <ul>
                        <li><strong>a:</strong> Coeficiente de escala</li>
                        <li><strong>b:</strong> Exponente (determina la forma de la curva):
                            <ul>
                                <li>b > 1: Crecimiento acelerado</li>
                                <li>0 < b < 1: Crecimiento desacelerado</li>
                                <li>b < 0: Relación inversa</li>
                            </ul>
                        </li>
                    </ul>
                    <p><strong>Ejemplos aplicados:</strong></p>
                    <ul>
                        <li>Leyes de escala en biología (Ley de Kleiber)</li>
                        <li>Relación área-volumen</li>
                        <li>Curvas de aprendizaje</li>
                    </ul>
                `
            },
            logarithmic: {
                title: "Regresión Logarítmica",
                content: `
                    <p><strong>Fórmula:</strong> y = a + b·ln(x)</p>
                    <p><strong>Uso recomendado:</strong> Cuando el crecimiento es rápido al principio y luego se estabiliza.</p>
                    <p><strong>Requisitos:</strong> Todos los valores X deben ser positivos (x > 0).</p>
                    <p><strong>Interpretación:</strong></p>
                    <ul>
                        <li><strong>a:</strong> Valor de y cuando ln(x) = 0 (x = 1)</li>
                        <li><strong>b:</strong> Tasa de cambio:
                            <ul>
                                <li>b > 0: Función creciente</li>
                                <li>b < 0: Función decreciente</li>
                            </ul>
                        </li>
                    </ul>
                    <p><strong>Ejemplos aplicados:</strong></p>
                    <ul>
                        <li>Ley de Weber-Fechner (percepción sensorial)</li>
                        <li>Escala de Richter (terremotos)</li>
                        <li>Rendimientos decrecientes en economía</li>
                    </ul>
                `
            },
            polynomial2: {
                title: "Regresión Polinomial (Grado 2)",
                content: `
                    <p><strong>Fórmula:</strong> y = ax<sup>2</sup> + bx + c</p>
                    <p><strong>Uso recomendado:</strong> Cuando los datos tienen un punto de inflexión (máximo o mínimo).</p>
                    <p><strong>Requisitos:</strong> Mínimo 3 puntos de datos.</p>
                    <p><strong>Interpretación:</strong></p>
                    <ul>
                        <li><strong>a:</strong> Determina la concavidad:
                            <ul>
                                <li>a > 0: Concavidad hacia arriba (mínimo)</li>
                                <li>a < 0: Concavidad hacia abajo (máximo)</li>
                            </ul>
                        </li>
                        <li><strong>b:</strong> Coeficiente lineal</li>
                        <li><strong>c:</strong> Término independiente (y cuando x = 0)</li>
                    </ul>
                    <p><strong>Ejemplos aplicados:</strong></p>
                    <ul>
                        <li>Trayectorias parabólicas</li>
                        <li>Curvas de costo-beneficio</li>
                        <li>Modelos de aceleración</li>
                    </ul>
                `
            },
            polynomial3: {
                title: "Regresión Polinomial (Grado 3)",
                content: `
                    <p><strong>Fórmula:</strong> y = ax<sup>3</sup> + bx<sup>2</sup> + cx + d</p>
                    <p><strong>Uso recomendado:</strong> Cuando los datos tienen dos puntos de inflexión (forma de S o doble curva).</p>
                    <p><strong>Requisitos:</strong> Mínimo 4 puntos de datos.</p>
                    <p><strong>Interpretación:</strong></p>
                    <ul>
                        <li><strong>a:</strong> Determina el comportamiento en los extremos:
                            <ul>
                                <li>a > 0: y → ∞ cuando x → ∞</li>
                                <li>a < 0: y → -∞ cuando x → ∞</li>
                            </ul>
                        </li>
                        <li><strong>b, c:</strong> Controlan los puntos de inflexión</li>
                        <li><strong>d:</strong> Término independiente (y cuando x = 0)</li>
                    </ul>
                    <p><strong>Ejemplos aplicados:</strong></p>
                    <ul>
                        <li>Modelos de crecimiento poblacional</li>
                        <li>Curvas de solubilidad</li>
                        <li>Transiciones de fase en física</li>
                    </ul>
                `
            },
            hyperbolic: {
                title: "Regresión Hiperbólica",
                content: `
                    <p><strong>Fórmula:</strong> y = a + b/x</p>
                    <p><strong>Uso recomendado:</strong> Cuando la relación tiende a una asíntota cuando x crece.</p>
                    <p><strong>Requisitos:</strong> Ningún valor X puede ser cero (x ≠ 0).</p>
                    <p><strong>Interpretación:</strong></p>
                    <ul>
                        <li><strong>a:</strong> Asíntota horizontal (y → a cuando x → ∞)</li>
                        <li><strong>b:</strong> Determina la rapidez de aproximación a la asíntota</li>
                    </ul>
                    <p><strong>Ejemplos aplicados:</strong></p>
                    <ul>
                        <li>Ley de Boyle (presión-volumen en gases)</li>
                        <li>Curvas de demanda en economía</li>
                        <li>Relación dosis-respuesta en farmacología</li>
                    </ul>
                `
            },
            general: {
                title: "Guía General de Regresión",
                content: `
                    <p><strong>¿Cómo elegir el mejor modelo?</strong></p>
                    <ol>
                        <li>Revise la forma gráfica de sus datos</li>
                        <li>Use la función de comparación de modelos</li>
                        <li>Considere el contexto teórico del fenómeno</li>
                        <li>Prefiera modelos más simples (principio de parsimonia)</li>
                    </ol>
                    
                    <p><strong>Métricas clave:</strong></p>
                    <ul>
                        <li><strong>R²:</strong> Mide qué porcentaje de la variación es explicada por el modelo (más cercano a 1 es mejor)</li>
                        <li><strong>ECM:</strong> Error cuadrático medio (valores más bajos indican mejor ajuste)</li>
                        <li><strong>AIC:</strong> Criterio de información de Akaike (modelos con menor AIC son preferibles)</li>
                    </ul>
                    
                    <p><strong>Consejos:</strong></p>
                    <ul>
                        <li>Transformaciones logarítmicas pueden linealizar relaciones no lineales</li>
                        <li>Verifique siempre los residuales para detectar patrones no modelados</li>
                        <li>Para modelos polinomiales, evite sobreajustar con grados muy altos</li>
                    </ul>
                `
            }
        };

        // Variable para rastrear el modelo actual mostrado
        let currentHelpModel = 'exponential';

        // Función para mostrar ayuda del modelo seleccionado
        function showHelpForCurrentModel() {
            const regressionType = document.getElementById('regressionType').value;
            currentHelpModel = regressionType;
            showHelp(regressionType);
        }

        // Función mejorada para mostrar ayuda
        function showHelp(modelType) {
            const modal = document.getElementById('helpModal');
            const help = helpContent[modelType] || helpContent.general;
            
            document.getElementById('helpTitle').textContent = help.title;
            document.getElementById('helpContent').innerHTML = help.content;
            
            // Actualizar estado de los botones de navegación
            updateNavButtons(modelType);
            
            modal.style.display = 'block';
        }

        // Función para actualizar botones de navegación
        function updateNavButtons(currentModel) {
            const models = Object.keys(helpContent);
            const currentIndex = models.indexOf(currentModel);
            
            document.getElementById('prevHelp').disabled = currentIndex <= 0;
            document.getElementById('nextHelp').disabled = currentIndex >= models.length - 1;
            
            // Configurar eventos de navegación
            document.getElementById('prevHelp').onclick = () => {
                showHelp(models[currentIndex - 1]);
            };
            
            document.getElementById('nextHelp').onclick = () => {
                showHelp(models[currentIndex + 1]);
            };
        }

        // Función para cerrar el modal
        function closeHelp() {
            document.getElementById('helpModal').style.display = 'none';
        }

        // Mostrar ayuda cuando cambia el tipo de regresión
        document.getElementById('regressionType').addEventListener('change', function() {
            if (autoHelpEnabled) {  // Puedes hacer esta variable configurable
                showHelpForCurrentModel();
            }
        });

        // Botón de ayuda en la interfaz
        document.getElementById('helpButton').addEventListener('click', showHelpForCurrentModel);

        // Cerrar al hacer clic fuera del modal
        window.addEventListener('click', function(event) {
            const modal = document.getElementById('helpModal');
            if (event.target === modal) {
                closeHelp();
            }
        });

        // Tooltips para métricas
        function initTooltips() {
            const metrics = [
                { 
                    id: 'mseValue', 
                    desc: 'Error Cuadrático Medio (ECM): Mide el promedio de los errores al cuadrado. Un valor más cercano a 0 indica un mejor ajuste del modelo.' 
                },
                { 
                    id: 'maeValue', 
                    desc: 'Error Medio Absoluto (EMA): Representa el promedio de los valores absolutos de los errores. Menos sensible a valores atípicos que el ECM.' 
                },
                { 
                    id: 'r2Value', 
                    desc: 'Coeficiente de Determinación (R²): Indica qué proporción de la varianza es explicada por el modelo. Varía entre 0 y 1, siendo 1 un ajuste perfecto.' 
                },
                { 
                    id: 'seValue', 
                    desc: 'Error Estándar de Regresión: Mide la desviación típica de los residuos (errores). Un valor más pequeño indica un mejor ajuste del modelo.' 
                },
                { 
                    id: 'seeValue', 
                    desc: 'Error Estándar (SEE - Standard Error of Estimate): Mide la dispersión de los puntos de datos alrededor de la línea de regresión.' 
                },
                { 
                    id: 'r2adjValue', 
                    desc: 'R² Ajustado: Versión modificada del R² que penaliza la adición de predictores que no mejoran significativamente el modelo.' 
                },
                { 
                    id: 'aicValue', 
                    desc: 'Criterio de Información de Akaike (AIC): Evalúa la calidad del modelo considerando su complejidad. Valores más bajos indican mejores modelos.' 
                },
                { 
                    id: 'sstValue', 
                    desc: 'Suma de Cuadrados Total (SST): Mide la variabilidad total en los datos antes de ajustar el modelo de regresión.' 
                }
            ];

            metrics.forEach(metric => {
                const element = document.getElementById(metric.id);
                if (element) {
                    // Crear un span para el tooltip
                    const tooltipSpan = document.createElement('span');
                    tooltipSpan.classList.add('metric-tooltip');
                    tooltipSpan.textContent = metric.desc;
                    
                    // Envolver el elemento con un contenedor de tooltip
                    const tooltipContainer = document.createElement('div');
                    tooltipContainer.classList.add('tooltip-container');
                    
                    // Reemplazar el elemento original con el contenedor
                    element.parentNode.insertBefore(tooltipContainer, element);
                    tooltipContainer.appendChild(element);
                    tooltipContainer.appendChild(tooltipSpan);
                }
            });
        }

        document.addEventListener('DOMContentLoaded', initTooltips);

        // Inicializar al cargar la página
        window.onload = function() {
            initTooltips();
            updateFormulaInfo();
        };


function displayIntermediateCalculations(params, type) {
    let calculationsHTML = '';
    let parametersHTML = '';
    let sumX = 0, sumY = 0; // Inicializar variables aquí para que estén disponibles en todos los casos

    switch (type) {
        case 'exponential':
            // Calcular sumas adicionales
            params.calculations.forEach(row => {
                sumX += row.x;
                sumY += row.y;
            });
            const n = params.calculations.length;
            const avgX = sumX / n;
            const avgY = sumY / n;
            const avgLnY = params.totals.sumLnY / n;

            calculationsHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>X</th>
                            <th>Y</th>
                            <th>ln(Y)</th>
                            <th>X²</th>
                            <th>X·ln(Y)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${params.calculations.map(row => `
                            <tr>
                                <td>${row.x.toFixed(4)}</td>
                                <td>${row.y.toFixed(4)}</td>
                                <td>${row.lnY.toFixed(4)}</td>
                                <td>${row.x2.toFixed(4)}</td>
                                <td>${row.xLnY.toFixed(4)}</td>
                            </tr>
                        `).join('')}
                        <tr class="totals-row">
                            <td><strong>ΣX = ${sumX.toFixed(4)}</strong></td>
                            <td><strong>ΣY = ${sumY.toFixed(4)}</strong></td>
                            <td><strong>Σln(Y) = ${params.totals.sumLnY.toFixed(4)}</strong></td>
                            <td><strong>ΣX² = ${params.totals.sumX2.toFixed(4)}</strong></td>
                            <td><strong>ΣX·ln(Y) = ${params.totals.sumXLnY.toFixed(4)}</strong></td>
                        </tr>
                        <tr class="averages-row">
                            <td><strong>X̄ = ${avgX.toFixed(4)}</strong></td>
                            <td><strong>Ȳ = ${avgY.toFixed(4)}</strong></td>
                            <td><strong>ln(Y)̄ = ${avgLnY.toFixed(4)}</strong></td>
                            <td><strong>n = ${n}</strong></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            `;

            parametersHTML = `
                <p>Ecuaciones normales para regresión exponencial (y = ae<sup>bx</sup>):</p>
                <div class="parameter-calculation">
                    n·ln(a) + b·ΣX = Σln(Y)<br>
                    ln(a)·ΣX + b·ΣX² = ΣX·ln(Y)
                </div>
                <p>Resolviendo el sistema:</p>
                <div class="parameter-calculation">
                    Denominador = n·ΣX² - (ΣX)² = ${params.intermediateCalcs.denominator.toFixed(4)}<br>
                    b = [n·ΣX·ln(Y) - ΣX·Σln(Y)] / Denominador = ${params.b.toFixed(4)}<br>
                    ln(a) = [Σln(Y) - b·ΣX] / n = ${params.intermediateCalcs.lnA.toFixed(4)}<br>
                    a = e<sup>ln(a)</sup> = ${params.a.toExponential(4)}
                </div>
            `;
            break;

        case 'power':
            // Calcular sumas adicionales
            params.calculations.forEach(row => {
                sumX += row.x;
                sumY += row.y;
            });
            const nPower = params.calculations.length;
            const avgXPower = sumX / nPower;
            const avgYPower = sumY / nPower;
            const avgLnXPower = params.totals.sumLnX / nPower;
            const avgLnYPower = params.totals.sumLnY / nPower;

            calculationsHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>X</th>
                            <th>Y</th>
                            <th>ln(X)</th>
                            <th>ln(Y)</th>
                            <th>ln(X)²</th>
                            <th>ln(X)·ln(Y)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${params.calculations.map(row => `
                            <tr>
                                <td>${row.x.toFixed(4)}</td>
                                <td>${row.y.toFixed(4)}</td>
                                <td>${row.lnX.toFixed(4)}</td>
                                <td>${row.lnY.toFixed(4)}</td>
                                <td>${row.lnX2.toFixed(4)}</td>
                                <td>${row.lnXLnY.toFixed(4)}</td>
                            </tr>
                        `).join('')}
                        <tr class="totals-row">
                            <td><strong>ΣX = ${sumX.toFixed(4)}</strong></td>
                            <td><strong>ΣY = ${sumY.toFixed(4)}</strong></td>
                            <td><strong>Σln(X) = ${params.totals.sumLnX.toFixed(4)}</strong></td>
                            <td><strong>Σln(Y) = ${params.totals.sumLnY.toFixed(4)}</strong></td>
                            <td><strong>Σln(X)² = ${params.totals.sumLnX2.toFixed(4)}</strong></td>
                            <td><strong>Σln(X)·ln(Y) = ${params.totals.sumLnXLnY.toFixed(4)}</strong></td>
                        </tr>
                        <tr class="averages-row">
                            <td><strong>X̄ = ${avgXPower.toFixed(4)}</strong></td>
                            <td><strong>Ȳ = ${avgYPower.toFixed(4)}</strong></td>
                            <td><strong>ln(X)̄ = ${avgLnXPower.toFixed(4)}</strong></td>
                            <td><strong>ln(Y)̄ = ${avgLnYPower.toFixed(4)}</strong></td>
                            <td><strong>n = ${nPower}</strong></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            `;

            parametersHTML = `
                <p>Ecuaciones normales para regresión potencial (y = ax<sup>b</sup>):</p>
                <div class="parameter-calculation">
                    n·ln(a) + b·Σln(X) = Σln(Y)<br>
                    ln(a)·Σln(X) + b·Σln(X)² = Σln(X)·ln(Y)
                </div>
                <p>Resolviendo el sistema:</p>
                <div class="parameter-calculation">
                    Denominador = n·Σln(X)² - (Σln(X))² = ${params.intermediateCalcs.denominator.toFixed(4)}<br>
                    b = [n·Σln(X)·ln(Y) - Σln(X)·Σln(Y)] / Denominador = ${params.b.toFixed(4)}<br>
                    ln(a) = [Σln(Y) - b·Σln(X)] / n = ${params.intermediateCalcs.lnA.toFixed(4)}<br>
                    a = e<sup>ln(a)</sup> = ${params.a.toExponential(4)}
                </div>
            `;
            break;

        case 'logarithmic':
            // Calcular sumas adicionales
            params.calculations.forEach(row => {
                sumX += row.x;
                sumY += row.y;
            });
            const nLog = params.calculations.length;
            const avgXLog = sumX / nLog;
            const avgYLog = params.totals.sumY / nLog;
            const avgLnXLog = params.totals.sumLnX / nLog;

            calculationsHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>X</th>
                            <th>Y</th>
                            <th>ln(X)</th>
                            <th>ln(X)²</th>
                            <th>ln(X)·Y</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${params.calculations.map(row => `
                            <tr>
                                <td>${row.x.toFixed(4)}</td>
                                <td>${row.y.toFixed(4)}</td>
                                <td>${row.lnX.toFixed(4)}</td>
                                <td>${row.lnX2.toFixed(4)}</td>
                                <td>${row.lnXY.toFixed(4)}</td>
                            </tr>
                        `).join('')}
                        <tr class="totals-row">
                            <td><strong>ΣX = ${sumX.toFixed(4)}</strong></td>
                            <td><strong>ΣY = ${params.totals.sumY.toFixed(4)}</strong></td>
                            <td><strong>Σln(X) = ${params.totals.sumLnX.toFixed(4)}</strong></td>
                            <td><strong>Σln(X)² = ${params.totals.sumLnX2.toFixed(4)}</strong></td>
                            <td><strong>Σln(X)·Y = ${params.totals.sumLnXY.toFixed(4)}</strong></td>
                        </tr>
                        <tr class="averages-row">
                            <td><strong>X̄ = ${avgXLog.toFixed(4)}</strong></td>
                            <td><strong>Ȳ = ${avgYLog.toFixed(4)}</strong></td>
                            <td><strong>ln(X)̄ = ${avgLnXLog.toFixed(4)}</strong></td>
                            <td><strong>n = ${nLog}</strong></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            `;

            parametersHTML = `
                <p>Ecuaciones normales para regresión logarítmica (y = a + b·ln(x)):</p>
                <div class="parameter-calculation">
                    n·a + b·Σln(X) = ΣY<br>
                    a·Σln(X) + b·Σln(X)² = Σln(X)·Y
                </div>
                <p>Resolviendo el sistema:</p>
                <div class="parameter-calculation">
                    Denominador = n·Σln(X)² - (Σln(X))² = ${params.intermediateCalcs.denominator.toFixed(4)}<br>
                    b = [n·Σln(X)·Y - Σln(X)·ΣY] / Denominador = ${params.b.toFixed(4)}<br>
                    a = [ΣY - b·Σln(X)] / n = ${params.a.toFixed(4)}
                </div>
            `;
            break;

        case 'hyperbolic':
            // Calcular sumas adicionales
            params.calculations.forEach(row => {
                sumX += row.x;
                sumY += row.y;
            });
            const nHyp = params.calculations.length;
            const avgXHyp = sumX / nHyp;
            const avgYHyp = params.totals.sumY / nHyp;
            const avgInvXHyp = params.totals.sumInvX / nHyp;

            calculationsHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>X</th>
                            <th>Y</th>
                            <th>1/X</th>
                            <th>(1/X)²</th>
                            <th>(1/X)·Y</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${params.calculations.map(row => `
                            <tr>
                                <td>${row.x.toFixed(4)}</td>
                                <td>${row.y.toFixed(4)}</td>
                                <td>${row.invX.toFixed(4)}</td>
                                <td>${row.invX2.toFixed(4)}</td>
                                <td>${row.invXY.toFixed(4)}</td>
                            </tr>
                        `).join('')}
                        <tr class="totals-row">
                            <td><strong>ΣX = ${sumX.toFixed(4)}</strong></td>
                            <td><strong>ΣY = ${params.totals.sumY.toFixed(4)}</strong></td>
                            <td><strong>Σ(1/X) = ${params.totals.sumInvX.toFixed(4)}</strong></td>
                            <td><strong>Σ(1/X)² = ${params.totals.sumInvX2.toFixed(4)}</strong></td>
                            <td><strong>Σ(1/X)·Y = ${params.totals.sumInvXY.toFixed(4)}</strong></td>
                        </tr>
                        <tr class="averages-row">
                            <td><strong>X̄ = ${avgXHyp.toFixed(4)}</strong></td>
                            <td><strong>Ȳ = ${avgYHyp.toFixed(4)}</strong></td>
                            <td><strong>(1/X)̄ = ${avgInvXHyp.toFixed(4)}</strong></td>
                            <td><strong>n = ${nHyp}</strong></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            `;

            parametersHTML = `
                <p>Ecuaciones normales para regresión hiperbólica (y = a + b/x):</p>
                <div class="parameter-calculation">
                    n·a + b·Σ(1/X) = ΣY<br>
                    a·Σ(1/X) + b·Σ(1/X)² = Σ(1/X)·Y
                </div>
                <p>Resolviendo el sistema:</p>
                <div class="parameter-calculation">
                    Denominador = n·Σ(1/X)² - (Σ(1/X))² = ${params.intermediateCalcs.denominator.toFixed(4)}<br>
                    b = [n·Σ(1/X)·Y - Σ(1/X)·ΣY] / Denominador = ${params.b.toFixed(4)}<br>
                    a = [ΣY - b·Σ(1/X)] / n = ${params.a.toFixed(4)}
                </div>
            `;
            break;
    }

    document.getElementById('calculationsContent').innerHTML = calculationsHTML;
    document.getElementById('parametersContent').innerHTML = parametersHTML;
}

        function drawChart(data, params, type) {
            const ctx = document.getElementById('regressionChart').getContext('2d');
            
            // Ordenar datos por X
            data.sort((a, b) => a.x - b.x);
            
            // Calcular rango extendido (10% más allá de los datos)
            const minX = Math.min(...data.map(p => p.x));
            const maxX = Math.max(...data.map(p => p.x));
            const range = maxX - minX;
            const extendedMin = minX - range * 0.1;
            const extendedMax = maxX + range * 0.1;
            
            // Generar puntos para la curva
            const step = (extendedMax - extendedMin) / 100;
            const regressionPoints = [];
            for (let x = extendedMin; x <= extendedMax; x += step) {
                regressionPoints.push({
                    x: x,
                    y: predictValue(x, params, type)
                });
            }
            
            // Destruir gráfico anterior si existe
            if (regressionChart) {
                regressionChart.destroy();
            }
            
            // Crear nuevo gráfico
            regressionChart = new Chart(ctx, {
                type: 'scatter',
                data: {
                    datasets: [
                        {
                            label: 'Datos Originales',
                            data: data,
                            backgroundColor: 'rgba(75, 192, 192, 1)',
                            pointRadius: 6
                        },
                        {
                            label: 'Curva de Regresión',
                            data: regressionPoints,
                            type: 'line',
                            borderColor: 'rgba(153, 102, 255, 1)',
                            borderWidth: 3,
                            pointRadius: 0,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        x: { title: { display: true, text: 'X' } },
                        y: { title: { display: true, text: 'Y' } }
                    }
                }
            });
        }

        function projectValue() {
            if (!currentParams || !currentType) {
                showError('Primero debe calcular una regresión');
                return;
            }
            
            const xInput = document.getElementById('projectionX').value;
            const x = parseFloat(xInput);
            
            if (isNaN(x)) {
                showError('Ingrese un valor numérico válido para X');
                return;
            }
            
            // Validaciones adicionales según el tipo de regresión
            if (currentType === 'power' && x <= 0) {
                showError('Para regresión potencial, X debe ser positivo');
                return;
            }
            
            if (currentType === 'logarithmic' && x <= 0) {
                showError('Para regresión logarítmica, X debe ser positivo');
                return;
            }
            
            if (currentType === 'hyperbolic' && x === 0) {
                showError('Para regresión hiperbólica, X no puede ser cero');
                return;
            }
            
            const y = predictValue(x, currentParams, currentType);
            
            document.getElementById('projectionOutput').innerHTML = 
                `Para x = ${x.toFixed(4)}, y ≈ ${y.toFixed(4)}`;
            document.getElementById('projectionResult').style.display = 'block';
        }

        const helpCardsContainer = document.getElementById('helpCardsContainer');
        let currentPosition = 0;
        const cardWidth = 320; // Ancho de la tarjeta + gap
        const visibleCards = 3;

        function moveCarousel(direction) {
            const totalCards = helpCardsContainer.children.length;
            const maxScroll = (totalCards - visibleCards) * cardWidth;

            currentPosition += direction * cardWidth;

            // Limitar el desplazamiento
            if (currentPosition < 0) {
                currentPosition = maxScroll;
            } else if (currentPosition > maxScroll) {
                currentPosition = 0;
            }

            helpCardsContainer.style.transform = `translateX(-${currentPosition}px)`;
        }

        function showModelHelp(type) {
            const helpInfo = {
                'exponential': 'Modelo que describe crecimiento o decrecimiento exponencial. Útil para modelar procesos con tasas de cambio proporcionales al valor actual.',
                'power': 'Representa relaciones donde el cambio es proporcional a una potencia de la variable independiente. Común en fenómenos de escala.',
                'logarithmic': 'Describe relaciones donde el cambio es más lento a medida que x aumenta. Típico en procesos de saturación.',
                'polynomial2': 'Modelo cuadrático que permite curvas más complejas con un término de segundo grado. Útil para modelar parábolas.',
                'polynomial3': 'Modelo cúbico que permite representar curvas más complejas con un término de tercer grado. Captura variaciones más sutiles.',
                'hyperbolic': 'Describe una relación inversa entre variables. Común en fenómenos como la resistencia eléctrica o la hipérbole.'
            };

            alert(helpInfo[type]);
        }


        const modelDetails = {
          'exponential': {
              icon: 'bi-graph-up-arrow',
              title: 'Modelo Exponencial',
              equation: 'y = ae^(bx)',
              description: 'Modelo que describe crecimiento o decrecimiento exponencial. Útil para modelar procesos con tasas de cambio proporcionales al valor actual.',
              characteristics: [
                  'Curva siempre creciente o decreciente',
                  'Cambio proporcional al valor actual',
                  'Común en procesos de crecimiento poblacional'
              ],
              applications: [
                  'Crecimiento poblacional',
                  'Inversiones financieras', 
                  'Propagación de enfermedades',
                  'Desintegración radioactiva'
              ]
          },
          'power': {
              icon: 'bi-lightning',
              title: 'Modelo Potencial',
              equation: 'y = ax^b',
              description: 'Representa relaciones donde el cambio es proporcional a una potencia de la variable independiente. Común en fenómenos de escala.',
              characteristics: [
                  'Curva no lineal con exponente variable',
                  'Útil para modelar relaciones de escala',
                  'Sensible al valor del exponente'
              ],
              applications: [
                  'Análisis de escalamiento',
                  'Crecimiento económico',
                  'Distribución de recursos',
                  'Fenómenos biológicos'
              ]
          },
          'logarithmic': {
            icon: 'bi-graph-down',
            title: 'Modelo Logarítmico',
            equation: 'y = a + b * ln(x)',
            description: 'Describe relaciones donde el cambio es más lento a medida que x aumenta. Típico en procesos de saturación.',
            characteristics: [
                'Crecimiento inicial rápido que se desacelera',
                'Útil para modelar procesos con límites',
                'Curva cóncava'
            ],
            applications: [
                'Aprendizaje y curvas de experiencia',
                'Análisis de rendimiento',
                'Modelos de saturación',
                'Estudios de difusión tecnológica'
            ]
        },
        'polynomial2': {
            icon: 'bi-graph-up',
            title: 'Modelo Polinomial Cuadrático',
            equation: 'y = ax² + bx + c',
            description: 'Modelo cuadrático que permite curvas más complejas con un término de segundo grado. Útil para modelar parábolas.',
            characteristics: [
                'Permite cambios no lineales simétricos',
                'Puede representar máximos y mínimos',
                'Flexible para diferentes formas de curva'
            ],
            applications: [
                'Trayectorias de proyectiles',
                'Optimización de procesos',
                'Modelado de fenómenos físicos',
                'Análisis de rendimiento'
            ]
        },
        'polynomial3': {
            icon: 'bi-graph-up',
            title: 'Modelo Polinomial Cúbico',
            equation: 'y = ax³ + bx² + cx + d',
            description: 'Modelo cúbico que permite representar curvas más complejas con un término de tercer grado. Captura variaciones más sutiles.',
            characteristics: [
                'Mayor flexibilidad que modelos cuadráticos',
                'Puede representar inflexiones más complejas',
                'Captura cambios no lineales más detallados'
            ],
            applications: [
                'Modelado de cambios económicos',
                'Análisis de tendencias complejas',
                'Simulaciones de sistemas no lineales',
                'Predicción de comportamientos variables'
            ]
        },
        'hyperbolic': {
            icon: 'bi-slash-lg',
            title: 'Modelo Hiperbólico',
            equation: 'y = a + b/x',
            description: 'Describe una relación inversa entre variables. Común en fenómenos como la resistencia eléctrica o la hipérbole.',
            characteristics: [
                'Asíntota horizontal',
                'Decrecimiento rápido inicial',
                'Comportamiento inverso entre variables'
            ],
            applications: [
                'Análisis de costos marginales',
                'Modelos de aprendizaje',
                'Fenómenos de saturación',
                'Estudios de rendimiento decreciente'
            ]
        }
      };

      function showModelHelp(type) {
          const modal = document.getElementById('helpModal');
          const details = modelDetails[type];

          // Actualizar contenido del modal
          document.getElementById('helpModalIcon').className = `bi ${details.icon}`;
          document.getElementById('helpModalTitle').textContent = details.title;
          document.getElementById('helpModalEquation').textContent = details.equation;
          document.getElementById('helpModalDescription').textContent = details.description;
          
          // Formatear características y aplicaciones
          document.getElementById('helpModalCharacteristics').innerHTML = 
              details.characteristics.map(c => `- ${c}`).join('<br>');
          
          document.getElementById('helpModalApplications').innerHTML = 
              details.applications.map(a => `- ${a}`).join('<br>');

          // Mostrar modal
          modal.classList.add('show');
      }

      function closeHelpModal() {
          const modal = document.getElementById('helpModal');
          modal.classList.remove('show');
      }

      // Cerrar modal al hacer clic fuera
      document.getElementById('helpModal').addEventListener('click', function(event) {
          if (event.target === this) {
              closeHelpModal();
          }
      });
        // Inicialización
        updateFormulaInfo();