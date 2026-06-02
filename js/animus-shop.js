/**
 * ANIMUS Shop — product cards, entitlement display, payment-ready stubs.
 */
(function (g) {
  'use strict';

  function escapeHTML(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 3200);
  }

  function priceLabel(product) {
    if (product.type === 'subscription') return '$' + product.price + '/mo';
    return '$' + product.price;
  }

  function ownedLabel(productId, ent) {
    if (productId === 'detailedBundle') {
      if (ent.detailedTest && ent.testEstimator) return 'Owned';
      return '';
    }
    if (productId === 'animusPlus' && g.AnimusEntitlements.hasAnimusPlus({ entitlements: ent })) return 'Active';
    if (ent[productId]) return 'Owned';
    return '';
  }

  function ownedAction(productId, ent) {
    if (productId === 'detailedTest' && ent.detailedTest) {
      return '<a href="/test?mode=detailed" class="shop-buy-btn shop-open-link">Open</a>';
    }
    if (productId === 'testEstimator' && ent.testEstimator) {
      return '<a href="/activity" class="shop-buy-btn shop-open-link">Open</a>';
    }
    if (productId === 'detailedBundle' && ent.detailedTest && ent.testEstimator) {
      return '<span class="shop-owned">Owned</span>';
    }
    if (productId === 'animusPlus' && g.AnimusEntitlements.hasAnimusPlus({ entitlements: ent })) {
      return '<span class="shop-owned">Active</span>';
    }
    var owned = ownedLabel(productId, ent);
    if (owned) return '<span class="shop-owned">' + escapeHTML(owned) + '</span>';
    return '<button type="button" class="shop-buy-btn" data-product="' + escapeHTML(productId) + '">Get</button>';
  }

  function renderProducts(ent) {
    var grid = document.getElementById('shopGrid');
    if (!grid || !g.AnimusEntitlements) return;
    var products = g.AnimusEntitlements.PRODUCTS;
    var order = ['detailedBundle', 'detailedTest', 'testEstimator', 'animusPlus'];
    grid.innerHTML = order
      .map(function (id) {
        var p = products[id];
        if (!p) return '';
        var badge =
          p.badge
            ? '<div class="shop-deal-banner">' +
              escapeHTML(p.badge) +
              (p.savings ? '<span class="shop-deal-save">' + escapeHTML(p.savings) + '</span>' : '') +
              '</div>'
            : '';
        return (
          '<article class="shop-card' +
          (p.badge ? ' shop-card-featured' : '') +
          '">' +
          badge +
          '<h2 class="shop-card-title">' +
          escapeHTML(p.name) +
          '</h2>' +
          '<p class="shop-card-desc">' +
          escapeHTML(p.description) +
          '</p>' +
          '<div class="shop-card-foot">' +
          '<span class="shop-price">' +
          priceLabel(p) +
          '</span>' +
          (ownedAction(id, ent)) +
          '</div></article>'
        );
      })
      .join('');

    grid.querySelectorAll('.shop-buy-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        requestPurchase(btn.getAttribute('data-product'));
      });
    });
  }

  function requestPurchase(productId) {
    var user = g.auth && g.auth.currentUser;
    if (!user) {
      g.location.href = '/login?next=' + encodeURIComponent('/shop');
      return;
    }
    var p = g.AnimusEntitlements.PRODUCTS[productId];
    if (!p) return;
    toast('Secure checkout coming soon. Contact support or ask an admin to enable ' + p.name + ' on your account.');
  }

  function renderPlusStatus(userData) {
    var el = document.getElementById('shopPlusStatus');
    if (!el) return;
    var plus = g.AnimusEntitlements.hasAnimusPlus(userData);
    var remaining = g.AnimusEntitlements.getCompareRemaining(userData);
    if (plus) {
      el.textContent = 'Animus Plus active — unlimited compares this month.';
    } else {
      el.textContent =
        remaining + ' of ' + g.AnimusEntitlements.FREE_COMPARES_PER_MONTH + ' free compares left this month.';
    }
  }

  function boot(auth, db) {
    g.auth = auth;
    g.db = db;
    auth.onAuthStateChanged(function (user) {
      if (!user) {
        renderProducts(g.AnimusEntitlements.defaultEntitlements());
        var status = document.getElementById('shopPlusStatus');
        if (status) status.textContent = 'Sign in to see your plan and compare allowance.';
        return;
      }
      db.collection('users')
        .doc(user.uid)
        .get()
        .then(function (doc) {
          var data = doc.exists ? doc.data() : {};
          var ent = g.AnimusEntitlements.normalizeUserEntitlements(data);
          renderProducts(ent);
          renderPlusStatus(data);
        });
    });
  }

  g.AnimusShop = { boot: boot, requestPurchase: requestPurchase };
})(typeof window !== 'undefined' ? window : globalThis);
