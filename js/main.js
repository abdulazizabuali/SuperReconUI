// main.js — نسخة مُحسّنة وكاملة
'use strict';

document.addEventListener('DOMContentLoaded', function () {
  // ---- عناصر DOM المتوقعة ----
  const targetUrlInput = document.getElementById('targetUrl');
  const scanBtn = document.getElementById('scanBtn');
  const loadingContainer = document.getElementById('loadingContainer');
  const resultsContainer = document.getElementById('resultsContainer');
  const errorMessage = document.getElementById('errorMessage');
  const progressBar = document.getElementById('progressBar');

  // Optional: area داخل resultsContainer لعرض JSON بشكل منسق
  // إذا لم يكن موجودًا في HTML فسيُنشأ تلقائياً
  let resultsPre = document.getElementById('resultsJsonPre');
  if (!resultsPre) {
    resultsPre = document.createElement('pre');
    resultsPre.id = 'resultsJsonPre';
    resultsPre.style.whiteSpace = 'pre-wrap';
    resultsPre.style.wordBreak = 'break-word';
    resultsContainer.appendChild(resultsPre);
  }

  // قيمة افتراضية للتجربة
  if (targetUrlInput && !targetUrlInput.value) {
    targetUrlInput.value = 'example.com';
  }

  // ---- مساعدات واجهة المستخدم ----
  function showError(msg) {
    if (!errorMessage) return console.error(msg);
    errorMessage.textContent = msg;
    errorMessage.style.display = 'block';
    loadingContainer && (loadingContainer.style.display = 'none');
    resultsContainer && (resultsContainer.style.display = 'none');
    progressBar && (progressBar.style.width = '0%');
    console.error(msg);
  }

  function setLoading(visible = true) {
    if (!loadingContainer) return;
    loadingContainer.style.display = visible ? 'flex' : 'none';
    if (!visible) progressBar && (progressBar.style.width = '100%');
  }

  function setProgress(pct) {
    if (!progressBar) return;
    const clamped = Math.max(0, Math.min(100, pct));
    progressBar.style.width = clamped + '%';
  }

  function clearUiBeforeRequest() {
    if (errorMessage) errorMessage.style.display = 'none';
    if (resultsContainer) resultsContainer.style.display = 'none';
    if (resultsPre) resultsPre.textContent = '';
    setProgress(0);
    setLoading(true);
  }

  // ---- دالة عرض النتيجة ----
  function displayResults(data, normalizedUrl) {
    setLoading(false);
    setProgress(100);

    if (!resultsContainer) {
      console.log('Result data:', data);
      return;
    }

    resultsContainer.style.display = 'block';

    // عرض JSON منسق
    try {
      const pretty = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      resultsPre.textContent = pretty;
    } catch (e) {
      resultsPre.textContent = String(data);
    }

    // إضافات عرض بسيطة: إذا كان هناك حقول شائعة نعرضها كنص
    const summary = [];
    if (data && typeof data === 'object') {
      if (data.status) summary.push(`Status: ${data.status}`);
      if (data.job_id) summary.push(`Job ID: ${data.job_id}`);
      if (data.domain) summary.push(`Domain: ${data.domain}`);
      if (data.target) summary.push(`Target: ${data.target}`);
    }
    if (summary.length) {
      // نعرض الملخص أعلى النتيجة
      const h = document.createElement('div');
      h.style.marginBottom = '8px';
      h.style.fontSize = '0.95rem';
      h.style.color = '#222';
      h.innerText = summary.join(' • ');
      // ضع الملخص قبل الـ pre
      resultsContainer.insertBefore(h, resultsPre);
    }
  }

  // ---- الدالة الأساسية: recon ----
  window.recon = async function (target) {
    clearUiBeforeRequest();

    try {
      if (!target) throw new Error('الرجاء إدخال دومين أو رابط (مثال: example.com أو https://example.com)');

      // تطبيع الإدخال: نضيف https:// إذا لم يكن موجوداً
      let normalized = target.trim();
      if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized;

      // تحقق سريع من صحة الـ URL
      try {
        new URL(normalized);
      } catch (e) {
        throw new Error('صيغة الـ URL غير صحيحة. مثال صحيح: example.com أو https://example.com');
      }

      setProgress(5);

      const base = 'https://superrecontool04aj-249dfe2cbae5.hosted.ghaymah.systems';
      const reconUrl = `${base}/recon?url=${encodeURIComponent(normalized)}`;

      setProgress(15);

      console.log('Requesting recon endpoint:', reconUrl);

      // نستخدم GET لأن طريقة الاستخدام التي أعطيتَها تُظهر ذلك
      const reconResp = await fetch(reconUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*'
        },
        mode: 'cors',
        credentials: 'omit' // عدل إذا تحتاج إرسال كوكيز
      });

      console.log('Recon response status:', reconResp.status, 'content-type:', reconResp.headers.get('content-type'));

      // إذا لم تكن الاستجابة ناجحة، نقرأ النص لإظهار سبب واضح
      if (!reconResp.ok) {
        const txt = await reconResp.text().catch(() => null);
        // رسالة خاصة عند مشكلة CORS: المتصفح يمنع الوصول ويعرض خطأ في Console بدلاً من هنا.
        if (reconResp.status === 0) {
          throw new Error('فشل الاتصال بالخادم. راجع Console للبحث عن مشاكل CORS أو اتصال الشبكة.');
        }
        throw new Error(txt || `طلب الفحص فشل برمز الحالة ${reconResp.status}`);
      }

      setProgress(25);

      // نحاول تحويل الاستجابة إلى JSON، وإن فشل فإننا نقرأ كنص
      let payload;
      const contentType = reconResp.headers.get('content-type') || '';
      if (contentType.includes('application/json') || contentType.includes('+json')) {
        payload = await reconResp.json();
      } else {
        // قد تكون الاستجابة نصية أو HTML — نحاول قرائتها ونحاول تحليل JSON إن أمكن
        const textBody = await reconResp.text();
        try {
          payload = JSON.parse(textBody);
        } catch (e) {
          // إن لم تكن JSON، نعرض النص كما هو
          displayResults(textBody, normalized);
          return textBody;
        }
      }

      setProgress(40);

      // إذا كانت الخدمة تُعيد البيانات مباشرة (نهائية)، عرضها فوراً
      const looksLikeFinal = (
        (payload && payload.status && payload.status.toLowerCase() === 'completed') ||
        (payload && !payload.job_id && !payload.jobId && typeof payload === 'object')
      );

      if (looksLikeFinal && (!payload.job_id && !payload.jobId)) {
        // بعض الـ APIs تُعيد status: 'completed' مع field data
        const dataToShow = payload.data ? payload.data : payload;
        setProgress(100);
        displayResults(dataToShow, normalized);
        return dataToShow;
      }

      // إذا رجع job id فنعمل polling إلى /results/{jobId}
      const jobId = payload.job_id || payload.jobId || payload.id;
      if (jobId) {
        console.log('Async job detected, jobId =', jobId);
        setProgress(45);

        const maxAttempts = 12; // 12 attempts * interval = 3 minutes (إذا interval 15s)
        const intervalMs = 15000;
        let attempts = 0;

        return await new Promise((resolve, reject) => {
          const poll = async () => {
            attempts++;
            try {
              const statusUrl = `${base}/results/${encodeURIComponent(jobId)}`;
              console.log(`Polling [${attempts}/${maxAttempts}] -> ${statusUrl}`);
              const statusResp = await fetch(statusUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json, text/plain, */*' },
                mode: 'cors',
                credentials: 'omit'
              });

              console.log('Status response:', statusResp.status, 'content-type:', statusResp.headers.get('content-type'));

              if (!statusResp.ok) {
                const txt = await statusResp.text().catch(() => null);
                if (attempts < maxAttempts) {
                  // تأجيل محاولة أخرى
                  setProgress(45 + (attempts * (40 / maxAttempts)));
                  return setTimeout(poll, intervalMs);
                } else {
                  return reject(new Error(txt || `فشل الحصول على النتائج (status ${statusResp.status})`));
                }
              }

              const ct = statusResp.headers.get('content-type') || '';
              let statusPayload;
              if (ct.includes('application/json') || ct.includes('+json')) {
                statusPayload = await statusResp.json();
              } else {
                const txt = await statusResp.text();
                try { statusPayload = JSON.parse(txt); } catch (e) { statusPayload = txt; }
              }

              // حالات ممكنة من الـ results endpoint
              if (statusPayload && typeof statusPayload === 'object') {
                if (statusPayload.status && statusPayload.status.toLowerCase() === 'processing') {
                  // لا زال المعالجة جارية
                  setProgress(45 + (attempts * (40 / maxAttempts)));
                  if (attempts < maxAttempts) return setTimeout(poll, intervalMs);
                  return reject(new Error('انتهى وقت الانتظار للنتيجة (timeout)'));
                }

                if (statusPayload.status && statusPayload.status.toLowerCase() === 'completed') {
                  const final = statusPayload.data ? statusPayload.data : statusPayload;
                  setProgress(100);
                  displayResults(final, normalized);
                  return resolve(final);
                }

                // بعض الـ APIs تعيد مباشرة data بدون حقل status
                if (statusPayload.data || statusPayload.result || (Object.keys(statusPayload).length > 0 && !statusPayload.status)) {
                  const final = statusPayload.data ? statusPayload.data : statusPayload;
                  setProgress(100);
                  displayResults(final, normalized);
                  return resolve(final);
                }
              } else {
                // لو كانت الاستجابة نصية
                setProgress(100);
                displayResults(statusPayload, normalized);
                return resolve(statusPayload);
              }

              // أي حالة غير معروفة: محاولة أخرى حتى ينقضي maxAttempts
              if (attempts < maxAttempts) {
                setProgress(45 + (attempts * (40 / maxAttempts)));
                return setTimeout(poll, intervalMs);
              } else {
                return reject(new Error('انتهى الوقت دون الحصول على نتيجة صالحة'));
              }

            } catch (err) {
              // إذا فشل الاتصال مؤقتًا حاول مجددًا حتى بلوغ الحد
              console.warn('Polling error:', err);
              if (attempts < maxAttempts) {
                setProgress(45 + (attempts * (40 / maxAttempts)));
                return setTimeout(poll, intervalMs);
              }
              return reject(err);
            }
          }; // poll

          // ابدأ polling فوراً أو بعد تأخير بسيط
          setTimeout(poll, 800);
        }); // new Promise
      }

      // إن وصلنا هنا فالشكل غير معروف
      throw new Error('تنسيق الاستجابة من الخادم غير معروف. يمكنك فحص الـ Console لمزيد من التفاصيل.');
    } catch (err) {
      // رسائل خطأ ودلالات خاصة بمشاكل CORS
      if (err && typeof err.message === 'string' && err.message.toLowerCase().includes('cors')) {
        showError('يبدو أن هناك مشكلة سياسة مشاركة المصادر (CORS). إذا كنت تتحكم بالخادم أضف Access-Control-Allow-Origin. إذا لا تتحكم، استخدم بروكسي من نفس دومين الواجهة.');
      } else {
        showError(`خطأ: ${err.message || err}`);
      }
    }
  }; // end recon

  // ---- Event listeners ----
  if (scanBtn) {
    scanBtn.addEventListener('click', () => {
      const target = (targetUrlInput && targetUrlInput.value) ? targetUrlInput.value.trim() : '';
      window.recon(target);
    });
  }

  if (targetUrlInput) {
    targetUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const target = targetUrlInput.value.trim();
        window.recon(target);
      }
    });
  }

}); // DOMContentLoaded
