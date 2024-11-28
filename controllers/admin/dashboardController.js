

const loadDashboard = async (req, res) =>{
    try {
        return res.render("dashboard");
    } catch (error) {
        res.render("pageNotFround");
    }
}

module.exports = {
                   loadDashboard,
}