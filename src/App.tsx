import { useState, useEffect, useRef, useCallback } from 'react'
import BingoPage from './components/BingoPage'
import './App.css'

interface Page {
  id: string;
  title: string;
  navLabel?: string;
  hasConfig: boolean;
}

function App() {
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPage, setCurrentPage] = useState<string>('page1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);

  const fetchPages = useCallback(async (force = false) => {
    // Prevent multiple simultaneous calls
    if (fetchingRef.current) {
      return;
    }

    // Prevent multiple calls if already fetched (unless explicitly forced)
    if (!force && hasFetchedRef.current) {
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:4000' : window.location.origin;
      const response = await fetch(`${apiBase}/api/pages`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await response.json();

      // Only update if pages actually changed
      setPages(prevPages => {
        const pagesChanged = JSON.stringify(prevPages) !== JSON.stringify(data.pages);
        if (!pagesChanged && prevPages.length > 0) {
          return prevPages; // No change, return previous state
        }
        return data.pages;
      });

      // Set current page to first available page with config (only on first fetch)
      if (!hasFetchedRef.current) {
        const firstAvailablePage = data.pages.find((page: Page) => page.hasConfig);
        if (firstAvailablePage) {
          setCurrentPage(prevPage => {
            // Only update if different to prevent unnecessary re-renders
            return prevPage !== firstAvailablePage.id ? firstAvailablePage.id : prevPage;
          });
        }
        hasFetchedRef.current = true;
      }
    } catch (err) {
      setError('Failed to fetch pages. Make sure the backend server is running.');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Only fetch once on mount
    if (!hasFetchedRef.current) {
      fetchPages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  const handlePageChange = (pageId: string) => {
    setCurrentPage(pageId);
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <h2>Loading Bingo App...</h2>
          <p>Please wait while we fetch available pages.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => fetchPages(true)} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const availablePages = pages.filter(page => page.hasConfig && page.id !== 'teamScore');
  const currentPageData = pages.find(page => page.id === currentPage);

  if (availablePages.length === 0) {
    return (
      <div className="app">
        <div className="no-data">
          <h2>No Bingo Pages Available</h2>
          <p>Please configure at least one Google Sheet in your environment variables.</p>
          <button onClick={() => fetchPages(true)} className="retry-btn">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <a href="/" className="logo-link">
          CLANNINGTON B<span>III</span>NGO
        </a>
      </header>

      <div className="app-content">
        <nav className="sidebar">
          <div className="nav-links">
            {availablePages.map(page => (
              <button
                key={page.id}
                className={`nav-link ${currentPage === page.id ? 'active' : ''}`}
                onClick={() => handlePageChange(page.id)}
              >
                {page.navLabel || page.title}
              </button>
            ))}
          </div>

          {pages.some(page => !page.hasConfig) && (
            <div className="unconfigured-pages">
              <h4>Unconfigured Pages</h4>
              {pages
                .filter(page => !page.hasConfig)
                .map(page => (
                  <div key={page.id} className="unconfigured-page">
                    {page.navLabel || page.title} (No Sheet ID)
                  </div>
                ))}
            </div>
          )}
        </nav>

        <main className="main-content">
          {currentPageData && (
            <BingoPage
              pageId={currentPage}
              title={currentPageData.title}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App
