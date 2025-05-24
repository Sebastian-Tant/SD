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
          // Sort notifications by createdAt when initially setting them
          const sortedNotifications = (userData.notifications || [])
            .sort((a, b) => {
              const dateA = a.createdAt?.toDate?.() || a.createdAt;
              const dateB = b.createdAt?.toDate?.() || b.createdAt;
              return new Date(dateB) - new Date(dateA);
            });
          setNotifications(sortedNotifications);
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

  // Format date function to reuse
  const formatDate = (date) => {
    try {
      if (!date) return "Date not available";
      const dateObj = date?.toDate?.() || date;
      return new Date(dateObj).toLocaleString();
    } catch (e) {
      return "Date not available";
    }
  };

  return (
    <div className="notifications-container">
      {notifications.map((notification) => (
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
            {formatDate(notification.createdAt)}
          </div>
          {!notification.read && <div className="unread-dot"></div>}
        </div>
      ))}
    </div>
  );
};

export default Notifications;