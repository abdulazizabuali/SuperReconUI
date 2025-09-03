// Enhanced SuperRecon - Main JavaScript
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const targetInput = document.getElementById('targetUrl');
  const scanBtn = document.getElementById('scanBtn');
  const loadingContainer = document.getElementById('loadingContainer');
  const resultsContainer = document.getElementById('resultsContainer');
  const quickOverview = document.getElementById('quickOverview');
  const errorMessage = document.getElementById('errorMessage');
  const progressBar = document.getElementById('progressBar');
  const copyJsonBtn = document.getElementById('copyJsonBtn');
  const resultsPre = document.getElementById('resultsJsonPre');

  // Tab elements
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // Global variables
  let currentScanData = null;
  let progressInterval = null;

  // Utility Functions
  function logConsole(...args) {
    console.log('[SuperRecon Enhanced]', ...args);
  }

  function showError(msg) {
    console.error('[SuperRecon Enhanced] ERROR:', msg);
    if (errorMessage) {
      errorMessage.textContent = msg;
      errorMessage.style.display = 'block';
    } else {
      alert(msg);
    }
    setLoading(false);
  }

  function clearError() {
    if (errorMessage) {
      errorMessage.textContent = '';
      errorMessage.style.display = 'none';
    }
  }

  function setLoading(isLoading) {
    if (loadingContainer) {
      loadingContainer.style.display = isLoading ? 'flex' : 'none';
    }
    if (scanBtn) {
      scanBtn.disabled = isLoading;
      const btnText = scanBtn.querySelector('.btn-text');
      if (btnText) {
        btnText.textContent = isLoading ? 'Scanning...' : 'Initiate Cosmic Scan';
      }
    }
    if (!isLoading) {
      setProgress(100);
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
    }
  }

  function setProgress(percentage) {
    if (progressBar) {
      progressBar.style.width = Math.max(0, Math.min(100, percentage)) + '%';
    }
  }

  function startProgressAnimation() {
    let progress = 0;
    progressInterval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 90) {
        progress = 90;
        clearInterval(progressInterval);
      }
      setProgress(progress);
    }, 500);
  }

  // URL Validation
  function normalizeUrl(rawUrl) {
    if (!rawUrl) return null;
    let url = rawUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    try {
      new URL(url);
      return url;
    } catch (e) {
      return null;
    }
  }

  // Security Level Assessment
  function assessSecurityLevel(data) {
    if (!data) return { level: 'Unknown', color: 'gray', score: 0 };
    
    let score = 0;
    const factors = [];

    // SSL/TLS Check (30 points)
    if (data.ssl_info?.valid) {
      score += 30;
      factors.push('Valid SSL Certificate');
    }

    // WAF Detection (25 points)
    if (data.waf?.detected || data.waf_info?.detected) {
      score += 25;
      factors.push('Web Application Firewall Detected');
    }

    // Security Headers (25 points)
    const securityHeaders = data.security_headers || {};
    const headerCount = Object.keys(securityHeaders).length;
    if (headerCount > 0) {
      score += Math.min(25, headerCount * 5);
      factors.push(`${headerCount} Security Headers Present`);
    }

    // HTTPS Enforcement (10 points)
    if (data.url && data.url.startsWith('https://')) {
      score += 10;
      factors.push('HTTPS Enforced');
    }

    // Modern Server (10 points)
    const server = data.headers?.server || '';
    if (server && !server.toLowerCase().includes('apache/2.2') && !server.toLowerCase().includes('nginx/1.0')) {
      score += 10;
      factors.push('Modern Server Version');
    }

    // Determine level and color
    let level, color;
    if (score >= 80) {
      level = 'High';
      color = 'success';
    } else if (score >= 50) {
      level = 'Medium';
      color = 'warning';
    } else {
      level = 'Low';
      color = 'error';
    }

    return { level, color, score, factors };
  }

  // Enhanced Data Categorization
  function categorizeData(data) {
    if (!data) return {};

    const categories = {
      general: {
        title: 'General Information',
        icon: '🌐',
        items: []
      },
      security: {
        title: 'Security Analysis',
        icon: '🛡️',
        items: []
      },
      domain: {
        title: 'Domain Intelligence',
        icon: '📡',
        items: []
      },
      technologies: {
        title: 'Technology Profile',
        icon: '⚙️',
        items: []
      },
      content: {
        title: 'Content Analysis',
        icon: '📄',
        items: []
      },
      infrastructure: {
        title: 'Infrastructure Details',
        icon: '🏗️',
        items: []
      }
    };

    // General Information
    categories.general.items = [
      { label: 'Target URL', value: data.url || '-' },
      { label: 'Page Title', value: data.title || '-' },
      { label: 'IP Address', value: data.dns_records?.A?.[0] || '-' },
      { label: 'Scan ID', value: data.scan_id || '-' },
      { label: 'Scan Time', value: data.scanned_at ? new Date(data.scanned_at).toLocaleString() : '-' },
      { label: 'Response Time', value: data.response_time ? `${data.response_time}ms` : '-' }
    ];

    // Security Analysis
    const securityAssessment = assessSecurityLevel(data);
    categories.security.items = [
      { 
        label: 'SSL/TLS Status', 
        value: data.ssl_info?.valid ? 'Valid' : 'Invalid/Missing',
        status: data.ssl_info?.valid ? 'success' : 'error'
      },
      { 
        label: 'SSL Issuer', 
        value: data.ssl_info?.issuer?.CN || data.ssl_info?.issuer?.O || '-'
      },
      { 
        label: 'SSL Expiry', 
        value: data.ssl_info?.not_after ? new Date(data.ssl_info.not_after).toLocaleDateString() : '-'
      },
      { 
        label: 'Web Application Firewall', 
        value: (data.waf?.detected || data.waf_info?.detected) ? 
               (data.waf?.provider || data.waf_info?.provider || 'Detected') : 'Not Detected',
        status: (data.waf?.detected || data.waf_info?.detected) ? 'success' : 'warning'
      },
      { 
        label: 'Security Headers Count', 
        value: Object.keys(data.security_headers || {}).length.toString(),
        status: Object.keys(data.security_headers || {}).length > 0 ? 'success' : 'warning'
      },
      { 
        label: 'Security Score', 
        value: `${securityAssessment.score}/100`,
        status: securityAssessment.color
      }
    ];

    // Domain Intelligence
    categories.domain.items = [
      { label: 'Domain Registrar', value: data.domain_info?.registrar || '-' },
      { label: 'Creation Date', value: data.domain_info?.creation_date?.split('T')[0] || '-' },
      { label: 'Expiration Date', value: data.domain_info?.expiration_date?.split('T')[0] || '-' },
      { label: 'Name Servers', value: (data.dns_records?.NS || []).join(', ') || '-' },
      { label: 'ASN', value: data.ip_info?.asn || '-' },
      { label: 'ASN Description', value: data.ip_info?.asn_description || '-' },
      { label: 'Country', value: data.ip_info?.network?.country || '-' },
      { label: 'Network Range', value: data.ip_info?.asn_cidr || '-' }
    ];

    // Technologies (handled separately due to different structure)
    categories.technologies.items = data.technologies || [];

    // Content Analysis
    const links = data.links_and_resources || {};
    categories.content.items = [
      { label: 'JavaScript Files', value: (links.js_links?.length || 0).toString() },
      { label: 'CSS Files', value: (links.css_links?.length || 0).toString() },
      { label: 'Internal Links', value: (links.internal_links?.length || 0).toString() },
      { label: 'External Links', value: (links.external_links?.length || 0).toString() },
      { label: 'Images', value: (links.image_links?.length || 0).toString() },
      { label: 'Forms', value: (links.form_links?.length || 0).toString() },
      { label: 'API Endpoints', value: (links.api_links?.length || 0).toString() },
      { label: 'Meta Tags', value: (links.meta_tags?.length || 0).toString() }
    ];

    // Infrastructure Details
    const headers = data.headers || {};
    categories.infrastructure.items = [
      { label: 'Web Server', value: headers.server || '-' },
      { label: 'Content Type', value: headers['content-type'] || '-' },
      { label: 'Content Length', value: headers['content-length'] ? `${headers['content-length']} bytes` : '-' },
      { label: 'Last Modified', value: headers['last-modified'] || '-' },
      { label: 'ETag', value: headers.etag || '-' },
      { label: 'CDN Provider', value: data.cdn?.provider || data.cdn_info?.provider || 'Not Detected' },
      { label: 'CMS Platform', value: data.cms_info?.[0]?.name || 'Not Detected' },
      { label: 'Robots.txt', value: data.robots_info?.exists ? 'Present' : 'Not Found' }
    ];

    return categories;
  }

  // Display Functions
  function displayQuickOverview(data) {
    if (!quickOverview || !data) return;

    const securityAssessment = assessSecurityLevel(data);
    
    document.getElementById('overviewDomain').textContent = data.url || '-';
    document.getElementById('overviewIP').textContent = data.dns_records?.A?.[0] || '-';
    document.getElementById('overviewSecurity').textContent = securityAssessment.level;
    document.getElementById('overviewTime').textContent = data.scanned_at ? 
      new Date(data.scanned_at).toLocaleString() : '-';

    quickOverview.style.display = 'block';
  }

  function createInfoItem(label, value, status = null) {
    const item = document.createElement('div');
    item.className = 'info-item';
    
    const labelSpan = document.createElement('span');
    labelSpan.className = 'info-label';
    labelSpan.textContent = label;
    
    const valueSpan = document.createElement('span');
    valueSpan.className = 'info-value';
    
    if (status) {
      const indicator = document.createElement('span');
      indicator.className = `status-indicator status-${status}`;
      valueSpan.appendChild(indicator);
    }
    
    const textNode = document.createTextNode(value);
    valueSpan.appendChild(textNode);
    
    item.appendChild(labelSpan);
    item.appendChild(valueSpan);
    
    return item;
  }

  function createTechCard(tech) {
    const card = document.createElement('div');
    card.className = 'tech-card';
    
    const confidence = tech.confidence || 0;
    
    card.innerHTML = `
      <div class="tech-name">${tech.name}</div>
      <div class="tech-details">
        <span class="tech-version">Version: ${tech.version || 'Unknown'}</span>
        <span class="tech-confidence">${confidence.toFixed(0)}%</span>
      </div>
      <div class="tech-source">Source: ${tech.source || 'Unknown'}</div>
      <div class="confidence-bar">
        <div class="confidence-fill" style="width: ${confidence}%"></div>
      </div>
    `;
    
    return card;
  }

  function populateTabContent(categories) {
    // Clear existing content
    Object.keys(categories).forEach(key => {
      const container = document.getElementById(`${key}Info`) || document.getElementById(`${key}Grid`);
      if (container) {
        container.innerHTML = '';
      }
    });

    // Populate each category
    Object.entries(categories).forEach(([key, category]) => {
      const container = document.getElementById(`${key}Info`) || document.getElementById(`${key}Grid`);
      if (!container) return;

      if (key === 'technologies') {
        // Special handling for technologies
        if (category.items.length === 0) {
          container.innerHTML = '<div class="no-data">No technologies detected</div>';
        } else {
          category.items.forEach(tech => {
            container.appendChild(createTechCard(tech));
          });
        }
      } else {
        // Regular info items
        category.items.forEach(item => {
          container.appendChild(createInfoItem(item.label, item.value, item.status));
        });
      }
    });
  }

  function displayResults(data) {
    currentScanData = data;
    
    // Display quick overview
    displayQuickOverview(data);
    
    // Categorize and display detailed data
    const categories = categorizeData(data);
    populateTabContent(categories);
    
    // Display raw JSON
    if (resultsPre) {
      resultsPre.textContent = JSON.stringify(data, null, 2);
    }
    
    // Show results container
    if (resultsContainer) {
      resultsContainer.style.display = 'block';
    }
    
    setLoading(false);
    logConsole('Results displayed successfully');
  }

  // API Call Function
  async function performReconScan(normalizedUrl) {
    const apiEndpoint = 'https://superrecontool04aj-249dfe2cbae5.hosted.ghaymah.systems/recon';
    const url = `${apiEndpoint}?url=${encodeURIComponent(normalizedUrl)}`;
    
    logConsole('Initiating scan for:', normalizedUrl);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'SuperRecon-Enhanced/1.0'
        },
        mode: 'cors',
        credentials: 'omit'
      });

      logConsole('Response status:', response.status, response.statusText);

      if (response.status === 404) {
        throw new Error('API endpoint not found (404). Please check the service URL.');
      }
      
      if (response.status === 401 || response.status === 403) {
        throw new Error('Access denied. API key may be required.');
      }
      
      if (response.status >= 500) {
        throw new Error(`Server error (${response.status}). Please try again later.`);
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      }

      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const data = await response.json();
        logConsole('Received JSON data:', data);
        return data;
      } else {
        const text = await response.text();
        logConsole('Received text data:', text.substring(0, 500));
        throw new Error('Unexpected response format. Expected JSON.');
      }

    } catch (error) {
      logConsole('Scan error:', error);
      
      if (error.message.toLowerCase().includes('cors')) {
        throw new Error('CORS policy error. The API may not allow cross-origin requests from this domain.');
      } else if (error.message.toLowerCase().includes('network')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      } else if (error.message.toLowerCase().includes('ssl') || error.message.toLowerCase().includes('certificate')) {
        throw new Error('SSL certificate error. The API server may have certificate issues.');
      } else {
        throw error;
      }
    }
  }

  // Main Scan Function
  async function initiateScan() {
    const rawUrl = targetInput ? targetInput.value : '';
    
    if (!rawUrl) {
      showError('Please enter a domain or URL (e.g., example.com or https://example.com)');
      return;
    }

    const normalizedUrl = normalizeUrl(rawUrl);
    if (!normalizedUrl) {
      showError('Invalid URL format. Please use: example.com or https://example.com');
      return;
    }

    clearError();
    setLoading(true);
    setProgress(0);
    startProgressAnimation();
    
    // Hide previous results
    if (resultsContainer) resultsContainer.style.display = 'none';
    if (quickOverview) quickOverview.style.display = 'none';

    try {
      const scanData = await performReconScan(normalizedUrl);
      displayResults(scanData);
    } catch (error) {
      showError(error.message);
    }
  }

  // Copy to Clipboard Function
  async function copyToClipboard() {
    if (!currentScanData) {
      showError('No data to copy. Please perform a scan first.');
      return;
    }

    try {
      const jsonText = JSON.stringify(currentScanData, null, 2);
      await navigator.clipboard.writeText(jsonText);
      
      // Update button text temporarily
      const copyText = copyJsonBtn.querySelector('.copy-text');
      const originalText = copyText.textContent;
      copyText.textContent = 'Copied!';
      copyJsonBtn.classList.add('copied');
      
      setTimeout(() => {
        copyText.textContent = originalText;
        copyJsonBtn.classList.remove('copied');
      }, 2000);
      
      logConsole('Data copied to clipboard successfully');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showError('Failed to copy data to clipboard. Please try selecting and copying manually.');
    }
  }

  // Tab Navigation
  function switchTab(targetTab) {
    // Update tab buttons
    tabButtons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.tab === targetTab) {
        btn.classList.add('active');
      }
    });

    // Update tab contents
    tabContents.forEach(content => {
      content.classList.remove('active');
      if (content.id === `tab-${targetTab}`) {
        content.classList.add('active');
      }
    });
  }

  // Event Listeners
  if (scanBtn) {
    scanBtn.addEventListener('click', initiateScan);
  }

  if (targetInput) {
    targetInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        initiateScan();
      }
    });
  }

  if (copyJsonBtn) {
    copyJsonBtn.addEventListener('click', copyToClipboard);
  }

  // Tab navigation event listeners
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      switchTab(targetTab);
    });
  });

  // Initialize cosmic effects
  function initializeCosmicEffects() {
    // Create floating particles
    const particleContainer = document.getElementById('cosmic-particles');
    if (particleContainer) {
      for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.width = Math.random() * 3 + 1 + 'px';
        particle.style.height = particle.style.width;
        particle.style.background = `hsl(${Math.random() * 60 + 200}, 70%, 70%)`;
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        particleContainer.appendChild(particle);
      }
    }
  }

  // Initialize the application
  function initialize() {
    logConsole('SuperRecon Enhanced initialized');
    initializeCosmicEffects();
    
    // Set default URL if empty
    if (targetInput && !targetInput.value) {
      targetInput.value = 'example.com';
    }
  }

  // Start the application
  initialize();

  // Global error handler
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
  });

  // Expose main function globally for external access
  window.superReconScan = initiateScan;
});

