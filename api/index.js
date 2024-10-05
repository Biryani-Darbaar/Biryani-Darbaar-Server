const morgan = require("morgan");
const logger = require("../logger"); // Import the logger
const express = require("express");
const admin = require("firebase-admin");
const multer = require("multer");
const cors = require("cors");
const { getStorage } = require("firebase-admin/storage");
const session = require("express-session");
const storage = require("node-sessionstorage");
const firebase = require("firebase/app");
const bodyParser = require("body-parser");
require("firebase/auth");

// Initialize Firebase Admin SDK
const serviceAccount = require("../serviceAccountKey.json"); // Path to your Firebase service account key
// const {
//   log,
// } = require("@angular-devkit/build-angular/src/builders/ssr-dev-server");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "biryani-darbar-770a5.appspot.com", // Replace with your Storage bucket name
});

const db = admin.firestore();
const bucket = getStorage().bucket();

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Setup morgan for HTTP request logging
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
    cookie: { expires: 0 }, // Session expires when browser is closed
  })
); // Multer middleware for handling image uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store the file in memory temporarily
});

// Route to upload images and store metadata in Firestore
app.post("/dishes", upload.single("image"), async (req, res) => {
  const dishData = JSON.parse(req.body.dishData); // Parse the JSON data sent by the client
  const file = req.file; // The uploaded image

  try {
    let imageUrl = "";

    if (file) {
      // Create a unique file name and upload the file to Firebase Storage
      const fileName = Date.now() + "-" + file.originalname;
      const fileUpload = bucket.file(fileName);

      await fileUpload.save(file.buffer, {
        contentType: file.mimetype,
      });

      // Make the file publicly accessible
      await fileUpload.makePublic();

      // Get the public URL of the uploaded image
      imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }

    // Store dish data and image URL in Firestore
    const newDishRef = db.collection("dishes").doc(); // Generate a new document reference
    const newDishData = {
      ...dishData,
      image: imageUrl,
    };

    await newDishRef.set(newDishData);

    res.status(201).json({
      message: "Dish added successfully",
      dishId: newDishRef.id,
      imageUrl,
    });
  } catch (error) {
    logger.error("Error uploading image or saving data:", error);
    res.status(500).json({ error: "Failed to add dish" });
  }
});

// Route to fetch dishes from Firestore
app.get("/dishes", async (req, res) => {
  try {
    const snapshot = await db.collection("dishes").get();
    const dishes = [];
    snapshot.forEach((doc) => {
      dishes.push({ dishId: doc.id, ...doc.data() });
    });
    res.json(dishes);
  } catch (error) {
    logger.error("Error fetching dishes:", error);
    res.status(500).json({ error: "Failed to fetch dishes" });
  }
});

// Route to delete a dish by ID
app.delete("/dishes/:id", async (req, res) => {
  const dishId = req.params.id;

  try {
    const dishRef = db.collection("dishes").doc(dishId);
    const dishDoc = await dishRef.get();

    if (!dishDoc.exists) {
      return res.status(404).json({ error: "Dish not found" });
    }

    const dishData = dishDoc.data();
    const imageUrl = dishData.image;

    await dishRef.delete();

    if (imageUrl) {
      const fileName = imageUrl.split("/").pop();
      const file = bucket.file(fileName);
      await file.delete();
    }

    res.status(200).json({ message: "Dish deleted successfully" });
  } catch (error) {
    logger.error("Error deleting dish:", error);
    res.status(500).json({ error: "Failed to delete dish" });
  }
});

// Route to update a dish by ID
app.put("/dishes/:id", upload.single("image"), async (req, res) => {
  const dishId = req.params.id;
  const dishData = JSON.parse(req.body.dishData); // Parse the JSON data sent by the client
  const file = req.file;

  try {
    const dishRef = db.collection("dishes").doc(dishId);
    const dishDoc = await dishRef.get();

    if (!dishDoc.exists) {
      return res.status(404).json({ error: "Dish not found" });
    }

    let imageUrl = dishData.image;

    if (file) {
      const oldDishData = dishDoc.data();
      const oldImageUrl = oldDishData.image;
      if (oldImageUrl) {
        const oldFileName = oldImageUrl.split("/").pop();
        const oldFile = bucket.file(oldFileName);
        await oldFile.delete();
      }

      const fileName = Date.now() + "-" + file.originalname;
      const fileUpload = bucket.file(fileName);

      await fileUpload.save(file.buffer, {
        contentType: file.mimetype,
      });

      await fileUpload.makePublic();
      imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }

    const updatedDishData = {
      ...dishData,
      image: imageUrl,
    };

    await dishRef.update(updatedDishData);

    res.status(200).json({
      message: "Dish updated successfully",
      imageUrl,
    });
  } catch (error) {
    logger.error("Error updating dish:", error);
    res.status(500).json({ error: "Failed to update dish" });
  }
});

