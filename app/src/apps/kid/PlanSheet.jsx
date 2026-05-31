import { useState } from 'react';
import { Druppie, VakIcon } from '../../components/Characters.jsx';

function arrowBtn(dis) {
  return {
    width: 30,
    height: 24,
    borderRadius: 7,
    border: 'none',
    cursor: dis ? 'default' : 'pointer',
    background: dis ? '#efe9dd' : 'var(--sky)',
    color: dis ? '#cbc3b4' : 'var(--water)',
    fontSize: 11,
    fontWeight: 900
  };
}

export default function PlanSheet({ vakOrder, vakken, nodes, onSave, onClose }) {
  const [order, setOrder] = useState(vakOrder);

  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const c = [...order];
    [c[i], c[j]] = [c[j], c[i]];
    setOrder(c);
  };

  const countOf = (vk) => nodes.filter((n) => n.vak === vk).length;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}
    >
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(40,52,59,0.45)', animation: 'fadein .2s ease' }}
      />
      <div
        style={{
          position: 'relative',
          background: 'var(--cream)',
          borderRadius: '26px 26px 0 0',
          padding: '14px 18px 20px',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.22)',
          animation: 'slideup .3s cubic-bezier(.2,.8,.3,1)'
        }}
      >
        <div style={{ width: 44, height: 5, borderRadius: 3, background: '#d9d0c0', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Druppie size={42} mood="happy" />
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20, color: 'var(--ink)' }}>
            Plan jouw waterval
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)', margin: '6px 0 14px' }}>
          Zet de vakken in de volgorde van jouw toetsen. Gebruik de pijltjes.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {order.map((vk, i) => {
            const vi = vakken[vk];
            return (
              <div
                key={vk}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  background: '#fff',
                  borderRadius: 16,
                  padding: '11px 12px',
                  boxShadow: '0 4px 0 rgba(40,52,59,0.07)',
                  borderLeft: `6px solid ${vi.kleur}`
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--display)',
                    fontWeight: 700,
                    fontSize: 18,
                    color: vi.kleur,
                    width: 16,
                    textAlign: 'center'
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    background: vi.tint,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <VakIcon vak={vk} size={20} c={vi.kleur} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--display)',
                      fontWeight: 600,
                      fontSize: 16,
                      color: 'var(--ink)'
                    }}
                  >
                    {vi.naam}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)' }}>
                    {countOf(vk)} onderdelen
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button className="tap" disabled={i === 0} onClick={() => move(i, -1)} style={arrowBtn(i === 0)}>
                    ▲
                  </button>
                  <button
                    className="tap"
                    disabled={i === order.length - 1}
                    onClick={() => move(i, 1)}
                    style={arrowBtn(i === order.length - 1)}
                  >
                    ▼
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <button className="cta tap" onClick={() => onSave(order)} style={{ width: '100%', marginTop: 16 }}>
          Bewaren
        </button>
      </div>
    </div>
  );
}
