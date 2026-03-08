import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { SidebarNav } from "./SidebarNav";

export const metadata: Metadata = {
  title: "MedDispenser Dashboard",
  description: "Smart Medicine Dispenser Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200">
            <div className="p-5 border-b border-gray-200">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-medical-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">MD</span>
                </div>
                <span className="text-lg font-bold text-gray-900">MedDispenser</span>
              </Link>
            </div>
            <SidebarNav />
          </aside>

          {/* Mobile header */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-medical-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">MD</span>
                </div>
                <span className="text-lg font-bold text-gray-900">MedDispenser</span>
              </Link>
              <MobileMenu />
            </header>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-gray-50">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}

function MobileMenu() {
  return (
    <details className="relative">
      <summary className="list-none cursor-pointer p-2 rounded-lg hover:bg-gray-100">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </summary>
      <nav className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-2">
        <NavLinks />
      </nav>
    </details>
  );
}

function NavLinks() {
  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/schedules', label: 'Schedules' },
    { href: '/controls', label: 'Controls' },
    { href: '/trays', label: 'Trays' },
    { href: '/alerts', label: 'Alerts' },
  ];

  return (
    <>
      {links.map(link => (
        <Link
          key={link.href}
          href={link.href}
          className="block px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors text-sm"
        >
          {link.label}
        </Link>
      ))}
    </>
  );
}
