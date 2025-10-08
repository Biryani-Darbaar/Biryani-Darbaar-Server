# Testing Guide

## 🧪 Complete API Testing Checklist

This guide helps you test all 59 endpoints to ensure everything works correctly.

---

## 📋 Prerequisites

1. Server is running: `node backend/index.js`
2. You have a tool like:
   - Postman
   - curl
   - Thunder Client (VS Code extension)
   - REST Client (VS Code extension)

---

## ✅ Testing Checklist

### 1. Health Check

```bash
curl http://localhost:4200/
```

**Expected:** `{ "message": "Biryani Darbar API is running" }`

---

### 2. Authentication & User Management (9 endpoints)

#### Sign Up

```bash
curl -X POST http://localhost:4200/signup \
  -H "Content-Type: application/json" \
  -d '{
    "userName": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "phoneNumber": "1234567890"
  }'
```

#### Login

```bash
curl -X POST http://localhost:4200/login \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "YOUR_FIREBASE_ID_TOKEN"
  }'
```

#### Logout

```bash
curl -X POST http://localhost:4200/logout
```

#### Get User by ID

```bash
curl http://localhost:4200/user/USER_ID
```

#### Update User

```bash
curl -X PUT http://localhost:4200/user/USER_ID \
  -H "Content-Type: application/json" \
  -d '{
    "userName": "Updated Name",
    "phoneNumber": "9876543210"
  }'
```

#### Get All Users

```bash
curl http://localhost:4200/getUsers
```

#### Upload User Image

```bash
curl -X POST http://localhost:4200/userImg \
  -F "image=@/path/to/image.jpg"
```

#### Update to Gold Member

```bash
curl -X PUT http://localhost:4200/user/goldMember/USER_ID
```

#### Get User Reward

```bash
curl http://localhost:4200/userReward
```

---

### 3. Categories (3 endpoints)

#### Get All Categories

```bash
curl http://localhost:4200/categories
```

#### Create Category

```bash
curl -X POST http://localhost:4200/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Biryani"
  }'
```

#### Delete Category

```bash
curl -X DELETE http://localhost:4200/categories/Biryani
```

---

### 4. Dishes (10 endpoints)

#### Add Dish

```bash
curl -X POST http://localhost:4200/dishes \
  -F "image=@/path/to/dish.jpg" \
  -F 'dishData={
    "name": "Chicken Biryani",
    "price": 299,
    "description": "Delicious chicken biryani",
    "category": "Biryani"
  }'
```

#### Get Dishes by Category

```bash
curl http://localhost:4200/dishes/category/Biryani
```

#### Get All Dishes

```bash
curl http://localhost:4200/dishes/all
```

#### Update Dish

```bash
curl -X PUT http://localhost:4200/dishes/Biryani/DISH_ID \
  -F "image=@/path/to/new-image.jpg" \
  -F 'dishData={
    "name": "Updated Chicken Biryani",
    "price": 349
  }'
```

#### Delete Dish

```bash
curl -X DELETE http://localhost:4200/dishes/Biryani/DISH_ID
```

#### Get Dishes (Admin)

```bash
curl http://localhost:4200/dishes/admin/Biryani
```

#### Update Dish (Admin)

```bash
curl -X PATCH http://localhost:4200/dishes/admin/Biryani/DISH_ID \
  -H "Content-Type: application/json" \
  -d '{
    "price": 399,
    "available": true
  }'
```

#### Apply Discount

```bash
curl -X PUT http://localhost:4200/dishes/discount/Biryani/DISH_ID \
  -H "Content-Type: application/json" \
  -d '{
    "discount": 20
  }'
```

#### Get Special Offers

```bash
curl http://localhost:4200/specialOffers
```

#### Toggle Availability

```bash
curl -X PATCH http://localhost:4200/availability \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Biryani",
    "id": "DISH_ID"
  }'
```

---

### 5. Orders (8 endpoints)

