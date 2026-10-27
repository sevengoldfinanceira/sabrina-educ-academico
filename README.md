# Educa — Gestão acadêmica

Primeira versão local, com Clientes, Entrega de diplomas e Visão geral.

## Abrir

Com Node.js instalado, execute `npm start` nesta pasta e acesse http://127.0.0.1:4173. Também é possível abrir `dist/index.html` diretamente, mas prefira o servidor para manter uma origem consistente para os dados.

## Recursos

- Cadastro e edição de clientes com os campos das planilhas de referência.
- Cadastro único compartilhado entre clientes e diplomas.
- Prazo em dias corridos desde a venda, com data máxima ajustável.
- Registro da data de entrega, reabertura e exclusão de cadastro.
- Busca, filtros e resumo dos vencimentos (atenção nos próximos sete dias).
- Valor da parcela calculado por total / quantidade; arredondamento apenas para exibição. Não há conciliação de pagamentos ou controle de parcelas quitadas.
- Exportação CSV para planilhas e backup/restauração JSON.
- Dados fictícios identificados, removíveis pelo botão “Começar com meus dados”.

Os dados ficam no localStorage deste navegador e desta origem. Não são compartilhados entre computadores e podem ser apagados ao limpar os dados do navegador. Use “Salvar backup” regularmente. Mudar de porta, navegador ou de arquivo local para servidor cria uma origem diferente; use backup/restauração para transferir os cadastros.

## Validação

`npm test` verifica cálculos de prazo, classificação de vencimentos e validação dos backups.

## Próxima etapa para uso online

Esta versão não possui servidor de dados, contas de usuário ou sincronização. Antes de usá-la com dados reais compartilhados pela equipe, implementar autenticação, banco de dados e backups no servidor. Publicar apenas os arquivos estáticos não adiciona esses recursos. Nenhum cadastro deve ser incluído no repositório GitHub.

Interface em HTML/CSS/JavaScript sem dependências de execução. Fontes do Google são opcionais; há fontes locais de fallback.

## Modalidades de pagamento

Pix significa à vista (uma parcela), mesmo se o pagamento ocorrer por outro meio. Boleto significa parcelamento direto em duas ou mais parcelas, inclusive quando quitadas por Pix. Cartão de crédito permite de uma a 12 parcelas.

No cartão, informe a taxa total da maquininha em porcentagem ou reais. O desconto incide uma única vez sobre o valor total da venda, sem multiplicar pela quantidade de parcelas. O valor líquido é o total menos esse desconto; não representa confirmação de recebimento. Pix e boleto têm desconto zero. Taxas e valores líquidos aparecem no cadastro, na tabela de clientes, no resumo e no CSV, e são preservados pelo backup JSON.

Cadastros anteriores sem taxa recebem taxa zero. Modalidades antigas sem cartão são classificadas como Pix (uma parcela) ou Boleto (mais de uma). Os totais e as quantidades existentes são preservados; registros antigos de cartão acima de 12 parcelas precisam ser ajustados antes de salvar uma edição.

## Pagamento ao parceiro

O cadastro oferece “Valor por curso”, em reais (aceita zero), e “Incluído no pacote mensal”, que fixa o custo por curso em zero. A coluna “Pagamento ao parceiro” mostra o valor e a modalidade. O líquido da venda e o resumo descontam tanto a maquininha quanto o parceiro. O custo da mensalidade não é rateado e o resultado não representa lucro final. Custos superiores à venda podem produzir líquido negativo.

CSV e backup JSON incluem a modalidade e o valor do parceiro. Registros antigos recebem custo zero na modalidade por curso, sem presumir que estão incluídos no pacote mensal.

## Gastos mensais, tráfego e resultado por mês

