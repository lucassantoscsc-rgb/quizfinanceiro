(function () {
  'use strict';

  var QUESTIONS = window.QuizRules.QUESTIONS;
  var Funnel = window.Funnel;

  /* =========================================================
     COPY SAZONAL — fim de 2026 / virada para 2027.
     Fatos de calendário, sem urgência inventada.
     Para desativar depois de janeiro/2027: troque `ativa` para
     false (o funil volta ao texto atemporal) e reverta a headline
     da abertura, conforme o comentário no index.html.
     ========================================================= */
  var SEASONAL = {
    ativa: true,
    titulo: 'Os próximos meses são os que mais mexem no orçamento',
    texto: 'Entre o 13º, os gastos de fim de ano e as contas que chegam em janeiro, como IPTU, IPVA e material escolar, os próximos meses concentram as maiores variações do ano. Quem entra neles com as contas mapeadas sente menos o impacto.'
  };

  /* =========================================================
     ESTADO + PERSISTÊNCIA (sessionStorage)
     Guarda só etapa e chaves das respostas — nada pessoal.
     ========================================================= */
  var STORAGE_KEY = 'quizfinanceiro:progress';

  var state = {
    screen: 'intro',       // 'intro' | 'quiz' | 'analise' | 'result'
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
      var validScreens = { intro: 1, quiz: 1, analise: 1, result: 1 };
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
  var restartBtnTop = document.getElementById('restartBtnTop');
  var progressFill = document.getElementById('progressFill');
  var progressLabel = document.getElementById('progressLabel');

  var screens = {
    intro: document.getElementById('screen-intro'),
    quiz: document.getElementById('screen-quiz'),
    analise: document.getElementById('screen-analise'),
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
    /* Abertura, perguntas e análise no verde escuro; o resultado volta ao fundo claro */
    document.body.classList.toggle('fundo-escuro', name !== 'result');
    state.screen = name;
    window.scrollTo(0, 0);
  }

  function restart() {
    window.clearTimeout(analiseTimer);
    state.currentQuestion = 0;
    state.answers = {};
    clearProgress();
    resultWrap.innerHTML = '';
    showScreen('intro');
    var barra = document.getElementById('barraCompra');
    if (barra && barra._atualizar) barra._atualizar();
  }

  /* =========================================================
     TELA 1 — ABERTURA
     ========================================================= */
  startBtn.addEventListener('click', function () {
    Funnel.trackEvent('quiz_start');
    /* Começa sempre do zero: sem isso, respostas de uma tentativa
       anterior guardadas em memória se misturariam com as novas e o
       resultado sairia errado. Como não dá para voltar e corrigir,
       uma resposta velha passaria despercebida. */
    state.answers = {};
    state.currentQuestion = 0;
    showScreen('quiz');
    renderQuestion(0, true);
    saveProgress();
  });

  /* =========================================================
     TELA 2 — QUIZ
     ========================================================= */
  function renderProgress(index) {
    var total = QUESTIONS.length;
    progressFill.style.width = ((index + 1) / total) * 100 + '%';
    progressLabel.textContent = 'Pergunta ' + (index + 1) + ' de ' + total;
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
      (q.nota ? '<p class="question-nota">' + q.nota + '</p>' : '') +
      '<div class="options-list">' + optionsHTML + '</div>'
    );
  }

  /* O quiz só avança: não há navegação para a pergunta anterior. */
  function renderQuestion(index, skipAnim) {
    var q = QUESTIONS[index];
    var savedValue = state.answers[q.id];
    renderProgress(index);

    function paint() {
      questionSlide.innerHTML = buildQuestionHTML(q, savedValue);
      bindOptionClicks(q, index);

      if (!skipAnim) {
        questionSlide.classList.add('slide-in-fwd-start');
        void questionSlide.offsetWidth; // força reflow para a transição partir do estado inicial
        requestAnimationFrame(function () {
          questionSlide.classList.remove('slide-in-fwd-start');
        });
      }
    }

    if (skipAnim) {
      questionSlide.classList.remove('slide-out-fwd');
      paint();
      return;
    }

    questionSlide.classList.add('slide-out-fwd');
    window.setTimeout(function () {
      questionSlide.classList.remove('slide-out-fwd');
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

  /* Pausas curtas de incentivo depois de algumas perguntas (índice da pergunta
     respondida → conteúdo). Só texto na tela, sem rastreamento das respostas. */
  var PAUSAS = {
    1: function (a) {
      var aperto = a.mes === 'falta' || a.mes === 'acaba';
      return aperto
        ? { emoji: '🤝', titulo: 'Você não está sozinho', texto: 'Chegar ao fim do mês no aperto é muito comum, e a saída quase sempre começa pelo mesmo lugar: enxergar para onde o dinheiro vai. É isso que vamos montar para você.' }
        : { emoji: '👏', titulo: 'Ótimo sinal', texto: 'Quem já tem alguma sobra está a poucos ajustes de fazer o dinheiro render de verdade. Vamos descobrir quais são os seus.' };
    },
    3: function () {
      return { emoji: '👀', titulo: 'Seu perfil já está aparecendo', texto: 'Faltam só 2 perguntas para montar seu nível de controle, sua projeção de 12 meses e o seu primeiro passo.' };
    }
  };

  function renderPausa(conteudo, depois) {
    questionSlide.classList.add('slide-out-fwd');
    window.setTimeout(function () {
      questionSlide.classList.remove('slide-out-fwd');
      questionSlide.innerHTML =
        '<div class="pausa">' +
          '<span class="pausa-emoji">' + conteudo.emoji + '</span>' +
          '<h2 class="pausa-titulo">' + conteudo.titulo + '</h2>' +
          '<p class="pausa-texto">' + conteudo.texto + '</p>' +
          '<button class="btn btn-gold btn-large" type="button" id="pausaBtn">Continuar' + arrowIcon() + '</button>' +
        '</div>';
      questionSlide.classList.add('slide-in-fwd-start');
      void questionSlide.offsetWidth;
      window.setTimeout(function () { questionSlide.classList.remove('slide-in-fwd-start'); }, 20);
      document.getElementById('pausaBtn').addEventListener('click', depois, { once: true });
    }, 260);
  }

  function advanceFromQuestion(index) {
    if (index < QUESTIONS.length - 1) {
      state.currentQuestion = index + 1;
      saveProgress();
      var proxima = function () { renderQuestion(state.currentQuestion); };
      if (PAUSAS[index]) renderPausa(PAUSAS[index](state.answers), proxima);
      else proxima();
      return;
    }
    Funnel.trackEvent('quiz_complete');
    analisar();
  }

  /* Tela "Analisando suas respostas...": marca os itens um a um e abre o resultado.
     Usa setTimeout (não requestAnimationFrame) para não travar em aba em segundo plano. */
  var analiseTimer = null;
  function analisar() {
    showScreen('analise');
    saveProgress();
    var itens = document.querySelectorAll('#analiseLista li');
    var anel = document.getElementById('analiseAnel');
    var pct = document.getElementById('analisePct');
    var CIRC = 2 * Math.PI * 52;
    itens.forEach(function (li) { li.classList.remove('feito', 'ativo'); });
    anel.style.strokeDasharray = CIRC;
    anel.style.strokeDashoffset = CIRC;
    var passo = 0;
    var total = itens.length;
    function tick() {
      if (state.screen !== 'analise') return;
      if (passo > 0) itens[passo - 1].classList.replace('ativo', 'feito');
      if (passo < total) itens[passo].classList.add('ativo');
      var p = Math.round((passo / total) * 100);
      pct.textContent = p + '%';
      anel.style.strokeDashoffset = CIRC * (1 - passo / total);
      if (passo >= total) {
        analiseTimer = window.setTimeout(function () {
          if (state.screen !== 'analise') return;
          renderResult();
          showScreen('result');
          saveProgress();
        }, 550);
        return;
      }
      passo++;
      analiseTimer = window.setTimeout(tick, 750);
    }
    tick();
  }

  restartBtnTop.addEventListener('click', restart);

  /* =========================================================
     TELA 3 — RESULTADO + OFERTA
     ========================================================= */
  /* Motivos para o app a partir das respostas (até 3). Fica só na tela: as respostas
     nunca vão para o rastreamento. */
  function recomendacaoApp(r) {
    r = r || {};
    var DIF = {
      esqueco: '⏰ Você disse que <strong>esquece de atualizar</strong>: o app te lembra todo dia e deixa lançar um gasto em segundos, até falando.',
      complicado: '🧩 Você acha as ferramentas <strong>complicadas</strong>: no app, lançar um gasto leva 3 toques, e um tutorial guiado mostra tudo no primeiro acesso.',
      comecar: '🤔 Você <strong>não sabe por onde começar</strong>: o app tem um tutorial passo a passo e já vem com categorias e metas prontas.',
      rotina: '🔁 Você já tem uma rotina: o app traz dicas automáticas, calendário e retrospectiva do mês para levar seu controle a outro nível.'
    };
    var PESO = {
      dividas: '💳 <strong>Dívidas e parcelas</strong> pesam para você: o app mostra quando cada dívida termina, quanto de juros falta e monta um plano para quitar mais rápido.',
      variaveis: '🛍️ Os <strong>gastos com compras e delivery</strong> pesam: o app avisa quando uma categoria passa do normal e encontra suas assinaturas.',
      essenciais: '🏠 Suas <strong>despesas essenciais</strong> são altas: o app mostra quanto dá para gastar por dia e simula se uma compra cabe antes de você gastar.',
      nao_sei: '❓ Você <strong>não sabe o que mais pesa</strong>: os gráficos do app mostram para onde vai cada real, e as dicas apontam o que está fora do normal.'
    };
    var PRIO = {
      dividas: PESO.dividas,
      reserva: '🐷 Você quer <strong>começar uma reserva</strong>: o app calcula a reserva ideal para você e mostra quanto guardar por mês.',
      planejar: '🎯 Você quer <strong>planejar o que sobra</strong>: com os cofrinhos, você define objetivos e o app diz quanto guardar por mês para cada um.',
      contas: '🗂️ Você quer <strong>organizar as contas</strong>: o app avisa as contas que vão vencer e copia as contas fixas para o mês seguinte.'
    };
    var motivos = [];
    var add = function (t) { if (t && motivos.indexOf(t) < 0 && motivos.length < 3) motivos.push(t); };
    add(DIF[r.dificuldade]);
    if (r.metodo === 'app_sem_manter') add('📱 Você já tentou e <strong>não conseguiu manter</strong>: o app tem lembretes, sequência de dias e conquistas que ajudam a criar o hábito.');
    add(PESO[r.peso]);
    add(PRIO[r.prioridade]);
    if (!motivos.length) return '';
    return '<div class="reco-card">' +
        '<span class="reco-tag">💡 Pelo que você respondeu</span>' +
        '<h3 class="reco-title">O app combina mais com você</h3>' +
        '<ul class="reco-list">' + motivos.map(function (m) { return '<li>' + m + '</li>'; }).join('') + '</ul>' +
      '</div>';
  }

  /* Mensagens reais de clientes da planilha (só o primeiro nome, sem foto nem @). */
  // [nome, texto, origem]. Só o primeiro nome, com autorização.
  var DEPOIMENTOS = [["Jailson", "Eu estou adorando o app, muito bom. Vocês estão de parabéns. Já tentei várias planilhas, e nenhuma foi tão prática como este app.", "Usa o app Tino · mensagem para o suporte"], ["Kaique", "Comprei a planilha esses dias atrás e ela é muito boa. Estou conseguindo ter mais noção de quanto dinheiro eu posso gastar e saber quanto eu gastei durante o mês. Tamo junto!! 👏🚀"], ["Tiago", "Eu assisti mais vídeos e já tô entendendo melhor. Melhor coisa que eu fiz foi ter comprado, viu kkkk. Agora eu vou ter mais controle do meu dinheiro."], ["Lucas", "Comprei sua planilha, achei ela muito maneira, era exatamente o que eu tava procurando pra me organizar. Parabéns mesmo pelo trabalho. Agora é voar alto e gastar com consciência e controle."]];
  function depoimentosHTML() {
    return '<div class="deps-quiz">' +
        '<span class="reco-tag">💬 Quem já comprou</span>' +
        '<div class="deps">' + DEPOIMENTOS.map(function (d) {
          return '<figure class="dep' + (d[2] ? ' dep--app' : '') + '"><blockquote>“' + d[1] + '”</blockquote>' +
            '<figcaption><span class="dep-av" aria-hidden="true">' + d[0].charAt(0) + '</span>' +
            '<span><b>' + d[0] + '</b><small>' + (d[2] || 'Comprou a planilha · mensagem no Instagram') + '</small></span></figcaption></figure>';
        }).join('') + '</div>' +
      '</div>';
  }

  function compareRow(item, planilha, app) {
    var marca = function (v, cls) { return '<td class="' + cls + (v === '—' ? ' no' : '') + '">' + v + '</td>'; };
    return '<tr><th scope="row">' + item + '</th>' + marca(planilha, 'col-plan') + marca(app, 'col-app') + '</tr>';
  }
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
          '<div><strong class="action-titulo">' + r.titulos[i] + '</strong>' +
          '<p>' + texto + '</p></div>' +
        '</li>'
      );
    }).join('');

    var proj = r.projecao;
    var projHTML =
      '<div class="result-card proj-card">' +
        '<span class="reco-tag">📈 Sua projeção de 12 meses</span>' +
        '<p class="proj-frase">' + (r.mesApertado ? 'Abrindo uma folga de ' : 'Guardando ') + '<strong>' + reais(proj.mensal) + ' por mês</strong>' +
          (proj.pct ? ' (cerca de ' + proj.pct + '% da sua renda)' : '') + ', em 1 ano você teria:</p>' +
        '<strong class="proj-valor">' + reais(proj.anual) + '</strong>' +
        '<div class="proj-barras" aria-hidden="true">' + barrasProjecao() + '</div>' +
        '<p class="proj-nota">' + (proj.pct ? 'Simulação simples a partir da faixa de renda que você indicou, sem juros nem rendimentos.' : 'Exemplo com R$100 por mês, já que você preferiu não informar a renda. Simulação simples, sem juros.') + '</p>' +
      '</div>';

    resultWrap.innerHTML =
      /* ---------- Resultado ---------- */
      '<div class="perfil-card">' +
        '<span class="perfil-tag">Seu perfil financeiro</span>' +
        '<span class="perfil-emoji" aria-hidden="true">' + r.perfil.emoji + '</span>' +
        '<h1 class="result-headline perfil-nome">' + r.perfil.nome + '</h1>' +
        '<p class="perfil-texto">' + r.perfil.texto + '</p>' +
        '<div class="medidor" role="img" aria-label="Seu nível de controle hoje: ' + r.nivel + ' de 100">' +
          '<svg viewBox="0 0 200 110" aria-hidden="true"><defs><linearGradient id="gGrad" x1="0" x2="1"><stop offset="0" stop-color="#fcd34d"/><stop offset="1" stop-color="#34d399"/></linearGradient></defs>' +
            '<path d="M20 100 A80 80 0 0 1 180 100" class="g-track"/>' +
            '<path d="M20 100 A80 80 0 0 1 180 100" class="g-fill" id="medidorFill"/></svg>' +
          '<div class="medidor-num"><strong id="medidorNum">0</strong><span>/100</span></div>' +
        '</div>' +
        '<p class="medidor-rotulo">Seu nível de controle hoje: <b>' + r.nivelRotulo + '</b></p>' +
        '<div class="perfil-passo"><span>🎯 Seu primeiro passo</span><b>' + r.passo.charAt(0).toUpperCase() + r.passo.slice(1) + '</b></div>' +
      '</div>' +

      projHTML +

      '<div class="result-card">' +
        '<h2 class="actions-title">Seu plano em 3 ações</h2>' +
        '<ol class="actions-list">' + acoesHTML + '</ol>' +
        '<span class="leak-chip">Ponto de atenção que você indicou: ' + r.atencao + '</span>' +
        '<p class="actions-note">' + r.resumo + ' Isso é uma orientação inicial, não um diagnóstico definitivo, e você pode aplicar tudo sem comprar nada.</p>' +
      '</div>' +

      (SEASONAL.ativa
        ? '<div class="season-card">' +
            '<span class="season-tag">📅 ' + SEASONAL.titulo + '</span>' +
            '<p>' + SEASONAL.texto + '</p>' +
          '</div>'
        : '') +

      /* ---------- Oferta ---------- */
      '<section class="offer-section" id="offerSection" aria-labelledby="offerTitle">' +
        '<h2 class="offer-headline" id="offerTitle">' +
          (SEASONAL.ativa
            ? 'Entre em 2027 com esse primeiro passo já dado.'
            : 'Transforme esse primeiro passo em uma organização que você consegue acompanhar.') +
        '</h2>' +
        '<p class="offer-lead">Você pode fazer isso de dois jeitos: com a <strong>Planilha de Organização Financeira</strong>, pronta no Google Planilhas, ou com o <strong>Tino Finanças</strong>, nosso app no celular, que registra o que entra e o que sai e faz as contas sozinho. Os dois são a estrutura que as ações acima pedem, sem você precisar montar do zero.</p>' +
        '<div class="escolha-rapida" role="note">' +
          '<p><span>📊</span><span><strong>Quer uma planilha?</strong> Escolha a de <strong>R$17</strong>. É um arquivo do Google Planilhas.</span></p>' +
          '<p><span>📱</span><span><strong>Prefere um aplicativo no celular?</strong> Escolha o Tino, <strong>R$27</strong>. Não é planilha e não fica na App Store: você instala pelo navegador.</span></p>' +
        '</div>' +

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
            '<li>' + checkIcon() + ' Contas do mês com valor planejado, valor pago e data, além do gráfico planejado vs. real</li>' +
            '<li>' + checkIcon() + ' Reserva de emergência e metas (ex.: carro) com meta, reservado no mês e quanto falta</li>' +
            '<li>' + checkIcon() + ' Reservas e investimentos registrados por tipo, e uso do débito e do crédito no mês</li>' +
          '</ul>' +
        '</div>' +

        /* Por que o app combina com o que a pessoa respondeu */
        recomendacaoApp(state.answers) +

        '<div class="app-live app-live--quiz" data-app-live="quiz-resultado">' +
          '<span class="reco-tag">📱 Experimente agora, sem cadastro</span>' +
          '<div class="phone">' +
            '<img class="phone-poster" src="assets/app/app-resumo-v2.jpg" alt="Tela inicial do app com o quanto você pode gastar hoje" width="600" height="1298" loading="lazy">' +
            '<button class="phone-play" type="button">▶ Toque para experimentar</button>' +
          '</div>' +
          '<p class="app-live-note">É o app de verdade, com dados de exemplo. Toque, navegue e lance um gasto.</p>' +
        '</div>' +

        depoimentosHTML() +

        /* Comparação rápida: o app faz tudo da planilha e mais. */
        '<div class="compare-card">' +
          '<h3 class="compare-title">Planilha ou app? Veja a diferença</h3>' +
          '<table class="compare">' +
            '<thead><tr><th></th><th>Planilha</th><th class="col-app">App ⭐</th></tr></thead>' +
            '<tbody>' +
              compareRow('Entradas, gastos, contas e metas', '✓', '✓') +
              compareRow('“Restante para gastar” e gráficos', '✓', '✓') +
              compareRow('Lançar em segundos no celular, até falando', '—', '✓') +
              compareRow('Faturas do cartão e parcelas automáticas', '—', '✓') +
              compareRow('Cofrinhos, orçamentos e dicas do mês', 'Metas', '✓') +
              compareRow('Lembretes de contas no celular', '—', '✓') +
              compareRow('Funciona sem internet', '—', '✓') +
              compareRow('Acesso vitalício, sem mensalidade', '✓', '✓') +
              compareRow('Preço (pagamento único)', 'R$17', 'R$27') +
            '</tbody>' +
          '</table>' +
        '</div>' +

        /* Oferta 1 (destaque): o app no celular, R$27 */
        '<p class="dep-destaque">“Já tentei várias planilhas, e nenhuma foi tão prática como este app.”<span>Jailson, usa o app Tino</span></p>' +
        '<div class="offer-card offer-card--app">' +
          '<span class="offer-badge">⭐ Mais vantajoso</span>' +
          '<span class="offer-title">📱 Tino Finanças · app no celular</span>' +
          '<p class="offer-sub"><strong>Um aplicativo para o celular, não é planilha.</strong> Faz tudo o que a planilha faz, com as contas feitas sozinhas.</p>' +
          '<div class="offer-price-row">' +
            '<span class="offer-price-new">R$27</span>' +
            '<span class="offer-price-meta">pagamento único</span>' +
          '</div>' +
          '<span class="offer-diff">Só R$10 a mais que a planilha</span>' +
          '<ul class="offer-includes">' +
            '<li class="offer-destaque">' + checkIcon() + ' <span><strong>Acesso vitalício, sem mensalidade:</strong> paga uma vez e usa para sempre, com todas as atualizações</span></li>' +
            '<li>' + checkIcon() + ' App para iPhone e Android: instala na tela inicial e funciona até sem internet</li>' +
            '<li>' + checkIcon() + ' Não precisa baixar na App Store nem na Play Store: você abre o link e instala pelo navegador</li>' +
            '<li>' + checkIcon() + ' Lança um gasto em segundos, até falando: “gastei 45 no ifood no crédito”</li>' +
            '<li>' + checkIcon() + ' Faturas do cartão e parcelas calculadas sozinhas</li>' +
            '<li>' + checkIcon() + ' Cofrinhos com prazo, orçamentos e dicas do mês</li>' +
            '<li>' + checkIcon() + ' Lembretes das contas a vencer no celular</li>' +
            '<li>' + checkIcon() + ' <span>Suporte por e-mail e WhatsApp<br><a class="offer-link" href="mailto:suporteplanilhass@gmail.com">suporteplanilhass@gmail.com</a></span></li>' +
          '</ul>' +
          '<div class="guarantee-strip">🛡️ Garantia incondicional de 7 dias: não gostou por qualquer motivo, é só pedir o reembolso</div>' +
          '<button class="btn btn-gold btn-large btn-pulse-gold" id="appBuyBtn" type="button">Quero o app por R$27' + arrowIcon() + '</button>' +
          '<button class="offer-demo" id="appDemoBtn" type="button">👀 Experimentar o app grátis antes</button>' +
          '<p class="offer-aviso">Queria uma planilha? Escolha a opção de R$17 logo abaixo.</p>' +
        '</div>' +

        /* Oferta 2: a planilha, R$17 */
        '<div class="offer-card offer-card--planilha">' +
          '<span class="offer-title">📊 Planilha de Organização Financeira</span>' +
          '<p class="offer-sub"><strong>Um arquivo do Google Planilhas, não é aplicativo.</strong> Para quem prefere usar no computador.</p>' +
          '<div class="offer-price-row">' +
            '<span class="offer-price-new">R$17</span>' +
            '<span class="offer-price-meta">pagamento único</span>' +
          '</div>' +
          '<ul class="offer-includes">' +
            '<li>' + checkIcon() + ' A Planilha de Organização Financeira (produto digital)</li>' +
            '<li>' + checkIcon() + ' Tutorial em vídeo de como fazer sua cópia e preencher o mês</li>' +
            '<li>' + checkIcon() + ' Feita no Google Planilhas: você faz uma cópia para o seu Google Drive e usa no computador ou no celular, pelo app do Google Planilhas</li>' +
            '<li>' + checkIcon() + ' <span>Suporte por e-mail e WhatsApp<br><a class="offer-link" href="mailto:suporteplanilhass@gmail.com">suporteplanilhass@gmail.com</a></span></li>' +
          '</ul>' +
          '<div class="guarantee-strip">🛡️ Garantia incondicional de 7 dias: não gostou por qualquer motivo, é só pedir o reembolso</div>' +
          '<button class="btn btn-outline btn-large" id="finalCtaBtn" type="button">Quero a planilha por R$17</button>' +
        '</div>' +

        '<p class="final-cta-note offer-note">Acesso imediato após a confirmação do pagamento. Pix ou cartão de crédito.</p>' +
      '</section>' +

      '<div class="result-footer">' +
        '<button class="link-btn" id="restartBtnResult" type="button">Refazer o quiz</button>' +
      '</div>';

    document.getElementById('finalCtaBtn').addEventListener('click', function () {
      Funnel.goToCheckout();
    });
    document.getElementById('appDemoBtn').addEventListener('click', function () {
      Funnel.openAppDemo({ cta_position: 'quiz-resultado' });
    });
    var appBuy = document.getElementById('appBuyBtn');
    if (!Funnel.isOfferReady('app')) { appBuy.disabled = true; appBuy.title = 'Em breve'; }
    else appBuy.addEventListener('click', function () { Funnel.goToCheckout('app', { cta_position: 'quiz-resultado' }); });
    document.getElementById('restartBtnResult').addEventListener('click', restart);
    Funnel.ativarAppAoVivo(resultWrap);
    /* Barra fixa do app no celular: depois do título do resultado, sumindo nos cards de oferta */
    Funnel.barraFixa({ depoisDe: '.perfil-card', esconderEm: ['.offer-card--app', '.offer-card--planilha'] });

    var demoVideo = resultWrap.querySelector('.demo-video video');
    if (demoVideo) {
      demoVideo.addEventListener('play', function () {
        Funnel.trackEvent('demo_video_play');
      }, { once: true });
    }

    observeOfferView();
    animarMedidor(r.nivel);
  }

  function reais(v) {
    return 'R$' + v.toLocaleString('pt-BR');
  }

  /* 12 barrinhas crescendo: só ilustra o acúmulo mês a mês */
  function barrasProjecao() {
    var h = '';
    for (var m = 1; m <= 12; m++) h += '<i style="height:' + Math.round(14 + (m / 12) * 86) + '%"></i>';
    return h;
  }

  /* Medidor: preenche o arco e conta até a nota (setTimeout, sem rAF) */
  function animarMedidor(nota) {
    var fill = document.getElementById('medidorFill');
    var num = document.getElementById('medidorNum');
    if (!fill || !num) return;
    var COMP = Math.PI * 80;
    fill.style.strokeDasharray = COMP;
    fill.style.strokeDashoffset = COMP;
    void fill.getBoundingClientRect();
    window.setTimeout(function () { fill.style.strokeDashoffset = COMP * (1 - nota / 100); }, 60);
    var atual = 0;
    var passo = Math.max(1, Math.round(nota / 30));
    (function conta() {
      atual = Math.min(nota, atual + passo);
      num.textContent = atual;
      if (atual < nota) window.setTimeout(conta, 30);
    })();
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
      renderQuestion(state.currentQuestion, true);
    } else if ((saved.screen === 'result' || saved.screen === 'analise') && window.QuizRules.isComplete(state.answers)) {
      renderResult();
      showScreen('result');
    }
  }

  init();
})();
