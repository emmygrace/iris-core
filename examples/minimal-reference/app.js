// Import iris-core - adjust import path based on your setup
// If using a bundler, you can import from the package:
// import { createApiClient, ChartWheel, convertEphemerisToRender, buildIndexes } from '@gaia-tools/iris-core';

// For this example, we'll assume iris-core is built and available
// You may need to adjust this based on your build setup
import { 
    createApiClient, 
    ChartWheel, 
    convertEphemerisToRender, 
    buildIndexes 
} from '../../dist/index.mjs';

// Configuration
const API_BASE_URL = 'http://localhost:8000/api'; // Adjust to your backend URL

// State
let currentChart = null;

// Initialize API client
const api = createApiClient(API_BASE_URL);

// DOM elements
const form = document.getElementById('chart-form');
const chartContainer = document.getElementById('chart-container');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const renderBtn = document.getElementById('render-btn');

// Form submission handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear previous chart
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }
    
    // Clear error
    hideError();
    
    // Show loading
    showLoading();
    renderBtn.disabled = true;
    
    try {
        // Gather form data
        const birthDate = document.getElementById('birth-date').value;
        const birthTime = document.getElementById('birth-time').value;
        const timezone = document.getElementById('timezone').value;
        const latitude = parseFloat(document.getElementById('latitude').value);
        const longitude = parseFloat(document.getElementById('longitude').value);
        const locationName = document.getElementById('location-name').value || 'Unknown';
        
        const zodiacType = document.getElementById('zodiac-type').value;
        const houseSystem = document.getElementById('house-system').value;
        
        // Get selected objects
        const objectCheckboxes = document.querySelectorAll('input[name="objects"]:checked');
        const includeObjects = Array.from(objectCheckboxes).map(cb => cb.value);
        
        // Build date-time string
        const birthDateTime = `${birthDate}T${birthTime}:00`;
        
        // Build render request
        const renderRequest = {
            subjects: [
                {
                    id: 'subject_1',
                    label: 'Person',
                    birthDateTime: birthDateTime,
                    birthTimezone: timezone,
                    location: {
                        name: locationName,
                        lat: latitude,
                        lon: longitude,
                    },
                },
            ],
            settings: {
                zodiacType: zodiacType,
                houseSystem: houseSystem,
                includeObjects: includeObjects,
            },
            layer_config: {
                natal: {
                    kind: 'natal',
                    subjectId: 'subject_1',
                },
            },
        };
        
        // Fetch ephemeris data
        const ephemerisResponse = await api.render.render(renderRequest);
        
        // Convert to render data
        const renderData = convertEphemerisToRender(ephemerisResponse);
        
        // Build indexes
        const indexes = buildIndexes(renderData);
        
        // Clear container
        chartContainer.innerHTML = '';
        
        // Render chart
        currentChart = new ChartWheel(chartContainer, {
            renderData,
            indexes,
            width: 800,
            height: 800,
            theme: 'traditional',
            onItemClick: (item, ring) => {
                console.log('Item clicked:', item, ring);
            },
            onAspectClick: (aspect) => {
                console.log('Aspect clicked:', aspect);
            },
        });
        
        hideLoading();
        
    } catch (error) {
        console.error('Error rendering chart:', error);
        showError(error.message || 'Failed to render chart. Please check your backend connection and try again.');
        hideLoading();
    } finally {
        renderBtn.disabled = false;
    }
});

// Utility functions
function showLoading() {
    loadingEl.classList.remove('hidden');
    chartContainer.classList.add('hidden');
}

function hideLoading() {
    loadingEl.classList.add('hidden');
    chartContainer.classList.remove('hidden');
}

function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

function hideError() {
    errorEl.classList.add('hidden');
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (currentChart) {
        currentChart.destroy();
    }
});

