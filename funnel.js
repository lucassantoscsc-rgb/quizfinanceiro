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
    app: {
      nome: 'Tino Finanças (app)',
      valor: 27,
      /* Checkout da Cakto do produto "Organização Financeira - App no Celular". */
      url: 'https://pay.cakto.com.br/3drwm4z_1213020'
    }
  };

  /* Demonstração do app (sem login, dados de exemplo). */
  var APP_DEMO_URL = 'https://organizacao-financeira-seven.vercel.app/demo';

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
    var params = getPassThroughParams();
    /* Indique e ganhe (indique.js): o código de quem indicou vai no "sck", só para o app
       e só se a campanha não usou esse campo. */
    if (offerKey === 'app' && window.TinoRef && !params.has('sck')) params.set('sck', 'indica-' + window.TinoRef.c);
    var qs = params.toString();
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
    goToCheckout: goToCheckout,
    APP_DEMO_URL: APP_DEMO_URL,
    /* Celular com a demonstração ao vivo: começa como imagem e só carrega o app
       quando a pessoa toca (a página continua leve). Marcação:
       <div class="app-live" data-app-live="posicao"><div class="phone">…<button class="phone-play">… */
    ativarAppAoVivo: function (raiz) {
      Array.prototype.forEach.call((raiz || document).querySelectorAll('[data-app-live]'), function (el) {
        if (el.dataset.pronto) return;
        el.dataset.pronto = '1';
        var botao = el.querySelector('.phone-play');
        if (!botao) return;
        botao.addEventListener('click', function () {
          trackEvent('app_embed_start', { cta_position: el.dataset.appLive });
          var tela = el.querySelector('.phone');
          var f = document.createElement('iframe');
          f.src = APP_DEMO_URL + '?embed=1';
          f.title = 'Demonstração do app Tino Finanças';
          tela.innerHTML = '';
          tela.appendChild(f);
          el.classList.add('ativo');
          /* Desenha o app na largura de um iPhone (375px) e reduz para caber no celular da página. */
          var ajustar = function () {
            var esc = tela.clientWidth / 375;
            f.style.width = '375px';
            f.style.height = (tela.clientHeight / esc) + 'px';
            f.style.transform = 'scale(' + esc + ')';
          };
          ajustar();
          window.addEventListener('resize', ajustar);
        });
      });
    },
    /* Barra fixa de compra do app (só no celular).
       Aparece depois que 'depoisDe' sai da tela e some enquanto algum elemento
       de 'esconderEm' (ex.: os cards de oferta) estiver visível. */
    barraFixa: function (opcoes) {
      if (!isOfferReady('app')) return;
      var barra = document.getElementById('barraCompra');
      if (!barra) {
        barra = document.createElement('div');
        barra.id = 'barraCompra';
        barra.className = 'barra-compra';
        barra.setAttribute('aria-hidden', 'true');
        barra.innerHTML =
          '<div class="barra-texto"><strong>📱 Tino Finanças · R$27</strong><span>Vitalício, sem mensalidade</span></div>' +
          '<button class="btn btn-gold" type="button" tabindex="-1">Quero o app</button>';
        document.body.appendChild(barra);
        barra.querySelector('button').addEventListener('click', function () {
          goToCheckout('app', { cta_position: 'barra-fixa' });
        });
      }
      var visivelNaTela = function (el) {
        if (!el || !el.offsetParent) return false;
        var r = el.getBoundingClientRect();
        return r.bottom > 0 && r.top < window.innerHeight;
      };
      var atualizar = function () {
        var gatilho = typeof opcoes.depoisDe === 'function' ? opcoes.depoisDe() : document.querySelector(opcoes.depoisDe);
        var passou = gatilho && gatilho.offsetParent && gatilho.getBoundingClientRect().bottom < 0;
        var conflito = (opcoes.esconderEm || []).some(function (sel) {
          return Array.prototype.some.call(document.querySelectorAll(sel), visivelNaTela);
        });
        var mostrar = !!passou && !conflito && window.innerWidth <= 760;
        barra.classList.toggle('on', mostrar);
        barra.setAttribute('aria-hidden', mostrar ? 'false' : 'true');
        barra.querySelector('button').tabIndex = mostrar ? 0 : -1;
        document.body.classList.toggle('com-barra', mostrar);
      };
      /* No máximo uma atualização a cada 100 ms durante a rolagem, e uma no final. */
      var ultima = 0, pendente = null;
      var noScroll = function () {
        var agora = Date.now();
        clearTimeout(pendente);
        if (agora - ultima > 100) { ultima = agora; atualizar(); }
        pendente = setTimeout(function () { barra._atualizar(); }, 120);
      };
      if (!barra.dataset.ouvindo) {
        barra.dataset.ouvindo = '1';
        window.addEventListener('scroll', noScroll, { passive: true });
        window.addEventListener('resize', noScroll);
      }
      barra._atualizar = atualizar;
      atualizar();
    },
    /* Abre a demonstração do app em outra aba e registra o clique. */
    openAppDemo: function (payload) {
      trackEvent('app_demo_click', payload || {});
      window.open(APP_DEMO_URL, '_blank', 'noopener');
    }
  };
})();
