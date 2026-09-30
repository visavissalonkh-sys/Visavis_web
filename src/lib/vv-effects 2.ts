/**
 * Visavis home — beauty-world effects.
 *
 * Ported 1:1 from the approved design bundle's `b0178dcf` prototype, which
 * was written as the reference for exactly this port. Everything animates
 * transform / opacity / clip-path / SVG attributes / canvas only, via the
 * Web Animations API — no GSAP, per the brief.
 *
 * Added on top of the prototype, for production:
 *  - every rAF loop pauses when its host leaves the viewport AND when the
 *    tab is hidden (the prototype only did this for `fog`);
 *  - every entry point returns a cleanup function, and `initAll` collects
 *    them, so a client-side navigation away from `/` tears everything down.
 */

const LIP = "#9E1B32";
const MILK = "#FAF6F0";
const E = "cubic-bezier(0.16,1,0.3,1)";
const BRUSH = "cubic-bezier(.65,0,.35,1)";
const NS = "http://www.w3.org/2000/svg";

type Cleanup = (() => void) | void;
type VvElement = HTMLElement & {
  __vvInit?: boolean;
  __vvPlay?: (delay?: number) => void;
  __vvReset?: () => void;
  __vvFill?: () => void;
  __vvClear?: () => void;
};

let STATIC = false;
let uid = 0;

const RM = () => STATIC || matchMedia("(prefers-reduced-motion: reduce)").matches;
const HOVER = () => matchMedia("(hover: hover) and (pointer: fine)").matches;
const once = (el: VvElement) => (el.__vvInit ? false : (el.__vvInit = true));
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/**
 * rAF driver that only runs while the host is on screen and the tab is
 * visible. Canvas effects burn real CPU; a backgrounded tab must not.
 */
function visibleRaf(host: Element, frame: (now: number) => boolean): Cleanup {
  let raf = 0;
  let onScreen = false;
  const tick = (now: number) => {
    raf = 0;
    if (!onScreen || document.hidden) return;
    if (frame(now)) raf = requestAnimationFrame(tick);
  };
  const run = () => {
    if (!raf && onScreen && !document.hidden) raf = requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver(
    (entries) => {
      onScreen = entries[0].isIntersecting;
      run();
    },
    { threshold: 0.05 },
  );
  io.observe(host);
  const onVis = () => run();
  document.addEventListener("visibilitychange", onVis);
  return () => {
    io.disconnect();
    cancelAnimationFrame(raf);
    document.removeEventListener("visibilitychange", onVis);
  };
}

export function ensureDefs() {
  if (document.getElementById("vv-defs")) return;
  const s = document.createElementNS(NS, "svg");
  s.id = "vv-defs";
  s.setAttribute("aria-hidden", "true");
  s.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  s.innerHTML = `<defs>
<filter id="vv-wax" x="-5%" y="-25%" width="110%" height="150%"><feTurbulence type="fractalNoise" baseFrequency="0.02 0.1" numOctaves="3" seed="7" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="16" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="vv-wax-t" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.05 0.12" numOctaves="2" seed="4" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="3.5" xChannelSelector="R" yChannelSelector="G"/></filter>
</defs>`;
  document.body.appendChild(s);
}

export function onVisible(el: Element, cb: () => void, threshold = 0.4) {
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting) {
          cb();
          io.disconnect();
        }
      }),
    { threshold },
  );
  io.observe(el);
  return () => io.disconnect();
}

function band() {
  const b = document.createElement("span");
  b.setAttribute("aria-hidden", "true");
  b.style.cssText = `position:absolute;pointer-events:none;display:block;background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,0) 35%,rgba(0,0,0,.16)),repeating-linear-gradient(177deg,rgba(255,255,255,.07) 0 2px,rgba(0,0,0,0) 2px 7px),${LIP};filter:url(#vv-wax);border-radius:46% 18% 34% 52% / 60% 40% 60% 44%;transform-origin:0 50%;transform:scaleX(0)`;
  return b;
}

