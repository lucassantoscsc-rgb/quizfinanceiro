/* =========================================================
   BLACK FRIDAY DO TINO (liga e desliga sozinha pela data)
   Até FIM: tema preto e dourado, faixa no topo com contagem regressiva e o aviso de que o preço sobe em 01/12
   (os preços atuais são o preço de Black Friday; não mostramos "de/por" com preço que não foi praticado).
   Depois de FIM: o tema some e, se PRECOS_DEPOIS tiver os links da Cakto, os preços passam para os novos
   valores (textos das páginas e links do checkout).
   Para conferir antes: ?black=1 (tema), ?black=depois (preços novos), ?black=0 (normal).
   Cada página diz o produto: <script src="black.js" data-produto="app|planilha|ambos|saida"></script>
   ========================================================= */
(function () {
  'use strict';
  var INICIO = Date.parse('2026-10-26T00:00:00-03:00');
  var FIM = Date.parse('2026-11-30T23:59:59-03:00');
  var PRECOS_AGORA = { app: 27, planilha: 17 };
  var PRECOS_DEPOIS = {
    app: { valor: 37, url: '' },        // link da oferta de R$37 na Cakto (preencher antes de 30/11)
    planilha: { valor: 27, url: '' }    // link da oferta de R$27 na Cakto
  };

  var script = document.currentScript, produto = (script && script.getAttribute('data-produto')) || 'ambos';
  var forcar = new URLSearchParams(location.search).get('black'), agora = Date.now();
  var fase = forcar === '1' ? 'black' : forcar === 'depois' ? 'depois' : forcar === '0' ? 'normal'
    : agora < INICIO ? 'normal' : agora <= FIM ? 'black' : 'depois';
  var temLinks = !!(PRECOS_DEPOIS.app.url && PRECOS_DEPOIS.planilha.url);
  var subiu = fase === 'depois' && (temLinks || forcar === 'depois');
  window.TinoPrecos = subiu ? { app: PRECOS_DEPOIS.app.valor, planilha: PRECOS_DEPOIS.planilha.valor } : PRECOS_AGORA;

  if (fase === 'black') {
    document.documentElement.classList.add('black');
    document.addEventListener('DOMContentLoaded', faixaBlack);
  }
  if (subiu) document.addEventListener('DOMContentLoaded', subirPrecos);

  function faixaBlack() {
    var r = function (v) { return 'R$' + v; };
    var txt = {
      app: 'App por <b>' + r(PRECOS_AGORA.app) + '</b> até 30/11. A partir de 01/12, ' + r(PRECOS_DEPOIS.app.valor) + '.',
      planilha: 'Planilha por <b>' + r(PRECOS_AGORA.planilha) + '</b> até 30/11. A partir de 01/12, ' + r(PRECOS_DEPOIS.planilha.valor) + '.',
      ambos: 'Planilha <b>' + r(PRECOS_AGORA.planilha) + '</b> e app <b>' + r(PRECOS_AGORA.app) + '</b> até 30/11. A partir de 01/12, ' +
        r(PRECOS_DEPOIS.planilha.valor) + ' e ' + r(PRECOS_DEPOIS.app.valor) + '.',
      saida: 'Ofertas de Black Friday até 30/11.'
    }[produto] || '';
    var f = document.createElement('div');
    f.className = 'black-faixa';
    f.setAttribute('data-sem-troca', '');
    f.innerHTML = '<div class="black-faixa-in"><span class="black-selo">BLACK FRIDAY</span><span class="black-txt">' + txt +
      '</span><span class="black-relogio" aria-label="Tempo até o fim da Black Friday">⏳ <b data-relogio>--</b></span></div>';
    document.body.insertBefore(f, document.body.firstChild);
    // a faixa fica fixa no topo; o conteúdo desce a altura dela
    var ajustar = function () { document.body.style.paddingTop = f.offsetHeight + 'px'; };
    ajustar(); window.addEventListener('resize', ajustar);
    // embaixo de cada preço: até quando vale e quanto passa a custar
    var depois = {}; depois[PRECOS_AGORA.app] = PRECOS_DEPOIS.app.valor; depois[PRECOS_AGORA.planilha] = PRECOS_DEPOIS.planilha.valor;
    document.querySelectorAll('.price-row').forEach(function (row) {
      var v = (row.textContent.match(/R\$\s?(\d+)/) || [])[1];
      if (!depois[v]) return;
      var nota = document.createElement('p');
      nota.className = 'black-preco'; nota.setAttribute('data-sem-troca', '');
      nota.innerHTML = '🖤 Preço de Black Friday até 30/11. A partir de 01/12: R$' + depois[v] + '.';
      row.parentNode.insertBefore(nota, row.nextSibling);
    });
    var el = f.querySelector('[data-relogio]');
    function tic() {
      var s = Math.max(0, Math.floor((FIM - Date.now()) / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600),
        m = Math.floor(s % 3600 / 60), ss = s % 60, p = function (n) { return (n < 10 ? '0' : '') + n; };
      el.textContent = (d ? d + 'd ' : '') + p(h) + ':' + p(m) + ':' + p(ss);
    }
    tic(); setInterval(tic, 1000);
  }

  // Preços novos: troca "R$17" e "R$27" ao mesmo tempo (17→27 e 27→37), inclusive no que aparece depois
  // (resultado do quiz, barra fixa de compra), e aponta o checkout para as ofertas novas.
  function subirPrecos() {
    var mapa = {}; mapa[PRECOS_AGORA.planilha] = PRECOS_DEPOIS.planilha.valor; mapa[PRECOS_AGORA.app] = PRECOS_DEPOIS.app.valor;
    var re = new RegExp('R\\$(\\s?)(' + PRECOS_AGORA.planilha + '|' + PRECOS_AGORA.app + ')(?!\\d|[,.]\\d)', 'g');
    function trocar(raiz) {
      var it = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT), nos = [], n;
      while ((n = it.nextNode())) if (new RegExp(re.source).test(n.nodeValue) && !(n.parentNode.closest && n.parentNode.closest('[data-sem-troca]'))) nos.push(n);
      nos.forEach(function (x) { x.nodeValue = x.nodeValue.replace(re, function (_, esp, v) { return 'R$' + esp + mapa[v]; }); });
    }
    trocar(document.body);
    new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (x) { if (x.nodeType === 1) trocar(x); else if (x.nodeType === 3 && x.parentNode) trocar(x.parentNode); }); }); })
      .observe(document.body, { childList: true, subtree: true });
    var O = window.Funnel && window.Funnel.OFFERS;
    if (O && temLinks) {
      O.app.valor = PRECOS_DEPOIS.app.valor; O.app.url = PRECOS_DEPOIS.app.url;
      O.essencial.valor = PRECOS_DEPOIS.planilha.valor; O.essencial.url = PRECOS_DEPOIS.planilha.url;
    }
  }
})();
