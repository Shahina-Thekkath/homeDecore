const cookieFlash = (req, res, next) => {
    res.locals.blockedMessage = null; 
    console.log("🍪 Incoming cookies:", req.cookies);

    if(req.cookies?.blockedMessage) {
            console.log("✅ Found blockedMessage:", req.cookies.blockedMessage);

        res.locals.blockedMessage = req.cookies.blockedMessage;
        res.clearCookie("blockedMessage");
    }
    next();
};

export default cookieFlash;