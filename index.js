const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
require("dotenv").config();
const moment = require("moment");

const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(
  cors({
    origin: ["http://localhost:5173", "https://primepress.netlify.app"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

//! schema
const schema = new mongoose.Schema({
  title: String,
  tags: String,
  category: { type: String, default: "basic" },
  article: String,
  Aemail: String,
  Aimage: String,
  Aname: String,
  image: String,
  message: { type: String, default: "" },
  publish_date: {
    type: String,
  },
  publisher: String,
  view_count: { type: Number, default: 0 },
  status: { type: String, default: "pending" },
});

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  img: String,
  Premium: {
    type: Boolean,
    default: false,
  },
  premium_Exp: { type: Number, default: null },
  role: { type: String, default: null },
});
const publisherSchema = new mongoose.Schema({
  publisher: String,
  image: String,
});

const Articles = mongoose.model("Articles", schema);
const Users = mongoose.model("Users", userSchema);
const Publishers = mongoose.model("Publishers", publisherSchema);
// custom middleware for verifying token validity

const secret = process.env.ACCESS_TOKEN;
const user = process.env.DB_USER;
const pass = process.env.DB_PASS;

mongoose
  .connect(
    `mongodb+srv://${user}:${pass}@cluster0.yynznjj.mongodb.net/` +
      "NewspaperDB?retryWrites=true&w=majority"
  )
  .then(() => {
    console.log("db connection established");
  });

// Curd operation
async function run() {
  try {
    const verifyToken = (req, res, next) => {
      const token = req?.cookies?.token;
      console.log("82", token);
      if (!token) {
        return res.status(401).send({ message: "unauthorized vai...." });
      }
      jwt.verify(token, secret, (err, decoded) => {
        if (err) {
          console.log("88", err.message);
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.user = decoded;
        next();
      });
    };
    //? get all articles (not Pending)
    app.get("/articles", async (req, res) => {
      const limit = req.query.limit;
      const page = req.query.page;
      const search = req.query.search;
      const { tags, publisher } = req.query;
      const query = { status: "approved" };
      if (tags) query.tags = tags;
      if (publisher) query.publisher = publisher;
      if (search) {
        // Add search conditions to the query
        query.$or = [{ title: { $regex: search, $options: "i" } }];
      }
      const skip = (page - 1) * limit || 0;
      const result = await Articles.find(query)
        .sort({ publish_date: -1 })
        .skip(skip)
        .limit(limit);
      res.send(result);
    });

    //? all articles with every status
    app.get("/allarticles", async (req, res) => {
      const result = await Articles.find().sort({ publish_date: -1 });
      res.send(result);
    });

    // ? get trending articles
    app.get("/trending", async (req, res) => {
      const result = await Articles.find({ status: "approved" })
        .sort({ view_count: -1 })
        .limit(6);
      res.send(result);
    });

    // ? get recent articles
    app.get("/recent", async (req, res) => {
      const result = await Articles.find({
        status: "approved",
        category: "basic",
      })
        .sort({ publish_date: -1 })
        .limit(2);
      res.send(result);
    });

    // ? get premium articles
    app.get("/premium", async (req, res) => {
      const result = await Articles.find({
        category: "premium",
      });
      res.send(result);
    });

    // ? get  my articles
    app.get("/myArticles/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email === req.user.email) {
        const result = await Articles.find({
          Aemail: email,
        });
        res.send(result);
      } else {
        res.status(403).send({ message: "unauthorized" });
      }
    });

    //? get single articles
    app.get("/singleArticle/:id", async (req, res) => {
      const id = req.params.id;
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
    //? get single user
    app.get("/profile/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      console.log(req.user.email);
      if (req.user.email === email) {
        const result = await Users.findOne({ email: email });
        res.send(result);
      } else {
        res.status(403).send({ message: "unauthorize access" });
      }
    });

    //? get all publishers
    app.get("/allPublishers", async (req, res) => {
      const result = await Publishers.find();
      res.send(result);
    });

    //? post articles
    app.post("/addArticle", async (req, res) => {
      const article = req.body;
      const articlesDoc = new Articles(article);
      const result = await articlesDoc.save();
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
    //? add publishers
    try {
      app.post("/addPublishers", async (req, res) => {
        const publisher = req.body;
        const publisherDoc = new Publishers(publisher);
        const result = await publisherDoc.save();
        res.send(result);
      });
    } catch (error) {
      return console.log(error);
    }

    //! update user to admin role
    app.put("/admin/:id", async (req, res) => {
      const id = req.params.id;
      const doc = await Users.findOneAndUpdate(
        { _id: id },
        { role: "admin", Premium: true },
        { returnOriginal: false }
      );
      res.send(doc);
    });

    //! update message in articles
    app.put("/reason/:id", async (req, res) => {
      const id = req.params.id;
      const { message, status } = req.body;
      const doc = await Articles.findOneAndUpdate(
        { _id: id },
        { status: status, message: message },
        { returnOriginal: false }
      );
      res.send(doc);
    });

    //! update articles
    app.put("/editArticles/:id", async (req, res) => {
      const id = req.params.id;
      const { publisher, image, tags, title, article } = req.body;
      const query = {};
      if (publisher) query.publisher = publisher;
      if (image) query.image = image;
      if (tags) query.tags = tags;
      if (title) query.title = title;
      if (article) query.article = article;
      const doc = await Articles.findOneAndUpdate({ _id: id }, query, {
        returnOriginal: false,
      });
      res.send(doc);
    });

    //! update single articles views
    app.put("/viewArticle/:id", async (req, res) => {
      const id = req.params.id;
      const doc = await Articles.findById(id);
      doc.view_count += 1;
      const result = await doc.save();
      res.send(result);
    });

    //? update user profile
    app.put("/updateProfile", verifyToken, async (req, res) => {
      const email = req.query.email;
      const img = req.query.image;
      const name = req.query.name;
      if (email === req.user.email) {
        const doc = await Users.findOneAndUpdate(
          { email },
          { img: img, name: name },
          { returnOriginal: false }
        );
        res.send(doc);
      } else {
        res.status(403).send({ message: "unauthorized" });
      }
    });

    //? update article category
    app.put("/updateCategory/:id", async (req, res) => {
      const id = req.params.id;
      const doc = await Articles.findOneAndUpdate(
        { _id: id },
        { category: "premium" },
        { returnOriginal: false }
      );
      res.send(doc);
    });

    //? update user Premium and exp date
    app.put("/updateUserPremium/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email === req.user.email) {
        const { isPremium, _Exp } = req.body;
        const doc = await Users.findOneAndUpdate(
          { email: email },
          { Premium: isPremium, premium_Exp: _Exp },
          { returnOriginal: false }
        );
        res.send(doc);
      } else {
        res.status(403);
      }
    });

    //? delete article
    app.delete("/deleteArticle/:id", async (req, res) => {
      const id = req.params.id;
      const result = await Articles.deleteOne({ _id: id });
      res.send(result);
    });

    //? create a paymentIntent with the order amount and currency
    app.post("/createPaymentIntent", verifyToken, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "24h",
      });
      console.log(token);
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
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
