// إنشاء النجوم ديناميكيًا
function createStars() {
    const starfield = document.getElementById('starfield');
    const particleContainer = document.getElementById('cosmic-particles');
    
    // إنشاء النجوم
    for (let i = 0; i < 200; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        
        // حجم عشوائي
        const size = Math.random() * 3;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        
        // موضع عشوائي
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        
        // مدة ومقدار تأخر عشوائي
        star.style.setProperty('--duration', `${1 + Math.random() * 5}s`);
        star.style.setProperty('--delay', `${Math.random() * 2}s`);
        
        starfield.appendChild(star);
    }
    
    // إنشاء الجسيمات الكونية
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // لون عشوائي
        const hue = Math.random() * 60 + 180; // من الأزرق إلى الأرجواني
        particle.style.background = `hsl(${hue}, 100%, 70%)`;
        
        // حجم عشوائي
        const size = Math.random() * 6 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        // موضع عشوائي
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        
        // مدة ومقدار تأخر عشوائي
        particle.style.setProperty('--duration', `${15 + Math.random() * 15}s`);
        particle.style.setProperty('--tx', `${-50 + Math.random() * 100}px`);
        particle.style.setProperty('--ty', `${-50 + Math.random() * 100}px`);
        
        particleContainer.appendChild(particle);
    }
}

// تتبع حركة الماوس لإنشاء أثر
function setupMouseTrail() {
    const mouseTrail = document.getElementById('mouse-trail');
    let trails = [];
    
    document.addEventListener('mousemove', (e) => {
        const trail = document.createElement('div');
        trail.className = 'mouse-trail';
        trail.style.left = `${e.clientX}px`;
        trail.style.top = `${e.clientY}px`;
        
        mouseTrail.appendChild(trail);
        trails.push(trail);
        
        // إزالة الآثار القديمة
        setTimeout(() => {
            trail.remove();
            trails = trails.filter(t => t !== trail);
        }, 1000);
    });
}

// معالجة استجابة المسح
function handleScanResponse(response) {
    // إخفاء شاشة التحميل وعرض النتائج
    const loadingContainer = document.getElementById('loading-container');
    const resultsContainer = document.getElementById('results-container');
    
    loadingContainer.style.display = 'none';
    resultsContainer.style.display = 'block';
    
    // تعبئة البيانات في الأقسام
    populateResults(response);
    
    // عرض الرد الخام في القسم المخصص
    const rawResponseElement = document.getElementById('raw-response');
    if (rawResponseElement) {
        rawResponseElement.textContent = JSON.stringify(response, null, 2);
    }
}

