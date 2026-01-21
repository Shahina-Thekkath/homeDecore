import User from "../../models/userSchma.js";
import bcrypt from "bcrypt";
import logger from "../../utils/logger.js";

const loadLogin = (req, res) => {
  try {
    res.render("adminlogin");
  } catch (error) {
    logger.error("Failed to load admin login page", error);
    res.redirect("/pageNotFound");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const validateEmail = (email) => {
      return String(email)
        .toLowerCase()
        .match(
          /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
    };

    const validationErrors = {};

    if (!validateEmail(email || email === "")) {
      validationErrors.invalidEmail = "Invalid email ";
    }

    if (Object.keys(validationErrors).length > 0) {
      return res.render("adminlogin", validationErrors);
    }

    const admin = await User.findOne({ email, is_admin: true });
    if (admin) {
      const passwordMatch = await bcrypt.compare(password, admin.password);

      if (passwordMatch) {
        req.session.admin = admin;
        return res.redirect("/admin/dashboard");
      } else {
        return res.render("adminlogin", {
          message: "Email and password is incorrect",
        });
      }
    } else {
      return res.render("adminlogin", {
        message: "Email and password is incorrect",
      });
    }
  } catch (error) {
    logger.error("login error", error);
    return res.redirect("/pageerror");
  }
};

export default {
  loadLogin,
  login,
};
