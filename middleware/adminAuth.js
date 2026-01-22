import logger from "../utils/logger.js";

const isLogin = async (req, res, next) => {
  try {
    if (req.session.admin) {
      console.log("admin",req.session.admin);
      return next();
    }

    const isAjax =
      req.headers["x-requested-with"] === "XMLHttpRequest" ||
      req.headers.accept?.includes("application/json");

    if (isAjax) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    return res.redirect("/admin");
  } catch (error) {
    logger.error("isLogin middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const isLogout = async (req, res, next) => {
  try {
    const admin = req.session.admin;

    if (admin) {
      res.redirect("/admin/dashboard");
    } else {
      next();
    }
  } catch (error) {
    logger.error("islogout middleware error ", error.message);
  }
};

export default {
  isLogin,
  isLogout,
};
