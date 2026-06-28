import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useThemeStore } from "@/store/dataStore";
import {
  LayoutDashboard, Upload, Database, BarChart3, BrainCircuit,
  FileDown, Info, Sun, Moon, Menu, X, Hexagon,
} from "lucide-react";

const navItems = [
  { path: "/", label: "Overview", icon: LayoutDashboard },
  { path: "/upload", label: "Import", icon: Upload },
  { path: "/preview", label: "Preview", icon: Database },
  { path: "/analysis", label: "Analyze", icon: BarChart3 },
  { path: "/predict", label: "Predict", icon: BrainCircuit },
  { path: "/export", label: "Export", icon: FileDown },
  { path: "/about", label: "About", icon: Info },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isDark, toggle } = useThemeStore();
  const location = useLocation();

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        {/* Top Navigation */}
        <header
          className="fixed top-0 left-0 right-0 h-[60px] z-50 flex items-center justify-between px-5"
          style={{
            background: isDark
              ? "hsl(var(--sidebar-bg) / 0.92)"
              : "hsl(var(--sidebar-bg) / 0.92)",
            backdropFilter: "blur(20px) saturate(1.4)",
            borderBottom: "1px solid hsl(var(--sidebar-border))",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-foreground/[0.06] transition-colors"
            >
              {sidebarCollapsed ? <Menu size={18} /> : <X size={18} />}
            </button>
            <Link to="/" className="flex items-center gap-2.5 group">
              <Hexagon
                size={20}
                className="transition-all duration-300 group-hover:rotate-[30deg]"
                strokeWidth={1.8}
                style={{ color: "hsl(var(--primary))" }}
              />
              <span className="text-[15px] font-semibold tracking-tight">
                Clarvation
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggle}
              className="p-2 rounded-lg hover:bg-foreground/[0.06] transition-colors text-muted-foreground"
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* Sidebar */}
        <aside
          className="fixed left-0 top-[60px] bottom-0 z-40 transition-all duration-300 ease-out scrollbar-thin overflow-y-auto"
          style={{
            width: sidebarCollapsed ? 64 : 220,
            background: "hsl(var(--sidebar-bg))",
            borderRight: "1px solid hsl(var(--sidebar-border))",
          }}
        >
          <nav className="p-2.5 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={isActive
                    ? { background: "hsl(var(--primary) / 0.1)" }
                    : {}
                  }
                >
                  {isActive && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                      style={{ background: "hsl(var(--primary))" }}
                    />
                  )}
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2 : 1.5}
                    className="flex-shrink-0 transition-colors duration-200"
                    style={{ color: isActive ? "hsl(var(--primary))" : undefined }}
                  />
                  {!sidebarCollapsed && (
                    <span className="text-[13px] font-medium tracking-tight">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main
          className="transition-all duration-300 ease-out pt-[60px]"
          style={{ marginLeft: sidebarCollapsed ? 64 : 220 }}
        >
          <div className="px-8 py-8 min-h-[calc(100vh-60px)] max-w-[1440px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
