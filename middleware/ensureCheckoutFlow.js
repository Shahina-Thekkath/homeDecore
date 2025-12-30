module.exports = (req, res, next) => {
    if(!req.session.checkoutInProgress) {
        res.redirect("/")
    }
    next();
}