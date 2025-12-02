import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './App.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [voteData, setVoteData] = useState({});
  const [latestVotes, setLatestVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchVoteData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/votes`);
      if (!response.ok) {
        throw new Error('Failed to fetch vote data');
      }
      const result = await response.json();
      
      if (result.success) {
        // Ensure percentages are numbers
        const normalizedData = {};
        Object.keys(result.data).forEach(candidate => {
          normalizedData[candidate] = (result.data[candidate] || []).map(point => ({
            ...point,
            percentage: typeof point.percentage === 'string' 
              ? parseFloat(point.percentage) 
              : point.percentage
          }));
        });
        
        setVoteData(normalizedData);
        setLatestVotes((result.latest || []).map(vote => ({
          ...vote,
          percentage: typeof vote.percentage === 'string' 
            ? parseFloat(vote.percentage) 
            : vote.percentage
        })));
        setLastUpdate(new Date());
        setError(null);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error fetching vote data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoteData();
    
    // Poll every minute
    const interval = setInterval(fetchVoteData, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Prepare chart data
  const prepareChartData = () => {
    const candidates = Object.keys(voteData);
    if (candidates.length === 0) {
      return null;
    }

    // Sort candidates by name for consistency
    const sortedCandidates = [...candidates].sort();

    // Get all unique timestamps and sort them chronologically
    const allTimestamps = new Set();
    sortedCandidates.forEach(candidate => {
      if (voteData[candidate] && Array.isArray(voteData[candidate])) {
        voteData[candidate].forEach(point => {
          if (point && point.timestamp) {
            allTimestamps.add(point.timestamp);
          }
        });
      }
    });
    
    // Sort timestamps chronologically
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => {
      return new Date(a) - new Date(b);
    });

    // Create datasets for each candidate, maintaining consistent order
    const datasets = sortedCandidates.map((candidate, index) => {
      const color = getColorForCandidate(index);
      
      // Get all data points for this candidate, sorted by timestamp
      const candidateData = (voteData[candidate] || [])
        .filter(point => point && point.timestamp && point.percentage !== null && point.percentage !== undefined)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // Map data points to the sorted timestamps
      const data = sortedTimestamps.map(timestamp => {
        // Find the data point for this timestamp
        const point = candidateData.find(p => p.timestamp === timestamp);
        if (point) {
          return point.percentage;
        }
        // If no exact match, find the closest previous point (for continuity)
        const previousPoint = candidateData
          .filter(p => new Date(p.timestamp) <= new Date(timestamp))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        return previousPoint ? previousPoint.percentage : null;
      });

      return {
        label: candidate,
        data: data,
        borderColor: color.border,
        backgroundColor: color.fill,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        spanGaps: false, // Don't connect across null values
      };
    });

    // Format timestamps for display
    const labels = sortedTimestamps.map(ts => {
      try {
        const date = new Date(ts);
        if (isNaN(date.getTime())) {
          return ts; // Return original if invalid date
        }
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
      } catch (e) {
        return ts;
      }
    });

    return {
      labels,
      datasets,
    };
  };

  const getColorForCandidate = (index) => {
    const colors = [
      { border: 'rgb(75, 192, 192)', fill: 'rgba(75, 192, 192, 0.2)' },
      { border: 'rgb(255, 99, 132)', fill: 'rgba(255, 99, 132, 0.2)' },
      { border: 'rgb(255, 205, 86)', fill: 'rgba(255, 205, 86, 0.2)' },
      { border: 'rgb(54, 162, 235)', fill: 'rgba(54, 162, 235, 0.2)' },
      { border: 'rgb(153, 102, 255)', fill: 'rgba(153, 102, 255, 0.2)' },
    ];
    return colors[index % colors.length];
  };

  const chartData = prepareChartData();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 14,
            weight: 'bold',
          },
          padding: 15,
        },
      },
      title: {
        display: true,
        text: 'Lou Groza Award Finalists - Vote Percentage Over Time',
        font: {
          size: 20,
          weight: 'bold',
        },
        padding: {
          top: 10,
          bottom: 30,
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          },
        },
        title: {
          display: true,
          text: 'Vote Percentage (%)',
          font: {
            size: 14,
            weight: 'bold',
          },
        },
      },
      x: {
        title: {
          display: true,
          text: 'Time',
          font: {
            size: 14,
            weight: 'bold',
          },
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Lou Groza Award Vote Tracker</h1>
        <p className="subtitle">Tracking finalist vote percentages in real-time</p>
      </header>

      {loading && (
        <div className="loading">
          <p>Loading vote data...</p>
        </div>
      )}

      {error && (
        <div className="error">
          <p>Error: {error}</p>
          <button onClick={fetchVoteData}>Retry</button>
        </div>
      )}

      {!loading && !error && latestVotes.length > 0 && (
        <div className="latest-votes">
          <h2>Current Vote Percentages</h2>
          <div className="vote-cards">
            {latestVotes.map((vote, index) => (
              <div key={vote.candidate_name} className="vote-card">
                <h3>{vote.candidate_name}</h3>
                <div className="percentage">{vote.percentage.toFixed(2)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && chartData && (
        <div className="chart-container">
          <div className="chart-wrapper">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      {!loading && !error && Object.keys(voteData).length === 0 && (
        <div className="no-data">
          <p>No vote data available yet. The scraper is collecting data...</p>
        </div>
      )}

      {lastUpdate && (
        <div className="last-update">
          <p>Last updated: {lastUpdate.toLocaleTimeString()}</p>
          <p className="update-note">Data refreshes automatically every minute</p>
        </div>
      )}
    </div>
  );
}

export default App;

