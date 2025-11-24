import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [profileError, setProfileError] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId) => {
        try {
            setProfileError(null);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching profile:', error);
                setProfileError(error);
            } else if (data) {
                setProfile(data);
            } else {
                console.warn('No profile found for user');
            }
        } catch (err) {
            console.error('Unexpected error fetching profile:', err);
            setProfileError(err);
        }
    };

    useEffect(() => {
        let mounted = true;

        const checkSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (mounted) {
                    setUser(session?.user ?? null);
                    if (session?.user) {
                        fetchProfile(session.user.id);
                    }
                }
            } catch (err) {
                console.error('Session check error:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (mounted) {
                setUser(session?.user ?? null);
                if (session?.user) {
                    fetchProfile(session.user.id);
                } else {
                    setProfile(null);
                    setProfileError(null);
                }
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setProfileError(null);
        setUser(null);
    };

    const value = {
        user,
        profile,
        profileError,
        loading,
        signOut,
        fetchProfile: () => user && fetchProfile(user.id),
        isAdmin: profile?.role === 'admin' || profile?.admin === 'admin' || user?.email === 'emregfb66@gmail.com',
        agentName: profile?.agent_name
    };

    useEffect(() => {
        if (user) console.log('Current User:', user.email, 'Role:', profile?.role, 'IsAdmin:', value.isAdmin);
    }, [user, profile]);

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p>Sistem Başlatılıyor...</p>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
