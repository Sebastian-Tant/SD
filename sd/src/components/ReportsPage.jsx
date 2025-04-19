import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import './css-files/ReportsPage.css';

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
          setCurrentUser(user);
          if (user) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              setUserData(userDoc.data());
            }
          }
        });

        const reportsRef = collection(db, 'reports');
        const snapshot = await getDocs(reportsRef);
        const reportsData = snapshot.docs.map(doc => {
          const data = doc.data();
          const timestamp = data.timestamp instanceof Timestamp 
            ? data.timestamp.toDate() 
            : null;
            
          return {
            id: doc.id,
            ...data,
            timestamp: timestamp,
            replies: data.replies?.map(reply => ({
              ...reply,
              timestamp: reply.timestamp instanceof Timestamp
                ? reply.timestamp.toDate()
                : reply.timestamp
            })) || []
          };
        });
        
        reportsData.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setReports(reportsData);
        setFilteredReports(reportsData);
        setLoading(false);
        
        return () => unsubscribe();
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load reports");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let results = reports;
    
    // Apply search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      results = results.filter(report => 
        report.facilityName.toLowerCase().includes(term) ||
        report.issue.toLowerCase().includes(term) ||
        report.description.toLowerCase().includes(term)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      results = results.filter(report => 
        (report.status || 'pending').toLowerCase() === statusFilter.toLowerCase()
      );
    }
    
    setFilteredReports(results);
  }, [reports, searchTerm, statusFilter]);

  const handleStatusChange = async (reportId, newStatus) => {
    try {
      if (!userData || !['Admin', 'Facility Staff'].includes(userData.role)) {
        setError('You do not have permission to change status');
        return;
      }

      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, { status: newStatus });

      setReports(reports.map(report => 
        report.id === reportId ? { ...report, status: newStatus } : report
      ));
    } catch (error) {
      console.error("Error updating status:", error);
      setError('Failed to update status: ' + error.message);
    }
  };

  const handleReplySubmit = async (reportId) => {
    if (!replyText.trim()) return;
    if (!currentUser || !userData) {
      setError('You must be logged in to reply');
      return;
    }

    try {
      const newReply = {
        text: replyText,
        timestamp: new Date(),
        userInfo: {
          userId: currentUser.uid,
          displayName: userData.displayName || 'User',
          role: userData.role || 'user'
        }
      };

      setReports(reports.map(report => 
        report.id === reportId 
          ? { ...report, replies: [...(report.replies || []), newReply] } 
          : report
      ));

      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, {
        replies: [...(reports.find(r => r.id === reportId).replies || []), newReply]
      });

      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      console.error("Error submitting reply:", error);
      setError('Failed to submit reply: ' + error.message);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown date';
    
    let jsDate;
    if (date instanceof Timestamp) {
      jsDate = date.toDate();
    } else {
      jsDate = new Date(date);
    }
    
    if (isNaN(jsDate.getTime())) return 'Invalid date';
    
    return jsDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <p className="loading">Loading reports...</p>;
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  return (
    <section className="reports-page">
      <h1>Reports Management</h1>
      
      <section className="reports-filters">
        <section className="search-filter">
          <input
            type="text"
            placeholder="Search by facility, issue, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="clear-filter-btn"
            >
              Clear
            </button>
          )}
        </section>
        
        <section className="status-filter">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-select"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </section>
      </section>

      {filteredReports.length === 0 ? (
        <p className="no-reports">
          {searchTerm || statusFilter !== 'all' 
            ? 'No matching reports found' 
            : 'No reports found'
          }
        </p>
      ) : (
        <section className="reports-list">
          {filteredReports.map(report => (
            <article key={report.id} className="report-card">
              <header className="report-header">
                <h3>{report.issue}</h3>
                {(userData?.role === 'Admin' || userData?.role === 'Facility Staff') ? (
                  <section className="status-controls">
                    <select
                      value={report.status || 'pending'}
                      onChange={(e) => handleStatusChange(report.id, e.target.value)}
                      className={`status-select ${(report.status || 'pending').toLowerCase().replace(' ', '-')}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="in progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </section>
                ) : (
                  <span className={`status ${(report.status || 'pending').toLowerCase().replace(' ', '-')}`}>
                    {report.status || 'Pending'}
                  </span>
                )}
              </header>
              
              <section className="report-meta">
                <p><strong>Facility:</strong> {report.facilityName}</p>
                <p>
                  <strong>Reported by:</strong> {report.userInfo?.displayName || 'Unknown'} ({report.userInfo?.role || 'user'})
                </p>
                <p><strong>Date:</strong> {formatDate(report.timestamp)}</p>
              </section>
              
              <section className="report-details">
                <p><strong>Description:</strong> {report.description}</p>
                <p><strong>Specific Area:</strong> {report.subfacility}</p>
                
                {report.imageUrl && (
                  <figure className="report-image">
                    <img src={report.imageUrl} alt="Report evidence" />
                  </figure>
                )}
              </section>
              
              <section className="replies-section">
                <h4>Replies ({report.replies?.length || 0})</h4>
                
                {report.replies?.map((reply, index) => (
                  <article key={index} className="reply">
                    <header className="reply-header">
                      <strong>{reply.userInfo?.displayName || 'User'} ({reply.userInfo?.role || 'user'})</strong>
                      <span>{formatDate(reply.timestamp)}</span>
                    </header>
                    <p>{reply.text}</p>
                  </article>
                ))}
                
                {replyingTo === report.id ? (
                  <section className="reply-form">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply here..."
                    />
                    {error && <p className="error-message">{error}</p>}
                    <section className="reply-actions">
                      <button onClick={() => handleReplySubmit(report.id)}>Submit</button>
                      <button onClick={() => {
                        setReplyingTo(null);
                        setError(null);
                      }}>Cancel</button>
                    </section>
                  </section>
                ) : (
                  <button 
                    className="reply-btn"
                    onClick={() => {
                      setReplyingTo(report.id);
                      setError(null);
                    }}
                  >
                    Add Reply
                  </button>
                )}
              </section>
            </article>
          ))}
        </section>
      )}
    </section>
  );
};

export default ReportsPage;