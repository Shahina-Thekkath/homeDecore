const orderGuard = (req, res, next) => {
  // order successfully placed
  if (req.session.orderCompleted) {
    // block checkout & order-related pages
    if (
      req.originalUrl.startsWith("/checkout") 
    ) {
      return res.redirect("/");
    }
  }

   // order failed, prevent back to checkout
  if (req.session.lastOrderFailed) {
    if (req.originalUrl.startsWith("/checkout")) {
      return res.redirect("/cart");
    }
  }

  next();
};

module.exports = orderGuard;