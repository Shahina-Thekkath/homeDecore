import User from "../models/userSchma.js";
import { logger } from "../utils/logger.js";

const checkBlocked = async (req, res, next) => {
  try {
    console.log("checkBlocked");

    // to recheck it is not admin
    if(!req.session?.user && !req.session?.passport) {
      return next();
    }

    let userId = null;

    if (req.session?.user) {
      userId = req.session.user._id;
    } else if (req.session.passport?.user) {
      userId = req.session.passport.user;
    }

    if (!userId) return next();

    const user = await User.findById(userId);

    if (user?.isBlocked) {
      res.cookie("blockedMessage", "Your account has been blocked by admin.", {
        httpOnly: true,
        maxAge: 5000,
      });

      delete req.session.user;
      delete req.session.passport;
      return res.redirect("/login");
      
    } else {
      next();
    }
  } catch (err) {
    logger.error("checkBlocked error:", err);
    next();
  }
};

export default checkBlocked;
