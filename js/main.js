/* ============================================================
   RIMAC NEVERA — main.js
   导航/进度/reveal/扭矩矢量实验台/纪录对比条/gauges/tabs/视频
   性能:geometry 惰性缓存,滚动帧内零 reflow,交互值 lerp 平滑
   ============================================================ */
(function () {
  'use strict';

  var doc = document, root = doc.documentElement;
  var IS_MOBILE = window.matchMedia('(max-width: 980px)').matches;
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 工具 ---------- */
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function onReady(fn) {
    if (doc.readyState !== 'loading') fn(); else doc.addEventListener('DOMContentLoaded', fn);
  }

  /* ---------- geometry 缓存 ---------- */
  var geo = { totalH: 0, chapTops: [] };
  function measure() {
    geo.totalH = doc.documentElement.scrollHeight - window.innerHeight;
    var breaks = Array.prototype.slice.call(doc.querySelectorAll('[data-chapter]'));
    geo.chapTops = breaks.map(function (b) {
      return b.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.4;
    });
  }
  window.addEventListener('resize', function () { measure(); update(); });
  window.addEventListener('load', measure);
  doc.addEventListener('load', function (e) {
    if (e.target && e.target.tagName === 'IMG') measure();
  }, true);

  /* ---------- 全局滚动回调 ---------- */
  var scrollFns = [];
  function update() {
    for (var i = 0; i < scrollFns.length; i++) scrollFns[i]();
  }
  window.addEventListener('scroll', update, { passive: true });

  /* ---------- Hero:入场 + 视差 + 移动端视频退化 ---------- */
  onReady(function () {
    var hero = doc.querySelector('.hero');
    if (!hero) return;
    if (IS_MOBILE) {
      var hv = hero.querySelector('video');
      if (hv) {
        hv.pause();
        hv.removeAttribute('autoplay');
        hv.preload = 'none';
        var hs = hv.querySelector('source');
        if (hs) hs.removeAttribute('src');
        hv.load();
      }
    }
    setTimeout(function () { hero.classList.add('is-in'); }, 60);
    var px = hero.querySelector('.hero__parallax');
    var hs = doc.querySelector('.hero__scroll');
    scrollFns.push(function () {
      if (!px || REDUCED) return;
      var y = window.scrollY;
      if (y < window.innerHeight * 1.4) {
        px.style.transform = 'scale(1.1) translateY(' + (y * 0.22).toFixed(1) + 'px)';
      }
      if (hs) hs.style.opacity = y > window.innerHeight * 0.5 ? '0' : '';
    });
  });

  /* ---------- 滚动显现(IntersectionObserver) ---------- */
  onReady(function () {
    var els = doc.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || REDUCED) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      triggerOnReveal(els);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          triggerOnReveal([en.target]);
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.1 });
    els.forEach(function (el) { io.observe(el); });
  });

  // reveal 触发时的联动(数据条动画)
  function triggerOnReveal(els) {
    Array.prototype.forEach.call(els, function (el) {
      if (el.classList && el.classList.contains('databar')) startDatabar(el);
    });
  }

  /* ---------- 纪录对比条(0-400-0) ---------- */
  function startDatabar(box) {
    var fills = box.querySelectorAll('.databar__fill');
    Array.prototype.forEach.call(fills, function (f, i) {
      var w = parseFloat(f.getAttribute('data-w')) || 0;
      setTimeout(function () { f.style.width = w + '%'; }, 260 + i * 340);
    });
  }

  /* ---------- 顶栏:章节标签 + 进度条 + 出现 ---------- */
  onReady(function () {
    var nowEl = doc.getElementById('navNow');
    var barEl = doc.getElementById('navBar');
    var nav = doc.getElementById('nav');
    var breaks = Array.prototype.slice.call(doc.querySelectorAll('[data-chapter]'));
    var heroEl = doc.querySelector('.hero');
    var heroH = heroEl ? window.innerHeight : 0;

    scrollFns.push(function () {
      var y = window.scrollY;
      if (barEl) barEl.style.width = (clamp01(y / Math.max(1, geo.totalH)) * 100).toFixed(2) + '%';
      if (nav) {
        nav.classList.toggle('is-hero', y < heroH - 40);
        nav.classList.toggle('is-solid', y >= heroH - 40);
      }
      if (nowEl && breaks.length) {
        var cur = 0;
        for (var i = 0; i < geo.chapTops.length; i++) {
          if (y >= geo.chapTops[i]) cur = i;
        }
        var b = breaks[cur];
        if (b) {
          var no = b.querySelector('.chapter-break__no');
          var h = b.querySelector('h2');
          var t = no ? no.textContent.trim() : '';
          var name = h ? h.childNodes[0].textContent.trim() : '';
          var label = t + ' · ' + name;
          if (nowEl.textContent !== label) nowEl.textContent = label;
        }
      }
    });
    measure();
    update();
  });

  /* ---------- 滚动进度表盘 ---------- */
  onReady(function () {
    var gauge = doc.getElementById('scrollGauge');
    if (!gauge) return;
    var bar = gauge.querySelector('.sg__bar');
    var num = gauge.querySelector('.sg__num');
    var CIRC = 119.4;
    scrollFns.push(function () {
      var p = clamp01(window.scrollY / Math.max(1, geo.totalH));
      gauge.classList.toggle('is-on', p > 0.02);
      bar.style.strokeDashoffset = (CIRC * (1 - p)).toFixed(1);
      var n = String(Math.round(p * 100));
      num.textContent = n.length < 2 ? '0' + n : n;
    });
    measure();
    update();
  });

  /* ---------- 章节菜单 ---------- */
  function closeMenu() {
    var overlay = doc.getElementById('menuOverlay');
    var btn = doc.getElementById('menuBtn');
    if (overlay) overlay.classList.remove('is-open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    doc.body.style.overflow = '';
  }
  onReady(function () {
    var overlay = doc.getElementById('menuOverlay');
    var btn = doc.getElementById('menuBtn');
    if (!overlay || !btn) return;
    btn.addEventListener('click', function () {
      var open = overlay.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      doc.body.style.overflow = open ? 'hidden' : '';
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeMenu();
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  });

  /* ---------- 锚点平滑滚动 ---------- */
  onReady(function () {
    doc.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      var el = id ? doc.getElementById(id) : null;
      if (!el) return;
      e.preventDefault();
      closeMenu();
      var y = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, y - 8), behavior: 'smooth' });
    });
  });

  /* ---------- 视频:进入视口播放/离开暂停(移动端不加载) ---------- */
  onReady(function () {
    if (IS_MOBILE) {
      var vs = doc.querySelectorAll('video[data-autoview]');
      vs.forEach(function (v) {
        v.pause();
        v.removeAttribute('autoplay');
        v.preload = 'none';
        var s = v.querySelector('source');
        if (s) s.setAttribute('data-src', s.getAttribute('src'));
        if (s) s.removeAttribute('src');
        v.load();
      });
      return;
    }
    var vids = Array.prototype.slice.call(doc.querySelectorAll('video[data-autoview]'));
    if (!vids.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) {
          var s = v.querySelector('source[data-src]');
          if (s) { s.setAttribute('src', s.getAttribute('data-src')); s.removeAttribute('data-src'); v.load(); }
          var pr = v.play();
          if (pr && pr.catch) pr.catch(function () {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.18 });
    vids.forEach(function (v) { io.observe(v); });
  });

  /* ---------- 背景视频(章节分隔页,移动端不加载) ---------- */
  onReady(function () {
    var bgs = Array.prototype.slice.call(doc.querySelectorAll('video[data-bgvideo]'));
    if (!bgs.length) return;
    if (IS_MOBILE) {
      bgs.forEach(function (v) {
        v.pause();
        v.removeAttribute('autoplay');
        v.preload = 'none';
        var s = v.querySelector('source');
        if (s) s.removeAttribute('src');
        v.load();
      });
      return;
    }
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) {
          var pr = v.play();
          if (pr && pr.catch) pr.catch(function () {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.05 });
    bgs.forEach(function (v) { io.observe(v); });
  });

  /* ---------- 光标光晕(pointer:fine) ---------- */
  onReady(function () {
    if (IS_MOBILE || REDUCED || !window.matchMedia('(pointer: fine)').matches) return;
    var g = doc.createElement('div');
    g.className = 'cursor-glow';
    g.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(g);
    var tx = window.innerWidth / 2, ty = window.innerHeight / 2, x = tx, y = ty, shown = false;
    doc.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { shown = true; x = tx; y = ty; g.classList.add('is-on'); }
    });
    doc.addEventListener('mouseleave', function () { g.classList.remove('is-on'); shown = false; });
    (function loop() {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      g.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      requestAnimationFrame(loop);
    })();
  });

  /* ---------- 章节水印视差 ---------- */
  onReady(function () {
    if (REDUCED) return;
    var wms = Array.prototype.slice.call(doc.querySelectorAll('.chapter-break__wm'));
    if (!wms.length) return;
    var items = wms.map(function (el) { return { el: el, top: 0, h: 0 }; });
    function measureWM() {
      items.forEach(function (it) {
        var r = it.el.parentElement.getBoundingClientRect();
        it.top = r.top + window.scrollY;
        it.h = r.height;
      });
    }
    measureWM();
    window.addEventListener('resize', measureWM);
    window.addEventListener('load', measureWM);
    scrollFns.push(function () {
      var vh = window.innerHeight, sy = window.scrollY;
      items.forEach(function (it) {
        var c = it.top + it.h / 2 - sy - vh / 2;
        if (Math.abs(c) < vh * 1.6) {
          it.el.style.transform = 'translateY(' + (c * -0.1).toFixed(1) + 'px)';
        }
      });
    });
  });

  /* ---------- 章节分隔页 / 全屏视频文案入场 ---------- */
  onReady(function () {
    var els = doc.querySelectorAll('.chapter-break__inner, .vsection__content');
    if (REDUCED || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.15 });
    els.forEach(function (el) { io.observe(el); });
  });

  /* ---------- 卡片 3D 倾斜(pointer:fine) ---------- */
  onReady(function () {
    if (IS_MOBILE || REDUCED || !window.matchMedia('(pointer: fine)').matches) return;
    var cards = Array.prototype.slice.call(doc.querySelectorAll('.dcard, .hcard'));
    cards.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transition = 'transform 0.15s ease-out';
        card.style.transform = 'perspective(700px) rotateX(' + (-py * 4).toFixed(2) + 'deg) rotateY(' + (px * 4).toFixed(2) + 'deg) translateY(-4px)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transition = 'transform 0.5s cubic-bezier(0.22,1,0.36,1)';
        card.style.transform = '';
      });
    });
  });

  /* ---------- 圆环数据(gauges):数字滚动 + 弧线 ---------- */
  onReady(function () {
    var gauges = Array.prototype.slice.call(doc.querySelectorAll('.gauge'));
    if (!gauges.length) return;
    var CIRC = 527.8;
    gauges.forEach(function (g) {
      var val = parseFloat(g.getAttribute('data-gauge')) || 0;
      var max = parseFloat(g.getAttribute('data-max')) || 100;
      var ratio = Math.min(val / max, 1);
      g.style.setProperty('--gauge-off', (CIRC * (1 - ratio)).toFixed(1));
    });
    function runCount(g) {
      g.classList.add('is-on');
      var num = g.querySelector('.gauge__svg figcaption b');
      if (!num || REDUCED) {
        if (num) {
          num.textContent = fmt(parseFloat(g.getAttribute('data-gauge')) || 0, g);
        }
        return;
      }
      var target = parseFloat(g.getAttribute('data-gauge')) || 0;
      var t0 = performance.now();
      var D = 2100;
      function tick(t) {
        var k = Math.min((t - t0) / D, 1);
        var e = 1 - Math.pow(2, -10 * k);
        num.textContent = fmt(target * e, g);
        if (k < 1) requestAnimationFrame(tick);
        else num.textContent = fmt(target, g);
      }
      requestAnimationFrame(tick);
    }
    function fmt(v, g) {
      var dec = parseInt(g.getAttribute('data-decimals') || '0', 10);
      return v.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    if (!('IntersectionObserver' in window)) {
      gauges.forEach(runCount);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        runCount(en.target);
        io.unobserve(en.target);
      });
    }, { threshold: 0.3 });
    gauges.forEach(function (g) { io.observe(g); });
  });

  /* ---------- 规格 tabs ---------- */
  onReady(function () {
    var tabs = doc.querySelectorAll('.specs-tabs');
    tabs.forEach(function (wrap) {
      var btns = Array.prototype.slice.call(wrap.querySelectorAll('.specs-tabs__btn'));
      var panels = Array.prototype.slice.call(wrap.querySelectorAll('.specs-tabs__panel'));
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          btns.forEach(function (x) { x.classList.remove('is-on'); });
          panels.forEach(function (p) { p.classList.remove('is-on'); });
          b.classList.add('is-on');
          var pn = wrap.querySelector('.specs-tabs__panel[data-panel="' + b.getAttribute('data-tab') + '"]');
          if (pn) pn.classList.add('is-on');
        });
      });
    });
  });

  /* ============================================================
     扭矩矢量实验台(签名交互)
     - 预设场景按钮 + 四轮独立滑杆
     - 显示值经 lerp 平滑跟随,杆位与轮上条实时同步
     ============================================================ */
  onReady(function () {
    var lab = doc.getElementById('torqueLab');
    if (!lab) return;

    var WHEELS = ['FL', 'FR', 'RL', 'RR'];
    var MAXNM = { FL: 270, FR: 270, RL: 900, RR: 900 };
    var PRESETS = {
      launch: { FL: 100, FR: 100, RL: 100, RR: 100 },
      corner: { FL: 32, FR: 86, RL: 16, RR: 100 },
      drift:  { FL: 18, FR: 30, RL: 100, RR: 12 },
      wet:    { FL: 46, FR: 46, RL: 52, RR: 52 }
    };

    var els = {};
    WHEELS.forEach(function (w) {
      els[w] = {
        bar: doc.getElementById('tlBar' + w),
        val: doc.getElementById('tlVal' + w),
        pct: doc.getElementById('tlPct' + w),
        input: doc.getElementById('tlIn' + w)
      };
    });
    var sumEl = doc.getElementById('tlSum');
    var presetBtns = Array.prototype.slice.call(lab.querySelectorAll('.torquelab__preset'));

    // 当前显示值(0-100,lerp 平滑)与目标值
    var cur = { FL: 100, FR: 100, RL: 100, RR: 100 };
    var target = { FL: 100, FR: 100, RL: 100, RR: 100 };
    var WMAX = 108; // SVG 轮框宽度

    function setTargets(obj, fromPreset) {
      WHEELS.forEach(function (w) {
        target[w] = Math.max(0, Math.min(100, obj[w]));
        if (els[w].input) els[w].input.value = target[w];
      });
      if (fromPreset !== false) {
        presetBtns.forEach(function (b) {
          b.classList.toggle('is-on', b.getAttribute('data-preset') === fromPreset);
        });
      } else {
        presetBtns.forEach(function (b) { b.classList.remove('is-on'); });
      }
    }

    presetBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-preset');
        if (PRESETS[key]) setTargets(PRESETS[key], key);
      });
    });

    WHEELS.forEach(function (w) {
      if (!els[w].input) return;
      els[w].input.addEventListener('input', function () {
        var v = parseFloat(this.value);
        if (isNaN(v)) return;
        target[w] = v;
        presetBtns.forEach(function (b) { b.classList.remove('is-on'); });
      });
    });

    var rafId = null;
    var lastT = performance.now();
    function step(now) {
      var dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      var sum = 0;
      var settled = true;
      WHEELS.forEach(function (w) {
        cur[w] += (target[w] - cur[w]) * Math.min(1, dt * 7.5);
        if (Math.abs(target[w] - cur[w]) > 0.15) settled = false;
        var nm = cur[w] / 100 * MAXNM[w];
        sum += nm;
        var e = els[w];
        if (e.bar) e.bar.setAttribute('width', (cur[w] / 100 * WMAX).toFixed(1));
        if (e.val) e.val.textContent = Math.round(nm) + ' Nm';
        if (e.pct) e.pct.textContent = Math.round(cur[w]) + '%';
      });
      if (sumEl) sumEl.textContent = Math.round(sum).toLocaleString('en-US');
      if (settled) { rafId = null; return; }
      rafId = requestAnimationFrame(step);
    }

    function needRaf() {
      if (rafId == null) {
        lastT = performance.now();
        rafId = requestAnimationFrame(step);
      }
    }

    // 目标变化时启动动画(输入/预设触发)
    WHEELS.forEach(function (w) {
      var input = els[w].input;
      if (input) {
        input.addEventListener('input', needRaf);
      }
    });
    presetBtns.forEach(function (b) { b.addEventListener('click', needRaf); });

    // 初始渲染(无动画直接到位)
    WHEELS.forEach(function (w) {
      cur[w] = target[w];
      var e = els[w];
      var nm = cur[w] / 100 * MAXNM[w];
      if (e.bar) e.bar.setAttribute('width', (cur[w] / 100 * WMAX).toFixed(1));
      if (e.val) e.val.textContent = Math.round(nm) + ' Nm';
      if (e.pct) e.pct.textContent = Math.round(cur[w]) + '%';
    });
    if (sumEl) sumEl.textContent = '2,340';

    // 实验台滚入视口时,先归零再弹到 LAUNCH,产生“系统上电”感
    if ('IntersectionObserver' in window && !REDUCED) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          WHEELS.forEach(function (w) { cur[w] = 0; });
          setTargets(PRESETS.launch, 'launch');
          needRaf();
          io.unobserve(en.target);
        });
      }, { threshold: 0.35 });
      io.observe(lab);
    }
  });

})();
