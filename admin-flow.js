let rcBadgeLoading=false;
async function updateSolicitudesBadge(){
 const badge=$('rcSolicitudesBadge'),nav=$('rcSolicitudesNav');if(!badge||rcBadgeLoading)return;rcBadgeLoading=true;
 try{
  const results=await Promise.all([
   db.from('solicitudes_ingreso').select('id',{count:'exact',head:true}).eq('estado','pendiente'),
   db.from('solicitudes').select('id',{count:'exact',head:true}).eq('estado','pendiente')
  ]);
  if(results.some(r=>r.error)){badge.hidden=false;badge.textContent='!';nav.title='No pudimos actualizar las solicitudes';nav.setAttribute('aria-label','Solicitudes: no se pudo consultar el contador');return;}
  const total=results.reduce((n,r)=>n+(r.count||0),0);badge.textContent=total>99?'99+':String(total);badge.hidden=total===0;
  nav.title=total?total+' solicitudes pendientes':'Sin solicitudes pendientes';nav.setAttribute('aria-label',nav.title);
 }catch(e){nav.title='No pudimos actualizar las solicitudes';}finally{const mobileBadge=$('rcMenuBadge');if(mobileBadge){mobileBadge.textContent=badge.textContent;mobileBadge.hidden=badge.hidden;}rcBadgeLoading=false;}
}
setInterval(()=>{if(!document.hidden && $('appScreen')?.style.display==='block')updateSolicitudesBadge();},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden && $('appScreen')?.style.display==='block')updateSolicitudesBadge();});
function rcEscape(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function rcAdminAction(body){
 const {data,error}=await db.functions.invoke('rc-admin',{body});
 if(error){
  let detail='';
  if(error.context&&typeof error.context.json==='function'){
   try{const response=typeof error.context.clone==='function'?error.context.clone():error.context;const payload=await response.json();detail=typeof payload.error==='string'?payload.error:typeof payload.message==='string'?payload.message:'';}catch(e){}
  }
  const status=error.context?.status;
  throw new Error(detail||('No se completó la acción'+(status?' (HTTP '+status+')':'')+'. '+(error.message||'Revisa la conexión y la función rc-admin.')));
 }
 if(data?.error)throw new Error(data.error);
 if(!data?.ok)throw new Error('La función no confirmó el envío.');
 return data;
}
let rcRequestState='pendiente',rcIngresos=[],rcMovimientos=[],rcRequestsLoading=false;
function rcSetRequestState(state){
 if(!['pendiente','aprobada','rechazada'].includes(state))return;
 rcRequestState=state;
 document.querySelectorAll('[data-request-state]').forEach(b=>{const active=b.dataset.requestState===state;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});
 rcRenderRequests();
}
function rcRequestCard(r,admission){
 const card=document.createElement('article');card.className='request-card';
 const header=document.createElement('div');header.className='request-card-header';
 const title=document.createElement('h4');title.textContent=r.nombre||r.cliente_id;header.append(title);
 const badge=document.createElement('span');badge.className='request-status';badge.textContent=r.estado;header.append(badge);card.append(header);
 const info=document.createElement('p');info.textContent=admission?[r.email,r.whatsapp,r.pais].filter(Boolean).join(' · '):[r.tipo,r.email,r.referencia].filter(Boolean).join(' · ');card.append(info);
 const value=document.createElement('p');value.textContent=(admission?'Capital indicado: ':'Monto solicitado: ')+Number(admission?r.capital_inicial:r.monto).toLocaleString('es-PA',{style:'currency',currency:'USD'});card.append(value);
 const date=document.createElement('p');date.textContent='Recibida: '+fmtDate(r.created_at);card.append(date);
 if(r.estado==='pendiente'){
  const actions=document.createElement('div');actions.className='request-actions';
  for(const state of ['aprobada','rechazada']){
   const b=document.createElement('button');b.className='btn';b.textContent=state==='aprobada'?(admission?'Aprobar e invitar':'Marcar aprobada'):'Rechazar';
   b.onclick=async()=>{
    actions.querySelectorAll('button').forEach(x=>x.disabled=true);
    try{
     if(admission){await rcAdminAction({action:state==='aprobada'?'approve':'reject',requestId:r.id});}
     else{const {data,error}=await db.from('solicitudes').update({estado:state}).eq('id',r.id).eq('estado','pendiente').select('id');if(error)throw error;if(!data?.length)throw new Error('Esta solicitud ya cambió. Actualiza el listado.');}
     toast(admission&&state==='aprobada'?'Correo de acceso solicitado':'Estado actualizado');
     await loadClientes();await loadIngresos();
    }catch(e){toast(e.message,'bad');actions.querySelectorAll('button').forEach(x=>x.disabled=false);}
   };
   actions.append(b);
  }
  card.append(actions);
 }
 return card;
}
function rcRenderRequests(){
 for(const state of ['pendiente','aprobada','rechazada'])$('reqCount-'+state).textContent='('+rcIngresos.concat(rcMovimientos).filter(r=>r.estado===state).length+')';
 for(const [id,rows,admission]of [['ingresosList',rcIngresos,true],['movimientosList',rcMovimientos,false]]){
  const el=$(id);el.replaceChildren();const filtered=rows.filter(r=>r.estado===rcRequestState);
  if(!filtered.length){const empty=document.createElement('div');empty.className='request-empty';empty.textContent='Sin solicitudes '+({pendiente:'pendientes',aprobada:'aprobadas',rechazada:'rechazadas'}[rcRequestState])+'.';el.append(empty);}
  else filtered.forEach(r=>el.append(rcRequestCard(r,admission)));
 }
}
function rcSelectBrokerClient(){
 const cli=clientesCache.find(c=>c.id===$('bindCliente').value);
 $('bindInvestment').value=cli?.investment_id||'';
 $('bindCurrent').textContent=cli?(cli.investment_id?'ID actual: '+cli.investment_id+' · Puedes corregirlo y guardar.':'Este inversor todavía no tiene un ID del broker.'):'Selecciona un inversor.';
}
async function loadIngresos(){
 if(rcRequestsLoading)return;rcRequestsLoading=true;
 try{
  await updateSolicitudesBadge();
  const results=await Promise.all([db.from('solicitudes_ingreso').select('*').order('created_at',{ascending:false}),db.from('solicitudes').select('*').order('created_at',{ascending:false})]);
  if(results.some(r=>r.error))throw new Error('No se pudieron actualizar las solicitudes.');
  rcIngresos=results[0].data||[];rcMovimientos=results[1].data||[];rcRenderRequests();
  const select=$('bindCliente'),selected=select.value;select.replaceChildren();
  const first=document.createElement('option');first.value='';first.textContent='Selecciona un inversor';select.append(first);
  for(const c of clientesCache){const op=document.createElement('option');op.value=c.id;op.textContent=c.nombre+' · '+(c.investment_id||'sin ID');select.append(op);}
  select.value=selected;rcSelectBrokerClient();
 }catch(e){toast(e.message,'bad');}finally{rcRequestsLoading=false;}
}
async function bindBroker(){
 const clientId=$('bindCliente').value,id=$('bindInvestment').value.trim();
 if(!clientId){toast('Selecciona un inversor','bad');return;}
 if(!/^\d+$/.test(id)){toast('Introduce el InvestmentId numérico del broker','bad');return;}
 const cli=clientesCache.find(c=>c.id===clientId);
 if(clientesCache.some(c=>c.id!==clientId&&c.investment_id===id)){toast('Ese ID ya pertenece a otro cliente','bad');return;}
 if(String(cli?.investment_id||'')===id){toast('El ID ya está guardado');return;}
 const b=$('bindSave');b.disabled=true;
 try{
  const {data,error}=await db.from('clientes').update({investment_id:id}).eq('id',clientId).select('id');
  if(error)throw error;if(!data?.length)throw new Error('No se confirmó el cambio del ID.');
  toast('ID del broker actualizado');await loadClientes();await loadIngresos();
 }catch(e){toast(e.code==='23505'?'Ese ID ya está vinculado a otro cliente':e.message,'bad');}finally{b.disabled=false;}
}

function rcEditBroker(clientId){showPage('ingresos');$('bindCliente').value=clientId;rcSelectBrokerClient();$('bindInvestment').focus();$('bindInvestment').scrollIntoView({block:'center',behavior:'smooth'});}
