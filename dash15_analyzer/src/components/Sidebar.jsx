import React from 'react';
import { LayoutDashboard, Upload, PieChart, Settings, LogOut, History, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
    const { signOut, profile, isAdmin } = useAuth();

    const menuItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/analytics', icon: PieChart, label: 'Analitik' },
        { path: '/history', icon: History, label: 'Geçmiş Raporlar' },
        // Admin Only Items
        ...(isAdmin ? [
            { path: '/upload', icon: Upload, label: 'Veri Kaynakları' },
            { path: '/settings', icon: Settings, label: 'Ayarlar' }
        ] : [])
    ];

    return (
        <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-50">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold">D</span>
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        Dash15
                    </span>
                </div>

                <div className="mb-6 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                            <User className="w-4 h-4 text-slate-300" />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">
                                {profile?.agent_name || 'Kullanıcı'}
                            </p>
                            <p className="text-xs text-slate-500 capitalize">
                                {profile?.role === 'admin' ? 'Yönetici' : 'Temsilci'}
                            </p>
                        </div>
                    </div>
                </div>

                <nav className="space-y-1">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${isActive
                                    ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="font-medium">{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>
            </div>

            <div className="mt-auto p-6 border-t border-slate-800">
                <button
                    onClick={signOut}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Çıkış Yap</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
