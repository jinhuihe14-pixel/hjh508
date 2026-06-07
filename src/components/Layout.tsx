import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  Users,
  FileText,
  Bell,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '数据仪表盘' },
  { path: '/inventory', icon: Package, label: '进销存管理' },
  { path: '/sales', icon: TrendingUp, label: '销售分析' },
  { path: '/customers', icon: Users, label: '客户分析' },
  { path: '/reports', icon: FileText, label: '报表中心' },
  { path: '/cigarette', icon: Bell, label: '香烟订货' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">酒</span>
              </div>
              <span className="font-bold text-gray-800">烟酒分析系统</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-medium">老</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">老板</p>
                <p className="text-xs text-gray-500">管理员</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-primary-600 font-medium">老</span>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">
              {navItems.find((item) => item.path === location.pathname)?.label || '数据仪表盘'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </span>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
