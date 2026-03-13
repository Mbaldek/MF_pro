/**
 * Maison Félicien — Animations & Interactions
 */

(function() {
  'use strict';

  // ═══ Reveal on scroll (IntersectionObserver) ═══
  var revealObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.04, rootMargin: '0px 0px -20px 0px' });

  document.querySelectorAll('.reveal').forEach(function(el) {
    revealObs.observe(el);
  });

  // ═══ Nav homepage — compact on scroll ═══
  var nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 80) {
        nav.classList.add('compact');
      } else {
        nav.classList.remove('compact');
      }
    }, { passive: true });
  }

  // ═══ Hero entrance stagger ═══
  var heroEls = document.querySelectorAll('.hero-entrance');
  if (heroEls.length) {
    heroEls.forEach(function(el, i) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(22px)';
      el.style.transition = 'opacity .85s cubic-bezier(.22,1,.36,1), transform .85s cubic-bezier(.22,1,.36,1)';
      el.style.transitionDelay = (0.3 + i * 0.15) + 's';
    });
    requestAnimationFrame(function() {
      heroEls.forEach(function(el) {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
    });
  }

  // ═══ Filter pills (collection page) ═══
  document.querySelectorAll('.fpill').forEach(function(pill) {
    pill.addEventListener('click', function() {
      document.querySelectorAll('.fpill').forEach(function(p) { p.classList.remove('active'); });
      pill.classList.add('active');
      var f = pill.dataset.filter;
      document.querySelectorAll('[data-cats]').forEach(function(card) {
        var show = f === 'all' || (card.dataset.cats || '').indexOf(f) !== -1;
        card.style.opacity = show ? '1' : '.25';
        card.style.pointerEvents = show ? '' : 'none';
      });
    });
  });

  // ═══ Size selectors (collection cards) ═══
  document.querySelectorAll('.pcard-sizes').forEach(function(wrap) {
    wrap.querySelectorAll('.psize').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        wrap.querySelectorAll('.psize').forEach(function(b) { b.classList.remove('active'); });
        e.target.classList.add('active');
      });
    });
  });

})();
