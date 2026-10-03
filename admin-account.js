var mcSourceFiles=[],mcCloudId=null,mcCloudLoading=false,mcCloudSaving=false;
function mcCalculate(text){
 const sep=detectSepA(text),lines=text.split(/\r?\n/).filter(l=>l.trim());
 if(lines.length<2)throw new Error('El CSV no tiene movimientos.');
 const h=smartSplitA(lines[0],sep).map(x=>x.toLowerCase().replace(/\s+/g,''));
 const col=(...names)=>names.map(n=>h.indexOf(n)).find(i=>i>=0)??-1;
 const iR=col('reason','tipo','type'),iA=col('amount','monto','importe'),iT=col('time','fecha','date','datetime'),iInv=col('investorname','investor','inversor','name','usuario');
 if([iR,iA,iT,iInv].some(i=>i<0))throw new Error('Usa un CSV consolidado con fecha, tipo, monto y nombre del inversor.');
 const norm=x=>(x||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
 const manager=norm(MANAGER_CSV_NAME);
 const rows=lines.slice(1).map(l=>{const c=smartSplitA(l,sep);return {reason:(c[iR]||'').toLowerCase().replace(/\s+/g,''),amount:parseNumA(c[iA]),date:parseDateA(c[iT]),manager:norm(c[iInv])===manager};}).filter(r=>r.date);
 if(!rows.length)throw new Error('No hay fechas válidas.');
 const feeTypes={performancefee:'perf',managementfee:'mgmt',depositfee:'dep'};
 const actual=rows.some(r=>r.manager&&feeTypes[r.reason]&&r.amount>0),managerFound=rows.some(r=>r.manager);
 const monthly={};let totalPerf=0,totalMgmt=0,totalDep=0,totalWith=0;
 for(const r of rows){
  const type=feeTypes[r.reason];let category=null,value=0;
  if(type&&(actual?r.manager&&r.amount>0:!r.manager&&r.amount<0)){category=type;value=Math.abs(r.amount);}
  if(['withdrawal','retiro'].includes(r.reason)&&r.manager){category='with';value=Math.abs(r.amount);}
  if(!category)continue;
  const mk=r.date.getFullYear()+'-'+String(r.date.getMonth()+1).padStart(2,'0');
  monthly[mk]??={perf:0,mgmt:0,dep:0,with:0};monthly[mk][category]+=value;
 }
 for(const m of Object.values(monthly)){totalPerf+=m.perf;totalMgmt+=m.mgmt;totalDep+=m.dep;totalWith+=m.with;}
 const totalFees=totalPerf+totalMgmt+totalDep;
 return {totalPerf,totalMgmt,totalDep,totalWith,totalFees,balance:totalFees-totalWith,monthly,monthKeys:Object.keys(monthly).sort(),actual,managerFound,dataAsOf:new Date(rows.reduce((latest,r)=>Math.max(latest,r.date.getTime()),0)).toISOString()};
}
async function mcSaveCloud(text,name){
 if(mcCloudSaving)throw new Error('Hay otra carga de Mi cuenta en curso.');
 const result=mcCalculate(text);mcCloudSaving=true;
 $('mcSyncStatus').textContent='Guardando consolidado completo…';
 try{
  const {error}=await db.from('rc_manager_csv').insert({csv_data:text,file_name:name,data_as_of:result.dataAsOf});
  if(error)throw new Error('No se pudo guardar en Supabase. Verifica que el SQL 007 esté instalado.');
 }finally{mcCloudSaving=false;}
 await mcLoadCloud();
}
async function mcLoadCloud(){
 if(mcCloudLoading||mcCloudSaving)return;mcCloudLoading=true;
 try{
  const {data,error}=await db.from('rc_manager_csv').select('id,csv_data,file_name,data_as_of,created_at').order('data_as_of',{ascending:false}).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(error)throw new Error('No se pudo sincronizar Mi cuenta. Verifica el SQL 007 y tu conexión.');
  if(!data){$('mcSyncStatus').textContent='Sin consolidado guardado. Carga el archivo completo una vez.';return;}
  if(mcCloudId!==data.id){mcProcessCSV(data.csv_data);lastConsolidatedCSV=data.csv_data;mcCloudId=data.id;}
  $('mcSyncStatus').textContent='Datos hasta '+new Date(data.data_as_of).toLocaleString('es-PA',{timeZone:'America/Panama'})+' · Guardado '+new Date(data.created_at).toLocaleString('es-PA',{timeZone:'America/Panama'});
 }catch(e){$('mcSyncStatus').textContent=e.message;}finally{mcCloudLoading=false;}
}
setInterval(()=>{if(!document.hidden&&$('appScreen').style.display==='block')mcLoadCloud();},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&$('appScreen').style.display==='block')mcLoadCloud();});
window.addEventListener('online',()=>{if($('appScreen').style.display==='block')mcLoadCloud();});
