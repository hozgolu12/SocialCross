import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Plus, Settings, FileText, Menu, Users, LayoutDashboard, Sparkles } from 'lucide-react';
import { useState } from 'react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/create', label: 'Create Post', icon: Plus },
    { path: '/posts', label: 'Posts', icon: FileText },
    { path: '/ai-generator', label: 'AI Generator', icon: Sparkles },
    { path: '/accounts', label: 'Social Accounts', icon: Settings },
    { path: '/reach', label: 'Reach', icon: Users },
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-gray-900">
              SocialCross
            </Link>
          </div>
          {/* Desktop Nav */}
          <div className="hidden md:flex space-x-4 items-center">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === item.path
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.icon && <item.icon className="inline mr-1" size={16} />}
                {item.label}
              </Link>
            ))}
            {user && (
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="mr-1" size={16} /> Logout
              </Button>
            )}
          </div>
          {/* Mobile Nav */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
        {/* Dropdown for mobile */}
        {mobileOpen && (
          <div className="md:hidden bg-white shadow rounded-lg mt-2 py-2">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2 text-sm ${
                  location.pathname === item.path
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.icon && <item.icon className="inline mr-1" size={16} />}
                {item.label}
              </Link>
            ))}
            {user && (
              <button
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <LogOut className="mr-1" size={16} /> Logout
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
