"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { initAll, strokeWipe } from "@/lib/vv-effects";
import {
  BRANCHES,
  HERO_MEDIA_CAPTION,
  HOURS,
  MANIFESTO_LINED,
  MANIFESTO_TEXT,
  MASTERS,
  NAV_LINKS,
  PHONE_PLACEHOLDER,
  REVIEWS,
  SERVICES,
  STEPS,
  TELEGRAM_BOT,
  WORKS,
} from "@/lib/home-content";
import "./home.css";

/* Font stacks — next/font CSS variables standing in for the bundle's
   'Noto Serif Display' / 'Inter' / … family names. */
const NOTO = "var(--font-noto-serif-display), serif";
const INTER = "var(--font-inter), sans-serif";
const CORM = "var(--font-cormorant), serif";
const MONO = "var(--font-jetbrains-mono), monospace";
const VIBES = "var(--font-great-vibes), cursive";

const BOOKING = "/booking";
const TELEGRAM_URL = `https://t.me/${(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "salon_visavis_bot").replace(/^@/, "")}`;
const INSTAGRAM_URL = "https://www.instagram.com/salon_vis_a_vis";
const mapsUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

const PAD_X = "clamp(20px,3.6vw,56px)";
const SHELL: CSSProperties = { maxWidth: 1328, margin: "0 auto" };

