/* =========================================================
   Página de vendas direta (variante "pagina").
   Usa a mesma API compartilhada do quiz (funnel.js): mesmas
   UTMs, mesmos nomes de evento, mesmas ofertas.

   Eventos desta página:
     funnel_view     ao abrir
     offer_view      quando o bloco de ofertas entra na tela
     demo_video_play primeiro play do vídeo
     checkout_click  clique de compra (com offer e cta_position)
     app_demo_click  clique para experimentar a demonstração do app (outra aba)
     app_embed_start toque para usar o app dentro da página
   ========================================================= */
(function () {
  'use strict';

  var Funnel = window.Funnel;

  Funnel.trackEvent('funnel_view');

  /* --- Botões de compra ----------------------------------------
     Qualquer botão com data-offer leva ao checkout daquela oferta.
     Oferta sem link configurado fica desativada, para nunca mandar
     ninguém para um checkout que não existe. */
  var botoes = document.querySelectorAll('[data-offer]');
  Array.prototype.forEach.call(botoes, function (btn) {
    var oferta = btn.dataset.offer;

    if (!Funnel.isOfferReady(oferta)) {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
      btn.title = 'Em breve';
      return;
    }

    btn.addEventListener('click', function () {
      Funnel.goToCheckout(oferta, { cta_position: btn.dataset.cta });
    });
  });

  /* --- Demonstração do app -------------------------------------
     Qualquer elemento com data-app-demo abre a demo em outra aba. */
  Array.prototype.forEach.call(document.querySelectorAll('[data-app-demo]'), function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      Funnel.openAppDemo({ cta_position: el.dataset.appDemo });
    });
  });

  Funnel.ativarAppAoVivo();

  /* Barra fixa de compra do app no celular: aparece depois do topo da página
     e some só enquanto os cards de oferta estão na tela. */
  Funnel.barraFixa({ depoisDe: '.sales-hero', esconderEm: ['#ofertas .pricing'] });

  /* --- Vídeo --------------------------------------------------- */
  var video = document.querySelector('.demo-video video');
  if (video) {
    video.addEventListener('play', function () {
      Funnel.trackEvent('demo_video_play');
    }, { once: true });
  }

  /* --- offer_view: uma vez, quando as ofertas aparecem ---------- */
  var ofertas = document.getElementById('ofertas');
  if (ofertas) {
    if (!('IntersectionObserver' in window)) {
      Funnel.trackEvent('offer_view');
    } else {
      var disparou = false;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !disparou) {
            disparou = true;
            Funnel.trackEvent('offer_view');
            io.disconnect();
          }
        });
      }, { threshold: 0.2 });
      io.observe(ofertas);
    }
  }
})();
