const db = require('../config/database');

// Add item to cart
exports.addToCart = async (req, res) => {
    const { userId, itemId, quantity } = req.body;

    if (!userId || !itemId || !quantity) {
        return res.status(400).json({ error: 'User ID, Item ID, and Quantity are required' });
    }

    try {
        const cartRef = db.collection('carts').doc(userId);
        const cartDoc = await cartRef.get();

        if (cartDoc.exists) {
            const cartData = cartDoc.data();
            cartData.items[itemId] = (cartData.items[itemId] || 0) + quantity;
            await cartRef.update({ items: cartData.items });
        } else {
            await cartRef.set({ items: { [itemId]: quantity } });
        }

        res.status(201).json({ message: 'Item added to cart successfully' });
    } catch (error) {
        console.error('Error adding item to cart:', error);
        res.status(500).json({ error: 'Failed to add item to cart' });
    }
};

// Get cart contents
exports.getCartContents = async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        const cartRef = db.collection('carts').doc(userId);
        const cartDoc = await cartRef.get();

        if (!cartDoc.exists) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        res.status(200).json(cartDoc.data());
    } catch (error) {
        console.error('Error fetching cart contents:', error);
        res.status(500).json({ error: 'Failed to fetch cart contents' });
    }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
    const { userId, itemId } = req.params;

    if (!userId || !itemId) {
        return res.status(400).json({ error: 'User ID and Item ID are required' });
    }

    try {
        const cartRef = db.collection('carts').doc(userId);
        const cartDoc = await cartRef.get();

        if (!cartDoc.exists) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const cartData = cartDoc.data();
        delete cartData.items[itemId];
        await cartRef.update({ items: cartData.items });

        res.status(200).json({ message: 'Item removed from cart successfully' });
    } catch (error) {
        console.error('Error removing item from cart:', error);
        res.status(500).json({ error: 'Failed to remove item from cart' });
    }
};