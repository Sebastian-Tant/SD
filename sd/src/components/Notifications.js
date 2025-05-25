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

  if (loading) return <section>Loading notifications...</section>;

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
    <section className="notifications-container">
      {notifications.map((notification) => (
        <section
          key={notification.id}
          className={`notification ${notification.read ? "read" : "unread"} ${
            notification.type === "event"
              ? "event-notification"
              : "booking-notification"
          }`}
          onClick={() => markAsRead(notification.id)}
        >
          <section className="notification-message">
            {notification.message}
            {notification.type === "event" && (
              <span className="notification-badge">Event</span>
            )}
          </section>
          <section className="notification-time">
            {formatDate(notification.createdAt)}
          </section>
          {!notification.read && <section className="unread-dot"></section>}
        </section>
      ))}
    </section>
  );
};

export default Notifications;