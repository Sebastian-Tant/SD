import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc,getDoc, query, where } from 'firebase/firestore';
import './css-files/admindashboard.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { arrayUnion } from 'firebase/firestore';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('applications'); // 'applications', 'users', or 'bookings'
  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedBookings, setSelectedBookings] = useState([]);
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
        
        // Fetch pending bookings from all facilities
        const facilitiesSnapshot = await getDocs(collection(db, 'facilities'));
        let allBookings = [];
        
        for (const facilityDoc of facilitiesSnapshot.docs) {
          const subfacilitiesRef = collection(db, 'facilities', facilityDoc.id, 'subfacilities');
          const subfacilitiesSnapshot = await getDocs(subfacilitiesRef);
          
          
          for (const subfacilityDoc of subfacilitiesSnapshot.docs) {
            const subfacilityBookings = subfacilityDoc.data().bookings || [];
            const formattedBookings = subfacilityBookings.map(booking => ({
              ...booking,
              id: `${facilityDoc.id}_${subfacilityDoc.id}_${booking.date}_${booking.time}`,
              facilityId: facilityDoc.id,
              facilityName: facilityDoc.data().name,
              subfacilityId: subfacilityDoc.id,
              subfacilityName: subfacilityDoc.data().name,
              documentPath: `facilities/${facilityDoc.id}/subfacilities/${subfacilityDoc.id}`,
              dateObj: new Date(booking.date) // Create Date object for calendar
            }));
            
            allBookings = [...allBookings, ...formattedBookings];
          }
        }
        
        setBookings(allBookings);
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

  const handleBookingDecision = async (booking, decision) => {
    try {
      const bookingRef = doc(db, booking.documentPath);
      const docSnap = await getDoc(bookingRef);
      
      if (docSnap.exists()) {
        const currentBookings = docSnap.data().bookings || [];
        const updatedBookings = currentBookings.map(b => {
          if (b.date === booking.date && b.time === booking.time && b.userId === booking.userId) {
            return { ...b, status: decision };
          }
          return b;
        });
        
        await updateDoc(bookingRef, { bookings: updatedBookings });
        
        // Update local state
        setBookings(bookings.filter(b => 
          !(b.facilityId === booking.facilityId && 
            b.subfacilityId === booking.subfacilityId && 
            b.date === booking.date && 
            b.time === booking.time)
        ));
        
        alert(`Booking has been ${decision}`);
      }
      // Create notification for user
    const notification = {
      id: Date.now().toString(),
      type: "booking",
      message: decision === "approved" 
        ? `Your booking for ${booking.subfacilityName} on ${booking.date} at ${booking.time} has been approved!` 
        : `Your booking for ${booking.subfacilityName} on ${booking.date} at ${booking.time} was rejected. Reason: ${booking.adminNotes || "No reason provided"}`,
      bookingId: booking.id,
      status: decision,
      createdAt: new Date().toISOString(),
      read: false
    };

    const userRef = doc(db, 'users', booking.userId);
    await updateDoc(userRef, {
      notifications: arrayUnion(notification)
    });

    } catch (err) {
      setError(err.message);
    }
  };
  useEffect(() => {
    if (bookings.length > 0) {
      // Filter bookings for selected date
      const filtered = bookings.filter(booking => {
        const bookingDate = new Date(booking.date);
        return (
          bookingDate.getDate() === selectedDate.getDate() &&
          bookingDate.getMonth() === selectedDate.getMonth() &&
          bookingDate.getFullYear() === selectedDate.getFullYear()
        );
      });
      setSelectedBookings(filtered);
    }
  }, [selectedDate, bookings]);
  
  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    
    const dateBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      return (
        bookingDate.getDate() === date.getDate() &&
        bookingDate.getMonth() === date.getMonth() &&
        bookingDate.getFullYear() === date.getFullYear()
      );
    });
    
    const pendingCount = dateBookings.filter(b => b.status === 'pending').length;
    
    return pendingCount > 0 ? (
      <div className="pending-badge">{pendingCount}</div>
    ) : null;
  };


  if (loading) return <section className="admin-loading">Loading data...</section>;
  if (error) return <section className="admin-error">Error: {error}</section>;

  return (
    <section className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      
      <section className="admin-tabs">
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
        <button 
          className={activeTab === 'bookings' ? 'active' : ''}
          onClick={() => setActiveTab('bookings')}
        >
          Bookings Portal
        </button>
      </section>

      {activeTab === 'applications' ? (
        <>
          <h2>Pending Applications</h2>
          {applications.length === 0 ? (
            <p>No applications found</p>
          ) : (
            <section className="applications-list">
              {applications.map((application) => (
                <section key={application.id} className="application-card">
                  <h3>{application.name}</h3>
                  <p><strong>Position:</strong> {application.applicationType}</p>
                  <p><strong>Facility:</strong> {application.Facility}</p>
                  <p><strong>Status:</strong> <span className={`status-${application.status}`}>
                    {application.status}
                  </span></p>
                  
                  {application.status === 'pending' && (
                    <section className="action-buttons">
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
                    </section>
                  )}
                </section>
              ))}
            </section>
          )}
        </>
      ) : activeTab === 'users' ? (
        <>
          <h2>User Management</h2>
          {users.length === 0 ? (
            <p>No users with special roles found</p>
          ) : (
            <section className="users-list">
              {users.map((user) => (
                <section key={user.id} className="user-card">
                  <section className="user-info">
                    <h3>{user.displayName || 'Unnamed User'}</h3>
                    <p><strong>Role:</strong> <span className={`role-${user.role.toLowerCase().replace(' ', '-')}`}>
                      {user.role}
                    </span></p>
                  </section>
                  <section className="user-actions">
                    <button 
                      onClick={() => handleRevokeRole(user.id)}
                      className="revoke-btn"
                      disabled={user.role === 'Admin' && users.filter(u => u.role === 'Admin').length <= 1}
                    >
                      Revoke Role
                    </button>
                  </section>
                </section>
              ))}
            </section>
          )}
        </>
      ) : (
        <div className="bookings-portal">
          <div className="calendar-container">
            <h2>Booking Calendar</h2>
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              tileContent={tileContent}
              className="booking-calendar"
            />
          </div>
          
          <div className="bookings-list-container">
            <h3>Bookings for {selectedDate.toDateString()}</h3>
            {selectedBookings.length === 0 ? (
              <p>No bookings for this date</p>
            ) : (
              <div className="bookings-list">
                {selectedBookings.map((booking) => (
                  <div key={booking.id} className={`booking-card ${booking.status}`}>
                    <div className="booking-info">
                      <h4>{booking.facilityName} - {booking.subfacilityName}</h4>
                      <p><strong>Time:</strong> {booking.time}</p>
                      <p><strong>Attendees:</strong> {booking.attendees}</p>
                      <p><strong>User:</strong> {booking.userId}</p>
                      <p><strong>Status:</strong> 
                        <span className={`status-${booking.status}`}>
                          {booking.status}
                        </span>
                      </p>
                    </div>
                    
                    {booking.status === 'pending' && (
                      <div className="booking-actions">
                        <button 
                          onClick={() => handleBookingDecision(booking, 'approved')}
                          className="approve-btn"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => {
                            const reason = prompt('Enter rejection reason:');
                            if (reason) {
                              handleBookingDecision({
                                ...booking,
                                adminNotes: reason
                              }, 'rejected');
                            }
                          }}
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
          </div>
        </div>
      )}
    </section>
  );
};
export default AdminDashboard;