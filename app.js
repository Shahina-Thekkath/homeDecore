const express = require("express");
const app = express();
const env = require("dotenv").config();
const path = require("path");
const session = require("express-session");
const db = require("./config/db");
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");
const orderGuard = require("./middleware/orderGuard");
const checkBlocked = require("./middleware/checkBlocked");
const cookieParser = require("cookie-parser");
app.use(cookieParser());



const passport = require("./config/passport");
db();
app.use(
  express.static(
    path.join(__dirname, "public/ludus-free-premium-ecommerce-template-master")
  )
);
app.use(
  "/admin-assets",
  (req, res, next) => {
    // Log the requested file path for debugging

    next();
  },
  express.static(path.join(__dirname, "admin-public/assets"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css");
      } else if (filePath.endsWith(".js")) {
        res.setHeader("Content-Type", "application/javascript");
      }
    },
  })
);

app.use(express.json({ limit: "10mb" })); // for JSON
app.use(express.urlencoded({ limit: "10mb", extended: true })); // for form data
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());



app.use((req, res, next) => {
  if (req.isAuthenticated() && !req.session.user) {
    req.session.user = req.user; //  Copy passport user into req.session.user
  }
  next();
});


app.use((req, res, next) => {
  res.set("cache-control", "no-store");
  next();
});

app.use("/",checkBlocked);

app.set("view engine", "ejs");
app.set("views", [
  path.join(__dirname, "views/user"),
  path.join(__dirname, "views/admin"),
  path.join(__dirname, "views/partials"),
]);

app.use("/admin", adminRouter);

app.use("/admin", (req, res) => {
  res.status(404).render("404Error")
});

app.use("/", userRouter);

app.use((req, res) => {
  res.status(404).render("page-404");
})



db()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`server running on port${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log(`failed to connect to the database`, error);
  });

module.exports = app;
