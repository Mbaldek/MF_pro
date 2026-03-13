/**
 * Countdown Timer — Maison Félicien
 * Supports "drop" (target date) and "delivery" (daily cutoff) modes.
 */
(function() {
  'use strict';

  var els = document.querySelectorAll('.countdown');
  if (!els.length) return;

  for (var i = 0; i < els.length; i++) {
    initCountdown(els[i]);
  }

  function initCountdown(el) {
    var mode = el.getAttribute('data-mode');
    var targetStr = el.getAttribute('data-target');
    var cutoff = parseInt(el.getAttribute('data-cutoff'), 10) || 18;

    var daysEl = el.querySelector('[data-days]');
    var hoursEl = el.querySelector('[data-hours]');
    var minsEl = el.querySelector('[data-mins]');
    var secsEl = el.querySelector('[data-secs]');

    function getTarget() {
      if (mode === 'drop' && targetStr) {
        return new Date(targetStr).getTime();
      }
      // Delivery mode: today at cutoff hour, or tomorrow if past cutoff
      var now = new Date();
      var t = new Date(now);
      t.setHours(cutoff, 0, 0, 0);
      if (now >= t) {
        t.setDate(t.getDate() + 1);
      }
      return t.getTime();
    }

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function tick() {
      var now = Date.now();
      var target = getTarget();
      var diff = Math.max(0, target - now);

      var totalSecs = Math.floor(diff / 1000);
      var days = Math.floor(totalSecs / 86400);
      var hours = Math.floor((totalSecs % 86400) / 3600);
      var mins = Math.floor((totalSecs % 3600) / 60);
      var secs = totalSecs % 60;

      if (daysEl) daysEl.textContent = pad(days);
      if (hoursEl) hoursEl.textContent = pad(hours);
      if (minsEl) minsEl.textContent = pad(mins);
      if (secsEl) secsEl.textContent = pad(secs);

      if (diff <= 0) {
        el.style.display = 'none';
        return;
      }
      requestAnimationFrame(function() {
        setTimeout(tick, 1000);
      });
    }

    tick();
  }
})();
