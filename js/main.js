// main.js — متوافق مع FastAPI /recon (GET & POST fallback)
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const targetInput = document.getElementById('targetUrl');
  const scanBtn = document.getElementById('scanBtn');
  const loadingContainer = document.getElementById('loadingContainer');
  const resultsContainer = document.getElementById('resultsContainer');
  const errorMessage = document.getElementById('errorMessage');
  const progressBar = document.getElementById('progressBar');

  // ensure a <pre> for results
  let resultsPre = document.getElementById('resultsJsonPre');
  if (!resultsPre) {
    resultsPre = document.createElement('pre');
    resultsPre.id = 'resultsJsonPre';
    resultsPre.style.whiteSpace = 'pre-wrap';
    resultsPre.style.wordBreak = 'break-word';
    if (resultsContainer) resultsContainer.appendChild(resultsPre);
    else document.body.appendChild(resultsPre);
  }

  function showError(msg) {
    console.error(msg);
    if (errorMessage) {
      errorMessage.textContent = msg;
      errorMessage.style.display = 'block';
    } else {
      alert(msg);
    }
    if (loadingContainer) loadingContainer.style.display = 'none';
    setProgress(0);
  }

  function clearError() {
    if (errorMessage) {
      errorMessage.textContent = '';
      errorMessage.style.display = 'none';
    }
  }

  function setProgress(p) {
    if (progressBar) progressBar.style.width = Math.max(0, Math.min(100, p)) + '%';
  }

  function setLoading(on) {
    if (!loadingContainer) return;
    loadingContainer.style.display = on ? 'flex' : 'none';
    if (!on) setProgress(100);
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

  async function callReconGET(normalized) {
    const base = 'https://superrecontool04aj-249dfe2cbae5.hosted.ghaymah.systems';
    const url = `${base}/recon?url=${encodeURIComponent(normalized)}`;
    console.log('Calling GET', url);
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json, text/plain, */*' },
      mode: 'cors',
      credentials: 'omit'
    });
    return resp;
  }

  async function callReconPOST(normalized) {
    const base = 'https://superrecontool04aj-249dfe2cbae5.hosted.ghaymah.systems';
    const url = `${base}/recon`;
    console.log('Calling POST', url);
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Accept': 'application/json, text/plain, */*', 'Content-Type': 'application/json' },
      mode: 'cors',
      credentials: 'omit',
      body: JSON.stringify({ url: normalized })
    });
    return resp;
  }

  // الدالة الرئيسية
  window.recon = async function (rawTarget) {
    clearError();
    setProgress(0);
    setLoading(true);
    if (!rawTarget) {
      showError('الرجاء إدخال دومين أو رابط (مثال: example.com أو https://example.com)');
      return;
    }

    // تطبيع الإدخال
    let normalized = rawTarget.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized;

    try {
      // تحقق سريع من صحة الـ URL
      try { new URL(normalized); } catch (e) { throw new Error('صيغة URL غير صحيحة.'); }

      setProgress(10);

      // نجرب GET أولاً (لأن الخادم يدعم GET /recon?url=...)
      let resp;
      try {
        resp = await callReconGET(normalized);
      } catch (fetchErr) {
        // قد يكون network/CORS/SSL error — نعرض رسالة مفيدة ونحاول POST كخيار ثانوي
        console.warn('GET failed:', fetchErr);
        // إذا كان خطأ TypeError غالبًا بسبب CORS/Network
        showError('خطأ عند الاتصال بالنقطة /recon عبر GET — تحقق من Console (مشكلة شبكة أو CORS). نحاول POST كبديل...');
        // تابِع لمحاولة POST بعد قليل
      }

      // إذا لم نحصل على resp من GET، جرّب POST
      if (!resp) {
        try {
          resp = await callReconPOST(normalized);
        } catch (postErr) {
          console.error('POST also failed:', postErr);
          showError('فشل الاتصال بكلا الطريقتين (GET و POST). راجع Console لمزيد من التفاصيل.');
          return;
        }
      }

      setProgress(35);

      console.log('Response status:', resp.status, resp.statusText);
      console.log('Response headers:');
      resp.headers.forEach((v, k) => console.log(k + ':', v));

      // حالة 404 → عادة path خاطئ أو endpoint غير موجود
      if (resp.status === 404) {
        const txt = await resp.text().catch(() => '<no body>');
        showError(`404 Not Found — endpoint غير موجود. استجابة الخادم:\n${txt.substring(0, 1000)}`);
        return;
      }

      // حالة timeout من الخادم (مثل 504)
      if (resp.status === 504) {
        const txt = await resp.text().catch(() => null);
        showError(`504 Gateway Timeout من الخادم. احتمال أن الوقت المتاح لفحص الموقع انتهى. الرسالة: ${txt || ''}`);
        return;
      }

      // أي حالة غير 2xx غير متوقعة — نعرض نص الاستجابة
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '<no body>');
        showError(`الاستدعاء أرجع حالة ${resp.status}. رد الخادم:\n${txt.substring(0, 1500)}`);
        return;
      }

      // استجابة ناجحة — نحاول قراءة JSON أو نص عادي
      setProgress(60);
      const ct = resp.headers.get('content-type') || '';
      let payload;
      if (ct.includes('application/json') || ct.includes('+json')) {
        payload = await resp.json();
      } else {
        const txt = await resp.text();
        // نحاول JSON.parse إذا بدا كـ JSON
        try {
          payload = JSON.parse(txt);
        } catch (e) {
          // نصي — نعرضه كما هو
          displayResult(txt);
          return txt;
        }
      }

      setProgress(90);
      console.log('Payload received:', payload);
      displayResult(payload);
      return payload;

    } catch (err) {
      // أخطاء JS عامة (شبكة، CORS، صيغة URL)
      // إذا خطأ مرتبط بـ CORS ستظهر تفاصيل في Console؛ هنا نعطي رسالة مفيدة
      const m = (err && err.message) ? err.message : String(err);
      if (m.toLowerCase().includes('cors')) {
        showError('يبدو أن هناك مشكلة سياسة مشاركة المصادر (CORS). تأكد أن الخادم يتيح Access-Control-Allow-Origin أو استخدم بروكسي على نفس الدومين.');
      } else {
        showError('خطأ: ' + m);
      }
    }
  };

  // event listeners
  if (scanBtn) {
    scanBtn.addEventListener('click', () => {
      const target = (targetInput && targetInput.value) ? targetInput.value.trim() : '';
      window.recon(target);
    });
  }
  if (targetInput) {
    targetInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const target = targetInput.value.trim();
        window.recon(target);
      }
    });
  }
});
