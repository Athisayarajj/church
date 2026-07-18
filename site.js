document.getElementById('year').textContent = new Date().getFullYear();

  /* ---- mobile nav ---- */
  const toggle = document.getElementById('menuToggle');
  const links = document.getElementById('navLinks');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { links.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); }));

  /* ---- reveal on scroll ---- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* =========================================================
     MOTION ENGINE — this site's design language is animation
     itself: a scrolling ticker, kinetic hero type, magnetic
     buttons, scroll parallax, and a cursor-reactive background
     blob. Every feature here has a matching admin toggle so
     the effect can be dialled back per-device, plus a single
     "Calm Mode" master switch, independent of (but respectful
     of) the visitor's OS-level reduced-motion preference.
     ========================================================= */
  const LS_MOTION = "csi_motion_settings";
  const MOTION_DEFAULTS = { fairylights:true, doves:true, blobdrift:true, kolam:true, ticker:true, kinetic:true, heroparallax:true, scrollbar:true, calm:false };
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function getMotionSettings(){
    const stored = JSON.parse(localStorage.getItem(LS_MOTION) || "{}");
    return Object.assign({}, MOTION_DEFAULTS, stored);
  }
  function applyMotionSettings(){
    const s = getMotionSettings();
    const body = document.body;
    Object.keys(MOTION_DEFAULTS).forEach(k => { if(k !== "calm") body.classList.toggle("motion-off-" + k, !s[k]); });
    body.classList.toggle("calm-mode", !!s.calm || prefersReduced);
  }
  applyMotionSettings();

  /* kinetic hero heading — split into words, staggered entrance */
  (function kineticHero(){
    const h1 = document.getElementById("heroTitle");
    if(!h1) return;
    const words = h1.textContent.trim().split(" ");
    h1.innerHTML = words.map((w,i) => `<span class="word" style="animation-delay:${0.25 + i*0.09}s">${w}</span>`).join(" ");
  })();

  /* scrolling ticker — built from live service times + events */
  function buildTicker(){
    const track = document.getElementById("tickerTrack");
    if(!track) return;
    const items = [
      "Sunday Service 12:30\u201302:00 PM",
      "Morning Prayer 5:00 AM",
      "Evening Prayer 7:00 PM",
      "Fasting Prayer \u00b7 2nd Saturday, 10:00 AM\u20131:00 PM",
      "Night Prayer \u00b7 3rd Friday, 7:00\u201310:00 PM"
    ];
    getEvents().forEach(ev => items.push(`${ev.title} \u00b7 ${ev.day} ${ev.month}`));
    const html = items.map(t => `<span>&#9899; ${t}</span>`).join("");
    track.innerHTML = html + html; // duplicated for a seamless loop
  }

  /* magnetic buttons */
  document.querySelectorAll(".btn").forEach(btn => {
    btn.addEventListener("mousemove", (e) => {
      if(document.body.classList.contains("calm-mode")) return;
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width/2) * 0.18;
      const y = (e.clientY - r.top - r.height/2) * 0.28;
      btn.style.transform = `translate(${x}px, ${y}px)`;
    });
    btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
  });

  /* hero photo/video parallax on scroll */
  const heroMedia = document.querySelectorAll(".hero-bg img, .hero-bg video");
  const scrollBar = document.getElementById("scrollProgress");
  function onScrollParallax(){
    if(scrollBar){
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollBar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
    }
    if(!heroMedia.length || document.body.classList.contains("motion-off-heroparallax") || document.body.classList.contains("calm-mode")) return;
    const y = Math.min(window.scrollY, 700) * 0.18;
    heroMedia.forEach(el => { el.style.transform = `translateY(${y}px) scale(1.06)`; });
  }
  window.addEventListener("scroll", onScrollParallax, { passive:true });

  /* cursor-reactive background blob */
  const cursorBlob = document.getElementById("cursorBlob");
  let targetX = 0, targetY = 0, curX = 0, curY = 0;
  window.addEventListener("mousemove", (e) => {
    targetX = (e.clientX / window.innerWidth - 0.5) * 60;
    targetY = (e.clientY / window.innerHeight - 0.5) * 60;
  });
  function blobLoop(){
    if(cursorBlob && !document.body.classList.contains("motion-off-blobdrift") && !document.body.classList.contains("calm-mode")){
      curX += (targetX - curX) * 0.04;
      curY += (targetY - curY) * 0.04;
      cursorBlob.style.transform = `translate(${curX}px, ${curY}px)`;
    }
    requestAnimationFrame(blobLoop);
  }
  requestAnimationFrame(blobLoop);

  /* =========================================================
     ADMIN PANEL — events CMS + hashed login + demo OTP reset
     Everything here is client-side only (this is a static
     HTML file with no server), so:
       • "encryption" of the password = SHA-256 hashing via the
         browser's Web Crypto API (the correct approach — the
         plain password is never stored, only its hash).
       • data lives in this browser's localStorage, so it is a
         single-device admin tool, not a shared database.
       • the "SMS" OTP is displayed on screen instead of sent,
         because sending a real SMS needs a backend holding an
         SMS-provider API key, which a static file can't do
         securely. Swap sendOtpDemo() for a real API call once
         a backend exists.
     ========================================================= */

  const ADMIN_PHONE = "6374399323";
  const ADMIN_EMAIL = "christchurchanbinnagaram@gmail.com";
  const LS_CREDS = "csi_admin_creds";
  const LS_EVENTS = "csi_events";
  const LS_GALLERY = "csi_gallery";
  const LS_HEROBG = "csi_hero_bg";

  /* =========================================================
     SUPABASE STORAGE (photo uploads) — fill these in once you
     create a free project at supabase.com, then paste the
     Project URL and the "anon / public" API key below.

     IMPORTANT, please read before "encrypting" this key:
     Supabase's anon key is *designed* to be shipped in
     client-side code — every Supabase web app on the internet
     ships it in plain sight. It is not a secret like a
     database password. Wrapping it in client-side JS
     "encryption" adds no real protection, because the
     decryption logic and key would have to ship in the same
     file, so anyone can reverse it in seconds — it would only
     create a false sense of security.
     The actual protection comes from Supabase's Row Level
     Security (RLS) policies on the "gallery" storage bucket —
     e.g. "anyone can read, nobody can write" by default, then
     a policy that only allows uploads from a signed-in
     Supabase Auth session. That's a short follow-up step I can
     set up with you once the project exists — it's the real
     fix, not client-side obfuscation of a key that was never
     meant to be secret.
     ========================================================= */
  const SUPABASE_URL = "https://vtjwigwrdanmsrqztkgj.supabase.co";        // e.g. "https://xxxxxxxx.supabase.co"
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0andpZ3dyZGFubXNycXp0a2dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMjk5NzEsImV4cCI6MjA5OTkwNTk3MX0.caI3rD4UwT6BYXLt3IkYhg6jsoUJFJ1Z8fsNmZTLsIU";   // Project Settings → API → anon public key
  const SUPABASE_BUCKET = "gallery";
  let supabaseClient = null;
  if (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  async function sha256(text){
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
  }

  async function ensureSeed(){
    if(!localStorage.getItem(LS_CREDS)){
      const hash = await sha256("admin123");
      localStorage.setItem(LS_CREDS, JSON.stringify({ username:"admin", hash }));
    }
    // events are now seeded once via the setup.sql migration in Supabase,
    // not seeded client-side, so every visitor shares the same data.
  }

  function getCreds(){ return JSON.parse(localStorage.getItem(LS_CREDS) || "{}"); }

  /* ---- events: now backed by the Supabase "events" table so all
     visitors see the same list, not just the browser that added them.
     eventsCache holds the last-fetched list; getEvents() reads the
     cache synchronously (so existing render code doesn't need to
     change), and refreshEvents() re-fetches from Supabase. ---- */
  let eventsCache = [];
  function getEvents(){ return eventsCache; }
  async function refreshEvents(){
    if(!supabaseClient){ eventsCache = JSON.parse(localStorage.getItem(LS_EVENTS) || "[]"); return; }
    const { data, error } = await supabaseClient.from("events").select("*").order("created_at", { ascending: true });
    if(error){ console.error("refreshEvents:", error); return; }
    eventsCache = data.map(r => ({ id: r.id, day: r.day, month: r.month, title: r.title, desc: r.description, tag: r.tag }));
  }
  async function addEventRemote(ev){
    if(!supabaseClient){
      const list = JSON.parse(localStorage.getItem(LS_EVENTS) || "[]");
      list.push(ev); localStorage.setItem(LS_EVENTS, JSON.stringify(list));
      return { error: null };
    }
    const { error } = await supabaseClient.from("events").insert({ day: ev.day, month: ev.month, title: ev.title, description: ev.desc, tag: ev.tag });
    return { error };
  }
  async function deleteEventRemote(id){
    if(!supabaseClient) return { error: null };
    const { error } = await supabaseClient.from("events").delete().eq("id", id);
    return { error };
  }

  function renderEvents(){
    const list = getEvents();
    const el = document.getElementById("eventsList");
    if(!el) return;
    el.innerHTML = list.map(ev => `
      <div class="event-row reveal in">
        <div class="event-date"><span class="d">${ev.day}</span><span class="m">${ev.month}</span></div>
        <div><h3>${ev.title}</h3><p>${ev.desc}</p></div>
        <span class="event-tag">${ev.tag}</span>
      </div>`).join("");
  }

  function renderAdminList(){
    const list = getEvents();
    const el = document.getElementById("eventAdminList");
    el.innerHTML = list.map((ev,i) => `
      <div class="event-admin-row">
        <span><b>${ev.day} ${ev.month}</b> &mdash; ${ev.title}</span>
        <button class="icon-btn" data-i="${i}">Delete</button>
      </div>`).join("") || '<p class="sub">No events yet.</p>';
    el.querySelectorAll(".icon-btn").forEach(btn => btn.addEventListener("click", async () => {
      const ev = getEvents()[Number(btn.dataset.i)];
      const msg = document.getElementById("dashMsg");
      if(ev && ev.id){
        const { error } = await deleteEventRemote(ev.id);
        if(error){ if(msg){ msg.className="msg err"; msg.textContent="Delete failed: " + error.message; } return; }
      }
      await refreshEvents();
      renderAdminList(); renderEvents(); buildTicker();
    }));
  }

  /* ---- gallery: uploaded photos. Files live in Supabase Storage;
     the shared index of {url, path, caption} lives in the
     gallery_photos table so every visitor's browser sees the same
     photos, not just the one that uploaded them. ---- */
  let galleryCache = [];
  function getGallery(){ return galleryCache; }
  async function refreshGallery(){
    if(!supabaseClient){ galleryCache = JSON.parse(localStorage.getItem(LS_GALLERY) || "[]"); return; }
    const { data, error } = await supabaseClient.from("gallery_photos").select("*").order("created_at", { ascending: true });
    if(error){ console.error("refreshGallery:", error); return; }
    galleryCache = data;
  }
  async function addGalleryPhotoRemote(photo){
    if(!supabaseClient){
      const list = JSON.parse(localStorage.getItem(LS_GALLERY) || "[]");
      list.push(photo); localStorage.setItem(LS_GALLERY, JSON.stringify(list));
      return { error: null };
    }
    const { error } = await supabaseClient.from("gallery_photos").insert({ url: photo.url, path: photo.path, caption: photo.caption });
    return { error };
  }
  async function deleteGalleryPhotoRemote(id){
    if(!supabaseClient) return { error: null };
    const { error } = await supabaseClient.from("gallery_photos").delete().eq("id", id);
    return { error };
  }

  const PLACEHOLDER_IDS = ["ph-congregation","ph-sanctuary","ph-festival","ph-sunday"];

  function renderGalleryOnSite(){
    const photos = getGallery();
    // fill existing placeholder tiles first, in order
    PLACEHOLDER_IDS.forEach((id, i) => {
      const tile = document.getElementById(id);
      if(!tile) return;
      const photo = photos[i];
      if(photo){
        tile.classList.add("photo");
        tile.innerHTML = `<img src="${photo.url}" alt="${photo.caption || 'Parish photo'}"><span class="cap glass-dark">${photo.caption || ''}</span>`;
      }
    });
    // any extra uploads beyond the placeholder slots get appended as new tiles
    const grid = document.getElementById("galleryGrid");
    if(!grid) return;
    grid.querySelectorAll('[data-extra="1"]').forEach(el => el.remove());
    photos.slice(PLACEHOLDER_IDS.length).forEach(photo => {
      const div = document.createElement("div");
      div.className = "gallery-tile photo glass reveal in";
      div.dataset.extra = "1";
      div.innerHTML = `<img src="${photo.url}" alt="${photo.caption || 'Parish photo'}"><span class="cap glass-dark">${photo.caption || ''}</span>`;
      grid.appendChild(div);
    });
  }

  function renderGalleryAdminList(){
    const photos = getGallery();
    const el = document.getElementById("galleryAdminList");
    el.innerHTML = photos.map((p,i) => `
      <div class="event-admin-row">
        <span>${p.caption || "(no caption)"}</span>
        <button class="icon-btn" data-gi="${i}">Delete</button>
      </div>`).join("") || '<p class="sub">No uploaded photos yet.</p>';
    el.querySelectorAll(".icon-btn").forEach(btn => btn.addEventListener("click", async () => {
      const list = getGallery();
      const photo = list[Number(btn.dataset.gi)];
      if(supabaseClient && photo.path){
        await supabaseClient.storage.from(SUPABASE_BUCKET).remove([photo.path]);
      }
      if(photo.id){ await deleteGalleryPhotoRemote(photo.id); }
      await refreshGallery(); renderGalleryAdminList(); renderGalleryOnSite();
    }));
    const note = document.getElementById("gallerySupabaseNote");
    note.innerHTML = supabaseClient
      ? ""
      : `<p class="admin-note">Supabase isn't connected yet, so "Upload Photo" just previews the image in this browser only (it won't persist for other visitors). Create a free project at supabase.com, create a public "gallery" storage bucket, and paste the Project URL + anon key into the SUPABASE_URL / SUPABASE_ANON_KEY constants near the top of the script to make uploads real and permanent.</p>`;
  }

  document.getElementById("uploadPhoto").addEventListener("click", async () => {
    const fileInput = document.getElementById("galFile");
    const caption = document.getElementById("galCaption").value.trim();
    const msg = document.getElementById("galMsg");
    const file = fileInput.files[0];
    if(!file){ msg.className="msg err"; msg.textContent="Choose a photo first."; return; }

    if(supabaseClient){
      const path = `${Date.now()}-${file.name}`;
      const { error } = await supabaseClient.storage.from(SUPABASE_BUCKET).upload(path, file);
      if(error){ msg.className="msg err"; msg.textContent="Upload failed: " + error.message; return; }
      const { data } = supabaseClient.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
      const { error: dbError } = await addGalleryPhotoRemote({ url: data.publicUrl, path, caption });
      if(dbError){
        msg.className="msg err"; msg.textContent="File uploaded but saving the listing failed: " + dbError.message;
        return;
      }
      await refreshGallery();
      msg.className="msg ok"; msg.textContent="Photo uploaded — visible to everyone.";
    } else {
      // no Supabase configured — fall back to a local, browser-only preview via a data URL
      const reader = new FileReader();
      reader.onload = async () => {
        await addGalleryPhotoRemote({ url: reader.result, caption });
        await refreshGallery();
        renderGalleryAdminList(); renderGalleryOnSite();
      };
      reader.readAsDataURL(file);
      msg.className="msg ok"; msg.textContent="Previewed locally (connect Supabase to make this permanent and visible to other visitors).";
    }
    fileInput.value = ""; document.getElementById("galCaption").value = "";
    renderGalleryAdminList(); renderGalleryOnSite();
  });

  /* ---- hero background: photo or video (Supabase Storage, same bucket,
     "hero/" folder). The active setting is one shared row in the
     hero_bg table so every visitor sees the same background. ---- */
  let heroBgCache = null;
  function getHeroBg(){ return heroBgCache; }
  async function refreshHeroBg(){
    if(!supabaseClient){ heroBgCache = JSON.parse(localStorage.getItem(LS_HEROBG) || "null"); return; }
    const { data, error } = await supabaseClient.from("hero_bg").select("*").eq("id", 1).maybeSingle();
    if(error){ console.error("refreshHeroBg:", error); return; }
    heroBgCache = data && data.url ? { type: data.type, url: data.url, path: data.path } : null;
  }
  async function saveHeroBgSetting(v){
    if(!supabaseClient){ localStorage.setItem(LS_HEROBG, JSON.stringify(v)); heroBgCache = v; return { error: null }; }
    const { error } = await supabaseClient.from("hero_bg").upsert({ id: 1, type: v.type, url: v.url, path: v.path, updated_at: new Date().toISOString() });
    if(!error) heroBgCache = v;
    return { error };
  }
  async function clearHeroBgSetting(){
    if(!supabaseClient){ localStorage.removeItem(LS_HEROBG); heroBgCache = null; return { error: null }; }
    const { error } = await supabaseClient.from("hero_bg").delete().eq("id", 1);
    if(!error) heroBgCache = null;
    return { error };
  }

  function renderHeroBg(){
    const img = document.getElementById("heroBgImg");
    const vid = document.getElementById("heroBgVideo");
    if(!img || !vid) return; // hero background only exists on the home page
    const bg = getHeroBg();
    if(bg && bg.type === "video" && bg.url){
      const src = vid.querySelector("source");
      if(src.getAttribute("src") !== bg.url){ src.src = bg.url; vid.load(); }
      vid.classList.remove("hidden");
      img.classList.add("hidden");
      vid.play().catch(() => {});
    } else if(bg && bg.type === "image" && bg.url){
      img.src = bg.url;
      img.classList.remove("hidden");
      vid.classList.add("hidden");
    } else {
      // no admin override saved — use the built-in background video by default,
      // falling back to the photo automatically if it can't play for any reason
      vid.classList.remove("hidden");
      img.classList.add("hidden");
      vid.play().catch(() => { vid.classList.add("hidden"); img.classList.remove("hidden"); });
    }
  }

  function renderHeroBgAdmin(){
    const cur = getHeroBg();
    const curEl = document.getElementById("heroBgCurrent");
    if(curEl) curEl.textContent = cur
      ? `Current: a custom ${cur.type === "video" ? "video" : "photo"} background is active on the home page.`
      : "Curr
