import React, { useState, useEffect } from 'react';
import { 
  Link2, 
  Copy, 
  Check, 
  Trash2, 
  Settings, 
  Sun, 
  Moon, 
  ExternalLink, 
  X, 
  Sparkles, 
  RefreshCw
} from 'lucide-react';

interface ShortLink {
  id: string;
  originalUrl: string;
  shortCode: string;
  backHalf: string;
  createdAt: string;
}

export default function App() {
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('bitly_dark') === 'true';
  });

  // Shorten Form
  const [originalUrl, setOriginalUrl] = useState('');
  const [customBackHalf, setCustomBackHalf] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Editing State
  const [editingLink, setEditingLink] = useState<ShortLink | null>(null);
  const [editMode, setEditMode] = useState<'in_place' | 'split_new'>('in_place');
  const [editOriginalUrl, setEditOriginalUrl] = useState('');
  const [editBackHalf, setEditBackHalf] = useState('');

  // Deleting State
  const [deletingConfirmId, setDeletingConfirmId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Fetch Links
  const fetchLinks = async () => {
    try {
      const res = await fetch('/api/links');
      if (!res.ok) throw new Error('Failed to load links');
      const data = await res.json();
      setLinks(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('bitly_dark', String(darkMode));
  }, [darkMode]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLinks();
    setTimeout(() => setIsRefreshing(false), 300);
  };

  // Create Short Link
  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalUrl,
          backHalf: customBackHalf || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to shorten URL');

      setSuccessMessage(`Short link created successfully: /r/${data.shortCode}`);
      setOriginalUrl('');
      setCustomBackHalf('');
      fetchLinks();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Link Edit / Change Original Destination
  const handleEditLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const endpoint = editMode === 'in_place' 
        ? `/api/links/${editingLink.id}` 
        : `/api/links/${editingLink.id}/edit`;
      const method = editMode === 'in_place' ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalUrl: editOriginalUrl,
          backHalf: editBackHalf || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update link');

      if (editMode === 'in_place') {
        setSuccessMessage(`Destination URL updated for /r/${data.link.shortCode}`);
      } else {
        setSuccessMessage(`Created new split short link /r/${data.newLink.shortCode}`);
      }

      setEditingLink(null);
      fetchLinks();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error editing link');
    }
  };

  // Delete Link
  const handleDeleteLink = async (link: ShortLink) => {
    setErrorMessage('');
    setSuccessMessage('');

    const originalLinks = [...links];
    setLinks(prev => prev.filter(l => l.id !== link.id));
    setDeletingConfirmId(null);

    try {
      const res = await fetch(`/api/links/${encodeURIComponent(link.id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete short link');
      }
      setSuccessMessage(`Short link /r/${link.shortCode} deleted successfully.`);
      fetchLinks();
    } catch (err: any) {
      setLinks(originalLinks);
      setErrorMessage(err.message || 'Error deleting short link');
    }
  };

  // Copy helper
  const handleCopy = (code: string) => {
    const host = window.location.origin;
    navigator.clipboard.writeText(`${host}/r/${code}`);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* BRAND HEADER */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-8 flex items-center justify-between shadow-xs sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-600 text-white p-2 rounded-xl shadow-xs">
            <Link2 className="w-5 h-5" />
          </div>
          <span className="text-xl font-black tracking-tight text-blue-600 dark:text-blue-400 font-mono">bit.ly</span>
          <span className="text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
            Lite
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            title="Refresh links"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            title="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">

        {/* FEEDBACK MESSAGES */}
        {successMessage && (
          <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 p-4 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage('')} className="p-1 hover:text-emerald-900"><X className="w-4 h-4" /></button>
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 p-4 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="p-1 hover:text-rose-900"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* SHORTEN NEW LINK CARD */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-white">Shorten A Destination URL</h2>
              <p className="text-slate-400 text-xs mt-0.5">Instant redirection with optional custom alias</p>
            </div>
            <Sparkles className="w-5 h-5 text-blue-500" />
          </div>

          <form onSubmit={handleCreateLink} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-1.5">
                Destination URL
              </label>
              <input
                type="url"
                required
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                placeholder="https://example.com/target-page"
                className="w-full px-3.5 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-white text-base sm:text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-1.5">
                Custom Back-Half (Optional)
              </label>
              <div className="flex rounded-xl shadow-xs">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-400 text-xs font-mono font-bold">
                  bit.ly/
                </span>
                <input
                  type="text"
                  value={customBackHalf}
                  onChange={(e) => setCustomBackHalf(e.target.value)}
                  placeholder="my-custom-alias"
                  className="w-full px-3.5 py-3 border border-slate-200 dark:border-slate-800 rounded-r-xl bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-white text-base sm:text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors shadow-sm cursor-pointer min-h-[44px]"
              >
                {submitting ? 'Shortening...' : 'Shorten Link'}
              </button>
            </div>
          </form>
        </div>

        {/* EDIT LINK FORM (WHEN ACTIVE) */}
        {editingLink && (
          <div className="bg-blue-50/70 dark:bg-slate-900/90 p-6 sm:p-8 rounded-2xl border-2 border-blue-500 shadow-md space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest block mb-1">
                  Link Editor
                </span>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Change Destination for /r/{editingLink.shortCode}
                </h2>
              </div>
              <button onClick={() => setEditingLink(null)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Edit Mode Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1 bg-slate-200/60 dark:bg-slate-950 rounded-xl">
              <button
                type="button"
                onClick={() => setEditMode('in_place')}
                className={`p-3 rounded-lg text-left transition-all cursor-pointer ${
                  editMode === 'in_place'
                    ? 'bg-white dark:bg-slate-900 shadow-xs border border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="font-extrabold text-xs block mb-0.5">Direct Update (In-Place)</span>
                <span className="text-[10px] text-slate-500 leading-snug block">
                  Update destination for <strong className="font-mono">/r/{editingLink.shortCode}</strong> directly.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setEditMode('split_new')}
                className={`p-3 rounded-lg text-left transition-all cursor-pointer ${
                  editMode === 'split_new'
                    ? 'bg-white dark:bg-slate-900 shadow-xs border border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="font-extrabold text-xs block mb-0.5">Create Split Link</span>
                <span className="text-[10px] text-slate-500 leading-snug block">
                  Creates a new separate short link while current link remains unchanged.
                </span>
              </button>
            </div>

            <form onSubmit={handleEditLinkSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    New Destination URL
                  </label>
                  <input
                    type="url"
                    required
                    value={editOriginalUrl}
                    onChange={(e) => setEditOriginalUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-950 dark:text-white text-base sm:text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Custom Back-Half
                  </label>
                  <input
                    type="text"
                    value={editBackHalf}
                    onChange={(e) => setEditBackHalf(e.target.value)}
                    placeholder={editMode === 'in_place' ? editingLink.shortCode : 'new-alias'}
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-950 dark:text-white text-base sm:text-xs font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLink(null)}
                  className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer min-h-[40px]"
                >
                  {editMode === 'in_place' ? 'Save New Target' : 'Create Split Link'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ACTIVE SHORT LINKS DIRECTORY */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">Shortened Links</h3>
            <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-lg">
              {links.length} {links.length === 1 ? 'Link' : 'Links'}
            </span>
          </div>

          {/* MOBILE CARDS VIEW (RESPONSIVE) */}
          <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {links.length > 0 ? (
              links.map((link) => (
                <div key={link.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-extrabold text-sm truncate">
                      /r/{link.shortCode}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleCopy(link.shortCode)}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-h-[40px] min-w-[40px] flex items-center justify-center"
                        title="Copy link"
                      >
                        {copiedCode === link.shortCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => window.open(`/r/${link.shortCode}`, '_blank')}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-h-[40px] min-w-[40px] flex items-center justify-center"
                        title="Open redirect"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Full Original Destination URL Display */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Original Destination (Full URL)
                    </span>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 break-all select-all leading-relaxed">
                      {link.originalUrl}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(link.createdAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingLink(link);
                          setEditMode('in_place');
                          setEditOriginalUrl(link.originalUrl);
                          setEditBackHalf(link.shortCode);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-3 py-2 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 inline-flex items-center gap-1 min-h-[40px]"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Edit Link</span>
                      </button>

                      {deletingConfirmId === link.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteLink(link)}
                            className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold transition-colors min-h-[40px] cursor-pointer"
                          >
                            Confirm Delete
                          </button>
                          <button
                            onClick={() => setDeletingConfirmId(null)}
                            className="px-2 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold min-h-[40px] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingConfirmId(link.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl min-h-[40px] min-w-[40px] flex items-center justify-center border border-rose-200 dark:border-rose-900 cursor-pointer"
                          title="Delete Short Link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                No links shortened yet. Shorten one above!
              </div>
            )}
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/40 text-slate-400 font-black text-[10px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 px-6">Original Destination (Full URL)</th>
                  <th className="py-3 px-6">Shortened URL</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                {links.length > 0 ? (
                  links.map((link) => (
                    <tr key={link.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-colors">
                      <td className="py-4 px-6 min-w-[340px]">
                        <div className="space-y-1">
                          <span className="block font-semibold text-slate-800 dark:text-slate-200 text-xs break-all select-all font-mono leading-relaxed">
                            {link.originalUrl}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Created: {new Date(link.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                            {window.location.host}/r/{link.shortCode}
                          </span>
                          <button
                            onClick={() => handleCopy(link.shortCode)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Copy link"
                          >
                            {copiedCode === link.shortCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => window.open(`/r/${link.shortCode}`, '_blank')}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Open redirect"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setEditingLink(link);
                            setEditMode('in_place');
                            setEditOriginalUrl(link.originalUrl);
                            setEditBackHalf(link.shortCode);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg inline-flex cursor-pointer"
                          title="Edit Original Destination"
                        >
                          <Settings className="w-4 h-4" />
                        </button>

                        {deletingConfirmId === link.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteLink(link)}
                              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-extrabold transition-colors cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingConfirmId(null)}
                              className="px-2 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingConfirmId(link.id)}
                            className="p-2 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg inline-flex cursor-pointer"
                            title="Delete Short Link"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-slate-400 text-xs font-semibold">
                      No links shortened yet. Shorten one above!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

    </div>
  );
}
