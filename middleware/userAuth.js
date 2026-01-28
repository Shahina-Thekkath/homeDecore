import logger from "../utils/logger.js";



const isLogin = (req, res, next) => {
  try {
    if (req.session.user || req.session.passport) {
      return next();
    } else {
      return res.redirect("/");
    }
  } catch (error) {
    logger.error("IsLogin middleware error", error.message);
    res.redirect("/");
  }
};

const isLogout = async (req, res, next) => {
  try {
    const user = req.session.user;
    const passport = req.session.passport;
    if (user || passport) {
      res.redirect("/");
    } else {
      next();
    }
  } catch (error) {
    logger.error("isLogout middleware error ", error.message);
  }
};

const sessionVerify = async (req, res, next) => {
  try {
    const user =
      req.session.user ||
      (req.session.passport && req.session.passport.user);

    if (user) {
      return next();
    }

    const isAjax =
      req.headers["x-requested-with"] === "XMLHttpRequest" ||
      req.headers.accept?.includes("application/json");

    if (isAjax) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    return res.redirect("/login");
  } catch (error) {
    logger.error("sessionVerify middleware error", error);
    return res.status(500).send("Internal Server Error");
  }
};


export default {
  isLogin,
  isLogout,
  sessionVerify,
};
