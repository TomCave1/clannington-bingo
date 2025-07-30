import { useState, useEffect } from 'react'
import BingoPage from './components/BingoPage'
import './App.css'

interface Page {
  id: string;
  title: string;
  hasConfig: boolean;
}

function App() {
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPage, setCurrentPage] = useState<string>('page1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:4000' : '';
      const response = await fetch(`${apiBase}/api/pages`);
      const data = await response.json();
      setPages(data.pages);

      // Set current page to first available page with config
      const firstAvailablePage = data.pages.find((page: Page) => page.hasConfig);
      if (firstAvailablePage) {
        setCurrentPage(firstAvailablePage.id);
      }
    } catch (err) {
      setError('Failed to fetch pages. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

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
          <button onClick={fetchPages} className="retry-btn">
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
          <button onClick={fetchPages} className="retry-btn">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-header-heading">Clannington Bingo</h1>
        <h2 className="app-header-subheading">The Sequel</h2>
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
                {page.title}
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
                    {page.title} (No Sheet ID)
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
