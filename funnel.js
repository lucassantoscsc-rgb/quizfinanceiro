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

  var CHECKOUT_URL_BASE = 'https://pay.cakto.com.br/o7zxmb3_786993';
  var FUNNEL_VARIANT = 'quiz';
  var PRODUCT_NAME = 'Planilha de Organização Financeira';
  var PRODUCT_VALUE = 17;

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

  function buildCheckoutUrl(base) {
    var url = base || CHECKOUT_URL_BASE;
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
        // Saída para o checkout (não é compra). Um disparo por clique.
        window.fbq('track', 'InitiateCheckout', {
          content_name: PRODUCT_NAME,
          value: PRODUCT_VALUE,
          currency: 'BRL',
          funnel_variant: FUNNEL_VARIANT
        });
      } else {
        window.fbq('trackCustom', eventName, data);
      }
    }
  }

  function goToCheckout(payload) {
    trackEvent('checkout_click', payload);
    window.location.href = buildCheckoutUrl();
  }

  return {
    CHECKOUT_URL_BASE: CHECKOUT_URL_BASE,
    FUNNEL_VARIANT: FUNNEL_VARIANT,
    buildCheckoutUrl: buildCheckoutUrl,
    trackEvent: trackEvent,
    goToCheckout: goToCheckout
  };
})();
