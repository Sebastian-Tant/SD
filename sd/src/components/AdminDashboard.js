import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import './css-files/admindashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('applications'); // 'applications' or 'users'
  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch applications
        const appsSnapshot = await getDocs(collection(db, 'applications'));
        const apps = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setApplications(apps);
        
        // Fetch users with roles (excluding Residents)
        const usersQuery = query(
          collection(db, 'users'),
          where('role', 'in', ['Admin', 'Facility Staff'])
        );
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);
        
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const updateUserRole = async (userId, newRole) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
      return true;
    } catch (err) {
      console.error('Error updating user role:', err);
      setError(err.message);
      return false;
    }
  };

  const handleStatusUpdate = async (applicationId, newStatus) => {
    try {
      const application = applications.find(app => app.id === applicationId);
      const appRef = doc(db, 'applications', applicationId);
      
      await updateDoc(appRef, { status: newStatus });
      
      if (newStatus === 'approved' && application.applicationType) {
        await updateUserRole(application.uid, application.applicationType);
        // Refresh users list after role change
        const updatedUsers = users.map(user => 
          user.id === application.uid ? { ...user, role: application.applicationType } : user
        );
        setUsers(updatedUsers);
      }
      
      setApplications(applications.map(app => 
        app.id === applicationId ? { ...app, status: newStatus } : app
      ));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRevokeRole = async (userId) => {
    if (window.confirm('Are you sure you want to revoke this user\'s role?')) {
      const success = await updateUserRole(userId, 'Resident');
      if (success) {
        alert('Role revoked successfully. The user has been demoted to Resident.');
      }
    }
  };

  if (loading) return <div className="admin-loading">Loading data...</div>;
  if (error) return <div className="admin-error">Error: {error}</div>;

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      
      <div className="admin-tabs">
        <button 
          className={activeTab === 'applications' ? 'active' : ''}
          onClick={() => setActiveTab('applications')}
        >
          Applications
        </button>
        <button 
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          Manage Users
        </button>
      </div>

      {activeTab === 'applications' ? (
        <>
          <h2>Pending Applications</h2>
          {applications.length === 0 ? (
            <p>No applications found</p>
          ) : (
            <div className="applications-list">
              {applications.map((application) => (
                <div key={application.id} className="application-card">
                  <h3>{application.name}</h3>
                  <p><strong>Position:</strong> {application.applicationType}</p>
                  <p><strong>Facility:</strong> {application.Facility}</p>
                  <p><strong>Status:</strong> <span className={`status-${application.status}`}>
                    {application.status}
                  </span></p>
                  
                  {application.status === 'pending' && (
                    <div className="action-buttons">
                      <button 
                        onClick={() => handleStatusUpdate(application.id, 'approved')}
                        className="approve-btn"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(application.id, 'rejected')}
                        className="reject-btn"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <h2>User Management</h2>
          {users.length === 0 ? (
            <p>No users with special roles found</p>
          ) : (
            <div className="users-list">
              {users.map((user) => (
                <div key={user.id} className="user-card">
                  <div className="user-info">
                    <h3>{user.displayName || 'Unnamed User'}</h3>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Role:</strong> <span className={`role-${user.role.toLowerCase().replace(' ', '-')}`}>
                      {user.role}
                    </span></p>
                  </div>
                  <div className="user-actions">
                    <button 
                      onClick={() => handleRevokeRole(user.id)}
                      className="revoke-btn"
                      disabled={user.role === 'Admin' && users.filter(u => u.role === 'Admin').length <= 1}
                    >
                      Revoke Role
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;