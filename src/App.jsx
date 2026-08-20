// @ts-nocheck
import { useState, useEffect, useRef } from 'react'
import {
  useArticles,
  useDossiers,
  usePublications,
  useEquipe,
  stripHtml,
  formatDate,
  FALLBACK,
} from './hooks/useContent'

// ─── Couleurs ─────────────────────────────────────────────────────────────────
const C = {
  primary: '#B3D017',
  secondary: '#536B88',
  dark: '#222222',
  white: '#FFFFFF',
  bg: '#F7F6F2',
  border: '#E4E2DA',
  muted: '#888880',
  error: '#C0392B',
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────
function formatFCFA(valeur) {
  if (!valeur && valeur !== 0) return ''
  const num = typeof valeur === 'string'
    ? parseFloat(valeur.replace(/[^\d.,]/g, '').replace(',', '.'))
    : valeur
  if (isNaN(num)) return String(valeur)
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num).replace('XOF', 'FCFA').trim()
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ w = '100%', h = 16, radius = 3, mb = 0 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'linear-gradient(90deg, #e8e6df 25%, #f0ede6 50%, #e8e6df 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      marginBottom: mb,
    }} />
  )
}

function CardSkeleton() {
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
      <Skeleton w="100%" h={196} radius={0} />
      <div style={{ padding: 20 }}>
        <Skeleton h={12} w="60%" mb={12} />
        <Skeleton h={20} mb={8} />
        <Skeleton h={14} mb={6} />
        <Skeleton h={14} w="80%" mb={16} />
        <Skeleton h={12} w="50%" />
      </div>
    </div>
  )
}

// ─── Bloc erreur API ──────────────────────────────────────────────────────────
function ErreurAPI({ message, section }) {
  return (
    <div style={{
      maxWidth: 560, margin: '60px auto', padding: '32px',
      background: '#fff8f8', border: `1px solid #f0c0bc`, borderRadius: 8,
      borderLeft: `4px solid ${C.error}`,
    }}>
      <h3 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 20, color: C.error, margin: '0 0 10px' }}>
        Connexion WordPress impossible
      </h3>
      <p style={{ fontSize: 14, color: '#555', margin: '0 0 16px', lineHeight: 1.6, fontFamily: '"Work Sans", sans-serif' }}>
        Impossible de récupérer les <strong>{section}</strong> depuis WordPress. Vérifie l'URL GraphQL dans <code style={{ background: '#f0ede6', padding: '2px 6px', borderRadius: 3, fontSize: 13 }}>src/lib/api.js</code> et que l'extension WPGraphQL est activée.
      </p>
      <details style={{ fontSize: 13, color: '#888' }}>
        <summary style={{ cursor: 'pointer', fontFamily: '"Work Sans", sans-serif' }}>Détail de l'erreur</summary>
        <pre style={{ marginTop: 8, padding: 12, background: '#f9f9f9', borderRadius: 4, overflow: 'auto', fontSize: 12, color: '#c00' }}>{message}</pre>
      </details>
    </div>
  )
}

// ─── Tag ──────────────────────────────────────────────────────────────────────
function Tag({ label, color = C.secondary, filled = false }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 2,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
      color: filled ? '#fff' : color,
      background: filled ? color : 'transparent',
      border: `1px solid ${color}`,
      fontFamily: '"Work Sans", sans-serif',
    }}>
      {label}
    </span>
  )
}

// ─── En-tête de section ───────────────────────────────────────────────────────
function SectionHeader({ titre, sous, accentColor = C.primary }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <h1 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 'clamp(28px,4vw,48px)', color: C.dark, margin: 0, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
        {titre}
      </h1>
      {sous && <p style={{ marginTop: 12, fontSize: 16, color: C.muted, fontFamily: '"Work Sans", sans-serif', maxWidth: 540 }}>{sous}</p>}
      <div style={{ marginTop: 18, width: 48, height: 3, background: accentColor }} />
    </div>
  )
}

// ─── Bouton filtre ────────────────────────────────────────────────────────────
function FiltreBtn({ actif, onClick, children, color = C.dark }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 16px', borderRadius: 2, cursor: 'pointer',
      border: `1px solid ${actif ? color : C.border}`,
      background: actif ? color : 'transparent',
      color: actif ? '#fff' : C.dark,
      fontFamily: '"Work Sans", sans-serif', fontSize: 13, fontWeight: 500,
      transition: 'all 0.15s',
    }}>
      {children}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════
