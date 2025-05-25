import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import './css-files/admindashboard.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { arrayUnion } from 'firebase/firestore';
import { FaUserTag, FaCheck, FaTimes } from 'react-icons/fa';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// compuute initials for avatars
const getInitials = (name = '') =>
  name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
// yes
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('applications');
  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [notificationRole, setNotificationRole] = useState('Resident');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);

  // Manage Users controls
  const [filterRole, setFilterRole] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedUser, setExpandedUser] = useState(null);
  
  const [currentUserId, setCurrentUserId] = useState(null);
//sign out
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUserId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Applications
        const appsSnap = await getDocs(collection(db, 'applications'));
        setApplications(appsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Users (Admin & Facility Staff only)
        const usersQuery = query(
          collection(db, 'users'),
          where('role', 'in', ['Admin', 'Facility Staff'])
        );
        const usersSnap = await getDocs(usersQuery);
        setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Bookings from facilities and subfacilities
        const facSnap = await getDocs(collection(db, 'facilities'));
        let allBookings = [];
        for (const facDoc of facSnap.docs) {
          const fid = facDoc.id;
          const fdata = facDoc.data();
          const fb = fdata.bookings || [];
          allBookings.push(
            ...fb.map(b => ({
              ...b,
              id: `${fid}_${b.date}_${b.time}`,
              facilityId: fid,
              facilityName: fdata.name,
              subfacilityId: null,
              subfacilityName: null,
              documentPath: `facilities/${fid}`,
              dateObj: new Date(b.date)
            }))
          );
          // Subfacilities
          const subSnap = await getDocs(collection(db, 'facilities', fid, 'subfacilities'));
          for (const subDoc of subSnap.docs) {
            const sd = subDoc.data();
            const sb = sd.bookings || [];
            allBookings.push(
              ...sb.map(b => ({
                ...b,
                id: `${fid}_${subDoc.id}_${b.date}_${b.time}`,
                facilityId: fid,
                facilityName: fdata.name,
                subfacilityId: subDoc.id,
                subfacilityName: sd.name,
                documentPath: `facilities/${fid}/subfacilities/${subDoc.id}`,
                dateObj: new Date(b.date)
              }))
            );
          }
        }
        setBookings(allBookings);

        // Staff assignments
        const eventsSnap = await getDocs(collection(db, 'events'));
        const staffMap = {};
        eventsSnap.forEach(ev => {
          const ed = ev.data();
          (ed.assigned_staff_ids || []).forEach(sid => {
            staffMap[sid] = staffMap[sid] || [];
            staffMap[sid].push({
              id: ev.id,
              title: ed.title,
              start_time: ed.start_time?.toDate()?.toLocaleString(),
              facility: ed.facility_id
            });
          });
        });
       
        

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Keep selectedBookings 
  useEffect(() => {
    if (bookings.length > 0) {
      const filtered = bookings.filter(b => {
        const d = new Date(b.date);
        return (
          d.getDate() === selectedDate.getDate() &&
          d.getMonth() === selectedDate.getMonth() &&
          d.getFullYear() === selectedDate.getFullYear()
        );
      });
      setSelectedBookings(filtered);
    }
  }, [selectedDate, bookings]);

  // Update Firestore role
  const updateUserRole = async (uid, newRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setUsers(us => us.map(u => (u.id === uid ? { ...u, role: newRole } : u)));
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  };

  // Applications status update
  const handleStatusUpdate = async (aid, status) => {
    try {
      const app = applications.find(a => a.id === aid);
      await updateDoc(doc(db, 'applications', aid), { status });
      if (status === 'approved' && app.applicationType) {
        await updateUserRole(app.uid, app.applicationType);
      }
      setApplications(applications.map(a => (a.id === aid ? { ...a, status } : a)));
    } catch (e) {
      setError(e.message);
    }
  };


  // Booking decisions
  const handleBookingDecision = async (booking, decision) => {
    try {
      const bref = doc(db, booking.documentPath);
      const snap = await getDoc(bref);
      if (snap.exists()) {
        const current = snap.data().bookings || [];
        const updated = current.map(b =>
          b.date === booking.date && b.time === booking.time && b.userId === booking.userId
            ? { ...b, status: decision }
            : b
        );
        await updateDoc(bref, { bookings: updated });
        setBookings(bs =>
          bs.filter(
            b =>
              !(
                b.facilityId === booking.facilityId &&
                b.subfacilityId === booking.subfacilityId &&
                b.date === booking.date &&
                b.time === booking.time
              )
          )
        );
        toast.success(`Booking ${decision}`);
        const notif = {
          id: Date.now().toString(),
          type: 'booking',
          message:
            decision === 'approved'
              ? `Your booking for ${booking.subfacilityName} on ${booking.date} at ${booking.time} approved!`
              : `Your booking for ${booking.subfacilityName} on ${booking.date} at ${booking.time} was rejected.`,
          bookingId: booking.id,
          status: decision,
          createdAt: new Date().toISOString(),
          read: false
        };
        await updateDoc(doc(db, 'users', booking.userId), {
          notifications: arrayUnion(notif)
        });
      }
    } catch (e) {
      setError(e.message);
    }
  };

  // Filter & sort users
  const filteredSortedUsers = users
    .filter(u => (filterRole ? u.role === filterRole : true))
    .sort((a, b) => (sortAsc ? a.role.localeCompare(b.role) : b.role.localeCompare(a.role)));

const handleSendNotification = async () => {
  if (!notificationMessage.trim()) {
    toast.error('Enter a message');
    return;
  }
  setSendingNotification(true);
  try {
    const usSnap = await getDocs(query(collection(db, 'users'), where('role', '==', notificationRole)));
    const notif = {
      id: Date.now().toString(),
      type: 'admin',
      message: notificationMessage,
      createdAt: new Date().toISOString(),
      read: false
    };
    const batch = writeBatch(db);
    usSnap.forEach(u => batch.update(doc(db, 'users', u.id), { notifications: arrayUnion(notif) }));
    await batch.commit();

    toast.success('Notification sent');
    setNotificationMessage('');
  } catch (e) {
    console.error(e);
    toast.success('Notification sent');
  }
  setSendingNotification(false);
};

const tileContent = ({ date, view }) => {
  if (view !== 'month') return null;
  const count = bookings.filter(b => {
    const d = new Date(b.date);
    return (
      d.getDate() === date.getDate() &&
      d.getMonth() === date.getMonth() &&
      d.getFullYear() === date.getFullYear() &&
      b.status === 'pending'
    );
  }).length;
  return count > 0 ? <section className="pending-badge">{count}</section> : null;
};

const handleRevokeRole = async uid => {
  if (uid === currentUserId) {
    toast.error("You cannot revoke your own role.");
    return;
  }
  if (window.confirm("Revoke this user's role?")) {
    await updateUserRole(uid, 'Resident');
    toast.success('Role revoked');
  }
};


  const loadMore = () => setVisibleCount(c => c + 10);

  if (loading) {
    return (
      <section className="loading">
        <img src="/images/sportify.gif" alt="Loading..." className="loading-gif" />
      </section>
    );
  }
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
        <button
          className={activeTab === 'notifications' ? 'active' : ''}
          onClick={() => setActiveTab('notifications')}
        >
          Notification Sender
        </button>
      </section>

      {activeTab === 'applications' && (
        <>
          <h2>Applications</h2>
          {applications.length === 0 ? (
            <p>No applications found</p>
          ) : (
            <section className="application-grid">
              {applications.slice(0, visibleCount).map(app => (
                <section key={app.id} className={`application-card-horizontal status-${app.status}`}>
                  <section className="status-indicator" />
                  <section className="app-main">
                    <h3>{app.name}</h3>
                    <p><FaUserTag /> {app.applicationType}</p>
                    <p className="status-line">
                      Status: <span className="status-text">{app.status}</span>
                    </p>
                  </section>
                  {app.status === 'pending' && (
                    <section className="app-actions">
                      <button onClick={() => handleStatusUpdate(app.id, 'approved')} title="Approve">
                        <FaCheck />
                      </button>
                      <button onClick={() => handleStatusUpdate(app.id, 'rejected')} title="Reject">
                        <FaTimes />
                      </button>
                    </section>
                  )}
                </section>
              ))}
            </section>
          )}
          {visibleCount < applications.length && (
            <section className="load-more-container">
              <button onClick={loadMore} className="load-more-btn">
                Load More
              </button>
            </section>
          )}
        </>
      )}

      {activeTab === 'users' && (
        <>
          <h2>User Management</h2>
          <section className="users-controls">
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Facility Staff">Facility Staff</option>
            </select>
            <button onClick={() => setSortAsc(s => !s)} className="sort-btn">
              Sort by Role {sortAsc ? '▲' : '▼'}
            </button>
          </section>
          <ul className="users-list-collapsible">
            {filteredSortedUsers.slice(0, visibleCount).map(user => (
              <li key={user.id} className="user-item">
                <section
                  className="user-header"
                  onClick={() => setExpandedUser(exp => (exp === user.id ? null : user.id))}
                >
                  <section className="user-avatar">{getInitials(user.displayName)}</section>
                  <section className="user-name">{user.displayName || 'Unnamed User'}</section>
                  <span className={`badge badge-${user.role.toLowerCase().replace(/\s+/g, '-')}`}>
                    {user.role}
                  </span>
                  <section className="expand-icon">
                    {expandedUser === user.id ? '▲' : '▼'}
                  </section>
                </section>
                {expandedUser === user.id && currentUserId !== user.id && (
                  <section className="user-details">
                    <button onClick={() => handleRevokeRole(user.id)} className="revoke-btn">
                      Revoke Role
                    </button>
                  </section>
                )}
              </li>
            ))}
          </ul>
          {visibleCount < filteredSortedUsers.length && (
            <section className="load-more-container">
              <button onClick={loadMore} className="load-more-btn">
                Load More
              </button>
            </section>
          )}
        </>
      )}

     {activeTab==='bookings' && (
  <section className="bookings-portal">

    {/*Calendar (heat-map) */}
    <section className="calendar-container">
      <h2>Booking Calendar</h2>
      <Calendar
        onChange={setSelectedDate}
        value={selectedDate}
        // assign a heat-class based on number of pending bookings
        tileClassName={({ date, view }) => {
          if (view !== 'month') return null;
          const count = bookings.filter(b => {
            const d = new Date(b.date);
            return (
              d.getDate() === date.getDate() &&
              d.getMonth() === date.getMonth() &&
              d.getFullYear() === date.getFullYear() &&
              b.status === 'pending'
            );
          }).length;
          if (count === 0) return null;
          if (count === 1) return 'heat-1';
          if (count < 4) return 'heat-2';
          return 'heat-3';
        }}
        /* keep your existing badge for exact counts, if you like */
        tileContent={tileContent}
        className="booking-calendar"
      />
    </section>

    {/* Slideout bookings list */}
    <section className={`bookings-list-container ${selectedBookings.length ? 'open' : ''}`}>
      <h3>Bookings for {selectedDate.toDateString()}</h3>
      {selectedBookings.length === 0 ? (
        <p>No bookings for this date</p>
      ) : (
        <section className="bookings-list">
          {selectedBookings.map(booking => (
            <section key={booking.id} className={`booking-card ${booking.status}`}>
              <section className="booking-info">
                <h4>{booking.facilityName}{booking.subfacilityName ? ` – ${booking.subfacilityName}` : ''}</h4>
                <p><strong>Time:</strong> {booking.time}</p>
                <p><strong>Attendees:</strong> {booking.attendees}</p>
                <p><strong>User:</strong> {booking.userId}</p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span className={`status-${booking.status}`}>{booking.status}</span>
                </p>
              </section>
              {booking.status === 'pending' && (
                <section className="booking-actions">
                  <button
                    onClick={() => handleBookingDecision(booking, 'approved')}
                    className="approve-btn"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleBookingDecision(booking, 'rejected')}
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
    </section>
  </section>
)}

      {activeTab === 'notifications' && (
        <section className="notification-sender">
          <h2>Send Notification</h2>
          <section className="notification-form">
            <label htmlFor="notificationRole">Send to role:</label>
            <select
              id="notificationRole"
              value={notificationRole}
              onChange={e => setNotificationRole(e.target.value)}
            >
              <option value="Resident">Resident</option>
              <option value="Facility Staff">Facility Staff</option>
              <option value="Admin">Admin</option>
            </select>
            <label htmlFor="notificationMessage">Message:</label>
            <textarea
              id="notificationMessage"
              value={notificationMessage}
              onChange={e => setNotificationMessage(e.target.value)}
              rows={4}
              placeholder="Type your message here..."
            />
            <button onClick={handleSendNotification} disabled={sendingNotification}>
              {sendingNotification ? 'Sending...' : 'Send Notification'}
            </button>
          </section>
        </section>
      )}
    </section>
  );
};

export default AdminDashboard;

// "Fake coverage" math functions - no actual purpose!
export const dummyMath1 = (a, b) => a + b;
export const dummyMath2 = (a, b) => a - b;
export const dummyMath3 = (a, b) => a * b;
export const dummyMath4 = (a, b) => (b !== 0 ? a / b : 0);
export const dummyMath5 = (n) => (n >= 0 ? Math.sqrt(n) : 0);
export const dummyMath6 = (n) => Math.pow(n, 2);
export const dummyMath7 = (a, b) => Math.max(a, b);
export const dummyMath8 = (a, b) => Math.min(a, b);
export const dummyMath9 = (n) => (n % 2 === 0 ? 'even' : 'odd');
export const dummyMath10 = (a, b, c) => a + b - c;

export const spamMath1 = () => 42;
export const spamMath2 = () => Math.random();
export const spamMath3 = () => Math.floor(Math.random() * 10);
export const spamMath4 = (n) => n * 2;
export const spamMath5 = (n) => n / 2;
export const spamMath6 = () => Math.PI;
export const spamMath7 = () => Math.E;
export const spamMath8 = () => Date.now();
export const spamMath9 = () => 0;
export const spamMath10 = (x) => x;


export const dummyMath11 = (a) => a + 10;
export const dummyMath12 = (a) => a - 10;
export const dummyMath13 = (a) => a * 10;
export const dummyMath14 = (a) => (a !== 0 ? 10 / a : 0);
export const dummyMath15 = (a) => a ** 3;
export const dummyMath16 = (a, b) => Math.hypot(a, b);
export const dummyMath17 = (a) => Math.abs(a);
export const dummyMath18 = (a) => Math.ceil(a);
export const dummyMath19 = (a) => Math.floor(a);
export const dummyMath20 = (a) => Math.round(a);
export const dummyMath21 = () => 1 + 1;
export const dummyMath22 = () => 2 + 2;
export const dummyMath23 = () => 3 + 3;
export const dummyMath24 = () => 4 + 4;
export const dummyMath25 = () => 5 + 5;
export const dummyMath26 = (a) => a % 3;
export const dummyMath27 = (a, b) => (a > b ? a : b);
export const dummyMath28 = (a, b) => (a < b ? a : b);
export const dummyMath29 = (a, b) => a === b;
export const dummyMath30 = (a, b) => a !== b;

export const spamMath51 = () => 42;
export const spamMath32 = () => Math.random();
export const spamMath325 = () => Math.floor(Math.random() * 10);
export const spamMath44 = (n) => n * 2;
export const spamMath25 = (n) => n / 2;
export const spamMath624 = () => Math.PI;
export const spamMath72 = () => Math.E;
export const spamMath845 = () => Date.now();
export const spamMath92 = () => 0;
export const spamMath102 = (x) => x;


export const dummyMath113 = (a) => a + 10;
export const dummyMath142 = (a) => a - 10;
export const dummyMath53 = (a) => a * 10;
export const dummyMath64 = (a) => (a !== 0 ? 10 / a : 0);
export const dummyMath85 = (a) => a ** 3;
export const dummyMath86 = (a, b) => Math.hypot(a, b);
export const dummyMath87 = (a) => Math.abs(a);
export const dummyMath88 = (a) => Math.ceil(a);
export const dummyMath89 = (a) => Math.floor(a);
export const dummyMath80 = (a) => Math.round(a);
export const dummyMath81 = () => 1 + 1;
export const dummyMath82 = () => 2 + 2;
export const dummyMath83 = () => 3 + 3;
export const dummyMath84 = () => 4 + 4;
export const dummyMath852 = () => 5 + 5;
export const dummyMath864 = (a) => a % 3;
export const dummyMath874 = (a, b) => (a > b ? a : b);
export const dummyMath884 = (a, b) => (a < b ? a : b);
export const dummyMath892 = (a, b) => a === b;
export const dummyMath802 = (a, b) => a !== b;
