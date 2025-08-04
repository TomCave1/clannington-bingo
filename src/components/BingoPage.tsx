import { useState, useEffect, useRef } from 'react';

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

    if (pageId === 'page1') {
        useEffect(() => {
            fetchBingoData();
            fetchTeamScoreData();
        }, [pageId]);
    } else {
        useEffect(() => {
            fetchBingoData();
        }, [pageId]);
    }

    const setLoadingState = (isLoading: boolean, requestType: string) => {
        if (isLoading) {
            pendingRequestsRef.current.add(requestType);
        } else {
            pendingRequestsRef.current.delete(requestType);
        }

        // Only set loading to false if no requests are pending
        if (!isLoading && pendingRequestsRef.current.size === 0) {
            setLoading(false);
        } else if (isLoading) {
            setLoading(true);
        }
    };

    const fetchBingoData = async () => {
        // Cancel any ongoing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();
        const currentPageId = pageId;
        currentPageIdRef.current = currentPageId;

        try {
            setLoadingState(true, 'bingo');
            setError(null);
            const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:4000' : window.location.origin;
            const response = await fetch(`${apiBase}/api/bingo/${pageId}`, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                signal: abortControllerRef.current.signal
            });

            // Check if this request is still relevant (page hasn't changed)
            if (currentPageIdRef.current !== currentPageId) {
                return; // Page changed, ignore this response
            }

            const data = await response.json();

            if (data.error) {
                setError(data.error);
            } else {
                setBingoData(data);
            }
        } catch (err) {
            // Only set error if it's not an abort error and the page hasn't changed
            if (err instanceof Error && err.name !== 'AbortError' && currentPageIdRef.current === currentPageId) {
                setError('Failed to fetch bingo data. Make sure the backend server is running.');
            }
        } finally {
            // Only update loading state if this is still the current page
            if (currentPageIdRef.current === currentPageId) {
                setLoadingState(false, 'bingo');
            }
        }
    };

    const fetchTeamScoreData = async () => {
        // Cancel any ongoing team score request
        if (teamScoreAbortControllerRef.current) {
            teamScoreAbortControllerRef.current.abort();
        }

        // Create new abort controller for this request
        teamScoreAbortControllerRef.current = new AbortController();
        const currentPageId = pageId;
        currentPageIdRef.current = currentPageId;

        try {
            setLoadingState(true, 'teamScore');
            setError(null);
            const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:4000' : window.location.origin;
            const url = `${apiBase}/api/bingo/teamScore`;
            console.log('Fetching team score data from:', url);
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

            console.log('Team score data:', data);

            if (data.error) {
                setError(data.error);
                setTeamScoreData(null);
            } else {
                setTeamScoreData(data);
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
            // Only update loading state if this is still the current page
            if (currentPageIdRef.current === currentPageId) {
                setLoadingState(false, 'teamScore');
            }
        }
    };

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

    if (!teamScoreData || !teamScoreData.data || teamScoreData.data.length === 0) {
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
                                {teamScoreData.data
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
                <p>&copy; 2025 The Bumder Brigade</p>
            </footer>
        </div>
    );
} 