/* Button: lipstick fills bottom-up on hover, exits upward */
function lipBtn(el: VvElement) {
  if (!once(el)) return;
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  el.style.overflow = "hidden";
  el.style.isolation = "isolate";
  const f = document.createElement("span");
  f.setAttribute("aria-hidden", "true");
  f.style.cssText = `position:absolute;left:-10%;right:-10%;top:-35%;bottom:-35%;z-index:-1;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(0,0,0,.12)),${LIP};filter:url(#vv-wax);transform:translateY(100%)`;
  el.appendChild(f);
  const c0 = el.style.color;
  const b0 = el.style.borderColor;
  el.style.transition = "color .45s cubic-bezier(0.16,1,0.3,1), border-color .45s";
  let a: Animation | undefined;
  const enter = () => {
    a?.cancel();
    a = f.animate([{ transform: "translateY(100%)" }, { transform: "translateY(0%)" }], {
      duration: RM() ? 1 : 650,
      easing: E,
      fill: "forwards",
    });
    el.style.color = MILK;
    el.style.borderColor = LIP;
  };
  const leave = () => {
    a?.cancel();
    a = f.animate([{ transform: "translateY(0%)" }, { transform: "translateY(-100%)" }], {
      duration: RM() ? 1 : 600,
      easing: E,
      fill: "forwards",
    });
    el.style.color = c0;
    el.style.borderColor = b0;
  };
  el.addEventListener("pointerenter", enter);
  el.addEventListener("pointerleave", leave);
  el.addEventListener("focus", enter);
  el.addEventListener("blur", leave);
  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") {
      enter();
      setTimeout(leave, 700);
    }
  });
}

/* Eyeliner stroke with a winged flick, drawn like a liner */
function liner(el: VvElement) {
  if (!once(el)) return;
  el.style.position = "relative";
  el.style.display = "inline-block";
  const w = el.offsetWidth + 16;
  const id = "vvl" + ++uid;
  const fill = `M0,10 C${w * 0.3},16 ${w * 0.64},17.5 ${w - 20},9.5 L${w},0.6 L${w - 16.5},12.8 C${w * 0.64},21 ${w * 0.3},19.5 0,10.8 Z`;
  const stroke = `M-6,10.5 C${w * 0.3},18 ${w * 0.64},19 ${w - 19},11 L${w + 4},-1`;
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("aria-hidden", "true");
  s.setAttribute("width", String(w));
  s.setAttribute("height", "24");
  s.setAttribute("viewBox", `0 0 ${w} 24`);
  s.style.cssText = "position:absolute;left:-4px;top:calc(100% - .16em);overflow:visible;pointer-events:none";
  s.innerHTML = `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-12" y="-12" width="${w + 24}" height="48"><path d="${stroke}" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/></mask></defs><path d="${fill}" fill="currentColor" mask="url(#${id})"/>`;
  el.appendChild(s);
  const mp = s.querySelector("mask path") as SVGPathElement;
  const L = mp.getTotalLength();
  mp.style.strokeDasharray = String(L);
  mp.style.strokeDashoffset = String(RM() ? 0 : L);
  el.__vvPlay = (delay = 0) => {
    mp.getAnimations().forEach((x) => x.cancel());
    mp.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], {
      duration: 1000,
      delay,
      easing: "cubic-bezier(.6,0,.2,1)",
      fill: "forwards",
    });
  };
  el.__vvReset = () => mp.getAnimations().forEach((x) => x.cancel());
}

/* Manifesto words: opacity scrubbed by scroll; liners fire as they pass mid-screen */
function scrollWords(el: VvElement): Cleanup {
  if (!once(el)) return;
  const words = [...el.querySelectorAll<HTMLElement>("[data-vv-word]")];
  const liners = [...el.querySelectorAll<VvElement>('[data-vv="liner"]')].map((l) => ({ el: l, done: false }));
  let raf = 0;
  const upd = () => {
    raf = 0;
    const vh = innerHeight;
    words.forEach((w) => {
      const r = w.getBoundingClientRect();
      const p = RM() ? 1 : clamp((vh * 0.85 - r.top) / (vh * 0.32));
      w.style.opacity = (0.12 + 0.88 * p).toFixed(3);
    });
    liners.forEach((o) => {
      if (!o.done && o.el.getBoundingClientRect().top < vh * 0.55) {
        o.done = true;
        o.el.__vvPlay?.();
      }
    });
  };
  const on = () => {
    if (!raf) raf = requestAnimationFrame(upd);
  };
  document.addEventListener("scroll", on, { capture: true, passive: true });
  addEventListener("resize", on);
  upd();
  el.__vvReset = () => {
    liners.forEach((o) => {
      o.done = false;
      o.el.__vvReset?.();
    });
    upd();
  };
  return () => {
    document.removeEventListener("scroll", on, { capture: true });
    removeEventListener("resize", on);
    cancelAnimationFrame(raf);
  };
}

