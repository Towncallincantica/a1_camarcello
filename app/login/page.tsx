export default function LoginPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#090807',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2rem',
      }}>
        <h1 style={{
          fontFamily: 'serif',
          color: '#feeaa5',
          fontSize: '2rem',
          letterSpacing: '0.1em',
          margin: 0,
        }}>
          Ca&apos; Marcello
        </h1>
        <a href="/auth/login" style={{
          background: 'rgba(254,234,165,0.1)',
          border: '1px solid #feeaa5',
          color: '#feeaa5',
          padding: '0.75rem 2rem',
          fontFamily: 'serif',
          fontSize: '1rem',
          cursor: 'pointer',
          letterSpacing: '0.05em',
          textDecoration: 'none',
        }}>
          Accedi con Google
        </a>
      </div>
    </main>
  )
}