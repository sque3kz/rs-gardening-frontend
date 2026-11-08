/* R&S Gardening – interactions and scroll effects. */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const root = document.documentElement;
  const reducedMotion = root.classList.contains('reduced-motion');
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = Boolean(window.gsap && window.ScrollTrigger);

  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger, ...(window.Flip ? [Flip] : []));
    // The phone address bar showing/hiding resizes the window mid-scroll; re-measuring
    // every pin and trigger then causes a visible hitch.
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  /* ------------------------------------------------------------------
     Anchor links (native scrolling – smooth glide via CSS scroll-behavior)
  ------------------------------------------------------------------ */
  const scrollToHash = (hash) => {
    const target = hash === '#top' ? 0 : $(hash);
    if (target === null) return;
    const behavior = reducedMotion ? 'auto' : 'smooth';
    if (target === 0) window.scrollTo({ top: 0, behavior });
    else target.scrollIntoView({ behavior });
  };

  // Stop the page scrolling behind the mobile menu and the photo viewer.
  const lockScroll = (locked) => { root.style.overflow = locked ? 'hidden' : ''; };

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || link.getAttribute('href').length < 2) return;
    event.preventDefault();
    closeMenu();
    scrollToHash(link.getAttribute('href'));
  });

  /* ------------------------------------------------------------------
     Navigation: hide on scroll down, active section indicator, burger
  ------------------------------------------------------------------ */
  const nav = $('[data-nav]');
  // Visible at the very top; after that it hides when scrolling down and only
  // comes back when scrolling up. Direction is judged over a few pixels so the
  // tiny steps of smooth scrolling don't make it flicker. The corner buttons
  // (language, back to top) only show while scrolling up, never at the top.
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 30);
    root.classList.toggle('near-bottom', y > (root.scrollHeight - window.innerHeight) / 2);
    if (root.classList.contains('menu-open')) return;
    if (y < 60) {
      nav.classList.remove('is-hidden');
      root.classList.remove('show-corner-buttons');
      lastY = y;
      return;
    }
    if (Math.abs(y - lastY) < 8) return;
    nav.classList.toggle('is-hidden', y > lastY);
    root.classList.toggle('show-corner-buttons', y < lastY);
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const indicator = $('.nav__indicator');
  const navLinks = $$('[data-nav-link]');
  const moveIndicator = (link) => {
    if (!link) { indicator.style.opacity = 0; return; }
    indicator.style.opacity = 1;
    indicator.style.width = `${link.offsetWidth}px`;
    indicator.style.transform = `translateX(${link.offsetLeft}px)`;
  };
  const activeLink = () => navLinks.find((l) => l.classList.contains('is-active'));
  navLinks.forEach((link) => link.addEventListener('mouseenter', () => moveIndicator(link)));
  $('.nav__links').addEventListener('mouseleave', () => moveIndicator(activeLink()));

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === `#${entry.target.id}`));
      moveIndicator(activeLink());
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['top', 'about', 'services', 'process', 'work', 'reviews', 'contact'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
  });

  const burger = $('[data-burger]');
  const mobileMenu = $('[data-mobile-menu]');
  function closeMenu() {
    if (!root.classList.contains('menu-open')) return;
    root.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
    lockScroll(false);
  }
  burger.addEventListener('click', () => {
    if (root.classList.contains('menu-open')) return closeMenu();
    root.classList.add('menu-open');
    nav.classList.remove('is-hidden');
    burger.setAttribute('aria-expanded', 'true');
    mobileMenu.setAttribute('aria-hidden', 'false');
    lockScroll(true);
  });

  /* ------------------------------------------------------------------
     Language picker: the bottom-left circle rolls out to show the other language
  ------------------------------------------------------------------ */
  const langFab = $('[data-lang-fab]');
  if (langFab) {
    const toggle = $('button', langFab);
    const setOpen = (open) => {
      langFab.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setOpen(!langFab.classList.contains('is-open')));
    // Remember a language picked here (see the language script in base.html)
    $$('a[hreflang]', langFab).forEach((link) => link.addEventListener('click', () => {
      try { localStorage.setItem('rs-language', link.hreflang); } catch (e) { /* storage blocked */ }
    }));
    // Fold it back up when it slides away
    window.addEventListener('scroll', () => {
      if (!root.classList.contains('show-corner-buttons')) setOpen(false);
    }, { passive: true });
    document.addEventListener('click', (e) => { if (!langFab.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }

  /* ------------------------------------------------------------------
     First-visit language window (shown by the script in base.html). The
     browser's own language is highlighted as a suggestion; picking one is
     remembered and opens this page in it. Escape keeps the current language.
  ------------------------------------------------------------------ */
  const picker = $('[data-lang-picker]');
  if (picker && root.classList.contains('needs-language')) {
    const choices = $$('a[hreflang]', picker);
    const browser = (navigator.languages?.[0] || navigator.language || '').toLowerCase().slice(0, 2);
    const suggested = choices.find((c) => c.hreflang === browser) || choices.find((c) => c.hreflang === 'en');
    suggested?.classList.add('is-suggested');
    const remember = (code) => { try { localStorage.setItem('rs-language', code); } catch (e) { /* storage blocked */ } };
    const close = () => { root.classList.remove('needs-language'); };
    choices.forEach((choice) => choice.addEventListener('click', (e) => {
      remember(choice.hreflang);
      if (choice.hreflang === root.lang) { e.preventDefault(); close(); }
    }));
    picker.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { remember(root.lang); close(); return; }
      if (e.key !== 'Tab') return; // keep keyboard focus inside the window
      const first = choices[0], last = choices[choices.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    (suggested || choices[0])?.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------
     Reviews rail: drag to scroll + arrow buttons
  ------------------------------------------------------------------ */
  // Touch scrolls these natively; this lets mouse users drag them sideways too.
  const enableDragScroll = (el) => {
    let startX = 0, startScroll = 0, dragging = false, moved = false;
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || el.scrollWidth <= el.clientWidth || el.classList.contains('is-marquee')) return;
      dragging = true; moved = false; startX = e.clientX; startScroll = el.scrollLeft;
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; el.classList.add('is-dragging'); }
      el.scrollLeft = startScroll - dx;
    });
    window.addEventListener('pointerup', () => { dragging = false; el.classList.remove('is-dragging'); });
    el.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  };

  // "Show more" only for reviews that are actually cut off (re-checked on resize).
  const reviewTexts = $$('[data-review-text]');
  const updateReviewLinks = () => reviewTexts.forEach((text) => {
    const more = text.parentElement.querySelector('[data-review-more]');
    if (more) more.hidden = text.scrollHeight <= text.clientHeight + 1;
  });
  if (reviewTexts.length) {
    updateReviewLinks();
    window.addEventListener('resize', updateReviewLinks);
    document.fonts?.ready.then(updateReviewLinks);
  }

  const rail = $('[data-rail]');
  if (rail) {
    const step = () => (rail.querySelector('.review-card')?.offsetWidth || 400) + 20;
    $('[data-rail-prev]')?.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
    $('[data-rail-next]')?.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
    enableDragScroll(rail);
  }
  $$('[data-drag-scroll]').forEach(enableDragScroll);

  /* ------------------------------------------------------------------
     Services on phones: two endless rows drifting in opposite directions.
     Each row's cards are repeated once so the loop is seamless. The steady
     drift is a Web Animation of `transform`, which the browser runs on the
     compositor, so it stays smooth while the page scrolls or the main thread
     is busy. Dragging (finger or mouse) seeks that animation; a flick keeps
     gliding, then the drift eases back in. Rows pause while held or hovered,
     and while off screen.
  ------------------------------------------------------------------ */
  const phone = window.matchMedia('(max-width: 640px)');
  const serviceRows = $$('.services__row');
  const SPEED = 26; // px per second
  const FRICTION = 4; // how quickly a flick slows down (per second)
  let marquees = [];
  let marqueesOnScreen = false;

  const teardownMarquees = () => {
    marquees.forEach((m) => {
      m.cleanup();
      m.row.classList.remove('is-marquee');
      m.originals.forEach((card) => m.row.append(card));
      m.track.remove();
    });
    marquees = [];
  };

  const setupMarquees = () => {
    teardownMarquees();
    if (!phone.matches || reducedMotion || !Element.prototype.animate) return;
    marquees = serviceRows.map((row, index) => {
      const originals = [...row.children];
      const track = document.createElement('div');
      track.className = 'services__track';
      originals.forEach((card) => track.append(card));
      originals.forEach((card) => {
        const clone = card.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.inert = true;
        track.append(clone);
      });
      row.append(track);
      row.classList.add('is-marquee');

      // dir -1 drifts left, +1 right. x is the track offset, kept within [-set, 0).
      const m = { row, track, originals, dir: index % 2 === 0 ? -1 : 1, set: 0, anim: null, drag: null, hovering: false, frame: 0 };
      const duration = () => (m.set / SPEED) * 1000;
      const progress = () => {
        const d = duration();
        return (((m.anim.currentTime || 0) % d) + d) % d / d;
      };
      m.getX = () => (m.dir < 0 ? -progress() * m.set : -m.set + progress() * m.set);
      m.setX = (x) => {
        x = (((x % m.set) + m.set) % m.set) - m.set; // into [-set, 0)
        m.anim.currentTime = (m.dir < 0 ? -x / m.set : (x + m.set) / m.set) * duration();
      };
      // Runs only on screen and when nobody is holding, hovering or flicking it
      m.sync = () => {
        if (!m.anim || m.frame) return;
        if (marqueesOnScreen && !m.drag && !m.hovering) m.anim.play();
        else m.anim.pause();
      };

      // (Re)build the loop for the current card widths, keeping the row where it was
      m.build = (startProgress) => {
        const p = m.anim ? progress() : startProgress;
        m.anim?.cancel();
        m.anim = null;
        m.set = track.children[originals.length].offsetLeft - track.children[0].offsetLeft;
        if (!(m.set > 0)) return;
        const [from, to] = m.dir < 0 ? [0, -m.set] : [-m.set, 0];
        m.anim = track.animate(
          [{ transform: `translate3d(${from}px, 0, 0)` }, { transform: `translate3d(${to}px, 0, 0)` }],
          { duration: duration(), iterations: Infinity, easing: 'linear' },
        );
        m.anim.currentTime = p * duration();
        m.sync();
      };
      m.build(index % 2 === 0 ? 0 : 0.42); // start the rows at different points so they never line up

      // After a drag: glide with the flick's speed, then ease the drift back in
      const settle = (velocity) => {
        cancelAnimationFrame(m.frame);
        if (!m.anim) return;
        let last = performance.now();
        let ramp = -1; // < 0 while gliding; then 0 → 1 as the drift comes back
        m.anim.pause();
        const step = (now) => {
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          if (ramp < 0) {
            m.setX(m.getX() + velocity * dt);
            velocity *= Math.exp(-FRICTION * dt);
            if (Math.abs(velocity) < 8) {
              ramp = 0;
              m.anim.updatePlaybackRate(0.001);
              m.anim.play();
            }
          } else {
            ramp = Math.min(1, ramp + dt / 0.8);
            m.anim.updatePlaybackRate(Math.max(0.001, ramp));
            if (ramp >= 1) { m.frame = 0; m.sync(); return; }
          }
          m.frame = requestAnimationFrame(step);
        };
        m.frame = requestAnimationFrame(step);
      };

      let pending = null; // latest drag position, applied once per frame
      const down = (e) => {
        if (!m.anim) return;
        cancelAnimationFrame(m.frame);
        m.frame = 0;
        m.anim.updatePlaybackRate(1);
        m.drag = { startX: e.clientX, startY: e.clientY, startPos: m.getX(), active: false, lastX: e.clientX, lastT: e.timeStamp, velocity: 0 };
        m.sync();
      };
      const move = (e) => {
        if (!m.drag) return;
        const dx = e.clientX - m.drag.startX;
        if (!m.drag.active && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - m.drag.startY)) {
          m.drag.active = true;
          row.classList.add('is-dragging');
        }
        if (!m.drag.active) return;
        // Smoothed finger speed, used for the glide after letting go
        const dt = e.timeStamp - m.drag.lastT;
        if (dt > 0) m.drag.velocity = 0.8 * ((e.clientX - m.drag.lastX) / dt) * 1000 + 0.2 * m.drag.velocity;
        m.drag.lastX = e.clientX;
        m.drag.lastT = e.timeStamp;
        if (pending === null) {
          requestAnimationFrame(() => {
            if (pending !== null && m.anim) m.setX(pending);
            pending = null;
          });
        }
        pending = m.drag.startPos + dx;
      };
      const up = (e) => {
        if (!m.drag) return;
        const { active, lastT, velocity } = m.drag;
        m.drag = null;
        row.classList.remove('is-dragging');
        // A drag that stopped before release (or never started) shouldn't glide
        settle(!active || e.timeStamp - lastT > 80 ? 0 : velocity);
      };
      const enter = (e) => { if (e.pointerType === 'mouse') { m.hovering = true; m.sync(); } };
      const leave = () => { m.hovering = false; m.sync(); };
      row.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move, { passive: true });
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      row.addEventListener('pointerenter', enter);
      row.addEventListener('pointerleave', leave);
      m.cleanup = () => {
        cancelAnimationFrame(m.frame);
        m.anim?.cancel();
        row.removeEventListener('pointerdown', down);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        row.removeEventListener('pointerenter', enter);
        row.removeEventListener('pointerleave', leave);
      };
      return m;
    });
  };

  if (serviceRows.length) {
    new IntersectionObserver(([entry]) => {
      marqueesOnScreen = entry.isIntersecting;
      marquees.forEach((m) => m.sync()); // nothing animates while scrolled away
    }).observe($('.services__grid'));
    setupMarquees();
    phone.addEventListener('change', setupMarquees);
    let resizeTimer;
    window.addEventListener('resize', () => {
      if (!phone.matches) return; // leaving phone size: the media query listener tears them down
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => marquees.forEach((m) => m.build(0)), 150);
    });
  }

  /* ------------------------------------------------------------------
     Gallery: filters and lightbox
  ------------------------------------------------------------------ */
  const gallery = $('[data-gallery]');
  const items = gallery ? $$('.gallery__item', gallery) : [];
  // Up to ten photos per view (five on phones), placed using the layout table
  // from core/gallery.py so the grid always forms a clean rectangle.
  const layoutData = $('#gallery-layouts');
  const layouts = layoutData ? JSON.parse(layoutData.textContent) : null;
  const perView = layouts ? Object.keys(layouts.desktop).length : 0;
  const mobilePerView = layouts?.mobilePerView || perView;
  const area = ([col, row, colSpan, rowSpan]) => `${row} / ${col} / span ${rowSpan} / span ${colSpan}`;
  const more = $('[data-gallery-more]');
  const moreLink = $('[data-gallery-more-link]');

  const showCategory = (filter, total, moreHref) => {
    const visible = items.filter((i) => filter === 'all' || i.dataset.category === filter).slice(0, perView);
    const mobileCount = Math.min(visible.length, mobilePerView);
    const slots = layouts.desktop[visible.length] || [];
    const mobileSlots = layouts.mobile[mobileCount] || [];
    items.forEach((item) => {
      item.classList.add('is-hidden');
      item.classList.remove('is-phone-hidden');
      item.style.removeProperty('--area');
      item.style.removeProperty('--area-m');
    });
    visible.forEach((item, index) => {
      item.style.setProperty('--area', area(slots[index]));
      if (index < mobileCount) item.style.setProperty('--area-m', area(mobileSlots[index]));
      else item.classList.add('is-phone-hidden');
      item.classList.remove('is-hidden');
    });

    if (more) {
      more.hidden = total <= mobilePerView;
      more.classList.toggle('is-phone-only', total <= perView);
      if (moreHref) moreLink.href = moreHref; // each filter button carries its "Show more" link
    }
  };

  let activeFlip = null;
  $$('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!layouts || button.classList.contains('is-active')) return;
      $$('[data-filter]').forEach((b) => {
        b.classList.toggle('is-active', b === button);
        b.setAttribute('aria-pressed', String(b === button));
      });
      // Once someone filters, every photo counts as revealed: cancel any scroll reveal
      // still pending so the filter animation is the only effect they see.
      items.forEach((item) => { item.dataset.revealed = 'true'; });
      if (hasGsap) {
        gsap.killTweensOf(items);
        gsap.set(items, { clearProps: 'opacity,transform' });
      }
      const animate = hasGsap && window.Flip && !reducedMotion;
      if (!animate) {
        showCategory(button.dataset.filter, Number(button.dataset.total), button.dataset.moreHref);
        return;
      }
      activeFlip?.progress(1); // finish any animation still running from a quick previous click
      const startHeight = gallery.offsetHeight;
      gsap.killTweensOf(gallery);
      gallery.style.height = '';
      const state = Flip.getState(items);
      showCategory(button.dataset.filter, Number(button.dataset.total), button.dataset.moreHref);
      const endHeight = gallery.offsetHeight;
      // Flip lifts the photos out of the layout while they move, which would collapse the
      // gallery and let the next section jump up – so hold its height and ease it instead.
      gsap.fromTo(gallery, { height: startHeight }, { height: endHeight, duration: 0.8, ease: 'power3.inOut', clearProps: 'height' });
      activeFlip = Flip.from(state, {
        duration: 0.8, ease: 'power3.inOut', absolute: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.6, delay: 0.2 }),
        onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.9, duration: 0.35 }),
        onComplete: () => ScrollTrigger.refresh(),
      });
    });
  });

  const lightbox = $('[data-lightbox-root]');
  if (lightbox && items.length) {
    const img = $('[data-lightbox-img]', lightbox);
    const caption = $('[data-lightbox-caption]', lightbox);
    let current = 0;
    const visible = () => items.filter((i) => !i.classList.contains('is-hidden') && !(phone.matches && i.classList.contains('is-phone-hidden')));
    const show = (item) => {
      const source = $('img', item);
      img.src = source.dataset.full || source.currentSrc || source.src;
      img.alt = source.alt;
      caption.textContent = $('strong', item).textContent;
      current = visible().indexOf(item);
    };
    const open = (item) => {
      show(item);
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      lockScroll(true);
      $('[data-lightbox-close]', lightbox).focus();
    };
    const close = () => {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      lockScroll(false);
    };
    const go = (dir) => {
      const list = visible();
      show(list[(current + dir + list.length) % list.length]);
    };
    items.forEach((item) => $('[data-lightbox]', item).addEventListener('click', () => open(item)));
    $('[data-lightbox-close]', lightbox).addEventListener('click', close);
    $('[data-lightbox-prev]', lightbox).addEventListener('click', () => go(-1));
    $('[data-lightbox-next]', lightbox).addEventListener('click', () => go(1));
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { close(); closeMenu(); }
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    });
  }

  /* ------------------------------------------------------------------
     Service cards: 3D tilt + spotlight
  ------------------------------------------------------------------ */
  if (canHover && !reducedMotion) {
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
        card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 7}deg) rotateY(${(x - 0.5) * 7}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* ------------------------------------------------------------------
     Footer wordmark: scale it so it spans the full width on any screen
  ------------------------------------------------------------------ */
  const wordmark = $('[data-wordmark-text]');
  if (wordmark) {
    // Scale proportionally to the target width. Re-runs whenever the text or the
    // footer changes size – including when the web font finishes loading.
    let refreshTimer;
    const fitWordmark = () => {
      const target = wordmark.parentElement.clientWidth * 0.96;
      const current = wordmark.offsetWidth;
      if (!current || Math.abs(current - target) < 1) return;
      const size = parseFloat(getComputedStyle(wordmark).fontSize);
      wordmark.style.fontSize = `${(size * target) / current}px`;
      // The page height just changed – let the scroll animations re-measure.
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => window.ScrollTrigger?.refresh(), 150);
    };
    const observer = new ResizeObserver(fitWordmark);
    observer.observe(wordmark);
    observer.observe(wordmark.parentElement);
    document.fonts?.ready.then(fitWordmark);
  }

  /* ------------------------------------------------------------------
     Everything below needs GSAP
  ------------------------------------------------------------------ */
  const preloader = $('.preloader');
  if (!hasGsap) {
    preloader?.classList.add('is-done');
    return;
  }

  // Wrap every word in a span so it can be animated (keeps <em> etc. intact).
  const splitWords = (el, masked = true) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      node.textContent.split(/([ \t\n\r]+)/).forEach((part) => {
        if (!part) return;
        if (/^[ \t\n\r]+$/.test(part)) { frag.append(' '); return; }
        const inner = document.createElement('span');
        inner.className = masked ? 'wi' : 'sw';
        inner.textContent = part;
        if (masked) {
          const outer = document.createElement('span');
          outer.className = 'w';
          outer.append(inner);
          frag.append(outer);
        } else {
          frag.append(inner);
        }
      });
      node.replaceWith(frag);
    });
    return $$(masked ? '.wi' : '.sw', el);
  };

  gsap.config({ nullTargetWarn: false }); // not every page has every section

  // Phones and tablets get lighter versions of the heavier effects: whole headings fade and rise
  // instead of every word moving in its own clipped box, and the hero photo fades in instead of a
  // clip-path wipe (which is repainted on every frame).
  const lightMotion = !canHover || window.matchMedia('(max-width: 900px)').matches;

  /* ---------- Hero intro (runs after the preloader) ---------- */
  const hero = $('.hero');
  const heroWords = hero && !lightMotion ? splitWords($('.hero__title')) : [];
  const heroBits = $$('.hero__eyebrow, .hero__lead, .hero__cta, .hero__trust');
  const heroLeaves = $$('.hero .leaf');
  if (hero && !reducedMotion) {
    if (lightMotion) gsap.set('.hero__title', { opacity: 0, y: 40 });
    else gsap.set(heroWords, { yPercent: 115 });
    gsap.set(heroBits, { opacity: 0, y: 30 });
    if (lightMotion) gsap.set('.hero__arch', { opacity: 0, y: 70 });
    else gsap.set('.hero__arch', { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set('.hero__arch img', { scale: 1.35 });
    gsap.set('.hero__arch-line', { opacity: 0 });
    gsap.set('.hero__inset', { opacity: 0, y: 60 });
    gsap.set(heroLeaves, { opacity: 0, scale: 0.6 });
    gsap.set('.nav__inner', { opacity: 0, y: -30 });
  }

  const intro = () => {
    preloader?.classList.add('is-done');
    if (!hero || reducedMotion) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.nav__inner', { opacity: 1, y: 0, duration: 1.2 }, 0.1)
      .to(lightMotion ? '.hero__title' : heroWords, lightMotion
        ? { opacity: 1, y: 0, duration: 1.3, clearProps: 'opacity,transform' }
        : { yPercent: 0, duration: 1.4, stagger: 0.07 }, 0.15)
      .to('.hero__arch', lightMotion
        ? { opacity: 1, y: 0, duration: 1.4, clearProps: 'opacity,transform' }
        : { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut', clearProps: 'clipPath' }, 0.1)
      .to('.hero__arch img', { scale: 1.06, duration: 2.4 }, 0.3)
      .to('.hero__arch-line', { opacity: 1, duration: 1.6 }, 1.0)
      .to('.hero__inset', { opacity: 1, y: 0, duration: 1.4 }, 0.9)
      .to(heroLeaves, { opacity: 1, scale: 1, duration: 1.8, stagger: { each: 0.08, from: 'random' } }, 0.6)
      .to(heroBits, { opacity: 1, y: 0, duration: 1.2, stagger: 0.08 }, 0.5);
  };

  // Leaves and photos shift with the mouse – deeper layers move further.
  if (hero && canHover && !reducedMotion) {
    const layers = $$('.hero [data-depth]').map((el) => ({
      depth: Number(el.dataset.depth),
      x: gsap.quickTo(el, 'x', { duration: 1.4, ease: 'power3.out' }),
      y: gsap.quickTo(el, 'yPercent', { duration: 1.4, ease: 'power3.out' }),
    }));
    hero.addEventListener('pointermove', (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      layers.forEach(({ depth, x, y }) => { x(nx * depth); y(ny * depth * 0.15); });
    });
  }
  let introPlayed = false;
  const heroImg = $('.hero__arch img');
  const playIntro = () => {
    if (introPlayed) return;
    introPlayed = true;
    // Decode the photo up front – otherwise the phone decodes it mid-animation and the reveal stalls.
    Promise.race([heroImg?.decode?.(), new Promise((resolve) => setTimeout(resolve, 600))])
      .catch(() => {})
      .then(intro);
  };
  if (document.readyState === 'complete') setTimeout(playIntro, 300);
  else window.addEventListener('load', () => setTimeout(playIntro, 200));
  setTimeout(playIntro, 2500); // never keep people waiting on slow images

  if (reducedMotion) return;

  /* ---------- Section headings: word-by-word reveal (desktop) ---------- */
  if (!lightMotion) {
    $$('[data-split]').forEach((el) => {
      if (el.classList.contains('hero__title')) return;
      const words = splitWords(el);
      gsap.from(words, {
        yPercent: 115, duration: 1.2, ease: 'expo.out', stagger: 0.05,
        scrollTrigger: { trigger: el, start: 'top 85%' },
      });
    });

    /* ---------- About paragraph lights up word by word as you scroll (desktop) ---------- */
    $$('[data-scrub-text]').forEach((el) => {
      const words = splitWords(el, false);
      gsap.fromTo(words, { opacity: 0.15 }, {
        opacity: 1, stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 50%', scrub: true },
      });
    });
  }

  /* ---------- Generic fade-up reveals ---------- */
  // CSS transitions (.reveal in main.css) rather than JS tweens: the browser runs them off the
  // main thread, so they stay smooth while the page scrolls and the 3D tree renders. Elements
  // that come into view together are staggered slightly; once done, the reveal classes are
  // removed so each element's own hover/active styles take over again.
  const revealObserver = new IntersectionObserver((entries) => {
    entries.filter((entry) => entry.isIntersecting).forEach((entry, index) => {
      const el = entry.target;
      revealObserver.unobserve(el);
      el.style.transitionDelay = `${index * 0.08}s`;
      el.classList.add('is-revealed');
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  const fadeUp = (selector) => $$(selector).forEach((el) => {
    el.classList.add('reveal');
    el.addEventListener('transitionend', function done(e) {
      if (e.target !== el || e.propertyName !== 'translate') return;
      el.removeEventListener('transitionend', done);
      el.classList.remove('reveal', 'is-revealed');
      el.style.transitionDelay = '';
    });
    revealObserver.observe(el);
  });
  fadeUp('.eyebrow:not(.hero__eyebrow)');
  fadeUp('.section-head__lead, .about__body, .contact__lead, .stat, .rating-card');
  // Cards in sideways-scrolling rows (services on phones, reviews) reveal row by row, not as each
  // card is scrolled or drifts into view from the side.
  fadeUp($$('.services__row.is-marquee').length ? '.services__row' : '.service-card');
  fadeUp('.reviews__rail');
  fadeUp('.contact__ticks li, .contact-tile');
  // On phones the step cards sit in a sideways row inside the sticky panel – no reveal there
  if (!lightMotion) fadeUp('.process__step');
  fadeUp('.band .btn');
  // Phones: headings and the About paragraph rise in as whole blocks (see lightMotion above)
  if (lightMotion) fadeUp('[data-split]:not(.hero__title), [data-scrub-text]');

  /* ---------- Gallery images: simple pop-in ---------- */
  // Photos start hidden (so none flash fully visible before their turn) and each one
  // pops in exactly once – and only after its image has loaded, so a tile never
  // appears empty and then pops a second time when the photo arrives.
  const HIDDEN = { opacity: 0, scale: 0.9 };
  const galleryItems = $$('.gallery__item');
  gsap.set(galleryItems, HIDDEN);
  const imageReady = (img) => (img.complete && img.naturalWidth)
    ? Promise.resolve()
    : new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  const reveal = (item, delay) => {
    if (item.dataset.revealed) return;
    item.dataset.revealed = 'true';
    gsap.fromTo(item, HIDDEN, {
      opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.6)', delay, clearProps: 'opacity,transform',
    });
  };
  ScrollTrigger.batch(galleryItems, {
    start: 'top 95%',
    once: true,
    onEnter: (batch) => batch.forEach((item, index) => {
      const img = $('img', item);
      img.loading = 'eager'; // it's on screen now – fetch it straight away
      imageReady(img).then(() => reveal(item, index * 0.08));
    }),
  });

  /* ---------- Footer wordmark: letters rise in as you reach the bottom ---------- */
  const wordmarkLetters = $$('[data-wordmark-text] span');
  if (wordmarkLetters.length) {
    gsap.fromTo(wordmarkLetters, { yPercent: 100, opacity: 0 }, {
      yPercent: 0, opacity: 1, ease: 'power2.out', stagger: 0.06,
      scrollTrigger: { trigger: '[data-wordmark]', start: 'top bottom', end: 'max', scrub: 0.6 }, // fully risen at the very bottom
    });
  }

  /* ---------- Counters ---------- */
  $$('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    const counter = { v: 0 };
    el.textContent = '0';
    gsap.to(counter, {
      v: target, duration: 2, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => { el.textContent = Math.round(counter.v); },
    });
  });

  /* ---------- Parallax ---------- */
  // Touch screens scroll off the main thread, so JS-driven parallax trails a frame
  // behind and judders. There the browser runs it instead (CSS scroll-driven
  // animations in main.css); without that support the layers simply stay put.
  if (!canHover) {
    $$('[data-parallax]').forEach((el) => el.style.setProperty('--parallax', `${Number(el.dataset.parallax) * 4}px`));
    if (CSS.supports('animation-timeline: view()')) root.classList.add('css-parallax');
  } else {
    $$('[data-parallax]').forEach((el) => {
      const speed = Number(el.dataset.parallax);
      gsap.to(el, {
        y: speed * 4, ease: 'none',
        scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
    $$('.about__img img').forEach((img) => {
      gsap.fromTo(img, { yPercent: -12 }, {
        yPercent: 0, ease: 'none',
        scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
    $$('[data-parallax-bg]').forEach((el) => {
      gsap.fromTo(el, { yPercent: -14 }, {
        yPercent: 14, ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  }
  // Only when text and photos sit side by side – when stacked, it would slide over the photos.
  gsap.matchMedia().add('(min-width: 901px)', () => {
    gsap.to('.hero__content', {
      y: 140, opacity: 0.15, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
  });

  /* ---------- Marquee: speeds up and flips with scroll direction (desktop) ---------- */
  const marquee = $('[data-marquee]');
  if (marquee && !canHover) {
    // Touch screens: a steady CSS loop that ignores scrolling (see .css-marquee in main.css)
    root.classList.add('css-marquee');
  } else if (marquee) {
    const loop = gsap.to(marquee, { xPercent: -50, ease: 'none', duration: 32, repeat: -1 });
    loop.totalTime(loop.duration() * 100); // allow playing backwards
    let boost = 0, direction = 1;
    ScrollTrigger.create({
      onUpdate: (self) => {
        direction = self.direction;
        boost = Math.min(6, Math.abs(self.getVelocity()) / 250);
      },
    });
    gsap.ticker.add(() => {
      boost *= 0.93;
      loop.timeScale(direction * (1 + boost));
    });
  }

  /* ---------- Process: drive the steps + the 3D growing tree ---------- */
  const process = $('[data-process]');
  if (process) {
    const steps = $$('[data-step]', process);
    const bar = $('[data-process-bar]', process);
    const publish = (progress) => {
      window.rsGrowProgress = progress;
      window.dispatchEvent(new CustomEvent('rs:grow', { detail: { progress } }));
      bar.style.transform = `scaleX(${progress})`;
    };
    let activeIndex = 0;
    // Returns true when a different step became active.
    const highlightStep = (progress) => {
      const index = Math.min(steps.length - 1, Math.floor(progress * steps.length));
      if (index === activeIndex) return false;
      activeIndex = index;
      steps.forEach((s, i) => s.classList.toggle('is-active', i === index));
      return true;
    };
    const mm = gsap.matchMedia();
    // Desktop pins with ScrollTrigger. Phones use CSS position: sticky instead (main.css):
    // iOS scrolls on its own thread, so a JS pin lags behind and jumps when it lets go.
    const panel = $('.process__sticky', process);
    const pin = (distance) => ({
      trigger: panel, pin: true, start: 'top top', end: () => `+=${window.innerHeight * distance}`,
      anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 1,
    });
    mm.add('(min-width: 901px)', () => {
      ScrollTrigger.create({
        ...pin(2.8),
        onUpdate: (self) => {
          publish(self.progress);
          highlightStep(self.progress);
        },
      });
    });
    // Phones: the panel sticks via CSS while the (taller) section scrolls past, and the step
    // cards (one row) glide over to each new step as the tree grows. One tween per step change
    // rather than one per scroll frame, kept on the GPU (force3D) so it never drops back to
    // repainting between tweens.
    mm.add('(max-width: 900px)', () => {
      const track = $('.process__steps', process);
      const slide = (index, duration) => gsap.to(track, {
        x: -Math.min(steps[index].offsetLeft - steps[0].offsetLeft, track.scrollWidth - track.clientWidth),
        duration, ease: 'power3.out', force3D: true, overwrite: true,
      });
      slide(activeIndex, 0);
      ScrollTrigger.create({
        trigger: process, start: 'top top', end: 'bottom bottom', invalidateOnRefresh: true,
        onUpdate: (self) => {
          publish(self.progress);
          if (highlightStep(self.progress)) slide(activeIndex, 0.6);
        },
        onRefresh: () => slide(activeIndex, 0),
      });
      return () => gsap.set(track, { clearProps: 'x' });
    });
  }

  /* ---------- Magnetic buttons ---------- */
  if (canHover) {
    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4, ease: 'power3.out' });
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' }));
    });
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
