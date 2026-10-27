(function(root){
 const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
 const addDays=(date,days)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+Number(days));return d.toISOString().slice(0,10)};
 const remaining=(date,now=today())=>Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(now+'T12:00:00Z'))/86400000);
 const status=(r,now=today())=>r.deliveredDate?'delivered':remaining(r.dueDate,now)<0?'late':remaining(r.dueDate,now)<=7?'soon':'pending';
 const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 const validRecord=r=>r&&['id','name','course','institution','phone','partner','type','payment'].every(k=>typeof r[k]==='string')&&r.name.trim()&&r.course.trim()&&validDate(r.saleDate)&&validDate(r.dueDate)&&(!r.deliveredDate||validDate(r.deliveredDate))&&Number.isFinite(r.total)&&r.total>=0&&Number.isInteger(r.installments)&&r.installments>=1&&r.installments<=120&&Number.isInteger(r.days)&&r.days>=0&&r.days<=3650;
 const roundMoney=v=>Math.round((v+Number.EPSILON)*100)/100;
 const paymentTotals=r=>{const gross=roundMoney(Number(r.total)||0);const fee=r.payment==='Cartão de crédito'?roundMoney(r.feeMode==='amount'?Number(r.feeValue)||0:gross*(Number(r.feeValue)||0)/100):0;const partnerCost=r.partnerPayment==='package'?0:roundMoney(Number(r.partnerAmount)||0);return {gross,fee,partnerCost,net:roundMoney(gross-fee-partnerCost),installment:roundMoney(gross/Math.max(1,Number(r.installments)||1))}};
 const validPayment=r=>['Pix','Boleto','Cartão de crédito'].includes(r.payment)&&Number.isInteger(r.installments)&&(r.payment==='Pix'?r.installments===1:r.payment==='Boleto'?r.installments>=2&&r.installments<=120:r.installments>=1&&r.installments<=12)&&['percent','amount'].includes(r.feeMode)&&Number.isFinite(r.feeValue)&&r.feeValue>=0&&(r.payment==='Cartão de crédito'?r.feeValue<=(r.feeMode==='percent'?100:r.total):r.feeValue===0);
 // Older records retain their totals and installment counts; editing enforces the new limits.
 const migratePayment=r=>({...r,payment:r.payment==='Cartão'?'Cartão de crédito':['Pix','Boleto','Dinheiro','Transferência'].includes(r.payment)?(r.installments>1?'Boleto':'Pix'):r.payment,feeMode:r.feeMode??'percent',feeValue:r.feeValue??0,partnerPayment:r.partnerPayment??'per_course',partnerAmount:r.partnerAmount??0,actualMethod:r.actualMethod??'',collectionChannel:r.collectionChannel??'',destinationAccount:r.destinationAccount??''});
 const validFee=r=>r.feeMode===undefined&&r.feeValue===undefined||['percent','amount'].includes(r.feeMode)&&Number.isFinite(r.feeValue)&&r.feeValue>=0&&(r.payment==='Cartão de crédito'||r.payment==='Cartão'?r.feeValue<=(r.feeMode==='percent'?100:r.total):r.feeValue===0);
 const validPartner=r=>r.partnerPayment===undefined&&r.partnerAmount===undefined||['per_course','package'].includes(r.partnerPayment)&&Number.isFinite(r.partnerAmount)&&r.partnerAmount>=0&&r.partnerAmount<=100000000&&(r.partnerPayment!=='package'||r.partnerAmount===0);
 const accountLabels={edivaldo:'Edivaldo',seven_gold:'Seven Gold',polo_picpay:'Polo Q Acadêmico — PicPay'};
 const channelLabels={direct:'Direto na conta',terminal:'Maquininha',link:'Link de pagamento'};
 const validRouting=r=>['','Pix','Boleto','Cartão de crédito'].includes(r.actualMethod??'')&&['','direct','terminal','link'].includes(r.collectionChannel??'')&&['','edivaldo','seven_gold','polo_picpay'].includes(r.destinationAccount??'')&&(r.collectionChannel!=='terminal'||r.destinationAccount==='polo_picpay');
 const routePayment=r=>({...r,destinationAccount:r.collectionChannel==='terminal'?'polo_picpay':r.destinationAccount});
 const validMonth=v=>typeof v==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(v)&&Number(v.slice(0,4))>=1900;
 const validAmount=v=>Number.isFinite(v)&&v>=0&&v<=100000000;
 const validExpense=r=>r&&typeof r.id==='string'&&!!r.id&&typeof r.recurringKey==='string'&&!!r.recurringKey&&typeof r.name==='string'&&!!r.name.trim()&&typeof r.recipient==='string'&&['marketing','courses','other'].includes(r.category)&&['fixed','variable'].includes(r.expenseType??'fixed')&&validMonth(r.month)&&validAmount(r.amount)&&validAmount(r.interest??0)&&(!r.dueDate||validDate(r.dueDate)&&r.dueDate.slice(0,7)===r.month)&&(!r.paidDate||validDate(r.paidDate))&&typeof r.example==='boolean';
 const validAd=r=>r&&typeof r.id==='string'&&!!r.id&&typeof r.platform==='string'&&!!r.platform.trim()&&typeof r.note==='string'&&validDate(r.date)&&validAmount(r.amount)&&r.amount>0;
 const validFinance=s=>['expenses','adSpends'].every(k=>s[k]===undefined||Array.isArray(s[k])&&s[k].every(k==='expenses'?validExpense:validAd)&&new Set(s[k].map(r=>r.id)).size===s[k].length)&&(s.taxRates===undefined||s.taxRates&&typeof s.taxRates==='object'&&!Array.isArray(s.taxRates)&&Object.entries(s.taxRates).every(([month,rate])=>validMonth(month)&&Number.isFinite(rate)&&rate>=0&&rate<=100));
 const monthlyTotals=(s,month)=>{
  const sales=s.records.filter(r=>r.saleDate.slice(0,7)===month).map(paymentTotals);
  const sum=(list,fn)=>roundMoney(list.reduce((total,r)=>total+fn(r),0));
  const gross=sum(sales,r=>r.gross),fees=sum(sales,r=>r.fee),partners=sum(sales,r=>r.partnerCost);
  const monthExpenses=(s.expenses||[]).filter(r=>r.month===month&&!r.example),expenseValue=r=>r.amount+(r.interest??0),fixed=sum(monthExpenses.filter(r=>(r.expenseType??'fixed')==='fixed'),expenseValue),variable=sum(monthExpenses.filter(r=>r.expenseType==='variable'),expenseValue);
  const ads=sum((s.adSpends||[]).filter(r=>r.date.slice(0,7)===month),r=>r.amount);
  const taxRate=Number(s.taxRates?.[month])||0,tax=roundMoney(gross*taxRate/100);
  return {gross,fees,partners,fixed,variable,ads,taxRate,tax,net:roundMoney(gross-fees-partners-fixed-variable-ads-tax),count:sales.length,examples:(s.expenses||[]).filter(r=>r.month===month&&r.example).length};
 };
 const previousMonth=month=>{const [year,m]=month.split('-').map(Number);return m===1?`${year-1}-12`:`${year}-${String(m-1).padStart(2,'0')}`};
 const repeatExpenses=(expenses,month,idFactory)=>{const keys=new Set(expenses.filter(r=>r.month===month).map(r=>r.recurringKey));return expenses.filter(r=>r.month===previousMonth(month)&&!r.example&&!keys.has(r.recurringKey)).map(r=>{keys.add(r.recurringKey);const day=Number((r.dueDate||'').slice(8,10))||1,[year,m]=month.split('-').map(Number),last=new Date(Date.UTC(year,m,0)).getUTCDate(),dueDate=`${month}-${String(Math.min(day,last)).padStart(2,'0')}`;return {...r,id:idFactory(),month,dueDate,paidDate:'',interest:0}})};
 const api={today,addDays,remaining,status,validRecord,roundMoney,paymentTotals,validPayment,migratePayment,validFee,validPartner,accountLabels,channelLabels,validRouting,routePayment,validMonth,validExpense,validAd,validFinance,monthlyTotals,previousMonth,repeatExpenses};if(typeof module!=='undefined')module.exports=api;else root.Educa=api;
})(typeof window==='undefined'?globalThis:window);
