import Wallet from "../../models/walletSchema.js";
import { STATUS_CODES, MESSAGES } from "../../constants/index.js";
import logger from "../../utils/logger.js";

const getWallet = async (req, res) => {
  try {
    const user = req.session.user || req.session.passport;
    const userId = user._id;

    // Get current page and limit (number of transactions per page)
    let page = parseInt(req.query.page) || 1;
    const limit = 2; // You can adjust this as you wish (e.g., 5, 10, 20)

    // Fetch wallet
    let wallet = await Wallet.findOne({ userId })
      .populate("userId", "name email")
      .lean();

    // If wallet doesn't exist, create one
    if (!wallet) {
      wallet = await Wallet.create({
        userId,
        balance: 0,
        transactions: [],
      });
    }

    // Sort transactions (latest first)
    wallet.transactions = wallet.transactions.sort((a, b) => b.date - a.date);

    // Pagination logic
    const totalTransactions = wallet.transactions.length;
    const totalPages = Math.ceil(totalTransactions / limit);

    // Prevent invalid pages
    if (page > totalPages && totalPages > 0) page = totalPages;
    if (page < 1) page = 1;

    // Slice transactions for current page
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTransactions = wallet.transactions.slice(
      startIndex,
      endIndex
    );

    // Replace full transactions with paginated ones
    wallet.transactions = paginatedTransactions;

    // Render page with pagination data
    res.render("wallet", {
      wallet,
      user,
      currentPage: page,
      totalPages,
      filter: req.query.filter || null, // if you plan to use filters later
    });
  } catch (error) {
    logger.error("Error fetching wallet:", error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .render("error", { message: MESSAGES.WALLET.SERVER_ERROR_WHILE_LOADING });
  }
};

export default { getWallet };
