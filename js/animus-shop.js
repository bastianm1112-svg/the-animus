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

  function priceHtml(product, userData) {
    var E = g.AnimusEntitlements;
    if (!E) return '$' + product.price;
    if (product.type === 'subscription') return '$' + product.price + '/mo';
    var plus = E.hasAnimusPlus(userData || {});
    if (!plus) return '$' + E.formatMoney(product.price);
    var discounted = E.getProductPrice(product.id, userData);
    if (discounted >= product.price) return '$' + E.formatMoney(product.price);
    return (
      '<span class="shop-price-discount">' +
      '<span class="shop-price-was">$' +
      E.formatMoney(product.price) +
      '</span>' +
      '<span class="shop-price-now">$' +
      E.formatMoney(discounted) +
      '</span>' +
      '<span class="shop-plus-discount-note">Plus 20% off</span>' +
      '</span>'
    );
  }

  function perksHtml(productId) {
    if (productId !== 'animusPlus' || !g.AnimusEntitlements.PLUS_PERKS) return '';
    return (
      '<ul class="shop-perks-list">' +
      g.AnimusEntitlements.PLUS_PERKS.map(function (line) {
        return '<li>' + escapeHTML(line) + '</li>';
      }).join('') +
      '</ul>'
    );
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

  function renderProducts(ent, userData) {
    var grid = document.getElementById('shopGrid');
    if (!grid || !g.AnimusEntitlements) return;
    userData = userData || { entitlements: ent };
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
          (id === 'animusPlus' ? ' shop-card-plus' : '') +
          '">' +
          badge +
          '<h2 class="shop-card-title">' +
          escapeHTML(p.name) +
          '</h2>' +
          '<p class="shop-card-desc">' +
          escapeHTML(p.description) +
          '</p>' +
          perksHtml(id) +
          '<div class="shop-card-foot">' +
          '<span class="shop-price">' +
          priceHtml(p, userData) +
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
    if (!g.db) {
      toast('Secure checkout coming soon.');
      return;
    }
    return g.db
      .collection('users')
      .doc(user.uid)
      .get()
      .then(function (doc) {
        userData = doc.exists ? doc.data() : {};
        var price =
          p.type === 'subscription'
            ? p.price
            : g.AnimusEntitlements.getProductPrice(productId, userData);
        var label = g.AnimusEntitlements.formatMoney(price);
        toast(
          'Secure checkout (Stripe) coming soon. Plus members pay $' +
            label +
            ' for this item. Ask an admin to enable ' +
            p.name +
            ' meanwhile.'
        );
      })
      .catch(function () {
        toast('Secure checkout coming soon. Contact support or ask an admin to enable ' + p.name + '.');
      });
  }

  function renderPlusStatus(userData) {
    var el = document.getElementById('shopPlusStatus');
    if (!el) return;
    var plus = g.AnimusEntitlements.hasAnimusPlus(userData);
    var remaining = g.AnimusEntitlements.getCompareRemaining(userData);
    if (plus) {
      var pdfLeft = g.AnimusEntitlements.getCareerPdfRemaining(userData);
      el.textContent =
        'Animus Plus active — unlimited compares, group compare, 1.25× XP, 20% Shop discount. ' +
        pdfLeft +
        ' career guide' +
        (pdfLeft === 1 ? '' : 's') +
        ' left this month.';
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
        renderProducts(g.AnimusEntitlements.defaultEntitlements(), null);
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
          renderProducts(ent, data);
          renderPlusStatus(data);
        });
    });
  }

  g.AnimusShop = { boot: boot, requestPurchase: requestPurchase };
})(typeof window !== 'undefined' ? window : globalThis);
