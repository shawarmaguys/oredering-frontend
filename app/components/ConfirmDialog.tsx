import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  warningMessage?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel?: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = 'Please Confirm',
  message,
  warningMessage,
  confirmText = 'OK',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen) return null;

  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  const isDanger = confirmVariant === 'danger';

  const dialogContent = (
    <div className="modal-backdrop confirm-modal-backdrop" style={{ zIndex: 9999 }}>
      <div className="modal-panel modal-panel-sm" style={{ maxWidth: '440px' }}>
        <button
          onClick={handleCancel}
          className="modal-close"
          aria-label="Close modal"
        >
          &times;
        </button>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            {title}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{message}</p>
          
          {warningMessage && (
            <div style={{
              marginTop: '12px',
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.8125rem',
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 18, height: 18, flexShrink: 0, marginTop: '1px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <strong style={{ fontWeight: 650 }}>WARNING:</strong> {warningMessage}
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleCancel} style={{ minWidth: '80px' }}>
            {cancelText}
          </button>
          <button
            className="btn btn-primary"
            onClick={onConfirm}
            style={{
              minWidth: '100px',
              backgroundColor: isDanger ? '#ef4444' : undefined,
              borderColor: isDanger ? '#dc2626' : undefined,
              color: isDanger ? '#ffffff' : undefined,
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;

  return createPortal(dialogContent, document.body);
};