/* Nail polish: name fills with glossy lacquer left→right; liquid drop follows cursor */
function polish(sec: VvElement): Cleanup {
  if (!once(sec)) return;
  const rows = [...sec.querySelectorAll<VvElement>("[data-vv-row]")];
  rows.forEach((r) => {
    const n = r.querySelector<HTMLElement>("[data-vv-name]");
    if (!n) return;
    n.style.position = "relative";
    n.style.display = "inline-block";
    const o = document.createElement("span");
    o.setAttribute("aria-hidden", "true");
    o.textContent = n.textContent;
    o.style.cssText =
      "position:absolute;left:0;top:0;white-space:nowrap;pointer-events:none;color:transparent;background:linear-gradient(180deg,#b3263f 0%,#f2a9b6 15%,#b8304b 26%,#9E1B32 55%,#650b1f 100%);-webkit-background-clip:text;background-clip:text;clip-path:inset(-10% 100% -10% 0)";
    n.appendChild(o);
    let a: Animation | undefined;
    r.__vvFill = () => {
      a?.cancel();
      a = o.animate([{ clipPath: "inset(-10% 100% -10% 0)" }, { clipPath: "inset(-10% 0% -10% 0)" }], {
        duration: RM() ? 1 : 950,
        easing: BRUSH,
        fill: "forwards",
      });
    };
    r.__vvClear = () => {
      a?.cancel();
      a = o.animate([{ clipPath: "inset(-10% 0% -10% 0)" }, { clipPath: "inset(-10% 0% -10% 100%)" }], {
        duration: RM() ? 1 : 700,
        easing: BRUSH,
        fill: "forwards",
      });
    };
    if (HOVER()) {
      r.addEventListener("pointerenter", r.__vvFill);
      r.addEventListener("pointerleave", r.__vvClear);
    }
  });
  if (HOVER() && !RM()) return drop(sec, rows);
}

function drop(sec: HTMLElement, rows: HTMLElement[]): Cleanup {
  if (getComputedStyle(sec).position === "static") sec.style.position = "relative";
  const id = "vvd" + ++uid;
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("aria-hidden", "true");
  s.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:5";
  s.innerHTML = `<defs>
<filter id="${id}g" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="15"/><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 30 -13"/></filter>
<linearGradient id="${id}lg" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#EDCDBB"/><stop offset=".55" stop-color="#C98E77"/><stop offset="1" stop-color="#7E4637"/></linearGradient>
<radialGradient id="${id}rg" cx=".32" cy=".22" r=".55"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<mask id="${id}m" maskUnits="userSpaceOnUse" x="-4000" y="-4000" width="10000" height="10000"><g filter="url(#${id}g)"><circle r="0" fill="#fff"/><circle r="0" fill="#fff"/><circle r="0" fill="#fff"/></g></mask></defs>
<g mask="url(#${id}m)"><g data-c="1"><rect x="-150" y="-188" width="300" height="376" fill="url(#${id}lg)"/><rect x="-150" y="-188" width="300" height="376" fill="url(#${id}rg)"/>
<text x="0" y="-6" text-anchor="middle" font-family="var(--font-jetbrains-mono), monospace" font-size="9" letter-spacing="1.2" fill="#3a2019">ФОТО НАПРЯМУ · 4:5</text><text data-cap="1" x="0" y="10" text-anchor="middle" font-family="var(--font-jetbrains-mono), monospace" font-size="9" fill="#3a2019"></text></g></g>`;
  sec.appendChild(s);
  const cs = [...s.querySelectorAll("circle")];
  const g = s.querySelector("[data-c]") as SVGGElement;
  const cap = s.querySelector("[data-cap]") as SVGTextElement;
  const stops = s.querySelectorAll("linearGradient stop");
  const R = [112, 74, 46];
  const K = [0.2, 0.11, 0.065];
  const P = [0, 1, 2].map(() => ({ x: 0, y: 0 }));
  let tx = 0;
  let ty = 0;
  let sc = 0;
  let tgt = 0;
  let raf = 0;
  const loop = () => {
    P.forEach((p, i) => {
      p.x += (tx - p.x) * K[i];
      p.y += (ty - p.y) * K[i];
    });
    sc += (tgt - sc) * 0.1;
    cs.forEach((c, i) => {
      c.setAttribute("cx", P[i].x.toFixed(1));
      c.setAttribute("cy", P[i].y.toFixed(1));
      c.setAttribute("r", (R[i] * sc).toFixed(1));
    });
    g.setAttribute("transform", `translate(${P[0].x.toFixed(1)} ${P[0].y.toFixed(1)})`);
    if ((tgt === 0 && sc < 0.01) || document.hidden) {
      raf = 0;
      cs.forEach((c) => c.setAttribute("r", "0"));
      return;
    }
    raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (!raf && !document.hidden) raf = requestAnimationFrame(loop);
  };
  const pos = (e: PointerEvent) => {
    const r = sec.getBoundingClientRect();
    tx = e.clientX - r.left + 190;
    ty = e.clientY - r.top;
  };
  const list = sec.querySelector<HTMLElement>("[data-vv-list]") || sec;
  const enter = (e: PointerEvent) => {
    pos(e);
    P.forEach((p) => {
      p.x = tx;
      p.y = ty;
    });
    tgt = 1;
    start();
  };
  const leave = () => {
    tgt = 0;
    start();
  };
  list.addEventListener("pointerenter", enter);
  list.addEventListener("pointermove", pos);
  list.addEventListener("pointerleave", leave);
  const rowEnter = rows.map((r) => {
    const fn = () => {
      cap.textContent = r.dataset.caption || "";
      const t = (r.dataset.tone || "").split(",");
      if (t.length === 3) stops.forEach((st, i) => st.setAttribute("stop-color", t[i]));
    };
    r.addEventListener("pointerenter", fn);
    return { r, fn };
  });
  return () => {
    cancelAnimationFrame(raf);
    list.removeEventListener("pointerenter", enter);
    list.removeEventListener("pointermove", pos);
    list.removeEventListener("pointerleave", leave);
    rowEnter.forEach(({ r, fn }) => r.removeEventListener("pointerenter", fn));
    s.remove();
  };
}

