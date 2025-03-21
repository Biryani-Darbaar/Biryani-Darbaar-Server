# Biriyani Darbar Server

## Overview
Biriyani Darbar Server is a RESTful API built with Node.js and Express for managing a food delivery service. It provides endpoints for handling various operations such as user authentication, order management, and notifications.

## Features
- User authentication and profile management
- Cart management for users
- Order processing and tracking
- Push notifications for users
- Management of dishes, categories, and locations
- Mini-games and rewards system
- Promo code management

## Technologies Used
- Node.js
- Express
- Firebase (Firestore, Authentication)
- Pushy for push notifications
- Stripe for payment processing

## Project Structure
```
biriyani-darbar-server
├── src
│   ├── config
│   ├── controllers
│   ├── middleware
│   ├── routes
│   ├── services
│   ├── utils
│   └── app.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

## Installation
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/biriyani-darbar-server.git
   ```
2. Navigate to the project directory:
   ```
   cd biriyani-darbar-server
   ```
3. Install the dependencies:
   ```
   npm install
   ```
4. Create a `.env` file in the root directory and add your environment variables.

## Usage
To start the server, run:
```
npm start
```
The server will run on `http://localhost:4200`.

## API Documentation
Refer to the API documentation for details on available endpoints and their usage.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any suggestions or improvements.

## License
This project is licensed under the MIT License.