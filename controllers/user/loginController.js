import User from "../../models/userSchma.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import session from "express-session";
import { STATUS_CODES, MESSAGES } from "../../constants/index.js";
import logger from "../../utils/logger.js";

dotenv.config();

const loadLogin = async (req, res) => {
  try {
    
    const user = req.session.user;

    const blockedMessage = req.cookies?.blockedMessage || null;
    
    
    if (blockedMessage) {
      res.clearCookie("blockedMessage");
    }

    const errors = req.session.loginErrors || {};
    const email = req.session.loginEmail || "";

    req.session.loginErrors = null;
    req.session.loginEmail = null;

    if (!user) {
      return res.render("login", { 
        ...errors,
        email,
        blockedMessage: blockedMessage || null,
      });
    } else {
      res.redirect("/");
    }
  } catch (error) {
    logger.error("Error loading login page:", error);
    res.redirect("/pageNotFound");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const validateEmail = (email) => {
      return String(email)
        .toLowerCase()
        .match(/^[a-zA-Z0-9._%+-]{3,64}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/);
    };

    const validationErrors = {};
    if (email === "") {
      validationErrors.invalidEmail = "Email is required";
    } else if (!validateEmail(email)) {
      validationErrors.invalidEmail = "Invalid email";
    }

    if (Object.keys(validationErrors).length > 0) {
      req.session.loginErrors = validationErrors;
      req.session.loginEmail = email;
      return res.redirect("/login");
    } else {
      const findUser = await User.findOne({ email: email });

      if (!findUser || findUser.is_admin === true) {
        req.session.loginErrors = { message: MESSAGES.USER.NOT_FOUND};
        req.session.loginEmail = email;
        return res.redirect("/login");
      }

      if (findUser.isBlocked) {
        req.session.loginErrors = {message: MESSAGES.AUTH.USER_BLOCKED};
        req.session.loginEmail = email;
        return res.redirect("/login");
      }

      // Check if password is empty
      if (!password || password.trim() === "") {
        req.session.loginErrors = {invalidPassword: MESSAGES.AUTH.PASSWORD_EMPTY};
        req.session.loginEmail = email;
        return res.redirect("/login");
      }

      // Compare passwords
      const passwordMatch = await bcrypt.compare(password, findUser.password);
      if (!passwordMatch) {
        req.session.loginErrors = {invalidPassword: MESSAGES.AUTH.INCORRECT_PASSWORD};
        req.session.loginEmail = email;
        return res.redirect("/login");
      }

      // Set user session
      req.session.user = findUser;
      res.redirect("/");
    }
  } catch (error) {
    logger.error("Login error", error);
    res.redirect("/login");
  }
  // Redirect to home after successful session save
};

export default { loadLogin, login };
