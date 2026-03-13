/**
 * Popup Email Intelligente — Maison Félicien
 * Triggers: scroll %, exit intent, inactivité
 * Ne se ré-affiche pas si déjà fermée ou soumise (localStorage)
 */
(function() {
  'use strict';

  var overlay = document.getElementById('popupOverlay');
  var popup = document.getElementById('popupEmail');
  if (!popup || !overlay) return;

  // Config from data attributes or defaults
  var scrollTrigger = 60; // %
  var inactivityDelay = 30000; // ms

  // Check if already dismissed or subscribed
  var STORAGE_KEY = 'mf_popup_dismissed';
  if (localStorage.getItem(STORAGE_KEY)) return;

  var shown = false;
  var inactivityTimer = null;

  var mgr = (window.MF && MF.engagement) || null;

  function showPopup() {
    if (shown) return;
    // Check with engagement manager — don't interrupt quiz
    if (mgr && !mgr.canShow('popup')) {
      mgr.defer('popup', showPopup);
      return;
    }
    shown = true;
    popup.classList.add('visible');
    overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
    clearTimeout(inactivityTimer);
    if (mgr) mgr.notify('popup', true);
  }

  function hidePopup() {
    popup.classList.remove('visible');
    overlay.classList.remove('visible');
    document.body.style.overflow = '';
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    if (mgr) mgr.notify('popup', false);
  }

  // ═══ TRIGGER 1: Scroll depth ═══
  function onScroll() {
    var scrollPct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
    if (scrollPct >= scrollTrigger) {
      showPopup();
      window.removeEventListener('scroll', onScroll);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // ═══ TRIGGER 2: Exit intent (desktop only) ═══
  if (window.innerWidth > 768) {
    document.addEventListener('mouseout', function(e) {
      if (e.clientY < 5 && e.relatedTarget == null) {
        showPopup();
      }
    });
  }

  // ═══ TRIGGER 3: Inactivité ═══
  function resetInactivity() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(showPopup, inactivityDelay);
  }
  ['mousemove', 'touchstart', 'keydown', 'scroll'].forEach(function(evt) {
    document.addEventListener(evt, resetInactivity, { passive: true });
  });
  resetInactivity();

  // ═══ CLOSE ═══
  document.getElementById('popupClose').addEventListener('click', hidePopup);
  overlay.addEventListener('click', hidePopup);

  // Swipe down to dismiss (mobile)
  var startY = 0;
  popup.addEventListener('touchstart', function(e) {
    startY = e.touches[0].clientY;
  }, { passive: true });
  popup.addEventListener('touchend', function(e) {
    if (e.changedTouches[0].clientY - startY > 60) {
      hidePopup();
    }
  }, { passive: true });

  // Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && shown) hidePopup();
  });

  // ═══ FORM SUBMIT ═══
  var form = document.getElementById('popup-newsletter-form');
  if (form) {
    form.addEventListener('submit', function(e) {
      // Mark as subscribed so popup never shows again
      localStorage.setItem(STORAGE_KEY, 'subscribed');
      // Let Shopify handle the form submission naturally
    });
  }

})();
