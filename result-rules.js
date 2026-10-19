/* =========================================================
   REGRAS DO QUIZ — perguntas e montagem do resultado.
   Arquivo puro (sem DOM), exposto em window.QuizRules para
   ser testável e reutilizável.

   Regras (determinísticas, uma resposta por "encaixe"):
   - prioridade (P4) define o primeiro passo e a ação 1
   - metodo     (P1) adapta a orientação ao método atual
   - mes        (P2) contextualiza o fim do mês e ajusta a
                     ação 1 quando a prioridade depende de sobra
   - peso       (P3) vira o "ponto de atenção" e a ação 2
   - dificuldade(P5) vira a ação 3 (rotina)
   ========================================================= */
window.QuizRules = (function () {
  'use strict';

  var QUESTIONS = [
    {
      id: 'metodo',
      question: 'Como você acompanha seu dinheiro hoje?',
      options: [
        { emoji: '🙈', label: 'Não acompanho.', value: 'nao_acompanho' },
        { emoji: '📝', label: 'Uso anotações, mas me perco.', value: 'anotacoes' },
        { emoji: '📱', label: 'Uso aplicativo ou planilha, mas não mantenho.', value: 'app_sem_manter' },
        { emoji: '📊', label: 'Já acompanho e quero melhorar.', value: 'acompanho' }
      ]
    },
    {
      id: 'mes',
      question: 'O que costuma acontecer no fim do mês?',
      options: [
        { emoji: '😬', label: 'Falta dinheiro para fechar as contas.', value: 'falta' },
        { emoji: '😐', label: 'O dinheiro acaba e quase nada sobra.', value: 'acaba' },
        { emoji: '🙂', label: 'Sobra um pouco, mas não tenho um plano.', value: 'sobra_sem_plano' },
        { emoji: '💪', label: 'Consigo guardar e quero me organizar melhor.', value: 'guardo' }
      ]
    },
    {
      id: 'renda',
      question: 'Qual é, mais ou menos, a sua renda por mês?',
      nota: '🔒 Fica só no seu aparelho. Serve para calcular sua projeção.',
      options: [
        { emoji: '🪙', label: 'Até R$2 mil', value: 'ate2' },
        { emoji: '💵', label: 'De R$2 mil a R$4 mil', value: '2a4' },
        { emoji: '💰', label: 'De R$4 mil a R$7 mil', value: '4a7' },
        { emoji: '💎', label: 'Acima de R$7 mil', value: 'mais7' },
        { emoji: '🤐', label: 'Prefiro não dizer', value: 'nao_dizer' }
      ]
    },
    {
      id: 'peso',
      question: 'O que mais pesa na sua organização?',
      options: [
        { emoji: '💳', label: 'Dívidas e parcelas.', value: 'dividas' },
        { emoji: '🛍️', label: 'Gastos variáveis, como compras e delivery.', value: 'variaveis' },
        { emoji: '🏠', label: 'Despesas essenciais altas em relação à renda.', value: 'essenciais' },
        { emoji: '❓', label: 'Não consigo identificar.', value: 'nao_sei' }
      ]
    },
    {
      id: 'prioridade',
      question: 'Qual é sua prioridade agora?',
      options: [
        { emoji: '🗂️', label: 'Organizar minhas contas.', value: 'contas' },
        { emoji: '📉', label: 'Organizar o pagamento das dívidas.', value: 'dividas' },
        { emoji: '🐷', label: 'Começar uma reserva.', value: 'reserva' },
        { emoji: '🎯', label: 'Planejar melhor o dinheiro que já sobra.', value: 'planejar' }
      ]
    },
    {
      id: 'dificuldade',
      question: 'O que mais dificulta manter o controle?',
      options: [
        { emoji: '🤔', label: 'Não sei como começar.', value: 'comecar' },
        { emoji: '⏰', label: 'Esqueço de atualizar.', value: 'esqueco' },
        { emoji: '🧩', label: 'Acho as ferramentas complicadas.', value: 'complicado' },
        { emoji: '🔁', label: 'Já tenho uma rotina e quero melhorar.', value: 'rotina' }
      ]
    }
  ];

  var MES_APERTADO = { falta: true, acaba: true };

  /* P4 — primeiro passo + ação 1 (com variante quando o mês está apertado
     e a prioridade depende de sobra, para não sugerir o impossível) */
  var PRIORIDADE = {
    contas: {
      passo: 'colocar todas as suas contas em um só lugar',
      titulo: 'Liste todas as contas fixas do mês',
      acao: 'Liste todas as contas fixas do mês (moradia, luz, internet, parcelas) com valor e data de vencimento. Só de ver tudo junto, você já sabe quanto do mês está comprometido.'
    },
    dividas: {
      passo: 'organizar o pagamento das dívidas',
      titulo: 'Monte a lista das suas dívidas',
      acao: 'Anote cada dívida com valor total, parcela, juros e vencimento. Com a lista pronta, priorize as de juros mais altos e defina quanto cabe pagar por mês sem apertar as contas essenciais.'
    },
    reserva: {
      passo: 'começar uma reserva pequena e constante',
      titulo: 'Separe um valor fixo assim que o dinheiro entrar',
      tituloMesApertado: 'Feche as contas do mês antes da reserva',
      acao: 'Escolha um valor fixo que caiba no seu mês, mesmo que pequeno, e separe assim que o dinheiro entrar, antes de gastar. No começo, constância importa mais que o valor.',
      acaoMesApertado: 'Antes de definir a reserva, feche o mês: veja o que entra, o que é fixo e o que sobra de verdade. A reserva começa com o valor que sobrar dessa conta, mesmo que pequeno, separado assim que o dinheiro entrar.'
    },
    planejar: {
      passo: 'dar um destino ao dinheiro que sobra',
      titulo: 'Dê um destino à sobra antes do mês começar',
      tituloMesApertado: 'Descubra quanto sobra de verdade',
      acao: 'Defina para onde vai a sobra antes do mês começar: uma parte para reserva, uma para um objetivo e uma para gastos livres. Sem destino, a sobra tende a ser gasta sem perceber.',
      acaoMesApertado: 'Pelas suas respostas, a sobra ainda não é constante. Comece registrando entradas e saídas do mês para saber quanto realmente sobra. O planejamento vem depois desse número.'
    }
  };

  /* P1 — frase que adapta ao método atual */
  var METODO = {
    nao_acompanho: 'Como você ainda não acompanha, comece simples: registrar o que entra e o que sai por um mês já muda a visão.',
    anotacoes: 'Você já anota, mas se perde. O ponto é concentrar tudo em um único lugar, no mesmo formato todo mês.',
    app_sem_manter: 'Você já tentou aplicativo ou planilha e não manteve. Vale reduzir para o mínimo que você consegue atualizar de verdade.',
    acompanho: 'Você já acompanha. O próximo nível é usar o registro para decidir, não só para conferir.'
  };

  /* P2 — contexto do fim do mês */
  var MES = {
    falta: 'No fim do mês falta dinheiro para fechar as contas, então o foco inicial é enxergar o mês inteiro antes de qualquer meta.',
    acaba: 'O dinheiro acaba e quase nada sobra, então o objetivo dos próximos meses é abrir uma folga, mesmo pequena.',
    sobra_sem_plano: 'Sobra um pouco, mas sem plano. O que falta não é dinheiro, é destino.',
    guardo: 'Você já consegue guardar, então o ganho está em organizar melhor o que já funciona.'
  };

  /* P3 — ponto de atenção declarado + ação 2 */
  var PESO = {
    dividas: {
      rotulo: 'Dívidas e parcelas',
      titulo: 'Some tudo o que está parcelado',
      acao: 'Some tudo que está parcelado ou em atraso. Saber o total e a data em que cada parcela termina ajuda a decidir o que priorizar.'
    },
    variaveis: {
      rotulo: 'Gastos variáveis',
      titulo: 'Coloque um limite em compras e delivery',
      acao: 'Defina um limite mensal para compras e delivery e acompanhe ao longo do mês, não só no fim. É o gasto mais fácil de ajustar rápido.'
    },
    essenciais: {
      rotulo: 'Despesas essenciais altas',
      titulo: 'Meça o tamanho exato da diferença',
      acao: 'Quando o essencial pesa muito em relação à renda, organizar ajuda a visualizar e planejar, mas não aumenta o que entra. Use o registro para saber o tamanho exato da diferença e avaliar ajustes ou fontes extras com calma.'
    },
    nao_sei: {
      rotulo: 'Ainda não identificado',
      titulo: 'Registre todos os gastos por 30 dias',
      acao: 'Registre todos os gastos por 30 dias, sem julgar. No fim, agrupe por tipo. O que mais pesa costuma aparecer sozinho.'
    }
  };

  /* P5 — rotina (ação 3) */
  var DIFICULDADE = {
    comecar: 'Comece hoje com o mês atual, mesmo incompleto. Um registro simples já é um começo. Não espere o mês virar.',
    esqueco: 'Escolha um horário fixo na semana (ex.: domingo à noite) para atualizar em 10 minutos. Uma rotina curta e marcada é mais fácil de manter.',
    complicado: 'Mantenha só o básico: entrada, saída e saldo. Se a ferramenta pede mais que isso no começo, simplifique.',
    rotina: 'Sua rotina já existe. Aproveite para revisar uma decisão por mês: um gasto para reduzir ou uma meta para ajustar.'
  };

  var DIFICULDADE_TITULO = {
    comecar: 'Comece hoje, com o mês atual',
    esqueco: 'Marque 10 minutos fixos na semana',
    complicado: 'Fique só no básico',
    rotina: 'Revise uma decisão por mês'
  };

  /* Perfil financeiro: definido pelo fim do mês (P2) */
  var PERFIL = {
    falta: { emoji: '🔥', nome: 'Apagador de Incêndios', texto: 'Todo mês vira uma corrida para fechar as contas. A boa notícia: quando você enxerga o mês inteiro, os incêndios ficam previsíveis e param de pegar você de surpresa.' },
    acaba: { emoji: '⚖️', nome: 'Equilibrista', texto: 'As contas fecham, mas sem folga nenhuma, e qualquer imprevisto desequilibra tudo. O seu jogo é abrir uma pequena margem e protegê-la.' },
    sobra_sem_plano: { emoji: '🌱', nome: 'Quase Lá', texto: 'Já sobra dinheiro, e isso é mais do que muita gente consegue. O que falta não é dinheiro, é destino: com um plano simples, essa sobra começa a render.' },
    guardo: { emoji: '🧭', nome: 'Estrategista', texto: 'Você já guarda dinheiro. O próximo nível é transformar isso em metas claras, com prazo e valor, para cada real ter uma função.' }
  };

  /* Nível de controle (0–100): soma simples e explicável das respostas */
  var PONTOS = {
    metodo: { nao_acompanho: 5, anotacoes: 14, app_sem_manter: 18, acompanho: 32 },
    mes: { falta: 2, acaba: 12, sobra_sem_plano: 24, guardo: 36 },
    peso: { nao_sei: 2, dividas: 5, essenciais: 8, variaveis: 12 },
    dificuldade: { comecar: 3, complicado: 7, esqueco: 9, rotina: 18 }
  };

  /* Projeção: meio da faixa de renda × uma fatia realista para o perfil */
  var RENDA_MEIO = { ate2: 1600, '2a4': 3000, '4a7': 5500, mais7: 9000 };
  var FATIA = { falta: 0.03, acaba: 0.05, sobra_sem_plano: 0.10, guardo: 0.15 };

  function nivel(answers) {
    var total = 0;
    Object.keys(PONTOS).forEach(function (k) { total += PONTOS[k][answers[k]] || 0; });
    return Math.max(8, Math.min(96, total));
  }

  function rotuloNivel(n) {
    if (n < 35) return 'Começando a construir o controle';
    if (n < 60) return 'Base em construção';
    if (n < 80) return 'Bom controle, com espaço para crescer';
    return 'Controle avançado';
  }

  function projecao(answers) {
    var meio = RENDA_MEIO[answers.renda];
    var fatia = FATIA[answers.mes] || 0.05;
    if (!meio) return { mensal: 100, anual: 1200, pct: null };
    var mensal = Math.max(50, Math.round(meio * fatia / 50) * 50);
    return { mensal: mensal, anual: mensal * 12, pct: Math.round(fatia * 100) };
  }

  function isComplete(answers) {
    return QUESTIONS.every(function (q) { return !!answers[q.id]; });
  }

  function buildResult(answers) {
    var prioridade = PRIORIDADE[answers.prioridade] || PRIORIDADE.contas;
    var peso = PESO[answers.peso] || PESO.nao_sei;
    var mesApertado = !!MES_APERTADO[answers.mes];

    var acao1 = (mesApertado && prioridade.acaoMesApertado) ? prioridade.acaoMesApertado : prioridade.acao;

    var titulo1 = (mesApertado && prioridade.tituloMesApertado) ? prioridade.tituloMesApertado : prioridade.titulo;
    var n = nivel(answers);

    return {
      perfil: PERFIL[answers.mes] || PERFIL.acaba,
      nivel: n,
      nivelRotulo: rotuloNivel(n),
      projecao: projecao(answers),
      mesApertado: mesApertado,
      titulos: [
        titulo1,
        peso.titulo,
        DIFICULDADE_TITULO[answers.dificuldade] || DIFICULDADE_TITULO.comecar
      ],
      passo: prioridade.passo,
      resumo: [
        METODO[answers.metodo] || METODO.nao_acompanho,
        MES[answers.mes] || MES.acaba
      ].join(' '),
      atencao: peso.rotulo,
      acoes: [
        acao1,
        peso.acao,
        DIFICULDADE[answers.dificuldade] || DIFICULDADE.comecar
      ]
    };
  }

  return {
    QUESTIONS: QUESTIONS,
    isComplete: isComplete,
    buildResult: buildResult
  };
})();
