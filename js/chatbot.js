/* nstmyogyoji.org — Chatbot widget (front-end) with Online hours + better UX */
const CHAT_FEED = typeof FEED_BASE !== "undefined" ? FEED_BASE : "";

// Simple temple "online" hours (America/Chicago).
// Online when staff likely available: Mon–Fri 9:00–17:00, Sat 9:00–13:00. Edit as needed.
const ONLINE_HOURS = {
  0: [], // Sun
  1: [[9,17]], // Mon
  2: [[9,17]],
  3: [[9,17]],
  4: [[9,17]],
  5: [[9,17]],
  6: [[9,13]]  // Sat
};

(function(){
  if (!CHAT_FEED){ console.warn("Chatbot disabled: FEED_BASE not set."); return; }

  const session = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
  let panel, body, input, emailField, topicSel, fab;
  let nameField, phoneField, timeField, callBtn;
  let statusDot, statusText;

  function localNowChicago(){
    // America/Chicago offset-aware using Intl
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', { timeZone:'America/Chicago', hour:'2-digit', hour12:false, weekday:'short' }).formatToParts(now);
    const hour = parseInt(new Intl.DateTimeFormat('en-US',{ timeZone:'America/Chicago', hour:'2-digit', hour12:false}).format(now),10);
    const weekday = new Intl.DateTimeFormat('en-US',{ timeZone:'America/Chicago', weekday:'short'}).format(now);
    const map = {Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
    return {hour, dow: map[weekday]};
  }
  function isOnline(){
    const {hour, dow} = localNowChicago();
    const ranges = ONLINE_HOURS[dow] || [];
    return ranges.some(([h1,h2]) => hour>=h1 && hour<h2);
  }

  function setStatus(){
    const online = isOnline();
    statusDot.className = 'status-dot ' + (online ? 'status-online':'status-offline');
    statusText.textContent = online ? 'Online' : 'Offline — we’ll email you back';
  }

  function el(tag, cls, html){ const e=document.createElement(tag); if(cls) e.className=cls; if(html) e.innerHTML=html; return e; }
  function row(role, text){
    const r = el('div', 'chat-row '+role);
    const av = el('div','avatar', role==='user'?'🙂':'寺');
    const bubble = el('div','bubble'); bubble.textContent = text;
    const time = el('div','meta', new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));

    if (role==='user'){ r.appendChild(el('div',''));
      r.appendChild(el('div','', '')); r.appendChild(bubble); r.appendChild(av);
    } else {
      r.appendChild(av); r.appendChild(bubble);
    }
    r.appendChild(time);
    body.appendChild(r);
    body.scrollTop = body.scrollHeight;
  }
  function typing(on=true){
    const id='typing';
    if (on){
      if (document.getElementById(id)) return;
      const r = el('div','chat-row bot'); r.id=id;
      const av = el('div','avatar','寺');
      const b = el('div','bubble'); b.innerHTML = `<span class="typing"><span></span><span></span><span></span></span>`;
      r.appendChild(av); r.appendChild(b); body.appendChild(r); body.scrollTop = body.scrollHeight;
    } else {
      const n = document.getElementById(id); if (n) n.remove();
    }
  }

  function buildUI(){
    // FAB
    fab = el('button','chat-fab','💬'); fab.setAttribute('aria-label','Open chat'); fab.setAttribute('aria-expanded','false');
    fab.addEventListener('click', togglePanel);
    document.body.appendChild(fab);

    // Panel
    panel = el('div','chat-panel'); panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','false'); panel.setAttribute('aria-label','Chat with Myogyoji Temple');
    const head = el('div','chat-head');
    const titleWrap = el('div','');
      const title = el('div','', 'Chat with Myogyoji Temple');
      const sub   = el('div','chat-sub'); sub.innerHTML = `Ask about visiting, schedule, or basics. For times see <a href="/calendar.html">Calendar</a> & <a href="/plan-visit.html">Plan a Visit</a>.`;
      titleWrap.appendChild(title); titleWrap.appendChild(sub);
    const statusWrap = el('div',''); statusDot = el('div','status-dot'); statusText = el('span','chat-sub'); statusWrap.style.display='flex'; statusWrap.style.alignItems='center'; statusWrap.style.gap='8px'; statusWrap.appendChild(statusDot); statusWrap.appendChild(statusText);
    head.appendChild(titleWrap); head.appendChild(statusWrap);

    body = el('div','chat-body');

    // Controls
    const foot = el('div','chat-foot');
    emailField = el('input'); emailField.type='email'; emailField.placeholder='Your email (optional)';
    topicSel = el('select'); ["General","Visit / Directions","Intro Meeting","Ceremony","Schedule / Calendar","Other"].forEach(t=>{const o=document.createElement('option');o.textContent=t;o.value=t;topicSel.appendChild(o);});
    input = el('input'); input.type='text'; input.placeholder='Type your question…'; input.setAttribute('aria-label','Message');
    const send = el('button','cta'); send.textContent='Send';
    const controls = el('div','chat-controls'); controls.appendChild(input); controls.appendChild(send);

    // Handoff block
    const hand = el('div','small','Prefer a call? Enter details below and request a call.');
    nameField  = el('input'); nameField.type='text'; nameField.placeholder='Your name';
    phoneField = el('input'); phoneField.type='tel';  phoneField.placeholder='Phone number';
    timeField  = el('input'); timeField.type='text';  timeField.placeholder='Best time (e.g., today after 6pm)';
    callBtn = el('button','cta'); callBtn.textContent='Request a Call';

    send.addEventListener('click', ()=> sendMsg());
    input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') sendMsg(); });
    callBtn.addEventListener('click', requestCall);

    foot.appendChild(emailField);
    foot.appendChild(topicSel);
    foot.appendChild(controls);
    foot.appendChild(hand);
    foot.appendChild(nameField);
    foot.appendChild(phoneField);
    foot.appendChild(timeField);
    foot.appendChild(callBtn);

    panel.appendChild(head); panel.appendChild(body); panel.appendChild(foot);
    document.body.appendChild(panel);

    setStatus();
    row('bot', 'Welcome! How can we help today?');
  }

  function togglePanel(){
    const open = panel.style.display==='block';
    panel.style.display = open ? 'none' : 'block';
    fab.setAttribute('aria-expanded', String(!open));
    if (!open) input?.focus();
    setStatus();
  }

  async function sendMsg(){
    const msg = input.value.trim(); if(!msg) return;
    row('user', msg); input.value='';
    typing(true);
    try{
      const r = await fetch(CHAT_FEED + "?fn=chat", {
        method:"POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ message: msg, session, email: emailField.value||"", topic: topicSel.value||"General" })
      });
      const j = await r.json();
      typing(false);
      row('bot', j.ok ? j.reply : "Sorry—couldn’t send that just now.");
    }catch(e){
      typing(false);
      row('bot', "Network error. Please try again.");
    }
  }

  async function requestCall(){
    const name = nameField.value.trim();
    const phone= phoneField.value.trim();
    const time = timeField.value.trim() || "Soonest available";
    if (!phone){ row('bot',"Please enter a phone number so we can call you back."); return; }
    row('user', `CALL REQUEST → ${topicSel.value} — ${time} — ${phone}`);
    typing(true);
    try{
      const r = await fetch(CHAT_FEED + "?fn=escalate", {
        method:"POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          name, phone, time,
          topic: topicSel.value||"General",
          email: emailField.value||"",
          session
        })
      });
      const j = await r.json();
      typing(false);
      row('bot', j.ok ? j.msg : "Sorry—couldn’t send the call request just now.");
      if (j.ok){ nameField.value=""; phoneField.value=""; }
    }catch(e){
      typing(false);
      row('bot', "Network error. Please try again.");
    }
  }

  document.addEventListener('DOMContentLoaded', buildUI);
})();
