const morgan = require("morgan");
const logger = require("./logger"); // Import the logger
const cacheController = require("express-cache-controller");

const express = require("express");
const admin = require("firebase-admin");
const multer = require("multer");
const cors = require("cors");
const { getStorage } = require("firebase-admin/storage");
const session = require("express-session");
const storage = require("node-sessionstorage");
const firebase = require("firebase/app");
const bodyParser = require("body-parser");
const Pushy = require("pushy");
const Stripe = require("stripe");
const stripe = Stripe(
  "pk_live_51QI9zGP1mrjxuTnQnqhMuVG5AdSpjp4b50Vy8N51uOhErUBttIEVaq2c6yIl1lS8vpqsYWtVpefkY2SPkB9lwx1C004cMMf16E"
);
require("firebase/auth");
//const nocache = require('nocache')
const pushyAPI = new Pushy("72289ac20803a6e4e493d15a6839413d11f9b8eaa9dc5508a918fd168e7f9cb0");
// Initialize Firebase Admin SDK
const serviceAccount = require("./serviceAccountKey.json"); // Path to your Firebase service account key
// const {
//   log,
// } = require("@angular-devkit/build-angular/src/builders/ssr-dev-server");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "biryani-darbar-770a5.appspot.com", // Replace with your Storage bucket name
});

const db = admin.firestore();
const bucket = getStorage().bucket();
const onHeaders = require("on-headers");
const app = express();
app.use(bodyParser.json());
app.use(cors());
//app.use(nocache());
app.set("etag", false);
app.set({ viewEngine: "ejs", cache: false });
// Setup morgan for HTTP request logging
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
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
app.use(cacheController({ debug: true }));
//app.use((req, res, next) => {
// listen for the headers event
//  onHeaders(res, () => {
//    this.removeHeader('ETag');
// });
//});
// Route to upload images and store metadata in Firestore
app.post("/dishes", upload.single("image"), async (req, res) => {
  const dishData = JSON.parse(req.body.dishData); // Parse the JSON data sent by the client
  const file = req.file; // The uploaded image
  const category = dishData.category; // Extract category from dishData

  try {
    let imageUrl = "";

    // Check if the category document exists, and if not, create it with a 'name' field
    const categoryDocRef = db.collection("category").doc(category);
    const categoryDoc = await categoryDocRef.get();

    if (!categoryDoc.exists) {
      // If the category doesn't exist, add a 'name' field to it
      await categoryDocRef.set({ name: category });
      console.log(`Created new category document with name: ${category}`);
    }

    // If an image is provided, upload it to Firebase Storage
    if (file) {
      const fileName = `${category}/${Date.now()}-${file.originalname}`;
      const fileUpload = bucket.file(fileName);

      await fileUpload.save(file.buffer, {
        contentType: file.mimetype,
      });

      // Make the file publicly accessible
      await fileUpload.makePublic();

      // Get the public URL of the uploaded image
      imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }
    const goldPriceRef = db.collection("goldprice").doc("current");
    const goldPriceDoc = await goldPriceRef.get();
    const goldPriceData = goldPriceDoc.data();
    const goldPrice = dishData.price * (goldPriceData.goldPrice / 100);
    // Calculate the gold price with a 50% discount

    // Remove the category field from dishData as it's already being used
    const { category: dishCategory, ...dishDataWithoutCategory } = dishData;

    // Store dish data and image URL in Firestore under the category's 'dishes' sub-collection
    const timestamp = Date.now().toString();
    const newDishRef = db
      .collection("category")
      .doc(category)
      .collection("dishes")
      .doc(timestamp); // Generate a new document reference
    const newDishData = {
      ...dishDataWithoutCategory,
      image: imageUrl,
      available: true,
      goldPrice,
    };

    await newDishRef.set(newDishData);

    // Respond with success
    res.status(201).json({
      message: "Dish added successfully",
      dishId: newDishRef.id,
      imageUrl,
    });
  } catch (error) {
    // Handle errors
    logger.error("Error uploading image or saving data:", error);
    res.status(500).json({ error: "Failed to add dish" });
  }
});
// Route to fetch dishes from Firestore

app.get("/dishes/category/:category", async (req, res) => {
  const category = req.params.category;
  const userId = storage.getItem("userId");

  try {
    console.log("Request received for category:", category, "User ID:", userId);

    let user = null;

    // Fetch user data if userId exists
    if (userId) {
      const userRef = db.collection("users").doc(userId);
      const userSnapshot = await userRef.get();
      if (!userSnapshot.exists) {
        // Return early if user is not found
        return res.status(404).json({ error: "User not found" });
      }
      user = userSnapshot.data();
    }

    // Fetch dishes within the category
    const dishesSnapshot = await db
      .collection("category")
      .doc(category)
      .collection("dishes")
      .get();

    const dishes = [];

    dishesSnapshot.forEach((doc) => {
      const dish = doc.data();
      if (dish.available) {
        if (userId && user?.goldMember) {
          const { goldPrice, ...rest } = dish;
          dishes.push({ dishId: doc.id, ...rest, price: goldPrice });
        } else {
          const { goldPrice, ...rest } = dish;
          dishes.push({ dishId: doc.id, ...rest });
        }
      }
    });

    // Send the response once
    return res.json(dishes);
  } catch (error) {
    console.error("Error fetching dishes:", error);
    return res.status(500).json({ error: "Failed to fetch dishes" });
  }
});

