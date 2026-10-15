# Simulador de crédito

Rota `/finance/debts/simulator` (Dinheiro → Dívidas → Simular empréstimo ou parcelamento). Só o titular (`OWNER`) vê a página, porque ela lê as faturas do cartão. É um estudo: não contrata nada, não é oferta, não acessa banco nem pede senha e não cria `Debt`, parcela ou alteração de fatura. Taxas e CET digitados ficam como "informados por você"; o CET calculado é uma estimativa a partir dos fluxos informados, e vale o do contrato.

## O que se compara

Um valor a resolver (digitado ou o saldo de uma fatura aberta ou futura) e de 2 a 5 cenários: quitar à vista, parcelar com parcelas fixas (Price) ou amortização constante (SAC), ou manter o rotativo (somente para comparar). Cada cenário aceita entrada, parcelas (1 a 360), juros ao mês, IOF e tarifas (pagos na hora ou financiados), seguro mensal, datas de início e do primeiro vencimento, CET informado pelo credor e uma antecipação opcional, que encurta o prazo ou reduz a parcela. Campos que o modo escolhido não mostra são ignorados, para um valor esquecido de outro modo nunca mudar os números nem gerar um erro que ninguém vê.

## Motor (`loan-simulator.ts`)

Puro e determinístico: sem banco, sem rede. Dinheiro em centavos inteiros e taxas em partes por milhão (3,99% = 39.900). Os juros do período são saldo × taxa, arredondados ao centavo (meio para cima); a parcela Price é arredondada do mesmo modo, e a última parcela absorve a sobra, de forma que o principal amortizado é exatamente o valor financiado. Taxa 0% só divide o principal. Taxa ausente deixa o cenário incompleto, nunca um valor inventado, e cenário incompleto não recebe número definitivo nem recomendação.

A taxa efetiva anual (Actual/365) do fluxo datado, com encargos, é o CET estimado. Se o CET informado difere mais de 0,5 ponto, um aviso pede conferência. Em fatura de cartão cujos juros e encargos somam pelo menos a dívida original, o aviso lembra o teto legal de 100% (regra vigente desde 03/01/2024, para operações elegíveis); o simulador não decide a elegibilidade. O rotativo para em 120 meses e avisa quando o pagamento não cobre os juros.

## Comparação

Duas perguntas separadas: qual é o mais barato (custo = total pago − valor resolvido) e qual deixa mais folga no orçamento (menos meses negativos e, em empate, maior sobra no pior mês). Menor parcela não significa menor custo, e as notas dizem isso quando as respostas diferem. O orçamento mensal parte da renda prevista e dos gastos fixos do plano, com queda de renda e gasto extra ajustáveis. O que é pago na hora (à vista, entrada, encargos não financiados) pesa no mês do início do contrato, e uma reserva informada pelo titular cobre essa parte antes da renda. Sem renda informada, só o custo é comparado.

## Salvar

Só quando o titular pede. `LoanComparison` guarda apenas os dados digitados (`comparisonPayloadSchema`, versão 1), até 30 por espaço, somente pelo titular e dentro do workspace da sessão, com evento de auditoria. Os resultados são sempre recalculados ao abrir. Detalhes do modelo em [DATA_MODEL.md](DATA_MODEL.md).

## Testes

`loan-simulator.test.ts` cobre valores de livro-texto, invariantes, SAC, antecipação, rotativo, fluxo mensal e comparação; `loan-comparison.test.ts`, o texto digitado, os campos ocultos, `simulate` e a ida e volta do que foi salvo; `loan-actions.test.ts`, permissões, workspace e limite; `loan-simulator-render.test.ts` e `chart-labels.test.ts`, a tela. Todos usam valores sintéticos.
