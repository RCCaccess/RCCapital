window.rcNeedsPassword=['invite','recovery'].includes(new URLSearchParams(location.hash.slice(1)).get('type'));
const rcResourceFields=['video_registro','video_deposito','video_activacion','video_retiros','broker_registered'];
function rcNode(tag,text,parent){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(parent)parent.append(node);return node;}
function rcStyle(){if(document.getElementById('rcOnboardingStyle'))return;const link=rcNode('link');link.id='rcOnboardingStyle';link.rel='stylesheet';link.href='onboarding.css';document.head.append(link);}
function rcCloseOverlay(overlay){if(!overlay?.isConnected)return;document.body.style.overflow=overlay._previousOverflow;overlay.remove();overlay._previousFocus?.focus?.();}
function rcOverlay(title){
 rcStyle();rcCloseOverlay(document.getElementById('rcOnboarding'));
 const overlay=rcNode('div');overlay.id='rcOnboarding';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','rcOnboardingTitle');overlay._previousOverflow=document.body.style.overflow;overlay._previousFocus=document.activeElement;document.body.style.overflow='hidden';
 rcNode('div',undefined,overlay).className='rc-background';
 const box=rcNode('div',undefined,overlay);box.className='rc-shell';
 rcNode('p','RC CAPITAL / TU PRÓXIMO CAPÍTULO',box).className='rc-kicker';
 const heading=rcNode('h1',title,box);heading.id='rcOnboardingTitle';heading.className='rc-title';heading.tabIndex=-1;
 overlay.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const els=[...overlay.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),summary')].filter(n=>n.getClientRects().length);if(!els.length)return;const first=els[0],last=els.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===heading)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
 document.body.append(overlay);heading.focus();return {overlay,box,heading};
}
function rcButton(text,parent,primary=false){const b=rcNode('button',text,parent);b.type='button';b.className='rc-btn'+(primary?' primary':'');return b;}
function rcText(text,parent){const p=rcNode('p',text,parent);p.className='rc-intro';return p;}
function rcContractIdentity(host,identity){
 const root=host?.shadowRoot;if(!root)return;
 const value=identity||{};
 const name=root.querySelector('[data-rc-investor-name]');if(name)name.textContent=String(value.full_name||'el inversor identificado en este portal').trim();
 const type=root.querySelector('[data-rc-document-type]');if(type)type.textContent=value.document_type==='pasaporte'?'pasaporte':value.document_type==='cedula'?'cédula':'documento de identidad';
 const number=root.querySelector('[data-rc-document-number]');if(number)number.textContent=String(value.document_number||'registrado al aceptar').trim();
 const title=root.querySelector('[data-rc-stamp-title]'),description=root.querySelector('[data-rc-stamp-description]'),details=root.querySelector('[data-rc-stamp-details]');
 if(!title||!description||!details)return;
 details.replaceChildren();details.hidden=!value.accepted_at;
 if(!value.accepted_at){title.textContent='Pendiente de aceptación';description.textContent='Tu constancia aparecerá aquí cuando aceptes el contrato desde el formulario.';return;}
 title.textContent='✓ Términos y condiciones aceptados';description.textContent='Aceptación registrada desde la cuenta del inversor. Los datos de esta constancia no pueden modificarse.';
 const date=new Date(value.accepted_at).toLocaleString('es-ES',{timeZone:'America/Panama',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})+' · Panamá (UTC-05:00)';
 for(const [label,text]of[['Inversor',value.full_name],['Documento',(value.document_type==='pasaporte'?'Pasaporte: ':'Cédula: ')+value.document_number],['Aceptado el',date],['Versión',value.terms_version]]){rcNode('dt',label,details);rcNode('dd',String(text),details);}
}
async function rcContract(parent,identity=null){
 const host=rcNode('div',undefined,parent);host.className='rc-contract-host';rcNode('p','Preparando tu contrato…',host);
 try{
  if(!RC_CONFIG.termsDisplayUrl)throw new Error('Contrato no disponible');
  const response=await fetch(RC_CONFIG.termsDisplayUrl);if(!response.ok)throw new Error('Contrato no disponible');
  const parsed=new DOMParser().parseFromString(await response.text(),'text/html'),contract=parsed.querySelector('main.contract'),style=parsed.querySelector('style');
  if(!contract||!style)throw new Error('Contrato incompleto');
  if(!host.isConnected)return false;
  contract.querySelectorAll('script,iframe,object,embed').forEach(n=>n.remove());host.replaceChildren();
  const shadow=host.attachShadow({mode:'open'});shadow.append(style.cloneNode(true),contract.cloneNode(true));rcContractIdentity(host,identity);return true;
 }catch(e){if(host.isConnected){host.replaceChildren();rcNode('p','No pudimos cargar el contrato. Recarga la página para revisarlo antes de aceptar.',host);}return false;}
}
function rcReceipt(parent,receipt){
 const box=rcNode('section',undefined,parent);box.className='rc-card rc-receipt';rcNode('h3','Tu aceptación está registrada',box);rcNode('p',receipt.full_name,box);rcNode('p',(receipt.document_type==='cedula'?'Cédula: ':'Pasaporte: ')+receipt.document_number,box);
 rcNode('p','Aceptado el '+new Date(receipt.accepted_at).toLocaleString('es-ES',{timeZone:'America/Panama'})+' · Versión '+receipt.terms_version,box);rcNode('p','Estos datos quedan protegidos y no pueden modificarse.',box);
}
async function rcShowContract(cli,db,user){
 const {box}=rcOverlay('Empecemos con claridad.');
 rcText('Antes de dar el siguiente paso, conoce cómo trabajamos, las condiciones del servicio y los riesgos. Tómate el tiempo que necesites para leerlo.',box);
 const identity={full_name:cli.nombre||'',document_type:'cedula',document_number:''};
 const ready=rcContract(box,identity);
 const form=rcNode('form',undefined,box);form.className='rc-card';rcNode('h2','Tu identidad, tu aceptación',form);rcText('Escribe tus datos tal como aparecen en tu documento. Al aceptar quedarán registrados junto con la versión del contrato.',form);
 const fields=rcNode('div',undefined,form);fields.className='rc-form-grid';
 const nameLabel=rcNode('label','Nombre completo',fields);nameLabel.className='rc-field full';const name=rcNode('input',undefined,nameLabel);name.required=true;name.minLength=3;name.maxLength=150;name.autocomplete='name';name.name='full_name';name.value=cli.nombre||'';
 const typeLabel=rcNode('label','Tipo de documento',fields);typeLabel.className='rc-field';const type=rcNode('select',undefined,typeLabel);type.name='document_type';for(const [v,t]of[['cedula','Cédula'],['pasaporte','Pasaporte']])rcNode('option',t,type).value=v;
 const idLabel=rcNode('label','Número de documento',fields);idLabel.className='rc-field';const id=rcNode('input',undefined,idLabel);id.required=true;id.minLength=4;id.maxLength=40;id.autocomplete='off';id.name='document_number';
 const syncIdentity=()=>{identity.full_name=name.value.trim();identity.document_type=type.value;identity.document_number=id.value.trim();rcContractIdentity(box.querySelector('.rc-contract-host'),identity);};
 for(const field of [name,type,id])field.addEventListener(field===type?'change':'input',syncIdentity);
 const consentLabel=rcNode('label',undefined,form);consentLabel.className='rc-check';const consent=rcNode('input',undefined,consentLabel);consent.type='checkbox';consent.required=true;rcNode('span','He leído y acepto la totalidad del contrato, comprendo los riesgos y confirmo que mis datos son correctos.',consentLabel);
 const message=rcNode('p','Cargando el contrato…',form);message.className='rc-status';message.setAttribute('role','status');
 const actions=rcNode('div',undefined,form);actions.className='rc-actions';const accept=rcButton('Aceptar y comenzar →',actions,true);accept.type='submit';accept.disabled=true;
 rcButton('Cerrar sesión',actions).onclick=async()=>{await db.auth.signOut();location.reload();};
 let loaded=false;ready.then(ok=>{loaded=ok;accept.disabled=!ok;message.textContent=ok?'':'Carga el contrato antes de continuar.';});
 form.onsubmit=async e=>{e.preventDefault();if(!loaded||!form.reportValidity())return;accept.disabled=true;message.textContent='Registrando tu aceptación…';
  try{const {data,error}=await db.rpc('rc_accept_contract',{p_full_name:name.value.trim(),p_document_type:type.value,p_document_number:id.value.trim(),p_version:RC_CONFIG.termsVersion});if(error||!data)throw new Error('No se pudo registrar');sessionStorage.setItem('rcOpenResources','1');location.reload();}
  catch(e){message.textContent='No pudimos guardar tu aceptación. Tus datos siguen aquí; vuelve a intentarlo.';message.classList.add('error');accept.disabled=false;}
 };
}
async function rcShowResources(db,user,receipt){
 const {overlay,box,heading}=rcOverlay('Ya eres parte. Vamos paso a paso.');
 const top=rcNode('div',undefined,box);top.className='rc-guide-top';rcText('Tu espacio está listo. Esta guía te acompaña desde el registro hasta la gestión de tu cuenta. Puedes regresar cuando quieras.',top);rcButton('Explorar mi dashboard →',top,true).onclick=()=>rcCloseOverlay(overlay);
 const {data:row,error}=await db.from('rc_onboarding').select('*').eq('user_id',user.id).maybeSingle();if(error){rcText('No pudimos cargar tu progreso. Vuelve a abrir la guía para intentarlo.',box);return;}
 const state=row||{},steps=[
  {key:'registro',duration:'50 s',field:'video_registro',title:'Crea tu cuenta',desc:'Conoce cómo registrarte en el broker y completar tus datos para empezar.'},
  {key:'deposito',duration:'40 s',field:'video_deposito',title:'Tu primer depósito',desc:'Encuentra las opciones de depósito y los pasos para añadir fondos a tu cuenta.'},
  {key:'activacion',duration:'35 s',field:'video_activacion',title:'Activa la gestión',desc:'Aprende cómo vincular tu cuenta con RC Capital y activar la gestión.'},
  {key:'retiros',duration:'35 s',field:'video_retiros',title:'Gestiona tus retiros',desc:'Conoce dónde solicitar un retiro y cómo seguir el proceso.'}
 ];
 const progress=rcNode('div',undefined,box);const track=rcNode('div',undefined,progress);track.className='rc-progress-track';track.setAttribute('role','progressbar');track.setAttribute('aria-label','Videos revisados');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','4');const fill=rcNode('div',undefined,track);fill.className='rc-progress-fill';const progressText=rcNode('p','',progress);progressText.className='rc-muted';
 const layout=rcNode('div',undefined,box);layout.className='rc-video-layout';const tabs=rcNode('div',undefined,layout);tabs.className='rc-video-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Guía de inicio');
 const stage=rcNode('section',undefined,layout);stage.className='rc-card rc-video-stage';stage.id='rcVideoPanel';stage.setAttribute('role','tabpanel');
 let current=0,saving=false;const buttons=[];
 const updateProgress=()=>{const count=steps.filter(s=>state[s.field]).length;fill.style.width=count/4*100+'%';track.setAttribute('aria-valuenow',String(count));progressText.textContent=count+' de 4 videos revisados · Avanza a tu ritmo';buttons.forEach((b,i)=>b.querySelector('small').textContent=state[steps[i].field]?'✓ Revisado':'Paso '+(i+1)+' · '+steps[i].duration);};
 async function saveProgress(field,value,msg){if(saving)return false;saving=true;try{const {error}=await db.from('rc_onboarding').update({[field]:value}).eq('user_id',user.id);if(error)throw error;state[field]=value;updateProgress();msg.textContent='Tu progreso quedó guardado.';return true;}catch(e){msg.textContent='No se guardó el progreso. Vuelve a intentarlo.';return false;}finally{saving=false;}}
 function select(index,focus=false){
  if(saving)return;stage.querySelector('video')?.pause();current=index;stage.replaceChildren();buttons.forEach((b,i)=>{b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1;});stage.setAttribute('aria-labelledby',buttons[index].id);
  const step=steps[index];rcNode('p','PASO '+(index+1)+' / 4 · '+step.duration,stage).className='rc-kicker';rcNode('h2',step.title,stage);rcNode('p',step.desc,stage).className='rc-description';
  const player=rcNode('div',undefined,stage);player.className='rc-player';const local=RC_CONFIG.localVideos?.[step.key],url=local||RC_CONFIG.videos?.[step.key];
  if(local){const video=rcNode('video',undefined,player);video.src=local;video.poster=local.replace(/\.mp4$/i,'-poster.png');video.controls=true;video.playsInline=true;video.preload='metadata';video.setAttribute('aria-label',step.title);video.addEventListener('error',()=>{if(!player.isConnected||player.querySelector('.rc-video-error'))return;const notice=rcNode('div',undefined,player);notice.className='rc-video-error';rcNode('p','No pudimos cargar este video. Revisa tu conexión y vuelve a intentarlo.',notice);rcButton('Reintentar',notice).onclick=()=>{notice.remove();video.load();};});}
  else if(url){const frame=rcNode('iframe',undefined,player);frame.src=url;frame.title=step.title;frame.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';}
  else rcText('Este video estará disponible pronto.',player);
  const msg=rcNode('p','',stage);msg.className='rc-status';msg.setAttribute('role','status');
  const actions=rcNode('div',undefined,stage);actions.className='rc-actions';const mark=rcButton(state[step.field]?'✓ Video revisado':'Marcar como revisado',actions);mark.onclick=async()=>{mark.disabled=true;await saveProgress(step.field,!state[step.field],msg);mark.textContent=state[step.field]?'✓ Video revisado':'Marcar como revisado';mark.disabled=false;};
  if(index<3)rcButton('Siguiente paso →',actions,true).onclick=()=>select(index+1,true);else rcButton('Entrar a mi dashboard →',actions,true).onclick=()=>rcCloseOverlay(overlay);
  if(focus){buttons[index].focus();if(matchMedia('(max-width:760px)').matches)stage.scrollIntoView({block:'start',behavior:'smooth'});}
 }
 steps.forEach((step,i)=>{const b=rcButton('',tabs);b.className='rc-video-tab';b.id='rcVideoTab'+i;b.setAttribute('role','tab');b.setAttribute('aria-controls','rcVideoPanel');rcNode('span',String(i+1).padStart(2,'0'),b).className='number';const text=rcNode('span',undefined,b);rcNode('strong',step.title,text);rcNode('small','',text);b.onclick=()=>select(i);b.onkeydown=e=>{if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?3:(current+(['ArrowLeft','ArrowUp'].includes(e.key)?3:1))%4;select(next,true);}};buttons.push(b);});updateProgress();select(0);
 const broker=rcNode('section',undefined,box);broker.className='rc-card';rcNode('h2','Tu cuenta, el siguiente paso',broker);rcText('Abre el registro del broker. En el campo «Referido» debes colocar este código:',broker);rcNode('code','qGBBx3Cz',broker).className='rc-broker-code';rcNode('p','Respeta las mayúsculas y minúsculas.',broker).className='rc-muted';
 const link=rcNode('a','Crear mi cuenta en el broker ↗',broker);link.className='rc-btn primary';link.href=RC_CONFIG.brokerUrl;link.target='_blank';link.rel='noopener noreferrer';const label=rcNode('label',undefined,broker);label.className='rc-check';const check=rcNode('input',undefined,label);check.type='checkbox';check.checked=!!state.broker_registered;rcNode('span','Ya completé mi registro en el broker',label);const brokerMsg=rcNode('p','',broker);brokerMsg.className='rc-status';brokerMsg.setAttribute('role','status');check.onchange=async()=>{check.disabled=true;const ok=await saveProgress('broker_registered',check.checked,brokerMsg);if(!ok)check.checked=!!state.broker_registered;check.disabled=false;};
 const details=rcNode('details',undefined,box);details.className='rc-details';rcNode('summary','Mi contrato y constancia de aceptación',details);rcContract(details,receipt);
 const footer=rcNode('div',undefined,box);footer.className='rc-guide-footer';rcText('Todo en un lugar: tu capital, tus movimientos y tu evolución.',footer);rcButton('Abrir mi dashboard →',footer,true).onclick=()=>rcCloseOverlay(overlay);
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
 const {overlay,box,heading}=rcOverlay('Bienvenido a tu nuevo espacio.');
 const layout=rcNode('div',undefined,box);layout.className='rc-password-layout';const welcome=rcNode('div',undefined,layout);welcome.append(heading);rcText('Nos alegra tenerte aquí. Vamos a preparar tu acceso para que puedas conocer el servicio y seguir tu cuenta con claridad.',welcome);
 const steps=rcNode('div',undefined,welcome);steps.className='rc-welcome-steps';for(const [n,text]of[['01','Crea tu acceso personal'],['02','Conoce y acepta las condiciones'],['03','Descubre tu guía y tu dashboard']]){const row=rcNode('div',undefined,steps);rcNode('span',n,row);row.append(document.createTextNode(text));}
 const form=rcNode('form',undefined,layout);form.className='rc-card rc-password-form';rcNode('h2','Un acceso solo para ti',form);rcText('Elige una contraseña de al menos 12 caracteres. Guárdala en un lugar seguro.',form);
 function passwordField(label,name){const field=rcNode('label',label,form);field.className='rc-field';const wrap=rcNode('div',undefined,field);wrap.className='rc-password-wrap';const input=rcNode('input',undefined,wrap);input.type='password';input.name=name;input.id='rcPassword_'+name;input.required=true;input.minLength=12;input.autocomplete='new-password';const toggle=rcButton('Mostrar',wrap);toggle.className='rc-password-toggle';toggle.setAttribute('aria-controls',input.id);toggle.setAttribute('aria-pressed','false');toggle.setAttribute('aria-label','Mostrar '+label.toLowerCase());toggle.onclick=e=>{e.preventDefault();const show=input.type==='password';input.type=show?'text':'password';toggle.textContent=show?'Ocultar':'Mostrar';toggle.setAttribute('aria-pressed',String(show));toggle.setAttribute('aria-label',(show?'Ocultar ':'Mostrar ')+label.toLowerCase());};return input;}
 const password=passwordField('Tu contraseña','password'),confirm=passwordField('Confirma tu contraseña','confirm');const submit=rcButton('Crear mi acceso y continuar →',form,true);submit.type='submit';const msg=rcNode('p','',form);msg.className='rc-status';msg.setAttribute('role','status');
 form.onsubmit=async e=>{e.preventDefault();if(!form.reportValidity())return;if(password.value!==confirm.value){msg.textContent='Las contraseñas no coinciden. Revísalas para continuar.';msg.classList.add('error');confirm.focus();return;}submit.disabled=true;msg.classList.remove('error');msg.textContent='Preparando tu acceso…';try{const {error}=await db.auth.updateUser({password:password.value});if(error)throw error;password.value='';confirm.value='';rcCloseOverlay(overlay);resolve();}catch(e){msg.textContent='No pudimos guardar la contraseña. Revisa tu conexión y vuelve a intentarlo.';msg.classList.add('error');submit.disabled=false;}};
});}
