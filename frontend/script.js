// Configuration
const API_URL = 'https://data-viz-app-6vrz.onrender.com';
// Global variables
let selectedFile = null;
let chartInstances = {};

// File input handler
document.getElementById('fileInput').addEventListener('change', function(e) {
    selectedFile = e.target.files[0];
    if (selectedFile) {
        document.getElementById('fileName').textContent = `Selected: ${selectedFile.name}`;
        document.getElementById('analyzeBtn').style.display = 'inline-block';
    }
});

// Analyze button handler
document.getElementById('analyzeBtn').addEventListener('click', uploadAndAnalyze);

// Upload and analyze function
async function uploadAndAnalyze() {
    if (!selectedFile) {
        alert('Please select a file first');
        return;
    }

    // Show loading, hide upload section
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('loading').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
        const response = await fetch(`${API_URL}/api/upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            displayDashboard(result.data);
        } else {
            throw new Error(result.error || 'Analysis failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`Error: ${error.message}`);
        resetDashboard();
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// Display dashboard with data
function displayDashboard(data) {
    // Show dashboard
    document.getElementById('dashboard').style.display = 'block';

    // Display KPIs
    displayKPIs(data.kpis);

    // Display Summary
    displaySummary(data.summary);

    // Display Insights
    displayInsights(data.insights);

    // Display Charts
    displayCharts(data.charts_data);

    // Display Data Preview
    displayDataPreview(data.preview, data.summary.columns);

    // Scroll to dashboard
    document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
}

// Display KPIs
function displayKPIs(kpis) {
    const kpiGrid = document.getElementById('kpiGrid');
    kpiGrid.innerHTML = '';

    const kpiEntries = Object.entries(kpis).slice(0, 8); // Show max 8 KPIs

    kpiEntries.forEach(([key, value]) => {
        const kpiCard = document.createElement('div');
        kpiCard.className = 'kpi-card';
        
        const label = key.replace(/_/g, ' ').toUpperCase();
        const formattedValue = typeof value === 'number' ? value.toLocaleString(undefined, {maximumFractionDigits: 2}) : value;

        kpiCard.innerHTML = `
            <div class="kpi-label">${label}</div>
            <div class="kpi-value">${formattedValue}</div>
        `;
        
        kpiGrid.appendChild(kpiCard);
    });
}

// Display Summary
function displaySummary(summary) {
    const summaryCards = document.getElementById('summaryCards');
    summaryCards.innerHTML = '';

    const summaryData = [
        { label: 'Total Rows', value: summary.total_rows },
        { label: 'Total Columns', value: summary.total_columns },
        { label: 'Missing Values', value: Object.values(summary.missing_values).reduce((a, b) => a + b, 0) }
    ];

    summaryData.forEach(item => {
        const card = document.createElement('div');
        card.className = 'summary-card';
        card.innerHTML = `
            <h3>${item.label}</h3>
            <p>${item.value.toLocaleString()}</p>
        `;
        summaryCards.appendChild(card);
    });
}

// Display Insights
function displayInsights(insights) {
    const insightsList = document.getElementById('insightsList');
    insightsList.innerHTML = '';

    insights.forEach(insight => {
        const insightItem = document.createElement('div');
        insightItem.className = 'insight-item';
        insightItem.textContent = insight;
        insightsList.appendChild(insightItem);
    });
}

// Display Charts
function displayCharts(chartsData) {
    // Destroy existing charts
    Object.values(chartInstances).forEach(chart => chart.destroy());
    chartInstances = {};

    // Bar Chart
    if (chartsData.bar_chart) {
        document.getElementById('barChartTitle').textContent = chartsData.bar_chart.title;
        const ctx = document.getElementById('barChart').getContext('2d');
        chartInstances.barChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartsData.bar_chart.labels,
                datasets: [{
                    label: 'Count',
                    data: chartsData.bar_chart.values,
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Line Chart
    if (chartsData.line_chart) {
        document.getElementById('lineChartTitle').textContent = chartsData.line_chart.title;
        const ctx = document.getElementById('lineChart').getContext('2d');
        chartInstances.lineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartsData.line_chart.labels,
                datasets: [{
                    label: 'Value',
                    data: chartsData.line_chart.values,
                    backgroundColor: 'rgba(118, 75, 162, 0.2)',
                    borderColor: 'rgba(118, 75, 162, 1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }

    // Pie Chart
    if (chartsData.pie_chart) {
        document.getElementById('pieChartTitle').textContent = chartsData.pie_chart.title;
        const ctx = document.getElementById('pieChart').getContext('2d');
        chartInstances.pieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: chartsData.pie_chart.labels,
                datasets: [{
                    data: chartsData.pie_chart.values,
                    backgroundColor: [
                        'rgba(102, 126, 234, 0.8)',
                        'rgba(118, 75, 162, 0.8)',
                        'rgba(237, 100, 166, 0.8)',
                        'rgba(255, 154, 158, 0.8)',
                        'rgba(250, 208, 196, 0.8)'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Multi Bar Chart
    if (chartsData.multi_bar_chart) {
        const ctx = document.getElementById('multiBarChart').getContext('2d');
        const colors = [
            'rgba(102, 126, 234, 0.8)',
            'rgba(118, 75, 162, 0.8)',
            'rgba(237, 100, 166, 0.8)'
        ];

        const datasets = chartsData.multi_bar_chart.datasets.map((dataset, index) => ({
            label: dataset.label,
            data: dataset.data,
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length].replace('0.8', '1'),
            borderWidth: 1
        }));

        chartInstances.multiBarChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartsData.multi_bar_chart.labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Display Data Preview
function displayDataPreview(previewData, columns) {
    const tableContainer = document.getElementById('tableContainer');
    
    if (!previewData || previewData.length === 0) {
        tableContainer.innerHTML = '<p>No preview data available</p>';
        return;
    }

    let tableHTML = '<table><thead><tr>';
    
    // Table headers
    columns.forEach(col => {
        tableHTML += `<th>${col}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    // Table rows
    previewData.forEach(row => {
        tableHTML += '<tr>';
        columns.forEach(col => {
            const value = row[col] !== null && row[col] !== undefined ? row[col] : '-';
            tableHTML += `<td>${value}</td>`;
        });
        tableHTML += '</tr>';
    });

    tableHTML += '</tbody></table>';
    tableContainer.innerHTML = tableHTML;
}

// Reset dashboard
function resetDashboard() {
    selectedFile = null;
    document.getElementById('fileName').textContent = '';
    document.getElementById('analyzeBtn').style.display = 'none';
    document.getElementById('fileInput').value = '';
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
    
    // Destroy charts
    Object.values(chartInstances).forEach(chart => chart.destroy());
    chartInstances = {};

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Check API health on load
window.addEventListener('load', async () => {
    try {
        const response = await fetch(`${API_URL}/api/health`);
        const result = await response.json();
        console.log('API Status:', result);
    } catch (error) {
        console.error('API Connection Error:', error);
        alert('Warning: Cannot connect to backend API. Please make sure the backend server is running.');
    }
})