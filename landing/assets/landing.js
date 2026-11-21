/* پروژه‌یار — لندینگ: حرکت‌ها و تعامل‌ها
   همه‌چیز بدون کتابخانه؛ با prefers-reduced-motion حرکت‌های پیوسته خاموش می‌شوند. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fa = (n, d = 0) =>
    new Intl.NumberFormat('fa-IR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

  /* ───────── تقسیم متن به کلمه ───────── */
  function splitWords(el, inner) {
    let i = 0;
    const walk = (node, grad) => {
      Array.from(node.childNodes).forEach((ch) => {
        if (ch.nodeType === 3) {
          const parts = ch.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            if (inner) {
              const s = document.createElement('span');
              s.textContent = p;
              s.style.setProperty('--i', i);
              if (grad) s.className = 'grad-text';
              w.appendChild(s);
            } else {
              w.textContent = p;
            }
            i++;
            frag.appendChild(w);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1 && ch.classList.contains('keep')) {
          // گروهی که نباید شکسته شود (مثل «MS Project»)
          const w = document.createElement('span');
          w.className = 'w';
          ch.replaceWith(w);
          if (inner) {
            const s = document.createElement('span');
            s.style.setProperty('--i', i);
            s.appendChild(ch);
            w.appendChild(s);
          } else {
            w.appendChild(ch);
          }
          i++;
        } else if (ch.nodeType === 1) {
          const isGrad = ch.classList.contains('grad-text');
          walk(ch, grad || isGrad);
          if (isGrad && inner) ch.classList.remove('grad-text');
        }
      });
    };
    walk(el, false);
    return $$('.w', el);
  }

  $$('[data-split]').forEach((el) => splitWords(el, true));
  const scrubs = $$('[data-scrub]').map((el) => ({ el, words: splitWords(el, false) }));

  requestAnimationFrame(() => {
    document.body.classList.add('loaded');
    $$('[data-split]').forEach((el) => el.classList.add('in'));
  });

  /* ───────── ریبون سه‌بعدی (canvas) ───────── */
  class Ribbon {
    constructor(canvas, variant) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.v = variant;
      this.t = variant === 'final' ? 40 : 0;
      this.mx = 0; this.my = 0; this.tx = 0; this.ty = 0;
      this.visible = true;
      this.resize();
      new ResizeObserver(() => this.resize()).observe(canvas);
      new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }).observe(canvas);
      if (variant === 'hero') {
        canvas.parentElement.addEventListener('pointermove', (e) => {
          const r = canvas.getBoundingClientRect();
          this.tx = (e.clientX - r.left) / r.width - 0.5;
          this.ty = (e.clientY - r.top) / r.height - 0.5;
        });
      }
    }
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = this.c.clientWidth; this.h = this.c.clientHeight;
      this.c.width = Math.round(this.w * dpr); this.c.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.draw();
    }
    draw() {
      const { ctx, w, h } = this;
      if (!w || !h) return;
      const t = this.t;
      this.mx += (this.tx - this.mx) * 0.04;
      this.my += (this.ty - this.my) * 0.04;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      const mobile = w < 700;
      const LINES = mobile ? 42 : 72;
      const SEG = mobile ? 70 : 120;
      const final = this.v === 'final';
      const cx = final ? w * 0.28 : w * (mobile ? 0.5 : 0.36);
      const cy = final ? h * 0.62 : h * (mobile ? 0.7 : 0.6);
      const sx = (final ? 0.55 : mobile ? 0.75 : 0.5) * w;
      const sy = h * (final ? 0.5 : 0.62);
      const grad = ctx.createLinearGradient(cx - sx, 0, cx + sx, 0);
      grad.addColorStop(0, 'rgba(138,162,194,1)');
      grad.addColorStop(0.42, 'rgba(244,177,124,1)');
      grad.addColorStop(0.62, 'rgba(200,214,232,1)');
      grad.addColorStop(1, 'rgba(44,74,115,1)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      for (let i = 0; i < LINES; i++) {
        const v = i / (LINES - 1);
        ctx.beginPath();
        for (let j = 0; j <= SEG; j++) {
          const u = j / SEG;
          const X = (u - 0.5) * 2.2;
          const width = 0.42 + 0.34 * Math.sin(u * 2.1 + t * 0.21 + this.mx * 0.8);
          const Y =
            (v - 0.5) * width +
            0.34 * Math.sin(u * 3.1 + t * 0.32 + v * 1.6) +
            0.13 * Math.cos(u * 6.3 - t * 0.23 + v * 2.8) +
            this.my * 0.12 * Math.sin(u * 3);
          const Z = 0.85 * Math.cos(u * 2.3 + v * 1.25 + t * 0.18) + 0.45 * v;
          const p = 2.7 / (2.7 + Z);
          const x = cx + X * sx * p;
          const y = cy + Y * sy * p;
          if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        const edge = Math.sin(v * Math.PI);
        ctx.globalAlpha = (final ? 0.05 : 0.075) + edge * (final ? 0.12 : 0.17);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    tick(dt) {
      if (!this.visible) return;
      this.t += dt * 0.00055;
      this.draw();
    }
  }
  const ribbons = $$('[data-ribbon]').map((c) => new Ribbon(c, c.dataset.ribbon));
  if (!reduced) {
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(now - last, 50);
      last = now;
      ribbons.forEach((r) => r.tick(dt));
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ───────── منحنی S (اعداد = مثال مرجع؛ تاریخ داده = ماه ۷) ───────── */
  const PV = [0, 20, 60, 120, 200, 300, 420, 550, 670, 780, 870, 940, 1000];
  const EV = [0, 15, 50, 100, 170, 260, 370, 490];
  const AC = [0, 18, 55, 110, 185, 280, 395, 520];
  const FC = [520, 640, 760, 880, 980, 1061.2245];
  const X0 = 44, X1 = 626, Y0 = 228, YMAX = 1100, YH = 206;
  const px = (i) => X0 + (i * (X1 - X0)) / 12;
  const py = (v) => Y0 - (v / YMAX) * YH;
  const smooth = (pts) => {
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  };
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    parent && parent.appendChild(e);
    return e;
  };
  function buildCurve(svg) {
    const grid = mk('g', { class: 'grid' }, svg);
    const axis = mk('g', { class: 'axis' }, svg);
    [0, 250, 500, 750, 1000].forEach((v) => {
      mk('line', { x1: X0, x2: X1, y1: py(v), y2: py(v) }, grid);
      mk('text', { x: X0 - 8, y: py(v) + 3, 'text-anchor': 'end' }, axis).textContent = fa(v);
    });
    const months = ['فروردین', 'تیر', 'مهر', 'دی', 'فروردین'];
    [0, 3, 6, 9, 12].forEach((m, k) => {
      mk('text', { x: px(m), y: Y0 + 20, 'text-anchor': 'middle' }, axis).textContent = months[k];
    });
    const evPts = EV.map((v, i) => [px(i), py(v)]);
    const area = mk('path', { class: 'area', d: `${smooth(evPts)} L${px(7)},${Y0} L${px(0)},${Y0} Z`, fill: 'rgba(22,163,74,.08)' }, svg);
    area.setAttribute('aria-hidden', 'true');
    mk('line', { class: 'today', x1: px(7), x2: px(7), y1: 14, y2: Y0 }, svg);
    mk('text', { class: 'today-l', x: px(7) + 5, y: 22 }, svg).textContent = 'امروز';
    const lines = [
      ['pv', PV.map((v, i) => [px(i), py(v)]), 'var(--info-500)', ''],
      ['ev', evPts, 'var(--success-500)', ''],
      ['ac', AC.map((v, i) => [px(i), py(v)]), 'var(--error-500)', ''],
      ['fc', FC.map((v, i) => [px(i + 7), py(v)]), 'var(--gray-400)', '5 5'],
    ];
    lines.forEach(([cls, pts, color]) => {
      const p = mk('path', { class: `l ${cls}`, d: smooth(pts), stroke: color }, svg);
      const len = Math.ceil(p.getTotalLength ? p.getTotalLength() : 900);
      p.style.setProperty('--len', len);
    });
    [[EV[7], 'var(--success-500)'], [AC[7], 'var(--error-500)'], [PV[7], 'var(--info-500)']].forEach(([v, c]) => {
      mk('circle', { class: 'dot', cx: px(7), cy: py(v), r: 4, fill: '#fff', stroke: c, 'stroke-width': 2.2 }, svg);
    });
    // پیش‌بینی با خط‌چین: بعد از کشیده شدن، dash واقعی جایگزین می‌شود
    const fc = svg.querySelector('path.fc');
    fc.addEventListener('transitionend', () => { fc.style.strokeDasharray = '5 6'; fc.style.strokeDashoffset = '0'; fc.style.transition = 'none'; }, { once: true });
  }
  $$('[data-scurve]').forEach(buildCurve);

  /* ───────── شمارنده‌ها ───────── */
  function runCounters(root) {
    $$('[data-count]', root).forEach((el) => {
      if (el.dataset.done) return;
      el.dataset.done = '1';
      const to = parseFloat(el.dataset.count);
      const d = parseInt(el.dataset.dec || '0', 10);
      if (reduced) { el.textContent = fa(to, d); return; }
      const start = performance.now();
      const dur = 1600;
      const step = (now) => {
        const k = clamp((now - start) / dur);
        const e = 1 - Math.pow(1 - k, 4);
        el.textContent = fa(to * e, d);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  function goLive(app) {
    if (!app || app.classList.contains('is-live')) return;
    app.classList.add('is-live');
    runCounters(app);
  }

  /* ───────── نسخهٔ دوم داشبورد و گوشی ───────── */
  const app1 = $('[data-app]');
  const cmdScreen = $('#cmdScreen');
  const app2 = app1.cloneNode(true);
  $$('[data-count]', app2).forEach((el) => delete el.dataset.done);
  const dim = document.createElement('div');
  dim.className = 'tour-dim';
  app2.appendChild(dim);
  cmdScreen.prepend(app2);

  const phone1 = $('[data-phone]');
  const phone2 = phone1.cloneNode(true);
  $('[data-phone-slot]').appendChild(phone2);

  /* ───────── مقیاس رابط داخل لپ‌تاپ ───────── */
  function fitScreens() {
    $$('[data-screen]').forEach((sc) => {
      const app = $('.app', sc);
      const s = sc.clientWidth / 1200;
      app.style.transform = `scale(${s})`;
      sc.style.height = `${740 * s}px`;
    });
  }
  fitScreens();
  window.addEventListener('resize', fitScreens);

  /* ───────── ظاهر شدن با ورود به دید ───────── */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    }),
    { threshold: 0.18, rootMargin: '0px 0px -6% 0px' }
  );
  $$('.rv, .rv-scale').forEach((el) => io.observe(el));

  new IntersectionObserver(([e], obs) => {
    if (e.isIntersecting) { goLive(app2); obs.disconnect(); }
  }, { threshold: 0.35 }).observe(cmdScreen);

  /* ───────── نور دنبال نشانگر روی کارت‌ها ───────── */
  $$('.feat').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  /* ───────── نوار حرکت بی‌پایان ───────── */
  const mq = $('[data-marquee]');
  if (mq) mq.innerHTML += mq.innerHTML;

  /* ───────── حرکت‌های وابسته به اسکرول ───────── */
  const nav = $('#nav');
  const heroCard = $('#heroCard');
  const laptop = $('#laptop');
  const phoneFloat = $('#phoneFloat');
  const nights = $$('[data-night]');
  const loopSec = $('[data-loop]');
  const steps = $$('[data-step]', loopSec);
  const loopN = $('[data-loop-n]');
  const cmdLaptop = $('#cmdStage .laptop');
  const roles = $$('.role');

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  function update() {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;

    nav.classList.toggle('scrolled', y > 20);
    const navY = nav.offsetHeight / 2;
    nav.classList.toggle('on-dark', nights.some((n) => {
      const r = n.getBoundingClientRect();
      return r.top <= navY && r.bottom >= navY;
    }));

    // قهرمان: کوچک و کم‌رنگ شدن هم‌زمان با بالا آمدن لپ‌تاپ
    const hp = clamp(y / (vh * 0.85));
    if (!reduced) {
      heroCard.style.setProperty('--hero-s', (1 - hp * 0.035).toFixed(4));
      heroCard.style.setProperty('--hero-o', (1 - hp * 1.25).toFixed(3));
      heroCard.style.setProperty('--hero-y', `${(-hp * 50).toFixed(1)}px`);
      const q = clamp(y / (vh * 0.65));
      const e = 1 - Math.pow(1 - q, 3);
      laptop.style.setProperty('--lt-y', `${((1 - e) * 140).toFixed(1)}px`);
      laptop.style.setProperty('--lt-r', `${((1 - e) * 24).toFixed(2)}deg`);
      laptop.style.setProperty('--lt-s', (0.9 + e * 0.1).toFixed(4));
      phoneFloat.style.setProperty('--ph-y', `${((1 - e) * 260).toFixed(1)}px`);
      if (q > 0.45) { goLive(app1); phone1.classList.add('is-live'); }
    }

    // پنل‌های تیره: از قاب باریک تا تمام‌عرض
    nights.forEach((n) => {
      const r = n.getBoundingClientRect();
      const t = clamp((vh - r.top) / (vh * 0.75));
      n.style.setProperty('--np', reduced ? '0%' : `${((1 - t) * 5).toFixed(2)}%`);
    });

    // تیترهای روشن‌شونده
    scrubs.forEach(({ el, words }) => {
      const r = el.getBoundingClientRect();
      const p = reduced ? 1 : clamp((vh * 0.88 - r.top) / (vh * 0.42));
      const on = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < on));
    });

    // حلقهٔ پین‌شده
    if (loopSec) {
      const r = loopSec.getBoundingClientRect();
      const pinned = getComputedStyle($('.loop-pin', loopSec)).position === 'sticky';
      let active;
      if (pinned && !reduced) {
        const p = clamp(-r.top / (r.height - vh));
        active = Math.min(steps.length, 1 + Math.floor(p * steps.length * 0.999));
      } else {
        active = steps.length;
        steps.forEach((s, i) => { if (s.getBoundingClientRect().top > vh * 0.85) active = Math.min(active, i); });
        active = Math.max(active, 1);
      }
      steps.forEach((s, i) => { s.classList.toggle('on', i < active); s.classList.toggle('now', i === active - 1); });
      loopSec.style.setProperty('--lp', ((active - 1) / (steps.length - 1)).toFixed(3));
      if (loopN) loopN.textContent = fa(0) + fa(active);
    }

    // لپ‌تاپ مرکز فرمان
    if (cmdLaptop && !reduced) {
      const r = cmdLaptop.getBoundingClientRect();
      const t = clamp((vh - r.top) / (vh * 0.85));
      cmdLaptop.style.setProperty('--cr', `${((1 - t) * 20).toFixed(2)}deg`);
      cmdLaptop.style.setProperty('--cs', (0.9 + t * 0.1).toFixed(4));
    }

    // کارت‌های نقش: کارت زیرین با آمدن کارت بعدی کوچک و تیره می‌شود
    if (!reduced) {
      const rects = roles.map((r) => r.getBoundingClientRect());
      roles.forEach((role, i) => {
        let s = 0;
        for (let j = i + 1; j < roles.length; j++) s += clamp((vh * 0.85 - rects[j].top) / (vh * 0.55));
        role.style.setProperty('--rs', (1 - Math.min(s, 4) * 0.035).toFixed(4));
        role.style.setProperty('--rb', (1 - Math.min(s, 4) * 0.12).toFixed(3));
      });
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
  if (reduced) { goLive(app1); phone1.classList.add('is-live'); }

  /* ───────── تور داشبورد ───────── */
  const tourCard = $('#tourCard');
  const tourTitle = $('#tourTitle');
  const tourText = $('#tourText');
  const tourFoot = $('#tourFoot');
  const cmdStage = $('#cmdStage');
  const TOUR = [
    { k: '1', t: 'پیشرفت از گزارش‌های تأییدشده', p: 'پیشرفت فیزیکی واقعی <b>۴۹٫۲٪</b> در برابر <b>۵۵٪</b> برنامه‌ای است. انحراف −۵٫۸ واحد یعنی وضعیت «هشدار».', pos: 'low' },
    { k: '2', t: 'شاخص عملکرد هزینه', p: 'CPI = EV ÷ AC = ۴۹۰ ÷ ۵۲۰ = <b>۰٫۹۴</b>. برای هر ریال کار انجام‌شده حدود ۱٫۰۶ ریال خرج شده است.', pos: 'low' },
    { k: '3', t: 'پیش‌بینی هزینهٔ تمام‌شده', p: 'اگر روند فعلی ادامه یابد، پروژه <b>۱٬۰۶۱٫۲</b> میلیارد ریال تمام می‌شود؛ <b>۶۱٫۲</b> بیش از بودجه.', pos: 'low' },
    { k: '4', t: 'منحنی S', p: 'برنامه، ارزش کسب‌شده و هزینهٔ واقعی تا امروز کنار هم؛ فاصلهٔ خط سبز تا آبی همان عقب‌ماندگی است.', pos: 'high' },
    { k: '5', t: 'هشدار با راهنمای اقدام', p: 'هر هشدار می‌گوید چه باید کرد و با یک کلیک به صفحهٔ همان کار می‌برد.', pos: 'high' },
  ];
  let tourI = -1;

  function placeTourCard() {
    const outside = window.innerWidth < 760;
    cmdStage.classList.toggle('cmd-tour-out', outside);
    if (outside && tourCard.parentElement !== cmdStage) cmdStage.appendChild(tourCard);
    if (!outside && tourCard.parentElement !== cmdScreen) cmdScreen.appendChild(tourCard);
  }
  placeTourCard();
  window.addEventListener('resize', placeTourCard);

  function btn(label, cls, fn) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `tbtn ${cls || ''}`;
    b.textContent = label;
    b.addEventListener('click', fn);
    return b;
  }
  function renderTour() {
    $$('.spot', app2).forEach((e) => e.classList.remove('spot'));
    tourCard.classList.remove('low', 'high');
    tourFoot.innerHTML = '';
    if (tourI < 0) {
      app2.classList.add('touring');
      tourTitle.textContent = 'این داشبورد پروژهٔ شماست';
      tourText.textContent = 'در پنج قدم ببینید اعداد از کجا می‌آیند. اعداد، مثال مرجع پروژه‌یارند.';
      tourFoot.appendChild(btn('شروع تور', 'pri', () => { tourI = 0; renderTour(); }));
      return;
    }
    if (tourI >= TOUR.length) {
      app2.classList.remove('touring');
      tourTitle.textContent = 'همین را با دادهٔ پروژهٔ خودتان ببینید';
      tourText.textContent = 'فایل MS Project یکی از پروژه‌هایتان را در جلسهٔ دمو بیاورید.';
      tourFoot.appendChild(btn('دوباره', '', () => { tourI = 0; renderTour(); }));
      const a = document.createElement('a');
      a.href = '#demo'; a.className = 'tbtn pri'; a.textContent = 'درخواست دمو';
      a.style.display = 'inline-grid'; a.style.placeItems = 'center';
      tourFoot.appendChild(a);
      return;
    }
    const s = TOUR[tourI];
    app2.classList.add('touring');
    $(`[data-tour="${s.k}"]`, app2).classList.add('spot');
    if (window.innerWidth >= 760) tourCard.classList.add(s.pos);
    tourTitle.textContent = s.t;
    tourText.innerHTML = s.p;
    const dots = document.createElement('span');
    dots.className = 'dots';
    TOUR.forEach((_, i) => { const d = document.createElement('i'); if (i === tourI) d.className = 'on'; dots.appendChild(d); });
    tourFoot.appendChild(dots);
    if (tourI > 0) tourFoot.appendChild(btn('قبلی', '', () => { tourI--; renderTour(); }));
    tourFoot.appendChild(btn(tourI === TOUR.length - 1 ? 'پایان' : 'بعدی', 'pri', () => { tourI++; renderTour(); }));
  }
  $('#tourStart').addEventListener('click', () => { tourI = 0; renderTour(); });
  app2.classList.add('touring');

  /* ───────── تب‌ها با پیشروی خودکار ───────── */
  const tabsNav = $('#tabsNav');
  const tabs = $$('[role="tab"]', tabsNav);
  const panels = $('#panels');
  let manual = false;
  let tabsVisible = false;

  function select(idx, focus) {
    tabs.forEach((t, i) => {
      const on = i === idx;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const p = document.getElementById(t.getAttribute('aria-controls'));
      p.hidden = !on;
      p.classList.remove('enter');
      if (on) { void p.offsetWidth; p.classList.add('enter'); }
    });
    if (focus) tabs[idx].focus();
    if (idx === 1) phone2.classList.add('is-live');
    if (window.innerWidth < 760) tabs[idx].scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduced ? 'auto' : 'smooth' });
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { manual = true; tabsNav.classList.add('manual'); select(i); });
    $('.prog', t).addEventListener('animationend', () => {
      if (manual || !tabsVisible) return;
      select((i + 1) % tabs.length);
    });
  });
  tabsNav.addEventListener('keydown', (e) => {
    const cur = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    let n = null;
    if (e.key === 'ArrowLeft') n = (cur + 1) % tabs.length;
    if (e.key === 'ArrowRight') n = (cur - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') n = 0;
    if (e.key === 'End') n = tabs.length - 1;
    if (n !== null) { e.preventDefault(); manual = true; tabsNav.classList.add('manual'); select(n, true); }
  });
  new IntersectionObserver(([e]) => {
    tabsVisible = e.isIntersecting;
    tabsNav.classList.toggle('tabs-paused', !tabsVisible);
  }, { threshold: 0.3 }).observe(panels);
  panels.addEventListener('pointerenter', () => tabsNav.classList.add('tabs-paused'));
  panels.addEventListener('pointerleave', () => { if (tabsVisible) tabsNav.classList.remove('tabs-paused'); });
  if (reduced) { manual = true; tabsNav.classList.add('manual'); }

  /* ───────── پرسش‌ها: باز و بسته شدن نرم ───────── */
  $$('.qa').forEach((d) => {
    const sum = $('summary', d);
    const body = $('.qa-body', d);
    sum.addEventListener('click', (e) => {
      e.preventDefault();
      if (d.open) {
        body.style.height = `${body.scrollHeight}px`;
        requestAnimationFrame(() => { body.style.height = '0px'; });
        const done = () => { d.open = false; body.removeEventListener('transitionend', done); };
        body.addEventListener('transitionend', done);
        if (reduced) done();
      } else {
        d.open = true;
        body.style.height = '0px';
        requestAnimationFrame(() => { body.style.height = `${body.scrollHeight}px`; });
        const done = () => { body.style.height = 'auto'; body.removeEventListener('transitionend', done); };
        body.addEventListener('transitionend', done);
        if (reduced) done();
      }
    });
  });

  /* ───────── فهرست موبایل ───────── */
  const menuBtn = $('#menuBtn');
  const navLinks = $('#navLinks');
  menuBtn.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('a', navLinks).forEach((a) => a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }));

  /* ───────── فرم دمو ───────── */
  const form = $('#demoForm');
  const note = $('#formNote');
  const toLatin = (s) => s.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const rules = {
    name: (v) => (v.trim().length >= 3 ? '' : 'نام و نام خانوادگی را بنویسید تا بدانیم با چه کسی هماهنگ کنیم.'),
    company: (v) => (v.trim().length >= 2 ? '' : 'نام شرکت را بنویسید.'),
    phone: (v) => (/^09\d{9}$/.test(toLatin(v).replace(/[\s-]/g, '')) ? '' : 'شمارهٔ همراه را ۱۱ رقمی و با ۰۹ بنویسید؛ مثل ۰۹۱۲۱۲۳۴۵۶۷.'),
  };
  const check = (input) => {
    const rule = rules[input.name];
    if (!rule) return true;
    const msg = rule(input.value);
    const f = input.closest('.field');
    f.classList.toggle('bad', !!msg);
    $('.err', f).textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };
  $$('input', form).forEach((inp) => {
    inp.addEventListener('blur', () => { if (inp.value) check(inp); });
    inp.addEventListener('input', () => {
      const f = inp.closest('.field');
      if (f.classList.contains('bad') && rules[inp.name] && !rules[inp.name](inp.value)) check(inp);
    });
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputs = $$('input', form);
    const ok = inputs.map(check).every(Boolean);
    if (!ok) { inputs.find((i) => i.getAttribute('aria-invalid') === 'true')?.focus(); return; }
    note.className = 'form-note';
    const endpoint = form.dataset.endpoint;
    if (!endpoint) {
      note.textContent = 'ارسال این فرم هنوز به سرور وصل نشده است؛ این صفحه پیش‌نمایش است.';
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    data.phone = toLatin(data.phone).replace(/[\s-]/g, '');
    const submit = $('button[type="submit"]', form);
    submit.disabled = true;
    note.textContent = 'در حال ارسال…';
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error(String(res.status));
      note.className = 'form-note ok';
      note.textContent = 'درخواست شما ثبت شد. برای هماهنگی جلسه با شما تماس می‌گیریم.';
      form.reset();
    } catch {
      note.textContent = 'ارسال انجام نشد. اتصال اینترنت را بررسی کنید و دوباره «ثبت درخواست دمو» را بزنید.';
    } finally {
      submit.disabled = false;
    }
  });
})();
