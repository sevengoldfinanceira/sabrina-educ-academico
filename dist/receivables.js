const {buildSchedule,buildDeferredSchedule,monthDate,splitAmount,receivableStatus,validSchedule,receiptSummary,receivableBase,eligibleReceivable}=Educa;
let scheduleDraft=null,firstInstallmentDraft=0,scheduleTerms='',receivableFilter='all',receivableQuery='';
const receivableLabels={late:'Atrasado',today:'Vence hoje',soon:'Próximos 7 dias',pending:'Pendente',paid:'Recebido'};
function formTerms(){return {total:parseBRL(form.elements.total.value),installments:Number(form.elements.installments.value),payment:form.elements.payment.value,feeMode:form.elements.feeMode.value,feeValue:form.elements.feeMode.value==='amount'?parseBRL(form.elements.feeValue.value):Number(form.elements.feeValue.value),saleDate:form.elements.saleDate.value}}
function scheduleCount(r){return Math.max(0,r.installments-1)}
function termsKey(r){return JSON.stringify([r.total,r.installments,r.payment,r.feeMode,r.feeValue,r.saleDate,scheduleCount(r)])}
function initSchedule(r){
 scheduleDraft=r&&eligibleReceivable(r)&&r.receivables?JSON.parse(JSON.stringify(r.receivables)):null;
 firstInstallmentDraft=r?.firstInstallmentPaidAtSale?(r.firstInstallmentAmount??Math.max(0,Number(r.total)-(scheduleDraft||[]).reduce((sum,p)=>sum+p.amount,0))):splitAmount(formTerms().total,Math.max(1,formTerms().installments))[0];
 $('#first-payment-date').value=scheduleDraft?.[0].dueDate||monthDate(form.elements.saleDate.value,1);
 scheduleTerms=termsKey(formTerms());
 if(!r&&eligibleReceivable(formTerms()))generateSchedule(false);else paintSchedule();
}
function generateSchedule(ask=true){
 if(!eligibleReceivable(formTerms()))return;
 if(scheduleDraft?.some(p=>p.receipt))return toast('Reabra os recebimentos antes de gerar outro calendário.');
 const r=formTerms(),first=$('#first-payment-date').value,count=scheduleCount(r);
 if(!first)return toast('Informe o primeiro vencimento.');
 if(!Number.isInteger(count)||count<1||count>120)return toast('Confira a quantidade de parcelas.');
 if(ask&&scheduleDraft&&!confirm('Substituir as datas atuais pelos vencimentos mensais sugeridos?'))return;
 try{const amounts=splitAmount(r.total,r.installments);firstInstallmentDraft=amounts[0];scheduleDraft=buildDeferredSchedule(r,r.saleDate,()=>crypto.randomUUID());if(first&&scheduleDraft[0])scheduleDraft.forEach((p,i)=>p.dueDate=monthDate(first,i));scheduleTerms=termsKey(r);paintSchedule()}catch{toast('Confira a data da venda e a quantidade de parcelas.')}
}
function refreshSchedule(){
 if(!dialog.open)return;
 const r=formTerms(),key=termsKey(r);
 if(!eligibleReceivable(r)){paintSchedule();return}
 if(!scheduleDraft&&$('#first-payment-date').value){generateSchedule(false);return}
 if(scheduleDraft&&key!==scheduleTerms&&!scheduleDraft.some(p=>p.receipt)){
  const count=scheduleCount(r);if(Number.isInteger(count)&&count>0&&count<=120){
   let next;try{next=buildDeferredSchedule(r,r.saleDate,()=>crypto.randomUUID())}catch{return paintSchedule()}
   if(next.length===scheduleDraft.length)next.forEach((p,i)=>{p.id=scheduleDraft[i].id;p.dueDate=scheduleDraft[i].dueDate});
   firstInstallmentDraft=splitAmount(r.total,r.installments)[0];scheduleDraft=next;scheduleTerms=key;
  }
 }
 paintSchedule();
}
function paintSchedule(){
 const eligible=eligibleReceivable(formTerms()),paid=scheduleDraft?.some(p=>p.receipt);
 $('#schedule-fieldset').hidden=!eligible;$('#schedule-fieldset').disabled=!eligible;
 if(!eligible)return;
 $('#first-payment-date').disabled=!!paid;
 $('#schedule-help').textContent='A divisão é apenas uma sugestão. Altere o valor de qualquer parcela e as demais serão redistribuídas automaticamente para manter o total da venda.';
 $('#schedule-warning').textContent=paid?'Recebimentos preservados. Para mudar total, taxa, modalidade ou quantidade, reabra os recebimentos na aba Contas a receber.':scheduleDraft?'Confira os vencimentos antes de salvar. Os centavos são distribuídos para fechar exatamente o total.':'Cadastro sem calendário confirmado: não entra nos alertas até você gerar os vencimentos.';
 const offset=scheduleDraft?.length===Number(form.elements.installments.value)-1?1:0,locked=!!paid;
 const installmentsTotal=firstInstallmentDraft+(scheduleDraft||[]).reduce((sum,p)=>sum+p.amount,0);
 $('#schedule-preview').innerHTML=scheduleDraft?`<div class="schedule-total"><span>Valor total da venda • soma das parcelas</span><strong>${money(installmentsTotal)}</strong></div><div class="schedule-list">${offset?`<div class="schedule-row"><span>Parcela 1/${form.elements.installments.value}</span><label>Valor da parcela 1<input type="text" inputmode="decimal" value="${money(firstInstallmentDraft)}" data-amount-index="0" ${locked?'disabled':''}></label><span class="sub">Paga na venda • ${date(form.elements.saleDate.value)}</span><span class="badge delivered">Recebido</span></div>`:''}${scheduleDraft.map((p,i)=>`<div class="schedule-row"><span>Parcela ${i+1+offset}/${form.elements.installments.value}</span><label>Valor da parcela ${i+1+offset}<input type="text" inputmode="decimal" value="${money(p.amount)}" data-amount-index="${i+offset}" ${locked?'disabled':''}></label><label>Vencimento ${i+1+offset}<input type="date" min="1900-01" value="${p.dueDate}" data-due-index="${i}" required ${p.receipt?'disabled':''}></label><span class="badge ${p.receipt?'delivered':'pending'}">${p.receipt?'Recebido':'A receber'}</span></div>`).join('')}</div>`:'';
 $('#schedule-preview').querySelectorAll('[data-due-index]').forEach(input=>input.onchange=()=>{scheduleDraft[Number(input.dataset.dueIndex)].dueDate=input.value});
 $('#schedule-preview').querySelectorAll('[data-amount-index]').forEach(input=>{input.oninput=()=>maskMoneyInput(input);input.onchange=()=>redistributeInstallments(Number(input.dataset.amountIndex),parseBRL(input.value))});
}
function redistributeInstallments(index,value){const totalCents=Math.round(formTerms().total*100),count=Number(form.elements.installments.value);if(!Number.isInteger(count)||count<2)return;const selected=Math.max(0,Math.min(totalCents,Math.round(value*100))),remaining=totalCents-selected,others=count-1,base=Math.floor(remaining/others),extra=remaining%others,amounts=[];let cursor=0;for(let i=0;i<count;i++){if(i===index)amounts[i]=selected/100;else{amounts[i]=(base+(cursor<extra?1:0))/100;cursor++}}firstInstallmentDraft=amounts[0];scheduleDraft.forEach((p,i)=>p.amount=amounts[i+1]);paintSchedule()}
function getFirstInstallmentForSave(){return firstInstallmentDraft}
function getScheduleForSave(r){
 if(!eligibleReceivable(r))return undefined;
 if(!scheduleDraft)return undefined;
 refreshSchedule();
 const candidate={...r,receivables:scheduleDraft,firstInstallmentPaidAtSale:scheduleDraft.length===r.installments-1,firstInstallmentAmount:firstInstallmentDraft};if(!validSchedule(candidate)){toast('Confira datas, valores e quantidade dos vencimentos.');return false}
 return JSON.parse(JSON.stringify(scheduleDraft));
}
$('#first-payment-date').onchange=()=>generateSchedule(false);
function receivableRows(){return state.records.filter(eligibleReceivable).flatMap(r=>(r.receivables||[]).map((p,i)=>({r,p,i,kind:'customer'})))}
function renderReceivables(){
 const all=receivableRows();$('#receivable-count').textContent=all.filter(x=>x.kind==='customer'&&!x.p.receipt).length;
 const section=$('#receivables-section');section.hidden=tab!=='receivables';if(section.hidden)return;
 const scoped=all;
 const statusCards=[['late','Atrasados'],['today','Vencem hoje'],['soon','Próximos 7 dias'],['paid','Recebidos']];
 const cards=statusCards,pending=scoped.filter(x=>!x.p.receipt),pendingTotal=pending.reduce((sum,x)=>sum+x.p.amount,0);
 const rows=scoped.filter(x=>(receivableFilter==='all'||(receivableFilter==='pending'?!x.p.receipt:receivableStatus(x.p)===receivableFilter))&&[x.r.name,x.r.course].some(v=>v.toLocaleLowerCase('pt-BR').includes(receivableQuery))).sort((a,b)=>Number(!!a.p.receipt)-Number(!!b.p.receipt)||a.p.dueDate.localeCompare(b.p.dueDate));
 const missing=state.records.filter(r=>eligibleReceivable(r)&&!r.receivables);
 section.innerHTML=`<div class="receipt-scope"><p><strong>Somente modalidade Boleto.</strong> Parcelamentos diretos com o aluno, mesmo quando pagos por Pix. Pix à vista e cartão já são considerados recebidos e não geram cobranças aqui.</p></div><div class="stats receivable-summary"><article class="stat"><div class="stat-top">Parcelas a receber</div><div class="stat-value">${pending.length}</div><p class="stat-caption">Quantidade de parcelas ainda em aberto</p></article><article class="stat amber"><div class="stat-top">Total a receber</div><div class="stat-value">${money(pendingTotal)}</div><p class="stat-caption">Soma das parcelas ainda em aberto</p></article></div>
 ${missing.length?`<details class="missing-schedules"><summary>${missing.length} cadastro(s) sem vencimentos confirmados — configurar</summary><p>Confira as datas das parcelas futuras. Em novos cadastros, a primeira parcela é considerada paga na venda.</p>${missing.map(r=>`<div><span>${esc(r.name)} <small>${esc(r.course)}</small></span><button class="row-button" data-configure="${esc(r.id)}">Configurar vencimentos</button></div>`).join('')}</details>`:''}
 <section class="panel"><div class="panel-heading"><div><h2>Parcelas e recebimentos</h2><p>Uma linha por parcela, com a conta que efetivamente recebeu.</p></div><button class="secondary" id="export-receivables">↓ Exportar</button></div><div class="toolbar"><div class="filters">${[['all','Todos'],['pending','Em aberto'],...cards.map(([k,t])=>[k,t])].map(([k,t])=>`<button data-receivable-filter="${k}" class="${k===receivableFilter?'selected':''}">${t}</button>`).join('')}</div><label class="search"><input id="receivable-search" type="search" aria-label="Buscar cobrança" placeholder="Buscar aluno ou curso…" value="${esc(receivableQuery)}"></label></div><div class="table-scroll"><table><thead><tr><th>Aluno / Curso</th><th>Parcela / Tipo</th><th>Valor / Vencimento</th><th>Situação</th><th>Recebimento / Conta</th><th>Ações</th></tr></thead><tbody>${rows.length?rows.map(({r,p,i,kind})=>`<tr><td><strong>${esc(r.name)}</strong><span class="sub">${esc(r.course)}</span></td><td>${i+1}/${r.receivables.length}<span class="sub">Parcelamento direto</span></td><td><strong>${money(p.amount)}</strong><span class="sub">${date(p.dueDate)}</span></td><td><span class="badge ${receivableStatus(p)==='paid'?'delivered':receivableStatus(p)}">${receivableLabels[receivableStatus(p)]}</span></td><td>${p.receipt?`${date(p.receipt.date)}<span class="sub">${esc(p.receipt.actualMethod)} • ${channelLabels[p.receipt.collectionChannel]}</span><span class="sub">${accountLabels[p.receipt.destinationAccount]}</span>`:'—'}</td><td>${p.receipt?`<button class="row-button" data-reopen="${esc(p.id)}" data-record="${esc(r.id)}">Reabrir</button>`:`<button class="row-button" data-receive="${esc(p.id)}" data-record="${esc(r.id)}">Registrar pagamento</button><button class="edit-button" data-configure="${esc(r.id)}" aria-label="Ajustar vencimentos de ${esc(r.name)}">⋯</button>`}</td></tr>`).join(''):'<tr><td colspan="6" class="empty">Nenhuma parcela com estes filtros. Cadastre uma venda ou configure seus vencimentos.</td></tr>'}</tbody></table></div><div class="table-footer"><span>${rows.length} parcela(s) exibida(s)</span><span>Próximos 7 dias: amanhã até o sétimo dia.</span></div></section>`;
 section.querySelectorAll('[data-receivable-filter]').forEach(b=>b.onclick=()=>{receivableFilter=b.dataset.receivableFilter;renderReceivables()});
 $('#receivable-search').oninput=e=>{const start=e.target.selectionStart;receivableQuery=e.target.value.toLocaleLowerCase('pt-BR');renderReceivables();$('#receivable-search').focus();$('#receivable-search').setSelectionRange(start,start)};
 section.querySelectorAll('[data-configure]').forEach(b=>b.onclick=()=>openForm(b.dataset.configure));
 section.querySelectorAll('[data-receive]').forEach(b=>b.onclick=()=>openReceipt(b.dataset.record,b.dataset.receive));
 section.querySelectorAll('[data-reopen]').forEach(b=>b.onclick=()=>{if(!confirm('Reabrir esta parcela e remover seu registro de recebimento? Ela voltará a ficar em aberto.'))return;const records=state.records.map(r=>r.id===b.dataset.record?{...r,receivables:r.receivables.map(p=>p.id===b.dataset.reopen?{...p,receipt:null}:p)}:r);if(commit({...state,records}))toast('Parcela reaberta.');});
 $('#export-receivables').onclick=()=>exportReceivables(rows);
}
const receiptForm=$('#receipt-form');
function syncReceiptAccount(){const machine=receiptForm.elements.collectionChannel.value==='terminal';if(machine)receiptForm.elements.destinationAccount.value='polo_picpay';receiptForm.elements.destinationAccount.disabled=machine}
receiptForm.elements.collectionChannel.onchange=syncReceiptAccount;
function openReceipt(recordId,parcelId){
 const r=state.records.find(r=>r.id===recordId),p=r?.receivables.find(p=>p.id===parcelId);if(!r||!eligibleReceivable(r)||!p||p.receipt)return;
 receiptForm.reset();receiptForm.elements.recordId.value=recordId;receiptForm.elements.parcelId.value=parcelId;receiptForm.elements.amount.value=p.amount.toFixed(2);receiptForm.elements.date.max=today();receiptForm.elements.date.value=today();
 ['actualMethod','collectionChannel','destinationAccount'].forEach(k=>receiptForm.elements[k].value=r[k]||'');syncReceiptAccount();
 const parcelNumber=r.receivables.findIndex(x=>x.id===p.id)+1+(r.firstInstallmentPaidAtSale===true?1:0);$('#receipt-title').textContent='Registrar pagamento';$('#receipt-detail').textContent=`${r.name} • ${parcelNumber}/${r.installments} • vencimento ${date(p.dueDate)}`;$('#receipt-dialog').showModal();
}
receiptForm.onsubmit=e=>{e.preventDefault();const v=routePayment(Object.fromEntries(new FormData(receiptForm))),r=state.records.find(r=>r.id===v.recordId),p=r?.receivables.find(p=>p.id===v.parcelId);if(!r||!eligibleReceivable(r)||!p||p.receipt)return toast('Este recebimento já foi registrado ou a parcela não existe.');const receipt={date:v.date,amount:p.amount,actualMethod:v.actualMethod,collectionChannel:v.collectionChannel,destinationAccount:v.destinationAccount};const next={...r,receivables:r.receivables.map(x=>x.id===p.id?{...x,receipt}:x)};if(!validSchedule(next))return toast('Confira a data, o meio e a conta de recebimento.');if(commit({...state,records:state.records.map(x=>x.id===r.id?next:x)})){$('#receipt-dialog').close();toast('Recebimento registrado.')}};
function receiptsOverview(){const s=receiptSummary(state.records,financeMonth);return `<div class="receipt-overview"><div><span>Recebido em ${esc(monthLabel(financeMonth))}</span><strong>${money(s.received)}</strong></div><div><span>Saldo a receber • somente Boleto</span><strong>${money(s.outstanding)}</strong></div><p>Pix à vista e cartão são considerados recebidos pela data da venda (cartão líquido da taxa). Boleto conta apenas parcelas registradas como recebidas, pela data do recebimento. ${s.unconfigured} parcelamento(s) sem calendário ficam fora do saldo a receber. Valores antes de parceiros, gastos fixos e anúncios.</p></div>`}
function exportReceivables(rows){const data=[['Aluno','Curso','Tipo','Parcela','Valor','Vencimento','Situação','Data recebida','Meio utilizado','Cobrança','Conta'],...rows.map(({r,p,i,kind})=>[r.name,r.course,'Parcelamento direto',`${i+1}/${r.receivables.length}`,p.amount.toFixed(2).replace('.',','),date(p.dueDate),receivableLabels[receivableStatus(p)],p.receipt?date(p.receipt.date):'',p.receipt?.actualMethod||'',channelLabels[p.receipt?.collectionChannel]||'',accountLabels[p.receipt?.destinationAccount]||''])];const cell=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"';download('\ufeff'+data.map(r=>r.map(cell).join(';')).join('\r\n'),`contas-a-receber-${today()}.csv`,'text/csv;charset=utf-8')}
setInterval(()=>{if(!document.querySelector('dialog[open]')&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))render()},60000);
render();
