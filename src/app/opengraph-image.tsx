import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'HubElites — AI growth system for eStage Ambassadors';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: '#06070E',
          backgroundImage:
            'radial-gradient(900px 500px at 20% 0%, rgba(59,130,246,0.35), transparent 60%), radial-gradient(700px 500px at 90% 90%, rgba(139,92,246,0.32), transparent 62%)',
          color: '#F5F7FF',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #3F7DFB, #8B5CF6)',
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            H
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em' }}>HubElites</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: '-0.045em', lineHeight: 1.03, maxWidth: 900 }}>
            One audience decision in. A full campaign out.
          </div>
          <div style={{ fontSize: 28, color: '#8D96B2', maxWidth: 820 }}>
            The AI growth system built for eStage Ambassadors.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, fontSize: 22, color: '#626C88' }}>
          <span>Audience</span>
          <span>·</span>
          <span>Campaign brain</span>
          <span>·</span>
          <span>Media studio</span>
          <span>·</span>
          <span>Distribution</span>
          <span>·</span>
          <span>Learning loop</span>
        </div>
      </div>
    ),
    size,
  );
}
