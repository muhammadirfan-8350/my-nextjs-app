import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent } from 'react';

type NavbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onExport: () => void;
  userName: string;
};

export default function Navbar({ searchValue, onSearchChange, onExport, userName }: NavbarProps) {
  const router = useRouter();
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="rounded-full bg-brand-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 transition"
          >
            SaaS Control
          </button>
          <form onSubmit={handleSubmit} className="hidden md:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search campaigns..."
              className="w-64 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </form>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Export CSV
          </button>
          <div className="hidden sm:flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
            <span className="font-medium">{userName}</span>
            <span className="h-8 w-8 rounded-full bg-brand-500 text-white grid place-items-center">{userName.charAt(0)}</span>
          </div>
          <Link href="/api/auth/logout" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition">
            Logout
          </Link>
        </div>
      </div>
    </header>
  );
}
