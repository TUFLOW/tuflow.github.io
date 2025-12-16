(function () {
  // Run on first load and after Material's instant navigation
  function onReady(fn) {
    if (window.document$ && window.document$.subscribe) {
      window.document$.subscribe(fn);
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  const qs  = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  function getSidebarInner() {
    return qs(".md-sidebar--primary .md-sidebar__inner") || qs(".md-sidebar--primary");
  }

  function getPrimaryNav() {
    return qs(".md-sidebar--primary nav.md-nav--primary") || qs(".md-sidebar--primary nav");
  }

  // Material 9.x uses a mix of checkbox inputs and <details> for nested groups
  function getCheckboxToggles() {
    const nav = getPrimaryNav();
    return nav ? qsa('input.md-nav__toggle', nav) : [];
  }

  function getDetailsToggles() {
    const nav = getPrimaryNav();
    return nav ? qsa('details', nav) : [];
  }

  function allExpanded() {
    const checks = getCheckboxToggles();
    const dets   = getDetailsToggles();
    const okChecks = checks.length ? checks.every(el => el.checked) : true;
    const okDets   = dets.length   ? dets.every(el => el.open)     : true;
    return okChecks && okDets;
  }

  function setAll(state) {
    // Checkbox-based groups
    getCheckboxToggles().forEach(el => {
      if (el.checked !== state) {
        el.checked = state;
        el.dispatchEvent(new Event("input",  { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    // <details>-based groups
    getDetailsToggles().forEach(el => {
      if (el.open !== state) {
        el.open = state;
        el.dispatchEvent(new Event("toggle"));
      }
    });
    try { localStorage.setItem("navAllExpanded", state ? "1" : "0"); } catch {}
  }

  function ensureButton() {
    if (qs(".nav-collapse-toggle")) return;

    const sidebarInner = getSidebarInner();
    const nav = getPrimaryNav();
    if (!sidebarInner || !nav) return;

    const btn = document.createElement("button");
    btn.className = "nav-collapse-toggle";
    const update = () => {
      const expanded = allExpanded();
      btn.textContent = expanded ? "Collapse all" : "Expand all";
      btn.setAttribute("aria-pressed", expanded ? "true" : "false");
    };
    btn.addEventListener("click", () => { setAll(!allExpanded()); update(); });

    const wrap = document.createElement("div");
    wrap.className = "nav-collapse-wrap";
    wrap.appendChild(btn);

    // Place under the search box if present, otherwise before the nav tree
    const search = qs(".md-search", sidebarInner);
    if (search) {
      search.insertAdjacentElement("afterend", wrap);
    } else {
      const firstNav = qs("nav", sidebarInner);
      if (firstNav) sidebarInner.insertBefore(wrap, firstNav);
      else sidebarInner.prepend(wrap);
    }

    // Restore previous state
    try {
      const saved = localStorage.getItem("navAllExpanded");
      if (saved !== null) setAll(saved === "1");
    } catch {}

    update();
  }

  onReady(() => setTimeout(ensureButton, 0));
})();
