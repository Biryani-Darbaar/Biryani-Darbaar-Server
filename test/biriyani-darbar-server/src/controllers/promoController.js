const db = require('../config/database');

// Create a new promo code
exports.createPromo = async (req, res) => {
    const { code, discount, expirationDate } = req.body;

    if (!code || !discount || !expirationDate) {
        return res.status(400).json({ error: "Code, discount, and expiration date are required" });
    }

    try {
        const promoRef = db.collection("promoCodes").doc(code);
        const doc = await promoRef.get();

        if (doc.exists) {
            return res.status(400).json({ error: "Promo code already exists" });
        }

        await promoRef.set({
            discount: discount / 100,
            expirationDate: new Date(expirationDate),
        });
        res.status(201).json({ message: "Promo code created successfully" });
    } catch (error) {
        console.error("Error creating promo code:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Validate a promo code
exports.validatePromo = async (req, res) => {
    const { promoCode } = req.body;

    try {
        const promoRef = db.collection("promoCodes").doc(promoCode);
        const doc = await promoRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Promo code not found" });
        }

        const promo = doc.data();
        const currentDate = new Date();
        if (currentDate > promo.expirationDate.toDate()) {
            return res.status(400).json({ error: "Promo code has expired" });
        }

        res.json({ success: true, finalDiscount: promo.discount });
    } catch (error) {
        console.error("Error validating promo code:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Get all promo codes
exports.getAllPromos = async (req, res) => {
    try {
        const promoSnapshot = await db.collection("promoCodes").get();
        const promoCodes = [];

        promoSnapshot.forEach((doc) => {
            promoCodes.push({ promoCode: doc.id, ...doc.data() });
        });

        res.json(promoCodes);
    } catch (error) {
        console.error("Error fetching promo codes:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};