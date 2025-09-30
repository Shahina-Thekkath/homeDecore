const Wallet = require('../../models/walletSchema');
const User = require('../../models/userSchma');

const getWallet = async (req, res) => {
    try {
        const user = req.session.user || req.session.passport;
        const userId = user._id;

        let wallet = await Wallet.findOne({ userId })
            .populate('userId', 'name email')
            .lean();

        // If wallet doesn't exist, create one with default balance 0
        if (!wallet) {
            wallet = await Wallet.create({
                userId: user._id,
                balance: 0,
                transactions: []
            });
        }

        // Sort transactions by latest date
        wallet.transactions = wallet.transactions.sort((a, b) => b.date - a.date);
        return res.render('wallet', { wallet,user });
    } catch (error) {
        console.error("Error fetching wallet:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

module.exports = {getWallet};