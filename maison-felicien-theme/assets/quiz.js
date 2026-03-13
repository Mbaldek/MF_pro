/**
 * Quiz Profil — Maison Félicien
 * 3 questions → email → recommandations produits
 */
(function() {
  'use strict';

  var section = document.getElementById('quizSection');
  if (!section) return;

  var steps = section.querySelectorAll('.quiz-step');
  var current = 0;
  var answers = {};

  // Product recommendations mapped by taste preference
  var recoMap = {
    chocolat: [
      { title: 'Le Brownie', handle: 'le-brownie', badge: 'Signature' },
      { title: 'Félicien Marbré', handle: 'felicien-marbre', badge: 'Best-seller' },
      { title: 'Cake Sésame Noir', handle: 'cake-sesame-noir', badge: 'Nouveauté' }
    ],
    fruite: [
      { title: 'Cake Citron', handle: 'cake-citron', badge: 'Signature' },
      { title: 'Banana Bread', handle: 'banana-bread', badge: 'Best-seller' },
      { title: 'Bundt Cake Potiron', handle: 'bundt-cake-potiron', badge: 'Saison' }
    ],
    classique: [
      { title: 'Félicien Marbré', handle: 'felicien-marbre', badge: 'Signature' },
      { title: 'Granoix-là', handle: 'granoix-la', badge: 'Best-seller' },
      { title: 'Coffret Découverte', handle: 'coffret-decouverte', badge: 'Idéal cadeau' }
    ]
  };

  var mgr = (window.MF && MF.engagement) || null;

  function goToStep(n) {
    steps[current].classList.remove('active');
    current = n;
    steps[current].classList.add('active');

    // Notify engagement manager of quiz state
    if (mgr) {
      if (n >= 1 && n <= 3) {
        mgr.notify('quiz', true);  // quiz active
      } else {
        mgr.notify('quiz', false); // intro or results — quiz done
      }
    }

    // Scroll quiz into view on mobile
    if (window.innerWidth <= 768) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Start button
  var startBtn = section.querySelector('[data-quiz-next]');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      goToStep(1);
    });
  }

  // Option buttons (steps 1 & 2)
  var options = section.querySelectorAll('.quiz-option');
  for (var i = 0; i < options.length; i++) {
    options[i].addEventListener('click', function() {
      var field = this.parentNode.getAttribute('data-field');
      var value = this.getAttribute('data-value');
      answers[field] = value;

      // Visual feedback
      var siblings = this.parentNode.querySelectorAll('.quiz-option');
      for (var j = 0; j < siblings.length; j++) {
        siblings[j].classList.remove('selected');
      }
      this.classList.add('selected');

      // Auto-advance after 400ms
      setTimeout(function() {
        goToStep(current + 1);
      }, 400);
    });
  }

  // Email form (step 3)
  var form = document.getElementById('quiz-email-form');
  if (form) {
    // Update hidden tags with answers before submit
    form.addEventListener('submit', function(e) {
      var tagsInput = document.getElementById('quizTags');
      var tags = ['newsletter', 'quiz'];
      if (answers.gout) tags.push('gout-' + answers.gout);
      if (answers.intention) tags.push('intention-' + answers.intention);
      tagsInput.value = tags.join(',');

      // Show results immediately (form submits in background via Shopify)
      showResults();
    });
  }

  function showResults() {
    var grid = document.getElementById('quizRecoGrid');
    var products = recoMap[answers.gout] || recoMap.chocolat;

    var html = '';
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      html += '<a class="quiz-reco-card" href="/products/' + p.handle + '">';
      html += '<div class="quiz-reco-img"></div>';
      html += '<span class="quiz-reco-badge">' + p.badge + '</span>';
      html += '<span class="quiz-reco-name">' + p.title + '</span>';
      html += '<span class="quiz-reco-cta">Découvrir →</span>';
      html += '</a>';
    }
    grid.innerHTML = html;

    goToStep(4);
  }

  // Allow skipping email (click results directly)
  // Not implemented — email is gated

})();
