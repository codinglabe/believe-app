<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Donate with BelieveCash — Believe In Unity</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/embed/donate-widget/biu-donate-widget.css">
</head>
<body class="biu-page">
  <div class="biu-donate-widget" data-org-slug="{{ $orgSlug }}">
    <header class="biu-header">
      <div class="biu-header-glow" aria-hidden="true"></div>

      <div class="biu-logo">
        <img data-biu-logo src="/favicon-96x96.png" alt="Believe In Unity">
      </div>

      <div class="biu-header-copy">
        <p class="biu-eyebrow">Donate with</p>
        <h1 class="biu-title">BelieveCash</h1>
        <p class="biu-subtitle">Earn Believe Reward Points – BRP</p>
        <p class="biu-description">The Preferred Way to Support Your Favorite Cause</p>
      </div>

      <div class="biu-coin-wrap" aria-hidden="true">
        <div class="biu-coin-pedestal"></div>
        <svg class="biu-coin" viewBox="0 0 120 120">
          <defs>
            <radialGradient id="coinGrad" cx="32%" cy="28%" r="68%">
              <stop offset="0%" stop-color="#fff8d6"/>
              <stop offset="42%" stop-color="#e8c547"/>
              <stop offset="100%" stop-color="#9a7209"/>
            </radialGradient>
            <filter id="coinShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.35"/>
            </filter>
          </defs>
          <circle cx="60" cy="60" r="52" fill="url(#coinGrad)" stroke="#b8860b" stroke-width="3" filter="url(#coinShadow)"/>
          <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
          <text x="60" y="56" text-anchor="middle" font-size="17" font-weight="800" fill="#4a3a00" font-family="Inter, sans-serif">BRP</text>
          <text x="60" y="74" text-anchor="middle" font-size="11" fill="#5c4a00" font-family="Inter, sans-serif">★ ★ ★ ★ ★</text>
        </svg>
      </div>
    </header>

    <main class="biu-body">
      <h2 class="biu-section-title">Multiple Ways to Give</h2>

      <div class="biu-payment-options">
        <button type="button" class="biu-pay-card biu-pay-card--cashapp" onclick="openCashApp()">
          <div class="biu-pay-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/><text x="12" y="16" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">$</text></svg>
          </div>
          <div class="biu-pay-name">Cash App</div>
          <div class="biu-pay-meta"><span class="biu-meta-icon">⚡</span> Quick Payment</div>
          <span class="biu-pay-cta">Pay with Cash App</span>
        </button>

        <button type="button" class="biu-pay-card biu-pay-card--zelle" onclick="openZelle()">
          <div class="biu-pay-icon biu-pay-icon--zelle">Zelle</div>
          <div class="biu-pay-name">Zelle</div>
          <div class="biu-pay-meta"><span class="biu-meta-icon">🏦</span> Bank-to-Bank Transfer</div>
          <span class="biu-pay-cta">Pay with Zelle</span>
        </button>

        <button type="button" class="biu-pay-card biu-pay-card--believecash" onclick="openBelieveCash()">
          <span class="biu-ribbon">★ EARN BRP REWARDS ★</span>
          <div class="biu-pay-icon biu-pay-icon--believecash">
            <img data-biu-logo src="/favicon-96x96.png" alt="">
          </div>
          <div class="biu-pay-name">BelieveCash</div>
          <div class="biu-pay-meta">Fast • Secure • Low Fees</div>
          <ul class="biu-feature-list">
            <li>Earn BRP Rewards</li>
            <li>Support Nonprofits</li>
            <li>Track Giving History</li>
            <li>Future Marketplace Discounts</li>
            <li>Future Volunteer Rewards</li>
          </ul>
          <span class="biu-pay-cta">Donate with BelieveCash →</span>
        </button>

        <button type="button" class="biu-pay-card biu-pay-card--card" onclick="openCardAch()">
          <div class="biu-pay-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <path d="M2 10h20"/>
            </svg>
          </div>
          <div class="biu-pay-name">Card / ACH</div>
          <div class="biu-pay-meta"><span class="biu-meta-icon">🔒</span> Traditional Giving</div>
          <span class="biu-pay-cta">Pay with Card / ACH</span>
        </button>
      </div>
    </main>

    <footer class="biu-footer">
      <div class="biu-footer-brand">
        <img data-biu-logo src="/favicon-96x96.png" alt="Believe In Unity">
        <span>Believe In Unity</span>
      </div>

      <div class="biu-footer-trust">
        <div class="biu-trust-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <p>Secure. Transparent. Community Driven. Your donation makes a difference. Thank you for supporting our mission.</p>
      </div>

      <div class="biu-footer-powered">
        <a data-biu-home href="https://believeinunity.org" target="_blank" rel="noopener noreferrer">
          Powered by Believe In Unity
        </a>
        <a class="biu-footer-site" data-biu-home href="https://believeinunity.org" target="_blank" rel="noopener noreferrer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span data-biu-site-url>believeinunity.org</span>
        </a>
      </div>
    </footer>
  </div>

  <script src="/embed/donate-widget/biu-donate-widget.js"></script>
</body>
</html>
