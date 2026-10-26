/* =========================================================
   INDIQUE E GANHE — quem chega pelo convite de um cliente
   (tinofinancas.com.br/?ref=CODIGO ou planilhadeorganizacaofinanceira.online/app?ref=CODIGO)
   vê quem indicou e vai para a oferta de indicação (R$20, sem cupom).
   O código vai no campo "sck" (indica-CODIGO), para a compra contar
   para quem indicou. Vale por 30 dias neste aparelho.
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
    f.innerHTML = '<span>🎁 ' + quem + '. Seu desconto <b>já está aplicado</b>: você paga <b>R$ 20</b> em vez de R$ ' + precoApp() + '.</span>';
    document.body.insertBefore(f, document.body.firstChild);
    trocarPrecos(document.body);
    // a barra fixa de compra aparece depois: troca o preço nela também
    new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) trocarPrecos(n); }); }); })
      .observe(document.body, { childList: true, subtree: true });
  }

  // Preço atual do app (black.js muda depois da Black Friday).
  function precoApp() { return (window.TinoPrecos && window.TinoPrecos.app) || 27; }
  // Para quem veio pelo convite, o app custa R$20: troca o preço do app na página (botões, cartões, barra fixa e
  // textos), menos nas faixas (a do convite e a da Black Friday).
  function trocarPrecos(raiz) {
    var re = new RegExp('R\\$ ?' + precoApp() + '\\b', 'g');
    var it = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT), nos = [], n;
    while ((n = it.nextNode())) if (new RegExp(re.source).test(n.nodeValue) && !(n.parentNode.closest && n.parentNode.closest('.indique-faixa, [data-sem-troca]'))) nos.push(n);
    nos.forEach(function (x) { x.nodeValue = x.nodeValue.replace(re, 'R$20'); });
  }

})();
