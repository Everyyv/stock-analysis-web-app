// API Configuration
const API_KEY = 'ITQZ87XCRNTLS3SW';
const API_BASE_URL = 'https://www.alphavantage.co/query';

const FALLBACK_DATA = {
    "Meta Data": {
        "1. Information": "Daily Prices (open, high, low, close) and Volumes",
        "2. Symbol": "AAPL",
        "3. Last Refreshed": new Date().toISOString().split('T')[0],
        "4. Output Size": "Compact",
        "5. Time Zone": "US/Eastern"
    },
    "Time Series (Daily)": {
        // Generate data for the last 5 trading days (typically 1 week)
        [getPreviousTradingDate(0)]: generateDailyData(185.50),
        [getPreviousTradingDate(1)]: generateDailyData(183.75),
        [getPreviousTradingDate(2)]: generateDailyData(182.25),
        [getPreviousTradingDate(3)]: generateDailyData(184.00),
        [getPreviousTradingDate(4)]: generateDailyData(183.25),
        [getPreviousTradingDate(5)]: generateDailyData(181.80),
        [getPreviousTradingDate(6)]: generateDailyData(180.50)
    }
};


// Helper function to generate realistic daily data
function generateDailyData(basePrice) {
    const open = basePrice;
    const change = (Math.random() - 0.5) * 3; // Random change between -1.5 and +1.5
    const close = parseFloat((basePrice + change).toFixed(2));
    const high = parseFloat((Math.max(open, close) + Math.random() * 1.5).toFixed(2));
    const low = parseFloat((Math.min(open, close) - Math.random() * 1.5).toFixed(2));
    
    return {
        "1. open": open.toFixed(4),
        "2. high": high.toFixed(4),
        "3. low": low.toFixed(4),
        "4. close": close.toFixed(4),
        "5. volume": Math.floor(5000000 + Math.random() * 10000000).toString()
    };
}

// Helper function to get previous trading dates (skips weekends)
function getPreviousTradingDate(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    // Skip weekends (0 = Sunday, 6 = Saturday)
    while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() - 1);
    }
    
    return date.toISOString().split('T')[0];
}

// Global Variables
let currentSymbol = '';
let currentData = [];
let chart = null;
let indicatorsChart = null;
let predictionChart = null;
let drawingMode = null;
let drawnLines = [];
let notes = [];
let watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
let isFirstVisit = localStorage.getItem('isFirstVisit') === null;

// DOM Elements
const themeToggle = document.getElementById('themeToggle');
const stockSearch = document.getElementById('stockSearch');
const searchButton = document.getElementById('searchButton');
const searchResults = document.getElementById('searchResults');
const startDate = document.getElementById('startDate');
const endDate = document.getElementById('endDate');
const applyDateRange = document.getElementById('applyDateRange');
const dashboardCards = document.getElementById('dashboardCards');
const chartTitle = document.getElementById('chartTitle');
const chartType = document.getElementById('chartType');
const downloadChart = document.getElementById('downloadChart');
const drawLineTool = document.getElementById('drawLineTool');
const addNoteTool = document.getElementById('addNoteTool');
const clearDrawings = document.getElementById('clearDrawings');
const mainChart = document.getElementById('mainChart');
const indicatorsChartContainer = document.getElementById('indicatorsChart');
const stockDataTable = document.getElementById('stockDataTable').getElementsByTagName('tbody')[0];
const dataFilter = document.getElementById('dataFilter');
const sortPrice = document.getElementById('sortPrice');
const sortDate = document.getElementById('sortDate');
const predictionDays = document.getElementById('predictionDays');
const predictButton = document.getElementById('predictButton');
const predictionResult = document.getElementById('predictionResult');
const predictionChartContainer = document.getElementById('predictionChart');
const addToWatchlist = document.getElementById('addToWatchlist');
const watchlistContainer = document.getElementById('watchlistContainer');
const tutorialModal = document.getElementById('tutorialModal');
const prevSlide = document.getElementById('prevSlide');
const nextSlide = document.getElementById('nextSlide');
const skipTutorial = document.getElementById('skipTutorial');
const finishTutorial = document.getElementById('finishTutorial');
const tutorialButton = document.getElementById('tutorialButton');
const errorModal = document.getElementById('errorModal');
const errorMessage = document.getElementById('errorMessage');
const closeError = document.querySelector('.close-error');

// Initialize Date Pickers
flatpickr(startDate, {
    dateFormat: 'Y-m-d',
    maxDate: 'today',
    defaultDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
});

flatpickr(endDate, {
    dateFormat: 'Y-m-d',
    maxDate: 'today',
    defaultDate: 'today'
});

