const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));

// Repo Schema
const RepoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true, unique: true },
  stars: { type: Number, default: 0 },
  username: { type: String },
  description: { type: String },
  language: { type: String },
}, { timestamps: true });
const Repo = mongoose.model("Repo", RepoSchema);

// Route: Fetch & Save GitHub Repos
app.get("/search", async (req, res) => {
  try {
    const { keyword, page = 1 } = req.query;
    if (!keyword || !String(keyword).trim()) {
      return res.status(400).json({ error: "Keyword is required" });
    }

    const perPage = 5;
    const headers = {};
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const response = await axios.get(
      `https://api.github.com/search/repositories`,
      {
        params: { q: keyword, page, per_page: perPage },
        headers,
      }
    );

    const repos = response.data.items.map(r => ({
      name: r.name,
      url: r.html_url,
      stars: r.stargazers_count,
      username: r.owner?.login,
      description: r.description,
      language: r.language,
    }));

    // Dedup with upsert using bulkWrite; unique by url
    if (repos.length) {
      const operations = repos.map(doc => ({
        updateOne: {
          filter: { url: doc.url },
          update: { $set: doc },
          upsert: true,
        }
      }));
      await Repo.bulkWrite(operations, { ordered: false });
    }

    res.json({ repos, totalCount: response.data.total_count });
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message || "Unknown error";
    res.status(status).json({ error: message });
  }
});

// Route: Get saved repos (optional, sorted by stars)
app.get("/repos", async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const perPage = Number(req.query.per_page || 5);
    const skip = (page - 1) * perPage;

    const [items, totalCount] = await Promise.all([
      Repo.find().sort({ stars: -1 }).skip(skip).limit(perPage),
      Repo.countDocuments(),
    ]);

    res.json({ repos: items, totalCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  const state = mongoose.connection.readyState; // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const statusMap = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  res.json({
    db: statusMap[state] || "unknown",
    ok: state === 1,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
