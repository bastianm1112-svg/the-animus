(function (g) {
  'use strict';

  function mount() {
    var host = document.getElementById('culturalModule');
    if (!host || !g.AnimusShared || !g.AnimusShared.fetchApiGet) return;
    var user = firebase.auth && firebase.auth().currentUser;
    if (!user) {
      host.innerHTML = '';
      return;
    }
    firebase.firestore().collection('users').doc(user.uid).get().then(function (doc) {
      var plus = g.AnimusEntitlements && g.AnimusEntitlements.hasAnimusPlus(doc.data() || {});
      if (!plus) {
        host.innerHTML = (g.AnimusResultsUI
          ? g.AnimusResultsUI.insightCard('Cultural axis', '', true, true)
          : '');
        return;
      }
      return g.AnimusShared.fetchApiGet('/api/cultural').then(function (r) {
        return r.json();
      }).then(function (data) {
        if (!data.items) throw new Error(data.error || 'Unavailable');
        var html = '<div class="animus-card"><div class="animus-card-kicker">Plus</div><h3 class="animus-card-title">Cultural axis</h3><p>' +
          (g.AnimusShared.escapeHTML(data.meaning || '')) + '</p>';
        if (data.polZ != null && g.AnimusResultsUI) html += g.AnimusResultsUI.culturalSlider(data.polZ);
        html += '<form id="culturalForm">';
        data.items.forEach(function (q) {
          html += '<label class="animus-fine" style="display:block;margin:12px 0 4px">' + g.AnimusShared.escapeHTML(q.t) + '</label>' +
            '<input type="range" min="1" max="7" value="4" name="' + q.id + '" aria-label="Cultural item">';
        });
        html += '<p><button type="submit" class="btn-primary">Save cultural scores</button></p></form></div>';
        host.innerHTML = html;
        document.getElementById('culturalForm').addEventListener('submit', function (e) {
          e.preventDefault();
          var items = data.items.map(function (q) {
            var el = document.querySelector('[name="' + q.id + '"]');
            return { id: q.id, raw: el ? Number(el.value) : 4 };
          });
          g.AnimusShared.fetchApiPost('/api/cultural', { items: items }).then(function (r) {
            return r.json();
          }).then(function (out) {
            if (out.error) throw new Error(out.error);
            if (g.AnimusResultsUI) {
              host.insertAdjacentHTML('afterbegin', g.AnimusResultsUI.culturalSlider(out.polZ));
            }
          }).catch(function (err) {
            alert(err.message || 'Could not save');
          });
        });
      });
    }).catch(function () {});
  }

  g.AnimusCulturalUI = { mount: mount };
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().onAuthStateChanged(function () { mount(); });
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
