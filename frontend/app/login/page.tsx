'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError('密碼錯誤，請重新輸入');
      }
    } catch {
      setError('連線失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-violet-50 to-amber-50">
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-pink-100 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
            倪師斗數
          </h1>
          <p className="text-pink-300 mt-2">請輸入密碼</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密碼"
            className="w-full px-4 py-3 rounded-xl border border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-200 outline-none text-center text-lg"
            autoFocus
          />

          {error && (
            <p className="text-red-400 text-center text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-400 to-violet-400 text-white font-bold text-lg hover:from-pink-500 hover:to-violet-500 disabled:opacity-50 transition-all"
          >
            {loading ? '驗證中...' : '進入'}
          </button>
        </form>
      </div>
    </div>
  );
}
