import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Mail, User, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

const Register = ({ onLoginClick }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState(''); // Agent Name
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Kayıt ol
            const { data: { user }, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                },
            });

            if (authError) throw authError;

            if (user) {
                // 2. Profil oluştur
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            id: user.id,
                            agent_name: fullName,
                            role: 'user', // Varsayılan rol
                            email: email
                        }
                    ]);

                if (profileError) {
                    console.error('Profil oluşturma hatası:', profileError);
                    // Profil oluşturulamazsa kullanıcıya bildir ama kaydı da yakma
                    setError('Kayıt oldu ancak profil oluşturulamadı: ' + profileError.message);
                    return;
                }

                // Başarılı
                alert('Kayıt başarılı! Giriş yapabilirsiniz.');
                onLoginClick();
            }
        } catch (err) {
            setError(translateAuthError(err.message));
        } finally {
            setLoading(false);
        }
    };

    const translateAuthError = (message) => {
        if (message.includes('Email signups are disabled')) {
            return 'E-posta ile kayıtlar şu anda kapalıdır. Lütfen sistem yöneticisi ile iletişime geçin veya Supabase ayarlarını kontrol edin.';
        }
        if (message.includes('User already registered')) {
            return 'Bu e-posta adresi ile zaten bir kayıt mevcut.';
        }
        if (message.includes('Password should be at least')) {
            return 'Şifre en az 6 karakter olmalıdır.';
        }
        if (message.includes('Invalid login credentials')) {
            return 'Hatalı e-posta veya şifre.';
        }
        return `Kayıt işlemi sırasında bir hata oluştu: ${message}`;
    };


    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
                <button
                    onClick={onLoginClick}
                    className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Girişe Dön
                </button>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Hesap Oluştur</h1>
                    <p className="text-slate-400">Temsilci hesabınızı oluşturun</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-center gap-3 text-red-400">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Ad Soyad (Temsilci Adı)
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="CSV'deki isminizle aynı olmalı"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Verilerinizin eşleşmesi için tam adınızı girin.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            E-posta Adresi
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="ornek@sirket.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Şifre
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="En az 6 karakter"
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Kayıt Yapılıyor...
                            </>
                        ) : (
                            'Kayıt Ol'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Register;
