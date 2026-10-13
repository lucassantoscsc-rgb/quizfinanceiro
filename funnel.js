/* =========================================================
   FUNNEL — link de checkout + rastreamento compartilhados.
   Exposto em window.Funnel para reutilizar em outras páginas
   (ex.: uma futura página de venda direta).

   Uso:
     Funnel.trackEvent('quiz_start');
     Funnel.trackEvent('question_answered', { question_number: 2 });
     Funnel.goToCheckout();            // registra checkout_click e navega

   Eventos:
     - Todo evento recebe funnel_variant (ver FUNNEL_VARIANT abaixo).
       A variante NÃO é escrita em UTMs — os parâmetros da campanha
       passam intocados para o checkout.
     - 'checkout_click' dispara também o evento padrão do Meta
       InitiateCheckout, UMA vez por clique. Ele representa a SAÍDA
       para o checkout, não uma compra. Purchase nunca é disparado
       aqui (fica a cargo da plataforma de pagamento).
     - Nunca envie respostas do quiz (dívidas, situação financeira,
       sentimentos) nos payloads — só números/etapas.
   ========================================================= */
window.Funnel = (function () {
  'use strict';

  /* Ofertas disponíveis. A chave é usada em goToCheckout('chave').
     'essencial' é o padrão: é o que o quiz usa e o que já está no ar. */
  var OFFERS = {
    essencial: {
      nome: 'Planilha de Organização Financeira',
      valor: 17,
      url: 'https://pay.cakto.com.br/o7zxmb3_786993'
    },
    completo: {
      nome: 'Planilha de Organização Financeira + extras',
      valor: 27,
      /* TODO: criar a oferta de R$27 na Cakto e colar o link aqui.
         Enquanto estiver assim, o botão de R$27 fica desativado na página. */
      url: ''
    }
  };

  var DEFAULT_OFFER = 'essencial';

  /* Variante do funil, para comparar caminhos diferentes no mesmo produto.
     Definida na página via <html data-funnel-variant="...">; sem isso, "quiz". */
  var FUNNEL_VARIANT = document.documentElement.getAttribute('data-funnel-variant') || 'quiz';

  /* Parâmetros de atribuição repassados da URL de entrada para o checkout,
     sem alteração. UTMs + identificadores de clique + os usados pela Utmify. */
  var PASS_THROUGH_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
    'fbclid', 'gclid', 'ttclid',
    'src', 'sck', 'xcod'
  ];

  function getPassThroughParams() {
    var entry = new URLSearchParams(window.location.search);
    var out = new URLSearchParams();
    PASS_THROUGH_PARAMS.forEach(function (key) {
      if (entry.has(key)) out.set(key, entry.get(key));
    });
    return out;
  }

  function getOffer(offerKey) {
    return OFFERS[offerKey] || OFFERS[DEFAULT_OFFER];
  }

  /* Oferta sem link configurado ainda não pode ser vendida. */
  function isOfferReady(offerKey) {
    return !!getOffer(offerKey).url;
  }

  function buildCheckoutUrl(offerKey) {
    var url = getOffer(offerKey).url;
    if (!url) return '';
    var qs = getPassThroughParams().toString();
    if (!qs) return url;
    return url + (url.indexOf('?') > -1 ? '&' : '?') + qs;
  }

  function trackEvent(eventName, payload) {
    var data = Object.assign({ funnel_variant: FUNNEL_VARIANT }, payload || {});

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: eventName }, data));

    if (typeof window.gtag === 'function') window.gtag('event', eventName, data);

    if (typeof window.fbq === 'function') {
      if (eventName === 'checkout_click') {
        var offer = getOffer(data.offer);
        // Saída para o checkout (não é compra). Um disparo por clique.
        window.fbq('track', 'InitiateCheckout', {
          content_name: offer.nome,
          value: offer.valor,
          currency: 'BRL',
          funnel_variant: FUNNEL_VARIANT
        });
      } else {
        window.fbq('trackCustom', eventName, data);
      }
    }
  }

  function goToCheckout(offerKey, payload) {
    var key = OFFERS[offerKey] ? offerKey : DEFAULT_OFFER;
    var url = buildCheckoutUrl(key);
    if (!url) return false;
    trackEvent('checkout_click', Object.assign({ offer: key }, payload || {}));
    window.location.href = url;
    return true;
  }

  return {
    OFFERS: OFFERS,
    FUNNEL_VARIANT: FUNNEL_VARIANT,
    getOffer: getOffer,
    isOfferReady: isOfferReady,
    buildCheckoutUrl: buildCheckoutUrl,
    trackEvent: trackEvent,
    goToCheckout: goToCheckout
  };
})();
