document.addEventListener('DOMContentLoaded', function() {
    const targetUrlInput = document.getElementById('targetUrl');
    const scanBtn = document.getElementById('scanBtn');
    const loadingContainer = document.getElementById('loadingContainer');
    const resultsContainer = document.getElementById('resultsContainer');
    const errorMessage = document.getElementById('errorMessage');
    const progressBar = document.getElementById('progressBar');
    
    // Set default value for demonstration
    targetUrlInput.value = 'example.com';
    
    // Recon function as requested
    window.recon = async function(target) {
        // Reset UI
        errorMessage.style.display = 'none';
        resultsContainer.style.display = 'none';
        loadingContainer.style.display = 'flex';
        progressBar.style.width = '0%';
        
        try {
            // Validate URL format
            if (!target || !/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(target)) {
                throw new Error('Please enter a valid domain name (e.g., example.com)');
            }
            
            // Show initial progress
            progressBar.style.width = '5%';
            
            // First API call to initiate scan
            const scanResponse = await fetch('https://superrecontool04aj-249dfe2cbae5.hosted.ghaymah.systems/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ url: target })
            });
            
            // Update progress
            progressBar.style.width = '20%';
            
            if (!scanResponse.ok) {
                const errorData = await scanResponse.json().catch(() => ({}));
                throw new Error(errorData.detail || `Scan failed with status ${scanResponse.status}`);
            }
            
            const scanData = await scanResponse.json();
            const jobId = scanData.job_id;
            
            if (!jobId) {
                throw new Error('Invalid response from server - missing job ID');
            }
            
            // Poll for results (every 15 seconds)
            let progress = 20;
            let attempts = 0;
            const maxAttempts = 12; // 12 * 15s = 3 minutes
            
            return new Promise((resolve, reject) => {
                const checkStatus = async () => {
                    attempts++;
                    
                    try {
                        const statusResponse = await fetch(`https://superrecontool04aj-249dfe2cbae5.hosted.ghaymah.systems/results/${jobId}`);
                        
                        if (!statusResponse.ok) {
                            if (attempts < maxAttempts) {
                                // Continue polling
                                setTimeout(checkStatus, 15000);
                                return;
                            }
                            const errorData = await statusResponse.json().catch(() => ({}));
                            throw new Error(errorData.detail || `Failed to get results (status ${statusResponse.status})`);
                        }
                        
                        const results = await statusResponse.json();
                        
                        if (results.status === 'processing') {
                            // Update progress based on attempts
                            progress = 20 + (attempts * (75 / maxAttempts));
                            progressBar.style.width = `${Math.min(progress, 95)}%`;
                            
                            if (attempts < maxAttempts) {
                                setTimeout(checkStatus, 15000);
                                return;
                            } else {
                                throw new Error('Scan timed out after 3 minutes');
                            }
                        } else if (results.status === 'completed') {
                            // Final progress
                            progressBar.style.width = '100%';
                            
                            // Display results
                            displayResults(results.data, target);
                            resolve(results.data);
                        } else {
                            throw new Error('Scan failed: ' + (results.error || 'Unknown error'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                };
                
                // Start polling
                setTimeout(checkStatus, 15000);
            });
        } catch (error) {
            errorMessage.textContent = `Error: ${error.message}`;
            errorMessage.style.display = 'block';
            loadingContainer.style.display = 'none';
        }
    };
    
    // Display results function
    function displayResults(data, target) {
        // Target Information
        document.getElementById('targetDomain').textContent = target;
        document.getElementById('ipAddress').textContent = data.ip_address || 'N/A';
        document.getElementById('scanDuration').textContent = data.scan_duration ? `${data.scan_duration}s` : 'N/A';
        
        // Determine security level
        const securityLevel = document.getElementById('securityLevel');
        if (data.security_score) {
            const score = parseInt(data.security_score);
            securityLevel.textContent = `${score}/100`;
            
            if (score >= 80) {
                securityLevel.className = 'security-level security-high';
            } else if (score >= 50) {
                securityLevel.className = 'security-level security-medium';
            } else {
                securityLevel.className = 'security-level security-low';
            }
        } else {
            securityLevel.textContent = 'N/A';
        }
        
        // Technology Profile
        const techGrid = document.getElementById('techGrid');
        techGrid.innerHTML = '';
        
        if (data.technologies && data.technologies.length > 0) {
            data.technologies.forEach(tech => {
                const techTag = document.createElement('div');
                techTag.className = 'tech-tag';
                techTag.textContent = tech;
                techGrid.appendChild(techTag);
            });
        } else {
            const noTech = document.createElement('div');
            noTech.className = 'tech-tag';
            noTech.textContent = 'No technologies detected';
            techGrid.appendChild(noTech);
        }
        
        // Security Analysis
        document.getElementById('sslStatus').textContent = data.ssl_info ? 
            (data.ssl_info.valid ? 'Valid SSL Certificate' : 'Invalid/No SSL') : 'N/A';
        
        document.getElementById('wafStatus').textContent = data.waf ? 
            (data.waf.detected ? `Detected: ${data.waf.name}` : 'Not detected') : 'N/A';
        
        document.getElementById('securityHeaders').textContent = data.security_headers ?
            `${Object.keys(data.security_headers).length} headers configured` : 'N/A';
        
        document.getElementById('vulnerabilities').textContent = data.vulnerabilities ?
            `${data.vulnerabilities.length} potential issues` : 'N/A';
        
        // Domain Intelligence
        document.getElementById('domainRegistrar').textContent = data.whois && data.whois.registrar ?
            data.whois.registrar : 'N/A';
        
        document.getElementById('domainCreation').textContent = data.whois && data.whois.creation_date ?
            new Date(data.whois.creation_date).toLocaleDateString() : 'N/A';
        
        document.getElementById('domainExpiration').textContent = data.whois && data.whois.expiration_date ?
            new Date(data.whois.expiration_date).toLocaleDateString() : 'N/A';
        
        document.getElementById('nameServers').textContent = data.dns && data.dns.nameservers ?
            data.dns.nameservers.join(', ') : 'N/A';
        
        // Content Analysis
        document.getElementById('pageTitle').textContent = data.content && data.content.title ?
            data.content.title : 'N/A';
        
        document.getElementById('metaDescription').textContent = data.content && data.content.description ?
            (data.content.description.length > 100 ? 
                data.content.description.substring(0, 100) + '...' : data.content.description) : 'N/A';
        
        document.getElementById('serverTechnology').textContent = data.server ?
            data.server : 'N/A';
        
        document.getElementById('geolocation').textContent = data.geolocation ?
            `${data.geolocation.city}, ${data.geolocation.country}` : 'N/A';
        
        // Show results
        resultsContainer.style.display = 'block';
        loadingContainer.style.display = 'none';
    }
    
    // Event listeners
    scanBtn.addEventListener('click', () => {
        const target = targetUrlInput.value.trim();
        window.recon(target);
    });
    
    targetUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const target = targetUrlInput.value.trim();
            window.recon(target);
        }
    });
});