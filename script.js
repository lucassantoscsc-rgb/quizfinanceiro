(function () {
  'use strict';

  /* =========================================================
     CONFIG — troque pelo link real da Cakto
     ========================================================= */
  var CHECKOUT_URL_BASE = 'https://pay.cakto.com.br/o7zxmb3_786993';

  /* =========================================================
     TRACKING — pronto para GA4 / Meta Pixel
     ========================================================= */
  function trackEvent(eventName, payload) {
    payload = payload || {};
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: eventName }, payload));

    if (typeof gtag === 'function') gtag('event', eventName, payload);

    if (typeof fbq === 'function') {
      if (eventName === 'cta_click') {
        // Evento padrão do Meta para quem clicou rumo ao checkout — permite otimizar campanhas por esse objetivo
        fbq('track', 'InitiateCheckout', payload);
      } else {
        fbq('trackCustom', eventName, payload);
      }
    }
  }

  /* =========================================================
     UTM — captura na entrada, repassa no checkout (sem alterar)
     ========================================================= */
  function getUTMParams() {
    var params = new URLSearchParams(window.location.search);
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    var utm = {};
    keys.forEach(function (k) {
      if (params.has(k)) utm[k] = params.get(k);
    });
    return utm;
  }

  function buildCheckoutUrl() {
    var utm = state.utm;
    var keys = Object.keys(utm);
    if (keys.length === 0) return CHECKOUT_URL_BASE;
    var qs = keys.map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(utm[k]);
    }).join('&');
    var sep = CHECKOUT_URL_BASE.indexOf('?') > -1 ? '&' : '?';
    return CHECKOUT_URL_BASE + sep + qs;
  }

  /* =========================================================
     DADOS DO QUIZ — 6 perguntas reais (bate com a promessa da intro)
     ========================================================= */
  var QUESTIONS = [
    {
      id: 'awareness',
      eyebrow: 'Hoje',
      question: 'Você sabe exatamente para onde vai o seu dinheiro todo mês?',
      options: [
        { emoji: '😵', label: 'Não faço ideia', value: 'no_idea' },
        { emoji: '🤔', label: 'Mais ou menos', value: 'sort_of' },
        { emoji: '📝', label: 'Tento anotar, mas me perco', value: 'try_lose' },
        { emoji: '📊', label: 'Sim, mas quero melhorar', value: 'yes_improve' }
      ]
    },
    {
      id: 'feeling',
      eyebrow: 'Sensação',
      question: 'Quando pensa nas suas contas, o que você sente?',
      options: [
        { emoji: '😰', label: 'Ansiedade', value: 'anxiety' },
        { emoji: '😤', label: 'Frustração', value: 'frustration' },
        { emoji: '😔', label: 'Culpa', value: 'guilt' },
        { emoji: '😐', label: 'Prefiro nem olhar', value: 'avoidance' }
      ]
    },
    {
      id: 'leak',
      eyebrow: 'Vazamento',
      question: 'Onde você acha que mais "escorre" o seu dinheiro?',
      options: [
        { emoji: '🛍️', label: 'Compras por impulso / delivery', value: 'impulse' },
        { emoji: '📱', label: 'Assinaturas esquecidas', value: 'subscriptions' },
        { emoji: '💳', label: 'Juros de dívidas e parcelas', value: 'debt_interest' },
        { emoji: '❓', label: 'Não sei, é tudo meio misturado', value: 'unclear' }
      ]
    },
    {
      id: 'future',
      eyebrow: 'Se nada mudar',
      question: 'Como você imagina sua vida financeira daqui a 1 ano?',
      options: [
        { emoji: '😨', label: 'Ainda mais endividado(a)', value: 'more_debt' },
        { emoji: '😩', label: 'Vivendo de salário em salário', value: 'paycheck' },
        { emoji: '😟', label: 'Longe dos meus objetivos', value: 'far_goals' },
        { emoji: '😰', label: 'Sem nenhuma segurança pra emergências', value: 'no_security' }
      ]
    },
    {
      id: 'urgency',
      eyebrow: 'Prioridade',
      question: 'Quão urgente é resolver isso pra você agora?',
      options: [
        { emoji: '🔥', label: 'Quero resolver agora', value: 'now' },
        { emoji: '⏳', label: 'Pretendo resolver em breve', value: 'soon' },
        { emoji: '👀', label: 'Só estou pesquisando', value: 'researching' },
        { emoji: '💭', label: 'Sei que preciso, mas não sei por onde começar', value: 'lost' }
      ]
    },
    {
      id: 'objection',
      eyebrow: 'Última pergunta',
      question: 'O que mais te impede de ter controle financeiro hoje?',
      options: [
        { emoji: '🗂️', label: 'Falta de organização', value: 'disorganization' },
        { emoji: '🛠️', label: 'Não tenho a ferramenta certa', value: 'no_tool' },
        { emoji: '🧠', label: 'Esqueço de anotar / acompanhar', value: 'forgetfulness' },
        { emoji: '😵‍💫', label: 'Acho tudo muito complicado', value: 'complexity' }
      ]
    }
  ];

  var LEAK_LABELS = {
    impulse: 'compras por impulso e delivery',
    subscriptions: 'assinaturas que você nem lembra que paga',
    debt_interest: 'juros de dívidas e parcelas',
    unclear: 'gastos tão misturados que nem dá pra rastrear'
  };

  var URGENCY_LEAD_IN = {
    now: 'Já que você quer resolver isso agora, vamos direto ao ponto:',
    soon: 'Como você pretende resolver isso em breve, esse é o momento certo de começar:',
    researching: 'Já que você está pesquisando, aqui vai o motivo pra não deixar pra depois:',
    lost: 'Você não precisa saber por onde começar sozinho(a) — é exatamente pra isso que a planilha existe:'
  };

  var RESULT_COPY = {
    disorganization: {
      tag: 'Diagnóstico: Desorganização financeira',
      headline: 'Seu dinheiro não some por acaso — <span class="hl">ele está desorganizado</span>.',
      body: 'Você não precisa de mais disciplina, precisa de uma <strong>estrutura simples</strong> que te mostre, de forma visual, para onde cada real está indo. Sem isso, é praticamente impossível ter controle — não importa o quanto você se esforce.'
    },
    no_tool: {
      tag: 'Diagnóstico: Ferramenta errada',
      headline: 'O problema não é falta de esforço — <span class="hl">é não ter a ferramenta certa</span>.',
      body: 'Apps complicados, planilhas confusas ou anotações soltas no papel não funcionam a longo prazo. Você precisa de algo <strong>simples de usar todos os dias</strong>, que se encaixe na sua rotina em vez de virar mais uma tarefa chata.'
    },
    forgetfulness: {
      tag: 'Diagnóstico: Falta de acompanhamento',
      headline: 'Não é falta de vontade — <span class="hl">é falta de um lembrete simples</span>.',
      body: 'Anotar uma vez não resolve. O segredo está em ter um sistema fácil o bastante para <strong>virar hábito em poucos minutos por semana</strong>, sem esforço mental extra pra lembrar de atualizar.'
    },
    complexity: {
      tag: 'Diagnóstico: Excesso de complexidade',
      headline: 'Você não precisa de um sistema complicado — <span class="hl">precisa de um simples</span>.',
      body: 'Categorias infinitas, planilhas cheias de fórmulas e apps com 50 telas só afastam quem só quer entender o básico: quanto entra, quanto sai e quanto sobra. <strong>Simplicidade é o que gera constância.</strong>'
    }
  };

  /* =========================================================
     ESTADO — em memória, nunca em localStorage/sessionStorage
     ========================================================= */
  var state = {
    currentQuestion: 0,
    answers: {},
    utm: getUTMParams()
  };

  /* =========================================================
     DOM REFS
     ========================================================= */
  var topbar = document.getElementById('topbar');
  var backBtn = document.getElementById('backBtn');
  var progressFill = document.getElementById('progressFill');
  var progressLabel = document.getElementById('progressLabel');

  var screens = {
    intro: document.getElementById('screen-intro'),
    quiz: document.getElementById('screen-quiz'),
    loading: document.getElementById('screen-loading'),
    result: document.getElementById('screen-result')
  };

  var startBtn = document.getElementById('startBtn');
  var questionSlide = document.getElementById('questionSlide');

  var loadingText = document.getElementById('loadingText');
  var loadingProgressFill = document.getElementById('loadingProgressFill');
  var resultWrap = document.getElementById('resultWrap');

  /* =========================================================
     NAVEGAÇÃO ENTRE TELAS
     ========================================================= */
  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.toggle('active', key === name);
    });
    topbar.hidden = name !== 'quiz';
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  /* =========================================================
     TELA 1 — INTRO
     ========================================================= */
  startBtn.addEventListener('click', function () {
    trackEvent('quiz_start');
    showScreen('quiz');
    renderQuestion(0, 'fwd', true);
  });

  /* =========================================================
     TELA 2 — QUIZ
     ========================================================= */
  function renderProgress(index) {
    var total = QUESTIONS.length;
    var answeredPct = (index / total) * 100; // ao entrar na pergunta N (0-based), N já foram respondidas
    progressFill.style.width = answeredPct + '%';
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
      '<span class="question-eyebrow">' + q.eyebrow + '</span>' +
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
        // força reflow para garantir que a transição rode a partir do estado inicial
        void questionSlide.offsetWidth;
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

        var value = btn.dataset.value;
        state.answers[q.id] = value;

        buttons.forEach(function (b) {
          if (b === btn) {
            b.classList.add('is-selected');
            b.classList.remove('is-dimmed');
          } else {
            b.classList.add('is-dimmed');
          }
          b.disabled = true;
        });

        trackEvent('question_answered', {
          question_index: index + 1,
          question_id: q.id,
          answer: value
        });

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
      renderQuestion(state.currentQuestion, 'fwd');
    } else {
      // última pergunta respondida -> progresso 100% -> loading -> resultado
      progressFill.style.width = '100%';
      progressLabel.textContent = QUESTIONS.length + ' de ' + QUESTIONS.length;
      window.setTimeout(function () {
        startLoadingSequence();
      }, 200);
    }
  }

  backBtn.addEventListener('click', function () {
    if (state.currentQuestion === 0) {
      showScreen('intro');
      return;
    }
    state.currentQuestion -= 1;
    renderQuestion(state.currentQuestion, 'back');
  });

  /* =========================================================
     TELA 3 — LOADING
     ========================================================= */
  var LOADING_MESSAGES = [
    'Analisando suas respostas...',
    'Calculando seu perfil financeiro...',
    'Preparando seu diagnóstico...'
  ];

  function startLoadingSequence() {
    showScreen('loading');
    loadingProgressFill.style.width = '0%';
    loadingText.textContent = LOADING_MESSAGES[0];

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        loadingProgressFill.style.width = '100%';
      });
    });

    var msgIndex = 0;
    var msgInterval = window.setInterval(function () {
      msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length;
      loadingText.textContent = LOADING_MESSAGES[msgIndex];
    }, 650);

    window.setTimeout(function () {
      window.clearInterval(msgInterval);
      renderResult();
      showScreen('result');
    }, 2000);
  }

  /* =========================================================
     TELA 4 — RESULTADO DINÂMICO
     ========================================================= */
  function renderResult() {
    var objection = state.answers.objection || 'disorganization';
    var leak = state.answers.leak;
    var urgency = state.answers.urgency;

    var copy = RESULT_COPY[objection] || RESULT_COPY.disorganization;
    var leakLabel = LEAK_LABELS[leak] || LEAK_LABELS.unclear;
    var urgencyLeadIn = URGENCY_LEAD_IN[urgency] || URGENCY_LEAD_IN.now;

    var checkoutUrl = buildCheckoutUrl();

    resultWrap.innerHTML =
      '<div class="result-header">' +
        '<span class="result-tag">' + copy.tag + '</span>' +
        '<h1 class="result-headline">' + copy.headline + '</h1>' +
      '</div>' +

      '<div class="result-card">' +
        '<p>' + copy.body + '</p>' +
        '<span class="leak-chip">⚠️ Seu maior ponto de atenção: ' + leakLabel + '</span>' +
        '<p>' + urgencyLeadIn + ' a <strong>Planilha de Organização Financeira</strong> foi criada pra te dar clareza total sobre suas contas em minutos, sem complicação.</p>' +
      '</div>' +

      '<div class="stats-row">' +
        '<div class="stat-item"><div class="stat-number">+12.400</div><div class="stat-label">diagnósticos feitos</div></div>' +
        '<div class="stat-item"><div class="stat-number">4,9/5</div><div class="stat-label">avaliação média</div></div>' +
        '<div class="stat-item"><div class="stat-number">7 dias</div><div class="stat-label">garantia total</div></div>' +
      '</div>' +

      '<div class="testimonial-card">' +
        '<span class="stars">★★★★★</span>' +
        '<p class="quote">"Em uma semana usando a planilha eu já entendia pra onde meu dinheiro ia. Simples e direto ao ponto."</p>' +
        '<span class="testimonial-author">— Camila R.</span>' +
      '</div>' +

      '<div class="offer-card">' +
        '<span class="offer-title">Planilha de Organização Financeira</span>' +
        '<div class="offer-price-row">' +
          '<span class="offer-price-old">De R$47</span>' +
          '<span class="offer-price-new">R$17</span>' +
        '</div>' +
        '<ul class="offer-includes">' +
          '<li>' + checkIcon() + ' Planilha completa e pronta pra usar</li>' +
          '<li>' + checkIcon() + ' Categorias de gastos automáticas</li>' +
          '<li>' + checkIcon() + ' Painel visual de para onde vai seu dinheiro</li>' +
          '<li>' + checkIcon() + ' Bônus: quitação de dívidas por R$7,90 no checkout</li>' +
        '</ul>' +
        '<div class="guarantee-strip">🛡️ Garantia incondicional de 7 dias — ou seu dinheiro de volta</div>' +
      '</div>' +

      '<div class="final-cta-wrap">' +
        '<button class="btn btn-primary btn-large btn-pulse" id="finalCtaBtn" type="button">' +
          'Quero ver para onde meu dinheiro vai' +
          checkoutArrowIcon() +
        '</button>' +
        '<span class="final-cta-note">Acesso imediato após a confirmação · Pagamento seguro</span>' +
      '</div>';

    document.getElementById('finalCtaBtn').addEventListener('click', function () {
      trackEvent('cta_click', { objection: objection, leak: leak, urgency: urgency });
      window.location.href = checkoutUrl;
    });
  }

  function checkIcon() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13L9.5 17.5L19 7" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function checkoutArrowIcon() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

})();
