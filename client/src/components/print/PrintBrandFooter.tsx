export function PrintBrandFooter() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '7px', fontSize: '7pt', whiteSpace: 'nowrap' }}>
      <img
        src="/viralage-logo.png"
        alt="Viralage"
        style={{ width: '16px', height: '16px', objectFit: 'contain', filter: 'grayscale(1) contrast(1.8)' }}
      />
      <span>Viralage | Developed by Muhib Mirza</span>
    </div>
  );
}
