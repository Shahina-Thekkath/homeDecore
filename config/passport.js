// const passport = require("passport");
// const GoogleStrategy = require("passport-google-oauth2").Strategy;
// const User = require("../models/userSchma");
// const env = require("dotenv").config();

// passport.use(new GoogleStrategy({
//     clientID:process.env.GOOGLE_CLIENT_ID,
//     clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//     callbackURL: "http://localhost:3000/auth/google/callback",
//     passReqToCallback: true
// },
// async (accessToken, refreshToken, profile, done) =>{
//     try {
//         let user = await User.findOne({googleId:profile.id});
//         if(user){
//             return done(null, user);
//         }
//         else{
//             user = new User({
//                 name: profile.displayName,
//                 email: profile.emails[0].value,
//                 googleId: profile.id,

//             });
//             console.log(user);
//             await user.save();

//             req.session.user=user
//             console.log(req.session.user);

//             return done(null, user);
//         }
//     } catch (error) {
//         return done(error, null)
//     }
// }));
// //to assign to session
// passport.serializeUser((user, done)=>{
//     done(null, user.id)
// });

// //to fetch data from session
// passport.deserializeUser((id, done)=>{
//     User.findById(id)
//     .then(user =>{
//         done(null, user)
//     })
//     .catch(err =>{
//         done(err, null)
//     })
// })

// module.exports = passport;




const User = require("../models/userSchma");
const env = require("dotenv").config();
const passport = require("passport");
const googleStrategy = require("passport-google-oauth2").Strategy;
// const User = require('./models/userModel')


passport.serializeUser((user,done)=>{
    done(null, user);
})

passport.deserializeUser((user,done)=>{
    done(null,user);
})

passport.use(new googleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback",
    passReqToCallback: true
}, async (request, accessToken, refreshToken, profile, done) => {
    try {
       
        let user = await User.findOne({ email: profile.email});
       
        console.log(user);
        
        if (!user) {
           
            
            user = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                is_admin: 0, 
               
            });

            await user.save();
        }

        
        done(null, user);
    } catch (error) {
        console.error("Error in Google strategy callback:", error);
        done(error, null);
    }
}));

module.exports = passport;