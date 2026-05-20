(function () {
    'use strict';

    var API_URL = '__TRACKER_BASE_URL__';

    var scriptTag = document.currentScript;
    var API_KEY = scriptTag ? scriptTag.getAttribute('data-key') : null;

    if (!API_KEY) {
        console.warn('[SaasAnalytics] Missing data-key on script tag.');
        return;
    }
    // VISITOR ID
    // Persists in localStorage forever — identifies same browser
    // across sessions. Never contains personal data.
    function getVisitorId() {
        var key = 'sa_vid';
        try {
            var id = localStorage.getItem(key);
            if (!id) {
                id = 'v_' + Math.random().toString(36).substr(2, 9)
                    + Date.now().toString(36);
                localStorage.setItem(key, id);
            }
            return id;
        } catch (e) {
            return 'v_tmp_' + Math.random().toString(36).substr(2, 9);
        }
    }

    // SESSION MANAGEMENT
    // Stored in localStorage:
    //   sa_session_id    → current session UUID
    //   sa_session_start → when session started (ms timestamp)
    //   sa_last_active   → last event time (ms timestamp)
    //   sa_visit_count   → total number of visits (for new/returning)
    var SESSION_TIMEOUT_MS = 30 * 60 * 1000;  // 30 minutes

    function generateId(prefix) {
        return (prefix || 's') + '_'
            + Math.random().toString(36).substr(2, 9)
            + Date.now().toString(36);
    }

    function getSession() {
        try {
            var now = Date.now();
            var sessionId = localStorage.getItem('sa_session_id');
            var lastActive = parseInt(localStorage.getItem('sa_last_active') || '0');
            var sessionStart = parseInt(localStorage.getItem('sa_session_start') || '0');
            var visitCount = parseInt(localStorage.getItem('sa_visit_count') || '0');
            var isNew = !visitCount;

            // Start a new session if:
            // 1. No session exists yet
            // 2. Last activity was more than 30 minutes ago
            var expired = sessionId && (now - lastActive) > SESSION_TIMEOUT_MS;

            if (!sessionId || expired) {
                sessionId = generateId('s');
                sessionStart = now;
                visitCount += 1;
                isNew = visitCount === 1;

                localStorage.setItem('sa_session_id', sessionId);
                localStorage.setItem('sa_session_start', sessionStart);
                localStorage.setItem('sa_visit_count', visitCount);
            }
            // Always update last active time
            localStorage.setItem('sa_last_active', now);
            return {
                session_id: sessionId,
                session_start: sessionStart,
                visit_count: visitCount,
                is_new_visitor: isNew
            };
        } catch (e) {
            return {
                session_id: generateId('s'),
                session_start: Date.now(),
                visit_count: 1,
                is_new_visitor: true
            }
        };
    }

    // UTM PARAMETER PARSING
    //
    // Reads UTM tags from the URL:
    // ?utm_source=google&utm_medium=cpc&utm_campaign=summer_sale
    //
    // These are stored in sessionStorage so they persist across
    // pages within the same session (just like GA does it).
    function parseUTM() {
        try {
            var params = new URLSearchParams(window.location.search);
            var utm = {};
            var keys = ['utm_source', 'utm_medium', 'utm_campaign',
                'utm_content', 'utm_term'];

            var hasUTM = false;
            keys.forEach(function (k) {
                if (params.get(k)) {
                    utm[k] = params.get(k);
                    hasUTM = true;
                }
            }
            );

            // If this page has UTM params, store them for the session
            if (hasUTM) {
                sessionStorage.setItem('sa_utm', JSON.stringify(utm));
            }

            // Return stored UTM (from earlier in session) or current
            var stored = sessionStorage.getItem('sa_utm');
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            return {};
        }
    }

    // REFERRER CATEGORIZATION
    // Converts raw referrer URLs into readable source categories:
    //   google.com → "google"
    //   facebook.com → "social"
    //   (empty) → "direct"
    //   same domain → ignored
    function categorizeReferrer(referrer) {
        if (!referrer) return { source: 'direct', referrer_url: '' };
        var ref = referrer.toLowerCase();

        // Same domain = internal navigation, not a referrer
        if (ref.includes(window.location.hostname)) {
            return { source: 'internal', referrer_url: referrer };
        }

        var categories = [
            { pattern: /(google|bing|yahoo|duckduckgo|baidu|yandex)/, source: 'search' },
            { pattern: /(facebook|instagram|twitter|x\.com|linkedin|tiktok|pinterest|reddit|snapchat)/, source: 'social' },
            { pattern: /(gmail|outlook|yahoo.*mail|mail\.)/, source: 'email' },
            { pattern: /(youtube|vimeo|twitch)/, source: 'video' }
        ];

        for (var i = 0; i < categories.length; i++) {
            if (categories[i].pattern.test(ref)) {
                return {
                    source: categories[i].source,
                    referrer_url: referrer
                };
            }

        }

        return { source: 'other', referrer_url: referrer };
    }

    // DEVICE AND BROWSER DETECTION
    function getDeviceInfo() {

        var ua = navigator.userAgent;

        var device = 'desktop';
        if (/iPad/i.test(ua)) device = 'tablet';
        else if (/Mobi|Android|iPhone/i.test(ua)) device = 'mobile';

        var browser = 'other';
        if (/Edg/i.test(ua)) browser = 'edge';
        else if (/Chrome/i.test(ua) && !/Chromium/i.test(ua)) browser = 'chrome';
        else if (/Firefox/i.test(ua)) browser = 'firefox';
        else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'safari';
        else if (/OPR|Opera/i.test(ua)) browser = 'opera';

        var os = 'other';
        if (/Windows/i.test(ua)) os = 'windows';
        else if (/Mac OS/i.test(ua)) os = 'macos';
        else if (/Linux/i.test(ua)) os = 'linux';
        else if (/Android/i.test(ua)) os = 'android';
        else if (/iOS|iPhone|iPad/i.test(ua)) os = 'ios';

        return { device: device, browser: browser, os: os };
    }

    // CORE: SEND EVENT
    var visitorId = getVisitorId();

    function sendEvent(eventName, page, extraMetadata) {
        var session = getSession();
        var deviceInfo = getDeviceInfo();
        var refInfo = categorizeReferrer(document.referrer);
        var utmParams = parseUTM();

        var metadata = Object.assign({
            // Session data
            session_id: session.session_id,
            session_start: session.session_start,
            is_new_visitor: session.is_new_visitor,
            visit_count: session.visit_count,

            // Device data
            device: deviceInfo.device,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            screen_width: window.screen.width,
            screen_height: window.screen.height,
            language: navigator.language || 'unknown',

            // Referrer data
            referrer_source: refInfo.source,
            referrer_url: refInfo.referrer_url,

            // Page data
            title: document.title,
            url: window.location.href

        }, utmParams, extraMetadata || {});

        var payload = {
            user_id: visitorId,
            event: eventName,
            page: page || window.location.pathname,
            metadata: metadata
        };

        var endpoint = API_URL + '/api/events/track';
        console.log('[SaasAnalytics] Sending event:', endpoint, payload);

        // sendBeacon for reliable delivery on page unload
        if (eventName === 'time_on_page' && navigator.sendBeacon) {
            var blob = new Blob(
                [JSON.stringify(payload)],
                { type: 'application/json' }
            );
            navigator.sendBeacon(endpoint + '?api_key=' + API_KEY, blob);
        } else {
            fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(function () { });
        }
    }

    // AUTO-TRACKING: PAGE VIEW
    var pageStartTime = Date.now();

    function trackPageView(path) {
        pageStartTime = Date.now();
        sendEvent('page_view', path || window.location.pathname);
    }

    trackPageView();

    // AUTO-TRACKING: TIME ON PAGE
    // Uses both visibilitychange and pagehide for reliability.
    // visibilitychange fires when tab loses focus.
    // pagehide fires when navigating away.
    var timeSent = false;

    function sendTimeOnPage() {

        if (timeSent) return;
        timeSent = true;
        var seconds = Math.round((Date.now() - pageStartTime) / 1000);
        if (seconds < 1) return;
        sendEvent('time_on_page', window.location.pathname, {
            seconds: seconds
        });
    }

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') sendTimeOnPage();
        // Reset if user comes back to tab
        if (document.visibilityState === 'visible') {
            timeSent = false;
            pageStartTime = Date.now();
        }
    });
    window.addEventListener('pagehide', sendTimeOnPage);

    // AUTO-TRACKING: SCROLL DEPTH
    // Fires once each at 25, 50, 75, 100 percent.
    var scrollMilestones = { 25: false, 50: false, 75: false, 100: false };

    window.addEventListener('scroll', function () {
        var scrolled = window.scrollY + window.innerHeight;
        var total = document.documentElement.scrollHeight;
        if (total <= 0) return;
        var pct = Math.round((scrolled / total) * 100);
        [25, 50, 75, 100].forEach(function (m) {
            if (pct >= m && !scrollMilestones[m]) {

                scrollMilestones[m] = true;
                sendEvent('scroll_depth', window.location.pathname, {
                    depth_percent: m
                });
            }
        });
    }, { passive: true });

    // AUTO-TRACKING: CLICKS (buttons + links)
    document.addEventListener('click', function (e) {
        var target = e.target;
        while (target && target !== document.body) {
            var tag = (target.tagName || '').toLowerCase();
            if (tag === 'button' || tag === 'a') {

                var text = (target.innerText || '').trim().substr(0, 100);
                var href = target.getAttribute('href') || '';

                // Detect outbound links
                var isOutbound = href.startsWith('http') &&
                    !href.includes(window.location.hostname);

                sendEvent(
                    isOutbound ? 'outbound_link' : 'click',
                    window.location.pathname,
                    { element: tag, text: text, href: href }
                );
                break;
            }
            target = target.parentNode;
        }
    }, { passive: true });

    // AUTO-TRACKING: FORM SUBMISSIONS
    document.addEventListener('submit', function (e) {
        var form = e.target;
        var formId = form.id || '';
        var formName = form.name || '';
        var formAction = form.action || '';

        sendEvent('form_submit', window.location.pathname, {
            form_id: formId,
            form_name: formName,
            form_action: formAction
        });
    }, { passive: true });

    // SPA SUPPORT (React, Vue, Next.js, Angular)
    //
    // Single Page Apps change the URL without a full page reload.
    // We hook into the History API to detect these navigations
    // and fire a new page_view for each route change.
    var lastPath = window.location.pathname;

    function onRouteChange() {
        var newPath = window.location.pathname;
        if (newPath !== lastPath) {
            // Send time on page for the previous route
            sendTimeOnPage();

            // Reset for new route
            lastPath = newPath;
            timeSent = false;
            pageStartTime = Date.now();

            // Reset scroll milestones for new page
            scrollMilestones = { 25: false, 50: false, 75: false, 100: false };

            // Track new page view
            trackPageView(newPath);
        }
    }

    // Wrap pushState and replaceState to detect SPA navigation
    var _pushState = history.pushState;
    var _replaceState = history.replaceState;

    history.pushState = function () {
        _pushState.apply(history, arguments);
        onRouteChange();
    };
    history.replaceState = function () {
        _replaceState.apply(history, arguments);
        onRouteChange();
    };

    // Also listen for browser back/forward buttons
    window.addEventListener('popstate', onRouteChange);

    // window.SaasAnalytics.track("event_name", {{ key: value }})
    window.SaasAnalytics = {
        track: function (eventName, metadata) {
            if (!eventName) return;
            sendEvent(eventName, window.location.pathname, metadata || {});
        },
        getVisitorId: function () { return visitorId; },
        getSession: function () { return getSession(); }
    };

    console.log('[SaasAnalytics] v2 initialized.');

})();