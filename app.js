import express from "express";

const app = express();
import dotenv from "dotenv";
dotenv.config();
import session from "express-session";
import db from "./config/db.js";
import userRouter from "./routes/userRouter.js";
import adminRouter from "./routes/adminRouter.js";
import checkBlocked from "./middleware/checkBlocked.js";
import cookieParser from "cookie-parser";
app.use(cookieParser());
import logger from "./utils/logger.js";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { initSocket } from "./config/socket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import passport from "./config/passport.js";
import requestLogger from "./middleware/requestLogger.js";

app.use(requestLogger);

app.use(
  express.static(
    path.join(__dirname, "public/ludus-free-premium-ecommerce-template-master"),
  ),
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
  }),
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
  }),
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

app.set("view engine", "ejs");
app.set("views", [
  path.join(__dirname, "views/user"),
  path.join(__dirname, "views/admin"),
  path.join(__dirname, "views/partials"),
]);

app.use("/admin", adminRouter);

app.use("/admin", (req, res) => {
  res.status(404).render("404Error");
});

app.use("/", checkBlocked, userRouter);

app.use((req, res) => {
  res.status(404).render("page-404");
});

db().then(() => {
  const server = http.createServer(app);

   initSocket(server);

  server.listen(process.env.PORT, () => {
    logger.info(`server running on port ${process.env.PORT}`);
  });
}).catch((error) => {
  logger.error("failed to connect to the database", error);
});

export default app;
