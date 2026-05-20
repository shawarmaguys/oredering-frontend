import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = 'Please Confirm',
  message,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999 }}>
      <div className="modal-panel modal-panel-sm" style={{ maxWidth: '380px' }}>
        <button
          onClick={handleCancel}
          className="modal-close"
          aria-label="Close modal"
        >
          &times;
        </button>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {title}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{message}</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={handleCancel} style={{ minWidth: '80px' }}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onConfirm} style={{ minWidth: '80px' }}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
