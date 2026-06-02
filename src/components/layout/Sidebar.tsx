'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  Upload,
  List,
  LogOut,
  Zap,
  Menu,
  X,
} from 'lucide-react';

const adminLinks = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/agents', label: 'Agents', icon: Users },
  { href: '/dashboard/upload', label: 'Upload Leads', icon: Upload },
  { href: '/dashboard/lists', label: 'Lead Lists', icon: List },
];

const agentLinks = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/lists', label: 'My Leads', icon: List },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const links = user?.role === 'admin' ? adminLinks : agentLinks;

  return (
    <>
      {/* Mobile Top Navbar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-800 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">LeadFlow</span>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 text-slate-400 hover:text-white transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Overlay for mobile sidebar */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/50 z-40" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      {/* Sidebar Content */}
      <aside 
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-[240px] flex-col bg-slate-900 text-white transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo (Desktop only) */}
        <div className="hidden lg:flex h-16 items-center gap-2 px-6 border-b border-slate-700/50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">LeadFlow</span>
        </div>
        
        {/* Close Button (Mobile only) */}
        <div className="lg:hidden flex h-16 items-center justify-between px-4 border-b border-slate-700/50">
          <span className="font-bold tracking-tight">Menu</span>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {links.map((link) => {
            const isActive =
              link.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )}
              >
                <link.icon className="h-4 w-4 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Section */}
      <div className="border-t border-slate-700/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400 text-sm font-medium">
            {user?.name
              ?.split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || '??'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.name || 'Loading...'}
            </p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}
