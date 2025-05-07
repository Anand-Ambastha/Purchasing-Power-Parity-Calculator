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
let pppData = {
    'India': 0.3,
    'Switzerland': 0.8,
    'United States': 1.0,
    'United Kingdom': 0.7,
    'Germany': 0.75,
    'France': 0.72,
    'Japan': 0.65,
    'Canada': 0.8,
    'Australia': 0.75,
    'Singapore': 0.85
};

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
        userCountryElement.textContent = countryData.country_name;

        // Set default target country to Switzerland if user is from India
        if (countryData.country_name === 'India') {
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

        const userCountry = userCountryElement.textContent;
        const userCountryPPP = pppData[userCountry] || 1.0;
        const targetCountryPPP = pppData[targetCountry];
        
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

// Add input validation on salary input
salaryInput.addEventListener('input', (e) => {
    const value = e.target.value;
    if (value && !isNaN(value)) {
        e.target.value = Math.max(0, parseFloat(value));
    }
});

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
    populateCountries();
}); 