// DOM Elements
const userCountryElement = document.getElementById('userCountry');
const userIPElement = document.getElementById('userIP');
const salaryInput = document.getElementById('salary');
const targetCountrySelect = document.getElementById('targetCountry');
const calculateBtn = document.getElementById('calculateBtn');
const resultSection = document.getElementById('resultSection');
const equivalentSalaryElement = document.getElementById('equivalentSalary');
const pppRateElement = document.getElementById('pppRate');
const purchasingPowerElement = document.getElementById('purchasingPower');
const errorContainer = document.getElementById('errorContainer');
const themeToggle = document.querySelector('.theme-toggle');

// State
let isLoading = false;
let currentTheme = localStorage.getItem('theme') || 'light';
let pppData = {};
let userCountry = '';

// Theme Management
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    themeToggle.innerHTML = theme === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    document.body.style.backgroundColor = theme === 'light' ? '#f8fafc' : '#0f172a';
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    errorContainer.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.opacity = '0';
        setTimeout(() => errorDiv.remove(), 300);
    }, 5000);
}

// Show loading state
function setLoading(loading) {
    isLoading = loading;
    calculateBtn.disabled = loading;
    calculateBtn.innerHTML = loading 
        ? '<i class="fas fa-spinner fa-spin"></i> Calculating...' 
        : '<i class="fas fa-calculator"></i> Calculate PPP';
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Fetch PPP data from IMF API
async function fetchPPPData() {
    try {
        setLoading(true);
        // Using IMF's PPPEX endpoint for implied PPP conversion rates
        const response = await fetch('https://www.imf.org/external/datamapper/api/v1/indicators/PPPEX');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Process IMF data
        pppData = {};
        let validDataCount = 0;
        
        // IMF data is organized by country codes
        Object.entries(data.values).forEach(([countryCode, values]) => {
            // Get the most recent year's data
            const years = Object.keys(values).sort().reverse();
            if (years.length > 0) {
                const latestValue = values[years[0]];
                if (latestValue && !isNaN(latestValue) && latestValue > 0) {
                    // Convert country code to country name
                    const countryName = data.metadata.country[countryCode];
                    if (countryName) {
                        // Convert to relative PPP (using US as base)
                        // Lower PPPEX means higher purchasing power
                        pppData[countryName] = 1 / latestValue;
                        validDataCount++;
                    }
                }
            }
        });

        // Check if we got enough valid data
        if (validDataCount < 5) {
            throw new Error('Insufficient PPP data received from IMF');
        }

        console.log(`Successfully loaded PPP data for ${validDataCount} countries from IMF`);
        populateCountries();
        
    } catch (error) {
        console.error('Error fetching PPP data:', error);
        showError('Failed to fetch real-time PPP data. Using fallback data.');
        
        // Fallback to static data with more countries
        pppData = {
            'India': 0.3,
            'Switzerland': 0.8,
            'United States': 1.0,
            'United Kingdom': 0.7,
            'Germany': 0.75,
            'France': 0.72,
            'Japan': 0.65,
            'Canada': 0.8,
            'Australia': 0.75,
            'Singapore': 0.85,
            'China': 0.6,
            'Brazil': 0.45,
            'Mexico': 0.5,
            'South Korea': 0.7,
            'Russia': 0.4,
            'South Africa': 0.35,
            'Turkey': 0.4,
            'Indonesia': 0.35,
            'Netherlands': 0.8,
            'Italy': 0.7
        };
        populateCountries();
    } finally {
        setLoading(false);
    }
}

// Populate country select
function populateCountries() {
    const countries = Object.keys(pppData).sort();
    targetCountrySelect.innerHTML = '<option value="">Select a country</option>';
    
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        targetCountrySelect.appendChild(option);
    });
}

// Get user's IP and country
async function getUserInfo() {
    try {
        userIPElement.textContent = 'Detecting...';
        userCountryElement.textContent = 'Detecting...';
        
        const response = await fetch('https://api.ipify.org?format=json');
        if (!response.ok) throw new Error('Failed to fetch IP');
        const data = await response.json();
        userIPElement.textContent = data.ip;

        const countryResponse = await fetch(`https://ipapi.co/${data.ip}/json/`);
        if (!countryResponse.ok) throw new Error('Failed to fetch country data');
        const countryData = await countryResponse.json();
        userCountry = countryData.country_name;
        userCountryElement.textContent = userCountry;

        // Set default target country to Switzerland if user is from India
        if (userCountry === 'India') {
            targetCountrySelect.value = 'Switzerland';
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
        userIPElement.textContent = 'Unable to detect';
        userCountryElement.textContent = 'Unable to detect';
        showError('Unable to detect your location. Some features may be limited.');
    }
}

// Validate salary input
function validateSalary(salary) {
    if (isNaN(salary) || salary <= 0) {
        throw new Error('Please enter a valid salary amount');
    }
    if (salary > 1000000000) {
        throw new Error('Salary amount seems too high. Please check your input');
    }
    return true;
}

// Calculate PPP
async function calculatePPP() {
    if (isLoading) return;
    
    try {
        setLoading(true);
        resultSection.style.display = 'none';
        
        const salary = parseFloat(salaryInput.value);
        const targetCountry = targetCountrySelect.value;

        if (!targetCountry) {
            throw new Error('Please select a target country');
        }
        
        validateSalary(salary);

        const userCountryPPP = pppData[userCountry] || 1.0;
        const targetCountryPPP = pppData[targetCountry];
        
        if (!targetCountryPPP) {
            throw new Error('PPP data not available for the selected country');
        }

        const equivalentSalary = (salary * targetCountryPPP) / userCountryPPP;
        const pppRate = targetCountryPPP / userCountryPPP;
        const purchasingPower = (pppRate * 100).toFixed(1);

        // Display results with animation
        resultSection.style.display = 'block';
        resultSection.style.opacity = '0';
        
        equivalentSalaryElement.textContent = formatCurrency(equivalentSalary);
        pppRateElement.textContent = pppRate.toFixed(2);
        purchasingPowerElement.textContent = `${purchasingPower}%`;

        // Animate results
        setTimeout(() => {
            resultSection.style.opacity = '1';
            resultSection.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    } catch (error) {
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

// Event Listeners
calculateBtn.addEventListener('click', calculatePPP);

// Theme toggle
themeToggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(currentTheme);
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Set initial theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    currentTheme = savedTheme;
    setTheme(currentTheme);
    
    await getUserInfo();
    await fetchPPPData();
}); 