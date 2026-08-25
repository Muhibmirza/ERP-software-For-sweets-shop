import viralageLogoBase64 from '../../assets/viralage-logo.base64.txt?raw';

const viralageLogo = `data:image/jpeg;base64,${viralageLogoBase64.trim()}`;

export function PrintBrandFooter() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '7px', fontSize: '7pt', whiteSpace: 'nowrap' }}>
      <img
        src={viralageLogo}
        alt="Viralage"
        style={{ width: '18px', height: '18px', objectFit: 'contain', filter: 'grayscale(1) contrast(2.4)' }}
      />
      <span>Viralage | Developed by Muhib Mirza</span>
    </div>
  );
}
