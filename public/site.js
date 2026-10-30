/* Studded Design shared layer, loaded on every page:
   - first-visit check: age 13+ and terms acceptance (blocks under-13s)
   - consent banner: no cookies; Google Fonts only if allowed (equal-weight choices)
   - footer: business details + legal links + cookie settings
   - skip link for keyboard users */
(function () {
  var LEGAL_PAGES = ["/privacy", "/terms", "/refunds", "/cookies", "/pricing"];
  var TERMS_VERSION = "2026-10-29";
  var path = location.pathname;
  var isLegal = LEGAL_PAGES.indexOf(path) !== -1;

  function get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: ask again next time */ } }
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    for (var a in attrs || {}) n.setAttribute(a, attrs[a]);
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]; }); }

  var css = el("link", { rel: "stylesheet", href: "/site.css" });
  document.head.appendChild(css);

  /* ---------- fonts only with consent ---------- */
  function loadFonts() {
    if (document.getElementById("ss-fonts")) return;
    document.head.appendChild(el("link", { id: "ss-fonts", rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@500;700;800;900&family=Public+Sans:ital,wght@0,400;0,600;0,700;0,800;1,400&family=DM+Mono:wght@400;500&display=swap" }));
  }
  var consent = get("ss:consent");
  if (consent && consent.fonts) loadFonts();

  /* ---------- skip link ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var main = document.querySelector("main, #main, #rvs, .wrap");
    if (main) {
      if (!main.id) main.id = "main";
      main.setAttribute("tabindex", "-1");
      document.body.insertBefore(el("a", { class: "ss-skip", href: "#" + main.id }, "Skip to content"), document.body.firstChild);
    }
    fetch("/api/business").then(function (r) { return r.json(); }).then(function (b) {
      footer(b);
      if (!isLegal) gate(b);
      else banner(false);
    });
  });

  /* ---------- footer (business details + legal) ---------- */
  function footer(b) {
    var f = el("footer", { class: "ss-footer" },
      '<div><b>' + esc(b.productName) + '</b> is operated by ' + esc(b.legalName) + '<br>' + esc(b.address)
      + '<br>Contact: <a href="mailto:' + esc(b.supportEmail) + '">' + esc(b.supportEmail) + '</a></div>'
      + '<nav aria-label="Legal"><a href="/pricing">Pricing</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a>'
      + '<a href="/refunds">Refunds</a><a href="/cookies">Cookies</a><a href="/my-data">My data</a>'
      + '<button type="button" id="ss-cookie-btn">Cookie settings</button></nav>'
      + '<p class="ss-fine">For ages ' + esc(b.minAge) + '+. AI features give automated opinions, not guarantees.</p>');
    document.body.appendChild(f);
    document.getElementById("ss-cookie-btn").addEventListener("click", function () { banner(true); });
  }

  /* ---------- first visit: age + terms ---------- */
  function gate(b) {
    var age = get("ss:age");
    if (age && age.blocked) return blockUnder(b);
    if (age && age.ok && age.terms === TERMS_VERSION) return banner(false);
    var m = el("div", { class: "ss-scrim", role: "dialog", "aria-modal": "true", "aria-labelledby": "ss-gate-h" },
      '<div class="ss-modal">'
      + '<h2 id="ss-gate-h">Before you start</h2>'
      + '<p>' + esc(b.productName) + ' is for people aged <b>' + esc(b.minAge) + ' and over</b>.</p>'
      + '<label class="ss-check"><input type="checkbox" id="ss-terms"><span>I agree to the <a href="/terms" target="_blank">Terms of Service</a> and have read the <a href="/privacy" target="_blank">Privacy Policy</a>.</span></label>'
      + '<div class="ss-row"><button type="button" class="ss-btn ss-primary" id="ss-adult" disabled>I\'m ' + esc(b.minAge) + ' or older — continue</button>'
      + '<button type="button" class="ss-btn" id="ss-kid">I\'m under ' + esc(b.minAge) + '</button></div>'
      + '<p class="ss-fine" id="ss-gate-msg" aria-live="polite">Tick the box to continue.</p></div>');
    document.body.appendChild(m);
    var box = m.querySelector("#ss-terms"), adult = m.querySelector("#ss-adult");
    box.addEventListener("change", function () {
      adult.disabled = !box.checked;
      m.querySelector("#ss-gate-msg").textContent = box.checked ? "" : "Tick the box to continue.";
    });
    adult.addEventListener("click", function () {
      set("ss:age", { ok: true, terms: TERMS_VERSION, date: new Date().toISOString().slice(0, 10) });
      m.remove();
      banner(false);
    });
    m.querySelector("#ss-kid").addEventListener("click", function () {
      set("ss:age", { blocked: true, date: new Date().toISOString().slice(0, 10) });
      m.remove();
      blockUnder(b);
    });
    trap(m);
    box.focus();
  }

  function blockUnder(b) {
    var m = el("div", { class: "ss-scrim ss-solid", role: "dialog", "aria-modal": "true", "aria-labelledby": "ss-block-h" },
      '<div class="ss-modal"><h2 id="ss-block-h">Sorry — this service is for ' + esc(b.minAge) + '+</h2>'
      + '<p>Nothing about you was saved or sent. Ask a parent or guardian if you need help making a model.</p>'
      + '<p class="ss-fine">Parents: questions to <a href="mailto:' + esc(b.privacyEmail) + '">' + esc(b.privacyEmail) + '</a>. Read our <a href="/privacy">Privacy Policy</a>.</p></div>');
    document.body.appendChild(m);
    trap(m);
  }

  /* ---------- consent banner ---------- */
  function banner(force) {
    var c = get("ss:consent");
    if (c && !force) return;
    var old = document.getElementById("ss-banner");
    if (old) old.remove();
    var bn = el("section", { id: "ss-banner", class: "ss-banner", "aria-label": "Cookie choices" },
      '<p><b>No cookies, no trackers.</b> One optional extra: load our display fonts from Google Fonts, which shares your IP address with Google. '
      + '<a href="/cookies">Cookie policy</a></p>'
      + '<div class="ss-row"><button type="button" class="ss-btn" data-fonts="0">Essential only</button>'
      + '<button type="button" class="ss-btn" data-fonts="1">Allow external fonts</button></div>');
    document.body.appendChild(bn);
    bn.querySelectorAll("button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var fonts = btn.getAttribute("data-fonts") === "1";
        set("ss:consent", { fonts: fonts, date: new Date().toISOString().slice(0, 10) });
        bn.remove();
        if (fonts) loadFonts();
        else { var l = document.getElementById("ss-fonts"); if (l) l.remove(); }
      });
    });
    if (force) bn.querySelector("button").focus();
  }

  /* ---------- keep keyboard focus inside a modal ---------- */
  function trap(m) {
    m.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var f = Array.prototype.filter.call(m.querySelectorAll("a,button,input"), function (x) { return !x.disabled; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
})();
