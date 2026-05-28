import Link from 'next/link'

export default function LoginPage() {
  return (
    <main style={{ background: '#090807', color: '#e8e4dc', minHeight: '100vh', fontFamily: "'EB Garamond', Georgia, serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', overflow: 'hidden' }}>

      <style>{`
        .cm-google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          background: rgba(254,234,165,0.06);
          border: 1px solid rgba(254,234,165,0.2);
          color: #e8e4dc;
          font-family: 'Cinzel', serif;
          font-size: 0.72rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          padding: 1rem 1.5rem;
          cursor: pointer;
          transition: background 0.3s, border-color 0.3s;
        }
        .cm-google-btn:hover {
          background: rgba(254,234,165,0.1);
          border-color: rgba(254,234,165,0.4);
        }
        .cm-back-link {
          position: absolute;
          top: 1.5rem;
          left: 2rem;
          font-family: 'Cinzel', serif;
          font-size: 0.65rem;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: rgba(254,234,165,0.35);
          text-decoration: none;
          transition: color 0.3s;
        }
        .cm-back-link:hover { color: rgba(254,234,165,0.7); }
        .cm-grain {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          background-repeat: repeat; opacity: 0.5;
        }
      `}</style>

      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('https://www.camarcello.it/wp-content/uploads/2024/09/candle-light-ca-marcello-2.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.15) saturate(0.5)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(9,8,7,0.4) 20%, #090807 85%)' }} />
      <div className="cm-grain" />

      <Link href="/" className="cm-back-link" style={{ zIndex: 10 }}>← Torna</Link>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '380px', padding: '3rem 2.5rem', background: 'rgba(254,234,165,0.02)', border: '1px solid rgba(254,234,165,0.1)', textAlign: 'center' }}>
        {/* Corner accents */}
        <div style={{ position: 'absolute', top: '-1px', left: '-1px', width: '16px', height: '16px', borderTop: '1px solid rgba(254,234,165,0.45)', borderLeft: '1px solid rgba(254,234,165,0.45)' }} />
        <div style={{ position: 'absolute', top: '-1px', right: '-1px', width: '16px', height: '16px', borderTop: '1px solid rgba(254,234,165,0.45)', borderRight: '1px solid rgba(254,234,165,0.45)' }} />
        <div style={{ position: 'absolute', bottom: '-1px', left: '-1px', width: '16px', height: '16px', borderBottom: '1px solid rgba(254,234,165,0.45)', borderLeft: '1px solid rgba(254,234,165,0.45)' }} />
        <div style={{ position: 'absolute', bottom: '-1px', right: '-1px', width: '16px', height: '16px', borderBottom: '1px solid rgba(254,234,165,0.45)', borderRight: '1px solid rgba(254,234,165,0.45)' }} />

        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(254,234,165,0.35)', marginBottom: '1rem' }}>
          SOGLIA · v1.0
        </p>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: '1.6rem', letterSpacing: '0.12em', color: '#feeaa5', marginBottom: '0.5rem' }}>
          Ca&apos; Marcello
        </h1>
        <p style={{ fontFamily: "'EB Garamond', Georgia, serif", fontStyle: 'italic', fontSize: '0.95rem', color: 'rgba(232,228,220,0.45)', marginBottom: '2.5rem' }}>
          Identificati per accedere all&apos;interfaccia
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '2.5rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
          <span style={{ fontSize: '0.6rem', color: 'rgba(254,234,165,0.25)', letterSpacing: '0.15em' }}>✦</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
        </div>

        <form action="/auth/login" method="POST">
          <button type="submit" className="cm-google-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continua con Google
          </button>
        </form>

        <p style={{ marginTop: '2rem', fontFamily: "'EB Garamond', Georgia, serif", fontStyle: 'italic', fontSize: '0.8rem', color: 'rgba(232,228,220,0.2)', lineHeight: 1.6 }}>
          &ldquo;Non fidarti di chi ti ha invitato.&rdquo;
        </p>
      </div>

    </main>
  )
}