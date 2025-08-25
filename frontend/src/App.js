import { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const RESULTS_PER_PAGE = 5;

  useEffect(() => {
    const savedHistory = JSON.parse(sessionStorage.getItem("recentSearches")) || [];
    setHistory(savedHistory);
  }, []);

  const saveToHistory = (keyword) => {
    if (!keyword.trim()) return;
    const updatedHistory = [keyword, ...history.filter(k => k !== keyword)].slice(0, 5);
    setHistory(updatedHistory);
    sessionStorage.setItem("recentSearches", JSON.stringify(updatedHistory));
  };

  const handleSearch = async (pageNumber = 1) => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:5000/search?keyword=${keyword}&page=${pageNumber}`
      );
      setResults(res.data.repos);
      setTotalPages(Math.ceil(res.data.totalCount / RESULTS_PER_PAGE));
      setPage(pageNumber);
      saveToHistory(keyword);
    } catch (err) {
      alert("Error fetching results");
    } finally {
      setLoading(false);
    }
  };

  const renderPageNumbers = () => {
    let pages = [];
    for (let i = 1; i <= Math.min(totalPages, 10); i++) {
      pages.push(
        <button
          key={i}
          className={i === page ? "active-page" : ""}
          onClick={() => handleSearch(i)}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  return (
    <div className="container">
      <header>
        <h1>FetchBoard 🔍</h1>
        <p>Search GitHub repositories and view them in style</p>
      </header>

      <div className="search-box">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Enter keyword..."
        />
        <button onClick={() => handleSearch(1)}>Search</button>
      </div>

      {history.length > 0 && (
        <div className="history">
          <h3>Recent Searches</h3>
          <ul>
            {history.map((k, i) => (
              <li key={i}>
                <button onClick={() => { setKeyword(k); handleSearch(1); }}>{k}</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading ? <p>Loading...</p> : (
        <div className="grid">
          {results.map((repo, i) => (
            <div key={i} className="card">
              <h3 className="card-title">{repo.name}</h3>
              <div className="card-meta">
                {typeof repo.stars !== 'undefined' && (
                  <span className="badge badge-star">⭐ {repo.stars}</span>
                )}
                {repo.username && (
                  <span className="badge badge-owner">👤 {repo.username}</span>
                )}
                {repo.language && (
                  <span className="badge badge-lang">🧠 {repo.language}</span>
                )}
              </div>
              {repo.description && (
                <p className="card-desc">{repo.description}</p>
              )}
              <div className="card-actions">
                <a className="card-link" href={repo.url} target="_blank" rel="noreferrer">View Repo</a>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => handleSearch(page - 1)}>Prev</button>
          {renderPageNumbers()}
          <button disabled={page === totalPages} onClick={() => handleSearch(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}

export default App;
