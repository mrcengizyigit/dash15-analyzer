import React from 'react';
import Sidebar from './Sidebar';
import Notifications from './Notifications';
import { Search, Bell, User } from 'lucide-react';

const Layout = ({ children, user, isAdmin, agentName, onProfileClick }) => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 selection:text-blue-200 flex">
            <Sidebar />

            <main className="flex-1 ml-64 min-h-screen flex flex-col">
                {/* Top Bar */}
                <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-40">
                    {/* Search */}
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Temsilcileri, raporları veya ayarları ara..."
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                        />
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-4">
                        <Notifications user={user} isAdmin={isAdmin} agentName={agentName} />
                        <div className="h-8 w-px bg-slate-800 mx-2"></div>

                        <div
                            className="flex items-center gap-3 pl-2 p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-slate-800/50"
                            onClick={onProfileClick}
                            title="Profilime Git"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-900/20">
                                {agentName ? agentName.substring(0, 2).toUpperCase() : (user?.email?.substring(0, 2).toUpperCase() || 'U')}
                            </div>
                            <div className="hidden md:block text-left">
                                <p className="text-sm font-medium text-white leading-none">
                                    {agentName ? agentName.split('(')[0].trim() : (user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 'Kullanıcı')}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {isAdmin ? 'Süper Yönetici' : 'Destek Temsilcisi'}
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="w-full max-w-screen-2xl mx-auto p-8 flex-1">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
