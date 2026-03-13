/**
 * Social Proof Toast — Maison Félicien
 * Affiche des notifications discrètes de commandes récentes.
 */
(function() {
  'use strict';

  var toast = document.getElementById('socialProofToast');
  if (!toast) return;

  // Data réaliste — noms français + villes + produits
  var names = [
    'Marie · Paris', 'Laurent · Lyon', 'Camille · Bordeaux',
    'Sophie · Marseille', 'Antoine · Nantes', 'Léa · Toulouse',
    'Thomas · Lille', 'Chloé · Strasbourg', 'Nicolas · Rennes',
    'Emma · Montpellier', 'Hugo · Nice', 'Juliette · Paris',
    'Mathieu · Lyon', 'Clara · Aix-en-Provence', 'Alexandre · Paris'
  ];

  var products = [
    'Le Brownie', 'Cake Citron', 'Cake Sésame Noir',
    'Banana Bread', 'Bundt Cake Potiron', 'Félicien Marbré',
    'Granoix-là', 'Coffret Découverte'
  ];

  var times = [
    'il y a 2 min', 'il y a 3 min', 'il y a 5 min',
    'il y a 8 min', 'il y a 12 min', 'il y a 15 min'
  ];

  var elName = document.getElementById('spName');
  var elProduct = document.getElementById('spProduct');

  function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  var mgr = (window.MF && MF.engagement) || null;

  function showNotification() {
    // Skip if popup is visible — next cycle will retry
    if (mgr && !mgr.canShow('social-proof')) return;

    elName.textContent = randomItem(names);
    elProduct.textContent = randomItem(products) + ' — ' + randomItem(times);

    toast.classList.add('visible');
    if (mgr) mgr.notify('social-proof', true);

    // Auto-hide after 4s
    setTimeout(function() {
      toast.classList.remove('visible');
      if (mgr) mgr.notify('social-proof', false);
    }, 4000);
  }

  // Touch dismiss
  var startY = 0;
  toast.addEventListener('touchstart', function(e) {
    startY = e.touches[0].clientY;
  }, { passive: true });
  toast.addEventListener('touchend', function(e) {
    if (e.changedTouches[0].clientY - startY > 30) {
      toast.classList.remove('visible');
    }
  }, { passive: true });

  // First show after 25-35s, then repeat every 25-35s
  function scheduleNext() {
    var delay = 25000 + Math.floor(Math.random() * 10000); // 25-35s
    setTimeout(function() {
      showNotification();
      scheduleNext();
    }, delay);
  }

  // Initial delay before first notification
  setTimeout(function() {
    showNotification();
    scheduleNext();
  }, 20000 + Math.floor(Math.random() * 10000)); // 20-30s first show

})();
