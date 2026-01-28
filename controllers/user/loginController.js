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
        .match(/^[a-zA-Z0-9._%+-]{3,64}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
    };

    const validationErrors = {};
    if (email === "") {
      validationErrors.invalidEmail = "Email is required";
    } else if (!validateEmail(email)) {
      validationErrors.invalidEmail = "Invalid email";
    }

    if (Object.keys(validationErrors).length > 0) {
      validationErrors.email = email;
      return res.render("login", validationErrors);
    } else {
      const findUser = await User.findOne({ email: email });

      if (!findUser || findUser.is_admin === true) {
        return res.render("login", { message: MESSAGES.USER.NOT_FOUND, email });
      }

      if (findUser.isBlocked) {
        return res.render("login", {
          message: MESSAGES.AUTH.USER_BLOCKED,
          email,
        });
      }

      // Check if password is empty
      if (!password || password.trim() === "") {
        return res.render("login", {
          invalidPassword: MESSAGES.AUTH.PASSWORD_EMPTY,
          email,
        });
      }

      // Compare passwords
      const passwordMatch = await bcrypt.compare(password, findUser.password);
      if (!passwordMatch) {
        return res.render("login", {
          invalidPassword: MESSAGES.AUTH.INCORRECT_PASSWORD,
          email,
        });
      }

      // Set user session
      if (req.session.user !== undefined) {
        req.session.user = findUser;
      } else {
        req.session.passport = { user: findUser };
      }
      res.redirect("/");
    }
  } catch (error) {
    logger.error("Login error", error);
  }
  // Redirect to home after successful session save
};

export default { loadLogin, login };
