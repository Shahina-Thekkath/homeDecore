module.exports = (req, res, next) => {
    if(req.session.orderPlaced) {
        return res.redirect("/");
    }
    next();
}