// Event Listeners
themeToggle.addEventListener('click', toggleTheme);
searchButton.addEventListener('click', handleSearch);
stockSearch.addEventListener('input', handleSearchInput);
applyDateRange.addEventListener('click', applyDateRangeFilter);
chartType.addEventListener('change', updateChartType);
dataFilter.addEventListener('input', filterTableData);
sortPrice.addEventListener('click', () => sortTableData('price'));
sortDate.addEventListener('click', () => sortTableData('date'));
predictButton.addEventListener('click', generatePrediction);
addToWatchlist.addEventListener('click', addCurrentToWatchlist);
prevSlide.addEventListener('click', showPreviousSlide);
nextSlide.addEventListener('click', showNextSlide);
skipTutorial.addEventListener('click', skipTutorialModal);
tutorialButton.addEventListener('click', showTutorial);
finishTutorial.addEventListener('click', finishTutorialModal);
closeError.addEventListener('click', () => errorModal.style.display = 'none');

const buttons = document.querySelectorAll('.chart-controls button');

document.getElementById('downloadIndicators').addEventListener('click', () => downloadChartImage('indicators'));
document.getElementById('downloadPrediction').addEventListener('click', () => downloadChartImage('prediction'));

buttons.forEach(button => {
    button.addEventListener('click', () => {
        // Handle buttons that don't need active states
        switch(button.id) {
            case 'downloadChart':
                downloadChartImage("main");
                return;
            case 'downloadIndicators':
                downloadChartImage("indicators");
                return;
            case 'downloadPrediction':
                downloadChartImage("prediction");
                return;
            case 'exportCSV':
                exportData('csv');
                return;
            case 'exportJSON':
                exportData('json');
                return;
            case 'clearDrawings':
                clearDrawings();
                return;
        }

       if (button.classList.contains('active')) {
            button.classList.remove('active');
            activateDrawingMode(null); // Deactivate
            return;
        }

        // Deactivate all buttons first
        buttons.forEach(btn => btn.classList.remove('active'));

        // Activate the clicked button
        button.classList.add('active');

        // Activate the correct drawing mode
        if (button.id === 'drawLineTool') {
            activateDrawingMode('line');
        } else if (button.id === 'addNoteTool') {
            activateDrawingMode('note');
        }
    });
});


// Check if it's the first visit and show tutorial
if (isFirstVisit) {
    showTutorial();
    localStorage.setItem('isFirstVisit', 'false');
}

// Theme Toggle Function
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    document.body.classList.toggle('light-theme');
    
    const isDark = document.body.classList.contains('dark-theme');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    
    // Recreate charts with new theme
    if (currentSymbol) {
        createChart();
        createIndicatorsChart();
    }
}

// Search Functions
async function handleSearch() {
    const query = stockSearch.value.trim();
    if (!query) {
        showError('Please enter a stock symbol or company name');
        return;
    }
    
    try {
        const results = await searchSymbol(query);
        if (results.length === 0) {
            showError('No results found for your search');
            return;
        }
        
        if (results.length === 1) {
            // If only one result, select it automatically
            selectSymbol(results[0]);
        } else {
            // Show dropdown with multiple results
            displaySearchResults(results);
        }
    } catch (error) {
        showError('Error searching for symbol: ' + error.message);
    }
}

async function handleSearchInput() {
    const query = stockSearch.value.trim();
    if (query.length > 2) {
        try {
            const results = await searchSymbol(query);
            displaySearchResults(results);
        } catch (error) {
            // Don't show error for search as you type
            searchResults.style.display = 'none';
        }
    } else {
        searchResults.style.display = 'none';
    }
}

