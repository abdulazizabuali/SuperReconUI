// main.js — نهائي (GET -> /recon?url=...)
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // ----- عناصر الـ DOM المتوقعة (تأكد من وجودها في HTML) -----
  const targetInput = document.getElementById('targetUrl');
  const scanBtn = document.getElementById('scanBtn');
  const loadingContainer = document.getElementById('loadingContainer');
  const resultsContainer = document.getElementById('resultsContainer');
  const errorMessage = document.getElementById('errorMessage');
  const progressBar = document.getElementById('progressBar');

  // ensure results <pre>
  let resultsPre = document.getElementById('resultsJsonPre');
  if (!resultsPre) {
    resultsPre = document.createElement('pre');
    resultsPre.id = 'resultsJsonPre';
    resultsPre.style.whiteSpace = 'pre-wrap';
    resultsPre.style.wordBreak = 'break-word';
    if (resultsContainer) resultsContainer.appendChild(resultsPre);
    else document.body.appendChild(resultsPre);
  }

  // ----- مساعدات واجهة المستخدم -----
  function logConsole(...args) { console.log('[recon]', ...args); }
  function showError(msg) {
    console.error('[recon] ERROR:', msg);
    if (errorMessage) {
      errorMessage.textContent = msg;
      errorMessage.style.display = 'block';
    } else {
      alert(msg);
    }
    if (loadingContainer) loadingContainer.style.display = 'none';
    if (progressBar) progressBar.style.width = '0%';
  }
  function clearError() {
    if (errorMessage) { errorMessage.textContent = ''; errorMessage.style.display = 'none'; }
  }
  function setLoading(on) {
    if (!loadingContainer) return;
    loadingContainer.style.display = on ? 'flex' : 'none';
    if (!on && progressBar) progressBar.style.width = '100%';
  }
  function setProgress(pct) {
    if (!progressBar) return;
    progressBar.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }
  function displayResult(data) {
    setLoading(false);
    setProgress(100);
    if (resultsContainer) resultsContainer.style.display = 'block';
    try {
      resultsPre.textContent = (typeof data === 'string') ? data : JSON.stringify(data, null, 2);
    } catch (e) {
      resultsPre.textContent = String(data);
    }
  }

  // ----- تطبيع و تحقق من الـ URL -----
  function normalizeInput(raw) {
    if (!raw) return null;
    let s = raw.trim();
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    try {
      new URL(s);
      return s;
    } catch (e) {
      return null;
    }
  }

  // ----- استدعاء GET إلى /recon?url=... -----
  async function callReconGET(normalized) {
    const base = 'https://superrecontool04aj-249dfe2cbae5.hosted.ghaymah.systems';
    const endpoint = `${base}/recon?url=${encodeURIComponent(normalized)}`;
    logConsole('GET', endpoint);
    // استخدم mode:'cors' — الخادم المفترض يملك CORS أو سنستخدم بروكسي محلي
    const resp = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json, text/plain, */*' },
      mode: 'cors',
      credentials: 'omit'
    });
    return resp;
  }

  // ----- الدالة الرئيسية ----- 
  window.recon = async function(rawTarget) {
    clearError();
    setProgress(0);
    setLoading(true);

    if (!rawTarget) {
      showError('الرجاء إدخال دومين أو رابط (مثال: example.com أو https://example.com).');
      return;
    }

    const normalized = normalizeInput(rawTarget);
    if (!normalized) {
      showError('صيغة URL غير صحيحة. استخدم مثلاً: example.com أو https://example.com');
      return;
    }

    try {
      setProgress(10);

      let resp;
      try {
        resp = await callReconGET(normalized);
      } catch (fetchErr) {
        // عادة يظهر هنا TypeError عند CORS أو مشاكل شبكة/SSL
        logConsole('GET failed:', fetchErr);
        // رسالة مفيدة للمستخدم
        showError('فشل الاتصال عبر GET. راجع Console (مشكلة شبكة أو CORS أو SSL).');
        return;
      }

      setProgress(40);

      logConsole('Response status:', resp.status, resp.statusText);
      resp.headers.forEach((v, k) => logConsole('header', k, v));

      // حالات شائعة
      if (resp.status === 404) {
        const txt = await resp.text().catch(()=>'<no body>');
        showError(`404 Not Found — endpoint غير موجود على الخادم. نص الاستجابة: ${txt.substring(0,800)}`);
        return;
      }
      if (resp.status === 401 || resp.status === 403) {
        const txt = await resp.text().catch(()=>'');
        showError(`التصريح مرفوض (${resp.status}). ربما يحتاج الـ API مفتاحاً. رسالة الخادم: ${txt}`);
        return;
      }
      if (resp.status >= 500) {
        const txt = await resp.text().catch(()=>'<no body>');
        showError(`خطاء من الخادم (${resp.status}). الرسالة: ${txt.substring(0,800)}`);
        return;
      }

      if (!resp.ok) {
        const txt = await resp.text().catch(()=>'<no body>');
        showError(`الاستدعاء أرجع حالة ${resp.status}. الرد: ${txt.substring(0,1000)}`);
        return;
      }

      setProgress(65);

      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json') || ct.includes('+json')) {
        const payload = await resp.json();
        logConsole('Payload (JSON):', payload);
        displayResult(payload);
        return payload;
      } else {
        const text = await resp.text();
        logConsole('Payload (text):', text.substring(0, 1000));
        displayResult(text);
        return text;
      }

    } catch (err) {
      // أخطاء عامة
      logConsole('Unexpected error:', err);
      const msg = (err && err.message) ? err.message : String(err);
      if (msg.toLowerCase().includes('cors')) {
        showError('يبدو أن هناك مشكلة سياسة مشاركة المصادر (CORS). إن لم تكن تملك التحكم بالخادم استخدم بروكسي محلي.');
      } else if (msg.toLowerCase().includes('ssl') || msg.toLowerCase().includes('certificate')) {
        showError('مشكلة في شهادة SSL عند الاتصال بالـ API. افحص الشهادة أو استخدم بروكسي محلي لتجاوزها أثناء التطوير.');
      } else {
        showError('خطأ غير متوقع: ' + msg);
      }
    }
  }; // end recon

  // ----- أحداث زر الإدخال -----
  if (scanBtn) {
    scanBtn.addEventListener('click', () => {
      const val = (targetInput && targetInput.value) ? targetInput.value : '';
      window.recon(val);
    });
  }
  if (targetInput) {
    targetInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const val = targetInput.value || '';
        window.recon(val);
      }
    });
  }

  // optional: set default value
  if (targetInput && !targetInput.value) targetInput.value = 'example.com';
});
