/**
 * SupportCue Chat Widget — Embeddable Script
 *
 * Companies integrate this by adding the following snippet to their website:
 *
 *   <script>
 *     window.SupportCueConfig = {
 *       companyId: "YOUR_COMPANY_ID_HERE",
 *       serverUrl: "https://your-backend.onrender.com"
 *     };
 *   </script>
 *   <script src="https://your-backend.onrender.com/widget/widget.js" async></script>
 *
 * The widget will appear as a floating chat bubble in the bottom-right corner.
 */
(function() {
  'use strict';

  const config = window.SupportCueConfig || {};
  const companyId = config.companyId;
  const serverUrl = (config.serverUrl || '').replace(/\/$/, '');

  if (!companyId) {
    console.warn('[SupportCue] window.SupportCueConfig.companyId is required.');
    return;
  }

  if (!serverUrl) {
    console.warn('[SupportCue] window.SupportCueConfig.serverUrl is required.');
    return;
  }

  // Avoid loading twice
  if (window.__SupportCueLoaded) return;
  window.__SupportCueLoaded = true;

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    #supportcue-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #supportcue-container iframe {
      border: none;
      border-radius: 24px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.4);
    }
  `;
  document.head.appendChild(style);

  // Create container
  const container = document.createElement('div');
  container.id = 'supportcue-container';
  document.body.appendChild(container);

  // Dynamically determine the frontend URL based on where this script is loaded from
  const currentScript = document.currentScript;
  const frontendUrl = currentScript ? new URL(currentScript.src).origin : serverUrl;

  // Create iframe — loads the widget app
  const iframe = document.createElement('iframe');
  const customerIdParam = config.customerId ? `&customerId=${encodeURIComponent(config.customerId)}` : '';
  const widgetUrl = `${frontendUrl}/widget?companyId=${encodeURIComponent(companyId)}${customerIdParam}`;
  iframe.src = widgetUrl;
  iframe.title = 'Customer Support Chat';
  iframe.allow = 'clipboard-write';

  // Start collapsed (just the button)
  iframe.style.width = '64px';
  iframe.style.height = '64px';
  iframe.style.transition = 'width 0.3s ease, height 0.3s ease';

  container.appendChild(iframe);

  // Listen for size change messages from the widget app
  window.addEventListener('message', function(event) {
    if (event.origin !== frontendUrl) return;
    if (!event.data || event.data.source !== 'supportcue-widget') return;

    if (event.data.type === 'resize') {
      iframe.style.width  = event.data.width  || '64px';
      iframe.style.height = event.data.height || '64px';
    }
  });

})();
