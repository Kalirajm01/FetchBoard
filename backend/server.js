const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));

// Repo Schema
const RepoSchema = new mongoose.Schema({
  name: String,
  url: String,
  stars: Number,
  username: String,
  description: String,
  language: String,
});
const Repo = mongoose.model("Repo", RepoSchema);

// Route: Fetch & Save GitHub Repos
app.get("/search", async (req, res) => {
  try {
    const { keyword, page = 1 } = req.query;
    const response = await axios.get(
      `https://api.github.com/search/repositories?q=${keyword}&page=${page}&per_page=5`
    );
    const repos = response.data.items.map(r => ({
        name: r.name,
        url: r.html_url,
        stars: r.stargazers_count,
        username: r.owner.login,
        description: r.description,
        language: r.language,
      }));      

    await Repo.insertMany(repos);
    res.json({ repos, totalCount: response.data.total_count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route: Get saved repos (optional, sorted by stars)
app.get("/repos", async (req, res) => {
  const repos = await Repo.find().sort({ stars: -1 });
  res.json(repos);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
