'use strict';
document.addEventListener('DOMContentLoaded', () => {
  // DOM references
  const targetInput = document.getElementById('targetUrl');
  const scanBtn = document.getElementById('scanBtn');
  const loadingContainer = document.getElementById('loadingContainer');
  const resultsContainer = document.getElementById('resultsContainer');
  const quickOverview = document.getElementById('quickOverview');
  const errorMessage = document.getElementById('errorMessage');
  const progressBar = document.getElementById('progressBar');
  const copyJsonBtn = document.getElementById('copyJsonBtn');
  const resultsPre = document.getElementById('resultsJsonPre');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  let currentScanData = null;
  let progressInterval = null;
  // UTILITIES
  function log(...args) { console.log('[SuperRecon]', ...args); }
  function showError(msg) {
    if (errorMessage) {
      errorMessage.textContent = msg;
      errorMessage.style.display = 'block';
      errorMessage.setAttribute('aria-hidden', 'false');
    } else {
      alert(msg);
    }
    setLoading(false);
  }
  function clearError() {
    if (errorMessage) {
      errorMessage.textContent = '';
      errorMessage.style.display = 'none';
      errorMessage.setAttribute('aria-hidden', 'true');
    }
  }
  function setLoading(state) {
    if (loadingContainer) loadingContainer.style.display = state ? 'flex' : 'none';
    if (scanBtn) {
      scanBtn.disabled = state;
      const btnText = scanBtn.querySelector('.btn-text');
      if (btnText) btnText.textContent = state ? 'Scanning...' : 'Initiate Cosmic Scan';
      scanBtn.setAttribute('aria-pressed', String(state));
    }
    if (!state) {
      setProgress(100);
      if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
      if (progressBar) progressBar.setAttribute('aria-valuenow', '100');
    }
  }
  function setProgress(pct) {
    if (progressBar) {
      progressBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
      progressBar.setAttribute('aria-valuenow', String(Math.round(Math.max(0, Math.min(100, pct)))));
    }
  }
  function startProgressAnimation() {
    let p = 0;
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
      p += Math.random() * 12 + 3;
      if (p >= 92) { p = 92; clearInterval(progressInterval); progressInterval = null; }
      setProgress(p);
    }, 450);
  }
  function normalizeUrl(raw) {
    if (!raw) return null;
    let url = raw.trim();
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(url)) url = 'https://' + url;
    try {
      new URL(url);
      return url;
    } catch (e) {
      return null;
    }
  }
  // SECURITY ASSESSMENT (simple heuristic)
  function assessSecurityLevel(data) {
    if (!data) return { level: 'Unknown', color: 'gray', score: 0, factors: [], status: 'error' };
    let score = 0;
    const factors = [];
    if (data.ssl_info?.valid) { score += 30; factors.push('Valid SSL/TLS'); }
    if (data.waf?.detected || data.waf_info?.detected) { score += 20; factors.push('WAF detected'); }
    const headersCount = Object.keys(data.security_headers || {}).length;
    if (headersCount > 0) { score += Math.min(25, headersCount * 5); factors.push(`${headersCount} security headers`); }
    if (data.url && data.url.startsWith('https://')) { score += 10; factors.push('HTTPS enforced'); }
    const srv = String(data.headers?.server || '').toLowerCase();
    if (srv && !srv.includes('apache/2.2') && !srv.includes('nginx/1.0')) { score += 10; factors.push('Modern server'); }
    let level = 'Low', color = 'error', status = 'error';
    if (score >= 75) { level = 'High'; color = 'success'; status = 'success'; }
    else if (score >= 45) { level = 'Medium'; color = 'warning'; status = 'warning'; }
    return { level, color, score, factors, status };
  }
  // Robust container resolver (restores mapping)
  function getContainerForKey(key) {
    const candidates = [
      `${key}Info`, `${key}Grid`, key, `${key}Info`, `${key}Grid`, `${key.toLowerCase()}Info`, `${key.toLowerCase()}Grid`
    ];
    for (const id of candidates) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }
  // Categorize and normalize incoming JSON into UI-ready categories
  function categorizeData(data) {
    if (!data) return {};
    // Determine hostname
    let hostname = '-';
    try {
      if (data.url) hostname = (new URL(data.url)).hostname;
      else if (data.scanned_url) hostname = (new URL(data.scanned_url)).hostname;
    } catch (e) {
      hostname = data.url || data.scanned_url || '-';
    }
    const categories = {
      general: { title: 'General Information', items: [] },
      security: { title: 'Security Analysis', items: [] },
      domain: { title: 'Domain Intelligence', items: [] },
      technologies: { title: 'Technology Profile', items: [] },
      content: { title: 'Content Analysis', items: [] },
      infrastructure: { title: 'Infrastructure Details', items: [] },
      evidence: { title: 'Raw Evidence', items: [] }
    };
    // General
    categories.general.items.push({ label: 'Target URL', value: data.url || data.scanned_url || '-' });
    categories.general.items.push({ label: 'Title', value: data.title || '-' });
    categories.general.items.push({ label: 'Scan ID', value: data.scan_id || '-' });
    categories.general.items.push({ label: 'Scanned At', value: data.scanned_at ? new Date(data.scanned_at).toLocaleString() : '-' });
    if (data.notes) categories.general.items.push({ label: 'Notes', value: data.notes });
    // Security
    const sec = assessSecurityLevel(data);
    categories.security.items.push({ label: 'SSL/TLS', value: data.ssl_info?.valid ? 'Valid' : 'Missing/Invalid', status: data.ssl_info?.valid ? 'success' : 'error' });
    categories.security.items.push({ label: 'Issuer', value: data.ssl_info?.issuer?.O || data.ssl_info?.issuer?.CN || '-' });
    categories.security.items.push({ label: 'Not After', value: data.ssl_info?.not_after || '-' });
    const wafDetected = data.waf?.detected || data.waf_info?.detected;
    categories.security.items.push({ label: 'WAF', value: wafDetected ? (data.waf?.provider || data.waf_info?.provider || 'Detected') : 'Not Detected', status: wafDetected ? 'success' : 'warning' });
    categories.security.items.push({ label: 'Security Headers Count', value: String(Object.keys(data.security_headers || {}).length), status: Object.keys(data.security_headers || {}).length > 0 ? 'success' : 'warning' });
    categories.security.items.push({ label: 'Security Score', value: `${sec.score}/100 (${sec.level})`, status: sec.color });
    // Domain
    categories.domain.items.push({ label: 'Hostname', value: hostname || '-' });
    categories.domain.items.push({ label: 'DNS A', value: (data.dns_records?.A || []).join(', ') || '-' });
    categories.domain.items.push({ label: 'ASN', value: data.ip_info?.asn || '-' });
    categories.domain.items.push({ label: 'ASN Description', value: data.ip_info?.asn_description || '-' });
    categories.domain.items.push({ label: 'ASN CIDR', value: data.ip_info?.asn_cidr || '-' });
    categories.domain.items.push({ label: 'IP WHOIS Source', value: data.ip_info?.source || '-' });
    // Technologies: ensure we include any array and also CMS heuristics
    const techSourceArray = Array.isArray(data.technologies) ? data.technologies : (Array.isArray(data.cms_info) ? data.cms_info : []);
    const normalizedTechs = techSourceArray.map(t => {
      const confidence = (typeof t.confidence === 'number') ? t.confidence : (t.confidence ? Number(t.confidence) : 0);
      return {
        name: t.name || t.tech || t.title || 'Unknown',
        version: t.version || t.version_string || t.raw_version || 'Unknown',
        confidence: Number.isFinite(confidence) ? Math.round(confidence) : 0,
        source: t.source || (Array.isArray(t.provenance) ? t.provenance.join(', ') : (t.provenance || 'Unknown')),
        raw: t
      };
    });
    categories.technologies.items = normalizedTechs;
    // Content
    const links = data.links_and_resources || {};
    categories.content.items.push({ label: 'JS Links', value: String(links.js_links?.length || 0) });
    categories.content.items.push({ label: 'CSS Links', value: String(links.css_links?.length || 0) });
    categories.content.items.push({ label: 'Internal Links', value: String(links.internal_links?.length || 0) });
    categories.content.items.push({ label: 'External Links', value: String(links.external_links?.length || 0) });
    categories.content.items.push({ label: 'Image Links', value: String(links.image_links?.length || 0) });
    categories.content.items.push({ label: 'Form Links', value: String(links.form_links?.length || 0) });
    categories.content.items.push({ label: 'API Links', value: String(links.api_links?.length || 0) });
    categories.content.items.push({ label: 'Meta Tags', value: String(links.meta_tags?.length || 0) });
    // Infrastructure
    const hdrs = data.headers || {};
    categories.infrastructure.items.push({ label: 'Server', value: hdrs.server || '-' });
    categories.infrastructure.items.push({ label: 'Content-Type', value: hdrs['content-type'] || '-' });
    categories.infrastructure.items.push({ label: 'Content-Length', value: hdrs['content-length'] ? `${hdrs['content-length']} bytes` : '-' });
    categories.infrastructure.items.push({ label: 'Last-Modified', value: hdrs['last-modified'] || '-' });
    categories.infrastructure.items.push({ label: 'ETag', value: hdrs.etag || '-' });
    categories.infrastructure.items.push({ label: 'CDN Provider', value: data.cdn?.provider || data.cdn_info?.provider || 'Not Detected' });
    categories.infrastructure.items.push({ label: 'CMS', value: data.cms_info?.[0]?.name || 'Not Detected' });
    categories.infrastructure.items.push({ label: 'Robots.txt', value: data.robots_info?.exists ? 'Present' : 'Not Found' });
    // Evidence
    const ev = data.raw_evidence || {};
    const evItems = [];
    Object.entries(ev).forEach(([k, v]) => {
      if (v && typeof v === 'object') {
        if (v.path) evItems.push({ label: `${k}.path`, value: v.path });
        if (v.sha256) evItems.push({ label: `${k}.sha256`, value: v.sha256 });
        if (v.timestamp) evItems.push({ label: `${k}.timestamp`, value: v.timestamp });
      }
    });
    if (data.robots_info?.raw_evidence?.path) evItems.push({ label: 'robots.raw_path', value: data.robots_info.raw_evidence.path });
    if (evItems.length === 0) evItems.push({ label: 'Raw Evidence', value: 'No raw-evidence file paths available in response' });
    categories.evidence.items = evItems;
    return categories;
  }
  // DOM builders
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
    valueSpan.appendChild(document.createTextNode(value));
    item.appendChild(labelSpan);
    item.appendChild(valueSpan);
    return item;
  }
  // Technology card: now guarantees a confidence indicator for every tech
  function createTechCard(tech) {
    const card = document.createElement('div');
    card.className = 'tech-card';
    const nameEl = document.createElement('div');
    nameEl.className = 'tech-name';
    nameEl.textContent = tech.name || 'Unknown';
    const details = document.createElement('div');
    details.className = 'tech-details';
    const version = document.createElement('span');
    version.className = 'tech-version';
    version.textContent = `Version: ${tech.version || 'Unknown'}`;
    const confidenceBadge = document.createElement('span');
    confidenceBadge.className = 'tech-confidence';
    confidenceBadge.textContent = `${(typeof tech.confidence === 'number') ? tech.confidence : 0}%`;
    details.appendChild(version);
    details.appendChild(confidenceBadge);
    const sourceEl = document.createElement('div');
    sourceEl.className = 'tech-source';
    sourceEl.textContent = `Source: ${tech.source || 'Unknown'}`;
    // Confidence bar (visual) — always present and obeys tech.confidence
    const confBar = document.createElement('div');
    confBar.className = 'confidence-bar';
    const confFill = document.createElement('div');
    confFill.className = 'confidence-fill';
    const confValue = Math.max(0, Math.min(100, Number(tech.confidence || 0)));
    confFill.style.width = `${confValue}%`;
    confFill.setAttribute('title', `Confidence: ${confValue}%`);
    confBar.appendChild(confFill);
    card.appendChild(nameEl);
    card.appendChild(details);
    card.appendChild(sourceEl);
    card.appendChild(confBar);
    // Expand to view raw JSON of this tech
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!card._expanded) {
        card._prevHTML = card.innerHTML;
        const pre = document.createElement('pre');
        pre.className = 'tech-raw';
        pre.textContent = JSON.stringify(tech.raw || tech, null, 2);
        card.innerHTML = '';
        card.appendChild(pre);
        card.classList.add('tech-card-expanded');
        card._expanded = true;
      } else {
        card.innerHTML = card._prevHTML;
        card.classList.remove('tech-card-expanded');
        card._expanded = false;
      }
    });
    return card;
  }
  // Populate UI
  function populateTabContent(categories) {
    Object.keys(categories).forEach(key => {
      const container = getContainerForKey(key);
      if (container) container.innerHTML = '';
    });
    Object.entries(categories).forEach(([key, cat]) => {
      const container = getContainerForKey(key);
      if (!container) return;
      if (key === 'technologies') {
        if (!cat.items || cat.items.length === 0) {
          container.innerHTML = '<div class="no-data">No technologies detected</div>';
        } else {
          cat.items.forEach(tech => {
            const techCard = createTechCard(tech);
            container.appendChild(techCard);
          });
        }
      } else {
        cat.items.forEach(item => {
          const node = createInfoItem(item.label, item.value, item.status);
          container.appendChild(node);
        });
      }
    });
  }
  function displayQuickOverview(data) {
    if (!quickOverview || !data) return;
    const domainEl = document.getElementById('overviewDomain');
    const ipEl = document.getElementById('overviewIP');
    const secEl = document.getElementById('overviewSecurity');
    const timeEl = document.getElementById('overviewTime');
    const sec = assessSecurityLevel(data);
    if (domainEl) domainEl.textContent = data.url || data.scanned_url || '-';
    if (ipEl) ipEl.textContent = (data.dns_records?.A?.[0]) || (data.ip_info?.network?.start_address) || '-';
    if (secEl) {
      secEl.textContent = sec.level;
      secEl.className = 'card-value';
      if (sec.status === 'success') {
        secEl.classList.add('status-success');
      } else if (sec.status === 'warning') {
        secEl.classList.add('status-warning');
      } else {
        secEl.classList.add('status-error');
      }
    }
    if (timeEl) timeEl.textContent = data.scanned_at ? new Date(data.scanned_at).toLocaleString() : '-';
    quickOverview.style.display = 'block';
  }
  function displayResults(data) {
    currentScanData = data;
    displayQuickOverview(data);
    const cats = categorizeData(data);
    populateTabContent(cats);
    if (resultsPre) resultsPre.textContent = JSON.stringify(data, null, 2);
    if (resultsContainer) resultsContainer.style.display = 'block';
    setLoading(false);
    log('Results displayed');
  }
  // API call
  async function performReconScan(normalizedUrl) {
    // Replace with your real API endpoint if different
    const apiEndpoint = 'https://superrecontool04aj-249dfe2cbae5.hosted.ghaymah.systems/recon';
    const url = `${apiEndpoint}?url=${encodeURIComponent(normalizedUrl)}`;
    log('Fetching:', url);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 120s
      const resp = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json, text/plain, */*' },
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (resp.status === 404) throw new Error('API endpoint not found (404).');
      if (resp.status === 401 || resp.status === 403) throw new Error('Access denied (401/403).');
      if (resp.status >= 500) throw new Error(`Server error (${resp.status}).`);
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await resp.json();
        return data;
      } else {
        const text = await resp.text();
        try { return JSON.parse(text); } catch (e) { throw new Error('Unexpected response format (not JSON).'); }
      }
    } catch (err) {
      log('Fetch error:', err);
      if (err.name === 'AbortError') throw new Error('Scan timed out (120s).');
      if (err.message && err.message.toLowerCase().includes('cors')) throw new Error('CORS error. API may not allow cross-origin requests.');
      throw err;
    }
  }
  // Initiate scan
  async function initiateScan() {
    const raw = targetInput ? targetInput.value : '';
    if (!raw) { showError('Please enter a domain or URL (e.g., example.com)'); return; }
    const normalized = normalizeUrl(raw);
    if (!normalized) { showError('Invalid URL format. Use example.com or https://example.com '); return; }
    clearError();
    setLoading(true);
    setProgress(0);
    startProgressAnimation();
    if (resultsContainer) resultsContainer.style.display = 'none';
    if (quickOverview) quickOverview.style.display = 'none';
    try {
      const data = await performReconScan(normalized);
      displayResults(data);
    } catch (err) {
      showError(err.message || String(err));
    }
  }
  // Copy JSON (with fallback)
  async function copyToClipboard() {
    if (!currentScanData) { showError('No data to copy. Run a scan first.'); return; }
    try {
      const jsonText = JSON.stringify(currentScanData, null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(jsonText);
      } else {
        const ta = document.createElement('textarea');
        ta.value = jsonText;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      if (copyJsonBtn) {
        const txtEl = copyJsonBtn.querySelector('.copy-text');
        const orig = txtEl ? txtEl.textContent : 'Copied';
        if (txtEl) { txtEl.textContent = 'Copied!'; copyJsonBtn.classList.add('copied'); setTimeout(()=>{ txtEl.textContent = orig; copyJsonBtn.classList.remove('copied'); }, 1800); }
      }
      log('JSON copied');
    } catch (err) {
      showError('Failed to copy to clipboard. Try selecting the raw JSON and copying manually.');
      log('Copy error', err);
    }
  }
  // Tab switch
  function switchTab(targetTab) {
    tabButtons.forEach(btn => {
      if (btn.dataset.tab === targetTab) { btn.classList.add('active'); btn.setAttribute('aria-selected','true'); }
      else { btn.classList.remove('active'); btn.setAttribute('aria-selected','false'); }
    });
    tabContents.forEach(ct => {
      if (ct.id === `tab-${targetTab}`) ct.classList.add('active');
      else ct.classList.remove('active');
    });
  }
  // Event bindings
  if (scanBtn) scanBtn.addEventListener('click', initiateScan);
  if (targetInput) targetInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') initiateScan(); });
  if (copyJsonBtn) copyJsonBtn.addEventListener('click', copyToClipboard);
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  // Cosmic particles
  function initParticles() {
    const container = document.getElementById('cosmic-particles');
    if (!container) return;
    container.innerHTML = '';
    for (let i=0; i<150; i++){
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random()*100 + '%';
      p.style.top = Math.random()*100 + '%';
      const size = (Math.random()*3)+0.8;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.opacity = String(0.6 * Math.random() + 0.2);
      p.style.animationDelay = `${Math.random()*20}s`;
      p.style.animationDuration = `${Math.random()*14+8}s`;
      p.style.setProperty('--tx', `${(Math.random() - 0.5) * 200}px`);
      p.style.setProperty('--ty', `${(Math.random() - 0.5) * 200}px`);
      p.style.setProperty('--rotate', `${Math.random() * 360}deg`);
      p.style.setProperty('--scale', `${0.8 + Math.random() * 0.6}`);
      container.appendChild(p);
    }
  }
  // Init
  function init() {
    log('Initializing UI');
    initParticles();
    // Removed the default value setting for targetInput
  }
  init();
  // Global error logging
  window.addEventListener('error', (e) => { console.error('Unhandled error', e.error); });
  // Expose for console access
  window.superReconScan = initiateScan;
});
