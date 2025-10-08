/**
 * Calculate gold price based on original price and discount percentage
 */
const calculateGoldPrice = (price, goldPricePercentage) => {
  return price * (goldPricePercentage / 100);
};

/**
 * Calculate discounted price
 */
const calculateDiscountedPrice = (price, discountPercentage) => {
  return Math.round((price - (price * discountPercentage) / 100) * 100) / 100;
};

/**
 * Calculate rewards earned based on total price
 */
const calculateRewards = (totalPrice, dollarValue) => {
  return Math.floor(totalPrice / dollarValue);
};

/**
 * Calculate dollar value for rewards
 */
const calculateDollarValue = (rewardData) => {
  if (rewardData.reward === 1) {
    return 10 * rewardData.dollar;
  } else {
    const localDollar = rewardData.dollar / rewardData.reward;
    return 10 * localDollar;
  }
};

module.exports = {
  calculateGoldPrice,
  calculateDiscountedPrice,
  calculateRewards,
  calculateDollarValue,
};
