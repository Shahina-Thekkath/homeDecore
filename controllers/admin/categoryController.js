const Category = require("../../models/categorySchema");
const { STATUS_CODES, MESSAGES } = require("../../constants");

const categoryInfo = async (req, res) => {
  try {
    const currentPage = parseInt(req.query.page) || 1;
    const search = req.query.search || '';
    const limit = 10; 
    const skip = (currentPage - 1) * limit;

    const searchQuery = search ? {
        $or: [
            { name: new RegExp(search, 'i') },
           
        ]
    } : {};

    const categoryData = await Category.find({...searchQuery})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCategories = await Category.countDocuments({...searchQuery});

    const totalPages = Math.ceil(totalCategories / limit);

    res.render("categoryList", {
      cat: categoryData,
      currentPage,
      totalPages,
      baseUrl: "/admin/category",
      search
    
    });
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
};

const getAddCategory = async (req, res) => {
  try {
    res.render("addCategory");
  } catch (error) {
    res.redirect("/admin/pageerror");
  }
};

const addCategory = async (req, res) => {
  const { name } = req.body;
  try {
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.CATEGORY.ALREADY_EXISTS });
    }

    const newCategory = new Category({
      name,
    });

    await newCategory.save();
    return res.json({ ok: true });
  } catch (error) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.GENERIC.INTERNAL_ERROR });
  }
};

const getEditCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Fetch the category data from the database by ID
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(STATUS_CODES.NOT_FOUND).render("pageerror");
    }

    // Render the editCategory view with the fetched data
    res.render("editCategory", {
      category, // Pass category data to the EJS template
    });
  } catch (err) {
    console.error("Error fetching category:", err);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).render("404Error");
  }
};

const editCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    const name = req.body.name;

    const catId = await Category.findById(categoryId);

    if(catId.name === name){
      return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.CATEGORY.NO_CHANGES });
    }

    const existingCategory = await Category.findOne({ name });

    if (existingCategory) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.CATEGORY.ALREADY_EXISTS });
    }

    const updated = { name: name };

    const newCategory = await Category.findByIdAndUpdate(
      categoryId,
      { $set: updated },
      { new: true }
    );

    if (newCategory) {
      return res.json({ ok: true });
    }
  } catch (error) {
    console.error("Error updating category:", error);
    res.render("editCategory", {
      errorMessage: MESSAGES.CATEGORY.UPDATE_ERROR,
      category: req.body, // Retain entered data for user convenience
    });
  }
};

const blockCategory = async (req, res) => {
try {
 const categoryId = req.params.id;

 const category = await Category.findByIdAndUpdate(categoryId, { isBlocked: true });
 

 if (!category) {
     return res.status(STATUS_CODES.NOT_FOUND).json({ success: false});
 }
 res.status(STATUS_CODES.OK).json({ success: true });
} catch (error) {
 console.error("Error blocking category:", error);
 res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false });
}
};


const unblockCategory = async (req, res) => {
try {
 const categoryId = req.params.id;
 const category = await Category.findByIdAndUpdate(categoryId, { isBlocked: false });

 if (!category) {
     return res.status(STATUS_CODES.NOT_FOUND).json({ success: false });
 }
 res.status(STATUS_CODES.OK).json({ success: true});
} catch (error) {
 console.error("Error unblocking category:", error);
 res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false });
}
}



module.exports = {
  categoryInfo,
  addCategory,
  getAddCategory,
  editCategory,
  getEditCategory,
  unblockCategory,
  blockCategory
};
