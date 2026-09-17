(function () {
  'use strict';

  var QUESTIONS = window.QuizRules.QUESTIONS;
  var Funnel = window.Funnel;

  /* =========================================================
     ESTADO + PERSISTÊNCIA (sessionStorage)
     Guarda só etapa e chaves das respostas — nada pessoal.
     ========================================================= */
  var STORAGE_KEY = 'quizfinanceiro:progress';

  var state = {
    screen: 'intro',       // 'intro' | 'quiz' | 'result'
    currentQuestion: 0,
    answers: {}
  };

  function saveProgress() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        screen: state.screen,
        currentQuestion: state.currentQuestion,
        answers: state.answers
      }));
    } catch (e) { /* storage indisponível: segue sem persistir */ }
  }

  function loadProgress() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object') return null;
      var validScreens = { intro: 1, quiz: 1, result: 1 };
      if (!validScreens[saved.screen]) return null;
      var q = parseInt(saved.currentQuestion, 10);
      if (isNaN(q) || q < 0 || q >= QUESTIONS.length) q = 0;
      return { screen: saved.screen, currentQuestion: q, answers: saved.answers || {} };
    } catch (e) {
      return null;
    }
  }

  function clearProgress() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignora */ }
  }

  /* =========================================================
     DOM REFS
     ========================================================= */
  var topbar = document.getElementById('topbar');
  var backBtn = document.getElementById('backBtn');
  var restartBtnTop = document.getElementById('restartBtnTop');
  var progressFill = document.getElementById('progressFill');
  var progressLabel = document.getElementById('progressLabel');

  var screens = {
    intro: document.getElementById('screen-intro'),
    quiz: document.getElementById('screen-quiz'),
    result: document.getElementById('screen-result')
  };

  var startBtn = document.getElementById('startBtn');
  var questionSlide = document.getElementById('questionSlide');
  var resultWrap = document.getElementById('resultWrap');

  /* =========================================================
     NAVEGAÇÃO ENTRE TELAS
     ========================================================= */
  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.toggle('active', key === name);
    });
    topbar.hidden = name !== 'quiz';
    state.screen = name;
    window.scrollTo(0, 0);
  }

  function restart() {
    state.currentQuestion = 0;
    state.answers = {};
    clearProgress();
    resultWrap.innerHTML = '';
    showScreen('intro');
  }

  /* =========================================================
     TELA 1 — ABERTURA
     ========================================================= */
  startBtn.addEventListener('click', function () {
    Funnel.trackEvent('quiz_start');
    state.currentQuestion = 0;
    showScreen('quiz');
    renderQuestion(0, 'fwd', true);
    saveProgress();
  });

  /* =========================================================
     TELA 2 — QUIZ
     ========================================================= */
  function renderProgress(index) {
    var total = QUESTIONS.length;
    progressFill.style.width = ((index + 1) / total) * 100 + '%';
    progressLabel.textContent = (index + 1) + ' de ' + total;
  }

  function buildQuestionHTML(q, savedValue) {
    var optionsHTML = q.options.map(function (opt) {
      var selectedClass = savedValue === opt.value ? ' is-selected' : '';
      return (
        '<button type="button" class="option-btn' + selectedClass + '" data-value="' + opt.value + '">' +
          '<span class="option-emoji">' + opt.emoji + '</span>' +
          '<span class="option-label">' + opt.label + '</span>' +
          '<span class="option-check">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13L9.5 17.5L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</span>' +
        '</button>'
      );
    }).join('');

    return (
      '<h2 class="question-title">' + q.question + '</h2>' +
      '<div class="options-list">' + optionsHTML + '</div>'
    );
  }

  function renderQuestion(index, direction, skipAnim) {
    var q = QUESTIONS[index];
    var savedValue = state.answers[q.id];
    renderProgress(index);

    function paint() {
      questionSlide.innerHTML = buildQuestionHTML(q, savedValue);
      bindOptionClicks(q, index);

      if (!skipAnim) {
        var startClass = direction === 'back' ? 'slide-in-back-start' : 'slide-in-fwd-start';
        questionSlide.classList.add(startClass);
        void questionSlide.offsetWidth; // força reflow para a transição partir do estado inicial
        requestAnimationFrame(function () {
          questionSlide.classList.remove(startClass);
        });
      }
    }

    if (skipAnim) {
      questionSlide.classList.remove('slide-out-fwd', 'slide-out-back');
      paint();
      return;
    }

    var outClass = direction === 'back' ? 'slide-out-back' : 'slide-out-fwd';
    questionSlide.classList.add(outClass);
    window.setTimeout(function () {
      questionSlide.classList.remove(outClass);
      paint();
    }, 260);
  }

  function bindOptionClicks(q, index) {
    var buttons = questionSlide.querySelectorAll('.option-btn');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (questionSlide.dataset.locked === 'true') return;
        questionSlide.dataset.locked = 'true';

        state.answers[q.id] = btn.dataset.value;
        saveProgress();

        buttons.forEach(function (b) {
          b.classList.toggle('is-selected', b === btn);
          b.classList.toggle('is-dimmed', b !== btn);
          b.disabled = true;
        });

        // Só o número da pergunta — nunca a resposta.
        Funnel.trackEvent('question_answered', { question_number: index + 1 });

        window.setTimeout(function () {
          questionSlide.dataset.locked = 'false';
          advanceFromQuestion(index);
        }, 380);
      });
    });
  }

  function advanceFromQuestion(index) {
    if (index < QUESTIONS.length - 1) {
      state.currentQuestion = index + 1;
      saveProgress();
      renderQuestion(state.currentQuestion, 'fwd');
      return;
    }
    Funnel.trackEvent('quiz_complete');
    renderResult();
    showScreen('result');
    saveProgress();
  }

  backBtn.addEventListener('click', function () {
    if (state.currentQuestion === 0) {
      showScreen('intro');
      saveProgress();
      return;
    }
    state.currentQuestion -= 1;
    saveProgress();
    renderQuestion(state.currentQuestion, 'back');
  });

  restartBtnTop.addEventListener('click', restart);

  /* =========================================================
     TELA 3 — RESULTADO + OFERTA
     ========================================================= */
  function checkIcon() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 13L9.5 17.5L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function arrowIcon() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function renderResult() {
    var r = window.QuizRules.buildResult(state.answers);

    var acoesHTML = r.acoes.map(function (texto, i) {
      return (
        '<li class="action-item">' +
          '<span class="action-num">' + (i + 1) + '</span>' +
          '<p>' + texto + '</p>' +
        '</li>'
      );
    }).join('');

    resultWrap.innerHTML =
      /* ---------- Resultado ---------- */
      '<div class="result-header">' +
        '<span class="result-tag">Seu primeiro passo</span>' +
        '<h1 class="result-headline">Pelas suas respostas, seu primeiro passo pode ser <span class="hl">' + r.passo + '</span>.</h1>' +
      '</div>' +

      '<div class="result-card">' +
        '<p>' + r.resumo + '</p>' +
        '<span class="leak-chip">Ponto de atenção que você indicou: ' + r.atencao + '</span>' +
      '</div>' +

      '<div class="result-card">' +
        '<h2 class="actions-title">3 ações práticas para começar</h2>' +
        '<ol class="actions-list">' + acoesHTML + '</ol>' +
        '<p class="actions-note">Isso é uma orientação inicial baseada no que você respondeu, não um diagnóstico definitivo. Você pode aplicar tudo isso sem comprar nada.</p>' +
      '</div>' +

      /* ---------- Oferta ---------- */
      '<section class="offer-section" id="offerSection" aria-labelledby="offerTitle">' +
        '<h2 class="offer-headline" id="offerTitle">Transforme esse primeiro passo em uma organização que você consegue acompanhar.</h2>' +
        '<p class="offer-lead">A <strong>Planilha de Organização Financeira</strong> é uma planilha pronta no Google Planilhas para registrar o que entra e o que sai e acompanhar o seu mês em um só lugar — a estrutura que as ações acima pedem, sem você precisar montar do zero.</p>' +

        '<figure class="demo-video">' +
          '<video controls playsinline preload="metadata" poster="assets/video/tutorial-poster.jpg" width="900" height="434">' +
            '<source src="assets/video/tutorial-planilha.mp4" type="video/mp4">' +
          '</video>' +
          '<figcaption>Veja a planilha por dentro (3 min): este é o tutorial que acompanha a planilha, mostrando como fazer sua cópia e preencher o mês.</figcaption>' +
        '</figure>' +

        '<div class="result-card features-card">' +
          '<h3 class="features-title">O que a planilha tem</h3>' +
          '<ul class="features-list">' +
            '<li>' + checkIcon() + ' Uma aba por mês (janeiro a dezembro) mais uma aba de configuração</li>' +
            '<li>' + checkIcon() + ' Resumo do mês: total de entradas, total de saídas e comparação com o mês anterior</li>' +
            '<li>' + checkIcon() + ' "Restante para gastar": quanto ainda sobra depois do que já saiu</li>' +
            '<li>' + checkIcon() + ' Gastos com categoria, forma de pagamento (débito/crédito), data e marcação de essencial</li>' +
            '<li>' + checkIcon() + ' Contas do mês com valor planejado, valor pago e data — e o gráfico planejado vs. real</li>' +
            '<li>' + checkIcon() + ' Reserva de emergência e metas (ex.: carro) com meta, reservado no mês e quanto falta</li>' +
            '<li>' + checkIcon() + ' Reservas e investimentos registrados por tipo, e uso do débito e do crédito no mês</li>' +
          '</ul>' +
        '</div>' +

        '<div class="offer-card">' +
          '<span class="offer-title">Planilha de Organização Financeira</span>' +
          '<div class="offer-price-row">' +
            '<span class="offer-price-new">R$17</span>' +
            '<span class="offer-price-meta">pagamento único</span>' +
          '</div>' +
          '<ul class="offer-includes">' +
            '<li>' + checkIcon() + ' Incluso nos R$17: a Planilha de Organização Financeira (produto digital)</li>' +
            '<li>' + checkIcon() + ' Incluso: o tutorial em vídeo de como fazer sua cópia e preencher o mês</li>' +
            '<li>' + checkIcon() + ' Feita no Google Planilhas: você faz uma cópia para o seu Google Drive e usa no computador ou no celular, pelo app do Google Planilhas</li>' +
            '<li>' + checkIcon() + ' Suporte por e-mail (<a class="offer-link" href="mailto:suporteplanilhass@gmail.com">suporteplanilhass@gmail.com</a>) e WhatsApp</li>' +
            '<li>' + checkIcon() + ' Pagamento por Pix ou cartão de crédito</li>' +
            '<li>' + checkIcon() + ' Acesso liberado pela plataforma após a confirmação do pagamento</li>' +
          '</ul>' +
          '<div class="guarantee-strip">🛡️ Garantia incondicional de 7 dias: não gostou por qualquer motivo, é só pedir o reembolso</div>' +
        '</div>' +

        '<div class="final-cta-wrap">' +
          '<button class="btn btn-primary btn-large btn-pulse" id="finalCtaBtn" type="button">' +
            'Quero minha planilha por R$17' + arrowIcon() +
          '</button>' +
          '<span class="final-cta-note">Compra processada pela Cakto. O checkout pode incluir uma taxa de serviço da plataforma.</span>' +
        '</div>' +

        '<p class="offer-extras">No checkout existem dois adicionais opcionais, cobrados à parte e <strong>não inclusos</strong> nos R$17: Projeto 10k em 6 meses (R$9,90) e Planilha de Quitação de Dívidas (R$7,90).</p>' +
      '</section>' +

      '<div class="result-footer">' +
        '<button class="link-btn" id="restartBtnResult" type="button">Refazer o quiz</button>' +
      '</div>';

    document.getElementById('finalCtaBtn').addEventListener('click', function () {
      Funnel.goToCheckout();
    });
    document.getElementById('restartBtnResult').addEventListener('click', restart);

    var demoVideo = resultWrap.querySelector('.demo-video video');
    if (demoVideo) {
      demoVideo.addEventListener('play', function () {
        Funnel.trackEvent('demo_video_play');
      }, { once: true });
    }

    observeOfferView();
  }

  /* offer_view: uma vez por resultado, quando a oferta entra na tela */
  function observeOfferView() {
    var section = document.getElementById('offerSection');
    if (!section) return;

    if (!('IntersectionObserver' in window)) {
      Funnel.trackEvent('offer_view');
      return;
    }
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
    io.observe(section);
  }

  /* =========================================================
     INIT — restaura progresso salvo (após atualizar a página)
     ========================================================= */
  function init() {
    Funnel.trackEvent('funnel_view');

    var saved = loadProgress();
    if (!saved) return;

    state.answers = saved.answers;
    state.currentQuestion = saved.currentQuestion;

    if (saved.screen === 'quiz') {
      showScreen('quiz');
      renderQuestion(state.currentQuestion, 'fwd', true);
    } else if (saved.screen === 'result' && window.QuizRules.isComplete(state.answers)) {
      renderResult();
      showScreen('result');
    }
  }

  init();
})();
