/* =========================================================
   INDIQUE E GANHE — quem chega pelo convite de um cliente
   (planilhadeorganizacaofinanceira.online/app?ref=CODIGO)
   vê quem indicou e o cupom de desconto. O código vai para o
   checkout do app no campo "sck" (indica-CODIGO), para a compra
   contar para quem indicou. Vale por 30 dias neste aparelho.
   ========================================================= */
(function () {
  'use strict';
  var API = 'https://organizacao-financeira-seven.vercel.app/api/indique?c=';
  var CHAVE = 'tinoRef', DIAS = 30;

  function lerSalvo() {
    try {
      var r = JSON.parse(localStorage.getItem(CHAVE) || 'null');
      return r && Date.now() - r.em < DIAS * 864e5 ? r : null;
    } catch (e) { return null; }
  }
  var daUrl = (new URLSearchParams(location.search).get('ref') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  var salvo = lerSalvo();
  var codigo = daUrl.length >= 4 ? daUrl : salvo && salvo.c;
  if (!codigo) return;

  fetch(API + encodeURIComponent(codigo)).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || !d.ok) return;
    var ref = { c: codigo, cupom: d.cupom, nome: d.nome, em: salvo && salvo.c === codigo ? salvo.em : Date.now() };
    try { localStorage.setItem(CHAVE, JSON.stringify(ref)); } catch (e) { /* sem armazenamento: vale só nesta visita */ }
    window.TinoRef = ref;
    mostrarFaixa(ref);
    if (window.Funnel) window.Funnel.trackEvent('indique_visita');
  }).catch(function () {});

  function mostrarFaixa(ref) {
    var f = document.createElement('div');
    f.className = 'indique-faixa';
    var quem = ref.nome ? '<b>' + ref.nome.replace(/[<>&"]/g, '') + '</b> te indicou o Tino' : 'Você foi indicado para o Tino';
    f.innerHTML = '<span>🎁 ' + quem + '. Use o cupom <b class="indique-cupom">' + ref.cupom + '</b> no pagamento e pague <b>R$ 20</b> em vez de R$ 27.</span>' +
      '<button type="button">Copiar cupom</button>';
    f.querySelector('button').addEventListener('click', function (e) {
      var b = e.currentTarget;
      (navigator.clipboard ? navigator.clipboard.writeText(ref.cupom) : Promise.reject()).then(function () { b.textContent = 'Copiado ✓'; })
        .catch(function () { b.textContent = ref.cupom; });
    });
    document.body.insertBefore(f, document.body.firstChild);
  }
})();
