(function(root){
 const core=typeof module!=='undefined'?require('./domain.js'):root.Educa;
 const {paymentTotals,remaining,today,validRouting}=core;
 const cents=n=>Math.round((n+Number.EPSILON)*100);
 const realDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number(v.slice(0,4))>=1900&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 const monthDate=(first,offset)=>{const [y,m,day]=first.split('-').map(Number);const base=new Date(Date.UTC(y,m-1+offset,1,12));const last=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+1,0)).getUTCDate();base.setUTCDate(Math.min(day,last));return base.toISOString().slice(0,10)};
 const splitAmount=(total,count)=>{const value=cents(total),base=Math.floor(value/count),extra=value%count;return Array.from({length:count},(_,i)=>(base+(i<extra?1:0))/100)};
 const receivableBase=r=>r.payment==='Cartão de crédito'?Math.max(0,paymentTotals(r).gross-paymentTotals(r).fee):r.total;
 const eligibleReceivable=r=>r.payment==='Boleto';
 const buildSchedule=(r,first,count,idFactory)=>{if(!eligibleReceivable(r)||!realDate(first)||!Number.isInteger(count)||count<1||count>120)throw Error('Vencimento ou quantidade inválida');return splitAmount(receivableBase(r),count).map((amount,i)=>({id:idFactory(),dueDate:monthDate(first,i),amount,receipt:null}))};
 const buildDeferredSchedule=(r,saleDate,idFactory)=>{if(!eligibleReceivable(r)||!realDate(saleDate)||!Number.isInteger(r.installments)||r.installments<2||r.installments>120)throw Error('Venda ou quantidade inválida');const amounts=splitAmount(receivableBase(r),r.installments);return amounts.slice(1).map((amount,i)=>({id:idFactory(),dueDate:monthDate(saleDate,i+1),amount,receipt:null}))};
 const receivableStatus=(p,now=today())=>p.receipt?'paid':remaining(p.dueDate,now)<0?'late':remaining(p.dueDate,now)===0?'today':remaining(p.dueDate,now)<=7?'soon':'pending';
 const validSchedule=r=>{
  if(r.receivables===undefined)return true;
  const list=r.receivables;if(!Array.isArray(list)||!list.length||list.length>120||new Set(list.map(p=>p?.id)).size!==list.length)return false;
  if(r.payment!=='Cartão de crédito'&&list.length!==r.installments&&!(r.firstInstallmentPaidAtSale===true&&list.length===r.installments-1))return false;
  if(!list.every(p=>p&&typeof p.id==='string'&&!!p.id&&realDate(p.dueDate)&&Number.isFinite(p.amount)&&p.amount>=0&&p.amount<=100000000&&Math.abs(cents(p.amount)/100-p.amount)<0.000001&&(p.receipt===null||p.receipt&&realDate(p.receipt.date)&&p.receipt.date<=today()&&Number.isFinite(p.receipt.amount)&&cents(p.receipt.amount)===cents(p.amount)&&!!p.receipt.actualMethod&&!!p.receipt.collectionChannel&&!!p.receipt.destinationAccount&&validRouting(p.receipt))))return false;
  const listTotal=list.reduce((sum,p)=>sum+cents(p.amount),0);
  if(r.firstInstallmentPaidAtSale===true){const first=r.firstInstallmentAmount??(receivableBase(r)-listTotal/100);return Number.isFinite(first)&&first>=0&&cents(first)+listTotal===cents(receivableBase(r))}
  return listTotal===cents(receivableBase(r));
 };
 const protectedTermsChanged=(old,next)=>old?.payment==='Boleto'&&!!old?.receivables?.some(p=>p.receipt)&&['total','installments','payment','feeMode','feeValue'].some(k=>old[k]!==next[k]);
 const receiptSummary=(records,month)=>{let received=0,outstanding=0,unconfigured=0;for(const r of records){if(!eligibleReceivable(r)){if(!month||r.saleDate?.slice(0,7)===month)received+=cents(receivableBase(r));continue}if(!r.receivables){unconfigured++;continue}if(r.firstInstallmentPaidAtSale===true&&(!month||r.saleDate?.slice(0,7)===month)){const future=r.receivables.reduce((sum,p)=>sum+cents(p.amount),0),first=r.firstInstallmentAmount??(receivableBase(r)-future/100);received+=cents(first)}for(const p of r.receivables){if(p.receipt){if(!month||p.receipt.date.slice(0,7)===month)received+=cents(p.receipt.amount)}else outstanding+=cents(p.amount)}}return {received:received/100,outstanding:outstanding/100,unconfigured}};
 const api={eligibleReceivable,monthDate,splitAmount,receivableBase,buildSchedule,buildDeferredSchedule,receivableStatus,validSchedule,protectedTermsChanged,receiptSummary};
 if(typeof module!=='undefined')module.exports=api;else Object.assign(root.Educa,api);
})(typeof window==='undefined'?globalThis:window);
