# Real-Time Chat Application

Welcome to the Real-Time Chat Application! This application allows users to join chat rooms, create new rooms, engage in private conversations, and load more messages from the chat history. Below are the detailed instructions on how to set up, run, and use the application, along with insights into the implementation decisions.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running the Application](#running-the-application)
- [Using the Application](#using-the-application)
- [Implementation Decisions](#implementation-decisions)

## Prerequisites

Before you start, make sure you have the following installed:

- [Node.js](https://nodejs.org/en/download/) (version 14 or later)
- [Redis.js](https://redis.io/en/download/)
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Setup

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/Shk3lzen/REAL-TIME-CHAT-APPLICATION.git
   cd REAL-TIME-CHAT-APPLICATION

2. **Install Dependencies**

   ```bash
      npm install express socket.io redis ioredis

3. **Install nodemon for npm run dev**

   ```bash
      npm install nodemon --save-dev


Using the Application
Joining or Creating a Username
First Time Use: When you first open the application, you'll be prompted to enter a username. This username will be used to identify you in the chat rooms.
Switching Users: If you enter a different username, a new user will be created, and you can start fresh in the main room or any other room.

Chat Rooms
Joining Rooms: Initially, you will join the 'main' room. Click on any room name in the left panel to switch rooms.
Creating a Room: To create a new room:
Type the desired room name in the input field under "Rooms".
Click the "Add Room" button. If the room doesn't exist, it will be created, and you'll be able to join it immediately.

Private Chat
Viewing Users: On the right panel, you'll see a list of all users currently online.
Starting a Private Chat: To initiate a private conversation:
Click on any user's name from the list on the right. This action will start a private chat session with that user in a room named with both your usernames (sorted and joined with an underscore).

Chat Functionality
Sending Messages: In any room (public or private), type your message in the input field at the bottom of the chat area and click "Send" or press Enter.
Loading More Messages: If you want to see older messages, click the "Load Older" button. This will fetch and display additional messages from the chat history.

Implementation Decisions
Technology Stack
Node.js for server-side logic due to its efficiency with real-time applications.
Express.js for setting up the server quickly with minimal configuration.
Socket.IO for real-time, bidirectional communication, ensuring compatibility with various browsers.
Redis as a message broker for managing real-time data exchange and persistence.

Architecture and Design
Microservices with Docker: Using Docker ensures environment consistency, making deployment and scaling straightforward.
Modular Code Structure: Handlers for Redis (redisHandler.js) and Socket.IO (socketHandler.js) are separated for clarity and maintainability.
Event-Driven Communication: Socket.IO events (joinRoom, sendMessage, privateMessage, etc.) handle user interactions, room management, and message broadcasting.
User and Room Management: Users can join existing rooms, create new ones, and initiate private chats. Redis helps in managing user lists and room data.

User Experience
Dynamic Room List: Users can see and switch between rooms dynamically.
User List: Real-time update of online users, allowing for private chat initiation.
Message History: Ability to load older messages, enhancing the chat experience by providing context.