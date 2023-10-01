const express = require("express");
const axios = require("axios");
const _ = require("lodash");
const app = express();
const port = 3000;

let blogs = [];
let lastCacheTime = 0;

//blog fetching logic

const fetchAndCalculateBlogStats = async () => {
  const currentTime = Date.now();
  const cacheDuration = 600000;

  if (currentTime - lastCacheTime < cacheDuration) {
    return blogs;
  }

  try {
    const response = await axios.get(
      "https://intent-kit-16.hasura.app/api/rest/blogs",
      {
        headers: {
          "x-hasura-admin-secret":
            "32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6",
        },
      }
    );
    if (Array.isArray(response.data)) {
      blogs = response.data;
    } else if (response.data && Array.isArray(response.data.blogs)) {
      blogs = response.data.blogs;
    } else {
      throw new Error("does not contain anything in array");
    }

    lastCacheTime = currentTime;

    return blogs;
  } catch (error) {
    console.error(error);
    throw new Error(
      "An error occurred while fetching"
    );
  }
};

const memoizedFetchAndCalculateBlogStats = _.memoize(
  fetchAndCalculateBlogStats,
  () => "blog-stats"
);


app.get("/api/blog-stats", async (req, res) => {
  try {
    const stats = await memoizedFetchAndCalculateBlogStats();
    const totalBlogs = stats.length;
    const longestTitleBlog = _.maxBy(stats, (blog) => blog.title.length);
    const blogsWithPrivacy = stats.filter((blog) =>
      blog.title.toLowerCase().includes("privacy")
    );
    const { id, image_url } = longestTitleBlog;
    const uniqueTitlesFormatted = stats.map((blog) => ({
      id: blog.id,
      image_url: blog.image_url,
      title: blog.title,
    }));
    const responseObj = {
      id,
      image_url,
      totalBlogs,
      longestTitle: longestTitleBlog ? longestTitleBlog.title : "",
      blogsWithPrivacy: blogsWithPrivacy.length,
      uniqueTitles: uniqueTitlesFormatted,
    };

    res.json(responseObj);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "An error occurred while fetching",
    });
  }
});


//search API logic
app.get("/api/blog-search", (req, res) => {
  try {
    const query = req.query.query;
    if (!query) {
      return res
        .status(400)
        .json({ error: 'query is required.' });
    }
    const matchingBlogs = blogs.filter((blog) => {
      return (
        blog.title && blog.title.toLowerCase().includes(query.toLowerCase())
      );
    });
    res.json(matchingBlogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

// errror handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server Error" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
