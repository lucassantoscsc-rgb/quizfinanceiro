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
      acao: 'Liste todas as contas fixas do mês (moradia, luz, internet, parcelas) com valor e data de vencimento. Só de ver tudo junto, você já sabe quanto do mês está comprometido.'
    },
    dividas: {
      passo: 'organizar o pagamento das dívidas',
      acao: 'Anote cada dívida com valor total, parcela, juros e vencimento. Com a lista pronta, priorize as de juros mais altos e defina quanto cabe pagar por mês sem apertar as contas essenciais.'
    },
    reserva: {
      passo: 'começar uma reserva pequena e constante',
      acao: 'Escolha um valor fixo que caiba no seu mês — mesmo que pequeno — e separe assim que o dinheiro entrar, antes de gastar. No começo, constância importa mais que o valor.',
      acaoMesApertado: 'Antes de definir a reserva, feche o mês: veja o que entra, o que é fixo e o que sobra de verdade. A reserva começa com o valor que sobrar dessa conta — mesmo que pequeno — separado assim que o dinheiro entrar.'
    },
    planejar: {
      passo: 'dar um destino ao dinheiro que sobra',
      acao: 'Defina para onde vai a sobra antes do mês começar: uma parte para reserva, uma para um objetivo e uma para gastos livres. Sem destino, a sobra tende a ser gasta sem perceber.',
      acaoMesApertado: 'Pelas suas respostas, a sobra ainda não é constante. Comece registrando entradas e saídas do mês para saber quanto realmente sobra — o planejamento vem depois desse número.'
    }
  };

  /* P1 — frase que adapta ao método atual */
  var METODO = {
    nao_acompanho: 'Como você ainda não acompanha, comece simples: registrar o que entra e o que sai por um mês já muda a visão.',
    anotacoes: 'Você já anota, mas se perde — o ponto é concentrar tudo em um único lugar, no mesmo formato todo mês.',
    app_sem_manter: 'Você já tentou aplicativo ou planilha e não manteve — vale reduzir para o mínimo que você consegue atualizar de verdade.',
    acompanho: 'Você já acompanha — o próximo nível é usar o registro para decidir, não só para conferir.'
  };

  /* P2 — contexto do fim do mês */
  var MES = {
    falta: 'No fim do mês falta dinheiro para fechar as contas, então o foco inicial é enxergar o mês inteiro antes de qualquer meta.',
    acaba: 'O dinheiro acaba e quase nada sobra, então o objetivo dos próximos meses é abrir uma folga, mesmo pequena.',
    sobra_sem_plano: 'Sobra um pouco, mas sem plano — o que falta não é dinheiro, é destino.',
    guardo: 'Você já consegue guardar, então o ganho está em organizar melhor o que já funciona.'
  };

  /* P3 — ponto de atenção declarado + ação 2 */
  var PESO = {
    dividas: {
      rotulo: 'Dívidas e parcelas',
      acao: 'Some tudo que está parcelado ou em atraso. Saber o total e a data em que cada parcela termina ajuda a decidir o que priorizar.'
    },
    variaveis: {
      rotulo: 'Gastos variáveis',
      acao: 'Defina um limite mensal para compras e delivery e acompanhe ao longo do mês, não só no fim. É o gasto mais fácil de ajustar rápido.'
    },
    essenciais: {
      rotulo: 'Despesas essenciais altas',
      acao: 'Quando o essencial pesa muito em relação à renda, organizar ajuda a visualizar e planejar, mas não aumenta o que entra. Use o registro para saber o tamanho exato da diferença e avaliar ajustes ou fontes extras com calma.'
    },
    nao_sei: {
      rotulo: 'Ainda não identificado',
      acao: 'Registre todos os gastos por 30 dias, sem julgar. No fim, agrupe por tipo — o que mais pesa costuma aparecer sozinho.'
    }
  };

  /* P5 — rotina (ação 3) */
  var DIFICULDADE = {
    comecar: 'Comece hoje com o mês atual, mesmo incompleto. Um registro simples já é um começo — não espere o mês virar.',
    esqueco: 'Escolha um horário fixo na semana (ex.: domingo à noite) para atualizar em 10 minutos. Uma rotina curta e marcada é mais fácil de manter.',
    complicado: 'Mantenha só o básico: entrada, saída e saldo. Se a ferramenta pede mais que isso no começo, simplifique.',
    rotina: 'Sua rotina já existe — use-a para revisar uma decisão por mês: um gasto para reduzir ou uma meta para ajustar.'
  };

  function isComplete(answers) {
    return QUESTIONS.every(function (q) { return !!answers[q.id]; });
  }

  function buildResult(answers) {
    var prioridade = PRIORIDADE[answers.prioridade] || PRIORIDADE.contas;
    var peso = PESO[answers.peso] || PESO.nao_sei;
    var mesApertado = !!MES_APERTADO[answers.mes];

    var acao1 = (mesApertado && prioridade.acaoMesApertado) ? prioridade.acaoMesApertado : prioridade.acao;

    return {
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
