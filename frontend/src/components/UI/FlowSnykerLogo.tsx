export const FlowSnykerLogo = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="stemGrad" x1="6" y1="4" x2="16" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FF1A1A" />
        <stop offset="1" stopColor="#FF5555" />
      </linearGradient>
      <linearGradient id="topGrad" x1="12" y1="6" x2="30" y2="16" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FF4D4D" />
        <stop offset="1" stopColor="#FFA94D" />
      </linearGradient>
      <linearGradient id="midGrad" x1="12" y1="20" x2="26" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFA94D" />
        <stop offset="1" stopColor="#FFD43B" />
      </linearGradient>
      <filter id="cardShadow1" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.4"/>
      </filter>
      <filter id="cardShadow2" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#FF3A3A" floodOpacity="0.3"/>
      </filter>
    </defs>
    
    {/* Haste Vertical (Pilar Principal do Fluxo) */}
    <rect x="6" y="4" width="10" height="28" rx="3" fill="url(#stemGrad)" filter="url(#cardShadow1)"/>
    
    {/* Cartão Superior */}
    <rect x="12" y="6" width="18" height="10" rx="3" fill="url(#topGrad)" filter="url(#cardShadow2)"/>
    
    {/* Cartão do Meio */}
    <rect x="12" y="20" width="12" height="8" rx="3" fill="url(#midGrad)" filter="url(#cardShadow2)"/>
  </svg>
);