// تعبئة البيانات في الأقسام
function populateResults(response) {
    // تعبئة معلومات النطاق
    document.querySelector('.domain-name').textContent = response.url || 'N/A';
    document.querySelector('.scan-time').textContent = response.scanned_at ? 
        new Date(response.scanned_at).toLocaleString() : 'N/A';
    
    // تعبئة عنوان IP
    const ipInfo = response.ip_info || {};
    document.querySelector('.ip-address').textContent = response.dns_records?.A?.[0] || 'N/A';
    
    // تعبئة معلومات DNS
    const dnsRecords = response.dns_records || {};
    document.querySelector('.dns-a-record').textContent = dnsRecords.A ? 
        dnsRecords.A.join(', ') : 'No A records found';
    document.querySelector('.dns-cname-record').textContent = dnsRecords.CNAME ? 
        dnsRecords.CNAME.join(', ') : 'No CNAME records found';
    
    // تعبئة معلومات SSL
    const sslInfo = response.ssl_info || {};
    document.querySelector('.ssl-status').textContent = sslInfo.status || 
        'No SSL information available';
    
    // تعبئة معلومات WAF
    const wafInfo = response.waf_info || {};
    document.querySelector('.waf-status').textContent = wafInfo.detected ? 
        `Detected: ${wafInfo.provider || 'Unknown'}` : 'Not detected';
    
    // تعبئة رؤوس الأمان
    const securityHeaders = response.headers || {};
    const headersContainer = document.querySelector('.security-headers');
    headersContainer.innerHTML = '';
    
    if (Object.keys(securityHeaders).length > 0) {
        Object.entries(securityHeaders).forEach(([header, value]) => {
            const headerElement = document.createElement('div');
            headerElement.className = 'header-item';
            headerElement.innerHTML = `<strong>${header}:</strong> ${value}`;
            headersContainer.appendChild(headerElement);
        });
    } else {
        headersContainer.textContent = 'No security headers detected';
    }
    
    // تعبئة التكنولوجيات
    const technologies = response.technologies || [];
    const techGrid = document.querySelector('.tech-grid');
    techGrid.innerHTML = '';
    
    if (technologies.length > 0) {
        technologies.forEach(tech => {
            const techTag = document.createElement('div');
            techTag.className = 'tech-tag';
            techTag.textContent = tech.name;
            techGrid.appendChild(techTag);
        });
    } else {
        techGrid.innerHTML = '<div class="empty-state">No technologies detected</div>';
    }
    
    // تعبئة معلومات CMS
    const cmsInfo = response.cms_info || [];
    const cmsContainer = document.querySelector('.cms-info');
    cmsContainer.innerHTML = '';
    
    if (cmsInfo.length > 0) {
        cmsInfo.forEach(cms => {
            const cmsElement = document.createElement('div');
            cmsElement.className = 'cms-item';
            cmsElement.innerHTML = `
                <strong>${cms.name}</strong> (Confidence: ${(cms.confidence * 100).toFixed(1)}%)
            `;
            cmsContainer.appendChild(cmsElement);
        });
    } else {
        cmsContainer.textContent = 'No CMS detected';
    }
    
    // تعبئة معلومات IP
    document.querySelector('.ip-asn').textContent = ipInfo.asn ? 
        `AS${ipInfo.asn} - ${ipInfo.asn_description || 'N/A'}` : 'N/A';
    document.querySelector('.ip-country').textContent = ipInfo.asn_country_code || 'N/A';
    document.querySelector('.ip-org').textContent = ipInfo.asn_description || 'N/A';
    
    // تعبئة معلومات الروبوتات
    const robotsInfo = response.robots_info || {};
    document.querySelector('.robots-exists').textContent = robotsInfo.exists ? 'Yes' : 'No';
    document.querySelector('.robots-content').textContent = robotsInfo.content_snippet || 
        'No robots.txt content available';
    
    // تعبئة معلومات المدفوعات
    const paymentMethods = response.payment_methods || [];
    const paymentsContainer = document.querySelector('.payments-info');
    paymentsContainer.innerHTML = '';
    
    if (paymentMethods.length > 0) {
        paymentMethods.forEach(payment => {
            const paymentElement = document.createElement('div');
            paymentElement.className = 'payment-item';
            paymentElement.textContent = payment.name;
            paymentsContainer.appendChild(paymentElement);
        });
    } else {
        paymentsContainer.textContent = 'No payment methods detected';
    }
    
    // تعبئة معلومات التتبع
    const trackers = response.trackers_and_analytics || [];
    const trackersContainer = document.querySelector('.trackers-info');
    trackersContainer.innerHTML = '';
    
    if (trackers.length > 0) {
        trackers.forEach(tracker => {
            const trackerElement = document.createElement('div');
            trackerElement.className = 'tracker-item';
            trackerElement.textContent = tracker.name;
            trackersContainer.appendChild(trackerElement);
        });
    } else {
        trackersContainer.textContent = 'No trackers detected';
    }
}

