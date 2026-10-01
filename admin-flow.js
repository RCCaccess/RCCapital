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
async function loadIngresos(){
 const el=$('ingresosList');if(!el)return;el.textContent='Cargando…';
 const {data,error}=await db.from('solicitudes_ingreso').select('*').order('created_at',{ascending:false});
 if(error){el.textContent='No se pudieron cargar las solicitudes. Instala la migración de Supabase.';return;}
 el.replaceChildren();if(!data.length)el.textContent='Todavía no hay solicitudes.';
 for(const r of data){const card=document.createElement('div');card.style.cssText='padding:20px;margin:12px 0;border:1px solid var(--border);border-radius:12px';
 const title=document.createElement('h3');title.textContent=r.nombre;card.append(title);
 const info=document.createElement('p');info.textContent=`${r.email} · ${r.whatsapp} · ${r.pais} · $${r.capital_inicial} · ${r.estado}`;card.append(info);
 if(r.estado==='pendiente')for(const [label,action] of [['Aprobar e invitar','approve'],['Rechazar','reject']]){const b=document.createElement('button');b.className='btn';b.textContent=label;b.onclick=async()=>{card.querySelectorAll('button').forEach(x=>x.disabled=true);try{await rcAdminAction({action,requestId:r.id});toast(action==='approve'?'Invitación enviada':'Solicitud rechazada');await loadIngresos();await loadClientes();}catch(e){toast(e.message,'bad');card.querySelectorAll('button').forEach(x=>x.disabled=false);}};card.append(b);}
 el.append(card);}
 const select=$('bindCliente');select.replaceChildren();for(const c of clientesCache){const op=document.createElement('option');op.value=c.id;op.textContent=c.nombre+' · '+(c.investment_id||'sin ID');select.append(op);}
 const {data:mov,error:me}=await db.from('solicitudes').select('*').order('created_at',{ascending:false});const m=$('movimientosList');m.replaceChildren();
 if(me){m.textContent='No se pudieron cargar los movimientos.';return;}if(!mov.length)m.textContent='Sin solicitudes de movimientos.';
 for(const r of mov){const row=document.createElement('div');row.style.padding='12px';const text=document.createElement('p');text.textContent=`${r.nombre||r.cliente_id} · ${r.tipo} · $${r.monto} · ${r.estado}`;row.append(text);
 if(r.estado==='pendiente')for(const state of ['aprobada','rechazada']){const b=document.createElement('button');b.className='btn';b.textContent=state==='aprobada'?'Marcar aprobada':'Rechazar';b.onclick=async()=>{b.disabled=true;const {error}=await db.from('solicitudes').update({estado:state}).eq('id',r.id).eq('estado','pendiente');if(error)toast(error.message,'bad');else await loadIngresos();b.disabled=false;};row.append(b);}m.append(row);}
}
async function bindBroker(){const id=$('bindInvestment').value.trim();if(!id){toast('Introduce InvestmentId','bad');return;}
 const {error}=await db.from('clientes').update({investment_id:id}).eq('id',$('bindCliente').value);if(error)toast(error.message,'bad');else{toast('Cuenta vinculada');await loadClientes();await loadIngresos();}}
