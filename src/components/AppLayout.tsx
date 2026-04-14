import { ReactNode, useState } from "react";
import BottomNav from "./BottomNav";
import DesktopSidebar from "./DesktopSidebar";
import TopHeader from "./TopHeader";

interface AppLayoutProps {
  children: ReactNode;
  onHeaderFilterClick?: () => void;
  showHeader?: boolean;
}

const AppLayout = ({ children, onHeaderFilterClick, showHeader = false }: AppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen gradient-page">
      {/* Desktop Sidebar - hidden on mobile */}
      <DesktopSidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main content area shifts based on sidebar */}
      <div className={`transition-all duration-300 ${sidebarOpen ? "lg:pl-64" : "lg:pl-0"}`}>
        {/* Top Header - only on home page */}
        {showHeader && (
          <TopHeader
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onFilterClick={onHeaderFilterClick}
          />
        )}

        {/* Main content */}
        <div className="max-w-5xl mx-auto pb-20 lg:pb-6 lg:px-6">
          {children}
        </div>
      </div>

      {/* Mobile bottom nav - hidden on desktop */}
      <BottomNav />
    </div>
  );
};

export default AppLayout;
