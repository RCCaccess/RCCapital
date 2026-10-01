window.rcNeedsPassword=['invite','recovery'].includes(new URLSearchParams(location.hash.slice(1)).get('type'));
const rcResourceFields=['video_registro','video_deposito','video_activacion','video_retiros','broker_registered'];
function rcNode(tag,text,parent){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(parent)parent.append(node);return node;}
function rcOverlay(title){
 document.getElementById('rcOnboarding')?.remove();
 const overlay=rcNode('div');overlay.id='rcOnboarding';overlay.style.cssText='position:fixed;inset:0;z-index:9999;background:#070b13;color:#f3f5f8;overflow:auto;padding:28px 16px;font:16px system-ui;box-sizing:border-box';
 const box=rcNode('div',undefined,overlay);box.style.cssText='max-width:900px;margin:auto';
 rcNode('p','RC CAPITAL',box).style.cssText='color:#8b9bb7;letter-spacing:2px';rcNode('h1',title,box);
 document.body.append(overlay);return {overlay,box};
}
function rcButton(text,parent){const b=rcNode('button',text,parent);b.type='button';b.style.cssText='padding:13px 18px;margin:12px 12px 12px 0;border-radius:8px;border:1px solid #53617b;background:#19253d;color:white;cursor:pointer;font:inherit';return b;}
function rcContract(parent){
 const host=rcNode('div',undefined,parent);host.style.cssText='border:1px solid #2b3853;border-radius:18px;overflow:hidden;margin:20px 0';
 const loading=rcNode('p','Cargando el contrato…',host);loading.style.padding='20px';
 const showPdf=()=>{host.replaceChildren();const frame=rcNode('iframe',undefined,host);frame.src=RC_CONFIG.termsUrl;frame.title='Contrato de gestión privada de capital';frame.style.cssText='width:100%;height:65vh;min-height:360px;border:0;background:white';};
 if(RC_CONFIG.termsDisplayUrl){fetch(RC_CONFIG.termsDisplayUrl).then(r=>{if(!r.ok)throw new Error('Contrato no disponible');return r.text();}).then(text=>{
  if(!host.isConnected)return;const parsed=new DOMParser().parseFromString(text,'text/html');const contract=parsed.querySelector('main.contract'),style=parsed.querySelector('style');if(!contract||!style)throw new Error('Contrato incompleto');
  contract.querySelectorAll('script,iframe,object,embed').forEach(n=>n.remove());host.replaceChildren();const shadow=host.attachShadow({mode:'open'});shadow.append(style.cloneNode(true),contract.cloneNode(true));
 }).catch(()=>{if(host.isConnected)showPdf();});}else showPdf();
 const a=rcNode('a','Descargar contrato en PDF',parent);a.href=RC_CONFIG.termsUrl;a.target='_blank';a.rel='noopener';a.style.cssText='display:block;color:#aac2ff;margin:12px 0';
}

