import React, { useEffect, useState } from 'react';

const Notifications = ({ isAuthenticated, user }) => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Open WebSocket connection
      const socket = new WebSocket(`ws://127.0.0.1:8000/ws/notifications/`);

      socket.onopen = () => {
        console.log("WebSocket connected");

        // Send the user id to join the specific user group
        socket.send(JSON.stringify({
          type: "join",
          userId: user.id,
        }));
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Received message:", data);

        // Add the received message to state
        setMessages(prevMessages => [...prevMessages, data.message]);
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      socket.onclose = () => {
        console.log("WebSocket connection closed");
      };

      // Cleanup on component unmount
      return () => {
        socket.close();
      };
    }
  }, [isAuthenticated, user]);

  return (
    <div>
      <h2>Notifications</h2>
      <div>
        {messages.length > 0 ? (
          messages.map((message, index) => (
            <div key={index}>
              <p>{message}</p>
            </div>
          ))
        ) : (
          <p>No new notifications</p>
        )}
      </div>
    </div>
  );
};

export default Notifications;

