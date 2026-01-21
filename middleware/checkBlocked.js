import User from "../models/userSchma.js";

const checkBlocked = async (req, res, next) => {
  try {
    let userId = null;

    if (req.session.user) {
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

      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
          return next();
        }
        return next();
      });
    } else {
      next();
    }
  } catch (err) {
    console.error("checkBlocked error:", err);
    next();
  }
};

export default checkBlocked;
