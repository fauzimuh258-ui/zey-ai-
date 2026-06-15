'use client';

import { useState } from 'react';

const PROVIDER_LIST = [
  { id: 'auto', name: 'Auto', icon: '🤖', description: 'Pilih terbaik otomatis' },
  { id: 'groq', name: 'Groq', icon: '⚡', description: 'Llama 3.3 — Tercepat' },
  { id: 'deepseek', name: 'DeepSeek', icon: '🟣', description: 'Cadangan' },
];

export default function ProviderSelector({ onSelect }) {
  const [selected, setSelected] = useState('auto');
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (provider) => {
    setSelected(provider.id);
    setIsOpen(false);
    onSelect(provider.id);
  };

  const current = PROVIDER_LIST.find(p => p.id === selected);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          background: '#1a1a1a',
          color: 'white',
          border: '1px solid #333',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        {current.icon} {current.name}
        <span style={{ fontSize: '10px', marginLeft: '4px' }}>▼</span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '4px',
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '4px',
          zIndex: 1000,
          minWidth: '200px'
        }}>
          {PROVIDER_LIST.map(provider => (
            <div
              key={provider.id}
              onClick={() => handleSelect(provider)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                cursor: 'pointer',
                borderRadius: '6px',
                background: selected === provider.id ? '#2a2a2a' : 'transparent',
                color: 'white',
                transition: 'background 0.2s'
              }}
            >
              <span style={{ fontSize: '18px' }}>{provider.icon}</span>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{provider.name}</div>
                <div style={{ fontSize: '12px', color: '#999' }}>{provider.description}</div>
              </div>
              {selected === provider.id && <span style={{ marginLeft: 'auto' }}>✅</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