function displaySearchResults(results) {
    searchResults.innerHTML = '';
    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
            <strong>${result.symbol}</strong> - ${result.name}
            <div class="exchange">${result.region} (${result.currency})</div>
        `;
        item.addEventListener('click', () => selectSymbol(result));
        searchResults.appendChild(item);
    });
    searchResults.style.display = results.length ? 'block' : 'none';
}

function selectSymbol(symbolData) {
    currentSymbol = symbolData.symbol;
    chartTitle.textContent = `${symbolData.name} (${symbolData.symbol})`;
    stockSearch.value = '';
    searchResults.style.display = 'none';
    
    // Show add to watchlist button
    addToWatchlist.style.display = 'block';
    
    // Load stock data
    loadStockData();
}

async function searchSymbol(query) {
    try {
        const response = await fetch(`https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${query}&apikey=${API_KEY}`);
        const data = await response.json();
        
        if (data.Note || data.Information) {
            console.warn('API limit reached. Using fallback search results.');
            return [
                {
                    symbol: "AAPL",
                    name: "Apple Inc",
                    region: "United States",
                    currency: "USD"
                },
                {
                    symbol: "MSFT",
                    name: "Microsoft Corporation",
                    region: "United States",
                    currency: "USD"
                },
                {
                    symbol: "GOOGL",
                    name: "Alphabet Inc",
                    region: "United States",
                    currency: "USD"
                }
            ];
        }
        
        if (!data.bestMatches) {
            return [];
        }
        
        return data.bestMatches.map(match => ({
            symbol: match['1. symbol'],
            name: match['2. name'],
            region: match['4. region'],
            currency: match['8. currency']
        }));
    } catch (error) {
        throw error;
    }
}

// Stock Data Functions
async function loadStockData() {
    try {
        const fromDate = startDate.value || new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];
        const toDate = endDate.value || new Date().toISOString().split('T')[0];
        
        let data;
        try {
            const response = await fetch(`${API_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${currentSymbol}&outputsize=full&apikey=${API_KEY}`);
            const responseData = await response.json();
            data = JSON.parse(JSON.stringify(responseData)); // Create a deep copy
            
            if (data.Note || data.Information) {
                throw new Error('API rate limit exceeded. Using fallback data.');
            }
        } catch (apiError) {
            console.warn('API Error:', apiError.message);
            showError('API limit reached. Showing sample data for demonstration.');
            data = JSON.parse(JSON.stringify(FALLBACK_DATA)); // Create a deep copy
            data['Meta Data']['2. Symbol'] = currentSymbol; // Now this is safe
        }
        
        if (!data['Time Series (Daily)']) {
            throw new Error('No data available for this symbol');
        }
        
        // Process data
        const rawData = data['Time Series (Daily)'];
        currentData = Object.keys(rawData)
            .filter(date => date >= fromDate && date <= toDate)
            .map(date => {
                const dayData = rawData[date];
                return {
                    date,
                    open: parseFloat(dayData['1. open']),
                    high: parseFloat(dayData['2. high']),
                    low: parseFloat(dayData['3. low']),
                    close: parseFloat(dayData['4. close']),
                    volume: parseInt(dayData['5. volume'])
                };
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        if (currentData.length === 0) {
            throw new Error('No data available for the selected date range');
        }
        
        // Update UI
        updateDashboard();
        createChart();
        createIndicatorsChart();
        updateDataTable();
        
        // Load watchlist to update if this stock is in it
        loadWatchlist();
    } catch (error) {
        showError(error.message);
    }
}

function applyDateRangeFilter() {
    if (!currentSymbol) {
        showError('Please search for a stock first');
        return;
    }
    loadStockData();
}

// Dashboard Functions
function updateDashboard() {
    if (!currentData || currentData.length === 0) return;
    
    const latest = currentData[currentData.length - 1];
    const previous = currentData.length > 1 ? currentData[currentData.length - 2] : latest;
    const change = latest.close - previous.close;
    const changePercent = (change / previous.close) * 100;
    
    dashboardCards.innerHTML = `
        <div class="dashboard-card">
            <h3>Current Price</h3>
            <div class="value">$${latest.close.toFixed(2)}</div>
            <div class="change ${change >= 0 ? 'positive' : 'negative'}">
                ${change >= 0 ? '<i class="fas fa-caret-up"></i>' : '<i class="fas fa-caret-down"></i>'}
                ${Math.abs(change).toFixed(2)} (${Math.abs(changePercent).toFixed(2)}%)
            </div>
        </div>
        <div class="dashboard-card">
            <h3>Today's High</h3>
            <div class="value">$${latest.high.toFixed(2)}</div>
        </div>
        <div class="dashboard-card">
            <h3>Today's Low</h3>
            <div class="value">$${latest.low.toFixed(2)}</div>
        </div>
        <div class="dashboard-card">
            <h3>Volume</h3>
            <div class="value">${latest.volume.toLocaleString()}</div>
        </div>
    `;
}

Chart.register({
    id: 'persistentLineDrawer',
    afterDraw(chart) {
        const ctx = chart.ctx;
        const xScale = chart.scales.x;
        const yScale = chart.scales.y;

        drawnLines.forEach(line => {
            const startX = xScale.getPixelForValue(line.startXValue);
            const startY = yScale.getPixelForValue(line.startYValue);
            const endX = xScale.getPixelForValue(line.endXValue);
            const endY = yScale.getPixelForValue(line.endYValue);

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = line.color;;
            ctx.lineWidth = 2;
            ctx.stroke();

            if (line.label) {
                ctx.font = '12px Arial';
                ctx.fillStyle = line.color;
                const labelX = (startX + endX) / 2;
                const labelY = (startY + endY) / 2 - 5; // place slightly above the line
                ctx.fillText(line.label, labelX, labelY);
            }
        });
    }
});

function isValidColor(color) {
    const s = new Option().style;
    s.color = color;
    return s.color !== '';
}

// Chart Functions
function createChart() {
   if (chart&&typeof chart.destroy === 'function') {
        chart.destroy();
    }
    
    const chartTypeValue = chartType.value;
    const ctx = document.createElement('canvas');
    mainChart.innerHTML = '';
    mainChart.appendChild(ctx);

    const ohlcData = currentData.map(item => ({
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close
    }));
    
    const chartData = {
        labels: currentData.map(item => item.date),
        datasets: []
    };
    
    if (chartTypeValue === 'line') {
        chartData.datasets.push({
            label: 'Closing Price',
            data: currentData.map(item => item.close),
            borderColor: '#4361ee',
            backgroundColor: 'rgba(67, 97, 238, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.1
        });
    } else {
        // Bar chart implementation
        chartData.datasets.push({
            label: 'Daily Prices',
            data: currentData.map(item => item.close),
            backgroundColor: currentData.map(item => 
                item.close >= item.open ? 'rgba(76, 175, 80, 0.7)' : 'rgba(244, 67, 54, 0.7)'
            ),
            borderColor: currentData.map(item => 
                item.close >= item.open ? 'rgba(76, 175, 80, 1)' : 'rgba(244, 67, 54, 1)'
            ),
            borderWidth: 1,
            borderRadius: 4,
            borderSkipped: false
        });
    }
    
    chart = new Chart(ctx, {
        type: chartTypeValue === 'line' ? 'line' : 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 20,
                    right: 20,
                    bottom: 40,  // More space for x-axis labels
                    left: 60     // More space for y-axis labels
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            plugins: {
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: true,
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'xy',
                    },
                    pan: {
                        enabled: true,
                        mode: 'xy',
                        threshold: 10 
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            const data = ohlcData[context.dataIndex];
                            return [
                                `Open: ${data.open.toFixed(2)}`,
                                `High: ${data.high.toFixed(2)}`,
                                `Low: ${data.low.toFixed(2)}`,
                                `Close: ${data.close.toFixed(2)}`
                            ];
                        }
                    }
                },
                annotation: {
                    annotations: notes.map((note, index) => ({
                        type: 'label',
                        xValue: note.date,
                        yValue: note.price,
                        content: note.text,
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        borderColor: '#333',
                        borderWidth: 1,
                        borderRadius: 4,
                        callout: {
                            display: true,
                            side: note.side || 'top'
                        }
                    }))
                }
            },
            
            onClick: (e) => {
                if (drawingMode === 'note') {
                    const canvasPosition = Chart.helpers.getRelativePosition(e, chart);
                    const dataX = chart.scales.x.getValueForPixel(canvasPosition.x);
                    const dataY = chart.scales.y.getValueForPixel(canvasPosition.y);
                    
                    const dateIndex = Math.round(dataX);
                    if (dateIndex >= 0 && dateIndex < currentData.length) {
                        const date = currentData[dateIndex].date;
                        const price = dataY;
                        
                        const noteText = prompt('Enter your note:');
                        if (noteText) {
                            notes.push({
                                date,
                                price,
                                text: noteText,
                                side: price > currentData[dateIndex].close ? 'bottom' : 'top'
                            });
                            createChart();
                        }
                    }
                }
            }
        }
    });
    
    if (drawingMode === 'line') {
        let startXValue, startYValue;

        ctx.onmousedown = (e) => {
            const rect = ctx.getBoundingClientRect();
            const pixelX = e.clientX - rect.left;
            const pixelY = e.clientY - rect.top;

            startXValue = chart.scales.x.getValueForPixel(pixelX);
            startYValue = chart.scales.y.getValueForPixel(pixelY);
        };

        ctx.onmouseup = (e) => {
            if (startXValue === undefined || startYValue === undefined) return;

            const rect = ctx.getBoundingClientRect();
            const pixelX = e.clientX - rect.left;
            const pixelY = e.clientY - rect.top;

            const endXValue = chart.scales.x.getValueForPixel(pixelX);
            const endYValue = chart.scales.y.getValueForPixel(pixelY);

            const label = prompt('Enter a label for this trendline (e.g., "Support", "Resistance")');
            if (label === null) {
                // User clicked cancel → stop the process
                startXValue = startYValue = undefined;
                return;
            }
            let color = prompt('Enter color for this line (e.g., "red", "#00FF00")', '#FF0000');
            
            while (!isValidColor(color)) {
                alert('Invalid color! Please enter a valid CSS color.');
                color = prompt('Enter color for this line (e.g., "red", "#00FF00")', '#FF0000');
            }

            drawnLines.push({
                startXValue,
                startYValue,
                endXValue,
                endYValue,
                label: label || '',
                color: color || '#FF0000'
            });

            startXValue = startYValue = undefined;

            createChart(); // Redraw with the new line
        };

    } else {
        ctx.onmousedown = ctx.onmousemove = ctx.onmouseup = null;
    }
}

function updateChartType() {
    if (currentSymbol) {
        createChart();
    }
}

function createIndicatorsChart() {
    // Destroy previous chart if it exists
    if (indicatorsChart) {
        indicatorsChart.destroy();
    }
    
    const ctx = document.createElement('canvas');
    indicatorsChartContainer.innerHTML = '';
    indicatorsChartContainer.appendChild(ctx);
    
    // Calculate indicators
    const sma20 = calculateSMA(20);
    const sma50 = calculateSMA(50);
    const rsi = calculateRSI();
    const macd = calculateMACD();
    const volumeData = currentData.map(item => item.volume);
    
    indicatorsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: currentData.map(item => item.date),
            datasets: [
                {
                    label: 'Volume',
                    data: volumeData,
                    backgroundColor: currentData.map((item, i) => 
                        i > 0 && item.close > currentData[i-1].close ? 'rgba(31, 75, 32, 0.7)' : 'rgba(244, 67, 54, 0.7)'
                    ),
                    yAxisID: 'y-volume',
                    order: 3
                },
                {
                    label: 'RSI (14)',
                    data: rsi,
                    borderColor: '#9c27b0',
                    backgroundColor: 'rgba(156, 39, 176, 0.1)',
                    borderWidth: 2,
                    yAxisID: 'y-rsi',
                    order: 2
                },
                {
                    label: 'MACD',
                    data: macd.line,
                    borderColor: '#2196f3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    borderWidth: 2,
                    yAxisID: 'y-macd',
                    order: 1
                },
                {
                    label: 'Signal',
                    data: macd.signal,
                    borderColor: '#ff9800',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    borderWidth: 2,
                    yAxisID: 'y-macd',
                    order: 1
                },
                {
                    label: 'Histogram',
                    data: macd.histogram,
                    type: 'bar',
                    backgroundColor: macd.histogram.map(val => 
                        val >= 0 ? 'rgba(76, 175, 80, 0.7)' : 'rgba(244, 67, 54, 0.7)'
                    ),
                    yAxisID: 'y-macd',
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    display: false
                },
                'y-volume': {
                    type: 'linear',
                    display: 'auto',
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    }
                },
                'y-rsi': {
                    type: 'linear',
                    display: 'auto',
                    position: 'left',
                    min: 0,
                    max: 100,
                    grid: {
                        drawOnChartArea: false
                    }
                },
                'y-macd': {
                    type: 'linear',
                    display: 'auto',
                    position: 'left',
                    grid: {
                        drawOnChartArea: false
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            }
        }
    });
}

function calculateSMA(period) {
    const sma = [];
    for (let i = period - 1; i < currentData.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += currentData[i - j].close;
        }
        sma.push(sum / period);
    }
    
    // Pad beginning with nulls
    return Array(period - 1).fill(null).concat(sma);
}

function calculateRSI(period = 14) {
    if (currentData.length < period + 1) {
        return Array(currentData.length).fill(null);
    }
    
    const gains = [];
    const losses = [];
    
    // Calculate initial average gains and losses
    let avgGain = 0;
    let avgLoss = 0;
    
    for (let i = 1; i <= period; i++) {
        const change = currentData[i].close - currentData[i - 1].close;
        if (change > 0) {
            avgGain += change;
        } else {
            avgLoss += Math.abs(change);
        }
    }
    
    avgGain /= period;
    avgLoss /= period;
    
    const rsi = Array(period).fill(null);
    rsi.push(100 - (100 / (1 + (avgLoss === 0 ? Infinity : avgGain / avgLoss))));
    
    // Calculate subsequent RSI values
    for (let i = period + 1; i < currentData.length; i++) {
        const change = currentData[i].close - currentData[i - 1].close;
        let currentGain = 0;
        let currentLoss = 0;
        
        if (change > 0) {
            currentGain = change;
        } else {
            currentLoss = Math.abs(change);
        }
        
        avgGain = (avgGain * (period - 1) + currentGain) / period;
        avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
        
        const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
    }
    
    return rsi;
}

function calculateMACD(fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (currentData.length < slowPeriod + signalPeriod) {
        return {
            line: Array(currentData.length).fill(null),
            signal: Array(currentData.length).fill(null),
            histogram: Array(currentData.length).fill(null)
        };
    }
    
    // Calculate EMA for fast and slow periods
    const fastEMA = calculateEMA(fastPeriod);
    const slowEMA = calculateEMA(slowPeriod);
    
    // Calculate MACD line (fast EMA - slow EMA)
    const macdLine = fastEMA.map((fast, i) => fast !== null && slowEMA[i] !== null ? fast - slowEMA[i] : null);
    
    // Calculate Signal line (EMA of MACD line)
    const signalLine = calculateEMA(signalPeriod, macdLine.slice(slowPeriod - fastPeriod));
    
    // Pad signal line with nulls
    const paddedSignalLine = Array(slowPeriod + signalPeriod - 1).fill(null).concat(signalLine.slice(signalPeriod - 1));
    
    // Calculate Histogram (MACD line - Signal line)
    const histogram = macdLine.map((macd, i) => 
        macd !== null && paddedSignalLine[i] !== null ? macd - paddedSignalLine[i] : null
    );
    
    return {
        line: macdLine,
        signal: paddedSignalLine,
        histogram
    };
}

function calculateEMA(period, data = currentData.map(item => item.close)) {
    const k = 2 / (period + 1);
    const ema = [];
    
    // Calculate SMA for first value
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += data[i];
    }
    ema[period - 1] = sum / period;
    
    // Calculate subsequent EMA values
    for (let i = period; i < data.length; i++) {
        ema[i] = data[i] * k + ema[i - 1] * (1 - k);
    }
    
    // Pad beginning with nulls
    return Array(period - 1).fill(null).concat(ema.slice(period - 1));
}

// Export CSV
document.getElementById('exportCSV').addEventListener('click', () => {
  if (!currentData.length) {
    showError('No data to export');
    return;
  }

  const headers = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume'];
  const csvRows = [
    headers.join(','),
    ...currentData.map(item => 
      `${item.date},${item.open},${item.high},${item.low},${item.close},${item.volume}`
    )
  ];

  const csvContent = csvRows.join('\n');
  downloadFile(`${currentSymbol}_data.csv`, csvContent);
});

// Export JSON
document.getElementById('exportJSON').addEventListener('click', () => {
  if (!currentData.length) {
    showError('No data to export');
    return;
  }

  const jsonContent = JSON.stringify(currentData, null, 2);
  downloadFile(`${currentSymbol}_data.json`, jsonContent);
});

// Generic download helper
function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Data Table Functions
function updateDataTable() {
    stockDataTable.innerHTML = '';
    
    currentData.forEach(item => {
        const row = document.createElement('tr');
        const prevClose = currentData[currentData.indexOf(item) - 1]?.close || item.open;
        const change = item.close - prevClose;
        const percentChange = (change / prevClose) * 100;
        row.innerHTML = `
            <td>${item.date}</td>
            <td>${item.open.toFixed(2)}</td>
            <td>${item.high.toFixed(2)}</td>
            <td>${item.low.toFixed(2)}</td>
            <td class="${change >= 0 ? 'positive' : 'negative'}">${item.close.toFixed(2)}</td>
            <td>${item.volume.toLocaleString()}</td>
            <td><button class="view-chart" data-date="${item.date}" title="View Chart">
                <i class="fas fa-chart-line"></i>
            </button></td>
        `;
        stockDataTable.appendChild(row);
    });
    
    document.querySelectorAll('.view-chart').forEach(button => {
        button.addEventListener('click', (e) => {
            const targetButton = e.target.closest('button'); // Always get the button
            if (!targetButton) return; // In case it clicks outside

            const date = targetButton.getAttribute('data-date');
            zoomToDate(date);
        });
    });
}

function filterTableData() {
    const filter = dataFilter.value.toLowerCase();
    const rows = stockDataTable.getElementsByTagName('tr');
    
    for (let row of rows) {
        const cells = row.getElementsByTagName('td');
        let shouldShow = false;
        
        for (let cell of cells) {
            if (cell.textContent.toLowerCase().includes(filter)) {
                shouldShow = true;
                break;
            }
        }
        
        row.style.display = shouldShow ? '' : 'none';
    }
}

function sortTableData(type) {
    const rows = Array.from(stockDataTable.getElementsByTagName('tr'));
    
    rows.sort((a, b) => {
        const aValue = type === 'date' ? 
            new Date(a.cells[0].textContent) : 
            parseFloat(a.cells[4].textContent);
        
        const bValue = type === 'date' ? 
            new Date(b.cells[0].textContent) : 
            parseFloat(b.cells[4].textContent);
        
        return type === 'date' ? aValue - bValue : bValue - aValue;
    });
    
    // Re-append sorted rows
    rows.forEach(row => stockDataTable.appendChild(row));
}

function zoomToDate(date) {
    if (!chart) return;

    const index = currentData.findIndex(item => item.date === date);
    if (index === -1) return;

    const minIndex = Math.max(0, index - 5);
    const maxIndex = Math.min(currentData.length - 1, index + 5);

    // Set the min and max on the x-axis scale
    chart.options.scales.x.min = currentData[minIndex].date;
    chart.options.scales.x.max = currentData[maxIndex].date;

    chart.update();
}

// Prediction Functions
function generatePrediction() {
    if (!currentData || currentData.length < 10) {
        showError('Not enough data to generate prediction');
        return;
    }
    
    const days = parseInt(predictionDays.value) || 7;
    if (days < 1 || days > 30) {
        showError('Please enter a number between 1 and 30');
        return;
    }
    
    // Simple linear regression prediction
    const x = currentData.map((_, i) => i);
    const y = currentData.map(item => item.close);
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, val, i) => a + val * y[i], 0);
    const sumXX = x.reduce((a, b) => a + b * b, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Generate predictions
    const predictions = [];
    const lastDate = new Date(currentData[currentData.length - 1].date);
    
    for (let i = 1; i <= days; i++) {
        const nextDay = new Date(lastDate);
        nextDay.setDate(lastDate.getDate() + i);
        
        // Skip weekends
        while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
            nextDay.setDate(nextDay.getDate() + 1);
        }
        
        const prediction = slope * (n + i - 1) + intercept;
        predictions.push({
            date: nextDay.toISOString().split('T')[0],
            value: prediction
        });
    }
    
    // Display prediction
    const lastClose = currentData[currentData.length - 1].close;
    const predictedChange = predictions[0].value - lastClose;
    const predictedChangePercent = (predictedChange / lastClose) * 100;
    
    predictionResult.innerHTML = `
        <p>Current Price: $${lastClose.toFixed(2)}</p>
        <p>Predicted Price in ${days} day(s): $${predictions[0].value.toFixed(2)}</p>
        <p class="${predictedChange >= 0 ? 'positive' : 'negative'}">
            ${predictedChange >= 0 ? '<i class="fas fa-caret-up"></i>' : '<i class="fas fa-caret-down"></i>'}
            ${Math.abs(predictedChange).toFixed(2)} (${Math.abs(predictedChangePercent).toFixed(2)}%)
        </p>
    `;
    
    // Create prediction chart
    createPredictionChart(predictions);
}

function createPredictionChart(predictions) {
    // Destroy previous chart if it exists
    if (predictionChart) {
        predictionChart.destroy();
    }
    
    const ctx = document.createElement('canvas');
    predictionChartContainer.innerHTML = '';
    predictionChartContainer.appendChild(ctx);
    
    // Combine historical data with predictions
    const historicalLabels = currentData.map(item => item.date);
    const historicalData = currentData.map(item => item.close);
    
    const predictionLabels = predictions.map(item => item.date);
    const predictionData = predictions.map(item => item.value);
    
    const allLabels = [...historicalLabels, ...predictionLabels];
    const allData = [...historicalData, ...predictionData];
    
    // Create dashed border for predictions
    const borderDash = Array(historicalData.length).fill(false).concat(Array(predictionData.length).fill(true));
    
    predictionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: allLabels,
            datasets: [{
                label: 'Historical Prices',
                data: historicalData,
                borderColor: '#4361ee',
                backgroundColor: 'rgba(67, 97, 238, 0.1)',
                borderWidth: 2,
                fill: false
            }, {
                label: 'Predicted Prices',
                data: [...Array(historicalData.length).fill(null), ...predictionData],
                borderColor: '#4caf50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    beginAtZero: false
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            }
        }
    });
}

// Watchlist Functions
function loadWatchlist() {
    watchlistContainer.innerHTML = '';
    
    if (watchlist.length === 0) {
        watchlistContainer.innerHTML = '<p class="empty-watchlist">Your watchlist is empty. Add stocks to monitor them here.</p>';
        return;
    }
    
    // Check if current stock is in watchlist
    const isInWatchlist = watchlist.some(item => item.symbol === currentSymbol);
    addToWatchlist.style.display = isInWatchlist ? 'none' : 'block';
    
    // Load all watchlist items
    watchlist.forEach((item, index) => {
        const watchlistItem = document.createElement('div');
        watchlistItem.className = 'watchlist-item';
        
        // Default values in case API call fails
        let price = 'Loading...';
        let change = 'Loading...';
        let changeClass = '';
        
        // Fetch current price for each watchlist item
        fetchStockQuote(item.symbol)
            .then(quote => {
                if (quote) {
                    const changeAmount = quote.price - quote.previousClose;
                    const changePercent = (changeAmount / quote.previousClose) * 100;
                    
                    price = `$${quote.price.toFixed(2)}`;
                    change = `${changeAmount >= 0 ? '+' : ''}${changeAmount.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`;
                    changeClass = changeAmount >= 0 ? 'positive' : 'negative';
                    
                    // Update the watchlist item
                    watchlistItem.querySelector('.price').textContent = price;
                    watchlistItem.querySelector('.change').innerHTML = `
                        ${changeAmount >= 0 ? '<i class="fas fa-caret-up"></i>' : '<i class="fas fa-caret-down"></i>'}
                        ${change}
                    `;
                    watchlistItem.querySelector('.change').className = `change ${changeClass}`;
                }
            })
            .catch(error => {
                console.error('Error fetching watchlist quote:', error);
            });
        
        watchlistItem.innerHTML = `
            <button class="remove" data-index="${index}">&times;</button>
            <h3>${item.name}</h3>
            <div class="symbol">${item.symbol}</div>
            <div class="price">${price}</div>
            <div class="change ${changeClass}">
                <i class="fas fa-caret-up"></i>
                ${change}
            </div>
        `;
        
        // Add click event to load the stock
        watchlistItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('remove')) {
                selectSymbol({ symbol: item.symbol, name: item.name });
            }
        });
        
        // Add remove button event
        watchlistItem.querySelector('.remove').addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromWatchlist(index);
        });
        
        watchlistContainer.appendChild(watchlistItem);
    });
}

async function fetchStockQuote(symbol) {
    try {
        const response = await fetch(`${API_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`);
        const data = await response.json();
        
        if (data.Note || data.Information) {
            console.warn('API limit reached. Using fallback quote data.');
            return {
                symbol: symbol,
                price: 186.84,  // Sample price
                previousClose: 184.92  // Sample previous close
            };
        }
        
        if (!data['Global Quote']) {
            throw new Error('No quote data available');
        }
        
        const quote = data['Global Quote'];
        return {
            symbol: quote['01. symbol'],
            price: parseFloat(quote['05. price']),
            previousClose: parseFloat(quote['08. previous close'])
        };
    } catch (error) {
        console.error('Error fetching stock quote:', error);
        return null;
    }
}

function addCurrentToWatchlist() {
    if (!currentSymbol || !chartTitle.textContent) return;
    
    // Extract name from chart title (format: "Name (SYMBOL)")
    const name = chartTitle.textContent.split(' (')[0];
    
    // Check if already in watchlist
    if (watchlist.some(item => item.symbol === currentSymbol)) {
        showError('This stock is already in your watchlist');
        return;
    }
    
    // Add to watchlist
    watchlist.push({ symbol: currentSymbol, name });
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    
    // Update UI
    addToWatchlist.style.display = 'none';
    loadWatchlist();
}

function removeFromWatchlist(index) {
    watchlist.splice(index, 1);
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    loadWatchlist();
}

// Drawing Tools
function activateDrawingMode(mode) {
    drawingMode = mode;
    
    // Update button styles
    drawLineTool.classList.toggle('active', mode === 'line');
    addNoteTool.classList.toggle('active', mode === 'note');
    
    if (mode === null) {
        drawLineTool.classList.remove('active');
        addNoteTool.classList.remove('active');
    }
    
    // Recreate chart to apply new drawing mode
    if (currentSymbol) {
        createChart();
    }
}

function clearAllDrawings() {
    drawnLines = [];
    notes = [];
    drawingMode = null;
    drawLineTool.classList.remove('active');
    addNoteTool.classList.remove('active');
    
    if (currentSymbol) {
        createChart();
    }
}

// Download Chart
// Update the downloadChart function
function downloadChartImage(chartType) {
  let canvas, filename;
  
  if (chartType === 'main' && chart) {
    canvas = document.querySelector('#mainChart canvas');
    filename = `${currentSymbol}_price_chart.png`;
  } 
  else if (chartType === 'indicators' && indicatorsChart) {
    canvas = document.querySelector('#indicatorsChart canvas');
    filename = `${currentSymbol}_indicators_chart.png`;
  }
  else if (chartType === 'prediction' && predictionChart) {
    canvas = document.querySelector('#predictionChart canvas');
    filename = `${currentSymbol}_prediction_chart.png`;
  }
  else {
    showError('No chart available to download');
    return;
  }

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}


let currentSlide = 1;
const totalSlides = 6; // Update this to match your total number of slides

// Tutorial Functions
function showTutorial() {
    currentSlide = 1;
    updateSlideVisibility();
    tutorialModal.style.display = 'flex';
    prevSlide.disabled = true;
    nextSlide.disabled = false;
    finishTutorial.style.display = 'none';
    skipTutorial.style.display = 'block';
}

function showNextSlide() {
    if (currentSlide < totalSlides) {
        currentSlide++;
        updateSlideVisibility();
        prevSlide.disabled = false;
        
        // Show Finish button on last slide, hide Next button
        if (currentSlide === totalSlides) {
            nextSlide.disabled = true;
            finishTutorial.style.display = 'block';
            skipTutorial.style.display = 'none';
        } else {
            finishTutorial.style.display = 'none';
            skipTutorial.style.display = 'block';
        }
    }
}

function showPreviousSlide() {
    if (currentSlide > 1) {
        currentSlide--;
        updateSlideVisibility();
        nextSlide.disabled = false;
        finishTutorial.style.display = 'none';
        skipTutorial.style.display = 'block';
        
        if (currentSlide === 1) {
            prevSlide.disabled = true;
        }
    }
}

function skipTutorialModal() {
    tutorialModal.style.display = 'none';
}

// Add this new function to handle the Finish button
function finishTutorialModal() {
    tutorialModal.style.display = 'none';
    // You can add any additional completion logic here
    // For example, track that user completed the tutorial
    localStorage.setItem('tutorialCompleted', 'true');
}

// Update the slide visibility function
function updateSlideVisibility() {
    // Hide all slides
    document.querySelectorAll('.tutorial-slide').forEach(slide => {
        slide.classList.remove('active');
    });
    
    // Show current slide
    const currentSlideElement = document.querySelector(`.tutorial-slide[data-slide="${currentSlide}"]`);
    if (currentSlideElement) {
        currentSlideElement.classList.add('active');
    }
}

// Error Handling
function showError(message) {
   if (message.includes('API rate limit exceeded') || message.includes('API limit reached')) {
        errorMessage.innerHTML = `
            ${message}<br><br>
            <small>Note: You're seeing sample data. The API allows 25 requests per day. 
            For full functionality, please try again later or use a different API key.</small>
        `;
    } else {
        errorMessage.textContent = message;
    }
    errorModal.style.display = 'flex';
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === tutorialModal) {
        tutorialModal.style.display = 'none';
    }
    if (e.target === errorModal) {
        errorModal.style.display = 'none';
    }
});

// Initialize watchlist
loadWatchlist();