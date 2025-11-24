import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, MessageSquare, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const Notifications = ({ user, isAdmin, agentName }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch initial notifications
    const fetchNotifications = async () => {
        if (!user) return;

        try {
            let query = supabase
                .from('agent_notes')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            // If not admin, only show notes for this agent
            if (!isAdmin && agentName) {
                query = query.eq('agent_name', agentName);
            }

            const { data, error } = await query;

            if (error) throw error;

            if (data) {
                // Map to notification structure
                const formatted = data.map(note => ({
                    id: note.id,
                    type: 'note',
                    title: isAdmin ? `Yeni Not: ${note.agent_name}` : 'Yeni Yönetici Notu',
                    message: note.note,
                    date: new Date(note.created_at),
                    read: !!note.read_at,
                    link: '/profile' // In a real app, this would link to specific note
                }));
                setNotifications(formatted);
                setUnreadCount(formatted.filter(n => !n.read).length);
            }
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    };

    // Subscribe to Realtime Changes
    useEffect(() => {
        fetchNotifications();

        const subscription = supabase
            .channel('public:agent_notes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_notes' }, (payload) => {
                const newNote = payload.new;

                // Filter for current user
                if (!isAdmin && newNote.agent_name !== agentName) return;

                const newNotification = {
                    id: newNote.id,
                    type: 'note',
                    title: isAdmin ? `Yeni Not: ${newNote.agent_name}` : 'Yeni Yönetici Notu',
                    message: newNote.note,
                    date: new Date(newNote.created_at),
                    read: false
                };

                setNotifications(prev => [newNotification, ...prev]);
                setUnreadCount(prev => prev + 1);

                // Play sound (optional)
                // new Audio('/notification.mp3').play().catch(e => console.log('Audio play failed', e));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [user, isAdmin, agentName]);

    const handleMarkAsRead = async (id) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            const { error } = await supabase
                .from('agent_notes')
                .update({ read_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const handleMarkAllRead = async () => {
        // Optimistic update
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);

        if (unreadIds.length === 0) return;

        try {
            const { error } = await supabase
                .from('agent_notes')
                .update({ read_at: new Date().toISOString() })
                .in('id', unreadIds);

            if (error) throw error;
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors relative"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                            <h3 className="font-semibold text-white text-sm">Bildirimler</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    Tümünü Okundu Say
                                </button>
                            )}
                        </div>

                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">Bildiriminiz yok.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-800">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`p-4 hover:bg-slate-800/50 transition-colors relative group ${!notification.read ? 'bg-blue-500/5' : ''}`}
                                        >
                                            <div className="flex gap-3">
                                                <div className={`mt-1 p-1.5 rounded-full flex-shrink-0 ${notification.type === 'note' ? 'bg-blue-500/10 text-blue-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                                    {notification.type === 'note' ? <MessageSquare className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium ${!notification.read ? 'text-white' : 'text-slate-400'}`}>
                                                        {notification.title}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-[10px] text-slate-600 mt-2">
                                                        {notification.date.toLocaleString('tr-TR')}
                                                    </p>
                                                </div>
                                                {!notification.read && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMarkAsRead(notification.id);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 absolute top-4 right-4 p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-emerald-400 transition-all"
                                                        title="Okundu olarak işaretle"
                                                    >
                                                        <Check className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                            {!notification.read && (
                                                <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full group-hover:hidden"></div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Notifications;
