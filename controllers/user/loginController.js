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

    const email = req.session.loginData?.email || "";

  req.session.loginData = null;

    const user = req.session.user || req.session.passport;

    const blockedMessage = req.cookies?.blockedMessage || null;
    

    if (blockedMessage) {
      res.clearCookie("blockedMessage");
    }

    const message = req.cookies?.blockedMessage || null;

    if (message) {
      res.clearCookie("blockedMessage");
    }

    if (!user) {
      return res.render("login", { 
        message: message || null,
        blockedMessage: blockedMessage || null,
        email
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

    // clear old errors
    req.session.loginError = null;
    req.session.loginData = null;

    const validateEmail = (email) =>
      String(email)
        .toLowerCase()
        .match(/^[a-zA-Z0-9._%+-]{3,64}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);

    // Email validation
    if (!email || email.trim() === "") {
      req.session.loginError = "Email is required";
      req.session.loginData = { email };
      return res.redirect("/login");
    }

    if (!validateEmail(email)) {
      req.session.loginError = "Invalid email";
      req.session.loginData = { email };
      return res.redirect("/login");
    }

    const findUser = await User.findOne({ email });

    if (!findUser || findUser.is_admin) {
      req.session.loginError = MESSAGES.USER.NOT_FOUND;
      req.session.loginData = { email };
      return res.redirect("/login");
    }

    if (findUser.isBlocked) {
      req.session.loginError = MESSAGES.AUTH.USER_BLOCKED;
      return res.redirect("/login");
    }

    if (!password || password.trim() === "") {
      req.session.loginError = MESSAGES.AUTH.PASSWORD_EMPTY;
      req.session.loginData = { email };
      return res.redirect("/login");
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);
    if (!passwordMatch) {
      req.session.loginError = MESSAGES.AUTH.INCORRECT_PASSWORD;
      req.session.loginData = { email };
      return res.redirect("/login");
    }

    // SUCCESS
    req.session.user = findUser;
    return res.redirect("/");

  } catch (error) {
    logger.error("Login error", error);
    return res.redirect("/login");
  }
};


export default { loadLogin, login };