// NAVBAR
// ═══════════════════════════════════════════════════════════════
function Navbar({ page, setPage }) {
  const liens = [
    { label: 'Actualités', val: 'actualites' },
    { label: 'Dossiers', val: 'dossiers' },
    { label: 'Publications', val: 'publications' },
    { label: 'Équipe', val: 'equipe' },
    { label: 'Contact', val: 'contact' },
  ]
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav style={{ background: C.dark, borderBottom: `3px solid ${C.primary}`, position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62 }}>
        {/* Logo */}
        <button onClick={() => setPage('accueil')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: C.primary, width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 3C9 3 5 7 5 11c0 2.5 1.2 4.5 3 6l4 4 4-4c1.8-1.5 3-3.5 3-6 0-4-4-8-7-8z" fill="#222" />
            </svg>
          </div>
          <span style={{ color: '#fff', fontFamily: '"DM Serif Display", serif', fontSize: 20, letterSpacing: '-0.01em' }}>Colibris</span>
        </button>

        {/* Liens desktop */}
        <div style={{ display: 'flex', gap: 0 }}>
          {liens.map((l) => (
            <button key={l.val} onClick={() => setPage(l.val)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: page === l.val ? C.primary : 'rgba(255,255,255,0.65)',
              borderBottom: page === l.val ? `2px solid ${C.primary}` : '2px solid transparent',
              fontFamily: '"Work Sans", sans-serif', fontWeight: 500, fontSize: 13,
              padding: '4px 14px', transition: 'color 0.15s',
            }}>
              {l.label}
            </button>
          ))}
        </div>

        <button onClick={() => setPage('contact')} style={{ background: C.primary, color: C.dark, fontFamily: '"Work Sans", sans-serif', fontWeight: 700, fontSize: 12, padding: '9px 20px', borderRadius: 3, border: 'none', cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Faire un don
        </button>
      </div>

      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @media (max-width: 768px) { .nav-links { display: none !important; } }
      `}</style>
    </nav>
  )
}

// ═══════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════
function Footer({ setPage }) {
  return (
    <footer style={{ background: C.dark, color: 'rgba(255,255,255,0.5)', padding: '56px 32px 32px', marginTop: 80 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 36, marginBottom: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ background: C.primary, width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3C9 3 5 7 5 11c0 2.5 1.2 4.5 3 6l4 4 4-4c1.8-1.5 3-3.5 3-6 0-4-4-8-7-8z" fill="#222" /></svg>
              </div>
              <span style={{ color: '#fff', fontFamily: '"DM Serif Display", serif', fontSize: 18 }}>Colibris</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 220 }}>Ensemble pour une société écologique et solidaire.</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              {['f', 'tw', 'ig', 'yt'].map((r) => (
                <div key={r} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: '"Work Sans", sans-serif', fontWeight: 700 }}>{r}</span>
                </div>
              ))}
            </div>
          </div>

          {[
            { titre: 'Contenus', liens: [['Actualités', 'actualites'], ['Dossiers', 'dossiers'], ['Publications', 'publications']] },
            { titre: 'Mouvement', liens: [['Notre équipe', 'equipe'], ['Nos valeurs', 'contact'], ['Contact', 'contact']] },
            { titre: 'Agir', liens: [['Groupes locaux', 'contact'], ['Faire un don', 'contact'], ['Adhérer', 'contact']] },
          ].map((col) => (
            <div key={col.titre}>
              <h4 style={{ color: '#fff', fontFamily: '"Work Sans", sans-serif', fontWeight: 600, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>{col.titre}</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.liens.map(([label, dest]) => (
                  <li key={label}>
                    <button onClick={() => setPage(dest)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 13, padding: 0, fontFamily: '"Work Sans", sans-serif', textDecoration: 'none' }}>{label}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20, fontSize: 12, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span>© 2024 Mouvement Colibris — Association loi 1901</span>
          <span>Mentions légales · Politique de confidentialité · Plan du site</span>
        </div>
      </div>
    </footer>
  )
}

// ═══════════════════════════════════════════════════════════════
// PAGE ACCUEIL
// ═══════════════════════════════════════════════════════════════
function Accueil({ setPage }) {
  const { data: articles, loading: laA } = useArticles()
  const { data: dossiers, loading: laD } = useDossiers()

  const chiffres = [
    { val: '50 000+', label: 'membres actifs' },
    { val: '300+', label: 'groupes locaux' },
    { val: '18 ans', label: 'd\'engagement' },
    { val: '90°', label: 'revue trimestrielle' },
  ]

  return (
    <div>
      {/* ── Hero ── */}
      <section style={{ position: 'relative', height: '88vh', minHeight: 520, overflow: 'hidden', background: '#1a2010' }}>
        <img
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1800&h=1000&fit=crop&auto=format"
          alt="Paysage naturel"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.38 }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, rgba(34,34,34,0.94) 0%, rgba(34,34,34,0.45) 55%, transparent 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '0 32px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ maxWidth: 640 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(179,208,23,0.12)', border: '1px solid rgba(179,208,23,0.35)', borderRadius: 2, padding: '5px 12px', marginBottom: 26 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.primary }} />
              <span style={{ color: C.primary, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: '"Work Sans", sans-serif' }}>Mouvement citoyen</span>
            </div>
            <h1 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 'clamp(32px, 5.5vw, 64px)', color: '#fff', lineHeight: 1.06, margin: '0 0 20px', letterSpacing: '-0.025em' }}>
              Ensemble, construisons<br />
              <em style={{ color: C.primary, fontStyle: 'italic' }}>une société écologique</em><br />
              et solidaire
            </h1>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.70)', lineHeight: 1.75, maxWidth: 460, marginBottom: 34, fontFamily: '"Work Sans", sans-serif', fontWeight: 300 }}>
              Le Mouvement Colibris accompagne celles et ceux qui agissent pour transformer leur quotidien et leurs territoires.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <button onClick={() => setPage('actualites')} style={{ background: C.primary, color: C.dark, fontFamily: '"Work Sans", sans-serif', fontWeight: 700, fontSize: 14, padding: '14px 28px', borderRadius: 3, border: 'none', cursor: 'pointer', letterSpacing: '0.02em' }}>
                Lire les actualités
              </button>
              <button onClick={() => setPage('dossiers')} style={{ background: 'transparent', color: '#fff', fontFamily: '"Work Sans", sans-serif', fontWeight: 600, fontSize: 14, padding: '14px 28px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.35)', cursor: 'pointer' }}>
                Explorer les dossiers
              </button>
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: '"Work Sans", sans-serif', letterSpacing: '0.08em' }}>DÉFILER</span>
          <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.18)' }} />
        </div>
      </section>

      {/* ── Chiffres clés ── */}
      <section style={{ background: C.primary }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
          {chiffres.map((c, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '16px', borderRight: i < 3 ? '1px solid rgba(34,34,34,0.15)' : 'none' }}>
              <div style={{ fontFamily: '"DM Serif Display", serif', fontSize: 34, color: C.dark, lineHeight: 1 }}>{c.val}</div>
              <div style={{ fontSize: 13, color: 'rgba(34,34,34,0.62)', fontFamily: '"Work Sans", sans-serif', marginTop: 4 }}>{c.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Dernières actualités ── */}
      <section style={{ background: C.white, padding: '72px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36 }}>
            <div>
              <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 38, color: C.dark, margin: 0, letterSpacing: '-0.02em' }}>Dernières actualités</h2>
              <div style={{ marginTop: 12, width: 40, height: 3, background: C.primary }} />
            </div>
            <button onClick={() => setPage('actualites')} style={{ background: 'none', border: 'none', color: C.secondary, fontFamily: '"Work Sans", sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Toutes les actualités →
            </button>
          </div>

          {laA ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div style={{ gridRow: '1/3' }}><CardSkeleton /></div>
              <CardSkeleton /><CardSkeleton />
            </div>
          ) : articles.length === 0 ? (
            <p style={{ color: C.muted, fontFamily: '"Work Sans", sans-serif', fontSize: 15 }}>Aucun article publié pour l'instant.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Article vedette */}
              <div style={{ gridRow: '1/3', position: 'relative', overflow: 'hidden', borderRadius: 6, cursor: 'pointer', background: '#111', minHeight: 360 }}>
                <img
                  src={articles[0]?.featuredImage?.node?.sourceUrl ?? FALLBACK.article}
                  alt={articles[0]?.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.52, position: 'absolute', inset: 0 }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.88) 40%, transparent 100%)' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 28 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    {articles[0]?.tags?.nodes?.slice(0, 2).map((t) => <Tag key={t.name} label={t.name} color={C.primary} />)}
                  </div>
                  <h3 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 24, color: '#fff', margin: '0 0 10px', lineHeight: 1.2 }}>{articles[0]?.title}</h3>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', margin: '0 0 12px', lineHeight: 1.6, fontFamily: '"Work Sans", sans-serif' }}>
                    {stripHtml(articles[0]?.excerpt ?? '').slice(0, 110)}…
                  </p>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: '"Work Sans", sans-serif' }}>
                    {articles[0]?.author?.node?.name} · {formatDate(articles[0]?.date)}
                  </span>
                </div>
              </div>

              {/* Petites cartes */}
              {articles.slice(1, 3).map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: 16, padding: 16, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>
                  <div style={{ width: 96, height: 76, flexShrink: 0, borderRadius: 4, overflow: 'hidden', background: '#dde8cc' }}>
                    <img src={a.featuredImage?.node?.sourceUrl ?? FALLBACK.article} alt={a.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: 6 }}>
                      {a.tags?.nodes?.slice(0, 1).map((t) => <Tag key={t.name} label={t.name} color={C.secondary} />)}
                    </div>
                    <h4 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 16, color: C.dark, margin: '0 0 6px', lineHeight: 1.3 }}>{a.title}</h4>
                    <span style={{ fontSize: 12, color: C.muted, fontFamily: '"Work Sans", sans-serif' }}>{a.author?.node?.name} · {formatDate(a.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Dossiers ── */}
      <section style={{ background: C.bg, padding: '72px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36 }}>
            <div>
              <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 38, color: C.dark, margin: 0, letterSpacing: '-0.02em' }}>Dossiers thématiques</h2>
              <div style={{ marginTop: 12, width: 40, height: 3, background: C.secondary }} />
            </div>
            <button onClick={() => setPage('dossiers')} style={{ background: 'none', border: 'none', color: C.secondary, fontFamily: '"Work Sans", sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Tous les dossiers →
            </button>
          </div>
          {laD ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 20 }}>
              {[1, 2, 3, 4].map((k) => <CardSkeleton key={k} />)}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 20 }}>
              {dossiers.slice(0, 4).map((d, i) => (
                <div key={d.id} onClick={() => setPage('dossiers')} style={{ cursor: 'pointer', overflow: 'hidden', borderRadius: 6, background: '#fff', border: `1px solid ${C.border}`, transition: 'transform 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(0,0,0,0.10)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                  <div style={{ height: 160, overflow: 'hidden', background: '#c8d8c0' }}>
                    <img src={d.featuredImage?.node?.sourceUrl ?? FALLBACK.dossier} alt={d.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '18px 20px', borderTop: `3px solid ${i % 2 === 0 ? C.primary : C.secondary}` }}>
                    <h3 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 19, color: C.dark, margin: '0 0 8px', lineHeight: 1.25 }}>{d.title}</h3>
                    <p style={{ fontSize: 13, color: C.muted, margin: '0 0 12px', lineHeight: 1.6, fontFamily: '"Work Sans", sans-serif' }}>
                      {(d.dossierFields?.description ?? '').slice(0, 90)}{d.dossierFields?.description?.length > 90 ? '…' : ''}
                    </p>
                    <span style={{ fontSize: 12, color: i % 2 === 0 ? C.primary : C.secondary, fontWeight: 700, fontFamily: '"Work Sans", sans-serif' }}>
                      {d.dossierFields?.nombreArticles ?? 0} articles
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA Don ── */}
      <section style={{ background: C.primary, padding: '56px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 34, color: C.dark, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            Soutenez le mouvement
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(34,34,34,0.68)', margin: '0 0 28px', lineHeight: 1.6, fontFamily: '"Work Sans", sans-serif' }}>
            Votre don en FCFA permet de financer nos programmes, la revue et l'accompagnement des groupes locaux.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
            {[2000, 5000, 10000, 25000].map((m) => (
              <button key={m} onClick={() => setPage('contact')} style={{ background: 'rgba(34,34,34,0.1)', color: C.dark, fontFamily: '"Work Sans", sans-serif', fontWeight: 600, fontSize: 13, padding: '10px 18px', borderRadius: 3, border: '1px solid rgba(34,34,34,0.25)', cursor: 'pointer' }}>
                {formatFCFA(m)}
              </button>
            ))}
          </div>
          <button onClick={() => setPage('contact')} style={{ background: C.dark, color: '#fff', fontFamily: '"Work Sans", sans-serif', fontWeight: 700, fontSize: 13, padding: '14px 32px', borderRadius: 3, border: 'none', cursor: 'pointer', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
            Faire un don
          </button>
        </div>
      </section>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// PAGE ACTUALITÉS
// ═══════════════════════════════════════════════════════════════
function Actualites() {
  const { data: articles, loading, error } = useArticles()
  const [filtre, setFiltre] = useState(null)

  const allTags = Array.from(new Set((articles ?? []).flatMap((a) => a.tags?.nodes?.map((t) => t.name) ?? [])))
  const filtres = filtre ? articles.filter((a) => a.tags?.nodes?.some((t) => t.name === filtre)) : articles

  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 32px' }}>
      <SectionHeader titre="Actualités" sous="Toutes les nouvelles du Mouvement Colibris et de la transition écologique." />

      {error ? (
        <ErreurAPI message={error} section="actualités" />
      ) : (
        <>
          {/* Filtres */}
          {!loading && allTags.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 36, flexWrap: 'wrap' }}>
              <FiltreBtn actif={filtre === null} onClick={() => setFiltre(null)}>Tout</FiltreBtn>
              {allTags.map((t) => (
                <FiltreBtn key={t} actif={filtre === t} onClick={() => setFiltre(t)} color={C.secondary}>{t}</FiltreBtn>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 28 }}>
            {loading
              ? [1, 2, 3, 4, 5, 6].map((k) => <CardSkeleton key={k} />)
              : filtres.map((a) => (
                <article key={a.id} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}>
                  <div style={{ height: 200, overflow: 'hidden', background: '#c8d8c0' }}>
                    <img src={a.featuredImage?.node?.sourceUrl ?? FALLBACK.article} alt={a.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s' }} />
                  </div>
                  <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {a.tags?.nodes?.map((t) => <Tag key={t.name} label={t.name} color={C.secondary} />)}
                    </div>
                    <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 20, color: C.dark, margin: 0, lineHeight: 1.3 }}>{a.title}</h2>
                    <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.65, fontFamily: '"Work Sans", sans-serif' }}>
                      {stripHtml(a.excerpt ?? '').slice(0, 130)}…
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, fontFamily: '"Work Sans", sans-serif', borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                      <span>{a.author?.node?.name}</span>
                      <span>{formatDate(a.date)}</span>
                    </div>
                  </div>
                </article>
              ))}
          </div>

          {!loading && filtres.length === 0 && (
            <p style={{ color: C.muted, fontFamily: '"Work Sans", sans-serif', fontSize: 15, textAlign: 'center', padding: '40px 0' }}>Aucun article pour ce filtre.</p>
          )}
        </>
      )}
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════
// PAGE DOSSIERS
// ═══════════════════════════════════════════════════════════════
function Dossiers() {
  const { data: dossiers, loading, error } = useDossiers()

  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 32px' }}>
      <SectionHeader titre="Dossiers thématiques" sous="Enquêtes et synthèses en profondeur sur les grands enjeux de la transition." accentColor={C.secondary} />

      {error ? (
        <ErreurAPI message={error} section="dossiers" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px,1fr))', gap: 28 }}>
          {loading
            ? [1, 2, 3, 4].map((k) => <CardSkeleton key={k} />)
            : dossiers.map((d, i) => {
              const couleur = i % 2 === 0 ? C.primary : C.secondary
              return (
                <div key={d.id} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}>
                  <div style={{ height: 220, overflow: 'hidden', background: '#ccc', position: 'relative' }}>
                    <img src={d.featuredImage?.node?.sourceUrl ?? FALLBACK.dossier} alt={d.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent)' }} />
                  </div>
                  <div style={{ borderTop: `4px solid ${couleur}`, padding: '20px 22px' }}>
                    <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 24, color: C.dark, margin: '0 0 10px', lineHeight: 1.2 }}>{d.title}</h2>
                    <p style={{ fontSize: 14, color: C.muted, margin: '0 0 16px', lineHeight: 1.65, fontFamily: '"Work Sans", sans-serif' }}>{d.dossierFields?.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: couleur, fontWeight: 700, fontFamily: '"Work Sans", sans-serif', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        {d.dossierFields?.nombreArticles ?? 0} articles
                      </span>
                      <span style={{ fontSize: 13, color: couleur, fontWeight: 600, fontFamily: '"Work Sans", sans-serif' }}>Lire le dossier →</span>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      )}
      {!loading && !error && dossiers.length === 0 && (
        <p style={{ color: C.muted, fontFamily: '"Work Sans", sans-serif', fontSize: 15, textAlign: 'center', padding: '40px 0' }}>Aucun dossier publié pour l'instant.</p>
      )}
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════
// PAGE PUBLICATIONS (prix en FCFA)
// ═══════════════════════════════════════════════════════════════
function Publications() {
  const { data: publications, loading, error } = usePublications()

  return (
    <section style={{ background: C.bg, minHeight: '80vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 32px' }}>
        <SectionHeader titre="Publications" sous="La Revue 90° et nos guides pratiques pour accompagner vos engagements." />

        {error ? (
          <ErreurAPI message={error} section="publications" />
        ) : loading ? (
          <>
            <div style={{ background: C.dark, borderRadius: 8, padding: 40, marginBottom: 40, height: 200, opacity: 0.15 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 24 }}>
              {[1, 2, 3, 4].map((k) => <CardSkeleton key={k} />)}
            </div>
          </>
        ) : (
          <>
            {/* Hero dernier numéro */}
            {publications[0] && (
              <div style={{ background: C.dark, borderRadius: 8, padding: '40px 48px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 40, alignItems: 'center', marginBottom: 48 }}>
                <div>
                  <span style={{ background: C.primary, color: C.dark, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 2, fontFamily: '"Work Sans", sans-serif', display: 'inline-block', marginBottom: 16 }}>
                    Dernier numéro
                  </span>
                  <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 'clamp(22px, 3vw, 38px)', color: '#fff', margin: '0 0 8px', lineHeight: 1.1 }}>
                    {publications[0].title}
                  </h2>
                  <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', margin: '0 0 18px', fontFamily: '"Work Sans", sans-serif', fontStyle: 'italic' }}>
                    {publications[0].publicationFields?.soustitre}
                  </p>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'rgba(255,255,255,0.45)', fontFamily: '"Work Sans", sans-serif', marginBottom: 28, flexWrap: 'wrap' }}>
                    <span>{publications[0].publicationFields?.dateParution}</span>
                    {publications[0].publicationFields?.nombrePages > 0 && <><span>·</span><span>{publications[0].publicationFields.nombrePages} pages</span></>}
                    <span>·</span>
                    <span style={{ color: C.primary, fontWeight: 700 }}>{formatFCFA(publications[0].publicationFields?.prix) || publications[0].publicationFields?.prix}</span>
                  </div>
                  <a href={publications[0].publicationFields?.lienBoutique ?? '#'} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'inline-block', background: C.primary, color: C.dark, fontFamily: '"Work Sans", sans-serif', fontWeight: 700, fontSize: 13, padding: '13px 26px', borderRadius: 3, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                    Commander ce numéro
                  </a>
                </div>
                <div style={{ width: 140, height: 196, borderRadius: 4, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.5)', flexShrink: 0 }}>
                  <img src={publications[0].featuredImage?.node?.sourceUrl ?? FALLBACK.publication} alt={publications[0].title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            )}

            {/* Grille toutes publications */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 24 }}>
              {publications.map((p) => {
                const prix = formatFCFA(p.publicationFields?.prix) || p.publicationFields?.prix || 'Gratuit'
                return (
                  <article key={p.id} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}>
                    <div style={{ height: 260, overflow: 'hidden', background: '#c8ccd8', position: 'relative' }}>
                      <img src={p.featuredImage?.node?.sourceUrl ?? FALLBACK.publication} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      {p.publicationFields?.dateParution && (
                        <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.72)', color: '#fff', fontSize: 11, padding: '3px 8px', borderRadius: 2, fontFamily: '"Work Sans", sans-serif' }}>
                          {p.publicationFields.dateParution}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '16px 18px' }}>
                      <h3 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 17, color: C.dark, margin: '0 0 4px', lineHeight: 1.25 }}>{p.title}</h3>
                      {p.publicationFields?.soustitre && (
                        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 14px', fontFamily: '"Work Sans", sans-serif', fontStyle: 'italic' }}>{p.publicationFields.soustitre}</p>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.dark, fontFamily: '"Work Sans", sans-serif' }}>{prix}</span>
                        <a href={p.publicationFields?.lienBoutique ?? '#'} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', background: C.secondary, color: '#fff', fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 2, fontFamily: '"Work Sans", sans-serif' }}>
                          Commander
                        </a>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            {publications.length === 0 && (
              <p style={{ color: C.muted, fontFamily: '"Work Sans", sans-serif', fontSize: 15, textAlign: 'center', padding: '40px 0' }}>Aucune publication disponible pour l'instant.</p>
            )}
          </>
        )}
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════
// PAGE ÉQUIPE
// ═══════════════════════════════════════════════════════════════
function Equipe() {
  const { data: membres, loading, error } = useEquipe()
  const [pole, setPole] = useState(null)

  const poles = Array.from(new Set((membres ?? []).map((m) => m.membreMeta?.pole).filter(Boolean)))
  const filtres = pole ? membres.filter((m) => m.membreMeta?.pole === pole) : membres

  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 32px' }}>
      <SectionHeader titre="Notre équipe" sous="Rencontrez les personnes qui font vivre le Mouvement Colibris au quotidien." accentColor={C.secondary} />

      {error ? (
        <ErreurAPI message={error} section="membres de l'équipe" />
      ) : (
        <>
          {!loading && poles.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 40, flexWrap: 'wrap' }}>
              <FiltreBtn actif={pole === null} onClick={() => setPole(null)}>Tous</FiltreBtn>
              {poles.map((p) => (
                <FiltreBtn key={p} actif={pole === p} onClick={() => setPole(p)} color={C.secondary}>{p}</FiltreBtn>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 24 }}>
            {loading
              ? [1, 2, 3, 4, 5, 6].map((k) => <CardSkeleton key={k} />)
              : filtres.map((m) => (
                <div key={m.id} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', transition: 'box-shadow 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.08)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '' }}>
                  <div style={{ height: 220, overflow: 'hidden', background: '#d8dde6', position: 'relative' }}>
                    <img src={m.membreMeta?.photo ?? m.featuredImage?.node?.sourceUrl ?? FALLBACK.portrait} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
                    {m.membreMeta?.pole && (
                      <div style={{ position: 'absolute', top: 12, left: 12, background: C.secondary, color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 2, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: '"Work Sans", sans-serif' }}>
                        {m.membreMeta.pole}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '18px 20px' }}>
                    <h3 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 20, color: C.dark, margin: '0 0 4px' }}>{m.title}</h3>
                    {m.membreMeta?.fonctionMembre && (
                      <p style={{ fontSize: 13, color: C.secondary, fontWeight: 600, margin: '0 0 10px', fontFamily: '"Work Sans", sans-serif' }}>{m.membreMeta.fonctionMembre}</p>
                    )}
                    {m.membreMeta?.bio && (
                      <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.65, fontFamily: '"Work Sans", sans-serif' }}>{m.membreMeta.bio}</p>
                    )}
                  </div>
                </div>
              ))}
          </div>
          {!loading && filtres.length === 0 && (
            <p style={{ color: C.muted, fontFamily: '"Work Sans", sans-serif', fontSize: 15, textAlign: 'center', padding: '40px 0' }}>Aucun membre pour ce filtre.</p>
          )}
        </>
      )}
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════
// PAGE CONTACT
// ═══════════════════════════════════════════════════════════════
function Contact() {
  const [form, setForm] = useState({ nom: '', email: '', sujet: '', message: '' })
  const [envoye, setEnvoye] = useState(false)
  const [errForm, setErrForm] = useState('')

  function onChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  function onSubmit(e) {
    e.preventDefault()
    if (!form.nom || !form.email || !form.message) {
      setErrForm('Merci de remplir les champs obligatoires (nom, email, message).')
      return
    }
    setErrForm('')
    setEnvoye(true)
  }

  const infos = [
    { icone: '📍', titre: 'Adresse', valeur: 'Mouvement Colibris\nLomé, Togo' },
    { icone: '📧', titre: 'Email', valeur: 'contact@colibris-lemouvement.org' },
    { icone: '📞', titre: 'Téléphone', valeur: '+228 XX XX XX XX' },
    { icone: '⏰', titre: 'Horaires', valeur: 'Lun – Ven, 9h – 17h' },
  ]

  const dons = [
    { montant: 2000, label: 'Soutien de base', desc: 'Aide à couvrir les frais de fonctionnement' },
    { montant: 5000, label: 'Contributeur·rice', desc: 'Finance un article ou une formation' },
    { montant: 10000, label: 'Bâtisseur·se', desc: 'Soutient un groupe local pendant un mois' },
    { montant: 25000, label: 'Pilier du mouvement', desc: 'Permet de produire un numéro de la revue' },
  ]

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 4,
    border: `1px solid ${C.border}`, fontSize: 14, fontFamily: '"Work Sans", sans-serif',
    color: C.dark, background: '#fff', outline: 'none',
    transition: 'border-color 0.15s',
  }

  return (
    <div>
      {/* Hero contact */}
      <div style={{ background: C.dark, padding: '64px 32px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 'clamp(28px, 4vw, 52px)', color: '#fff', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          Contactez-nous
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7, fontFamily: '"Work Sans", sans-serif' }}>
          Une question, un partenariat, une idée de collaboration ? Nous lisons tous les messages.
        </p>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 32px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 60, alignItems: 'start' }}>
        {/* Formulaire */}
        <div>
          <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 28, color: C.dark, margin: '0 0 8px' }}>Envoyer un message</h2>
          <div style={{ width: 36, height: 3, background: C.primary, marginBottom: 28 }} />

          {envoye ? (
            <div style={{ background: '#f0f7e0', border: `1px solid ${C.primary}`, borderRadius: 8, padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
              <h3 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 22, color: C.dark, margin: '0 0 8px' }}>Message envoyé !</h3>
              <p style={{ fontSize: 14, color: C.muted, fontFamily: '"Work Sans", sans-serif', margin: 0, lineHeight: 1.6 }}>
                Merci <strong>{form.nom}</strong>, nous vous répondrons à l'adresse <strong>{form.email}</strong> dans les meilleurs délais.
              </p>
              <button onClick={() => { setEnvoye(false); setForm({ nom: '', email: '', sujet: '', message: '' }) }} style={{ marginTop: 20, background: 'none', border: `1px solid ${C.primary}`, color: C.primary, padding: '8px 20px', borderRadius: 3, cursor: 'pointer', fontFamily: '"Work Sans", sans-serif', fontWeight: 600, fontSize: 13 }}>
                Envoyer un autre message
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 6, fontFamily: '"Work Sans", sans-serif' }}>
                    Nom complet <span style={{ color: C.error }}>*</span>
                  </label>
                  <input name="nom" value={form.nom} onChange={onChange} placeholder="Marie Dupont" style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = C.primary}
                    onBlur={(e) => e.target.style.borderColor = C.border} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 6, fontFamily: '"Work Sans", sans-serif' }}>
                    Adresse email <span style={{ color: C.error }}>*</span>
                  </label>
                  <input name="email" type="email" value={form.email} onChange={onChange} placeholder="marie@exemple.com" style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = C.primary}
                    onBlur={(e) => e.target.style.borderColor = C.border} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 6, fontFamily: '"Work Sans", sans-serif' }}>Sujet</label>
                <select name="sujet" value={form.sujet} onChange={onChange} style={{ ...inputStyle, appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' fill='none'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', cursor: 'pointer' }}
                  onFocus={(e) => e.target.style.borderColor = C.primary}
                  onBlur={(e) => e.target.style.borderColor = C.border}>
                  <option value="">Choisir un sujet…</option>
                  <option>Question générale</option>
                  <option>Rejoindre un groupe local</option>
                  <option>Partenariat ou collaboration</option>
                  <option>Presse & médias</option>
                  <option>Don & soutien financier</option>
                  <option>Autre</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 6, fontFamily: '"Work Sans", sans-serif' }}>
                  Message <span style={{ color: C.error }}>*</span>
                </label>
                <textarea name="message" value={form.message} onChange={onChange} rows={6} placeholder="Décrivez votre demande…" style={{ ...inputStyle, resize: 'vertical', minHeight: 140 }}
                  onFocus={(e) => e.target.style.borderColor = C.primary}
                  onBlur={(e) => e.target.style.borderColor = C.border} />
              </div>

              {errForm && (
                <div style={{ background: '#fff8f8', border: `1px solid ${C.error}`, borderRadius: 4, padding: '10px 14px', fontSize: 13, color: C.error, fontFamily: '"Work Sans", sans-serif' }}>
                  {errForm}
                </div>
              )}

              <button type="submit" style={{ background: C.primary, color: C.dark, fontFamily: '"Work Sans", sans-serif', fontWeight: 700, fontSize: 14, padding: '14px 28px', borderRadius: 3, border: 'none', cursor: 'pointer', letterSpacing: '0.03em', textTransform: 'uppercase', alignSelf: 'flex-start' }}>
                Envoyer le message →
              </button>
            </form>
          )}
        </div>

        {/* Infos de contact */}
        <div>
          <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 24, color: C.dark, margin: '0 0 8px' }}>Nos coordonnées</h2>
          <div style={{ width: 36, height: 3, background: C.secondary, marginBottom: 24 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 36 }}>
            {infos.map((info) => (
              <div key={info.titre} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, background: C.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                  {info.icone}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: '"Work Sans", sans-serif', marginBottom: 2 }}>{info.titre}</div>
                  <div style={{ fontSize: 14, color: C.dark, fontFamily: '"Work Sans", sans-serif', whiteSpace: 'pre-line', lineHeight: 1.5 }}>{info.valeur}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Dons en FCFA */}
          <div style={{ background: C.dark, borderRadius: 8, padding: 24 }}>
            <h3 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 20, color: '#fff', margin: '0 0 6px' }}>Faire un don</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 18px', fontFamily: '"Work Sans", sans-serif', lineHeight: 1.5 }}>
              Soutenez nos actions avec un don en FCFA.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dons.map((d) => (
                <button key={d.montant} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '12px 16px', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(179,208,23,0.15)'; e.currentTarget.style.borderColor = 'rgba(179,208,23,0.4)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontFamily: '"Work Sans", sans-serif', fontWeight: 700, fontSize: 14, color: C.primary }}>{formatFCFA(d.montant)}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontFamily: '"Work Sans", sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: '"Work Sans", sans-serif' }}>{d.desc}</div>
                </button>
              ))}
            </div>
            <button style={{ marginTop: 14, width: '100%', background: C.primary, color: C.dark, fontFamily: '"Work Sans", sans-serif', fontWeight: 700, fontSize: 13, padding: '12px', borderRadius: 3, border: 'none', cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Procéder au don
            </button>
          </div>
        </div>
      </div>

      {/* Carte centrée sur Lomé, Togo */}
      <div style={{ background: C.bg, borderTop: `1px solid ${C.border}` }}>
        <iframe
          title="Carte de localisation à Lomé, Togo"
          src="https://www.openstreetmap.org/export/embed.html?bbox=1.175%2C6.075%2C1.275%2C6.175&layer=mapnik&marker=6.1256%2C1.2254"
          style={{ width: '100%', height: 280, border: 0, display: 'block' }}
          loading="lazy"
        />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// APP PRINCIPALE
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState('accueil')

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [page])

  return (
    <div style={{ minHeight: '100vh', fontFamily: '"Work Sans", sans-serif', background: C.white }}>
      <Navbar page={page} setPage={setPage} />
      <main>
        {page === 'accueil' && <Accueil setPage={setPage} />}
        {page === 'actualites' && <Actualites />}
        {page === 'dossiers' && <Dossiers />}
        {page === 'publications' && <Publications />}
        {page === 'equipe' && <Equipe />}
        {page === 'contact' && <Contact />}
      </main>
      <Footer setPage={setPage} />
    </div>
  )
}
