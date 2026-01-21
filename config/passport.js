import User from "../models/userSchma.js";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";


passport.serializeUser((user, done) => {
  done(null, user._id); //  Only store ID in session
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user); //  Attach user to req.user
  } catch (err) {
    done(err, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_AUTH_REDIRECT_URL,
      passReqToCallback: true,
    },
    async (request, accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.email });

        if (!user) {
          user = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            is_admin: false,
          });
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        console.error("Error in Google strategy callback:", error);
        return done(error, null);
      }
    }
  )
);

export default passport;
