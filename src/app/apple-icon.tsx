import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #3B82F6 0%, #22D3EE 38%, #8B5CF6 72%, #EC4899 100%)',
          color: '#fff',
          fontSize: 108,
          fontWeight: 800,
          letterSpacing: '-0.06em',
        }}
      >
        H
      </div>
    ),
    size,
  );
}