// محاكاة استجابة المسح لعرض العناصر
function simulateScanResponse() {
    const mockResponse = {
        "scan_id": "e300bd06-8bec-4081-8fb5-6d3516486505",
        "scanned_at": "2025-09-03T17:33:23.806887Z",
        "url": "http://ww1.githup.com/?terms=Digital%20Asset%20Management%20Version%20Control,Source%20Code%20Escrow%20Service,Project%20Management%20Tools,Source%20Code%20Management%20Tools",
        "title": "No Title",
        "raw_evidence": {
            "body": {
                "path": "/dev/shm/superrecon_evidence/body_2b32056bbe5033a4fe6948e642f74f1b607d735ccf1981feb9e63468bf6afdcd.bin",
                "sha256": "2b32056bbe5033a4fe6948e642f74f1b607d735ccf1981feb9e63468bf6afdcd",
                "timestamp": "2025-09-03T17:33:26.354702Z"
            },
            "headers": {
                "path": "/dev/shm/superrecon_evidence/headers_f5bfb30fb194fdff40e9cd2b070cff2ad82f5da3bbb21724d5a8519ba86c7a73.bin",
                "sha256": "f5bfb30fb194fdff40e9cd2b070cff2ad82f5da3bbb21724d5a8519ba86c7a73",
                "timestamp": "2025-09-03T17:33:26.354813Z"
            }
        },
        "technologies": [
            {"name": "HTML5"},
            {"name": "CSS3"},
            {"name": "JavaScript"},
            {"name": "jQuery"}
        ],
        "links_and_resources": {
            "js_links": [
                "http://ww1.githup.com/bPPIDlwhu.js"
            ],
            "css_links": [],
            "internal_links": [],
            "external_links": [],
            "image_links": [],
            "form_links": [],
            "api_links": [],
            "meta_tags": [
                {},
                {
                    "name": "viewport",
                    "content": "width=device-width, initial-scale=1"
                }
            ]
        },
        "dns_records": {
            "A": [
                "199.59.243.228"
            ],
            "CNAME": [
                "12065.bodis.com."
            ]
        },
        "ssl_info": {},
        "ip_info": {
            "source": "ipwhois",
            "timestamp": "2025-09-03T17:33:27.089834Z",
            "asn": "16509",
            "asn_cidr": "199.59.243.0/24",
            "asn_country_code": "US",
            "asn_description": "AMAZON-02, US",
            "network": {
                "handle": "NET-199-59-243-0-1",
                "status": [
                    "active"
                ],
                "remarks": null,
                "notices": [
                    {
                        "title": "Terms of Service",
                        "description": "By using the ARIN RDAP/Whois service, you are agreeing to the RDAP/Whois Terms of Use",
                        "links": [
                            "https://www.arin.net/resources/registry/whois/tou/  "
                        ]
                    },
                    {
                        "title": "Whois Inaccuracy Reporting",
                        "description": "If you see inaccuracies in the results, please visit: ",
                        "links": [
                            "https://www.arin.net/resources/registry/whois/inaccuracy_reporting/  "
                        ]
                    },
                    {
                        "title": "Copyright Notice",
                        "description": "Copyright 1997-2025, American Registry for Internet Numbers, Ltd.",
                        "links": null
                    }
                ],
                "links": [
                    "https://rdap.arin.net/registry/ip/199.59.243.0  ",
                    "https://whois.arin.net/rest/net/NET-199-59-243-0-1  ",
                    "https://rdap.arin.net/registry/ip/199.59.240.0/22  "
                ],
                "events": [
                    {
                        "action": "last changed",
                        "timestamp": "2021-10-15T16:41:51-04:00",
                        "actor": null
                    },
                    {
                        "action": "registration",
                        "timestamp": "2021-01-11T18:36:42-05:00",
                        "actor": null
                    }
                ],
                "raw": null,
                "start_address": "199.59.243.0",
                "end_address": "199.59.243.255",
                "cidr": "199.59.243.0/24",
                "ip_version": "v4",
                "type": "ASSIGNMENT",
                "name": "BODIS-A",
                "country": null,
                "parent_handle": "NET-199-59-240-0-1"
            }
        },
        "robots_info": {
            "exists": true,
            "content_snippet": "User-agent: *\nAllow: /\nDisallow: /?*\nDisallow: /_zc\nCrawl-delay: 120\n",
            "rules": [
                {
                    "directive": "user-agent",
                    "value": "*"
                },
                {
                    "directive": "allow",
                    "value": "/"
                },
                {
                    "directive": "disallow",
                    "value": "/?*"
                },
                {
                    "directive": "disallow",
                    "value": "/_zc"
                },
                {
                    "directive": "crawl-delay",
                    "value": "120"
                }
            ],
            "sitemaps": [],
            "fetched_from": "http://ww1.githup.com/robots.txt",
            "raw_evidence": {
                "path": "/dev/shm/superrecon_evidence/robots_ac7feb4e52fd6b99a1cbde3f2c2c375ba9f263aec80d992ca333ade3c91f4866.bin",
                "sha256": "ac7feb4e52fd6b99a1cbde3f2c2c375ba9f263aec80d992ca333ade3c91f4866",
                "timestamp": "2025-09-03T17:33:32.767570Z"
            }
        },
        "security_headers": {},
        "cms_info": [
            {
                "name": "Magento",
                "confidence": 0.375,
                "evidence": [
                    {
                        "type": "path",
                        "pattern": "mage\\/",
                        "weight": 0.3,
                        "found": true
                    },
                    {
                        "type": "meta",
                        "pattern": "magento",
                        "weight": 0.3,
                        "found": false
                    },
                    {
                        "type": "admin",
                        "pattern": "/admin/",
                        "weight": 0.2,
                        "found": false
                    }
                ],
                "source": "CMS Heuristics",
                "provenance": [
                    {
                        "type": "path",
                        "pattern": "mage\\/",
                        "weight": 0.3,
                        "found": true
                    }
                ]
            }
        ],
        "payment_methods": [],
        "trackers_and_analytics": [],
        "waf_info": {
            "detected": false,
            "provider": null,
            "confidence": 0,
            "evidence": []
        },
        "cdn_info": {
            "source": null,
            "provider": null,
            "confidence": 0,
            "reasons": []
        },
        "headers": {
            "date": "Wed, 03 Sep 2025 17:33:25 GMT",
            "content-type": "text/html; charset=utf-8",
            "content-length": "1506",
            "x-request-id": "1a98409d-5ded-4433-940a-2f4e3eba1390",
            "cache-control": "no-store, max-age=0",
            "accept-ch": "sec-ch-prefers-color-scheme",
            "critical-ch": "sec-ch-prefers-color-scheme",
            "vary": "sec-ch-prefers-color-scheme",
            "x-adblock-key": "MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBANDrp2lz7AOmADaN8tA50LsWcjLFyQFcb/P2Txc58oYOeILb3vBw7J6f4pamkAQVSQuqYsKx3YzdUHCvbVZvFUsCAwEAAQ==_ozCDFrPFlmcKM4aHUcu7Lv6Sd7UG5YlBcXDFXEdTa/QA4nAd3/tbKscxE/+52Fd2L1e8Mz1qXKiG/f1U3iiyyQ==",
            "set-cookie": "parking_session=1a98409d-5ded-4433-940a-2f4e3eba1390; expires=Wed, 03 Sep 2025 17:48:26 GMT; path=/"
        },
        "notes": "Report contains provenance (raw_evidence paths) and normalized confidence scores (0-100 for technologies).",
        "scanned_url": "http://ww1.githup.com/?terms=Digital%20Asset%20Management%20Version%20Control,Source%20Code%20Escrow%20Service,Project%20Management%20Tools,Source%20Code%20Management%20Tools",
        "waf": {
            "detected": false,
            "provider": null,
            "confidence": 0,
            "evidence": []
        },
        "cdn": {
            "source": null,
            "provider": null,
            "confidence": 0,
            "reasons": []
        },
        "payments": []
    };
    
    handleScanResponse(mockResponse);
}

