/* nstmyogyoji.org — front-end content loader + API wiring
   - Fetches live feed from Apps Script web app to get:
     • About page Doc ID
     • latest Calendar PDF (from /calendar_pdfs)
     • latest Monthly Passage PDF (from /passage_pdfs)
   - Renders Google Doc iframes + Drive PDF previews
   - Submits Contact form to Apps Script
   - Optional “Nearest Member” lookup (by ZIP)
*/

const FEED_BASE = "https://script.google.com/macros/s/AKfycbzkKbde7sSmTZjT2py5GsBcFlkUvqOjQqp6gFxWL6cq0F7GC-FigPr6qvb_ZldqJs2RdQ/exec"; // <-- paste the Web App URL

(function(){
  function sel(q){ return document.querySelector(q); }

  async function fetchFeed(){
    const r = await fetch(FEED_BASE + "?fn=feed", {cache:"no-cache"});
    return r.json();
  }
  function gdocEmbedUrl(docId){ return `https://docs.google.com/document/d/${docId}/pub?embedded=true`; }
  function drivePreviewUrl(fileId){ return `https://drive.google.com/file/d/${fileId}/preview`; }

  function injectIFrame(el, src, title){
    const iframe = document.createElement('iframe');
    iframe.className = 'gdoc-frame';
    iframe.title = title || 'Embedded Content';
    iframe.loading = 'lazy';
    iframe.src = src;
    el.replaceChildren(iframe);
  }

  async function init(){
    const feed = await fetchFeed().catch(()=>null);
    if (feed && feed.ok){
      // About page block
      const aboutBlock = sel('[data-feed="about-main"]');
      if (aboutBlock && feed.docs && feed.docs.aboutMain){
        injectIFrame(aboutBlock, gdocEmbedUrl(feed.docs.aboutMain), "About — Myogyoji");
      }
      // Latest Calendar PDF
      const calBlock = sel('[data-feed="calendar-latest"]');
      if (calBlock && feed.calendar && feed.calendar.id){
        injectIFrame(calBlock, drivePreviewUrl(feed.calendar.id), feed.calendar.name);
      }
      // Latest Monthly Passage PDF
      const passageBlock = sel('[data-feed="passage-latest"]');
      if (passageBlock && feed.passage && feed.passage.id){
        injectIFrame(passageBlock, drivePreviewUrl(feed.passage.id), feed.passage.name);
      }
    }

    // Contact form → Web App
    const form = sel('form[data-contact="true"]');
    if (form){
      form.addEventListener('submit', async (ev)=>{
        ev.preventDefault();
        const fd = new FormData(form);
        const payload = {
          name: fd.get('name')||'',
          email: fd.get('email')||'',
          message: fd.get('message')||'',
          source: 'web'
        };
        try{
          const r = await fetch(FEED_BASE + "?fn=contact", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify(payload)
          });
          const j = await r.json();
          if (j.ok){ alert("Thank you! We received your message."); form.reset(); }
          else { alert("Sorry—could not send. Please call or email the temple."); }
        }catch(e){ alert("Network error. Please try again."); }
      });
    }

    // Optional: Nearest Member lookup (by ZIP or first 3)
    const nearBtn = sel('[data-nearby-btn]');
    if (nearBtn){
      nearBtn.addEventListener('click', async ()=>{
        const zip = (sel('#zip')||{}).value||'';
        try{
          const r = await fetch(FEED_BASE + "?fn=nearest&zip="+encodeURIComponent(zip));
          const j = await r.json();
          const out = sel('[data-nearby-out]');
          if (j.ok){
            out.textContent = j.count ? JSON.stringify(j.matches, null, 2) : "No nearby matches yet.";
          } else out.textContent = "Error.";
        }catch(e){ (sel('[data-nearby-out]')||{}).textContent="Network error."; }
      });
    }
  }

  // JSON-LD helper (pages can call: nstSite.injectJSONLD({...}) )
  function injectJSONLD(obj){
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.text = JSON.stringify(obj);
    document.head.appendChild(s);
  }
  window.nstSite = { injectJSONLD };

  document.addEventListener('DOMContentLoaded', init);
})();

/* Chatbot widget */
.chat-fab{position:fixed; right:18px; bottom:18px; width:56px; height:56px; border-radius:50%; border:0; background:var(--brand); color:#fff; font-size:24px; box-shadow:0 8px 24px rgba(0,0,0,.2); cursor:pointer}
.chat-fab:focus{outline:3px solid color-mix(in srgb, var(--focus) 60%, transparent)}

.chat-panel{position:fixed; right:18px; bottom:84px; width:360px; max-width:calc(100vw - 24px); background:var(--surface); border:1px solid var(--border); border-radius:12px; box-shadow:0 20px 40px rgba(0,0,0,.25); display:none; overflow:hidden}
.chat-head{padding:12px 14px; background:color-mix(in srgb, var(--brand) 8%, transparent); border-bottom:1px solid var(--border); font-weight:700}
.chat-body{height:360px; overflow:auto; padding:12px}
.chat-msg{margin:8px 0; display:flex; gap:8px}
.chat-msg .bubble{padding:10px 12px; border-radius:12px; border:1px solid var(--border); max-width:80%}
.chat-msg.user{justify-content:flex-end}
.chat-msg.user .bubble{background:color-mix(in srgb, var(--brand) 7%, #fff 93%)}
.chat-msg.bot .bubble{background:#fff}
.chat-foot{display:flex; gap:8px; padding:10px; border-top:1px solid var(--border); background:var(--muted)}
.chat-foot input{flex:1}