/* Powder: particles burst, then settle into the step number */
function powder(host: VvElement): Cleanup {
  if (!once(host)) return;
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  const pts = [...host.querySelectorAll<HTMLElement>("[data-vv-pt]")];
  const fades = [...host.querySelectorAll<HTMLElement>("[data-vv-fade]")];
  const all = [...pts, ...fades];
  if (RM()) return;
  const cv = document.createElement("canvas");
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:absolute;left:-60px;top:-60px;pointer-events:none";
  host.appendChild(cv);
  all.forEach((e) => (e.style.opacity = "0"));
  let stop: Cleanup;
  const COLS = ["217,163,140", "233,194,176", "196,138,116"];
  const play = () => {
    if (typeof stop === "function") stop();
    const dpr = Math.min(2, devicePixelRatio || 1);
    const W = host.offsetWidth + 120;
    const H = host.offsetHeight + 120;
    cv.width = W * dpr;
    cv.height = H * dpr;
    cv.style.width = W + "px";
    cv.style.height = H + "px";
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    all.forEach((e) => {
      e.getAnimations().forEach((a) => a.cancel());
      e.style.opacity = "0";
    });
    const oc = document.createElement("canvas");
    oc.width = W;
    oc.height = H;
    const o = oc.getContext("2d")!;
    const hr = host.getBoundingClientRect();
    pts.forEach((e) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      o.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      o.fillStyle = "#000";
      o.textBaseline = "middle";
      o.fillText((e.textContent || "").trim(), r.left - hr.left + 60, r.top - hr.top + 60 + r.height / 2);
    });
    const d = o.getImageData(0, 0, W, H).data;
    const cand: [number, number][] = [];
    for (let y = 0; y < H; y += 2)
      for (let x = 0; x < W; x += 2) if (d[(y * W + x) * 4 + 3] > 120) cand.push([x, y]);
    const ox = W * 0.42;
    const oy = H * 0.55;
    const N = 300;
    const P = Array.from({ length: N }, (_, i) => {
      const t = cand.length ? cand[(Math.random() * cand.length) | 0] : [Math.random() * W, Math.random() * H];
      const an = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 9;
      return {
        x: ox + (Math.random() - 0.5) * 30,
        y: oy + (Math.random() - 0.5) * 20,
        vx: Math.cos(an) * sp,
        vy: Math.sin(an) * sp * 0.65 - 1.2,
        tx: t[0],
        ty: t[1],
        s: 0.5 + Math.random() * 1.6,
        a: 0.35 + Math.random() * 0.55,
        c: COLS[i % 3],
        free: i % 4 === 0,
      };
    });
    const t0 = performance.now();
    let shown = false;
    stop = visibleRaf(host, (now) => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      const fa = clamp(1 - (t - 1.8) / 0.9);
      for (const p of P) {
        if (t < 0.42 || p.free) {
          p.vx *= 0.94;
          p.vy = p.vy * 0.94 + 0.035;
          p.x += p.vx;
          p.y += p.vy;
        } else {
          const k = Math.min(0.16, 0.015 + (t - 0.42) * 0.1);
          p.x += (p.tx - p.x) * k + (Math.random() - 0.5) * 0.5;
          p.y += (p.ty - p.y) * k + (Math.random() - 0.5) * 0.5;
        }
        const al = p.a * (p.free ? clamp(1 - t / 2.6) : fa);
        if (al <= 0) continue;
        ctx.fillStyle = `rgba(${p.c},${al.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, 6.283);
        ctx.fill();
      }
      if (!shown && t > 1.45) {
        shown = true;
        all.forEach((e, i) =>
          e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: i * 110, easing: E, fill: "forwards" }),
        );
      }
      if (t < 2.8) return true;
      ctx.clearRect(0, 0, W, H);
      return false;
    });
  };
  host.__vvPlay = play;
  const off = onVisible(host, play, 0.55);
  return () => {
    off();
    if (typeof stop === "function") stop();
  };
}

/* Stamp pressed onto paper */
function press(el: VvElement): Cleanup {
  if (!once(el)) return;
  if (RM()) return;
  el.style.opacity = "0";
  el.__vvPlay = () => {
    el.getAnimations().forEach((a) => a.cancel());
    el.animate(
      [
        { transform: "scale(1.35) rotate(-12deg)", opacity: 0 },
        { transform: "scale(.92) rotate(-5deg)", opacity: 1, offset: 0.5 },
        { transform: "scale(1.03) rotate(-6deg)", opacity: 1, offset: 0.75 },
        { transform: "scale(1) rotate(-6deg)", opacity: 1 },
      ],
      { duration: 900, easing: "cubic-bezier(.3,.7,.3,1)", fill: "forwards" },
    );
  };
  return onVisible(el, () => el.__vvPlay?.(), 0.6);
}

/* Review swap: lipstick stroke wipes the quote, new quote revealed as it lifts */
export function strokeWipe(host: HTMLElement, swap: () => void) {
  ensureDefs();
  if (RM()) {
    swap();
    return;
  }
  const b = band();
  Object.assign(b.style, { left: "-3%", right: "-3%", top: "4%", bottom: "4%", zIndex: "4" });
  host.appendChild(b);
  b.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
    duration: 620,
    easing: BRUSH,
    fill: "forwards",
  }).onfinish = () => {
    swap();
    b.style.transformOrigin = "100% 50%";
    b.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], {
      duration: 760,
      delay: 140,
      easing: BRUSH,
      fill: "forwards",
    }).onfinish = () => b.remove();
  };
}

/* Hero line: lipstick band paints across; text shows through, then red melts away */
function strokeLine(el: VvElement) {
  if (!once(el)) return;
  const txt = el.querySelector<HTMLElement>("[data-vv-text]") || el;
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  if (RM()) {
    el.__vvPlay = () => {};
    return;
  }
  const b = band();
  Object.assign(b.style, {
    left: "-2%",
    width: "104%",
    top: "14%",
    bottom: "6%",
    mixBlendMode: el.dataset.blend || "screen",
    zIndex: "1",
  });
  el.appendChild(b);
  const H = "inset(-25% 100% -25% -4%)";
  const S = "inset(-25% -4% -25% -4%)";
  txt.style.clipPath = H;
  el.__vvPlay = (delay = 0) => {
    [b, txt].forEach((x) => x.getAnimations().forEach((a) => a.cancel()));
    b.style.opacity = "1";
    b.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
      duration: 1050,
      delay,
      easing: BRUSH,
      fill: "forwards",
    });
    txt.animate([{ clipPath: H }, { clipPath: S }], {
      duration: 1050,
      delay: delay + 60,
      easing: BRUSH,
      fill: "forwards",
    });
    b.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 1500,
      delay: delay + 1250,
      easing: "ease-out",
      fill: "forwards",
    });
  };
}

/* Handwritten word: revealed along a slanted front, like a pen moving */
function write(el: VvElement): Cleanup {
  if (!once(el)) return;
  if (RM()) return;
  const f = (p: number) => `polygon(-8% -40%, ${p}% -40%, ${p - 12}% 140%, -8% 140%)`;
  el.style.clipPath = f(0);
  el.__vvPlay = (delay = 0) => {
    el.getAnimations().forEach((a) => a.cancel());
    el.animate([{ clipPath: f(0) }, { clipPath: f(125) }], {
      duration: +(el.dataset.dur || 1500),
      delay,
      easing: "cubic-bezier(.45,.05,.3,1)",
      fill: "forwards",
    });
  };
  if (el.dataset.auto !== "manual")
    return onVisible(el.parentElement || el, () => el.__vvPlay?.(+(el.dataset.delay || 0)), 0.5);
}

function hairline(el: VvElement): Cleanup {
  if (!once(el) || RM()) return;
  el.style.transformOrigin = "0 50%";
  el.style.transform = "scaleX(0)";
  return onVisible(
    el,
    () =>
      el.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
        duration: 1300,
        easing: E,
        fill: "forwards",
      }),
    0.1,
  );
}

/* Outline section number fills with colour bottom-up */
function numFill(el: VvElement): Cleanup {
  if (!once(el)) return;
  el.style.position = "relative";
  el.style.display = "inline-block";
  const o = document.createElement("span");
  o.setAttribute("aria-hidden", "true");
  o.textContent = el.textContent;
  o.style.cssText = `position:absolute;left:0;top:0;color:${el.dataset.fill || LIP};-webkit-text-stroke:0;clip-path:inset(100% 0 0 0)`;
  el.appendChild(o);
  const go = () =>
    o.animate([{ clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0% 0 0 0)" }], {
      duration: RM() ? 1 : 1400,
      easing: E,
      fill: "forwards",
    });
  return onVisible(el, go, 0.7);
}

/* Footer wordmark letters tint with lipstick on hover */
function fillChar(el: VvElement) {
  if (!once(el)) return;
  el.style.position = "relative";
  el.style.display = "inline-block";
  const o = document.createElement("span");
  o.setAttribute("aria-hidden", "true");
  o.textContent = el.textContent;
  o.style.cssText = `position:absolute;left:0;top:0;color:${LIP};clip-path:inset(100% 0 0 0);pointer-events:none`;
  el.appendChild(o);
  let a: Animation | undefined;
  el.addEventListener("pointerenter", () => {
    a?.cancel();
    a = o.animate([{ clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0% 0 0 0)" }], {
      duration: 600,
      easing: E,
      fill: "forwards",
    });
  });
  el.addEventListener("pointerleave", () => {
    a?.cancel();
    a = o.animate([{ clipPath: "inset(0% 0 0 0)" }, { clipPath: "inset(0% 0 100% 0)" }], {
      duration: 900,
      delay: 300,
      easing: E,
      fill: "forwards",
    });
  });
}

/* Light sweep over a mirror */
function sheen(el: VvElement) {
  if (!once(el) || !HOVER()) return;
  const w = document.createElement("span");
  w.setAttribute("aria-hidden", "true");
  w.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:2";
  const b = document.createElement("span");
  b.style.cssText =
    "position:absolute;top:-20%;bottom:-20%;left:0;width:60%;background:linear-gradient(100deg,rgba(255,255,255,0) 0%,rgba(255,250,242,.38) 48%,rgba(255,255,255,0) 100%);transform:translateX(-120%) skewX(-12deg)";
  w.appendChild(b);
  el.appendChild(w);
  el.addEventListener("pointerenter", () =>
    b.animate(
      [
        { transform: "translateX(-120%) skewX(-12deg)" },
        { transform: "translateX(220%) skewX(-12deg)" },
      ],
      { duration: 1400, easing: E },
    ),
  );
}

/* Fogged mirror: cursor wipes condensation, glass fogs up again in ~6s */
function fog(host: VvElement): Cleanup {
  if (!once(host)) return;
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  const cv = document.createElement("canvas");
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2";
  host.appendChild(cv);
  const mk = document.createElement("canvas");
  let W = 1;
  let H = 1;
  let dpr = 1;
  let ctx: CanvasRenderingContext2D;
  let mctx: CanvasRenderingContext2D;
  let tex: HTMLCanvasElement;
  let last: { x: number; y: number } | null = null;

  const makeTex = () => {
    const t = document.createElement("canvas");
    t.width = W * dpr;
    t.height = H * dpr;
    const c = t.getContext("2d")!;
    c.scale(dpr, dpr);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(240,232,224,.9)");
    g.addColorStop(1, "rgba(226,214,204,.94)");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < (W * H) / 220; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const big = Math.random() > 0.93;
      const r = big ? 1.5 + Math.random() * 3 : 0.3 + Math.random() * 1.2;
      c.beginPath();
      c.arc(x, y, r, 0, 6.283);
      c.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.45})`;
      c.fill();
      if (big) {
        c.beginPath();
        c.arc(x + r * 0.2, y + r * 0.35, r * 0.75, 0, 6.283);
        c.fillStyle = "rgba(110,94,82,.14)";
        c.fill();
      }
    }
    return t;
  };
  const draw = () => {
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(tex, 0, 0);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(mk, 0, 0);
  };
  const size = () => {
    const r = host.getBoundingClientRect();
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = mk.width = W * dpr;
    cv.height = mk.height = H * dpr;
    ctx = cv.getContext("2d")!;
    mctx = mk.getContext("2d")!;
    tex = makeTex();
    mctx.fillStyle = "#000";
    mctx.fillRect(0, 0, mk.width, mk.height);
    draw();
  };
  const dab = (x: number, y: number) => {
    const R = Math.max(44, W * 0.085) * dpr;
    x *= dpr;
    y *= dpr;
    const g = mctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, "rgba(0,0,0,.95)");
    g.addColorStop(0.55, "rgba(0,0,0,.6)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    mctx.globalCompositeOperation = "destination-out";
    mctx.fillStyle = g;
    mctx.beginPath();
    mctx.arc(x, y, R, 0, 6.283);
    mctx.fill();
    mctx.globalCompositeOperation = "source-over";
  };
  const stroke = (x: number, y: number) => {
    if (last) {
      const dx = x - last.x;
      const dy = y - last.y;
      const d = Math.hypot(dx, dy);
      const n = Math.ceil(d / 10);
      for (let i = 1; i <= n; i++) dab(last.x + (dx * i) / n, last.y + (dy * i) / n);
    } else dab(x, y);
    last = { x, y };
  };
  size();

  // Re-fog loop, gated on viewport + tab visibility.
  const stopLoop = visibleRaf(host, () => {
    mctx.globalAlpha = 0.011;
    mctx.fillStyle = "#000";
    mctx.fillRect(0, 0, mk.width, mk.height);
    mctx.globalAlpha = 1;
    draw();
    return true;
  });

  const autoWipe = () => {
    if (RM()) {
      mctx.clearRect(0, 0, mk.width, mk.height);
      draw();
      return;
    }
    last = null;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = clamp((now - t0) / 1300);
      const e = 1 - Math.pow(1 - t, 3);
      stroke(W * (0.08 + 0.84 * e), H * (0.34 + 0.14 * Math.sin(e * Math.PI * 1.6)));
      if (t < 1) requestAnimationFrame(step);
      else last = null;
    };
    requestAnimationFrame(step);
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const r = host.getBoundingClientRect();
    stroke(e.clientX - r.left, e.clientY - r.top);
  };
  const onLeave = () => (last = null);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerleave", onLeave);

  let first = true;
  const io2 = new IntersectionObserver(
    (es) => {
      if (es[0].isIntersecting && first) {
        first = false;
        autoWipe();
      }
    },
    { threshold: 0.5 },
  );
  io2.observe(host);
  addEventListener("resize", size);
  host.__vvReset = () => {
    mctx.globalCompositeOperation = "source-over";
    mctx.fillStyle = "#000";
    mctx.fillRect(0, 0, mk.width, mk.height);
    draw();
    setTimeout(autoWipe, 250);
  };
  return () => {
    if (typeof stopLoop === "function") stopLoop();
    io2.disconnect();
    removeEventListener("resize", size);
    host.removeEventListener("pointermove", onMove);
    host.removeEventListener("pointerleave", onLeave);
  };
}