#### Create Order

```bash
curl -X POST http://localhost:4200/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "dishId": "DISH_ID",
        "name": "Chicken Biryani",
        "quantity": 2,
        "price": 299
      }
    ],
    "totalPrice": 598,
    "deliveryAddress": "123 Main St",
    "phoneNumber": "1234567890"
  }'
```

#### Get All Orders

```bash
curl http://localhost:4200/orders
```

#### Get Orders by User

```bash
curl http://localhost:4200/ordersByUser/USER_ID
```

#### Get Order by ID

```bash
curl http://localhost:4200/orders/ORDER_ID
```

#### Update Order Status

```bash
curl -X PATCH http://localhost:4200/orders/ORDER_ID \
  -H "Content-Type: application/json" \
  -d '{
    "orderStatus": "preparing"
  }'
```

#### Update Order Status (Admin)

```bash
curl -X PATCH http://localhost:4200/ordersAdmin/ORDER_ID \
  -H "Content-Type: application/json" \
  -d '{
    "orderStatus": "delivered",
    "userId": "USER_ID"
  }'
```

#### Get Total Order Count

```bash
curl http://localhost:4200/orders/total-count
```

#### Get Daily Summary

```bash
curl http://localhost:4200/daily-summary
```

---

### 6. Cart (4 endpoints)

#### Add to Cart

```bash
curl -X POST http://localhost:4200/cart \
  -H "Content-Type: application/json" \
  -d '{
    "dishId": "DISH_ID",
    "name": "Chicken Biryani",
    "price": 299,
    "quantity": 1
  }'
```

#### Get Cart

```bash
curl -X POST http://localhost:4200/getCart \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Update Cart Item

```bash
curl -X PUT http://localhost:4200/cart/CART_ITEM_ID \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 3
  }'
```

#### Delete Cart Item

```bash
curl -X DELETE http://localhost:4200/cart/CART_ITEM_ID
```

---

### 7. Locations (4 endpoints)

#### Create Location

```bash
curl -X POST http://localhost:4200/locations \
  -F "image=@/path/to/location.jpg" \
  -F "name=Downtown Branch" \
  -F "address=123 Main Street, City"
```

#### Get All Locations

```bash
curl http://localhost:4200/locations
```

#### Update Location

```bash
curl -X PUT http://localhost:4200/locations/LOCATION_ID \
  -F "image=@/path/to/new-location.jpg" \
  -F "name=Updated Branch" \
  -F "address=456 New Street, City"
```

#### Delete Location

```bash
curl -X DELETE http://localhost:4200/locations/LOCATION_ID
```

---

### 8. Promo Codes (3 endpoints)

#### Create Promo Code

```bash
curl -X POST http://localhost:4200/create-promo \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SUMMER2024",
    "discount": 20,
    "expirationDate": "2024-12-31T23:59:59Z"
  }'
```

#### Validate Promo Code

```bash
curl -X POST http://localhost:4200/validate-promo \
  -H "Content-Type: application/json" \
  -d '{
    "promoCode": "SUMMER2024"
  }'
```

#### Get All Promos

```bash
curl http://localhost:4200/get-all-promos
```

---

### 9. Payment (1 endpoint)

#### Create Payment Intent

```bash
curl -X POST http://localhost:4200/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 59800,
    "currency": "usd"
  }'
```

---

### 10. Rewards (3 endpoints)

#### Create/Update Reward

```bash
curl -X POST http://localhost:4200/rewards \
  -H "Content-Type: application/json" \
  -d '{
    "reward": 10,
    "dollar": 100
  }'
```

#### Get All Rewards

```bash
curl http://localhost:4200/rewards
```

#### Apply Reward

```bash
curl -X POST http://localhost:4200/apply-reward \
  -H "Content-Type: application/json" \
  -d '{
    "reward": 10,
    "userId": "USER_ID",
    "dollar": 500
  }'
