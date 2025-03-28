const { db } = require("../config/firebase");

exports.createPromo = async (req, res) => {
  try {
    const promoData = {
      ...req.body,
      createdAt: new Date(),
      isActive: true,
    };

    const docRef = await db.collection("promos").add(promoData);
    res.status(201).json({ id: docRef.id, ...promoData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPromos = async (req, res) => {
  try {
    const promosSnapshot = await db
      .collection("promos")
      .where("isActive", "==", true)
      .get();

    const promos = [];
    promosSnapshot.forEach((doc) => {
      promos.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json(promos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updatePromo = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("promos").doc(id).update(req.body);
    res.status(200).json({ message: "Promo updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deletePromo = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("promos").doc(id).delete();
    res.status(200).json({ message: "Promo deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