/* Horizontal gallery: cards skew with scroll velocity */
function skew(el: VvElement) {
  if (!once(el) || RM()) return;
  const cards = [...el.children] as HTMLElement[];
  let lastX = el.scrollLeft;
  let v = 0;
  let raf = 0;
  const loop = () => {
    v *= 0.88;
    cards.forEach((c) => (c.style.transform = `skewX(${(-v).toFixed(2)}deg)`));
    raf = Math.abs(v) > 0.02 && !document.hidden ? requestAnimationFrame(loop) : 0;
  };
  el.addEventListener(
    "scroll",
    () => {
      const d = el.scrollLeft - lastX;
      lastX = el.scrollLeft;
      v = clamp(v + d * 0.06, -7, 7);
      if (!raf) raf = requestAnimationFrame(loop);
    },
    { passive: true },
  );
  el.addEventListener(
    "wheel",
    (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        const max = el.scrollWidth - el.clientWidth;
        if ((e.deltaY > 0 && el.scrollLeft < max - 1) || (e.deltaY < 0 && el.scrollLeft > 0)) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }
      }
    },
    { passive: false },
  );
}

/* Page-level scroll: lipstick progress, header background, hero parallax */
function pageScroll(root: ParentNode): Cleanup {
  const se = document.scrollingElement || document.documentElement;
  const bullet = root.querySelector<HTMLElement>("[data-vv-bullet]");
  const bar = root.querySelector<HTMLElement>("[data-vv-bar]");
  const hbg = root.querySelector<HTMLElement>("[data-vv-hbg]");
  const media = root.querySelector<HTMLElement>("[data-vv-heromedia]");
  const dark = root.querySelector<HTMLElement>("[data-vv-herodark]");
  const par = [...root.querySelectorAll<HTMLElement>("[data-vv-par]")];
  let raf = 0;
  const upd = () => {
    raf = 0;
    const y = se.scrollTop;
    const vh = innerHeight;
    const p = clamp(y / Math.max(1, se.scrollHeight - vh));
    if (bullet) bullet.style.transform = `translateY(${((1 - p) * 100).toFixed(2)}%)`;
    if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
    if (hbg) hbg.style.opacity = y > 40 ? "1" : "0";
    if (RM()) return;
    const h = clamp(y / vh);
    if (media) media.style.transform = `scale(${(1 + 0.08 * h).toFixed(4)})`;
    if (dark) dark.style.opacity = (h * 0.65).toFixed(3);
    par.forEach((e) => (e.style.transform = `translateY(${(-y * +e.dataset.vvPar!).toFixed(1)}px)`));
  };
  const on = () => {
    if (!raf) raf = requestAnimationFrame(upd);
  };
  document.addEventListener("scroll", on, { capture: true, passive: true });
  upd();
  return () => {
    document.removeEventListener("scroll", on, { capture: true });
    cancelAnimationFrame(raf);
  };
}

