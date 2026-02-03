'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

const NAV_LINKS = [
  { label: '命盤排盤', href: '/' },
  { label: '風水分析', href: '/fengshui' },
  { label: '六壬速斷', href: '/divination' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center space-x-2 text-xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <span>倪師斗數</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
