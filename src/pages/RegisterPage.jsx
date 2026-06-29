import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import FirebaseConfigWarning from '../components/UI/FirebaseConfigWarning';
import { Mail, Lock, User, ShieldAlert } from 'lucide-react';

export const RegisterPage = () => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName || !email || !password || !confirmPassword) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await register(email, password, displayName);
      navigate('/dashboard'); // Redirige vers le dashboard qui affichera l'écran d'attente s'il n'y a pas de rôle
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Cette adresse e-mail est déjà utilisée");
      } else {
        setError("Une erreur est survenue lors de la création du compte.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f4f8] px-4 py-12 dark:bg-[#0f172a]">
      <FirebaseConfigWarning />

      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl border border-brand-border dark:border-slate-800 dark:bg-slate-900">
        
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-lg">
            <span className="text-3xl font-black tracking-tight">B</span>
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-800 dark:text-white">
            Créer un compte <span className="text-brand dark:text-blue-400">Bit</span>
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Rejoignez la plateforme opérationnelle de votre agence
          </p>
        </div>

        {error && (
          <div className="flex items-start space-x-2 rounded-xl bg-red-50 p-3.5 text-sm font-semibold text-red-800 dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-900/30">
            <ShieldAlert className="h-5 w-5 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Nom complet
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <User className="h-5 w-5" />
              </span>
              <input
                type="text"
                required
                className="w-full rounded-[14px] border-2 border-[#dce6f0] bg-white py-3 pl-11 pr-4 text-slate-800 outline-none transition-all duration-200 focus:border-brand focus:ring-0 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500"
                placeholder="Ex: Jean Dupont"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Adresse e-mail
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Mail className="h-5 w-5" />
              </span>
              <input
                type="email"
                required
                className="w-full rounded-[14px] border-2 border-[#dce6f0] bg-white py-3 pl-11 pr-4 text-slate-800 outline-none transition-all duration-200 focus:border-brand focus:ring-0 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500"
                placeholder="nom@entreprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="h-5 w-5" />
              </span>
              <input
                type="password"
                required
                className="w-full rounded-[14px] border-2 border-[#dce6f0] bg-white py-3 pl-11 pr-4 text-slate-800 outline-none transition-all duration-200 focus:border-brand focus:ring-0 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500"
                placeholder="Minimum 6 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="h-5 w-5" />
              </span>
              <input
                type="password"
                required
                className="w-full rounded-[14px] border-2 border-[#dce6f0] bg-white py-3 pl-11 pr-4 text-slate-800 outline-none transition-all duration-200 focus:border-brand focus:ring-0 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500"
                placeholder="Saisissez à nouveau le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-[14px] bg-brand py-3.5 text-sm font-bold text-white transition duration-200 hover:bg-brand/95 focus:outline-none disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                "Créer mon compte"
              )}
            </button>
          </div>

        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Vous avez déjà un compte ?{" "}
            <Link to="/login" className="font-bold text-brand hover:underline dark:text-blue-400">
              Se connecter
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default RegisterPage;
