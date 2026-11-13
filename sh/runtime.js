/*
 * Shohnoma shablon runtime — HTML shablonlardagi <sh-…> teglarini ishga tushiradi.
 * Ma’lumot: <script type="application/json" id="sh-data">. Rejim: live (mehmon) | preview (namuna) | archived.
 */
(function () {
  "use strict";
  var D = {};
  try {
    D = JSON.parse(document.getElementById("sh-data").textContent || "{}");
  } catch (e) {}
  var live = D.mode === "live";
  /** Shaxsiy havola (?g= maxsus mehmon yoki ?m=Ism): {name, token?, editToken?} */
  var G = D.guest && D.guest.name ? D.guest : null;
  var gq = G && G.token ? "?g=" + encodeURIComponent(G.token) : "";

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function toast(t) {
    var x = el("div", { class: "sh-toast", role: "status", text: t });
    document.body.appendChild(x);
    setTimeout(function () { x.remove(); }, 3200);
  }
  function api(method, url, body) {
    return fetch(url, { method: method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok || d.ok === false) throw new Error(d.error || "Xatolik yuz berdi");
        return d;
      });
    });
  }
  /** Tegni (va u yolg‘iz turgan bo‘limni) yashirish */
  function hideBlock(host) {
    host.style.display = "none";
    var p = host.parentElement;
    if (p && p !== document.body && p.children.length === 1 && !p.textContent.trim()) p.style.display = "none";
  }
  function define(name, setup) {
    if (customElements.get(name)) return;
    customElements.define(name, class extends HTMLElement {
      connectedCallback() {
        if (this._done) return;
        this._done = true;
        setup(this);
      }
    });
  }

  /* ── Kirish ekrani ── */
  define("sh-open", function (host) {
    var label = host.textContent.trim() || "Taklifnomani ochish";
    host.textContent = "";
    var b = el("button", { type: "button", class: "sh-btn sh-open__btn", text: label });
    b.addEventListener("click", function () {
      document.body.classList.add("sh-opened");
      var m = document.querySelector("sh-music");
      if (m && m._play) m._play();
      var next = host.closest("section, header, div");
      next = next && next.nextElementSibling;
      setTimeout(function () { if (next) next.scrollIntoView({ behavior: "smooth", block: "start" }); }, 350);
    });
    host.appendChild(b);
  });

  /* ── Sanoq ── */
  define("sh-countdown", function (host) {
    var wrap = el("div", { class: "sh-countdown", role: "timer" });
    host.appendChild(wrap);
    var target = D.date ? new Date(D.date).getTime() : NaN;
    // Namunada sana o‘tib ketgan bo‘lsa — sanoq ko‘rinishi uchun 40 kun keyinga suramiz
    if (!live && !isNaN(target) && target < Date.now()) target = Date.now() + 40 * 86400000 + 5 * 3600000;
    if (live && !isNaN(target) && target < Date.now() - 86400000) { hideBlock(host); return; }
    var labels = ["kun", "soat", "daqiqa", "soniya"];
    var cells = labels.map(function (l) {
      var num = el("span", { class: "sh-countdown__num", text: "0" });
      wrap.appendChild(el("div", { class: "sh-countdown__cell" }, [num, el("span", { class: "sh-countdown__label", text: l })]));
      return num;
    });
    function tick() {
      if (isNaN(target)) return;
      var s = Math.max(0, Math.floor((target - Date.now()) / 1000));
      if (s === 0 && target <= Date.now()) {
        wrap.replaceWith(el("p", { class: "sh-countdown__done", text: "Bugun — bayram kuni!" }));
        clearInterval(t);
        return;
      }
      var v = [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
      cells.forEach(function (c, i) { c.textContent = String(v[i]).padStart(i ? 2 : 1, "0"); });
    }
    var t = setInterval(tick, 1000);
    tick();
  });

  /* ── Xarita ── */
  define("sh-map", function (host) {
    var q = (D.venueName ? D.venueName + ", " : "") + (D.address || "");
    if (!q.trim() && !D.mapUrl) { hideBlock(host); return; }
    var box = el("div", { class: "sh-map" });
    if (q.trim()) box.appendChild(el("iframe", { class: "sh-map__frame", loading: "lazy", title: "Xarita", referrerpolicy: "no-referrer-when-downgrade", src: "https://www.google.com/maps?output=embed&q=" + encodeURIComponent(q) }));
    var links = el("div", { class: "sh-map__links" });
    var yandex = D.mapUrl && /yandex/.test(D.mapUrl) ? D.mapUrl : "https://yandex.uz/maps/?text=" + encodeURIComponent(q);
    var google = D.mapUrl && /google|goo\.gl/.test(D.mapUrl) ? D.mapUrl : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
    links.appendChild(el("a", { class: "sh-btn sh-btn--ghost", href: yandex, target: "_blank", rel: "noopener", text: "Yandex xarita" }));
    links.appendChild(el("a", { class: "sh-btn sh-btn--ghost", href: google, target: "_blank", rel: "noopener", text: "Google Maps" }));
    box.appendChild(links);
    host.appendChild(box);
  });

  /* ── Galereya ── */
  define("sh-gallery", function (host) {
    var photos = D.photos || [];
    if (!photos.length) { hideBlock(host); return; }
    var grid = el("div", { class: "sh-gallery" });
    photos.forEach(function (src) {
      var b = el("button", { type: "button", class: "sh-gallery__item", "aria-label": "Rasmni kattalashtirish" }, [el("img", { src: src, alt: "", loading: "lazy" })]);
      b.addEventListener("click", function () {
        var lb = el("div", { class: "sh-lightbox", role: "dialog" }, [el("img", { src: src, alt: "" })]);
        lb.addEventListener("click", function () { lb.remove(); });
        document.body.appendChild(lb);
      });
      grid.appendChild(b);
    });
    host.appendChild(grid);
  });

  /* ── Mehmon javobi ── */
  define("sh-rsvp", function (host) {
    if (D.rsvpEnabled === false) { hideBlock(host); return; }
    // maxsus mehmon javobi alohida saqlanadi (bir qurilmada boshqa havola bilan javob berilgan bo‘lsa aralashmaydi)
    var key = "sh_rsvp_" + (D.slug || "demo") + (G && G.token ? "_" + G.token : "");
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(key) || "null"); } catch (e) {}
    var form = el("form", { class: "sh-rsvp", novalidate: "" });
    var title = host.getAttribute("title") || "Kelasizmi?";
    host.removeAttribute("title");
    var state = { status: saved && saved.status || "coming", count: saved && saved.count || 1 };

    function done(msg) {
      form.innerHTML = "";
      form.appendChild(el("p", { class: "sh-rsvp__done", text: msg }));
      if (saved && saved.token) form.appendChild(el("button", { type: "button", class: "sh-btn sh-btn--ghost", text: "Javobni o‘zgartirish", onclick: function () { render(true); } }));
    }
    function render(edit) {
      form.innerHTML = "";
      if (saved && !edit) return done(saved.status === "not_coming" ? "Javobingiz uchun rahmat!" : "Rahmat! Sizni kutib qolamiz.");
      form.appendChild(el("h3", { class: "sh-rsvp__title", text: title }));
      var name = el("input", { class: "sh-rsvp__input", name: "name", autocomplete: "name", maxlength: "120", placeholder: "Ism va familiyangiz", value: saved && saved.name || G && G.name || "" });
      form.appendChild(el("label", null, [el("span", { class: "sh-rsvp__label", text: "Ismingiz" }), name]));
      var choices = el("div", { class: "sh-rsvp__choices", role: "radiogroup" });
      [["coming", "Boraman"], ["maybe", "Hali aniq emas"], ["not_coming", "Kela olmayman"]].forEach(function (c) {
        var b = el("button", { type: "button", role: "radio", class: "sh-rsvp__choice", "aria-checked": String(state.status === c[0]) }, [el("span", { class: "sh-rsvp__dot" }), c[1]]);
        b.addEventListener("click", function () {
          state.status = c[0];
          choices.querySelectorAll("[role=radio]").forEach(function (x) { x.setAttribute("aria-checked", String(x === b)); });
          countRow.style.display = state.status === "not_coming" ? "none" : "";
        });
        choices.appendChild(b);
      });
      form.appendChild(choices);
      var cnt = el("strong", { text: String(state.count) });
      var countRow = el("div", null, [el("span", { class: "sh-rsvp__label", text: "Necha kishi bo‘lasiz" }), el("div", { class: "sh-rsvp__count" }, [
        el("button", { type: "button", class: "sh-rsvp__step", "aria-label": "Kamaytirish", text: "−", onclick: function () { state.count = Math.max(1, state.count - 1); cnt.textContent = state.count; } }),
        cnt,
        el("button", { type: "button", class: "sh-rsvp__step", "aria-label": "Ko‘paytirish", text: "+", onclick: function () { state.count = Math.min(10, state.count + 1); cnt.textContent = state.count; } }),
      ])]);
      if (state.status === "not_coming") countRow.style.display = "none";
      form.appendChild(countRow);
      var wish = el("textarea", { class: "sh-rsvp__input", rows: "3", maxlength: "1000", placeholder: "Tilagingiz (ixtiyoriy)" });
      wish.value = saved && saved.wish || "";
      form.appendChild(el("label", null, [el("span", { class: "sh-rsvp__label", text: "Tilak" }), wish]));
      var hp = el("input", { class: "sh-rsvp__hp", name: "website", tabindex: "-1", autocomplete: "off", "aria-hidden": "true" });
      form.appendChild(hp);
      var err = el("p", { class: "sh-rsvp__error", role: "alert" });
      form.appendChild(err);
      var btn = el("button", { type: "submit", class: "sh-btn", text: "Javob yuborish" });
      form.appendChild(btn);
      form.onsubmit = function (e) {
        e.preventDefault();
        err.textContent = "";
        if (!name.value.trim()) { err.textContent = "Ismingizni kiriting"; name.focus(); return; }
        if (!live) { toast("Bu namuna — haqiqiy taklifnomada javob egasiga yuboriladi"); return; }
        btn.disabled = true;
        var body = { name: name.value.trim(), status: state.status, count: state.count, wish: wish.value.trim(), website: hp.value };
        var req = saved && saved.token
          ? api("PATCH", "/api/i/" + D.slug + "/rsvp/" + saved.token + gq, body).then(function () { return { editToken: saved.token }; })
          : api("POST", "/api/i/" + D.slug + "/rsvp" + gq, body);
        req.then(function (r) {
          saved = { token: r.editToken, name: body.name, status: body.status, count: body.count, wish: body.wish };
          try { localStorage.setItem(key, JSON.stringify(saved)); } catch (x) {}
          render(false);
        }).catch(function (x) {
          err.textContent = x.message;
          btn.disabled = false;
        });
      };
    }
    host.appendChild(form);
    // Maxsus mehmon boshqa qurilmada javob bergan — o‘sha javob ko‘rsatiladi (tahrirlash mumkin)
    if (!saved && live && G && G.editToken) {
      fetch("/api/i/" + D.slug + "/rsvp/" + G.editToken).then(function (r) { return r.json(); }).then(function (d) {
        if (d && d.ok && d.response) {
          saved = { token: G.editToken, name: d.response.name, status: d.response.status, count: d.response.count, wish: d.response.wish || "" };
          state = { status: saved.status, count: saved.count || 1 };
          try { localStorage.setItem(key, JSON.stringify(saved)); } catch (x) {}
        }
        render(false);
      }).catch(function () { render(false); });
    } else render(false);
  });

  /* ── Shaxsiy murojaat: <sh-guest>Hurmatli {name}!</sh-guest> — mehmon ismi bo‘lmasa ko‘rinmaydi ── */
  define("sh-guest", function (host) {
    var fmt = host.textContent.trim() || "Hurmatli {name}!";
    if (!G) { hideBlock(host); return; }
    host.textContent = fmt.split("{name}").join(G.name);
  });

  /* ── Musiqa ── */
  define("sh-music", function (host) {
    var src = host.getAttribute("src");
    if (!src || D.musicEnabled === false) { host.style.display = "none"; return; }
    var audio = new Audio(src);
    audio.loop = true;
    audio.preload = "none";
    var icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
    var b = el("button", { type: "button", class: "sh-music__btn", "aria-label": "Musiqa", "aria-pressed": "false", html: icon });
    function set(on) { b.setAttribute("aria-pressed", String(on)); }
    host._play = function () { audio.play().then(function () { set(true); }).catch(function () {}); };
    b.addEventListener("click", function () {
      if (audio.paused) host._play();
      else { audio.pause(); set(false); }
    });
    host.appendChild(b);
  });

  /* ── Kalendar ── */
  define("sh-calendar", function (host) {
    var label = host.textContent.trim() || "Kalendarga qo‘shish";
    host.textContent = "";
    if (!D.slug || !live) {
      host.appendChild(el("button", { type: "button", class: "sh-btn sh-btn--ghost", text: label, onclick: function () { toast("Namunada ishlamaydi"); } }));
      return;
    }
    host.appendChild(el("a", { class: "sh-btn sh-btn--ghost", href: "/api/i/" + D.slug + "/calendar", text: label }));
  });

  /* ── Ulashish ── */
  define("sh-share", function (host) {
    var label = host.textContent.trim() || "Havolani ulashish";
    host.textContent = "";
    host.appendChild(el("button", {
      type: "button", class: "sh-btn sh-btn--ghost", text: label, onclick: function () {
        // shaxsiy havola (?g=, ?m=) boshqalarga uzatilmaydi — umumiy havola ulashiladi
        var url = location.origin + location.pathname;
        if (navigator.share) navigator.share({ title: D.names + " — taklifnoma", url: url }).catch(function () {});
        else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast("Havola nusxalandi"); });
      },
    }));
  });

  /* ── Paydo bo‘lish animatsiyalari ── */
  function reveal() {
    var els = document.querySelectorAll("[data-sh-reveal]");
    els.forEach(function (e) { var d = e.getAttribute("data-sh-delay"); if (d) e.style.setProperty("--sh-d", parseInt(d, 10) + "ms"); });
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("sh-in"); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("sh-in"); io.unobserve(x.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (e) { io.observe(e); });
  }
  if (D.mode === "archived") document.body.appendChild(el("div", { class: "sh-archived", text: "Bu taklifnoma arxivlangan" }));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", reveal);
  else reveal();
})();
