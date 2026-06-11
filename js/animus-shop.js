/**
 * ANIMUS Shop — product cards, entitlement display, payment-ready stubs.
 */
(function (g) {
  'use strict';

  var escapeHTML = g.AnimusShared.escapeHTML;

  function toast(msg, durationMs) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, durationMs || 3200);
  }

  function showCheckoutConfigBanner(status) {
    var el = document.getElementById('shopCheckoutBanner');
    if (!el || !status) return;
    el.classList.remove('is-success', 'is-warning');
    if (status.checkoutReady) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.hidden = false;
    el.classList.add('is-warning');
    if (status.warning) {
      el.textContent = status.warning;
      return;
    }
    var vars = (status.missing || []).join(', ');
    el.textContent =
      'Checkout is not available on this server yet. An admin must add ' +
      vars +
      ' in Vercel environment variables and redeploy.';
  }

  function loadPaymentsStatus() {
    return fetch('/api/payments-status')
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        showCheckoutConfigBanner(data);
        return data;
      })
      .catch(function () {
        return null;
      });
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

  function renderComparisonTable() {
    var mount = document.getElementById('shopCompareMount');
    if (!mount) return;
    var freeCompares =
      g.AnimusEntitlements && g.AnimusEntitlements.FREE_COMPARES_PER_MONTH
        ? g.AnimusEntitlements.FREE_COMPARES_PER_MONTH
        : 10;
    mount.innerHTML =
      '<table class="shop-compare-table">' +
      '<thead><tr>' +
      '<th scope="col">Feature</th>' +
      '<th scope="col">Free</th>' +
      '<th scope="col" class="shop-col-paid">Detailed</th>' +
      '<th scope="col" class="shop-col-paid">Estimator</th>' +
      '<th scope="col" class="shop-col-paid">Plus</th>' +
      '</tr></thead><tbody>' +
      row(
        'Core assessment',
        'Full 14-dimension map',
        '<span class="shop-compare-highlight">Extended depth + richer AI narrative</span><span class="shop-compare-note">Every layer unpacked with precision</span>',
        '—',
        'Everything in Free + paid packs'
      ) +
      row(
        'Dimensional analysis',
        'Summary profile',
        '<span class="shop-compare-highlight">Full-depth scoring across all dimensions</span>',
        '—',
        'Unlimited depth on your map'
      ) +
      row(
        'Behavioral estimation',
        '—',
        '—',
        '<span class="shop-compare-highlight">Estimate anyone from real observed behavior</span><span class="shop-compare-note">Separate from friends — built for coworkers, family, rivals</span>',
        'Included with Estimator purchase'
      ) +
      row(
        'Monthly compares',
        freeCompares + ' compares',
        freeCompares + ' compares',
        freeCompares + ' compares',
        '<span class="shop-compare-yes">Unlimited</span><span class="shop-compare-note">Compare as often as insight strikes</span>'
      ) +
      row(
        'Group compare',
        '—',
        '—',
        '—',
        '<span class="shop-compare-highlight">Up to 6 people at once</span><span class="shop-compare-note">See group chemistry in one view</span>'
      ) +
      row(
        'XP progression',
        'Standard earn rate',
        'Standard',
        'Standard',
        '<span class="shop-compare-yes">1.25× on all XP</span>'
      ) +
      row(
        'Shop pricing',
        '—',
        '—',
        '—',
        '<span class="shop-compare-yes">20% off all packs</span>'
      ) +
      row(
        'Career & lifestyle guides',
        '—',
        '—',
        '—',
        '<span class="shop-compare-highlight">3 AI PDF guides / month</span><span class="shop-compare-note">Personalized to your full profile</span>'
      ) +
      row(
        'Profile badge',
        '—',
        '—',
        '—',
        '<span class="shop-compare-yes">Plus badge</span>'
      ) +
      '</tbody></table>' +
      '<p class="shop-compare-foot">Free gets you a rigorous baseline. Paid packs unlock professional-grade depth, behavioral estimation, and social insight — Plus is the membership if you compare often.</p>';

    function row(feature, free, detailed, estimator, plus) {
      return (
        '<tr class="shop-compare-row">' +
        '<td class="shop-compare-feature">' +
        escapeHTML(feature) +
        '</td>' +
        '<td>' +
        cell(free) +
        '</td><td>' +
        cell(detailed) +
        '</td><td>' +
        cell(estimator) +
        '</td><td>' +
        cell(plus) +
        '</td></tr>'
      );
    }

    function cell(val) {
      if (val === '—') return '<span class="shop-compare-muted">—</span>';
      return val;
    }
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

  function reloadUserProducts() {
    var user = g.auth && g.auth.currentUser;
    if (!user || !g.db) return Promise.resolve();
    return g.db
      .collection('users')
      .doc(user.uid)
      .get()
      .then(function (doc) {
        var data = doc.exists ? doc.data() : {};
        var ent = g.AnimusEntitlements.normalizeUserEntitlements(data);
        renderProducts(ent, data);
        renderPlusStatus(data);
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

    toast('Opening secure checkout…');
    if (typeof g.AnimusAnalytics !== 'undefined' && g.AnimusAnalytics.track) {
      g.AnimusAnalytics.track('checkout_start', { product_id: productId });
    }

    user
      .getIdToken()
      .then(function (token) {
        return fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
          },
          body: JSON.stringify({ productId: productId })
        });
      })
      .then(function (r) {
        return r.json().then(function (data) {
          return { ok: r.ok, data: data };
        });
      })
      .then(function (res) {
        if (res.ok && res.data && res.data.url) {
          if (typeof g.AnimusAnalytics !== 'undefined' && g.AnimusAnalytics.track) {
            g.AnimusAnalytics.track('checkout_redirect', { product_id: productId });
          }
          g.location.href = res.data.url;
          return;
        }
        var err = (res.data && res.data.error) || 'Could not start checkout.';
        var longMsg =
          err.indexOf('Environment Variables') !== -1 ||
          err.indexOf('test mode') !== -1 ||
          err.indexOf('sk_live_') !== -1;
        toast(err, longMsg ? 9000 : 3200);
      })
      .catch(function () {
        toast('Checkout unavailable. Try again or contact support.');
      });
  }

  function handleCheckoutReturn() {
    var params;
    try {
      params = new URLSearchParams(g.location.search);
    } catch (e) {
      return;
    }
    var status = params.get('checkout');
    if (!status) return;

    if (status === 'cancelled') {
      toast('Checkout cancelled.');
      try {
        g.history.replaceState(null, '', '/shop');
      } catch (e) {}
      return;
    }

    if (status !== 'success') return;

    var sessionId = params.get('session_id');
    var user = g.auth && g.auth.currentUser;
    if (!user || !sessionId) {
      toast('Payment received — refresh in a moment if items are not unlocked.');
      try {
        g.history.replaceState(null, '', '/shop');
      } catch (e) {}
      reloadUserProducts();
      return;
    }

    toast('Confirming your purchase…');

    user
      .getIdToken()
      .then(function (token) {
        return fetch('/api/fulfill-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
          },
          body: JSON.stringify({ sessionId: sessionId })
        });
      })
      .then(function (r) {
        return r.json().then(function (data) {
          return { ok: r.ok, data: data };
        });
      })
      .then(function (res) {
        try {
          g.history.replaceState(null, '', '/shop');
        } catch (e) {}
        if (res.ok && res.data && res.data.ok) {
          if (typeof g.AnimusAnalytics !== 'undefined' && g.AnimusAnalytics.track) {
            g.AnimusAnalytics.track('purchase_complete', {});
          }
          toast('Purchase complete — thank you!');
          reloadUserProducts();
          return;
        }
        toast((res.data && res.data.error) || 'Payment pending — refresh shortly.');
        reloadUserProducts();
      })
      .catch(function () {
        toast('Payment received — refresh if your unlock is not visible yet.');
        reloadUserProducts();
      });
  }

  function renderPlusStatus(userData) {
    var el = document.getElementById('shopPlusStatus');
    if (!el) return;
    el.classList.remove('is-loading', 'animus-skeleton');
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
    renderComparisonTable();
    loadPaymentsStatus();
    auth.onAuthStateChanged(function (user) {
      if (!user) {
        renderProducts(g.AnimusEntitlements.defaultEntitlements(), null);
        var status = document.getElementById('shopPlusStatus');
        if (status) {
          status.classList.remove('is-loading', 'animus-skeleton');
          status.textContent = 'Sign in to see your plan and compare allowance.';
        }
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

  g.AnimusShop = {
    boot: boot,
    requestPurchase: requestPurchase,
    handleCheckoutReturn: handleCheckoutReturn,
    reloadUserProducts: reloadUserProducts
  };
})(typeof window !== 'undefined' ? window : globalThis);
