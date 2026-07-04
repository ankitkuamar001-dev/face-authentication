import { Shield } from 'lucide-react';

interface AuthLayoutProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[#0a0f1e]">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-blue-600/20 to-purple-600/10 blur-3xl animate-float" />
        <div
          className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-cyan-500/15 to-blue-600/10 blur-3xl animate-float"
          style={{ animationDelay: '1.5s' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-500/10 to-transparent blur-3xl"
        />
      </div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">FaceAuth</span>
        </div>

        {/* Glass card */}
        <div className="glass-card p-8">
          {title && (
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-1.5">{title}</h1>
              {subtitle && <p className="text-sm text-[var(--color-text-muted)]">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
