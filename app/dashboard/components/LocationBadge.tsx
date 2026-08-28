'use client';

import { useLocationFilter } from '../../context/LocationFilterContext';

export function LocationBadge() {
  const { selectedLocation } = useLocationFilter();

  if (!selectedLocation) return null;

  const color = selectedLocation.color || '#3b82f6';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 7px',
        borderRadius: '4px',
        backgroundColor: `${color}18`,
        color: color,
        border: `1px solid ${color}35`,
        fontSize: '0.55em',
        fontWeight: 600,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        verticalAlign: 'middle',
        marginLeft: '8px',
        lineHeight: 1.25,
        flexShrink: 0,
      }}
      title={`Active Store Location: ${selectedLocation.name}`}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: color,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      <span>{selectedLocation.name}</span>
    </span>
  );
}
