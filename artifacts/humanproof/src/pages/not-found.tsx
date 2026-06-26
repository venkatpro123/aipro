import { Link } from "react-router-dom";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="min-h-[70vh] w-full flex items-center justify-center"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <div
        className="w-full max-w-md mx-4 rounded-2xl px-6 py-8 text-center"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-2)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex justify-center mb-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.10)' }}
          >
            <AlertCircle className="w-7 h-7" style={{ color: 'var(--red, #ef4444)' }} />
          </div>
        </div>

        <h1
          className="text-xl font-black mb-2"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
        >
          Page Not Found
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
            style={{
              background: 'var(--alpha-bg-06)',
              border: '1px solid var(--border-2)',
              color: 'var(--text-2)',
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Go Back
          </button>
          <Link
            to="/"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
            style={{
              background: 'var(--cyan, #00d4e0)',
              color: '#000',
              textDecoration: 'none',
            }}
          >
            <Home className="w-3.5 h-3.5" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
