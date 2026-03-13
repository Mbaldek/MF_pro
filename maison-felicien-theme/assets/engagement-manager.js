/**
 * Engagement Manager — Maison Félicien
 * Coordonne popup, social proof, sticky CTA, quiz pour éviter les conflits.
 * Chargé AVANT les scripts individuels (pas defer).
 */
(function() {
  'use strict';

  window.MF = window.MF || {};

  var state = {
    popupVisible: false,
    socialProofVisible: false,
    quizActive: false,
    stickyCtaVisible: false
  };

  var registered = {}; // { componentName: { show, hide } }
  var queue = [];      // deferred show requests

  function canShow(component) {
    switch (component) {
      case 'popup':
        // Don't interrupt the quiz
        return !state.quizActive;

      case 'social-proof':
        // Don't stack on top of popup
        return !state.popupVisible;

      case 'toast':
        // Don't show add-to-cart toast while popup is open
        return !state.popupVisible;

      default:
        return true;
    }
  }

  function notify(component, visible) {
    // Update state
    switch (component) {
      case 'popup':
        state.popupVisible = visible;
        // Mobile: hide/show sticky CTA when popup toggles
        if (registered['sticky-cta']) {
          if (visible) {
            registered['sticky-cta'].hide();
          } else {
            registered['sticky-cta'].restore();
          }
        }
        // When popup closes, flush deferred queue
        if (!visible) flushQueue();
        break;

      case 'social-proof':
        state.socialProofVisible = visible;
        break;

      case 'quiz':
        state.quizActive = visible;
        // When quiz ends, flush deferred queue
        if (!visible) flushQueue();
        break;

      case 'sticky-cta':
        state.stickyCtaVisible = visible;
        break;
    }
  }

  function register(component, fns) {
    registered[component] = fns;
  }

  function defer(component, showFn) {
    queue.push({ component: component, show: showFn });
  }

  function flushQueue() {
    var next = queue.shift();
    if (next && canShow(next.component)) {
      next.show();
    }
  }

  MF.engagement = {
    state: state,
    canShow: canShow,
    notify: notify,
    register: register,
    defer: defer
  };
})();