function rcReceipt(parent,receipt){
 const box=rcNode('section',undefined,parent);box.style.cssText='padding:18px;border:1px solid #53617b;border-radius:8px;margin:18px 0';
 rcNode('h3','Aceptación registrada',box);rcNode('p',receipt.full_name,box);
 rcNode('p',(receipt.document_type==='cedula'?'Cédula: ':'Pasaporte: ')+receipt.document_number,box);
 rcNode('p','Aceptado el '+new Date(receipt.accepted_at).toLocaleString('es-PA')+' · Versión '+receipt.terms_version,box);
 rcNode('p','Tus datos de aceptación están guardados y no pueden modificarse.',box);
}
async function rcShowContract(cli,db,user){
 const {box}=rcOverlay('Lee y acepta el contrato para continuar');
 rcNode('p','Completa tus datos tal como aparecen en tu documento. Revisa que sean correctos: quedarán registrados al aceptar.',box);rcContract(box);
 const form=rcNode('form',undefined,box);
 const nameLabel=rcNode('label','Nombre completo',form),name=rcNode('input',undefined,nameLabel);name.name='full_name';name.required=true;name.minLength=3;name.maxLength=150;name.autocomplete='name';name.value=cli.nombre||'';
 const typeLabel=rcNode('label','Tipo de documento',form),type=rcNode('select',undefined,typeLabel);type.name='document_type';
 for(const [v,t] of [['cedula','Cédula'],['pasaporte','Pasaporte']]){const o=rcNode('option',t,type);o.value=v;}
 const idLabel=rcNode('label','Número de cédula o pasaporte',form),id=rcNode('input',undefined,idLabel);id.name='document_number';id.required=true;id.minLength=4;id.maxLength=40;id.autocomplete='off';
 for(const field of [name,type,id])field.style.cssText='display:block;width:100%;box-sizing:border-box;padding:12px;margin:8px 0 18px;border:1px solid #53617b;border-radius:6px;background:#121d30;color:white;font:inherit';
 const consentLabel=rcNode('label',undefined,form),consent=rcNode('input',undefined,consentLabel);consent.type='checkbox';consent.required=true;consentLabel.append(document.createTextNode(' He leído y acepto la totalidad del contrato y confirmo que mis datos son correctos.'));
 const message=rcNode('p','',form);message.setAttribute('role','status');
 const accept=rcButton('Aceptar contrato y continuar',form);accept.type='submit';
 rcButton('Cerrar sesión',box).onclick=async()=>{await db.auth.signOut();location.reload();};
 form.onsubmit=async e=>{e.preventDefault();if(!form.reportValidity())return;accept.disabled=true;message.textContent='Guardando tu aceptación…';
  const {data,error}=await db.rpc('rc_accept_contract',{p_full_name:name.value.trim(),p_document_type:type.value,p_document_number:id.value.trim(),p_version:RC_CONFIG.termsVersion});
  if(error){message.textContent='No se pudo registrar la aceptación. Intenta de nuevo o contacta con RC Capital.';accept.disabled=false;return;}
  if(!data){message.textContent='No se pudo confirmar la aceptación. Intenta de nuevo.';accept.disabled=false;return;}
  sessionStorage.setItem('rcOpenResources','1');location.reload();
 };
}
async function rcShowResources(db,user,receipt){
 const {overlay,box}=rcOverlay('Tu guía de inicio');
 rcNode('p','Consulta estos recursos cuando los necesites. Tu dashboard ya está disponible.',box);
 rcButton('Volver a mi dashboard',box).onclick=()=>overlay.remove();
 const {data:row,error}=await db.from('rc_onboarding').select('*').eq('user_id',user.id).maybeSingle();
 if(error){rcNode('p','No se pudo cargar tu progreso. Cierra esta guía y vuelve a abrirla.',box);return;}
 const state=row||{};
 const titles=['Registro en el broker','Realizar un depósito','Activar la gestión','Solicitar retiros','Registro de tu cuenta'];
 rcResourceFields.forEach((field,i)=>{
  const section=rcNode('section',undefined,box);section.style.cssText='padding:20px 0;border-bottom:1px solid #273044';rcNode('h2',titles[i],section);
  const url=i===4?RC_CONFIG.brokerUrl:RC_CONFIG.videos[['registro','deposito','activacion','retiros'][i]];
  if(!url){rcNode('p','Este recurso estará disponible próximamente.',section);return;}
  if(i===4){
   rcNode('p','Abre el sitio del broker para crear tu cuenta.',section);
   const referral=rcNode('div',undefined,section);referral.style.cssText='padding:18px;margin:16px 0;border:1px solid #8faeff;border-radius:12px;background:#162541;max-width:100%;box-sizing:border-box';
   const instruction=rcNode('strong','IMPORTANTE: en el campo «Referido» debes colocar este código:',referral);instruction.style.cssText='display:block;line-height:1.6';
   const code=rcNode('code','qGBBx3Cz',referral);code.style.cssText='display:block;font-size:clamp(24px,6vw,32px);font-weight:700;letter-spacing:2px;color:#c7d8ff;margin-top:12px;user-select:all;overflow-wrap:anywhere';
   rcNode('p','Cópialo exactamente, respetando las mayúsculas y minúsculas.',referral);
  }else{
   const frame=rcNode('iframe',undefined,section);frame.src=url;frame.title=titles[i];frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allow='encrypted-media; fullscreen; picture-in-picture';frame.allowFullscreen=true;frame.style.cssText='width:100%;aspect-ratio:16/9;border:0;border-radius:8px';
  }
  const a=rcNode('a',i===4?'Crear mi cuenta en el broker ↗':'Abrir video',section);a.href=i===4?url:url.replace('/embed/','/watch?v=');a.target='_blank';a.rel='noopener noreferrer';a.style.cssText=i===4?'display:block;box-sizing:border-box;width:100%;text-align:center;background:#aac2ff;color:#101c30;padding:15px 18px;border-radius:8px;font-weight:700;text-decoration:none;margin:16px 0;line-height:1.5':'display:block;color:#aac2ff;margin:12px 0';
  const label=rcNode('label',undefined,section),check=rcNode('input',undefined,label);check.type='checkbox';check.checked=!!state[field];label.append(document.createTextNode(i===4?' Ya completé mi registro':' Ya revisé este video'));
  const msg=rcNode('p','',section);msg.setAttribute('role','status');
  check.onchange=async()=>{check.disabled=true;const value=check.checked;const {error}=await db.from('rc_onboarding').update({[field]:value}).eq('user_id',user.id);if(error){check.checked=!value;msg.textContent='No se pudo guardar tu progreso.';}else{state[field]=value;msg.textContent='Progreso guardado.';}check.disabled=false;};
 });
 const details=rcNode('details',undefined,box);details.style.marginTop='24px';rcNode('summary','Consultar contrato y aceptación',details);rcReceipt(details,receipt);rcContract(details);
}
window.rcOnboarding=async function(cli,db){
 const {data:u,error:ue}=await db.auth.getUser();if(ue||!u.user)throw new Error('Tu sesión venció.');
 const hash=new URLSearchParams(location.hash.slice(1));
 if(window.rcNeedsPassword||['invite','recovery'].includes(hash.get('type'))||sessionStorage.getItem('rcSetPassword')==='1'){
  sessionStorage.setItem('rcSetPassword','1');await rcPassword(db);sessionStorage.removeItem('rcSetPassword');window.rcNeedsPassword=false;history.replaceState(null,'',location.pathname);
 }
 const {data:receipt,error}=await db.from('rc_contract_acceptances').select('*').eq('user_id',u.user.id).eq('terms_version',RC_CONFIG.termsVersion).maybeSingle();
 if(error)throw new Error('No se pudo verificar tu aceptación del contrato. Contacta con RC Capital.');
 if(!receipt||receipt.contract_sha256!==RC_CONFIG.termsSha256){await rcShowContract(cli,db,u.user);return false;}
 const button=document.getElementById('rcResourcesButton');if(button)button.onclick=()=>rcShowResources(db,u.user,receipt);
 if(sessionStorage.getItem('rcOpenResources')==='1'){sessionStorage.removeItem('rcOpenResources');await rcShowResources(db,u.user,receipt);}
 return true;
};
function rcPassword(db){return new Promise(resolve=>{
 const box=document.createElement('div');box.style.cssText='position:fixed;inset:0;z-index:10000;background:#070b13;color:white;display:grid;place-items:center;font:16px system-ui;padding:24px';
 box.innerHTML='<form style="width:min(420px,100%)"><h1>Crea tu contraseña</h1><label>Nueva contraseña<input type="password" name="password" required minlength="12" autocomplete="new-password" style="display:block;width:100%;padding:14px;box-sizing:border-box;margin:16px 0"></label><label>Repite tu contraseña<input type="password" name="confirm" required minlength="12" autocomplete="new-password" style="display:block;width:100%;padding:14px;box-sizing:border-box;margin:16px 0"></label><button style="padding:14px">Guardar contraseña</button><p role="status"></p></form>';
 document.body.append(box);box.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=e.target,button=f.querySelector('button'),d=new FormData(f);if(d.get('password')!==d.get('confirm')){f.querySelector('p').textContent='Las contraseñas deben coincidir.';return;}button.disabled=true;const {error}=await db.auth.updateUser({password:d.get('password')});if(error){f.querySelector('p').textContent=error.message;button.disabled=false;}else{box.remove();resolve();}};
});}
