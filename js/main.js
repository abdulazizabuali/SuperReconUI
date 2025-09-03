// js/main.js
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // عناصر DOM
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

  /* ---------- Utilities ---------- */
  function log(...args) { console.log('[SuperRecon]', ...args); }

  function showError(msg) {
    if (errorMessage) {
      errorMessage.textContent = msg;
      errorMessage.style.display = 'block';
    } else {
      alert(msg);
    }
    setLoading(false);
  }

  function clearError() {
    if (errorMessage) { errorMessage.textContent = ''; errorMessage.style.display = 'none'; }
  }

  function setLoading(flag) {
    if (loadingContainer) loadingContainer.style.display = flag ? 'flex' : 'none';
    if (scanBtn) {
      scanBtn.disabled = flag;
      const txt = scanBtn.querySelector('.btn-text');
      if (txt) txt.textContent = flag ? 'جارٍ الفحص...' : 'ابدأ الفحص';
    }
    if (!flag) {
      setProgress(100);
      if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
    }
  }

  function setProgress(p) {
    if (progressBar) progressBar.style.width = Math.max(0, Math.min(100, p)) + '%';
  }

  function startProgressAnimation() {
    let progress = 0;
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
      progress += Math.random() * 12 + 4;
      if (progress >= 92) { progress = 92; clearInterval(progressInterval); progressInterval = null; }
      setProgress(progress);
    }, 450);
  }

  function normalizeUrl(input) {
    if (!input) return null;
    let u = input.trim();
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(u)) {
      u = 'https://' + u;
    }
    try { new URL(u); return u; }
    catch (e) { return null; }
  }

  /* ---------- Security scoring ---------- */
  function assessSecurityLevel(data) {
    if (!data) return { level: 'Unknown', color: 'gray', score: 0, factors: [] };
    let score = 0;
    const factors = [];

    if (data.ssl_info?.valid) { score += 30; factors.push('شهادة SSL صالحة'); }
    if (data.waf?.detected || data.waf_info?.detected) { score += 20; factors.push('WAF مكتشف'); }
    const headerCount = Object.keys(data.security_headers || {}).length;
    if (headerCount > 0) { score += Math.min(25, headerCount * 5); factors.push(`${headerCount} رؤوس أمان`); }
    if (data.url && data.url.startsWith('https://')) { score += 10; factors.push('HTTPS مفروض'); }
    const server = (data.headers?.server || '').toLowerCase();
    if (server && !server.includes('apache/2.2') && !server.includes('nginx/1.0')) { score += 10; factors.push('خادم حديث'); }

    let level = 'Low', color = 'error';
    if (score >= 75) { level = 'High'; color = 'success'; }
    else if (score >= 45) { level = 'Medium'; color = 'warning'; }

    return { level, color, score, factors };
  }

  /* ---------- تصنيف البيانات إلى أقسام ---------- */
  function categorizeData(data) {
    if (!data) return {};

    // حاول استخراج hostname إن لم يكن موجودا صراحة
    let hostname = '-';
    try {
      if (data.url) hostname = (new URL(data.url)).hostname;
      else if (data.scanned_url) hostname = (new URL(data.scanned_url)).hostname;
      else if (typeof data === 'object' && data.scanned_url) hostname = (new URL(data.scanned_url)).hostname;
    } catch (e) { hostname = data.url || data.scanned_url || '-'; }

    const categories = {
      general: { title: 'معلومات عامة', icon: '🌐', items: [] },
      security: { title: 'تحليل الأمان', icon: '🛡️', items: [] },
      domain: { title: 'معلومات الدومين', icon: '📡', items: [] },
      technologies: { title: 'التقنيات', icon: '⚙️', items: [] },
      content: { title: 'محتوى الصفحات', icon: '📄', items: [] },
      infrastructure: { title: 'بنية تحتية', icon: '🏗️', items: [] },
      evidence: { title: 'أدلة وملفات خام', icon: '🧾', items: [] }
    };

    // General
    categories.general.items.push({ label: 'نطاق/URL', value: data.url || data.scanned_url || hostname || '-' });
    categories.general.items.push({ label: 'عنوان الصفحة', value: data.title || '-' });
    categories.general.items.push({ label: 'Scan ID', value: data.scan_id || '-' });
    categories.general.items.push({ label: 'وقت الفحص', value: data.scanned_at ? new Date(data.scanned_at).toLocaleString() : '-' });
    categories.general.items.push({ label: 'ملخص ملاحظات', value: data.notes || '-' });

    // Security
    const sec = assessSecurityLevel(data);
    categories.security.items.push({ label: 'حالة SSL/TLS', value: data.ssl_info?.valid ? 'صالح' : 'غير موجود / غير صالح', status: data.ssl_info?.valid ? 'success' : 'error' });
    categories.security.items.push({ label: 'جهة الإصدار', value: data.ssl_info?.issuer?.O || data.ssl_info?.issuer?.CN || '-' });
    categories.security.items.push({ label: 'انتهاء الشهادة', value: data.ssl_info?.not_after || '-' });
    categories.security.items.push({ label: 'WAF', value: (data.waf?.detected || data.waf_info?.detected) ? (data.waf?.provider || data.waf_info?.provider || 'مكتشف') : 'لم يُكتشف', status: (data.waf?.detected || data.waf_info?.detected) ? 'success' : 'warning' });
    categories.security.items.push({ label: 'Security Headers', value: Object.keys(data.security_headers || {}).length.toString(), status: Object.keys(data.security_headers || {}).length > 0 ? 'success' : 'warning' });
    categories.security.items.push({ label: 'درجة الأمان', value: `${sec.score}/100 (${sec.level})`, status: sec.color });

    // Domain
    categories.domain.items.push({ label: 'Hostname', value: hostname || '-' });
    categories.domain.items.push({ label: 'DNS A', value: (data.dns_records?.A || []).join(', ') || '-' });
    categories.domain.items.push({ label: 'ASN', value: data.ip_info?.asn || '-' });
    categories.domain.items.push({ label: 'ASN وصف', value: data.ip_info?.asn_description || '-' });
    categories.domain.items.push({ label: 'نطاق الشبكة', value: data.ip_info?.asn_cidr || '-' });
    categories.domain.items.push({ label: 'بلد ASN', value: data.ip_info?.asn_country_code || data.ip_info?.network?.country || '-' });

    // Technologies
    const techs = Array.isArray(data.technologies) ? data.technologies : (data.cms_info ? data.cms_info : []);
    categories.technologies.items = techs.map(t => {
      return {
        name: t.name || t.tech || 'Unknown',
        version: t.version || t.version || (t.version_string || 'Unknown'),
        confidence: typeof t.confidence === 'number' ? t.confidence : (t.confidence ? Number(t.confidence) : 0),
        source: t.source || (Array.isArray(t.provenance) ? t.provenance.join(', ') : t.provenance || 'Unknown'),
        raw: t
      };
    });

    // Content analysis
    const links = data.links_and_resources || {};
    categories.content.items.push({ label: 'JS Links', value: (links.js_links?.length || 0).toString() });
    categories.content.items.push({ label: 'CSS Links', value: (links.css_links?.length || 0).toString() });
    categories.content.items.push({ label: 'روابط داخلية', value: (links.internal_links?.length || 0).toString() });
    categories.content.items.push({ label: 'روابط خارجية', value: (links.external_links?.length || 0).toString() });
    categories.content.items.push({ label: 'صور', value: (links.image_links?.length || 0).toString() });
    categories.content.items.push({ label: 'نقاط النهاية API', value: (links.api_links?.length || 0).toString() });

    // Infrastructure
    categories.infrastructure.items.push({ label: 'الخادم', value: data.headers?.server || '-' });
    categories.infrastructure.items.push({ label: 'نوع المحتوى', value: data.headers?.['content-type'] || '-' });
    categories.infrastructure.items.push({ label: 'طول المحتوى', value: data.headers?.['content-length'] ? `${data.headers['content-length']} bytes` : '-' });
    categories.infrastructure.items.push({ label: 'ETag', value: data.headers?.etag || '-' });
    categories.infrastructure.items.push({ label: 'CDN', value: data.cdn?.provider || data.cdn_info?.provider || 'غير مكتشف' });
    categories.infrastructure.items.push({ label: 'CMS', value: (data.cms_info?.[0]?.name) || '-' });
    categories.infrastructure.items.push({ label: 'robots.txt موجود', value: data.robots_info?.exists ? 'نعم' : 'لا' });

    // Evidence
    const evidenceItems = [];
    if (data.raw_evidence && typeof data.raw_evidence === 'object') {
      Object.entries(data.raw_evidence).forEach(([k, v]) => {
        if (v && typeof v === 'object') {
          if (v.path) evidenceItems.push({ label: `${k}.path`, value: v.path });
          if (v.sha256) evidenceItems.push({ label: `${k}.sha256`, value: v.sha256 });
          if (v.timestamp) evidenceItems.push({ label: `${k}.timestamp`, value: v.timestamp });
        }
      });
    }
    if (data.robots_info?.raw_evidence?.path) {
      evidenceItems.push({ label: 'robots.raw_path', value: data.robots_info.raw_evidence.path });
    }
    if (evidenceItems.length === 0) evidenceItems.push({ label: 'أدلة', value: 'لا توجد مسارات ملفية في الاستجابة' });
    categories.evidence.items = evidenceItems;

    return categories;
  }

  /* ---------- DOM إنشاء عناصر العرض ---------- */
  function createInfoItem(label, value, status = null) {
    const el = document.createElement('div');
    el.className = 'info-item';
    const labelEl = document.createElement('span'); labelEl.className = 'info-label'; labelEl.textContent = label;
    const valueEl = document.createElement('span'); valueEl.className = 'info-value';
    if (status) {
      const dot = document.createElement('span'); dot.className = `status-indicator status-${status}`; valueEl.appendChild(dot);
    }
    const txt = document.createTextNode(value);
    valueEl.appendChild(txt);
    el.appendChild(labelEl); el.appendChild(valueEl);
    return el;
  }

  function createTechCard(tech) {
    const card = document.createElement('div'); card.className = 'tech-card';
    const name = document.createElement('div'); name.className = 'tech-name'; name.textContent = tech.name || 'Unknown';
    const details = document.createElement('div'); details.className = 'tech-details';
    const ver = document.createElement('span'); ver.className = 'tech-version'; ver.textContent = `الإصدار: ${tech.version || 'Unknown'}`;
    const conf = document.createElement('span'); conf.className = 'tech-confidence'; conf.textContent = `${Math.round(tech.confidence || 0)}%`;
    details.appendChild(ver); details.appendChild(conf);
    const source = document.createElement('div'); source.className = 'tech-source'; source.textContent = `المصدر: ${tech.source || 'Unknown'}`;

    const bar = document.createElement('div'); bar.className = 'confidence-bar';
    const fill = document.createElement('div'); fill.className = 'confidence-fill'; fill.style.width = `${Math.max(2, Math.min(100, tech.confidence || 0))}%`;
    bar.appendChild(fill);

    card.appendChild(name); card.appendChild(details); card.appendChild(source); card.appendChild(bar);

    // عند النقر يعرض الكائن الخام داخل البطاقة (expand)
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!card._expanded) {
        card._prev = card.innerHTML;
        const pre = document.createElement('pre'); pre.style.whiteSpace = 'pre-wrap'; pre.style.maxHeight = '320px'; pre.style.overflow = 'auto';
        pre.textContent = JSON.stringify(tech.raw || tech, null, 2);
        card.innerHTML = ''; card.appendChild(pre); card.classList.add('tech-card-expanded'); card._expanded = true;
      } else {
        card.innerHTML = card._prev; card.classList.remove('tech-card-expanded'); card._expanded = false;
      }
    });

    return card;
  }

  function getContainerForKey(key) {
    const candidates = [
      `${key}Info`, `${key}Grid`, key, `${key}Info`, `${key}Grid`
    ];
    for (const id of candidates) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }

  function populateTabContent(categories) {
    // مسح المحتوى السابق
    Object.keys(categories).forEach(key => {
      const c = getContainerForKey(key);
      if (c) c.innerHTML = '';
    });

    Object.entries(categories).forEach(([key, cat]) => {
      const container = getContainerForKey(key);
      if (!container) return;

      if (key === 'technologies') {
        if (!cat.items || cat.items.length === 0) {
          container.innerHTML = '<div class="no-data">لا توجد تقنيات مشخصة</div>';
        } else {
          cat.items.forEach(t => container.appendChild(createTechCard(t)));
        }
      } else {
        cat.items.forEach(item => container.appendChild(createInfoItem(item.label, item.value, item.status)));
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
    if (secEl) secEl.textContent = sec.level;
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
    log('عرض النتائج تم بنجاح');
  }

  /* ---------- استدعاء API ---------- */
  async function performReconScan(normalizedUrl) {
    // ضع هنا نقطة النهاية الحقيقية الخاصة بك
    const apiEndpoint = 'https://superrecontool04aj-249dfe2cbae5.hosted.ghaymah.systems/recon';
    const fullUrl = `${apiEndpoint}?url=${encodeURIComponent(normalizedUrl)}`;

    log('طلب المسح إلى:', fullUrl);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 120s

      const resp = await fetch(fullUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        mode: 'cors',
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (resp.status === 404) throw new Error('خطأ: نقطة النهاية غير موجودة (404).');
      if (resp.status === 401 || resp.status === 403) throw new Error('ممنوع الوصول — مطلوب مفتاح أو صلاحيات.');
      if (resp.status >= 500) throw new Error(`خطأ خادم (${resp.status}).`);

      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await resp.json();
        return data;
      } else {
        const txt = await resp.text();
        // نحاول تحليل النص إذا كان JSON مخفيًا
        try { return JSON.parse(txt); } catch (e) { throw new Error('تنسيق الاستجابة غير متوقع — غير JSON.'); }
      }
    } catch (err) {
      log('خطأ أثناء المسح:', err);
      if (err.name === 'AbortError') throw new Error('انتهت مهلة الفحص (timeout).');
      if (err.message && err.message.toLowerCase().includes('cors')) throw new Error('خطأ CORS — قد يمنع الخادم الطلب من هذا النطاق.');
      throw err;
    }
  }

  /* ---------- بدء عملية الفحص ---------- */
  async function initiateScan() {
    const raw = targetInput ? targetInput.value : '';
    if (!raw) { showError('أدخل نطاقًا أو رابطًا للاستدعاء'); return; }
    const norm = normalizeUrl(raw);
    if (!norm) { showError('تنسيق الرابط غير صالح. استخدم example.com أو https://example.com'); return; }

    clearError();
    setLoading(true);
    setProgress(0);
    startProgressAnimation();
    if (resultsContainer) resultsContainer.style.display = 'none';
    if (quickOverview) quickOverview.style.display = 'none';

    try {
      const data = await performReconScan(norm);
      displayResults(data);
    } catch (err) {
      showError(err.message || String(err));
    }
  }

  /* ---------- نسخ JSON إلى الحافظة (مع fallback) ---------- */
  async function copyToClipboard() {
    if (!currentScanData) { showError('لا توجد بيانات للنسخ — نفّذ الفحص أولًا'); return; }
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
        const txt = copyJsonBtn.querySelector('.copy-text');
        const orig = txt ? txt.textContent : 'تم النسخ';
        if (txt) { txt.textContent = 'تم النسخ!'; copyJsonBtn.classList.add('copied'); setTimeout(()=>{ txt.textContent = orig; copyJsonBtn.classList.remove('copied'); }, 2000); }
      }
      log('تم النسخ إلى الحافظة');
    } catch (err) {
      showError('فشل النسخ إلى الحافظة. حاول تحديد النص يدويًا ونسخه.');
      log('فشل النسخ:', err);
    }
  }

  /* ---------- تبويبات التنقل ---------- */
  function switchTab(target) {
    tabButtons.forEach(btn => {
      const t = btn.dataset.tab;
      if (t === target) { btn.classList.add('active'); btn.setAttribute('aria-selected','true'); }
      else { btn.classList.remove('active'); btn.setAttribute('aria-selected','false'); }
    });
    tabContents.forEach(ct => {
      if (ct.id === `tab-${target}`) ct.classList.add('active');
      else ct.classList.remove('active');
    });
  }

  /* ---------- الأحداث ---------- */
  if (scanBtn) scanBtn.addEventListener('click', initiateScan);
  if (targetInput) targetInput.addEventListener('keypress', e => { if (e.key === 'Enter') initiateScan(); });
  if (copyJsonBtn) copyJsonBtn.addEventListener('click', copyToClipboard);
  tabButtons.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  /* ---------- تأثيرات فضائية (particles) ---------- */
  function initCosmicEffects() {
    const particleContainer = document.getElementById('cosmic-particles');
    if (!particleContainer) return;
    particleContainer.innerHTML = '';
    for (let i=0;i<80;i++){
      const p = document.createElement('div'); p.className='particle';
      p.style.left = Math.random()*100 + '%';
      p.style.top = Math.random()*100 + '%';
      const size = (Math.random()*3)+1; p.style.width = size + 'px'; p.style.height = size + 'px';
      p.style.opacity = 0.8 * Math.random() + 0.2;
      p.style.animationDelay = (Math.random()*20)+'s';
      p.style.animationDuration = (Math.random()*12+8)+'s';
      particleContainer.appendChild(p);
    }
  }

  // تهيئة عند التحميل
  function init() {
    log('تهيئة الواجهة');
    initCosmicEffects();
    if (targetInput && !targetInput.value) targetInput.value = 'example.com';
  }
  init();

  // عرض الأخطاء العامة للـ window
  window.addEventListener('error', e => { console.error('Unhandled error', e.error); });
  // كشف الوظيفة عالمياً إن رغبت في استدعائها من الكونسول
  window.superReconScan = initiateScan;
});