app.get("/categories", async (req, res) => {
  try {
    const categoriesSnapshot = await db.collection("category").get();
    const categories = [];

    categoriesSnapshot.forEach((doc) => {
      categories.push(doc.data().name);
    });

    res.json(categories);
  } catch (error) {
    logger.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// app.get("/dishes/all", async (req, res) => {
//   try {
//     const getAllDishesSnapshot = await db.collection("category").get();
//     if (getAllDishesSnapshot.empty) {
//       console.log(getAllDishesSnapshot)
//     }
// res.status(200).json({hello:getAllDishesSnapshot})
//   }
//   catch (error) {

//   }
// })
app.get("/dishes/:cat", async (req, res) => {
  const userId = storage.getItem("userId");
  try {
    const userRef = db.collection("users").doc(userId);
    const userSnapshot = await userRef.get();
    if (!userSnapshot.exists) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = userSnapshot.data();
    const categoriesSnapshot = await db.collection("category").get();
    const allDishes = [];
    console.log("Lanja mundu dengithe devara anthaav");

    if (categoriesSnapshot.empty) {
      console.log("No categories found in Firestore.");
      return res.status(404).json({ error: "No categories found." });
    }

    // Loop through each category to fetch dishes
    for (const categoryDoc of categoriesSnapshot.docs) {
      const categoryId = categoryDoc.id; // Get the category ID
      const categoryName = categoryDoc.data().categoryName; // Get the category name
      console.log(`Fetching dishes for category: ${categoryName}`);

      // Fetch all dishes from the current category's subcollection
      const dishesSnapshot = await db
        .collection("category")
        .doc(categoryId)
        .collection("dishes")
        .get();

      if (dishesSnapshot.empty) {
        console.log(`No dishes found in category: ${categoryName}`);
      } else {
        dishesSnapshot.forEach((dishDoc) => {
          const dish = dishDoc.data();
          if (user.goldMember) {
            const { goldPrice, ...rest } = dish;
            allDishes.push({
              dishId: dishDoc.id,
              category: categoryName,
              ...rest,
              price: goldPrice,
            });
          } else {
            const { goldPrice, ...rest } = dish;
            allDishes.push({
              dishId: dishDoc.id,
              category: categoryName,
              ...rest,
            });
          }
          console.log(`Found dish: ${dishDoc.id} in category: ${categoryName}`);
        });
      }
    }

    // Check if we found any dishes
    if (allDishes.length === 0) {
      console.log("No dishes found.");
      return res.status(404).json({ error: "No dishes found." });
    }

    res.json(allDishes); // Return the list of all dishes
  } catch (error) {
    console.error("Error fetching all dishes:", error);
    res.status(500).json({ error: "Failed to fetch dishes" });
  }
});

// Route to delete a dish by ID
app.put("/dishes/:category/:id", upload.single("image"), async (req, res) => {
  const { category, id: dishId } = req.params;
  const dishData = JSON.parse(req.body.dishData); // Parse the JSON data sent by the client
  const file = req.file;

  try {
    const dishRef = db
      .collection("category")
      .doc(category)
      .collection("dishes")
      .doc(dishId);
    const dishDoc = await dishRef.get();

    if (!dishDoc.exists) {
      return res.status(404).json({ error: "Dish not found" });
    }

    let imageUrl = dishData.image;

    if (file) {
      // If there is a new file, delete the old image from Firebase Storage
      const oldDishData = dishDoc.data();
      const oldImageUrl = oldDishData.image;

      if (oldImageUrl) {
        const oldFileName = oldImageUrl.split("/").pop();
        const oldFile = bucket.file(oldFileName);
        await oldFile.delete();
      }

      // Upload the new image
      const fileName = `${category}/${Date.now()}-${file.originalname}`;
      const fileUpload = bucket.file(fileName);

      await fileUpload.save(file.buffer, {
        contentType: file.mimetype,
      });

      await fileUpload.makePublic();
      imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }

    // Prepare the updated dish data
    const updatedDishData = {
      ...dishData,
      image: imageUrl,
    };

    // Update the dish document in Firestore
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

app.delete("/dishes/:category/:id", async (req, res) => {
  const { category, id: dishId } = req.params;

  try {
    const dishRef = db
      .collection("category")
      .doc(category)
      .collection("dishes")
      .doc(dishId);
    const dishDoc = await dishRef.get();

    if (!dishDoc.exists) {
      return res.status(404).json({ error: "Dish not found" });
    }

    const dishData = dishDoc.data();
    const imageUrl = dishData.image;

    // Delete the dish document
    await dishRef.delete();

    // If an image URL exists, delete the image from Firebase Storage
    if (imageUrl) {
      const fileName = imageUrl.split("/").pop();
      const file = bucket.file(`${category}/${fileName}`);
      await file.delete();
    }

    res.status(200).json({ message: "Dish deleted successfully" });
  } catch (error) {
    logger.error("Error deleting dish:", error);
    res.status(500).json({ error: "Failed to delete dish" });
  }
});
//to delete category

app.delete("/categories/:category", async (req, res) => {
  const { category } = req.params;

  try {
    // Reference to the category document
    const categoryRef = db.collection("category").doc(category);

    // Get all dishes associated with the category
    const dishesSnapshot = await categoryRef.collection("dishes").get();

    // Loop through the dishes and delete them
    const deletePromises = [];
    dishesSnapshot.forEach((dishDoc) => {
      const dishData = dishDoc.data();
      const imageUrl = dishData.image;

      // Delete the dish document
      deletePromises.push(dishDoc.ref.delete());

      // If an image URL exists, delete the image from Firebase Storage
      if (imageUrl) {
        const fileName = imageUrl.split("/").pop();
        const file = bucket.file(fileName);
        deletePromises.push(file.delete());
      }
    });

    // Wait for all deletes to complete
    await Promise.all(deletePromises);

    // Finally, delete the category document itself
    await categoryRef.delete();

    res
      .status(200)
      .json({ message: "Category and associated dishes deleted successfully" });
  } catch (error) {
    logger.error("Error deleting category:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// Route to handle order submissions
app.post("/orders", async (req, res) => {
  const orderData = req.body; // Order data sent from the frontend
  let userId = storage.getItem("userId");
  if (!userId) {
    userId = req.body.userId;
  }
  console.log(userId);
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
    console.log(newOrderRef.id);

    // Calculate rewards based on totalPrice
    const rewardRef = db.collection("rewards").doc("rewardDoc");
    const rewardDoc = await rewardRef.get();
    if (!rewardDoc.exists) {
      return res.status(404).json({ error: "Reward data not found" });
    }
    const rewardData = rewardDoc.data();
    let dollarValue = 0;
    if (rewardData.reward === 1) {
      dollarValue = 10 * rewardData.dollar;
    } else {
      const localDollar = rewardData.dollar / rewardData.reward;
      dollarValue = 10 * localDollar;
    }
    const totalPrice = orderData.totalPrice;
    const rewardsEarned = Math.floor(totalPrice / rewardData.dollar);
    const newRewardValue = (userSnapshot.data().reward || 0) + rewardsEarned;

    // Update user's reward value
    await userRef.update({ reward: newRewardValue });

    res.status(201).json({
      message: "Order placed successfully",
      orderId: newOrderRef.id,
      orderData: orderStoreData,
      rewardsEarned,
      newRewardValue,
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
app.get("/ordersByUser/:id", async (req, res) => {
  let userId = storage.getItem("userId");
  if (!userId) {
    userId = req.params.id;
  }
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
  let userId = storage.getItem("userId");
  if (!userId) {
    userId = req.body.userId;
  }
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
  let userId = storage.getItem("userId");
  if (!userId) {
    userId = req.body.userId;
  }
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
    console.log(storage.getItem("userId"));

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
  console.log("Mundaa lanja mundaaaaaaaaaaaa");

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

app.post("/img", upload.array("images", 50), async (req, res) => {
  const files = req.files;
  const { directory } = req.body; // Fetch the directory from the request body

  try {
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    if (!directory) {
      return res.status(400).json({ error: "No directory specified" });
    }

    const imageUrls = [];

    for (const file of files) {
      const fileName = `${directory}/${Date.now()}-${file.originalname}`;
      const fileUpload = bucket.file(fileName);

      await fileUpload.save(file.buffer, {
        contentType: file.mimetype,
      });

      await fileUpload.makePublic();

      const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      imageUrls.push(imageUrl);
    }

    res.status(201).json({
      message: "Images uploaded successfully",
      imageUrls,
    });
  } catch (error) {
    logger.error("Error uploading images:", error);
    res.status(500).json({ error: "Failed to upload images" });
  }
});

app.get("/img", async (req, res) => {
  try {
    const [files] = await bucket.getFiles({ prefix: "images/" });
    const images = files.map((file) => ({
      name: file.name,
      url: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
    }));
    res.json(images);
  } catch (error) {
    logger.error("Error fetching images:", error);
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

app.delete("/img", async (req, res) => {
  try {
    const [files] = await bucket.getFiles({ prefix: "" });

    if (files.length === 0) {
      return res.status(404).json({ error: "No images found" });
    }

    for (const file of files) {
      await file.delete();
    }

    res.status(200).json({ message: "All images deleted successfully" });
  } catch (error) {
    logger.error("Error deleting images:", error);
    res.status(500).json({ error: "Failed to delete images" });
  }
});

// Route to add an item to the cart
app.post("/cart", async (req, res) => {
  let userId = storage.getItem("userId");
  if (!userId) {
    userId = req.body.userId;
  }
  const cartItem = req.body;

  try {
    console.log(userId);
    const cartRef = db.collection("users").doc(userId).collection("cart").doc();
    const cartSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("cart")
      .get();

    let itemExists = false;

    cartSnapshot.forEach((doc) => {
      const cartItemData = doc.data();
      if (cartItemData.dishId === cartItem.dishId) {
        itemExists = true;
        const newQuantity = cartItemData.quantity + cartItem.quantity;
        doc.ref.update({ quantity: newQuantity });
      }
    });

    if (!itemExists) {
      await cartRef.set(cartItem);
    }

    res.status(201).json({
      message: "Item added to cart successfully",
      cartItemId: cartRef.id,
    });
  } catch (error) {
    logger.error("Error adding item to cart:", error);
    res.status(500).json({ error: "Failed to add item to cart" });
  }
});

// Route to get all items in the cart
app.post("/getCart", async (req, res) => {
  let userId = storage.getItem("userId");
  if (!userId) {
    userId = req.body.userId;
  }

  try {
    const cartSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("cart")
      .get();
    const cartItems = [];

    cartSnapshot.forEach((doc) => {
      cartItems.push({ cartItemId: doc.id, ...doc.data() });
    });

    res.json(cartItems);
  } catch (error) {
    logger.error("Error fetching cart items:", error);
    res.status(500).json({ error: "Failed to fetch cart items" });
  }
});

// Route to update an item in the cart
app.put("/cart/:id", async (req, res) => {
  let userId = storage.getItem("userId");
  if (!userId) {
    userId = req.body.userId;
  }
  const cartItemId = req.params.id;
  const updatedCartItem = req.body;

  try {
    const cartRef = db
      .collection("users")
      .doc(userId)
      .collection("cart")
      .doc(cartItemId);
    await cartRef.update(updatedCartItem);

    res.status(200).json({ message: "Cart item updated successfully" });
  } catch (error) {
    logger.error("Error updating cart item:", error);
    res.status(500).json({ error: "Failed to update cart item" });
  }
});

// Route to delete an item from the cart
app.delete("/cart/:id", async (req, res) => {
  let userId = storage.getItem("userId");
  const cartItemId = req.params.id;
  console.log(userId, cartItemId);

  try {
    const cartRef = db
      .collection("users")
      .doc(userId)
      .collection("cart")
      .doc(cartItemId);
    await cartRef.delete();

    res.status(200).json({ message: "Cart item deleted successfully" });
  } catch (error) {
    logger.error("Error deleting cart item:", error);
    res.status(500).json({ error: "Failed to delete cart item" });
  }
});

app.patch("/ordersAdmin/:id", async (req, res) => {
  const { id } = req.params;
  const { orderStatus, userId } = req.body;
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
    console.log("Modda Gudu");
    logger.error("Error updating order status:", error);
    res.status(500).send("Error updating order status");
  }
});
// app.get("/categories", async (req, res) => {
//   try {
//     const categoriesRef = db.collection("category");
//     const querySnapshot = await categoriesRef.get();

//     if (querySnapshot.empty) {
//       return res.status(404).json({ message: "No categories found" });
//     }

//     const categories = [];
//     querySnapshot.forEach((doc) => {
//       categories.push({ id: doc.id, ...doc.data() });
//     });

//     return res.status(200).json(categories);
//   } catch (error) {
//     console.error("Error retrieving categories:", error);
//     return res
//       .status(500)
//       .json({ message: "Error retrieving categories", error: error.message });
//   }
// });
//to create new category

app.post("/categories", async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Category name is required" });
  }

  try {
    // Check if the category already exists
    const categoryRef = db.collection("category").doc(name);
    const doc = await categoryRef.get();

    if (doc.exists) {
      return res.status(409).json({ error: "Category already exists" });
    }

    // Add new category to Firestore using the category name as the document ID
    await categoryRef.set({ name });

    res.status(201).json({
      message: "Category created successfully",
      categoryId: name, // Use the category name as the ID
      categoryName: name,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route to create a new location

app.post("/locations", upload.single("image"), async (req, res) => {
  const { name, address } = req.body;
  const file = req.file;

  if (!name || !address) {
    return res
      .status(400)
      .json({ error: "Location name and address are required" });
  }

  try {
    let imageUrl = "";

    if (file) {
      const fileName = `locations/${Date.now()}-${file.originalname}`;
      const fileUpload = bucket.file(fileName);

      await fileUpload.save(file.buffer, {
        contentType: file.mimetype,
      });

      await fileUpload.makePublic();
      imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }

    const locationRef = db.collection("location").doc();
    await locationRef.set({ name, address, image: imageUrl });

    res.status(201).json({
      message: "Location created successfully",
      locationId: locationRef.id,
      name,
      address,
      imageUrl,
    });
  } catch (error) {
    logger.error("Error creating location:", error);
    res.status(500).json({ error: "Failed to create location" });
  }
});

// Route to get all locations
app.get("/locations", async (req, res) => {
  try {
    const locationsSnapshot = await db.collection("location").get();
    const locations = [];

    locationsSnapshot.forEach((doc) => {
      locations.push({ locationId: doc.id, ...doc.data() });
    });

    res.json(locations);
  } catch (error) {
    logger.error("Error fetching locations:", error);
    res.status(500).json({ error: "Failed to fetch locations" });
  }
});
// Update a location by ID
app.put("/locations/:id", upload.single("image"), async (req, res) => {
  const locationId = req.params.id;
  const { name, address } = req.body;
  const file = req.file;

  if (!name || !address) {
    return res
      .status(400)
      .json({ error: "Location name and address are required" });
  }

  try {
    const locationRef = db.collection("location").doc(locationId);
    const locationDoc = await locationRef.get();

    if (!locationDoc.exists) {
      return res.status(404).json({ error: "Location not found" });
    }

    let imageUrl = locationDoc.data().image;

    if (file) {
      // Delete the old image from Firebase Storage if it exists
      if (imageUrl) {
        const oldFileName = imageUrl.split("/").pop();
        const oldFile = bucket.file(oldFileName);
        await oldFile.delete();
      }

      // Upload the new image
      const fileName = `locations/${Date.now()}-${file.originalname}`;
      const fileUpload = bucket.file(fileName);

      await fileUpload.save(file.buffer, {
        contentType: file.mimetype,
      });

      await fileUpload.makePublic();
      imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }

    await locationRef.update({ name, address, image: imageUrl });

    res.status(200).json({
      message: "Location updated successfully",
      locationId,
      name,
      address,
      imageUrl,
    });
  } catch (error) {
    logger.error("Error updating location:", error);
    res.status(500).json({ error: "Failed to update location" });
  }
});

// Delete a location by ID
app.delete("/locations/:id", async (req, res) => {
  const locationId = req.params.id;

  try {
    const locationRef = db.collection("location").doc(locationId);
    const locationDoc = await locationRef.get();

    if (!locationDoc.exists) {
      return res.status(404).json({ error: "Location not found" });
    }

    const locationData = locationDoc.data();
    const imageUrl = locationData.image;

    // Delete the location document
    await locationRef.delete();

    // If an image URL exists, delete the image from Firebase Storage
    if (imageUrl) {
      const fileName = imageUrl.split("/").slice(4).join("/");
      const file = bucket.file(fileName);
      await file.delete();
    }

    res.status(200).json({ message: "Location deleted successfully" });
  } catch (error) {
    logger.error("Error deleting location:", error);
    res.status(500).json({ error: "Failed to delete location" });
  }
});

app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in cents (for $10, use 1000)
      currency: currency, // e.g., 'usd'
    });
    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("error creating payment intent", error);
    res.status(500).json({ error: error });
  }
  // Simulated in-memory storage for promo codes
  // Endpoint to create a new promo code
});
// Sample input to test the create-promo endpoint
// Use a tool like Postman or curl to send a POST request to http://localhost:4200/create-promo

/*
POST /create-promo HTTP/1.1
Host: localhost:4200
Content-Type: application/json

{
  "code": "SUMMER21",
  "discount": 20, // Discount percentage
  "expirationDate": "2023-12-31T23:59:59Z" // ISO 8601 format
}
*/
app.post("/create-promo", async (req, res) => {
  const { code, discount, expirationDate } = req.body;
  console.log(req.body);
  var str = req.body;
  if (!code || !discount || !expirationDate) {
    return res.status(400).json({ message: str });
  }

  try {
    // Check if promo code already exists in Firestore
    const promoRef = db.collection("promoCodes").doc(code);
    const doc = await promoRef.get();

    if (doc.exists) {
      return res.status(409).json({ message: "Promo code already exists" });
    }

    // Store promo code in Firestore
    await promoRef.set({
      discount: discount / 100, // Convert percentage to decimal
      expirationDate: new Date(expirationDate),
    });
    res.status(201).json({ message: "Promo code created successfully" });
  } catch (error) {
    console.error("Error creating promo code:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Endpoint to validate promo code
app.post("/validate-promo", async (req, res) => {
  const { promoCode } = req.body;
  try {
    // Get promo code from Firestore
    const promoRef = db.collection("promoCodes").doc(promoCode);
    const doc = await promoRef.get();
    if (!doc.exists) {
      return res.json({ success: false, message: "Invalid promo code" });
    }
    const promo = doc.data();
    const currentDate = new Date();
    const currentDateUnix = Math.floor(currentDate.getTime() / 1000);
    // Check if the promo code is expired
    console.log(currentDateUnix, promo.expirationDate);
    if (currentDateUnix > promo.expirationDate._seconds) {
      return res.json({ success: false, message: "Promo code expired" });
    }
    // Calculate the final amount after applying the discount
    const finalDiscount = promo.discount;
    res.json({ success: true, finalDiscount });
  } catch (error) {
    console.error("Error validating promo code:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.get("/get-all-promos", async (req, res) => {
  try {
    // Get all promo codes from Firestore
    const promoSnapshot = await db.collection("promoCodes").get();
    if (promoSnapshot.empty) {
      return res.status(404).json({ message: "No promo codes found" });
    }
    const promoCodes = [];
    promoSnapshot.forEach((doc) => {
      const promoData = doc.data();
      promoCodes.push({
        code: doc.id,
        discount: promoData.discount * 100, // Convert decimal back to percentage
        expirationDate: new Date(
          promoData.expirationDate._seconds * 1000
        ).toISOString(), // Format date and time as ISO string
      });
    });
    res.json(promoCodes);
  } catch (error) {
    console.error("Error fetching promo codes:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/user/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ userId: userDoc.id, ...userDoc.data() });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.put("/user/:id", async (req, res) => {
  const userId = req.params.id;
  const updatedUserData = req.body;
  console.log(updatedUserData);

  try {
    const userRef = db.collection("users").doc(userId);
    await userRef.update(updatedUserData);
    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

app.post("/userImg", upload.single("image"), async (req, res) => {
  const userId = storage.getItem("userId");
  console.log(userId);

  const file = req.file;

  try {
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    if (!userId) {
      return res.status(400).json({ error: "No user found" });
    }
    const fileName = `users/${userId}/${Date.now()}-${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    await fileUpload.save(file.buffer, {
      contentType: file.mimetype,
    });

    await fileUpload.makePublic();

    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    const userRef = db.collection("users").doc(userId);
    await userRef.update({ imageUrl });

    res.status(201).json({
      message: "Image uploaded successfully",
      imageUrl,
    });
  } catch (error) {
    logger.error("Error uploading image:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// Middleware to check if the collection has less than 5 documents
const checkCollectionLimit = async (req, res, next) => {
  try {
    const gamesSnapshot = await db.collection("miniGames").get();
    if (gamesSnapshot.size >= 6) {
      return res.status(400).json({ error: "Collection limit reached" });
    }
    next();
  } catch (error) {
    logger.error("Error checking collection limit:", error);
    res.status(500).json({ error: "Failed to check collection limit" });
  }
};

// Create a new mini game
app.post("/miniGames", checkCollectionLimit, async (req, res) => {
  const { name, value, type } = req.body;

  if (!name || !value) {
    return res.status(400).json({ error: "Name and offer are required" });
  }

  try {
    const gameRef = db.collection("miniGames").doc();
    await gameRef.set({ name, value, type });
    res
      .status(201)
      .json({ message: "Mini game created successfully", gameId: gameRef.id });
  } catch (error) {
    logger.error("Error creating mini game:", error);
    res.status(500).json({ error: "Failed to create mini game" });
  }
});

// Get all mini games
app.get("/miniGames", async (req, res) => {
  try {
    const gamesSnapshot = await db.collection("miniGames").get();
    const games = [];
    gamesSnapshot.forEach((doc) => {
      games.push({ gameId: doc.id, ...doc.data() });
    });
    res.json(games);
  } catch (error) {
    logger.error("Error fetching mini games:", error);
    res.status(500).json({ error: "Failed to fetch mini games" });
  }
});

// Update a mini game by ID
app.put("/miniGames/:id", async (req, res) => {
  const gameId = req.params.id;
  const { name, value, type } = req.body;

  if (!name || !value || !type) {
    return res.status(400).json({ error: "Name and offer are required" });
  }

  try {
    const gameRef = db.collection("miniGames").doc(gameId);
    await gameRef.update({ name, value, type });
    res.status(200).json({ message: "Mini game updated successfully" });
  } catch (error) {
    logger.error("Error updating mini game:", error);
    res.status(500).json({ error: "Failed to update mini game" });
  }
});

// Delete a mini game by ID
app.delete("/miniGames/:id", async (req, res) => {
  const gameId = req.params.id;

  try {
    const gameRef = db.collection("miniGames").doc(gameId);
    await gameRef.delete();
    res.status(200).json({ message: "Mini game deleted successfully" });
  } catch (error) {
    logger.error("Error deleting mini game:", error);
    res.status(500).json({ error: "Failed to delete mini game" });
  }
});

app.put("/user/goldMember/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const userRef = db.collection("users").doc(userId);
    await userRef.update({ goldMember: true });
    res
      .status(200)
      .json({ message: "User updated to gold member successfully" });
  } catch (error) {
    logger.error("Error updating user to gold member:", error);
    res.status(500).json({ error: "Failed to update user to gold member" });
  }
});

app.put("/goldDiscountApply", async (req, res) => {
  try {
    const goldPriceRef = db.collection("goldprice").doc("current");
    const goldPriceDoc = await goldPriceRef.get();
    const goldPriceData = goldPriceDoc.data();
    const categoriesSnapshot = await db.collection("category").get();

    for (const categoryDoc of categoriesSnapshot.docs) {
      const categoryId = categoryDoc.id;
      const dishesSnapshot = await db
        .collection("category")
        .doc(categoryId)
        .collection("dishes")
        .get();

      const updatePromises = [];
      dishesSnapshot.forEach((dishDoc) => {
        const dishData = dishDoc.data();
        const originalPrice = dishData.price;
        const goldPrice =
          originalPrice - (originalPrice * goldPriceData.goldPrice) / 100;
        updatePromises.push(dishDoc.ref.update({ goldPrice }));
      });

      await Promise.all(updatePromises);
    }

    res
      .status(200)
      .json({ message: "Discount applied successfully to all dishes" });
  } catch (error) {
    logger.error("Error applying discount:", error);
    res.status(500).json({ error: "Failed to apply discount" });
  }
});

app.put("/updateDishesGoldPrice", async (req, res) => {
  const { category, discountValue } = req.body;

  if (!category || !discountValue) {
    return res
      .status(400)
      .json({ error: "Category and discount value are required" });
  }

  try {
    const categoryRef = db.collection("category").doc(category);
    const dishesSnapshot = await categoryRef.collection("dishes").get();

    if (dishesSnapshot.empty) {
      return res
        .status(404)
        .json({ error: "No dishes found in the specified category" });
    }

    const updatePromises = [];
    dishesSnapshot.forEach((dishDoc) => {
      const dishData = dishDoc.data();
      const originalPrice = dishData.price;
      const newPrice = originalPrice - (originalPrice * discountValue) / 100;
      updatePromises.push(dishDoc.ref.update({ goldPrice: newPrice }));
    });

    await Promise.all(updatePromises);
    res.status(200).json({ message: "Prices updated successfully" });
  } catch (error) {
    logger.error("Error updating prices:", error);
    res.status(500).json({ error: "Failed to update prices" });
  }
});

app.get("/getUsers", async (req, res) => {
  try {
    const usersSnapshot = await db.collection("users").get();
    const users = [];
    usersSnapshot.forEach((doc) => {
      users.push({ userId: doc.id, ...doc.data() });
    });
    res.json(users);
  } catch (error) {
    logger.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/daily-summary", async (req, res) => {
  try {
    const ordersSnapshot = await db.collection("order").get();
    const dailySummary = {};
    if (ordersSnapshot.empty) {
      return res.status(404).json({ error: "No orders found" });
    }
    ordersSnapshot.forEach((doc) => {
      const orderData = doc.data();
      let orderDate;

      // Check if orderDate is a string or a Firestore Timestamp
      if (typeof orderData.orderDate === "string") {
        orderDate = new Date(orderData.orderDate).toISOString().split("T")[0];
      } else if (orderData.orderDate instanceof admin.firestore.Timestamp) {
        orderDate = orderData.orderDate.toDate().toISOString().split("T")[0];
      } else {
        console.error("Unknown date format:", orderData.orderDate);
        return;
      }

      if (!dailySummary[orderDate]) {
        dailySummary[orderDate] = 0;
      }
      dailySummary[orderDate]++;
    });
    res.json(dailySummary);
  } catch (error) {
    logger.error("Error fetching daily summary:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch daily summary", message: error.message });
  }
});

app.put("/dishes/discount/:category/:id", async (req, res) => {
  const { category, id: dishId } = req.params;
  const { discount } = req.body;

  if (!discount) {
    return res.status(400).json({ error: "Discount value is required" });
  }

  try {
    const dishRef = db
      .collection("category")
      .doc(category)
      .collection("dishes")
      .doc(dishId);
    const dishDoc = await dishRef.get();

    if (!dishDoc.exists) {
      return res.status(404).json({ error: "Dish not found" });
    }

    await dishRef.update({
      offerAvailable: true,
      discount: discount,
    });

    res
      .status(200)
      .json({ message: "Discount applied successfully", discount });
  } catch (error) {
    logger.error("Error applying discount:", error);
    res.status(500).json({ error: "Failed to apply discount" });
  }
});

app.get("/specialOffers", async (req, res) => {
  try {
    const categoriesSnapshot = await db.collection("category").get();
    const specialOffers = [];

    for (const categoryDoc of categoriesSnapshot.docs) {
      const categoryId = categoryDoc.id;
      const dishesSnapshot = await db
        .collection("category")
        .doc(categoryId)
        .collection("dishes")
        .where("offerAvailable", "==", true)
        .get();

      dishesSnapshot.forEach((dishDoc) => {
        const dishData = dishDoc.data();
        console.log(dishData.discount);
        if (dishData.available) {
          const discountedPrice =
            Math.round(
              (dishData.price - (dishData.price * dishData.discount) / 100) *
                100
            ) / 100;
          specialOffers.push({
            dishId: dishDoc.id,
            category: categoryId,
            ...dishData,
            price: discountedPrice,
          });
        }
      });
    }

    res.json(specialOffers);
  } catch (error) {
    logger.error("Error fetching special offers:", error);
    res.status(500).json({ error: "Failed to fetch special offers" });
  }
});

app.put("/order/status/:id", async (req, res) => {
  const { id } = req.params;
  const { orderStatus, userId } = req.body;
  console.log(orderStatus, userId);

  try {
    const orderRef = db.collection("order").doc(id);
    const userRef = db
      .collection("users")
      .doc(userId)
      .collection("orders")
      .doc(id);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: "Dish not found" });
    }
    await orderRef.update({ orderStatus: orderStatus });
    const response = await userRef.update({ orderStatus: orderStatus });
    console.log("-------------gudda chekkuthaa", response);
    res.status(200).json({ message: "Dish status updated successfully" });
  } catch (error) {
    logger.error("Error updating dish status:", error);
    res.status(500).json({ error: "Failed to update dish status" });
  }
});

app.get("/dishes/admin/:category", async (req, res) => {
  const category = req.params.category;
  try {
    const dishesSnapshot = await db
      .collection("category")
      .doc(category)
      .collection("dishes")
      .get();
    const dishes = [];
    dishesSnapshot.forEach((doc) => {
      dishes.push({ dishId: doc.id, ...doc.data() });
    });
    res.json(dishes);
  } catch (error) {
    logger.error("Error fetching dishes:", error);
    res.status(500).json({ error: "Failed to fetch dishes" });
  }
});

app.patch(
  "/dishes/admin/:category/:id",
  upload.single("image"),
  async (req, res) => {
    const { category, id: dishId } = req.params;
    const updatedDishData = req.body;
    console.log(updatedDishData);

    const file = req.file;

    try {
      const dishRef = db
        .collection("category")
        .doc(category)
        .collection("dishes")
        .doc(dishId);
      const dishDoc = await dishRef.get();

      if (!dishDoc.exists) {
        return res.status(404).json({ error: "Dish not found" });
      }

      let imageUrl = updatedDishData.image;

      if (file) {
        // If there is a new file, delete the old image from Firebase Storage
        const oldDishData = dishDoc.data();
        const oldImageUrl = oldDishData.image;
        console.log(oldImageUrl);

        if (oldImageUrl) {
          const oldFileName = oldImageUrl.split("/").slice(4).join("/");
          console.log(oldFileName);
          const oldFile = bucket.file(oldFileName);
          console.log(oldFile);

          await oldFile.delete();
        }

        // Upload the new image
        const fileName = `${category}/${Date.now()}-${file.originalname}`;
        const fileUpload = bucket.file(fileName);

        await fileUpload.save(file.buffer, {
          contentType: file.mimetype,
        });

        await fileUpload.makePublic();
        imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        // Prepare the updated dish data
        const updatedDishDataWithImage = {
          ...updatedDishData,
          image: imageUrl,
        };
        // Update the dish document in Firestore
        await dishRef.update(updatedDishDataWithImage);

        res.status(200).json({
          message: "Dish updated successfully",
          imageUrl,
        });
        return;
      }
      const updatedDishDataWithoutImage = {
        ...updatedDishData,
      };

      await dishRef.update(updatedDishDataWithoutImage);
      res.status(200).json({
        message: "Dish updated successfully",
      });
    } catch (error) {
      logger.error("Error updating dish:", error);
      res.status(500).json({ error: "Failed to update dish" });
    }
  }
);

app.post("/goldPrice", async (req, res) => {
  const { goldPrice } = req.body;
  console.log(goldPrice);
  console.log(typeof goldPrice);

  if (typeof goldPrice !== "number" || goldPrice < 0 || goldPrice > 100) {
    return res.status(400).json({ error: "Invalid gold price percentage" });
  }
  try {
    const goldPriceRef = db.collection("goldprice").doc("current");
    await goldPriceRef.set({ goldPrice });
    const categoriesSnapshot = await db.collection("category").get();
    const updatePromises = [];
    for (const categoryDoc of categoriesSnapshot.docs) {
      const categoryId = categoryDoc.id;
      const dishesSnapshot = await db
        .collection("category")
        .doc(categoryId)
        .collection("dishes")
        .get();
      dishesSnapshot.forEach((dishDoc) => {
        const dishData = dishDoc.data();
        const originalPrice = dishData.price;
        const newPrice =
          Math.round(
            (originalPrice - (originalPrice * goldPrice) / 100) * 100
          ) / 100;
        updatePromises.push(dishDoc.ref.update({ goldPrice: newPrice }));
      });
    }
    await Promise.all(updatePromises);
    res.status(201).json({ message: "Gold price updated successfully" });
  } catch (error) {
    logger.error("Error updating gold price:", error);
    res.status(500).json({ error: "Failed to update gold price" });
  }
});

app.get("/goldPrice", async (req, res) => {
  try {
    const goldPriceRef = db.collection("goldprice").doc("current");
    const goldPriceDoc = await goldPriceRef.get();
    if (!goldPriceDoc.exists) {
      return res.status(404).json({ error: "Gold price not found" });
    }
    res.json({ goldPrice: goldPriceDoc.data().goldPrice });
  } catch (error) {
    logger.error("Error fetching gold price:", error);
    res.status(500).json({ error: "Failed to fetch gold price" });
  }
});

app.patch("/availability", async (req, res) => {
  const { category, id } = req.body;
  console.log(category, id);

  if (!category || !id) {
    return res.status(400).json({ error: "Category and ID are required" });
  }

  try {
    const dishRef = db
      .collection("category")
      .doc(category)
      .collection("dishes")
      .doc(id);
    const dishDoc = await dishRef.get();

    if (!dishDoc.exists) {
      return res.status(404).json({ error: "Dish not found" });
    }

    const currentAvailability = dishDoc.data().available;

    const newAvailability = !currentAvailability;
    console.log("Kojjam");

    await dishRef.update({ available: newAvailability });
    console.log("Dengutha mundaa");

    res.status(200).json({ message: "Dish availability updated successfully" });
  } catch (error) {
    logger.error("Error updating dish availability:", error);
    res.status(500).json({ error: "Failed to update dish availability" });
  }
});

// Route to create or update a reward
app.post("/rewards", async (req, res) => {
  const { reward, dollar } = req.body;

  if (!reward || !dollar) {
    return res
      .status(400)
      .json({ error: "Reward and dollar values are required" });
  }

  try {
    const rewardRef = db.collection("rewards").doc("rewardDoc");
    const doc = await rewardRef.get();

    if (doc.exists) {
      // Update the existing document
      await rewardRef.update({ reward, dollar });
      res.status(200).json({ message: "Reward updated successfully" });
    } else {
      // Create a new document
      await rewardRef.set({ reward, dollar });
      res.status(201).json({ message: "Reward created successfully" });
    }
  } catch (error) {
    logger.error("Error creating or updating reward:", error);
    res.status(500).json({ error: "Failed to create or update reward" });
  }
});

// Route to get all rewards
app.get("/rewards", async (req, res) => {
  try {
    const rewardsSnapshot = await db.collection("rewards").get();
    const rewards = [];

    rewardsSnapshot.forEach((doc) => {
      rewards.push({ reward: doc.id, ...doc.data() });
    });

    res.json(rewards);
  } catch (error) {
    logger.error("Error fetching rewards:", error);
    res.status(500).json({ error: "Failed to fetch rewards" });
  }
});

app.get("/userReward", async (req, res) => {
  const userId = storage.getItem("userId") || "Ppj6w2GfgMb2JMNBC9Isq96XfVs2";
  console.log(userId);
  try {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ userId: userDoc.id, reward: userDoc.data().rewards });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.post("/apply-reward", async (req, res) => {
  const { reward, userId, dollar } = req.body;
  console.log("Kojja mundaa kodakaaa", reward, userId, dollar);

  if (!reward || !userId) {
    return res.status(400).json({ error: "Reward and userId are required" });
  }

  try {
    const rewardRef = db.collection("rewards").doc("rewardDoc");
    const rewardDoc = await rewardRef.get();

    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!rewardDoc.exists) {
      return res.status(404).json({ error: "Reward data not found kojja" });
    }
    if (reward !== userDoc.data().reward) {
      return res.status(404).json({ error: "Reward data not found lanja" });
    }
    const rewardData = rewardDoc.data();
    let dollarValue = 0;
    console.log("Kona lanja kodakaaa", rewardData.reward, dollarValue);
    if (rewardData.reward === 1) {
      dollarValue = 10 * rewardData.dollar;
      console.log("Mutton munda", dollarValue);

      // res.status(200).json({ dollarValue: parseFloat(dollarValue.toFixed(2)) });
    } else {
      const localDollar = rewardData.dollar / rewardData.reward;
      console.log(localDollar);
      dollarValue = 10 * localDollar;
      console.log("Mastaan munda", dollarValue);
      // res.status(200).json({ dollarValue: parseFloat(dollarValue.toFixed(2)) });
    }
    const totalPrice = dollar - dollarValue;
    console.log("Erri lanja", totalPrice, dollar, dollarValue);

    await userRef.update({ reward: userDoc.data().reward - 10 });
    dollarValue = null;
    res.status(200).json({
      totalPrice: parseFloat(totalPrice.toFixed(2)),
      reward: userDoc.data().reward - 10,
    });
  } catch (error) {
    logger.error("Error estimating reward value:", error);
    res.status(500).json({ error: "Failed to estimate reward value" });
  }
});

app.post("/send-notification", async (req, res) => {
  const { title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: "Title and body are required" });
  }

  try {
    // Fetch all device tokens from your Firestore database
    const tokensSnapshot = await admin
      .firestore()
      .collection("userTokens")
      .get();
    const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);

    if (tokens.length === 0) {
      return res.status(404).json({ error: "No registered tokens found" });
    }

    // Set push payload data
    const data = {
      message: body, // Custom payload data
    };

    // Set optional notification options for Pushy
    const options = {
      notification: {
        badge: 1,
        sound: "ping.aiff",
        title,
        body,
      },
    };

    // Send push notification to all tokens using Pushy
    const results = await Promise.all(
      tokens.map((token) =>
        new Promise((resolve, reject) => {
          pushyAPI.sendPushNotification(data, [token], options, (err, id) => {
            if (err) {
              reject(err);
            } else {
              resolve({ id, token });
            }
          });
        })
      )
    );

    // Log successful responses
    console.log("Notifications sent successfully", results);

    // Add the notification to the Firestore "notifications" collection
    await admin.firestore().collection("notifications").add({
      title,
      body,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({
      message: "Notifications sent successfully",
      results,
    });
  } catch (error) {
    console.error("Error sending notifications:", error);
    res.status(500).json({ error: "Failed to send notifications" });
  }
});

app.get("/notifications", async (req, res) => {
  try {
    const notificationsSnapshot = await db
      .collection("notifications")
      .orderBy("timestamp", "desc")
      .get();
    const notifications = [];
    notificationsSnapshot.forEach((doc) => {
      notifications.push({ notificationId: doc.id, ...doc.data() });
    });
    res.json(notifications);
  } catch (error) {
    logger.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});


app.post("/store-token", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  try {
    // Store the token in the userTokens collection
    await db.collection("userTokens").add({ token });
    res.status(201).json({ message: "Token stored successfully" });
  } catch (error) {
    logger.error("Error storing token:", error);
    res.status(500).json({ error: "Failed to store token" });
  }
});


const port = 4200;
app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});
