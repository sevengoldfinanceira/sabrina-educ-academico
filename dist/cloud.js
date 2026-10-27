(()=>{
  const account=document.querySelector('.account'),dialog=document.querySelector('#cloud-dialog'),form=document.querySelector('#cloud-form');
  const message=document.querySelector('#cloud-message'),logout=document.querySelector('#cloud-logout'),dot=account?.querySelector('.local-dot');
  const closeButton=document.querySelector('#close-cloud'),cancelButton=document.querySelector('#cancel-cloud'),loginButton=document.querySelector('#cloud-login');
  dialog.querySelector('.eyebrow').textContent='ACESSO RESTRITO';dialog.querySelector('h2').textContent='Entrar no sistema';dialog.querySelector('.modal-description').textContent='Informe seu e-mail e senha para acessar o painel.';
  let client,user,pending,timer,saving=false;
  const label=text=>{if(account)account.childNodes.forEach(n=>{if(n.nodeType===Node.TEXT_NODE&&n.textContent.trim())n.textContent=` ${text} `})};
  const notice=(text,error=false)=>{message.textContent=text;message.classList.toggle('error',error)};
  const status=online=>{dot?.classList.toggle('online',online);label(online?'Sincronizado':'Minha conta')};
  function unlock(){document.body.classList.remove('auth-pending','auth-required');if(dialog.open)dialog.close()}
  function lock(text=''){document.body.classList.remove('auth-pending');document.body.classList.add('auth-required');notice(text);logout.hidden=true;form.elements.email.closest('label').hidden=false;form.elements.password.closest('label').hidden=false;loginButton.hidden=false;closeButton.hidden=true;cancelButton.hidden=true;if(!dialog.open)dialog.showModal();setTimeout(()=>form.elements.email.focus(),0)}
  function openAccount(){if(!user)return lock();notice(`Conectado como ${user.email}. Os dados estão sendo salvos automaticamente.`);logout.hidden=false;form.elements.email.closest('label').hidden=true;form.elements.password.closest('label').hidden=true;loginButton.hidden=true;closeButton.hidden=false;cancelButton.hidden=false;if(!dialog.open)dialog.showModal()}
  async function saveNow(){if(!user||saving||!pending)return;const data=pending;pending=null;saving=true;const {error}=await client.from('app_state').upsert({user_id:user.id,data,updated_at:data.updatedAt||new Date().toISOString()});saving=false;if(error){console.error(error);status(false)}else status(true);if(pending)setTimeout(saveNow,250)}
  async function synchronize(){if(!user)return;const {data,error}=await client.from('app_state').select('data,updated_at').eq('user_id',user.id).maybeSingle();if(error){notice('A tabela ainda não está pronta. Execute o arquivo supabase-setup.sql no SQL Editor.',true);status(false);unlock();return}const local=window.getEducaState?.();if(!data){pending=local;await saveNow()}else{const remote=data.data,remoteTime=Date.parse(remote?.updatedAt||data.updated_at||0),localTime=Date.parse(local?.updatedAt||0);if(remoteTime>=localTime)window.applyEducaCloudState?.(remote);else{pending=local;await saveNow()}}status(true);unlock()}
  window.EducaCloud={save(data){pending=data;clearTimeout(timer);timer=setTimeout(saveNow,700)}};
  if(!account||!dialog||!form)return;
  account.classList.add('cloud-account');account.setAttribute('role','button');account.tabIndex=0;account.title='Abrir minha conta';account.onclick=openAccount;account.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openAccount()}};
  closeButton.onclick=cancelButton.onclick=()=>{if(user)dialog.close()};
  dialog.addEventListener('cancel',e=>{if(!user)e.preventDefault()});
  form.onsubmit=async e=>{e.preventDefault();notice('Entrando…');loginButton.disabled=true;const {data,error}=await client.auth.signInWithPassword({email:form.elements.email.value.trim(),password:form.elements.password.value});loginButton.disabled=false;if(error){notice('Login ou senha incorretos.',true);form.elements.password.select();return}user=data.user;await synchronize()};
  logout.onclick=async()=>{await client.auth.signOut();user=null;status(false);form.reset();lock('Você saiu do sistema.')};
  try{const cfg=window.SUPABASE_CONFIG;if(!window.supabase||!cfg?.url||!cfg?.publishableKey)throw Error('Configuração ausente');client=window.supabase.createClient(cfg.url,cfg.publishableKey);client.auth.getSession().then(async({data})=>{user=data.session?.user||null;if(user)await synchronize();else{status(false);lock()}});client.auth.onAuthStateChange((event,session)=>{user=session?.user||null;if(event==='SIGNED_OUT'){status(false);lock()}})}catch(error){console.error(error);lock('Não foi possível conectar ao servidor. Verifique sua internet e recarregue a página.')}
})();
