export default function Landing() {
  return (
    <div style={{
      background: '#111111',
      color: '#ffffff',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#f0c040', fontSize: '3rem', marginBottom: '10px' }}>Zey AI</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '30px', color: '#cccccc' }}>AI Gratis, Cepat, dan Privat</p>
      
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="/" style={{
          background: '#f0c040',
          color: '#000000',
          padding: '12px 24px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 'bold'
        }}>Coba Zey AI</a>
        
        <a href="https://mayar.id/lo" style={{
          background: 'transparent',
          color: '#f0c040',
          padding: '12px 24px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 'bold',
          border: '2px solid #f0c040'
        }}>Prompt Pack</a>
      </div>
      
      <div style={{ marginTop: '40px', display: 'flex', gap: '20px' }}>
        <a href="https://x.com/vazi" style={{ color: '#f0c040', textDecoration: 'none' }}>𝕏 Twitter</a>
        <a href="mailto:vvbam988@gmail.com" style={{ color: '#f0c040', textDecoration: 'none' }}>📧 Email</a>
      </div>
    </div>
  )
          }