- **Gastos mensais:** lançamentos separados por mês para serviço do gestor de marketing, pacote mensal de cursos e outros custos fixos. Os modelos Marketing (valor a informar) e Pacote de cursos — Érico (R$ 7.000 de exemplo) só entram no cálculo depois de editados e salvos. É possível adicioná-los em um mês vazio.
- **Copiar mês anterior:** repete somente gastos confirmados, uma vez por gasto recorrente no mês de destino. Editar ou excluir um lançamento afeta apenas seu mês; não recalcula meses anteriores. A repetição é manual para evitar presumir pagamentos futuros.
- **Tráfego pago:** cada aporte tem data, plataforma, valor e observação. É separado da mensalidade do profissional de marketing.
- **Visão geral:** seletor de mês e memória do cálculo: vendas − maquininha − parceiros por curso − gastos mensais − aportes em anúncios. O pacote mensal é deduzido uma vez no mês e não novamente em cada aluno.
- O resultado usa o total das vendas pela data de venda, inclusive parceladas; não é saldo recebido. Os aportes são deduzidos integralmente pela data do aporte, mesmo que não tenham sido consumidos na plataforma. Impostos e custos não lançados não entram no cálculo. Pode haver resultado negativo.
- CSV por aba e mês. Backup JSON versão 2 contém clientes, gastos e aportes; backups antigos da versão 1 continuam aceitos e restauram as listas financeiras vazias quando ausentes. Restaurar substitui todos os dados, conforme a confirmação exibida.

## Meio de pagamento, cobrança e conta de destino

Além da modalidade comercial (à vista / parcelado / crédito), cada cadastro registra o meio efetivamente utilizado (Pix, boleto ou cartão), a cobrança (direto na conta, maquininha ou link) e a conta de destino (Edivaldo, Seven Gold ou Polo Q Acadêmico — PicPay).

Maquininha fixa automaticamente a conta oficial do Polo/PicPay, inclusive para Pix ou boleto. Para pagamentos diretos e por link, a conta é selecionada manualmente. A regra não presume que todo link pertence à mesma maquininha. Dados antigos permanecem “Não informado” até a edição. Tabela de clientes, CSV e backup preservam esses campos; os cálculos financeiros existentes não mudam. As informações são por cadastro de venda, não um histórico individual de recebimentos por parcela.

## Contas a receber

A aba contém **somente vendas na modalidade Boleto**, isto é, parcelamento direto com o aluno. O meio usado para quitar a parcela pode ser Pix, boleto ou cartão; isso não altera a modalidade comercial. Pix à vista e vendas na modalidade Cartão de crédito são considerados integralmente recebidos e não geram parcelas, alertas nem pedidos de configuração nessa aba.

No cadastro Boleto, confira o primeiro vencimento e gere as datas mensais. Cada data pode ser ajustada. O dia original é preservado quando possível (31/jan → último dia de fevereiro → 31/mar). Os centavos são distribuídos entre as parcelas para fechar o valor total. Cadastros antigos não recebem vencimentos presumidos: use “Configurar vencimentos”.

Alertas visuais: atrasados, vencem hoje, próximos sete dias (amanhã até o sétimo dia) e recebidos. Atualizam enquanto o painel está aberto; não há notificações externas ou sonoras. Cada parcela permite registrar quitação integral com data, meio, cobrança e conta. A maquininha fixa a conta PicPay. O recebimento pode ser reaberto com confirmação. Pagamentos parciais de uma parcela não são suportados nesta versão.

Recebimentos existentes são preservados em edições do cadastro. Alterações de total, quantidade, modalidade e taxa ficam bloqueadas até reabrir os recebimentos. Exclusão de cliente remove também seu calendário e histórico, mediante confirmação. CSV exporta as parcelas filtradas; backup JSON inclui os calendários e recibos e aceita backups antigos sem esses campos.

Na Visão geral, “Recebido” soma Pix à vista e cartão (líquido da taxa) pela data da venda, mais parcelas de Boleto efetivamente registradas pela data do recebimento. “Saldo a receber” usa somente parcelas pendentes de Boleto com calendário confirmado, de todos os meses. Esses indicadores são anteriores aos custos de parceiros, fixos e anúncios; o resultado mensal de vendas mantém sua apuração separada.
