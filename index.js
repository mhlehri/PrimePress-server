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
    default: moment(new Date()).format("YYYY-MM-DD"),
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
      console.log(tags, publisher, search);
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
    app.get("/myArticles/:email", async (req, res) => {
      const email = req.params.email;
      const result = await Articles.find({
        Aemail: email,
      });
      res.send(result);
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
    app.get("/profile/:email", async (req, res) => {
      const email = req.params.email;
      const result = await Users.findOne({ email: email });
      res.send(result);
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
        console.log(result);
        res.send(result);
      });
    } catch (error) {
      return console.log(error);
    }

    //? update user to admin role
    app.put("/admin/:id", async (req, res) => {
      const id = req.params.id;
      const doc = await Users.findOneAndUpdate(
        { _id: id },
        { role: "admin" },
        { returnOriginal: false }
      );
      res.send(doc);
    });

    //? update message in articles
    app.put("/reason/:id", async (req, res) => {
      const id = req.params.id;
      const reason = req.body.message;
      const status = req.body.status;
      const doc = await Articles.findOneAndUpdate(
        { _id: id },
        { status: status, message: reason },
        { returnOriginal: false }
      );
      console.log(doc);
      res.send(doc);
    });

    //? update single articles views
    app.put("/viewArticle/:id", async (req, res) => {
      const id = req.params.id;
      const doc = await Articles.findById(id);
      doc.view_count += 1;
      const result = await doc.save();
      console.log(result);
      res.send(result);
    });

    //? update user profile
    app.put("/updateProfile", async (req, res) => {
      const email = req.query.email;
      const img = req.query.image;
      const name = req.query.name;
      const doc = await Users.findOneAndUpdate(
        { email },
        { img: img, name: name },
        { returnOriginal: false }
      );
      console.log(doc);
      res.send(doc);
    });

    //? update article category
    app.put("/updateCategory/:id", async (req, res) => {
      const id = req.params.id;
      const doc = await Articles.findOneAndUpdate(
        { _id: id },
        { category: "premium" },
        { returnOriginal: false }
      );
      console.log(doc);
      res.send(doc);
    });

    //? delete article
    app.delete("/deleteArticle/:id", async (req, res) => {
      const id = req.params.id;
      const result = await Articles.deleteOne({ _id: id });
      res.send(result);
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
