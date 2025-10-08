# Quick Start Guide

## 🚀 Get Up and Running in 5 Minutes

### Step 1: Navigate to Backend Directory

```bash
cd backend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Verify Configuration

Make sure these files exist in the **project root** (one level up):

- ✅ `serviceAccountKey.json` - Firebase credentials
- ✅ `logger.js` - Logging utility

### Step 4: Start the Server

```bash
node index.js
```

Or for development with auto-reload:

```bash
npm run dev
```

### Step 5: Verify It's Working

Open your browser or use curl:

```bash
curl http://localhost:4200/
```

You should see:

```json
{
  "message": "Biryani Darbar API is running"
}
```

### Step 6: Test an Endpoint

```bash
curl http://localhost:4200/categories
```

## ✅ Success!

Your modular backend is now running! 🎉

## 🔧 Troubleshooting

### Port Already in Use?

Change the port in `constants/index.js`:

```javascript
const PORT = 4201; // or any available port
```

### Can't Find Logger?

Make sure `logger.js` is in the project root, not inside backend/

### Firebase Error?

Verify `serviceAccountKey.json` is in the project root with correct credentials

## 📖 Next Steps

1. Read `README.md` for full documentation
2. Check `MIGRATION_GUIDE.md` for detailed migration instructions
3. Review `REFACTORING_SUMMARY.md` to understand the changes

## 🆘 Need Help?

Check these files:

- `combined.log` - All logs
- `error.log` - Error logs only

## 🎯 Common Commands

```bash
# Install dependencies
npm install

# Start server
npm start

# Start with auto-reload (development)
npm run dev

# Check logs
tail -f ../combined.log
tail -f ../error.log
```

---

**That's it! You're ready to go!** 🚀