/* Preloader: lipstick signature, then a diagonal swipe reveals the site */
function preloader(el: HTMLElement | null, mode: string, done: () => void) {
  const hide = () => {
    if (!el) return;
    el.style.pointerEvents = "none";
    el.style.display = "none";
  };
  if (!el || mode === "off" || RM() || (mode === "session" && sessionStorage.getItem("vv-pre"))) {
    hide();
    done();
    return;
  }
  try {
    sessionStorage.setItem("vv-pre", "1");
  } catch {
    /* private mode — run the intro anyway */
  }
  el.style.display = "block";
  el.style.pointerEvents = "auto";
  const word = el.querySelector<HTMLElement>("[data-vv-pre-word]")!;
  const b = el.querySelector<HTMLElement>("[data-vv-pre-band]")!;
  const bg = el.querySelector<HTMLElement>("[data-vv-pre-bg]")!;
  const f = (p: number) => `polygon(-8% -40%, ${p}% -40%, ${p - 12}% 140%, -8% 140%)`;
  let finished = false;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const finish = () => {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    [word, b, bg].forEach((x) => x.getAnimations().forEach((a) => a.cancel()));
    hide();
    done();
  };
  el.addEventListener("pointerdown", finish, { once: true });
  timers.push(setTimeout(finish, 3200));
  word.animate([{ clipPath: f(0) }, { clipPath: f(125) }], {
    duration: 1150,
    easing: "cubic-bezier(.45,.05,.3,1)",
    fill: "forwards",
  });
  timers.push(
    setTimeout(() => {
      b.style.transformOrigin = "0 50%";
      b.animate(
        [{ transform: "rotate(-14deg) scaleX(0)" }, { transform: "rotate(-14deg) scaleX(1)" }],
        { duration: 480, easing: BRUSH, fill: "forwards" },
      ).onfinish = () => {
        if (finished) return;
        bg.style.opacity = "0";
        word.style.opacity = "0";
        done();
        b.style.transformOrigin = "100% 50%";
        b.animate(
          [{ transform: "rotate(-14deg) scaleX(1)" }, { transform: "rotate(-14deg) scaleX(0)" }],
          { duration: 520, easing: BRUSH, fill: "forwards" },
        ).onfinish = () => {
          finished = true;
          hide();
        };
      };
    }, 1200),
  );
}

