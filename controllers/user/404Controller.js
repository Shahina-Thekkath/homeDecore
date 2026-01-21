import logger from "../../utils/logger.js";

const pageNotFound = (req, res) => {
  try {
    res.status(404).render("page-404");
  } catch (error) {
    logger.error("404 page render failed:", error);
    res.status(404).send("Page Not Found");
  }
};

export default { pageNotFound };
