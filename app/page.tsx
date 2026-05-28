import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/play')
  }

  return (
    <main style={{ background: '#090807', color: '#e8e4dc', minHeight: '100vh', fontFamily: "'EB Garamond', Georgia, serif", overflowX: 'hidden' }}>

      <style>{`
        .cm-btn-primary {
          display: inline-block;
          font-family: 'Cinzel', serif;
          font-weight: 600;
          font-size: 0.8rem;
          letter-spacing: 0.35em;
          text-transform: uppercase;
          color: #090807;
          background: #feeaa5;
          padding: 1rem 3rem;
          transition: background 0.3s, opacity 0.3s;
          text-decoration: none;
        }
        .cm-btn-primary:hover { background: #e8af48; }

        .cm-btn-outline {
          display: inline-block;
          font-family: 'Cinzel', serif;
          font-weight: 500;
          font-size: 0.75rem;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #feeaa5;
          border: 1px solid rgba(254,234,165,0.35);
          padding: 0.9rem 2.5rem;
          transition: border-color 0.3s, background 0.3s;
          text-decoration: none;
        }
        .cm-btn-outline:hover { border-color: rgba(254,234,165,0.7); background: rgba(254,234,165,0.06); }

        .cm-nav-link {
          font-family: 'Cinzel', serif;
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #feeaa5;
          border: 1px solid rgba(254,234,165,0.3);
          padding: 0.45rem 1.1rem;
          transition: background 0.3s;
          text-decoration: none;
        }
        .cm-nav-link:hover { background: rgba(254,234,165,0.08); }

        .cm-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          padding: 2.5rem 2rem;
          position: relative;
          transition: border-color 0.3s, background 0.3s;
        }
        .cm-card:hover {
          border-color: rgba(254,234,165,0.15);
          background: rgba(254,234,165,0.025);
        }

        .cm-grain {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          background-repeat: repeat; opacity: 0.6;
        }
      `}</style>

      <div className="cm-grain" />

      {/* ── HERO ── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: `url('https://www.camarcello.it/wp-content/uploads/2024/09/candle-light-ca-marcello-2.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.22) saturate(0.7)' }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'radial-gradient(ellipse at center, transparent 30%, #090807 90%)' }} />

        <nav style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2.5rem' }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.8rem', letterSpacing: '0.25em', color: 'rgba(254,234,165,0.5)', textTransform: 'uppercase' }}>Ca' Marcello</span>
          <Link href="/login" className="cm-nav-link">Accedi</Link>
        </nav>

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '700px' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(254,234,165,0.45)', marginBottom: '1.5rem' }}>
            SOGLIA · Interfaccia di Rilevazione Ambientale · v1.0
          </p>
          <h1 style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 'clamp(3rem, 10vw, 7rem)', lineHeight: 1, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#feeaa5', textShadow: '0 0 60px rgba(254,234,165,0.15), 0 0 120px rgba(254,234,165,0.05)', marginBottom: '1.5rem' }}>
            Ca&apos; Marcello
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center', marginBottom: '1.8rem' }}>
            <div style={{ height: '1px', width: '60px', background: 'rgba(254,234,165,0.25)' }} />
            <span style={{ color: 'rgba(254,234,165,0.35)', fontSize: '0.7rem', letterSpacing: '0.15em' }}>✦</span>
            <div style={{ height: '1px', width: '60px', background: 'rgba(254,234,165,0.25)' }} />
          </div>
          <p style={{ fontFamily: "'EB Garamond', Georgia, serif", fontStyle: 'italic', fontSize: 'clamp(1.1rem, 2.5vw, 1.45rem)', lineHeight: 1.7, color: 'rgba(232,228,220,0.7)', margin: '0 auto 2.8rem', maxWidth: '520px' }}>
            Una villa cinquecentesca. Un segreto custodito da secoli.<br />
            Una soglia che non si dovrebbe attraversare.
          </p>
          <Link href="/login" className="cm-btn-primary">ENTRA</Link>
        </div>

        <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.3em', color: 'rgba(254,234,165,0.3)', textTransform: 'uppercase' }}>Scopri</span>
          <div style={{ width: '1px', height: '40px', background: 'linear-gradient(to bottom, rgba(254,234,165,0.3), transparent)' }} />
        </div>
      </section>

      {/* ── CITAZIONE ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '7rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: '680px', textAlign: 'center', padding: '3.5rem 3rem', background: 'rgba(254,234,165,0.02)', border: '1px solid rgba(254,234,165,0.08)', position: 'relative' }}>
          {/* Corner accents */}
          <div style={{ position: 'absolute', top: '-1px', left: '-1px', width: '18px', height: '18px', borderTop: '1px solid rgba(254,234,165,0.4)', borderLeft: '1px solid rgba(254,234,165,0.4)' }} />
          <div style={{ position: 'absolute', top: '-1px', right: '-1px', width: '18px', height: '18px', borderTop: '1px solid rgba(254,234,165,0.4)', borderRight: '1px solid rgba(254,234,165,0.4)' }} />
          <div style={{ position: 'absolute', bottom: '-1px', left: '-1px', width: '18px', height: '18px', borderBottom: '1px solid rgba(254,234,165,0.4)', borderLeft: '1px solid rgba(254,234,165,0.4)' }} />
          <div style={{ position: 'absolute', bottom: '-1px', right: '-1px', width: '18px', height: '18px', borderBottom: '1px solid rgba(254,234,165,0.4)', borderRight: '1px solid rgba(254,234,165,0.4)' }} />

          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(254,234,165,0.35)', marginBottom: '1.8rem' }}>
            TRASMISSIONE INTERNA — PROGETTO SOGLIA
          </p>
          <blockquote style={{ fontFamily: "'EB Garamond', Georgia, serif", fontStyle: 'italic', fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', lineHeight: 1.65, color: '#e8e4dc', margin: 0 }}>
            &ldquo;Non stai scannerizzando il luogo.<br />
            È il luogo che sta leggendo te.&rdquo;
          </blockquote>
        </div>
      </section>

      {/* ── TRE FAZIONI ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '4rem 2rem 7rem', maxWidth: '1100px', margin: '0 auto' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(254,234,165,0.3)', textAlign: 'center', marginBottom: '3.5rem' }}>
          ARCHIVI CLASSIFICATI · SERENISSIMA · XVI SEC.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5px' }}>
          {[
            { glyph: '⌖', title: 'I Benandanti', sub: 'Nati con la camicia', body: "Combattenti nell'ombra, nati avvolti nel sacco amniotico. Tre volte l'anno abbandonavano il corpo in spirito, armati di finocchio selvatico, per difendere i raccolti. Scomparsi. O almeno, così si crede.", status: 'STATO: NON RINTRACCIATI' },
            { glyph: '◈', title: 'I Babau', sub: 'Agenti della Serenissima', body: 'Ordine occulto fondato nel 1542 per volontà del Doge Lando. Spie. Protettori. La famiglia Marcello ne era la capostipite. Ogni evento in villa è un reclutamento mascherato.', status: 'STATO: RECLUTAMENTO ATTIVO' },
            { glyph: '⚚', title: 'La Falce', sub: 'Arma proibita', body: 'Non tagliava la carne. Colpiva ciò che non ha corpo. Forgiata con radici di finocchio raccolte nelle Quattro Tempora, immerse nel sangue di chi era nato con la camicia. Non deve essere trovata.', status: 'STATO: POSIZIONE SCONOSCIUTA' },
          ].map((card) => (
            <div key={card.title} className="cm-card">
              <div style={{ fontSize: '1.4rem', color: 'rgba(254,234,165,0.5)', marginBottom: '1.2rem', fontFamily: 'monospace' }}>{card.glyph}</div>
              <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '1rem', fontWeight: 600, letterSpacing: '0.1em', color: '#feeaa5', marginBottom: '0.3rem' }}>{card.title}</h3>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(254,234,165,0.35)', marginBottom: '1.2rem' }}>{card.sub}</p>
              <p style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '1rem', lineHeight: 1.7, color: 'rgba(232,228,220,0.65)', marginBottom: '1.5rem' }}>{card.body}</p>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: 'rgba(254,234,165,0.25)', letterSpacing: '0.1em' }}>{card.status}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── LA CACCIA È RIAPERTA ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '6rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('https://www.camarcello.it/wp-content/uploads/2020/04/giardino_italiano_villa_veneta_matrimoni.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center 30%', filter: 'brightness(0.08) saturate(0.3)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(9,8,7,0.3) 0%, #090807 70%)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(254,234,165,0.3)', marginBottom: '1.5rem' }}>
            NOVEMBRE 2026 · CA&apos; MARCELLO · CAMPAGNA VENETA
          </p>
          <h2 style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 'clamp(1.8rem, 5vw, 3rem)', lineHeight: 1.2, color: '#e8e4dc', marginBottom: '1.5rem', letterSpacing: '0.05em' }}>
            La caccia<br />è riaperta
          </h2>
          <p style={{ fontFamily: "'EB Garamond', Georgia, serif", fontStyle: 'italic', fontSize: '1.1rem', lineHeight: 1.7, color: 'rgba(232,228,220,0.55)', marginBottom: '3rem' }}>
            Gli spiriti che abitano Ca&apos; Marcello non sono fantasmi qualsiasi.<br />
            Sono rimasti per un solo scopo: custodire l&apos;arma. E aspettare.<br />
            La domanda non è più: <em>&ldquo;è reale?&rdquo;</em><br />
            ma: <em>&ldquo;da che parte starai?&rdquo;</em>
          </p>
          <Link href="/login" className="cm-btn-outline">ACCEDI ALL&apos;INTERFACCIA</Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.04)', padding: '2rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.25em', color: 'rgba(254,234,165,0.25)', textTransform: 'uppercase' }}>Ca&apos; Marcello · Incantica</span>
        <Link href="/login" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(254,234,165,0.3)', textDecoration: 'none' }}>
          Accedi →
        </Link>
      </footer>

    </main>
  )
}