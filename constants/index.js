require("dotenv").config();

const PORT = process.env.PORT

const COLLECTION_NAMES = {
  USERS: "users",
  CATEGORY: "category",
  DISHES: "dishes",
  ORDERS: "orders",
  ORDER: "order",
  CART: "cart",
  LOCATION: "location",
  PROMO_CODES: "promoCodes",
  GOLD_PRICE: "goldprice",
  MINI_GAMES: "miniGames",
  REWARDS: "rewards",
  NOTIFICATIONS: "notifications",
  USER_TOKENS: "userTokens",
};

const MAX_MINI_GAMES = parseInt(process.env.MAX_MINI_GAMES)

module.exports = {
  PORT,
  COLLECTION_NAMES,
  MAX_MINI_GAMES,
};
