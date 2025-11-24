import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const PreferencesContext = createContext();

export const PreferencesProvider = ({ children }) => {
    const [highContrast, setHighContrast] = useState(() => {
        const saved = localStorage.getItem('highContrast');
        return saved === 'true';
    });

    const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
        const saved = localStorage.getItem('notificationsEnabled');
        return saved === 'true';
    });

    const [hiddenAgents, setHiddenAgents] = useState(['Cengiz', 'Ercan', 'Kenan', 'Oğuz']);
    const [thresholds, setThresholds] = useState({ good: 4.0, excellent: 4.5 });
    const [badgeRules, setBadgeRules] = useState({ fastSolver: 120, star: 5 });

    // Fetch settings from Supabase on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from('app_settings')
                    .select('*');

                if (error) throw error;

                if (data) {
                    data.forEach(setting => {
                        if (setting.setting_key === 'hidden_agents') setHiddenAgents(setting.setting_value);
                        if (setting.setting_key === 'thresholds') setThresholds(setting.setting_value);
                        if (setting.setting_key === 'badge_rules') setBadgeRules(setting.setting_value);
                    });
                }
            } catch (error) {
                console.error('Error fetching settings from Supabase:', error);
            }
        };

        fetchSettings();
    }, []);

    // Helper to save settings to Supabase
    const saveSetting = async (key, value) => {
        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({ setting_key: key, setting_value: value }, { onConflict: 'setting_key' });

            if (error) throw error;
        } catch (error) {
            console.error(`Error saving setting ${key}:`, error);
        }
    };

    useEffect(() => {
        localStorage.setItem('highContrast', highContrast);
        if (highContrast) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }
    }, [highContrast]);

    useEffect(() => {
        localStorage.setItem('notificationsEnabled', notificationsEnabled);
    }, [notificationsEnabled]);

    const toggleHighContrast = () => setHighContrast(prev => !prev);
    const toggleNotifications = () => setNotificationsEnabled(prev => !prev);

    const addHiddenAgent = (agentName) => {
        if (!hiddenAgents.includes(agentName)) {
            const newAgents = [...hiddenAgents, agentName];
            setHiddenAgents(newAgents);
            saveSetting('hidden_agents', newAgents);
        }
    };

    const removeHiddenAgent = (agentName) => {
        const newAgents = hiddenAgents.filter(a => a !== agentName);
        setHiddenAgents(newAgents);
        saveSetting('hidden_agents', newAgents);
    };

    const updateThresholds = (newThresholds) => {
        const updated = { ...thresholds, ...newThresholds };
        setThresholds(updated);
        saveSetting('thresholds', updated);
    };

    const updateBadgeRules = (newRules) => {
        const updated = { ...badgeRules, ...newRules };
        setBadgeRules(updated);
        saveSetting('badge_rules', updated);
    };

    return (
        <PreferencesContext.Provider value={{
            highContrast,
            toggleHighContrast,
            notificationsEnabled,
            toggleNotifications,
            hiddenAgents,
            addHiddenAgent,
            removeHiddenAgent,
            thresholds,
            updateThresholds,
            badgeRules,
            updateBadgeRules
        }}>
            {children}
        </PreferencesContext.Provider>
    );
};

export const usePreferences = () => useContext(PreferencesContext);
