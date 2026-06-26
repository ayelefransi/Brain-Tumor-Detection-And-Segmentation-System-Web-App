"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  User,
} from "lucide-react";

const LogoIcon = ({ size }: { size: number }) => (
  <img src="/logo.png" alt="Logo" style={{ width: size, height: size, objectFit: 'contain' }} />
);

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/viewer", label: "Viewer", icon: LogoIcon },
  ];

  return (
    <div className="app-shell">
      {/* Navigation Sidebar */}
      <nav className="app-nav">
        <div className="app-nav-top">
          <div className="app-nav-logo">
            <div className="logo-icon">
              <img src="/logo.png" alt="NeuroScan AI Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <span className="app-nav-logo-text">
              NeuroScan <span>AI</span>
            </span>
          </div>

          <div className="app-nav-links">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`app-nav-link ${
                  pathname === item.href ? "active" : ""
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <div className="app-nav-bottom">
          <div className="app-nav-user">
            <div className="app-nav-avatar">
              <User size={16} />
            </div>
            <div className="app-nav-user-info">
              <div className="app-nav-user-name">
                {user?.user_metadata?.full_name || "Doctor"}
              </div>
              <div className="app-nav-user-email">
                {user?.email || ""}
              </div>
            </div>
          </div>
          <button className="app-nav-logout" onClick={handleSignOut}>
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="app-main">{children}</main>
    </div>
  );
}
