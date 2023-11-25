const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const moment = require("moment");
const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://fantastic-marzipan-a57ea1.netlify.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

//! schema
const schema = new mongoose.Schema({
  title: String, // String is shorthand for {type: String}
  tags: String,
  category: String,
  article: String,
  publish_date: {
    type: String,
    default: moment(new Date()).format("MMM Do YY"),
  },
  publisher: String,
  view_count: { type: Number, default: 0 },
  status: { type: String, default: "pending" },
});
const userSchema = new mongoose.Schema({
  name: String, // String is shorthand for {type: String}
  email: { type: String, unique: true },
  img: String,
  Premium: {
    type: Boolean,
    default: false,
  },
});

const Articles = mongoose.model("Articles", schema);
const Users = mongoose.model("Users", userSchema);
// custom middleware for verifying token validity

const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access!" });
  }
  jwt.verify(token, "secret", (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access!" });
    }
    req.user = decoded;
    next();
  });
};

mongoose
  .connect(
    "mongodb+srv://mahmudhassanlehri:mhlehri101@cluster0.yynznjj.mongodb.net/" +
      "NewspaperDB?retryWrites=true&w=majority"
  )
  .then(() => {
    console.log("db connection established");
  });
// Curd operation
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)

    //? get all articles
    app.get("/articles", async (req, res) => {
      const limit = req.query.limit;
      const page = req.query.page;
      const search = req.query.search;
      const skip = (page - 1) * limit || 0;
      console.log(limit, page);
      const result = await Articles.find({ status: "notP" })
        .skip(skip)
        .limit(limit);
      res.send(result);
    });
    // ? get trending articles
    app.get("/trending", async (req, res) => {
      const result = await Articles.find({ status: "notP" })
        .sort({ view_count: -1 })
        .limit(6);
      res.send(result);
    });

    //? get single articles
    app.get("/singleArticle/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const result = await Articles.findOne({
        _id: id,
      });
      res.send(result);
    });

    //? get all users
    app.get("/users", async (req, res) => {
      const result = await Users.find();
      res.send(result);
    });

    //? get all articles
    app.get("/singleArticle/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const result = await Articles.findOne({
        _id: id,
      });
      res.send(result);
    });

    //? post articles
    app.post("/addArticle", async (req, res) => {
      const article = req.body;
      const articlesDoc = new Articles(article);
      const result = await articlesDoc.save();
      console.log(result);
      res.send(result);
    });

    //? add users
    try {
      app.post("/addUser", async (req, res) => {
        const user = req.body;
        const userEmail = user.email;
        const find = await Users.findOne({ email: userEmail });
        if (find) {
          return;
        }
        const userDoc = new Users(user);
        const result = await userDoc.save();
        res.send(result);
      });
    } catch (error) {
      return console.log(error);
    }

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, "secret", { expiresIn: "24h" });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production" ? true : false,
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });
    console.log("");
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("assignment 12 running...");
});

app.listen(port, (req, res) => {
  console.log(`server listening on port ${port}`);
});
