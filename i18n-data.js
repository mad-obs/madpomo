/* ==========================================================================
   madpomo — the translation data (EN -> pt-BR)

   Both builds read this one file: the plain one loads it as a script before
   i18n.js, the React one imports it in lib/i18n.js. A translation that reads
   wrong is corrected here, once, and both are fixed.

   Keys are the English text exactly as it reaches the screen, with runs of
   whitespace collapsed — so a paragraph wrapped over four lines in the HTML
   still matches the single line written here.

   The engines that apply this are separate (i18n.js and react/src/lib/i18n.js)
   because one hangs off window.MP and the other is an ES module. The words,
   which are the part worth getting right, are not duplicated.
   ========================================================================== */

window.MP_I18N = (function () {
  /* The four built-in columns are named by the app, so they are translated.
     A column you added yourself keeps the name you gave it. */
  const BUILT_IN_COLUMNS = {
    "todo": "a fazer",
    "in-progress": "em andamento",
    "completed": "concluídas",
    "cancelled": "canceladas"
  };

  const WEEKDAYS = {
    "sunday": "domingo", "monday": "segunda-feira", "tuesday": "terça-feira",
    "wednesday": "quarta-feira", "thursday": "quinta-feira",
    "friday": "sexta-feira", "saturday": "sábado",
    "SUN": "DOM", "MON": "SEG", "TUE": "TER", "WED": "QUA",
    "THU": "QUI", "FRI": "SEX", "SAT": "SÁB"
  };

  const MONTHS = {
    "JAN": "JAN", "FEB": "FEV", "MAR": "MAR", "APR": "ABR",
    "MAY": "MAI", "JUN": "JUN", "JUL": "JUL", "AUG": "AGO",
    "SEP": "SET", "OCT": "OUT", "NOV": "NOV", "DEC": "DEZ"
  };

  /* --------------------------------------------------------------------------
     The dictionary

     Keys are the English text exactly as it reaches the screen, with runs of
     whitespace collapsed — so a paragraph wrapped over four lines in the HTML
     still matches the single line written here.

     This is the file to edit when a translation reads wrong. Nothing else
     needs to know.
     -------------------------------------------------------------------------- */

  const PT = {
    /* --- header, navigation, shell --- */
    "loading...": "carregando...",
    "settings": "configurações",
    "about": "sobre",
    "<- back to board": "<- voltar ao quadro",

    /* --- timer --- */
    "//break": "//intervalo",
    "//long break": "//intervalo longo",
    "current task: none": "tarefa atual: nenhuma",
    "start": "iniciar",
    "pause": "pausar",
    "resume": "retomar",
    "break": "intervalo",
    "reset": "zerar",

    /* --- noise --- */
    "//noise": "//ruído",
    "white": "branco",
    "brown": "marrom",
    "green": "verde",
    "pink": "rosa",
    "volume": "volume",

    /* --- sidebar numbers --- */
    "//task overview": "//resumo das tarefas",
    "today": "hoje",
    "this week": "esta semana",
    "this month": "este mês",
    "cancelled tasks": "tarefas canceladas",
    "//last 7D": "//últimos 7D",
    "pomodoro report": "relatório pomodoro",

    /* --- board --- */
    "MY BOARD": "MEU QUADRO",
    "+column": "+coluna",
    "/ search tasks": "/ buscar tarefas",
    "search tasks": "buscar tarefas",
    "task board": "quadro de tarefas",
    "add task": "adicionar tarefa",
    "task title...": "título da tarefa...",
    "column name...": "nome da coluna...",
    "minimize task": "minimizar tarefa",
    "delete column": "excluir coluna",
    "focus": "foco",
    "finish": "concluir",
    "cancel": "cancelar",
    "delete": "excluir",
    "reopen": "reabrir",
    "add your task description here...": "escreva a descrição da tarefa aqui...",
    "no description": "sem descrição",
    "add a subtask": "adicionar subtarefa",
    "not set": "não definida",

    /* --- dialogs --- */
    "//cancel task": "//cancelar tarefa",
    "why are you cancelling it?": "por que está cancelando?",
    "reason (optional)...": "motivo (opcional)...",
    "keep task": "manter tarefa",
    "cancel task": "cancelar tarefa",
    "//delete task": "//excluir tarefa",
    "this removes the task for good. it cannot be undone.":
      "isso remove a tarefa de vez. não dá para desfazer.",
    "keep it": "manter",
    "//delete column": "//excluir coluna",

    /* --- welcome + tour chrome --- */
    "//welcome": "//boas-vindas",
    "first time here?": "primeira vez aqui?",
    "madpomo is a task board with a pomodoro timer built into it. it counts how many pomodoros you finish, not how many you start. the tour walks through the board, the timer and the report in about two minutes.":
      "o madpomo é um quadro de tarefas com um timer pomodoro dentro dele. ele conta quantos pomodoros você termina, não quantos você começa. o tour passa pelo quadro, pelo timer e pelo relatório em uns dois minutos.",
    "skipping is fine. the tutorial is always in settings, under //help.":
      "pode pular. o tutorial fica sempre em configurações, no //ajuda.",
    "skip for now": "pular por enquanto",
    "show me around": "me mostra o app",
    "tutorial": "tutorial",
    "close the tutorial": "fechar o tutorial",
    "back": "voltar",
    "next": "próximo",

    /* --- report --- */
    "Pomodoro Report": "Relatório Pomodoro",
    "7D": "7D",
    "30D": "30D",
    "ALL": "TUDO",
    "//Tasks x Pomodoros": "//Tarefas x Pomodoros",
    "task": "tarefa",
    "pomodoros": "pomodoros",
    "done": "feitos",
    "pauses": "pausas",
    "follow-through": "taxa de conclusão",
    "completed": "concluídos",
    "completed after a pause": "concluídos após uma pausa",
    "not followed through": "não concluídos",
    "//Insight": "//Leitura",
    "//Pauses per Pomodoro": "//Pausas por Pomodoro",
    "//Follow-through, Last 4 Weeks": "//Taxa de Conclusão, Últimas 4 Semanas",
    "avg pomodoros / task": "média de pomodoros / tarefa",
    "pauses / pomodoro": "pausas / pomodoro",
    "focus time": "tempo de foco",
    "no pause": "sem pausa",
    "1 pause": "1 pausa",
    "2+ pauses": "2+ pausas",
    "this week": "esta semana",
    /* --- fragments only the React build produces ---

       JSX splits an interpolated line into separate text nodes: `current
       task: {title}` reaches the DOM as "current task: " and the title, not
       as one string, so the whole-line patterns above never see it. The
       plain build writes the same line with string concatenation and matches
       the pattern. Same words, two shapes. */
    "current task:": "tarefa atual:",
    "none": "nenhuma",
    "of": "de",
    "pomodoros finished": "pomodoros terminados",
    "pause": "pausa",
    "pauses": "pausas",
    "in total": "no total",
    "completed pomodoro": "pomodoro concluído",
    "completed pomodoros": "pomodoros concluídos",

    "no task": "sem tarefa",
    "no earlier data": "sem dados anteriores",
    "no pomodoros in this range yet.": "nenhum pomodoro neste período ainda.",
    "No pomodoros logged in this range yet. Press start on the board and this page fills itself in.":
      "Nenhum pomodoro registrado neste período ainda. Aperte iniciar no quadro e esta página se preenche sozinha.",
    "nothing logged yet": "nada registrado ainda",

    /* --- settings --- */
    "Settings": "Configurações",
    "//timer": "//timer",
    "focus length": "duração do foco",
    "Minutes per pomodoro": "Minutos por pomodoro",
    "short break": "intervalo curto",
    "Minutes between pomodoros": "Minutos entre pomodoros",
    "long break": "intervalo longo",
    "Minutes after a full cycle": "Minutos depois de um ciclo completo",
    "cycle length": "tamanho do ciclo",
    "Pomodoros before a long break": "Pomodoros antes de um intervalo longo",
    "auto-start next session": "iniciar a próxima sessão sozinho",
    "Start the break or focus automatically": "Começa o intervalo ou o foco automaticamente",
    "//notifications": "//notificações",
    "sound when a session ends": "som no fim da sessão",
    "A short tone at the end of focus and breaks": "Um toque curto no fim do foco e dos intervalos",
    "desktop notifications": "notificações do sistema",
    "Show an alert when the timer finishes": "Mostra um aviso quando o timer termina",
    "//general": "//geral",
    "time format": "formato de hora",
    "week starts on": "semana começa em",
    "//help": "//ajuda",
    "A guided tour of the board, the timer and the report":
      "Um tour guiado pelo quadro, pelo timer e pelo relatório",
    "open tutorial": "abrir tutorial",
    "welcome prompt": "aviso de boas-vindas",
    "Ask again, next time the board opens": "Perguntar de novo na próxima vez que o quadro abrir",
    "show again": "mostrar de novo",
    "//data": "//dados",
    "export my data": "exportar meus dados",
    "Download tasks and pomodoros as a file": "Baixa as tarefas e os pomodoros como arquivo",
    "export": "exportar",
    "import a backup": "importar um backup",
    "Restore an exported file over what is here": "Restaura um arquivo exportado por cima do que está aqui",
    "import": "importar",
    "//legal": "//jurídico",
    "terms of use": "termos de uso",
    "What you agree to by using madpomo": "Com o que você concorda ao usar o madpomo",
    "privacy policy": "política de privacidade",
    "What is stored, and where it stays": "O que fica guardado, e onde fica",
    "//danger zone": "//zona de perigo",
    "reset everything": "apagar tudo",
    "Deletes every task, pomodoro, column and setting in this browser. This cannot be undone.":
      "Apaga todas as tarefas, pomodoros, colunas e configurações neste navegador. Não dá para desfazer.",
    "Changes are saved automatically.": "As alterações são salvas automaticamente.",
    "//import a backup": "//importar um backup",
    "this replaces every task, pomodoro, column and setting in this browser with the ones in the file. it cannot be undone.":
      "isso substitui todas as tarefas, pomodoros, colunas e configurações deste navegador pelas do arquivo. não dá para desfazer.",
    "keep my data": "manter meus dados",
    "replace everything": "substituir tudo",
    "//reset everything": "//apagar tudo",
    "this deletes every task, pomodoro, column and setting stored in this browser. it cannot be undone.":
      "isso apaga todas as tarefas, pomodoros, colunas e configurações guardadas neste navegador. não dá para desfazer.",
    "close": "fechar",

    /* --- terms of use --- */
    "//terms of use": "//termos de uso",
    "What This Is": "O Que É Isto",
    "madpomo is a task board with a pomodoro timer built into it. It is free, it is open source, and it runs in your browser. There is no account, no subscription, and no server behind it.":
      "o madpomo é um quadro de tarefas com um timer pomodoro dentro dele. É gratuito, é de código aberto e roda no seu navegador. Não tem conta, não tem assinatura e não tem servidor por trás.",
    "If Something Goes Wrong": "Se Algo Der Errado",
    "Tell me. The repository is the place for it, and something I know about is something I can fix. madpomo comes as it is, without a warranty, which is the same line the Apache licence carries: in practice it means I cannot promise a fix by any particular date, or bring back work a browser has already thrown away.":
      "Me conta. O repositório é o lugar para isso, e o que eu fico sabendo é o que eu consigo consertar. O madpomo vem como está, sem garantia, que é a mesma linha que a licença Apache carrega: na prática quer dizer que eu não posso prometer conserto para uma data certa, nem trazer de volta um trabalho que o navegador já jogou fora.",
    "The Code": "O Código",
    "The source is public on GitHub under the Apache License 2.0. Read it, change it, build your own version on it, for free. Keep the licence and the credit with whatever you pass on. The one thing it does not hand over is the name: call your version something other than madpomo.":
      "O código é público no GitHub sob a Apache License 2.0. Leia, altere, construa a sua própria versão em cima dele, de graça. Mantenha a licença e os créditos no que você repassar. A única coisa que ela não entrega é o nome: chame a sua versão de qualquer coisa menos madpomo.",
    "Changes": "Mudanças",
    "These terms change when the app does, and this window always shows the current text.":
      "Estes termos mudam quando o app muda, e esta janela sempre mostra o texto atual.",
    "Where Your Work Lives": "Onde Seu Trabalho Fica",
    "In this browser, on this device, and nowhere else. Nothing you type is sent anywhere, so nobody can read it — and nobody can restore it for you either, me included, because I never have a copy. That is the trade. Export under //data writes everything to a file and import reads it back, so one export after a good stretch of work is enough to keep.":
      "Neste navegador, neste aparelho, e em nenhum outro lugar. Nada do que você digita é enviado para lugar nenhum, então ninguém consegue ler — e ninguém consegue restaurar para você também, eu inclusive, porque eu nunca tenho uma cópia. Essa é a troca. O exportar, no //dados, grava tudo em um arquivo e o importar lê de volta, então uma exportação depois de uma boa rodada de trabalho já é o bastante para guardar.",

    /* --- privacy policy --- */
    "//privacy policy": "//política de privacidade",
    "What Is Collected": "O Que É Coletado",
    "Nothing. No account, no analytics, no cookies, no tracking of any kind. There is no server to send anything to.":
      "Nada. Sem conta, sem analytics, sem cookies, sem rastreamento de nenhum tipo. Não existe servidor para onde mandar qualquer coisa.",
    "What Is Stored, and Where": "O Que Fica Guardado, e Onde",
    "Your tasks, your pomodoro log, the timer state and your settings are saved in this browser's localStorage, on this device. They are not synced anywhere and nobody else can read them.":
      "Suas tarefas, seu histórico de pomodoros, o estado do timer e suas configurações ficam salvos no localStorage deste navegador, neste aparelho. Nada é sincronizado e mais ninguém consegue ler.",
    "What the Page Requests": "O Que a Página Baixa",
    "The app's own files, from wherever it is hosted. Nothing else is requested, and nothing about you is sent.":
      "Só os arquivos do próprio app, de onde ele estiver hospedado. Nada além disso é baixado, e nada sobre você é enviado.",
    "Deleting It": "Apagando Tudo",
    "Reset everything under //danger zone wipes all of it at once. Clearing your browser data does the same.":
      "Apagar tudo, na //zona de perigo, limpa tudo de uma vez. Limpar os dados do navegador faz o mesmo.",
    "Checking Any of This": "Conferindo Isto Tudo",
    "The code is public. Open the network tab, or read the source.":
      "O código é público. Abra a aba de rede, ou leia o fonte.",

    /* --- about --- */
    "About": "Sobre",
    "//hello, i am": "//olá, eu sou",
    "UI Designer / Front-End Developer": "Designer de UI / Desenvolvedor Front-End",
    "I built madpomo because most focus timers only count minutes. I wanted to know something harder: do I finish what I start, and where do I get pulled away?":
      "Fiz o madpomo porque a maioria dos timers de foco só conta minutos. Eu queria saber algo mais difícil: eu termino o que começo, e onde é que me distraio?",
    "Madpomo cross-references your tasks with your pomodoros, so a pause is data and not a failure. The goal is simple: show real progress and help you work in a way that actually fits you.":
      "O madpomo cruza suas tarefas com seus pomodoros, então uma pausa vira dado e não fracasso. A ideia é simples: mostrar progresso de verdade e ajudar você a trabalhar de um jeito que combine com você.",
    "//what madpomo measures": "//o que o madpomo mede",
    "How many pomodoros you finish out of the ones you start.":
      "Quantos pomodoros você termina, dos que você começa.",
    "How often a session is interrupted, and in which tasks.":
      "Com que frequência uma sessão é interrompida, e em quais tarefas.",
    "tasks x pomodoros": "tarefas x pomodoros",
    "Average pomodoros per task, so you can plan and split work better.":
      "Média de pomodoros por tarefa, para planejar e dividir o trabalho melhor.",
    "//find me online": "//me ache por aí",
    "website": "site",
    "//madpomo": "//madpomo",
    "version": "versão",

    /* --- tutorial steps --- */
    "welcome to madpomo": "boas-vindas ao madpomo",
    "This is two things in one: a board for what you have to do, and a pomodoro timer for actually doing it. The tour covers both, takes about two minutes, and you can leave at any point.":
      "São duas coisas em uma: um quadro para o que você tem que fazer, e um timer pomodoro para fazer de fato. O tour passa pelos dois, leva uns dois minutos, e você pode sair a qualquer momento.",
    "the board": "o quadro",
    "Four columns to start with: to do, in progress, completed, cancelled. +column adds your own next to them. A task moves between columns when you press a button on its card, or when you drag it there yourself, and the number beside each name counts what is in it right now.":
      "Quatro colunas para começar: a fazer, em andamento, concluídas, canceladas. O +coluna cria as suas ao lado delas. Uma tarefa muda de coluna quando você aperta um botão no card dela, ou quando você mesmo arrasta até lá, e o número ao lado de cada nome conta o que está nela agora.",
    "adding a task": "adicionando uma tarefa",
    "The + button on a column adds a task straight into it. Type a title and press Enter to keep it, Escape to throw it away. Every column except completed and cancelled has one.":
      "O botão + da coluna cria uma tarefa direto nela. Digite um título e aperte Enter para guardar, Escape para descartar. Toda coluna tem o seu, menos concluídas e canceladas.",
    "opening a card": "abrindo um card",
    "Click a card's title bar to open it, and the _ button to close it again. Open or closed is remembered per card, so the board looks the way you left it when you come back.":
      "Clique na barra de título do card para abrir, e no botão _ para fechar de novo. Aberto ou fechado fica guardado card a card, então o quadro continua do jeito que você deixou quando voltar.",
    "everything is editable": "dá para editar tudo",
    "Click the due date to pick one, the description to rewrite it, the title to rename it. Every edit saves when you click away or press Escape. There is no save button anywhere in this app.":
      "Clique no prazo para escolher um, na descrição para reescrever, no título para renomear. Toda edição salva quando você clica fora ou aperta Escape. Não existe botão de salvar em lugar nenhum deste app.",
    "subtasks": "subtarefas",
    "Break a task into steps. Click the box to tick one off, the text to rename it, the x to delete it. Subtasks are a checklist for you — they do not affect the timer or any of the numbers.":
      "Quebre uma tarefa em passos. Clique na caixinha para marcar, no texto para renomear, no x para excluir. As subtarefas são uma lista para você — elas não mexem no timer nem em nenhum dos números.",
    "focus starts the clock": "o foco começa o relógio",
    "Focus is the button that begins a pomodoro for that task. It moves the task to in progress, names it as the current task in the sidebar, and starts the countdown at whatever focus length you have set.":
      "Foco é o botão que começa um pomodoro naquela tarefa. Ele move a tarefa para em andamento, coloca ela como tarefa atual na barra lateral, e começa a contagem na duração de foco que você tiver escolhido.",
    "the timer": "o timer",
    "Start pauses and resumes the countdown. Break ends the pomodoro early and begins a short break. Reset puts the clock back to the start of whatever phase you are in. The clock keeps running while you move between pages.":
      "Iniciar pausa e retoma a contagem. Intervalo encerra o pomodoro antes da hora e começa um intervalo curto. Zerar devolve o relógio para o início da fase em que você está. O relógio continua correndo enquanto você anda entre as páginas.",
    "cycles of four": "ciclos de quatro",
    "Pomodoros come in cycles. #1 of 4 is the one you are attempting now. The last one in a cycle earns a long break instead of a short one, and then the count starts again. Both lengths, and how many pomodoros make a cycle, are in settings.":
      "Os pomodoros vêm em ciclos. #1 de 4 é o que você está tentando agora. O último de um ciclo dá direito a um intervalo longo em vez de um curto, e aí a conta recomeça. As duas durações, e quantos pomodoros formam um ciclo, estão em configurações.",
    "what counts as finished": "o que conta como terminado",
    "A pomodoro only counts when the clock reaches 00:00. Take a break early, hit reset, or finish the task halfway through and it is logged as started but not finished. The share you do finish is your follow-through, and it is the number the whole report is built around.":
      "Um pomodoro só conta quando o relógio chega em 00:00. Se você sair para o intervalo antes, apertar zerar, ou concluir a tarefa no meio, ele fica registrado como começado mas não terminado. A parte que você termina é a sua taxa de conclusão, e é o número em volta do qual o relatório inteiro é montado.",
    "finishing and cancelling": "concluindo e cancelando",
    "Finish moves a task to completed. Cancel asks why first and keeps your reason on the card, so abandoned work stays visible instead of quietly disappearing. Only a card already in the cancelled column can be deleted for good.":
      "Concluir move a tarefa para concluídas. Cancelar pergunta o motivo antes e guarda a sua resposta no card, então o trabalho abandonado continua à vista em vez de sumir sem avisar. Só um card que já está em canceladas pode ser excluído de vez.",
    "dragging": "arrastando",
    "Drag a card anywhere — into another column, or up and down inside the one it is in. A grey slot shows where it will land, and the order you leave it in is the order it keeps.":
      "Arraste um card para onde quiser — para outra coluna, ou para cima e para baixo dentro da que ele está. Um espaço cinza mostra onde ele vai cair, e a ordem em que você deixar é a ordem que fica.",
    "search": "busca",
    "Search filters cards by title, description and subtask text as you type. Press / anywhere on the board to jump into it, and the column counts follow the filter.":
      "A busca filtra os cards por título, descrição e texto das subtarefas enquanto você digita. Aperte / em qualquer lugar do quadro para cair nela, e as contagens das colunas acompanham o filtro.",
    "the sidebar numbers": "os números da barra lateral",
    "Task overview counts tasks you have completed today, this week and this month, plus everything you have cancelled. Last 7D counts pomodoros instead — one square per finished pomodoro, with today's row marked in orange.":
      "O resumo das tarefas conta as tarefas que você concluiu hoje, nesta semana e neste mês, mais tudo que você cancelou. Já o últimos 7D conta pomodoros — um quadradinho por pomodoro terminado, com a linha de hoje marcada em laranja.",
    "the report": "o relatório",
    "The report turns that log into something readable: follow-through, pauses per pomodoro, total focus time, a row per task, and a four-week trend. Switch between the last 7 days, 30 days, or everything.":
      "O relatório transforma esse histórico em algo legível: taxa de conclusão, pausas por pomodoro, tempo total de foco, uma linha por tarefa, e a tendência de quatro semanas. Alterne entre os últimos 7 dias, 30 dias, ou tudo.",
    "Settings holds the timer lengths, cycle length, auto-start, the end-of-session sound, desktop notifications, export and import of your data, and this tutorial if you ever want it again.":
      "Configurações guarda as durações do timer, o tamanho do ciclo, o início automático, o som de fim de sessão, as notificações do sistema, a exportação e a importação dos seus dados, e este tutorial se você quiser de novo.",
    "your data stays here": "seus dados ficam aqui",
    "There is no account and no server. Everything you type lives in this browser only, which also means clearing your browser data clears madpomo. Export in settings writes a copy you can keep, and import reads it back. That is the whole app — go start a pomodoro.":
      "Não tem conta e não tem servidor. Tudo que você digita vive só neste navegador, o que também quer dizer que limpar os dados do navegador limpa o madpomo. O exportar, em configurações, grava uma cópia que você pode guardar, e o importar lê ela de volta. O app é isso — vai começar um pomodoro."
  };

  /* --------------------------------------------------------------------------
     Patterns

     For text that is built at runtime: a label with a number in it, or a
     prefix glued to something you typed. Only the English part is rewritten,
     so whatever you wrote comes through untouched.
     -------------------------------------------------------------------------- */

  const PATTERNS = [
    [/^\/\/focus \| #(\d+) of (\d+)$/, "//foco | #$1 de $2"],
    [/^current task: (.+)$/, "tarefa atual: $1"],
    [/^step (\d+) of (\d+)$/, "passo $1 de $2"],
    [/^due date: (.+)$/, "prazo: $1"],
    [/^cancelled: (.+)$/, "cancelada: $1"],
    [/^(\d+) pomodoros? done$/, function (all, count) {
      return count + (count === "1" ? " pomodoro feito" : " pomodoros feitos");
    }],
    [/^(\d+) tasks?$/, function (all, count) {
      return count + (count === "1" ? " tarefa" : " tarefas");
    }],
    [/^w-(\d+)$/, "s-$1"],
    [/^(\d+)h (\d+)m$/, "$1h $2m"],

    /* "monday . 02/NOV/2026 . 15:20:00" — one text node, three things to
       translate inside it. */
    [/^([a-z]+) \. (\d{2})\/([A-Z]{3})\/(\d{4})(.*)$/, function (all, day, d, month, year, rest) {
      const weekday = WEEKDAYS[day] || day;
      return weekday + " . " + d + "/" + (MONTHS[month] || month) + "/" + year + rest;
    }]
  ];

  /* --------------------------------------------------------------------------
     Fragments

     The report writes its insight as one paragraph built from three or four
     separate sentences, so there is no whole string to match — these are
     rewritten in place, inside whatever they are part of. Task titles come
     through the capture groups untouched.
     -------------------------------------------------------------------------- */

  const FRAGMENTS = [
    [/You finish (\d+)% of the pomodoros you start\./g, "Você termina $1% dos pomodoros que começa."],
    [/That is flat against (.+?)\./g, "Isso está estável em relação a $1."],
    [/That is (\d+)% up from (.+?)\./g, "Isso é $1% a mais que $2."],
    [/That is (\d+)% down from (.+?)\./g, "Isso é $1% a menos que $2."],
    [/Most abandoned pomodoros sit in "(.+?)" — try splitting it into smaller tasks\./g,
      'A maioria dos pomodoros abandonados está em "$1" — tente dividir em tarefas menores.'],
    [/Every pomodoro you started reached 00:00\./g, "Todo pomodoro que você começou chegou em 00:00."],
    [/(\d+) of (\d+) pomodoros finished/g, "$1 de $2 pomodoros terminados"],
    [/(\d+) pauses? in total/g, function (all, count) {
      return count + (count === "1" ? " pausa no total" : " pausas no total");
    }],
    [/(\d+) completed pomodoros?/g, function (all, count) {
      return count + (count === "1" ? " pomodoro concluído" : " pomodoros concluídos");
    }],
    [/the 30 days before/g, "os 30 dias anteriores"],
    [/all time/g, "todo o período"],
    [/last week/g, "a semana passada"]
  ];

  return {
    BUILT_IN_COLUMNS: BUILT_IN_COLUMNS,
    WEEKDAYS: WEEKDAYS,
    MONTHS: MONTHS,
    PT: PT,
    PATTERNS: PATTERNS,
    FRAGMENTS: FRAGMENTS
  };
})();