// وظيفة نسخ الرد
function copyResponse() {
    const rawResponse = document.getElementById('raw-response').textContent;
    navigator.clipboard.writeText(rawResponse).then(() => {
        const copyBtn = document.querySelector('.copy-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Failed to copy response. Please try again.');
    });
}

// محاكاة تقدم المسح
function simulateScanProgress() {
    const progressBar = document.getElementById('progress-bar');
    let progress = 0;
    
    const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(simulateScanResponse, 500);
        }
        progressBar.style.width = `${progress}%`;
    }, 300);
}

// بدء عملية المسح
function startScan() {
    const urlInput = document.getElementById('url-input');
    const errorMessage = document.getElementById('error-message');
    const loadingContainer = document.getElementById('loading-container');
    const resultsContainer = document.getElementById('results-container');
    
    // التحقق من صحة الرابط
    const url = urlInput.value.trim();
    if (!url) {
        errorMessage.style.display = 'block';
        return;
    }
    
    // إخفاء رسالة الخطأ وعرض شاشة التحميل
    errorMessage.style.display = 'none';
    resultsContainer.style.display = 'none';
    loadingContainer.style.display = 'flex';
    
    // تصفير شريط التقدم
    document.getElementById('progress-bar').style.width = '0%';
    
    // محاكاة تقدم المسح
    simulateScanProgress();
}

// تهيئة التفاعل مع الواجهة
document.addEventListener('DOMContentLoaded', () => {
    // إنشاء النجوم والجسيمات
    createStars();
    
    // تعيين تفاعل الماوس
    setupMouseTrail();
    
    // إعداد زر المسح
    const scanBtn = document.getElementById('scan-btn');
    scanBtn.addEventListener('click', startScan);
    
    // السماح بالضغط على Enter
    const urlInput = document.getElementById('url-input');
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            startScan();
        }
    });
    
    // محاكاة استجابة لعرض الواجهة بشكل صحيح
    // في التطبيق الفعلي، ستتم إزالة هذا الجزء
    setTimeout(simulateScanResponse, 1500);
});

// تصدير الدوال للاستخدام في الاختبارات
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleScanResponse,
        populateResults,
        copyResponse
    };
}
