const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

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

const schema = new mongoose.Schema({
  title: String, // String is shorthand for {type: String}
  tags: String,
  category: String,
  article: String,
  publish_date: { type: Date, default: Date.now },
  publisher: String,
  view_count: Number,
  status: { type: String, default: "pending" },
});

const Model = mongoose.model("Articles", schema);
const doc = new Model();
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
      const article = await Model.find({}).exec();
      console.log(article);
      res.send(article);
    });

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