```

---

### 11. Mini Games (4 endpoints)

#### Create Mini Game

```bash
curl -X POST http://localhost:4200/miniGames \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Spin the Wheel",
    "value": 50,
    "type": "discount"
  }'
```

#### Get All Mini Games

```bash
curl http://localhost:4200/miniGames
```

#### Update Mini Game

```bash
curl -X PUT http://localhost:4200/miniGames/GAME_ID \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Game",
    "value": 75,
    "type": "cashback"
  }'
```

#### Delete Mini Game

```bash
curl -X DELETE http://localhost:4200/miniGames/GAME_ID
```

---

### 12. Gold Price (4 endpoints)

#### Set Gold Price

```bash
curl -X POST http://localhost:4200/goldPrice \
  -H "Content-Type: application/json" \
  -d '{
    "goldPrice": 15
  }'
```

#### Get Gold Price

```bash
curl http://localhost:4200/goldPrice
```

#### Apply Gold Discount to All

```bash
curl -X PUT http://localhost:4200/goldDiscountApply
```

#### Update Dishes Gold Price by Category

```bash
curl -X PUT http://localhost:4200/updateDishesGoldPrice \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Biryani",
    "discountValue": 20
  }'
```

---

### 13. Notifications (3 endpoints)

#### Send Notification

```bash
curl -X POST http://localhost:4200/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Offer!",
    "body": "Get 20% off on all biryanis"
  }'
```

#### Get All Notifications

```bash
curl http://localhost:4200/notifications
```

#### Store Token

```bash
curl -X POST http://localhost:4200/store-token \
  -H "Content-Type: application/json" \
  -d '{
    "token": "DEVICE_PUSH_TOKEN"
  }'
```

---

### 14. Images (3 endpoints)

#### Upload Images

```bash
curl -X POST http://localhost:4200/img \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg" \
  -F "directory=gallery"
```

#### Get All Images

```bash
curl http://localhost:4200/img
```

#### Delete All Images

```bash
curl -X DELETE http://localhost:4200/img
```

---

## 🎯 Testing Workflow

### Basic Flow Test

1. **Setup**

   ```bash
   # Create a category
   curl -X POST http://localhost:4200/categories \
     -H "Content-Type: application/json" \
     -d '{"name": "Biryani"}'
   ```

2. **Add a dish**

   ```bash
   curl -X POST http://localhost:4200/dishes \
     -F 'dishData={"name":"Chicken Biryani","price":299,"category":"Biryani"}' \
     -F "image=@dish.jpg"
   ```

3. **Get dishes**

   ```bash
   curl http://localhost:4200/dishes/category/Biryani
   ```

4. **Add to cart**

   ```bash
   curl -X POST http://localhost:4200/cart \
     -H "Content-Type: application/json" \
     -d '{"dishId":"DISH_ID","quantity":2,"price":299}'
   ```

5. **Create order**

   ```bash
   curl -X POST http://localhost:4200/orders \
     -H "Content-Type: application/json" \
     -d '{"items":[{"dishId":"DISH_ID","quantity":2}],"totalPrice":598}'
   ```

6. **Check order**
   ```bash
   curl http://localhost:4200/orders
   ```

---

## 📊 Expected Results

✅ All endpoints should return appropriate status codes:

- `200` - Success (GET, PUT, PATCH)
- `201` - Created (POST)
- `400` - Bad Request
- `404` - Not Found
- `500` - Server Error

✅ All responses should be valid JSON

✅ All file uploads should save to Firebase Storage

✅ All database operations should reflect in Firestore

---

## 🔍 Debugging

If an endpoint fails:

1. Check server logs:

   ```bash
   tail -f combined.log
   tail -f error.log
   ```

2. Check Firebase Console

3. Verify request format matches examples

4. Check if all required fields are provided

---

## 🎉 Success Criteria

All 59 endpoints tested and working? **Congratulations!** 🚀

Your modular backend is fully functional and ready for production!