/* Section number + label, identical in every section. */
function SectionHead({ num, label, dark, note }: { num: string; label: string; dark?: boolean; note?: string }) {
  const ink = dark ? "#FAF6F0" : "#1A1310";
  const head = (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
      <span
        data-vv="numfill"
        data-fill={dark ? "#FAF6F0" : undefined}
        style={{
          font: `100 clamp(72px,9vw,128px)/.8 ${NOTO}`,
          color: "transparent",
          WebkitTextStroke: `1px ${ink}`,
        }}
      >
        {num}
      </span>
      <span
        style={{
          paddingBottom: 8,
          font: `500 11px/1 ${INTER}`,
          letterSpacing: ".2em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>
  );
  if (!note) return head;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      {head}
      <span
        style={{
          paddingBottom: 8,
          font: `400 13px/1.4 ${INTER}`,
          color: dark ? "#BFB2A6" : "#6E5E52",
        }}
      >
        {note}
      </span>
    </div>
  );
}

function Hairline({ dark }: { dark?: boolean }) {
  return (
    <div
      data-vv="hairline"
      style={{ height: 1, background: dark ? "rgba(250,246,240,.16)" : "#D8CCBC", marginTop: 24 }}
    />
  );
}

/** Mirrors HeaderAuthAction's behaviour with the mockup's styling. */
function LoginLink({ style }: { style: CSSProperties }) {
  const { openAuthModal, authVersion } = useAuthModal();
  const [user, setUser] = useState<{ name: string | null; role: string } | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setUser(d.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [authVersion]);

  if (user) {
    return (
      <Link href={user.role === "master" ? "/master" : "/account"} style={style}>
        {user.name ? user.name.split(" ")[0] : "Кабінет"}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => openAuthModal()} style={style}>
      Увійти
    </button>
  );
}

export function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(-1);
  const [m, setM] = useState(0);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const off = initAll(root, { preloader: "session" });
    return () => off();
  }, []);

  // Service row expand: stagger the revealed items, and on touch (where there
  // is no hover) run the lacquer fill that hover would otherwise trigger.
  useEffect(() => {
    if (open < 0) return;
    const row = document.querySelector<HTMLElement & { __vvFill?: () => void }>(`[data-vv-row][data-idx="${open}"]`);
    if (!row) return;
    if (!matchMedia("(hover: hover)").matches) row.__vvFill?.();
    row.querySelectorAll("[data-vv-item]").forEach((el, i) =>
      el.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], {
        duration: 800,
        delay: i * 80,
        easing: "cubic-bezier(0.16,1,0.3,1)",
        fill: "backwards",
      }),
    );
  }, [open]);

  // Portrait swap: wipe in from the right, then re-fog the glass.
  useEffect(() => {
    const p = document.getElementById("vv-portrait") as (HTMLElement & { __vvReset?: () => void }) | null;
    if (!p) return;
    p.animate([{ clipPath: "inset(0 0 0 100%)" }, { clipPath: "inset(0 0 0 0%)" }], {
      duration: 1100,
      easing: "cubic-bezier(.65,0,.35,1)",
    });
    p.__vvReset?.();
  }, [m]);

  // Re-stamp the lipstick swatch whenever the quote changes.
  useEffect(() => {
    const k = document.getElementById("vv-swatch") as (HTMLElement & { __vvPlay?: () => void }) | null;
    k?.__vvPlay?.();
  }, [rev]);

  const goReview = (i: number) => {
    if (i === rev) return;
    const host = document.getElementById("vv-quote");
    if (host) strokeWipe(host, () => setRev(i));
    else setRev(i);
  };

  const master = MASTERS[m];
  const review = REVIEWS[rev];
  const words = MANIFESTO_TEXT.split(" ").map((t) => ({ t, l: MANIFESTO_LINED.has(t) }));

  const navLink: CSSProperties = {
    font: `500 11px/1 ${INTER}`,
    letterSpacing: ".2em",
    textTransform: "uppercase",
  };
  const ctaHeader: CSSProperties = {
    display: "flex",
    alignItems: "center",
    height: 44,
    padding: `0 clamp(16px,2vw,28px)`,
    border: "1px solid rgba(250,246,240,.55)",
    color: "#FAF6F0",
    font: `500 11px/1 ${INTER}`,
    letterSpacing: ".22em",
    textTransform: "uppercase",
  };

  return (
    <div className="vv-home" ref={rootRef}>
      {/* ── Preloader ─────────────────────────────────────────── */}
      <div
        data-vv-pre="1"
        style={{ position: "fixed", inset: 0, zIndex: 200, pointerEvents: "none", overflow: "hidden" }}
      >
        <div data-vv-pre-bg="1" style={{ position: "absolute", inset: 0, background: "#F4EDE3" }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            data-vv-pre-word="1"
            style={{
              font: `400 clamp(96px,15vw,220px)/1.2 ${VIBES}`,
              color: "#9E1B32",
              filter: "url(#vv-wax-t)",
              clipPath: "polygon(-8% -40%, 0% -40%, -12% 140%, -8% 140%)",
            }}
          >
            Visavis
          </span>
        </div>
        <span
          data-vv-pre-band="1"
          style={{
            position: "absolute",
            left: "-30%",
            top: "-45%",
            width: "160%",
            height: "190%",
            background:
              "linear-gradient(180deg,rgba(255,255,255,.1),rgba(0,0,0,.14)),repeating-linear-gradient(177deg,rgba(255,255,255,.06) 0 3px,rgba(0,0,0,0) 3px 9px),#9E1B32",
            filter: "url(#vv-wax)",
            transform: "rotate(-14deg) scaleX(0)",
            transformOrigin: "0 50%",
          }}
        />
      </div>

      {/* ── Film grain ────────────────────────────────────────── */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 150,
          opacity: 0.14,
          mixBlendMode: "soft-light",
          filter: "grayscale(1)",
          backgroundImage:
            "url(data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27180%27%20height=%27180%27%3E%3Cfilter%20id=%27n%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%27.9%27%20numOctaves=%272%27%20stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20filter=%27url%28%23n%29%27/%3E%3C/svg%3E)",
        }}
      />

      {/* ── Scroll indicator: lipstick tube (wide) / bar (narrow) ── */}
      <div
        aria-hidden
        className="vv-wide"
        style={{
          position: "fixed",
          right: 22,
          top: "50%",
          marginTop: -80,
          width: 12,
          height: 160,
          overflow: "hidden",
          zIndex: 60,
          pointerEvents: "none",
        }}
      >
        <div
          data-vv-bullet="1"
          style={{
            position: "absolute",
            left: 2,
            width: 8,
            bottom: 58,
            height: 100,
            background: "linear-gradient(90deg,#6c0e22,#c43a55 45%,#8a1530)",
            clipPath: "polygon(0 18%,100% 0,100% 100%,0 100%)",
            transform: "translateY(100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 58,
            boxSizing: "border-box",
            border: "1px solid #C9B37E",
            background: "#1C1411",
          }}
        />
      </div>
      <div
        aria-hidden
        data-vv-bar="1"
        className="vv-narrow"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          top: 0,
          height: 2,
          background: "#9E1B32",
          transform: "scaleX(0)",
          transformOrigin: "0 50%",
          zIndex: 70,
          pointerEvents: "none",
        }}
      />

      {/* ── Header ────────────────────────────────────────────── */}
      <header style={{ position: "fixed", left: 0, right: 0, top: 0, zIndex: 80, color: "#FAF6F0" }}>
        <div
          data-vv-hbg="1"
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(28,20,17,.94)",
            borderBottom: "1px solid rgba(250,246,240,.12)",
            opacity: 0,
            transition: "opacity .6s cubic-bezier(0.16,1,0.3,1)",
          }}
        />
        <div
          style={{
            position: "relative",
            height: 76,
            padding: `0 ${PAD_X}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <a href="#top" style={{ font: `300 20px/1 ${NOTO}`, letterSpacing: ".42em" }}>
            VISAVIS
          </a>
          <nav
            className="vv-wide"
            style={{ display: "flex", gap: "clamp(20px,2.6vw,40px)", ...navLink }}
          >
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: "clamp(12px,2vw,28px)" }}>
            <span className="vv-wide">
              <LoginLink style={{ ...navLink, color: "#D6CABE" }} />
            </span>
            <Link href={BOOKING} data-vv="lipbtn" style={ctaHeader}>
              Записатися
            </Link>
            <button
              type="button"
              className="vv-narrow"
              onClick={() => setMenu((v) => !v)}
              aria-expanded={menu}
              style={{ height: 44, padding: "0 4px", ...navLink }}
            >
              {menu ? "Закрити" : "Меню"}
            </button>
          </div>
        </div>
        {menu ? (
          <nav
            className="vv-narrow"
            style={{
              position: "relative",
              height: "calc(100vh - 76px)",
              background: "#1C1411",
              padding: "32px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              font: `200 44px/1.2 ${NOTO}`,
              letterSpacing: "-.02em",
            }}
          >
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenu(false)}>
                {l.label}
              </a>
            ))}
            <span onClick={() => setMenu(false)} style={{ marginTop: 28 }}>
              <LoginLink style={{ font: `500 12px/1 ${INTER}`, letterSpacing: ".2em", textTransform: "uppercase", color: "#D6CABE" }} />
            </span>
          </nav>
        ) : null}
      </header>

      {/* ── 01 Hero ───────────────────────────────────────────── */}
      <section
        id="top"
        style={{
          position: "relative",
          height: "100vh",
          minHeight: 640,
          overflow: "hidden",
          background: "#1C1411",
          color: "#FAF6F0",
        }}
      >
        <div
          data-vv-heromedia="1"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 44% 36% at 44% 84%, rgba(217,163,140,.55), rgba(160,96,70,.2) 50%, rgba(0,0,0,0) 78%), radial-gradient(ellipse 30% 40% at 78% 48%, rgba(217,163,140,.3), rgba(0,0,0,0) 72%), radial-gradient(ellipse 30% 40% at 22% 24%, rgba(217,163,140,.16), rgba(0,0,0,0) 70%), linear-gradient(180deg,#2A1F1A,#1C1411)",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: "clamp(20px,4vw,64px)",
              top: 120,
              maxWidth: 260,
              textAlign: "right",
              font: `400 10px/1.7 ${MONO}`,
              color: "rgba(250,246,240,.66)",
            }}
          >
            <div style={{ letterSpacing: ".14em" }}>VIDEO · LOOP 10 С · 4K 24 FPS</div>
            {HERO_MEDIA_CAPTION}
          </div>
        </div>
        <div data-vv-herodark="1" style={{ position: "absolute", inset: 0, background: "#0E0907", opacity: 0 }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 80% 75% at 50% 45%, rgba(10,6,5,0) 45%, rgba(10,6,5,.72) 100%), linear-gradient(0deg, rgba(14,9,7,.75), rgba(14,9,7,0) 45%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: PAD_X,
            right: PAD_X,
            bottom: "clamp(96px,14vh,150px)",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "clamp(20px,3vh,36px)" }}
          >
            <span style={{ width: 28, height: 1, background: "#C9B37E" }} />
            <span
              style={{
                font: `500 11px/1 ${INTER}`,
                letterSpacing: ".22em",
                textTransform: "uppercase",
                color: "#D6CABE",
                whiteSpace: "nowrap",
              }}
            >
              Салон краси · Харків
            </span>
          </div>
          <h1 style={{ margin: 0, font: `200 clamp(60px,11vw,196px)/.94 ${NOTO}`, letterSpacing: "-.04em" }}>
            <span
              data-vv="stroke-line"
              data-vv-par=".06"
              style={{ display: "block", width: "max-content", maxWidth: "100%" }}
            >
              <span data-vv-text="1" style={{ display: "block" }}>
                Краса,
              </span>
            </span>
            <span
              data-vv="stroke-line"
              data-vv-par=".12"
              style={{ display: "block", width: "max-content", maxWidth: "100%" }}
            >
              <span data-vv-text="1" style={{ display: "block" }}>
                доведена до
              </span>
            </span>
            <span
              data-vv-par=".2"
              style={{ display: "block", paddingLeft: "clamp(0px,14vw,260px)", marginTop: "-.08em" }}
            >
              <span
                data-vv="hero-write"
                style={{
                  display: "inline-block",
                  font: `400 clamp(72px,12.5vw,224px)/1.1 ${VIBES}`,
                  letterSpacing: 0,
                  color: "#9E1B32",
                  filter: "url(#vv-wax-t)",
                }}
              >
                досконалості
              </span>
            </span>
          </h1>
        </div>
        <div
          style={{
            position: "absolute",
            left: PAD_X,
            right: PAD_X,
            bottom: 32,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: "12px 32px",
            paddingTop: 18,
            borderTop: "1px solid rgba(250,246,240,.16)",
            font: `400 12px/1.4 ${INTER}`,
            color: "#D6CABE",
          }}
        >
          <span>Сумська · Павлове Поле</span>
          <span>{HOURS}</span>
          <span style={{ letterSpacing: ".2em", textTransform: "uppercase", fontSize: 10 }}>Гортайте</span>
        </div>
      </section>

      {/* ── 02 Філософія ──────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          background: "#F4EDE3",
          padding: `clamp(96px,14vw,180px) ${PAD_X} clamp(120px,18vh,220px)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: "50%",
            height: "60%",
            background: "radial-gradient(ellipse at 100% 0%, rgba(217,163,140,.28), rgba(217,163,140,0) 65%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", ...SHELL }}>
          <SectionHead num="02" label="Філософія" />
          <Hairline />
          <p
            data-vv="words"
            style={{
              margin: "clamp(64px,10vh,120px) 0 0",
              maxWidth: 1180,
              font: `200 clamp(34px,4.8vw,72px)/1.16 ${NOTO}`,
              letterSpacing: "-.025em",
              color: "#1A1310",
            }}
          >
            {words.map((w, i) => (
              <span
                key={i}
                data-vv-word="1"
                data-vv={w.l ? "liner" : undefined}
                style={{ display: "inline-block", marginRight: ".24em" }}
              >
                {w.t}
              </span>
            ))}
          </p>
        </div>
      </section>

      {/* ── 03 Послуги ────────────────────────────────────────── */}
      <section
        id="services"
        data-vv="polish"
        style={{ position: "relative", background: "#F4EDE3", padding: `0 ${PAD_X} clamp(96px,14vw,180px)` }}
      >
        <div style={SHELL}>
          <SectionHead num="03" label="Послуги" note="П'ять напрямів · натисніть, щоб побачити ціни" />
          <div data-vv-list="1" style={{ marginTop: 40, borderBottom: "1px solid #D8CCBC" }}>
            {SERVICES.map((s, i) => (
              <div
                key={s.name}
                data-vv-row="1"
                data-caption={s.cap}
                data-tone={s.tone}
                data-idx={i}
                style={{ borderTop: "1px solid #D8CCBC" }}
              >
                <button
                  type="button"
                  onClick={() => setOpen((v) => (v === i ? -1 : i))}
                  aria-expanded={open === i}
                  style={{
                    width: "100%",
                    display: "grid",
                    gridTemplateColumns: "minmax(36px,64px) minmax(0,1fr) auto",
                    alignItems: "baseline",
                    gap: 16,
                    padding: "clamp(16px,2vw,24px) 0",
                    textAlign: "left",
                  }}
                >
                  <span style={{ font: `500 11px/1 ${INTER}`, letterSpacing: ".14em", color: "#6E5E52" }}>
                    {"0" + (i + 1)}
                  </span>
                  <span style={{ minWidth: 0, overflow: "hidden" }}>
                    <span
                      data-vv-name="1"
                      style={{
                        font: `200 clamp(38px,7vw,108px)/1.04 ${NOTO}`,
                        letterSpacing: "-.03em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.name}
                    </span>
                  </span>
                  <span style={{ font: `400 14px/1 ${INTER}`, color: "#6E5E52", whiteSpace: "nowrap" }}>
                    {s.from}
                  </span>
                </button>
                {open === i ? (
                  <div
                    style={{
                      padding: "0 0 32px clamp(52px,5vw,80px)",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))",
                      gap: "0 40px",
                    }}
                  >
                    {s.items.map((it) => (
                      <div
                        key={it.n}
                        data-vv-item="1"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 16,
                          padding: "14px 0",
                          borderTop: "1px solid #E3D8CA",
                          font: `400 15px/1.4 ${INTER}`,
                        }}
                      >
                        <span>{it.n}</span>
                        <span style={{ color: "#9E1B32", whiteSpace: "nowrap" }}>{it.p}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 04 Майстри ────────────────────────────────────────── */}
      <section
        id="masters"
        style={{
          position: "relative",
          background: "#1C1411",
          color: "#FAF6F0",
          padding: `clamp(96px,14vw,180px) ${PAD_X}`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "60%",
            height: "70%",
            background: "radial-gradient(ellipse at 0% 0%, rgba(217,163,140,.14), rgba(217,163,140,0) 65%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", ...SHELL }}>
          <SectionHead num="04" label="Майстри" dark />
          <Hairline dark />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,400px),1fr))",
              gap: "clamp(40px,6vw,96px)",
              marginTop: "clamp(40px,6vw,72px)",
              alignItems: "start",
            }}
          >
            <div
              id="vv-portrait"
              data-vv="fog"
              style={{
                position: "relative",
                aspectRatio: "3/4",
                maxHeight: "86vh",
                overflow: "hidden",
                background:
                  "radial-gradient(ellipse 60% 50% at 62% 30%, rgba(233,194,176,.5), rgba(233,194,176,0) 70%), linear-gradient(165deg,#6B4A3E 0%,#3D2A23 60%,#2A1F1A 100%)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  font: `100 clamp(120px,16vw,240px)/1 ${NOTO}`,
                  letterSpacing: "-.04em",
                  color: "rgba(250,246,240,.34)",
                }}
              >
                {master.i}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: 20,
                  right: 20,
                  bottom: 20,
                  font: `400 10px/1.6 ${MONO}`,
                  color: "rgba(250,246,240,.72)",
                }}
              >
                <div style={{ letterSpacing: ".14em" }}>ПОРТРЕТ 3:4</div>
                {master.cap}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <div
                className="vv-scroll-x"
                style={{
                  display: "flex",
                  gap: "4px 20px",
                  overflowX: "auto",
                  paddingBottom: 8,
                  marginBottom: "clamp(32px,6vh,72px)",
                  borderBottom: "1px solid rgba(250,246,240,.16)",
                }}
              >
                {MASTERS.map((mm, i) => (
                  <button
                    key={mm.first}
                    type="button"
                    onClick={() => setM(i)}
                    style={{
                      flex: "none",
                      minHeight: 44,
                      font: `500 11px/1 ${INTER}`,
                      letterSpacing: ".18em",
                      textTransform: "uppercase",
                      color: "#FAF6F0",
                      opacity: i === m ? 1 : 0.5,
                      borderBottom: `1px solid ${i === m ? "#9E1B32" : "transparent"}`,
                    }}
                  >
                    {mm.first}
                  </button>
                ))}
              </div>
              <div
                style={{
                  font: `500 11px/1 ${INTER}`,
                  letterSpacing: ".22em",
                  textTransform: "uppercase",
                  color: "#D9A38C",
                }}
              >
                {master.s}
              </div>
              <h3
                style={{
                  margin: "20px 0 0",
                  font: `200 clamp(48px,6vw,96px)/.98 ${NOTO}`,
                  letterSpacing: "-.035em",
                }}
              >
                {master.first}
                <br />
                <em style={{ font: `italic 300 1em/1 ${CORM}` }}>{master.last}</em>
              </h3>
              <p
                style={{
                  margin: "32px 0 0",
                  maxWidth: 440,
                  font: `400 16px/1.65 ${INTER}`,
                  color: "#D6CABE",
                  textWrap: "pretty",
                }}
              >
                {master.b}
              </p>
              <div style={{ marginTop: 40 }}>
                <Link
                  href={BOOKING}
                  data-vv="lipbtn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    height: 56,
                    padding: "0 32px",
                    border: "1px solid rgba(250,246,240,.55)",
                    color: "#FAF6F0",
                    font: `500 12px/1 ${INTER}`,
                    letterSpacing: ".22em",
                    textTransform: "uppercase",
                  }}
                >
                  {master.cta}
                </Link>
              </div>
              <p style={{ margin: "40px 0 0", font: `400 12px/1.5 ${INTER}`, color: "#A89A8E" }}>
                Проведіть курсором по портрету: скло запотіло.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 05 Як ми працюємо ─────────────────────────────────── */}
      <section
        style={{ position: "relative", background: "#F4EDE3", padding: `clamp(96px,14vw,180px) ${PAD_X}` }}
      >
        <div style={SHELL}>
          <SectionHead num="05" label="Як ми працюємо" />
          <Hairline />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,250px),1fr))",
              gap: "56px 40px",
              marginTop: 72,
            }}
          >
            {STEPS.map((st) => (
              <div key={st.n} data-vv="powder">
                <div
                  data-vv-pt="1"
                  style={{
                    font: `100 clamp(100px,9vw,136px)/1 ${NOTO}`,
                    letterSpacing: "-.04em",
                    color: "#B87863",
                  }}
                >
                  {st.n}
                </div>
                <div
                  data-vv-fade="1"
                  style={{
                    marginTop: 20,
                    aspectRatio: "4/5",
                    background:
                      "radial-gradient(ellipse 70% 55% at 30% 20%, rgba(255,247,238,.9), rgba(255,247,238,0) 70%), linear-gradient(170deg,#E4D3C2,#CDB6A1)",
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: 14,
                      right: 14,
                      bottom: 14,
                      font: `400 9.5px/1.5 ${MONO}`,
                      color: "#4A3A30",
                    }}
                  >
                    {st.cap}
                  </span>
                </div>
                <div
                  data-vv-fade="1"
                  style={{ font: `300 30px/1.1 ${NOTO}`, letterSpacing: "-.02em", marginTop: 24 }}
                >
                  {st.t}
                </div>
                <p
                  data-vv-fade="1"
                  style={{
                    margin: "12px 0 0",
                    font: `400 14px/1.6 ${INTER}`,
                    color: "#6E5E52",
                    textWrap: "pretty",
                  }}
                >
                  {st.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 06 Роботи ─────────────────────────────────────────── */}
      <section
        style={{ position: "relative", background: "#2A1F1A", color: "#FAF6F0", padding: "clamp(96px,14vw,180px) 0" }}
      >
        <div style={{ ...SHELL, padding: `0 ${PAD_X}` }}>
          <SectionHead num="06" label="Роботи" dark note="Гортайте колесом або свайпом" />
        </div>
        <div
          data-vv="skew"
          className="vv-scroll-x"
          style={{
            display: "flex",
            gap: "clamp(16px,2vw,28px)",
            overflowX: "auto",
            padding: `56px ${PAD_X} 8px`,
            scrollSnapType: "x proximity",
          }}
        >
          {WORKS.map((wk) => (
            <figure
              key={wk.n}
              data-vv="sheen"
              style={{
                position: "relative",
                flex: "none",
                width: "clamp(240px,26vw,380px)",
                margin: 0,
                scrollSnapAlign: "start",
                willChange: "transform",
              }}
            >
              <div
                style={{
                  aspectRatio: "4/5",
                  position: "relative",
                  overflow: "hidden",
                  background:
                    "radial-gradient(ellipse 70% 55% at 35% 25%, rgba(233,194,176,.5), rgba(233,194,176,0) 70%), linear-gradient(165deg,#5E4236,#34251F)",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 16,
                    right: 16,
                    bottom: 16,
                    font: `400 9.5px/1.55 ${MONO}`,
                    color: "rgba(250,246,240,.74)",
                  }}
                >
                  {wk.cap}
                </span>
              </div>
              <figcaption
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 14,
                  font: `500 11px/1 ${INTER}`,
                  letterSpacing: ".18em",
                  textTransform: "uppercase",
                  color: "#D6CABE",
                }}
              >
                <span>{wk.t}</span>
                <span>{wk.n}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── 07 Відгуки ────────────────────────────────────────── */}
      <section
        id="reviews"
        style={{ position: "relative", background: "#F4EDE3", padding: `clamp(96px,14vw,180px) ${PAD_X}` }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: "50%",
            height: "60%",
            background: "radial-gradient(ellipse at 0% 100%, rgba(217,163,140,.26), rgba(217,163,140,0) 65%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", ...SHELL }}>
          <SectionHead num="07" label="Відгуки" />
          <Hairline />
          <div style={{ maxWidth: 1040, margin: "clamp(64px,10vh,120px) auto 0" }}>
            <div
              id="vv-swatch"
              data-vv="press"
              aria-hidden
              style={{
                display: "block",
                width: 96,
                height: 26,
                marginBottom: 40,
                background:
                  "linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,0) 40%,rgba(0,0,0,.14)),repeating-linear-gradient(177deg,rgba(255,255,255,.07) 0 2px,rgba(0,0,0,0) 2px 7px),#9E1B32",
                borderRadius: "40% 16% 30% 50% / 60% 40% 60% 44%",
                filter: "url(#vv-wax)",
              }}
            />
            <div id="vv-quote" style={{ position: "relative" }}>
              <blockquote
                style={{
                  margin: 0,
                  font: `italic 300 clamp(36px,4.4vw,68px)/1.14 ${CORM}`,
                  letterSpacing: "-.01em",
                  textWrap: "pretty",
                }}
              >
                {review.q}
              </blockquote>
              <div
                style={{
                  marginTop: 28,
                  font: `500 11px/1 ${INTER}`,
                  letterSpacing: ".2em",
                  textTransform: "uppercase",
                  color: "#6E5E52",
                }}
              >
                {review.a}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 36, marginLeft: -14 }}>
              {REVIEWS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goReview(i)}
                  aria-label={`Відгук ${i + 1}`}
                  style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <span
                    style={{
                      display: "block",
                      width: i === rev ? 28 : 14,
                      height: 1,
                      background: "#1A1310",
                      opacity: i === rev ? 1 : 0.35,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 08 Філії ──────────────────────────────────────────── */}
      <section
        id="branches"
        style={{
          position: "relative",
          background: "#1C1411",
          color: "#FAF6F0",
          padding: `clamp(96px,14vw,180px) ${PAD_X}`,
        }}
      >
        <div style={SHELL}>
          <SectionHead num="08" label="Філії" dark />
          <Hairline dark />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))",
              gap: "clamp(40px,6vw,96px)",
              marginTop: "clamp(56px,8vw,96px)",
            }}
          >
            {BRANCHES.map((b) => (
              <article
                key={b.k}
                style={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: 520, justifySelf: "center" }}
              >
                <div
                  data-vv="sheen"
                  style={{
                    position: "relative",
                    aspectRatio: "4/5",
                    borderRadius: "999px 999px 0 0",
                    overflow: "hidden",
                    border: "1px solid rgba(201,179,126,.55)",
                    background:
                      "radial-gradient(ellipse 60% 45% at 50% 28%, rgba(233,194,176,.42), rgba(233,194,176,0) 70%), linear-gradient(180deg,#4A352C,#2A1F1A)",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 28,
                      textAlign: "center",
                      padding: "0 24px",
                      font: `400 10px/1.6 ${MONO}`,
                      color: "rgba(250,246,240,.72)",
                    }}
                  >
                    <span style={{ display: "block", letterSpacing: ".14em" }}>ДЗЕРКАЛО · 4:5, АРКА</span>
                    {b.cap}
                  </span>
                </div>
                <div
                  style={{
                    font: `500 11px/1 ${INTER}`,
                    letterSpacing: ".22em",
                    textTransform: "uppercase",
                    color: "#D9A38C",
                    marginTop: 32,
                  }}
                >
                  {b.k}
                </div>
                <h3
                  style={{
                    margin: "14px 0 0",
                    font: `200 clamp(40px,4.4vw,64px)/1 ${NOTO}`,
                    letterSpacing: "-.03em",
                  }}
                >
                  {b.n}
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 20,
                    marginTop: 28,
                    paddingTop: 20,
                    borderTop: "1px solid rgba(250,246,240,.16)",
                    font: `400 14px/1.5 ${INTER}`,
                    color: "#D6CABE",
                  }}
                >
                  <div>
                    {b.addr}
                    <br />
                    <a
                      href={mapsUrl(b.addr)}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        minHeight: 44,
                        color: "#FAF6F0",
                        borderBottom: "1px solid #C9B37E",
                      }}
                    >
                      Як дістатися
                    </a>
                  </div>
                  <div>
                    {HOURS}
                    <br />
                    <span style={{ font: `400 12px/2.6 ${MONO}`, color: "#A89A8E" }}>{PHONE_PLACEHOLDER}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 09 Запрошення ─────────────────────────────────────── */}
      <section
        id="final"
        style={{
          position: "relative",
          background: "#F4EDE3",
          padding: `clamp(120px,18vw,240px) ${PAD_X}`,
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "80%",
            height: "80%",
            transform: "translate(-50%,-50%)",
            background: "radial-gradient(ellipse at 50% 50%, rgba(217,163,140,.3), rgba(217,163,140,0) 65%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative" }}>
          <span
            data-vv="numfill"
            style={{
              font: `100 clamp(56px,6vw,88px)/.8 ${NOTO}`,
              color: "transparent",
              WebkitTextStroke: "1px #1A1310",
            }}
          >
            09
          </span>
          <h2
            style={{
              margin: "40px 0 0",
              font: `200 clamp(60px,10vw,180px)/.95 ${NOTO}`,
              letterSpacing: "-.04em",
            }}
          >
            Чекаємо на
            <br />
            <span
              data-vv="write"
              data-delay="300"
              style={{
                display: "inline-block",
                font: `400 clamp(80px,13vw,236px)/1.1 ${VIBES}`,
                letterSpacing: 0,
                color: "#9E1B32",
                filter: "url(#vv-wax-t)",
              }}
            >
              вас
            </span>
          </h2>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 48 }}>
            <Link
              href={BOOKING}
              data-vv="lipbtn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 60,
                padding: "0 44px",
                border: "1px solid #1A1310",
                color: "#1A1310",
                font: `500 12px/1 ${INTER}`,
                letterSpacing: ".22em",
                textTransform: "uppercase",
              }}
            >
              Записатися
            </Link>
          </div>
          <p style={{ margin: "28px 0 0", font: `400 14px/1.6 ${INTER}`, color: "#6E5E52" }}>
            Або напишіть у Telegram —{" "}
            <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" style={{ color: "#9E1B32" }}>
              {TELEGRAM_BOT}
            </a>
          </p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer
        style={{
          background: "#1C1411",
          color: "#FAF6F0",
          padding: `clamp(64px,8vw,112px) ${PAD_X} 32px`,
        }}
      >
        <div style={SHELL}>
          <div
            aria-label="VISAVIS"
            style={{
              display: "flex",
              justifyContent: "space-between",
              font: `100 clamp(64px,17vw,272px)/.85 ${NOTO}`,
              letterSpacing: "-.02em",
            }}
          >
            {"VISAVIS".split("").map((c, i) => (
              <span key={i} data-vv="fillchar">
                {c}
              </span>
            ))}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))",
              gap: 32,
              marginTop: 56,
              paddingTop: 28,
              borderTop: "1px solid rgba(250,246,240,.16)",
              font: `400 13px/1.9 ${INTER}`,
              color: "#D6CABE",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  font: `500 10px/1 ${INTER}`,
                  letterSpacing: ".22em",
                  textTransform: "uppercase",
                  color: "#A89A8E",
                  marginBottom: 14,
                }}
              >
                Навігація
              </span>
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href}>
                  {l.label}
                </a>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  font: `500 10px/1 ${INTER}`,
                  letterSpacing: ".22em",
                  textTransform: "uppercase",
                  color: "#A89A8E",
                  marginBottom: 14,
                }}
              >
                Філії
              </span>
              <span>Visavis на Сумській</span>
              <span>Visavis на Павловому Полі</span>
              <span>{HOURS}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  font: `500 10px/1 ${INTER}`,
                  letterSpacing: ".22em",
                  textTransform: "uppercase",
                  color: "#A89A8E",
                  marginBottom: 14,
                }}
              >
                Соцмережі
              </span>
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
                Instagram
              </a>
              <a href={TELEGRAM_URL} target="_blank" rel="noreferrer">
                Telegram · {TELEGRAM_BOT}
              </a>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 56,
              font: `400 12px/1 ${INTER}`,
              color: "#A89A8E",
            }}
          >
            <span>© {new Date().getFullYear()} Visavis, Харків</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
