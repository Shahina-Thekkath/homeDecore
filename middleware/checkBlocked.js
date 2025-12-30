const User = require("../models/userSchma");


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
    res.cookie(
        "blockedMessage",
        "Your account has been blocked by admin.",
        { httpOnly: true, maxAge: 5000 }
    );

    return req.session.destroy(() => {
        return res.redirect("/login");
    });
    }


    next();
  } catch (err) {
    console.error("checkBlocked error:", err);
    next();
  }
};


module.exports = checkBlocked;
