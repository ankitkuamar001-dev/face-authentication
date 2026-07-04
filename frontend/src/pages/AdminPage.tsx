import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Users,
  FileText,
  Settings,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';

type Tab = 'users' | 'logs' | 'settings';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  has_embedding: boolean;
  failed_attempts: number;
  created_at: string;
}

interface AuthLogEntry {
  id: string;
  user_id: string | null;
  ip_address: string;
  is_success: boolean;
  confidence_score: number | null;
  failure_reason: string | null;
  timestamp: string;
}

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#0a0f1e]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0f1e]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              id="btn-back-dashboard"
              onClick={() => navigate('/dashboard')}
              className="text-[var(--color-text-dim)] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Admin Panel</span>
            </div>
          </div>
          <span className="text-sm text-[var(--color-text-dim)]">{user?.email}</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-white/5 rounded-xl w-fit">
          {([
            { key: 'users' as Tab, label: 'Users', icon: Users },
            { key: 'logs' as Tab, label: 'Auth Logs', icon: FileText },
            { key: 'settings' as Tab, label: 'Settings', icon: Settings },
          ]).map((t) => (
            <button
              key={t.key}
              id={`tab-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${tab === t.key
                  ? 'bg-blue-500/15 text-blue-400'
                  : 'text-[var(--color-text-dim)] hover:text-white'}`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'users' && <UsersTab />}
        {tab === 'logs' && <LogsTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

/* ── Users Tab ──────────────────────────────────────────────────── */
function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.data || []);
    } catch {
      setUsers([]);
    }
    setLoading(false);
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      alert('Failed to delete user');
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-dim)]" />
          <input
            id="search-users"
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 py-2 text-sm"
          />
        </div>
        <span className="text-sm text-[var(--color-text-dim)]">{filtered.length} users</span>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-text-dim)] uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-text-dim)] uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-text-dim)] uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-text-dim)] uppercase tracking-wider">Enrolled</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-[var(--color-text-dim)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="px-5 py-4"><div className="skeleton h-4 w-28" /></td>
                    <td className="px-5 py-4"><div className="skeleton h-4 w-40" /></td>
                    <td className="px-5 py-4"><div className="skeleton h-5 w-16 rounded-full" /></td>
                    <td className="px-5 py-4"><div className="skeleton h-4 w-10" /></td>
                    <td className="px-5 py-4"><div className="skeleton h-4 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-[var(--color-text-dim)]">No users found</td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 text-white font-medium">{u.name}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-muted)]">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {u.is_active ? 'Active' : 'Locked'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-text-muted)]">{u.has_embedding ? 'Yes' : 'No'}</td>
                    <td className="px-5 py-3.5 text-right">
                      {!u.is_admin && (
                        <button
                          onClick={() => handleDelete(u.id, u.email)}
                          className="text-[var(--color-text-dim)] hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Logs Tab ───────────────────────────────────────────────────── */
function LogsTab() {
  const [logs, setLogs] = useState<AuthLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/logs?skip=${page * limit}&limit=${limit}`);
      setLogs(res.data.data?.logs || []);
    } catch {
      setLogs([]);
    }
    setLoading(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-text-dim)] uppercase tracking-wider">Timestamp</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-text-dim)] uppercase tracking-wider">IP</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-text-dim)] uppercase tracking-wider">Result</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-text-dim)] uppercase tracking-wider">Confidence</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-text-dim)] uppercase tracking-wider">Reason</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="px-5 py-4"><div className="skeleton h-4 w-32" /></td>
                    <td className="px-5 py-4"><div className="skeleton h-4 w-24" /></td>
                    <td className="px-5 py-4"><div className="skeleton h-5 w-16 rounded-full" /></td>
                    <td className="px-5 py-4"><div className="skeleton h-4 w-12" /></td>
                    <td className="px-5 py-4"><div className="skeleton h-4 w-28" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-[var(--color-text-dim)]">No logs found</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className={`border-b border-white/5 transition-colors
                      ${log.is_success ? 'hover:bg-emerald-500/[0.03]' : 'hover:bg-red-500/[0.03]'}`}
                  >
                    <td className="px-5 py-3.5 text-[var(--color-text-muted)] tabular-nums">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-text-muted)] font-mono text-xs">{log.ip_address}</td>
                    <td className="px-5 py-3.5">
                      <span className={`badge ${log.is_success ? 'badge-success' : 'badge-danger'}`}>
                        {log.is_success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-text-muted)] tabular-nums">
                      {log.confidence_score != null ? `${(log.confidence_score * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-text-dim)] text-xs max-w-[200px] truncate">
                      {log.failure_reason || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-30"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="text-xs text-[var(--color-text-dim)]">Page {page + 1}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={logs.length < limit}
            className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-30"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Settings Tab ───────────────────────────────────────────────── */
function SettingsTab() {
  const [threshold, setThreshold] = useState(0.68);
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [lockoutDuration, setLockoutDuration] = useState(1800);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/admin/settings', {
        similarity_threshold: threshold,
        max_failed_attempts: maxAttempts,
        lockout_duration_seconds: lockoutDuration,
      });
      alert('Settings saved');
    } catch {
      alert('Failed to save settings');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-lg animate-fade-in">
      <div className="glass-card p-6 space-y-6">
        <h3 className="text-base font-semibold text-white">Security Settings</h3>

        <div>
          <label className="block text-sm text-[var(--color-text-muted)] mb-2">
            Similarity Threshold: <span className="text-white font-medium">{threshold.toFixed(2)}</span>
          </label>
          <input
            id="input-threshold"
            type="range"
            min="0.1"
            max="1.0"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-[var(--color-text-dim)] mt-1">
            <span>Strict (0.1)</span>
            <span>Lenient (1.0)</span>
          </div>
        </div>

        <div>
          <label htmlFor="input-max-attempts" className="block text-sm text-[var(--color-text-muted)] mb-1.5">
            Max Failed Attempts
          </label>
          <input
            id="input-max-attempts"
            type="number"
            min="1"
            max="20"
            value={maxAttempts}
            onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 5)}
            className="input-field w-32"
          />
        </div>

        <div>
          <label htmlFor="input-lockout" className="block text-sm text-[var(--color-text-muted)] mb-1.5">
            Lockout Duration (seconds)
          </label>
          <input
            id="input-lockout"
            type="number"
            min="60"
            max="86400"
            value={lockoutDuration}
            onChange={(e) => setLockoutDuration(parseInt(e.target.value) || 1800)}
            className="input-field w-40"
          />
        </div>

        <button
          id="btn-save-settings"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
