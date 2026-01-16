import { useState, useEffect, useRef, useCallback } from 'react';

interface BingoItem {
    [key: string]: string;
}

interface BingoData {
    data: BingoItem[];
    headers: string[];
    title: string;
    pageId: string;
    error?: string;
}

interface BingoPageProps {
    pageId: string;
    title: string;
}

export default function BingoPage({ pageId, title }: BingoPageProps) {
    const [bingoData, setBingoData] = useState<BingoData | null>(null);
    const [teamScoreData, setTeamScoreData] = useState<BingoData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    // Use refs to track the current pageId and abort controllers
    const currentPageIdRef = useRef(pageId);
    const abortControllerRef = useRef<AbortController | null>(null);
    const teamScoreAbortControllerRef = useRef<AbortController | null>(null);

    // Track pending requests
    const pendingRequestsRef = useRef<Set<string>>(new Set());

    // Store ETags for efficient updates
    const etagRef = useRef<string | null>(null);
    const teamScoreEtagRef = useRef<string | null>(null);

    const fetchingBingoRef = useRef(false);
    const fetchingTeamScoreRef = useRef(false);
    const hasInitialFetchedRef = useRef(false);

    // Update ref when pageId changes
    useEffect(() => {
        currentPageIdRef.current = pageId;
        // Clear ETags when page changes
        etagRef.current = null;
        teamScoreEtagRef.current = null;
        // Reset fetch flags when page changes
        hasInitialFetchedRef.current = false;
        fetchingBingoRef.current = false;
        fetchingTeamScoreRef.current = false;
    }, [pageId]);

    const setLoadingState = (isLoading: boolean, requestType: string) => {
        if (isLoading) {
            pendingRequestsRef.current.add(requestType);
            setLoading(true);
        } else {
            pendingRequestsRef.current.delete(requestType);

            // Only set loading to false if no requests are pending
            if (pendingRequestsRef.current.size === 0) {
                setLoading(false);
            }
        }
    };

    const fetchBingoData = useCallback(async () => {
        // Prevent multiple simultaneous calls
        if (fetchingBingoRef.current) {
            return;
        }

        // Cancel any ongoing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();
        const currentPageId = pageId;
        currentPageIdRef.current = currentPageId;
        fetchingBingoRef.current = true;

        try {
            setLoadingState(true, 'bingo');
            setError(null);
            const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:4000' : window.location.origin;

            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const response = await fetch(`${apiBase}/api/bingo/${pageId}`, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                signal: abortControllerRef.current.signal
            });

            clearTimeout(timeoutId);

            // Check if this request is still relevant (page hasn't changed)
            if (currentPageIdRef.current !== currentPageId) {
                return; // Page changed, ignore this response
            }

            const data = await response.json();

            if (data.error) {
                setError(data.error);
            } else {
                setBingoData(data);
                etagRef.current = response.headers.get('ETag'); // Store ETag
            }
        } catch (err) {
            // Only set error if it's not an abort error and the page hasn't changed
            if (err instanceof Error && err.name !== 'AbortError' && currentPageIdRef.current === currentPageId) {
                if (err.name === 'AbortError') {
                    setError('Request timed out. Please try again.');
                } else {
                    setError('Failed to fetch bingo data. Make sure the backend server is running.');
                }
            }
        } finally {
            fetchingBingoRef.current = false;
            // Only update loading state if this is still the current page
            if (currentPageIdRef.current === currentPageId) {
                setLoadingState(false, 'bingo');
            }
        }
    }, [pageId]);

    const fetchTeamScoreData = useCallback(async () => {
        // Prevent multiple simultaneous calls
        if (fetchingTeamScoreRef.current) {
            return;
        }

        // Cancel any ongoing team score request
        if (teamScoreAbortControllerRef.current) {
            teamScoreAbortControllerRef.current.abort();
        }

        // Create new abort controller for this request
        teamScoreAbortControllerRef.current = new AbortController();
        const currentPageId = pageId;
        currentPageIdRef.current = currentPageId;
        fetchingTeamScoreRef.current = true;

        try {
            setLoadingState(true, 'teamScore');
            setError(null);
            const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:4000' : window.location.origin;
            const url = `${apiBase}/api/bingo/teamScore`;
            const response = await fetch(url, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                signal: teamScoreAbortControllerRef.current.signal
            });

            // Check if this request is still relevant (page hasn't changed)
            if (currentPageIdRef.current !== currentPageId) {
                return; // Page changed, ignore this response
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                setError(data.error);
                setTeamScoreData(null);
            } else {
                setTeamScoreData(data);
                teamScoreEtagRef.current = response.headers.get('ETag'); // Store ETag
            }
        } catch (err) {
            // Only set error if it's not an abort error and the page hasn't changed
            if (err instanceof Error && err.name !== 'AbortError' && currentPageIdRef.current === currentPageId) {
                console.error('Error fetching team score data:', err);
                const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
                setError(`Failed to fetch team score data: ${errorMessage}`);
                setTeamScoreData(null);
            }
        } finally {
            fetchingTeamScoreRef.current = false;
            // Only update loading state if this is still the current page
            if (currentPageIdRef.current === currentPageId) {
                setLoadingState(false, 'teamScore');
            }
        }
    }, [pageId]);

    // Use refs to store the latest function references to avoid circular dependencies
    const fetchBingoDataRef = useRef<(() => Promise<void>) | undefined>(undefined);
    const fetchTeamScoreDataRef = useRef<(() => Promise<void>) | undefined>(undefined);

    // Update refs when functions change
    useEffect(() => {
        fetchBingoDataRef.current = fetchBingoData;
        fetchTeamScoreDataRef.current = fetchTeamScoreData;
    }, [fetchBingoData, fetchTeamScoreData]);


    // Initial data fetch and polling setup
    useEffect(() => {
        // Only run once per pageId change
        if (hasInitialFetchedRef.current) {
            return;
        }

        // Reset fetch flag when pageId changes
        hasInitialFetchedRef.current = true;
        fetchingBingoRef.current = false;
        fetchingTeamScoreRef.current = false;

        // Fetch data for the new page
        if (pageId === 'page1') {
            fetchBingoData();
            fetchTeamScoreData();
        } else {
            fetchBingoData();
        }

        return () => {
            // Abort any ongoing requests when page changes
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (teamScoreAbortControllerRef.current) {
                teamScoreAbortControllerRef.current.abort();
            }
            hasInitialFetchedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageId]); // Only depend on pageId

    // Cleanup function to abort ongoing requests when component unmounts or page changes
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (teamScoreAbortControllerRef.current) {
                teamScoreAbortControllerRef.current.abort();
            }
            // Clear pending requests on cleanup
            pendingRequestsRef.current.clear();
        };
    }, [pageId]);

    const toggleItem = (itemId: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedItems(newSelected);
    };

    if (loading) {
        return (
            <div className="bingo-page">
                <div className="loading">
                    <h2>Loading {title}...</h2>
                    <p>Please wait while we fetch your bingo data.</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bingo-page">
                <div className="error">
                    <h2>Error Loading {title}</h2>
                    <p>{error}</p>
                    <button onClick={fetchBingoData} className="retry-btn">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!bingoData || !bingoData.data || bingoData.data.length === 0) {
        return (
            <div className="bingo-page">
                <div className="no-data">
                    <h2>Loading Bingo Data</h2>
                </div>
            </div>
        );
    }

    // Only check for team score data if we're on page1
    if (pageId === 'page1' && (!teamScoreData || !teamScoreData.data || teamScoreData.data.length === 0)) {
        return (
            <div className="bingo-page">
                <div className="no-data">
                    <h2>Loading Team Score Data</h2>
                </div>
            </div>
        );
    }

    // If on page1, show scoreboard instead of bingo board
    if (pageId === 'page1') {
        return (
            <div className="bingo-page">
                <header className="page-header">
                    <h1>{bingoData.title || title}</h1>
                </header>
                <main className="bingo-container">
                    <div className="scoreboard-wrapper">
                        <table className="scoreboard-table">
                            <thead>
                                <tr>
                                    <th>Team</th>
                                    <th>Tiles</th>
                                    <th>Points</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamScoreData?.data
                                    .sort((a, b) => {
                                        const pointsA = Number(a.score || 0);
                                        const pointsB = Number(b.score || 0);
                                        return pointsB - pointsA; // Sort descending (highest first)
                                    })
                                    .map((item, index) => (
                                        <tr key={`team-${index}`}>
                                            <td>{item.team}</td>
                                            <td>{item.tilesCompleted}</td>
                                            <td>{item.score}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                        <table className="scoreboard-table">
                            <thead>
                                <tr>
                                    <th>Player</th>
                                    <th>Team</th>
                                    <th>Drops</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bingoData.data
                                    .sort((a, b) => {
                                        const pointsA = Number(Object.values(a)[3] || 0);
                                        const pointsB = Number(Object.values(b)[3] || 0);
                                        return pointsB - pointsA; // Sort descending (highest first)
                                    })
                                    .slice(0, 5) // Take only top 5
                                    .map((item, index) => (
                                        <tr key={`player-${index}`}>
                                            <td>{Object.values(item)[0]}</td>
                                            <td>{Object.values(item)[1]}</td>
                                            <td>{Object.values(item)[2]}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="bingo-page">
            <header className="page-header">
                <h1>{bingoData.title || title}</h1>
            </header>

            <main className="bingo-container">
                <div className="bingo-grid">
                    {bingoData.data.map((item, index) => {
                        const itemId = `${pageId}-item-${index}`;
                        const isSelected = selectedItems.has(itemId);
                        const displayText = item.id || Object.values(item)[0] || `Item ${index + 1}`;
                        const value = Number(item.value);
                        const limit = Number(item.limit);
                        const isComplete = !isNaN(limit) && value >= limit && item.limit !== undefined && item.limit !== null;

                        return (
                            <div
                                key={itemId}
                                className={`bingo-item${isSelected ? ' selected' : ''}${isComplete ? ' complete' : ''}`}
                                onClick={() => toggleItem(itemId)}
                                style={{
                                    background: 'var(--bingo-tile-background-primary)',
                                }}
                            >
                                <span className="bingo-item-image" style={{
                                    backgroundImage: `url(/${encodeURIComponent(item.id)}.png)`,
                                    backgroundSize: 'contain',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat'
                                }}>

                                </span>
                                <span className="item-text">{displayText}</span>
                                <span className="item-value">{item.points}</span>
                            </div>
                        );
                    })}
                </div>
            </main>

            <footer className="page-footer">
                <p>&copy; 2026 The Bumder Brigade</p>
            </footer>
        </div>
    );
} 