export function initAll(root: ParentNode = document, opts: { static?: boolean; preloader?: string } = {}) {
  STATIC = !!document.hidden || !!opts.static;
  ensureDefs();
  const q = <T extends Element>(s: string) => [...root.querySelectorAll<T>(s)];
  const offs: (() => void)[] = [];
  const add = (f: Cleanup) => {
    if (typeof f === "function") offs.push(f);
  };
  q<VvElement>('[data-vv="lipbtn"]').forEach(lipBtn);
  q<VvElement>('[data-vv="liner"]').forEach(liner);
  q<VvElement>('[data-vv="words"]').forEach((e) => add(scrollWords(e)));
  q<VvElement>('[data-vv="polish"]').forEach((e) => add(polish(e)));
  q<VvElement>('[data-vv="powder"]').forEach((e) => add(powder(e)));
  q<VvElement>('[data-vv="press"]').forEach((e) => add(press(e)));
  q<VvElement>('[data-vv="write"]').forEach((e) => add(write(e)));
  q<VvElement>('[data-vv="hairline"]').forEach((e) => add(hairline(e)));
  q<VvElement>('[data-vv="numfill"]').forEach((e) => add(numFill(e)));
  q<VvElement>('[data-vv="fillchar"]').forEach(fillChar);
  q<VvElement>('[data-vv="sheen"]').forEach(sheen);
  q<VvElement>('[data-vv="fog"]').forEach((e) => add(fog(e)));
  q<VvElement>('[data-vv="skew"]').forEach(skew);
  const lines = q<VvElement>('[data-vv="stroke-line"]');
  lines.forEach(strokeLine);
  const heroWrite = q<VvElement>('[data-vv="hero-write"]');
  heroWrite.forEach((e) => {
    e.dataset.auto = "manual";
    add(write(e));
  });
  add(pageScroll(root));
  let revealed = false;
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    lines.forEach((l, i) => l.__vvPlay?.(i * 280));
    heroWrite.forEach((e) => e.__vvPlay?.(lines.length * 280 + 700));
  };
  preloader(root.querySelector<HTMLElement>("[data-vv-pre]"), opts.preloader || "session", reveal);
  return () => offs.forEach((f) => f());
}
