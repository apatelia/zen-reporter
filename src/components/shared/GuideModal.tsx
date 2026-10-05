import React from 'react';
import BaseModal from './BaseModal';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function GuideModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}: GuideModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={<h3 className="text-xl font-bold text-text-ink dark:text-text-on-primary">{title}</h3>}
      subtitle={subtitle}
      maxWidthClass="max-w-2xl"
      footerActions={
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-accent-blue px-4 py-2 text-xs font-bold text-text-on-primary dark:text-surface-950 hover:bg-accent-blue/90 transition-colors cursor-pointer shadow-xs"
        >
          Close Guide
        </button>
      }
    >
      <div className="space-y-4 text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
        {children}
      </div>
    </BaseModal>
  );
}
