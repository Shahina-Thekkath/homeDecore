function getUserId(req) {
  // Prefer Passport if available
  if (req.user?._id) {
    return req.user._id;
  }

  // Fallback to session.user if you support local sessions
  if (req.session.user?._id) {
    return req.session.user._id;
  }

  // Fallback to passport session raw id (if not using req.user)
  if (req.session.passport?.user) {
    return req.session.passport.user;
  }

  return null;
}

module.exports = { getUserId };
