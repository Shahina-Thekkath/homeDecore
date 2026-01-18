import logger from '../../utils/logger.js';

const pageError = (req, res) =>{
    try {
        res.render("404Error");
    } catch (error) {
        logger.error("Failed to render 404 page", error);
        res.redirect("/admin/pageerror");
    }
}

export default { pageError };