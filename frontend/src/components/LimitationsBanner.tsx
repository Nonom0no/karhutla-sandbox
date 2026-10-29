// src/components/LimitationsBanner.tsx - Domain limitation banner overlay above Canvas

import { LIMITATIONS_TEXT_ID } from '../lib/text';

export function LimitationsBanner() {
  return (
    <div
      style={{
        position: 'relative', // will be placed outside Canvas in App
        width: '100%',
        padding: '0.5rem 1rem',
        background: '#fff8e1',
        borderBottom: '1px solid #ffe082',
        color: '#5d4037',
        fontSize: '0.875rem',
        lineHeight: '1.5',
        textAlign: 'center',
        zIndex: 100, // above canvas
      }}
      role="contentinfo"
      aria-live="polite"
    >
      {LIMITATIONS_TEXT_ID}
    </div>
  );
}