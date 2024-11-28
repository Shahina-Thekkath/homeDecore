const Category = require("../../models/categorySchema");

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
      return res.status(400).json({ message: "Category already exist" });
    }

    const newCategory = new Category({
      name,
    });

    await newCategory.save();
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Internl Server Error" });
  }
};

const getEditCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Fetch the category data from the database by ID
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).render("pageerror");
    }

    // Render the editCategory view with the fetched data
    res.render("editCategory", {
      category, // Pass category data to the EJS template
    });
  } catch (err) {
    console.error("Error fetching category:", err);
    res.status(500).render("pageerror");
  }
};

const editCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    const name = req.body.name;

    const catId = await Category.findById(categoryId);

    if(catId.name === name){
      return res.status(400).json({ message: "Changes not made" });
    }

    const existingCategory = await Category.findOne({ name });

    if (existingCategory) {
      return res.status(400).json({ message: "Category already exist" });
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
      errorMessage: "An error occurred while updating the category.",
      category: req.body, // Retain entered data for user convenience
    });
  }
};

const blockCategory = async (req, res) => {
    console.log("block",req.params.id);
try {
 const categoryId = req.params.id;

 const category = await Category.findByIdAndUpdate(categoryId, { isBlocked: true });
 

 if (!category) {
     return res.status(404).json({ success: false});
 }
 res.status(200).json({ success: true });
} catch (error) {
 console.error("Error blocking category:", error);
 res.status(500).json({ success: false });
}
};


const unblockCategory = async (req, res) => {
  console.log("unblock",req.params.id);
try {
 const categoryId = req.params.id;
 const category = await Category.findByIdAndUpdate(categoryId, { isBlocked: false });

 if (!category) {
     return res.status(404).json({ success: false });
 }
 res.status(200).json({ success: true});
} catch (error) {
 console.error("Error unblocking category:", error);
 res.status(500).json({ success: false });
}
};

module.exports = {
  categoryInfo,
  addCategory,
  getAddCategory,
  editCategory,
  getEditCategory,
  unblockCategory,
  blockCategory
};
