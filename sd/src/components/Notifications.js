// Notifications.js
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setNotifications(userData.notifications || []);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching notifications:", error);
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const markAsRead = async (notificationId) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        notifications: notifications.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      });
      
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error("Error updating notification:", error);
    }
  };

  if (loading) return <div>Loading notifications...</div>;

  return (
    <div className="notifications-container">
      <h2>Notifications</h2>
      {notifications.length === 0 ? (
        <p>No notifications</p>
      ) : (
        <div className="notifications-list">
          {notifications
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(notification => (
              <div 
                key={notification.id} 
                className={`notification ${notification.read ? 'read' : 'unread'}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="notification-message">{notification.message}</div>
                <div className="notification-time">
                  {new Date(notification.createdAt).toLocaleString()}
                </div>
                {!notification.read && <div className="unread-dot"></div>}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;