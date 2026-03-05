'use client';

import { useState } from 'react';
import { clsx } from 'clsx';

export function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
  headerColor = 'bg-gray-100',
  titleColor = 'text-gray-800'
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  headerColor?: string;
  titleColor?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'w-full px-6 py-5 flex items-center justify-between text-left transition-colors',
          headerColor,
          'hover:brightness-95'
        )}
      >
        <h3 className={clsx('text-xl font-bold flex items-center gap-3', titleColor)}>
          <span className="text-2xl">{icon}</span>
          {title}
        </h3>
        <span className="text-gray-500 text-2xl">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="p-6 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}
