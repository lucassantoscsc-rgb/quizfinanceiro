/* =========================================================
   Página de vendas direta (variante "pagina").
   Usa a mesma API compartilhada do quiz (funnel.js): mesmo
   checkout, mesmas UTMs, mesmos nomes de evento.

   Eventos desta página:
     funnel_view     — ao abrir
     offer_view      — quando o bloco de oferta entra na tela
     demo_video_play — primeiro play do vídeo
     checkout_click  — clique em qualquer CTA (com cta_position)
   ========================================================= */
(function () {
  'use strict';

  var Funnel = window.Funnel;

  Funnel.trackEvent('funnel_view');

  /* --- CTAs ---------------------------------------------------
     O do topo é âncora para a oferta (não é saída para o checkout,
     então não dispara checkout_click). Os demais vão para o pagamento. */
  ['ctaOferta', 'ctaFinal'].forEach(function (id) {
    var btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', function () {
      Funnel.goToCheckout({ cta_position: btn.dataset.cta });
    });
  });

  /* --- Vídeo --------------------------------------------------- */
  var video = document.querySelector('.demo-video video');
  if (video) {
    video.addEventListener('play', function () {
      Funnel.trackEvent('demo_video_play');
    }, { once: true });
  }

  /* --- offer_view: uma vez, quando a oferta aparece ------------- */
  var oferta = document.getElementById('oferta');
  if (oferta) {
    if (!('IntersectionObserver' in window)) {
      Funnel.trackEvent('offer_view');
    } else {
      var fired = false;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !fired) {
            fired = true;
            Funnel.trackEvent('offer_view');
            io.disconnect();
          }
        });
      }, { threshold: 0.25 });
      io.observe(oferta);
    }
  }
})();
