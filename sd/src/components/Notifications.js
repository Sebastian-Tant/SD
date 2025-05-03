import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userRef = doc(db, "users", user.uid);
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
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        notifications: notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
      });

      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error("Error updating notification:", error);
    }
  };

  if (loading) return <div>Loading notifications...</div>;

  return (
    <div className="notifications-container">
      {notifications
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((notification) => (
          <div
            key={notification.id}
            className={`notification ${notification.read ? "read" : "unread"} ${
              notification.type === "event"
                ? "event-notification"
                : "booking-notification"
            }`}
            onClick={() => markAsRead(notification.id)}
          >
            <div className="notification-message">
              {notification.message}
              {notification.type === "event" && (
                <span className="notification-badge">Event</span>
              )}
            </div>
            <div className="notification-time">
  {(() => {
    try {
      if (!notification.createdAt) return "Date not available";
      if (notification.createdAt?.toDate) {
        return new Date(notification.createdAt.toDate()).toLocaleString();
      }
      // Handle case where createdAt might already be a Date object
      if (typeof notification.createdAt === 'object') {
        return new Date(notification.createdAt).toLocaleString();
      }
      // Handle case where createdAt is a string or timestamp
      return new Date(notification.createdAt).toLocaleString();
    } catch (e) {
      return "Date not available";
    }
  })()}
</div>
            {!notification.read && <div className="unread-dot"></div>}
          </div>
        ))}
    </div>
  );
};

export default Notifications;