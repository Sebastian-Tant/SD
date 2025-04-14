import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';

const AdminDashboard = () => {
<<<<<<< Updated upstream
  const [activeTab, setActiveTab] = useState('applications'); // 'application' or 'users'
=======
  const [activeTab, setActiveTab] = useState('applications');
>>>>>>> Stashed changes
  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const appsSnapshot = await getDocs(collection(db, 'applications'));
        const apps = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setApplications(apps);

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

  if (loading) return <section className="admin-loading">Loading data...</section>;
  if (error) return <section className="admin-error">Error: {error}</section>;

  return (
    <main className="admin-dashboard">
      <header>
        <h1>Admin Dashboard</h1>
      </header>

      <nav className="admin-tabs">
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
      </nav>

      {activeTab === 'applications' ? (
        <section>
          <h2>Pending Applications</h2>
          {applications.length === 0 ? (
            <p>No applications found</p>
          ) : (
            <section className="applications-list">
              {applications.map((application) => (
                <article key={application.id} className="application-card">
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
                </article>
              ))}
            </section>
          )}
        </section>
      ) : (
        <section>
          <h2>User Management</h2>
          {users.length === 0 ? (
            <p>No users with special roles found</p>
          ) : (
            <section className="users-list">
              {users.map((user) => (
                <article key={user.id} className="user-card">
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
                </article>
              ))}
            </section>
          )}
        </section>
      )}
    </main>
  );
};

export default AdminDashboard;
