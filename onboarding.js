window.rcNeedsPassword=['invite','recovery'].includes(new URLSearchParams(location.hash.slice(1)).get('type'));
window.rcOnboarding=async function(cli,db){
 const {data:u,error:ue}=await db.auth.getUser();if(ue||!u.user)throw new Error('Tu sesión venció.');
 const hash=new URLSearchParams(location.hash.slice(1));
 if(window.rcNeedsPassword||['invite','recovery'].includes(hash.get('type'))||sessionStorage.getItem('rcSetPassword')==='1'){
 sessionStorage.setItem('rcSetPassword','1');await rcPassword(db);sessionStorage.removeItem('rcSetPassword');window.rcNeedsPassword=false;history.replaceState(null,'',location.pathname);}
 const {data:row,error}=await db.from('rc_onboarding').select('*').eq('user_id',u.user.id).maybeSingle();if(error)throw new Error('No se pudo cargar tu configuración.');
 if(row?.completed_at&&row.terms_version===RC_CONFIG.termsVersion)return true;
 const state=row||{user_id:u.user.id};
 const overlay=document.createElement('div');overlay.id='rcOnboarding';overlay.style.cssText='position:fixed;inset:0;z-index:9999;background:#070b13;color:#f3f5f8;overflow:auto;padding:32px 20px;font:16px system-ui';
 overlay.innerHTML=`<div style="max-width:680px;margin:auto"><p style="color:#8b9bb7;letter-spacing:2px">RC CAPITAL</p><h1>Bienvenido. Preparemos tu cuenta.</h1><p>Completa estos pasos para acceder a tu panel.</p><progress style="width:100%;height:12px" max="6" value="0"></progress><div id="rcSteps"></div><button id="rcFinish" style="padding:14px;margin-top:24px">Entrar a mi dashboard</button><button id="rcExit" style="padding:14px;margin:12px">Salir</button><p id="rcMsg" role="status"></p></div>`;
 document.body.append(overlay);const steps=overlay.querySelector('#rcSteps');
 const fields=['video_registro','video_deposito','video_activacion','video_retiros','broker_registered'];
 const labels=['Registro en el broker','Realizar un depósito','Activar la gestión','Cómo solicitar un retiro','Ya completé mi registro en el broker'];
 const refresh=()=>{const accepted=!!state.terms_accepted_at&&state.terms_version===RC_CONFIG.termsVersion;overlay.querySelector('progress').value=fields.filter(k=>state[k]).length+Number(accepted);overlay.querySelector('#rcFinish').disabled=!(accepted&&fields.every(k=>state[k]));};
 const persist=async()=>{const {error}=await db.from('rc_onboarding').upsert(state,{onConflict:'user_id'});if(error)throw error;};
 const terms=document.createElement('section');terms.style.cssText='padding:20px 0;border-bottom:1px solid #273044';
 const th=document.createElement('h3');th.textContent='1. Términos y condiciones';terms.append(th);
 if(RC_CONFIG.termsUrl){const a=document.createElement('a');a.href=RC_CONFIG.termsUrl;a.target='_blank';a.rel='noopener';a.textContent='Leer términos del servicio';terms.append(a);
 const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=!!state.terms_accepted_at&&state.terms_version===RC_CONFIG.termsVersion;
 check.onchange=async()=>{check.disabled=true;const prev={...state};state.terms_version=check.checked?RC_CONFIG.termsVersion:null;state.terms_accepted_at=check.checked?new Date().toISOString():null;try{await persist();}catch(e){Object.assign(state,prev);check.checked=!check.checked;overlay.querySelector('#rcMsg').textContent='No se pudo guardar. Intenta de nuevo.';}finally{check.disabled=false;refresh();}};
 label.append(check,document.createTextNode(' He leído y acepto los términos'));label.style.display='block';terms.append(label);
 }else{const p=document.createElement('p');p.textContent='Los términos todavía no están disponibles. Contacta con RC Capital para completar este paso.';terms.append(p);}steps.append(terms);
 fields.forEach((field,i)=>{const section=document.createElement('section');section.style.cssText='padding:20px 0;border-bottom:1px solid #273044';const h=document.createElement('h3');h.textContent=(i+2)+'. '+labels[i];section.append(h);
 const link=i===4?RC_CONFIG.brokerUrl:RC_CONFIG.videos[['registro','deposito','activacion','retiros'][i]];
 if(link){const a=document.createElement('a');a.href=link;a.target='_blank';a.rel='noopener';a.textContent=i===4?'Abrir broker':'Ver video';section.append(a);
 const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=!!state[field];label.style.display='block';label.append(check,document.createTextNode(i===4?' Confirmo mi registro':' Ya revisé este video'));section.append(label);
 check.onchange=async()=>{check.disabled=true;const prev=state[field];state[field]=check.checked;try{await persist();}catch(e){state[field]=prev;check.checked=!!prev;overlay.querySelector('#rcMsg').textContent='No se pudo guardar. Intenta de nuevo.';}finally{check.disabled=false;refresh();}};
 }else{const p=document.createElement('p');p.textContent='Este recurso todavía no está disponible.';section.append(p);}steps.append(section);});
 overlay.querySelector('#rcExit').onclick=async()=>{await db.auth.signOut();location.reload();};
 overlay.querySelector('#rcFinish').onclick=async()=>{const b=overlay.querySelector('#rcFinish');b.disabled=true;state.completed_at=new Date().toISOString();try{await persist();location.reload();}catch(e){state.completed_at=null;overlay.querySelector('#rcMsg').textContent='No se pudo guardar tu progreso.';refresh();}};refresh();return false;
};
function rcPassword(db){return new Promise(resolve=>{
 const box=document.createElement('div');box.style.cssText='position:fixed;inset:0;z-index:10000;background:#070b13;color:white;display:grid;place-items:center;font:16px system-ui;padding:24px';
 box.innerHTML='<form style="width:min(420px,100%)"><h1>Crea tu contraseña</h1><label>Nueva contraseña<input type="password" name="password" required minlength="12" autocomplete="new-password" style="display:block;width:100%;padding:14px;box-sizing:border-box;margin:16px 0"></label><label>Repite tu contraseña<input type="password" name="confirm" required minlength="12" autocomplete="new-password" style="display:block;width:100%;padding:14px;box-sizing:border-box;margin:16px 0"></label><button style="padding:14px">Guardar contraseña</button><p role="status"></p></form>';
 document.body.append(box);box.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=e.target,button=f.querySelector('button'),d=new FormData(f);if(d.get('password')!==d.get('confirm')){f.querySelector('p').textContent='Las contraseñas deben coincidir.';return;}button.disabled=true;const {error}=await db.auth.updateUser({password:d.get('password')});if(error){f.querySelector('p').textContent=error.message;button.disabled=false;}else{box.remove();resolve();}};
});}