// Route to handle order submissions
app.post("/orders", async (req, res) => {
  const orderData = req.body; // Order data sent from the frontend
  const userId = storage.getItem("userId");
  const orderStoreData = {
    ...orderData,
    userId: userId,
  };
  // Get the session ID
  try {
    // Get the user ID from the session ID
    const userRef = db.collection("users").doc(userId);
    const userSnapshot = await userRef.get();
    console.log("PAni chey mundaa");
    if (userSnapshot.empty) {
      return res.status(404).json({ error: "User not found" });
    }
    // Store the order data in the user's orders collection
    const newOrderRef = db
      .collection("users")
      .doc(userId)
      .collection("orders")
      .doc();
    await newOrderRef.set(orderData);
    const orderRef = db.collection("order").doc(newOrderRef.id);
    await orderRef.set(orderStoreData);
    res.status(201).json({
      message: "Order placed successfully",
      orderId: newOrderRef.id,
      orderData: orderStoreData,
    });
  } catch (error) {
    logger.error("Error placing order:", error);
    res.status(500).json({ error: error });
  }
});

app.get("/orders", async (req, res) => {
  try {
    const snapshot = await db.collection("order").get();
    const orders = [];
    snapshot.forEach((doc) => {
      orders.push({ orderId: doc.id, ...doc.data() });
    });
    res.json(orders);
  } catch (error) {
    logger.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});
// Route to fetch all orders
app.get("/ordersByUser", async (req, res) => {
  const userId = storage.getItem("userId");
  try {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("orders")
      .get();
    const orders = [];
    snapshot.forEach((doc) => {
      orders.push({ orderId: doc.id, ...doc.data() });
    });
    res.json(orders);
  } catch (error) {
    logger.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Route to fetch a specific order by ID
app.get("/orders/:id", async (req, res) => {
  const orderId = req.params.id;
  const userId = storage.getItem("userId");
  try {
    const orderRef = db
      .collection("users")
      .doc(userId)
      .collection("orders")
      .doc(orderId);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json({ orderId: orderDoc.id, ...orderDoc.data() });
  } catch (error) {
    logger.error("Error fetching order:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

app.patch("/orders/:id", async (req, res) => {
  const { id } = req.params;
  const userId = storage.getItem("userId");
  const { orderStatus } = req.body;
  try {
    const userOrderRef = db
      .collection("users")
      .doc(userId)
      .collection("orders")
      .doc(id);
    await userOrderRef.update({ orderStatus });
    console.log("Pani cheyyavee");
    const orderRef = db.collection("order").doc(id);
    await orderRef.update({ orderStatus });
    res.status(200).send("Order status updated");
  } catch (error) {
    logger.error("Error updating order status:", error);
    res.status(500).send("Error updating order status");
  }
});

app.post("/signup", async (req, res) => {
  const { userName, email, password, phoneNumber } = req.body;
  console.log(req.body);
  try {
    const userRecord = await admin.auth().createUser({ email, password });
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      userName,
      email,
      phoneNumber,
    });
    res.status(201).send(userRecord);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(400).send(error);
  }
});

// // Login Route
// app.post("/login", async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     // Use Firebase Client SDK to sign in the user
//     const userCredential = await firebase
//       .auth()
//       .signInWithEmailAndPassword(email, password);

//     // Get the ID token from the user credential
//     const idToken = await userCredential.user.getIdToken();

//     // Verify the ID token using Firebase Admin SDK (server-side)
//     const decodedToken = await admin.auth().verifyIdToken(idToken);

//     // Set session data
//     req.session.userId = decodedToken.uid;
//     req.session.loginTimestamp = Date.now();

//     // Respond with login success and session ID
//     res
//       .status(200)
//       .send({
//         message: "Login successful",
//         sessionId: req.session.loginTimestamp,
//       });
//   } catch (error) {
//     res.status(400).send({ error: error.message });
//   }
// });
// To test the login endpoint we used idTest.js file to authenticate the credentials based on that generated token we can use that token to login
app.post("/login", async (req, res) => {
  const { idToken } = req.body; // Instead of email and password, we're using idToken
  try {
    // Verify the ID token using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    // Set session data
    req.session.userId = decodedToken.uid;
    req.session.loginTimestamp = Date.now();
    req.session.id = Date.now();
    storage.setItem("userId", req.session.userId);

    res.status(200).send({
      message: "Login successful",
      sessionId: req.session.loginTimestamp,
      sessionUserId: storage.getItem("userId"),
    });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.status(200).send({ message: "Logout successful" });
  });
});
// Route to get the total count of orders across all users
app.get("/orders/total-count", async (req, res) => {
  try {
    // Fetch all users
    const usersSnapshot = await db.collection("users").get();

    let totalOrderCount = 0;
    console.log("---------------------------", totalOrderCount);

    // Iterate through each user and fetch their orders collection
    for (const userDoc of usersSnapshot.docs) {
      const ordersSnapshot = await db
        .collection("users")
        .doc(userDoc.id)
        .collection("orders")
        .get();
      console.log(ordersSnapshot);
      totalOrderCount += ordersSnapshot.size; // Add the count of orders for the current user
    }

    res.status(200).json({ totalOrders: totalOrderCount });
  } catch (error) {
    logger.error("Error counting total orders:", error);
    res.status(500).json({ error: "Failed to count total orders" });
  }
});

module.exports = app;