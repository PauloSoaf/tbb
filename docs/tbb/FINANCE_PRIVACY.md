# Modo privado de Finanças

O botão de olho na barra superior ativa ou desativa o desfoque de números e gráficos nas rotas `/finance` e `/finance/*`. Nomes e controles permanecem disponíveis. Passar o mouse sobre um valor ou gráfico revela aquele elemento; sair volta a desfocá-lo. O foco do teclado também permite a leitura, inclusive em campos de formulário.

A preferência é armazenada no cookie `tbb-finance-privacy`. O layout lê esse cookie no servidor e protege o conteúdo inicial antes da hidratação. Ao navegar entre páginas financeiras, novos números, gráficos, detalhes, diálogos, tooltips e campos são identificados automaticamente. Ao sair de Finanças, o desfoque é suspenso e a preferência permanece.

`FinancePrivacyProvider` aplica atributos aos elementos e acompanha mudanças com MutationObserver, preservando os nós de texto geridos pelo React. Valores animados do NumberFlow usam um elemento HTML nativo com `data-finance-number`: o CSS protege esse elemento desde o HTML inicial, incluindo os dígitos em Shadow DOM, sem depender da inicialização do componente animado. A varredura evita marcar os dígitos internos novamente, permitindo revelar o valor com um único hover ou foco.

Todas as páginas financeiras envolvem o conteúdo resolvido no servidor com `FinancePrivacyBoundary`; o gráfico de salário também declara sua fronteira com `useFinancePrivacyBoundary`. Enquanto existir uma fronteira pendente, a varredura não altera atributos nem adiciona paradas de teclado. O efeito do componente sinaliza quando a hidratação terminou; o observer então identifica os elementos e libera o desfoque individual. Até esse momento, o desfoque inicial do conteúdo permanece ativo. Isso evita que a varredura alcance HTML recebido por streaming antes de o React hidratá-lo. O servidor e a primeira renderização do cliente usam a mesma estrutura, sem suprimir erros de hidratação.

Diálogos fechados e conteúdo oculto ficam fora da varredura: além de não estarem visíveis, podem ter hidratação adiada. Abrir o diálogo ou revelar o conteúdo dispara nova identificação antes da pintura; valores digitados também são acompanhados. Isso inclui os formulários de edição abertos dentro do cadastro de gastos fixos.

Gráficos são protegidos como uma unidade; os valores da legenda continuam protegidos individualmente. Tooltips de gráficos e de informações podem ser lidos ao passar o mouse ou focar seu elemento de origem. O CSS respeita movimento reduzido. O controle tem estado pressionado acessível e textos PT/EN/ES.

A feature altera a apresentação visual. Os cálculos, dados persistidos, permissões do titular e conteúdo dos relatórios continuam usando os valores reais.
