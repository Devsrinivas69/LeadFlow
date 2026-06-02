'use client';

import { AuthProvider } from '@/hooks/useAuth';
import { Sidebar } from '@/components/layout/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 ml-[240px]">
          <div className="max-w-[1200px] mx-auto p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </AuthProvider>
  );
}
