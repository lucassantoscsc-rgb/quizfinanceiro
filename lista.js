/* Lista de espera do Tino Conectado (página /app).
   Envia para a API do app; o e-mail não vai para o rastreamento, só o evento. */
(function () {
  'use strict';
  var API = 'https://organizacao-financeira-seven.vercel.app/api/lista';
  var form = document.querySelector('[data-lista-form]');
  if (!form) return;
  var preco = '';
  var msg = form.querySelector('.lista-msg');
  var botao = form.querySelector('button[type=submit]');

  form.querySelector('.lista-opcoes').addEventListener('click', function (e) {
    var b = e.target.closest('[data-preco]');
    if (!b) return;
    preco = b.dataset.preco;
    form.querySelectorAll('[data-preco]').forEach(function (x) { x.classList.toggle('on', x === b); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = form.querySelector('#listaEmail').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) { msg.textContent = 'Digite um e-mail válido.'; return; }
    if (!preco) { msg.textContent = 'Escolha quanto você pagaria por mês.'; return; }
    botao.disabled = true; msg.textContent = 'Enviando…';
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, preco: preco, de: 'pagina' }) })
      .then(function (r) { if (!r.ok) throw 0;
        form.innerHTML = '<p class="lista-ok">✅ Pronto! Você está na lista e vai ser avisado por e-mail.</p>';
        if (window.Funnel) window.Funnel.trackEvent('waitlist_join');
      })
      .catch(function () { botao.disabled = false; msg.textContent = 'Não foi possível enviar agora. Tente de novo em instantes.'; });
  });
})();
