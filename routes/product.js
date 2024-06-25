const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Product = require("../models/product");
const Categorias = require("../models/categorias");
const Reviews = require("../models/reviews");
const Users = require("../models/user");
const isLoggedIn = require("../middlewares/isLoggedIn");
const isAdmin = require("../middlewares/isAdmin");
const multer = require("multer");
const previousUrl = require("../middlewares/previousUrl");
const path = require("path");
const fs = require("fs");
const currentUrl = require("../middlewares/currentUrl");
const { v4: uuid } = require("uuid");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname,"/uploads/product"));
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString().replace(/:/g, '-')+ file.originalname);
  },
});

const upload = multer({ storage: storage });
router.get("/", currentUrl, async (req, res) => {
  try {
    const cat = await Categorias.find({});
    const data = await Product.find({});
    res.render("products/index", { data, cat });
  } catch (err) {
    console.log(err);
    res.status(404).render("error/error", { status: "404" });
  }
});

router.get("/bookAll", currentUrl, async (req, res) => {
  try {
    
    const data = await Product.find({});
    res.render("products/navegacion/all", { data });
  } catch (err) {
    console.log(err);
    res.status(404).render("error/error", { status: "404" });
  }
});


router.get("/buscar", currentUrl, async (req, res) => {
try {
    const dato = req.query.buscar
    const data = await Product.find({name: {$regex: '.*'+dato+'.*',$options: "i"}});
    res.render("products/navegacion/all", { data })
} catch (err) {
  console.log(err);
  res.status(404).render("error/error", { status: "404" });
}
});

router.get("/novedades",currentUrl, async(req, res) => {
  try {
    const fechaActual = new Date('2024-03-01T08:30:00Z');
    const fechFinal = new Date('2024-05-30T08:30:00Z')
    const data = await Product.find({ created_at: { $gte: fechaActual, $lte: fechFinal} }).sort({ created_at: 1 }); 
    res.render('products/navegacion/Novedades', { data }); 
  } catch (err) {
    console.log(err);
    res.status(404).render("error/error", { status: "404" });
  }
});

router.get("/buscarCategoria", currentUrl, async (req, res) => {
  try {
      const cat = await Categorias.find({});
      const dato = req.query.buscar
      const data = await Product.find({categoria: {$regex: '.*'+ dato +'.*',$options: "i"}});
      res.render("products/navegacion/Categorias",  { cat , data })
  } catch (err) {
    console.log(err);
    res.status(404).render("error/error", { status: "404" });
  }
  });

router.get("/categorias", currentUrl, async (req, res)=>{
  try {
    const cat = await Categorias.find({});
    const data = await Product.find({});
    res.render('products/navegacion/Categorias', {data , cat } );
  } catch (err) {
    console.log(err);
    res.status(404).render("error/error", { starus: "404" });
  }
});

router.get("/products/new", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const cat = await Categorias.find({});
    res.render("products/new", {cat});
  } catch (e) {
    console.log(e);
    res.status(404).render("error/error", { status: "404" });
  }
});
router.post("/products/new",isLoggedIn,isAdmin,upload.single("image"),async (req, res) => {
    try {
      let data = req.body;
      if(data.price<=Number(100000)){
      let file;
      try {
        console.log(req.file.path);
        file = path.join(__dirname,"/uploads/product/" + req.file.filename);
        data.image = { data: fs.readFileSync(file), contentType: "image/png" };
      } catch {
        data.image = null;
      }
      await Product.create(data);
     
      req.flash("status", "Artículo añadido correctamente!!");
      res.redirect("/admin/products");
    }
    else{
      req.flash('error',"No se puede fijar un precio superior a 100000");
      res.redirect("/products/new")
    }
    } catch (e) {
      console.log(e);
      res.status(404).render("error/error", { status: "404" });
    }
  }
);

router.get("/products/:id", currentUrl, async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Product.findById(id).populate("reviews");
    res.render("products/item", { data });
  } catch (e) {
    console.log(e);
    res.status(404).render("error/error", { status: "404" });
  }
});
router.get("/products/:id/edit", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Product.findById(id);
    res.render("products/edit", { data });
  } catch (e) {
    console.log(e);
    res.status(404).render("error/error", { status: "404" });
  }
});
router.patch("/products/:id",isLoggedIn,isAdmin,upload.single("image"),async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      if(data.price<=Number(100000)){
          if (req.file != undefined) {
            let file = path.join(
              __dirname + "/uploads/product/" + req.file.filename
            );
            data.image = {
              data: fs.readFileSync(path.join(file)),
              contentType: "image/png",
            };
          }
          await Product.findByIdAndUpdate(id, data);

          console.log("Database updated");
          req.flash("status", "Se han editado los detalles del artículo y se ha conseguido");
          res.redirect("/admin/products");
        }
        else{
          req.flash('error',"No se puede fijar un precio superior a 100000");
          res.redirect(`/products/${id}/edit`)
        }
    } catch (e) {
      console.log(e);
      res.status(404).render("error/error", { status: "404" });
    }
  }
);
router.delete("/products/:id/delete", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleting = await Product.findById(id);
    await Product.findByIdAndDelete(id);
    console.log("Product Deleted...");
    req.flash(
      "status",
      `El artículo "${deleting.name}"se ha eliminado correctamente..`
    );
    res.redirect("/admin/products");
  } catch (e) {
    res.status(404).render("error/error", { status: "404" });
  }
});
router.post("/products/:id/reviews", isLoggedIn, async (req, res) => {
  try {
    // console.log("\n\n\n\n\n\nThis is the reviews request \n\n\n\n\n")
    // console.log(req)
    const data = req.body;
    data.user = req.user.username;
    data.date = Date.now();
    const { id } = req.params;
    //Finding the Product Object
    const productObj = await Product.findById(id);
    //Creating an object of the Reviews Model having the data value as productId, to which chnages will be made
    const reviewObj = new Reviews(data);
    //Automaticaly Pushes Only the Object id inside the Array [as mentioned in the schema]
    productObj.reviews.push(reviewObj);
    //Product is updated and then saved in Data base;
    await productObj.save();
    //reviewObj is a object that is then saved in data base;
    await reviewObj.save();
    console.log("Comentario guardado en la base de datos");
    req.flash("success","Su opinión se ha añadido correctamente !")
    res.redirect(`/products/${id}`);
  } catch (e) {
    res.status(404).render("error/error", { status: "404" });
  }
});

//Creating a middlewasre that authenticates review changes of operations
const reviewChange = async (req, res, next) => {
  const userReview = await Reviews.findById(req.params.rev_id);

  if (userReview.user == req.user.username) next();
  else {
    req.session.previousUrl = req.headers.referer;
    req.flash("login", "Usted no está autorizado para esta operación");
    res.redirect(req.session.previousUrl);
  }
};

router.get(
  "/products/:id/reviews/:rev_id",
  isLoggedIn,
  reviewChange,
  async (req, res) => {
    try {
      const { id, rev_id } = req.params;
      try {
        const data = await Reviews.findById(rev_id);
        res.render("reviews/edit", { data, id, rev_id });
      } catch (e) {
        req.flash("error", "Lo sentimos Hemos encontrado un problema");
        res.redirect(`/products/${id}`);
      }
    } catch (e) {
      res.status(404).render("error/error", { status: "404" });
    }
  }
);
router.patch("/products/:id/reviews/:rev_id", isLoggedIn, async (req, res) => {
  try {
    const { id, rev_id } = req.params;
    const data = req.body;
    data.date = Date.now();
    try {
      await Reviews.findByIdAndUpdate(rev_id, data);
      req.flash("success", "Su comentario se ha actualizado correctamente");
      res.redirect(`/products/${id}`);
    } catch (e) {
      req.flash("error", "Ha habido un problema al actualizar tu comentario");
      res.redirect(`/products/${id}`);
    }
  } catch (e) {
    res.status(404).render("error/error", { status: "404" });
  }
});
router.delete("/products/:id/reviews/:rev_id", isLoggedIn, async (req, res) => {
  try {
    const { id, rev_id } = req.params;
    try {
      await Reviews.findByIdAndDelete(rev_id);
      req.flash("success", "Su comentario se ha eliminado correctamente");
      res.redirect(`/products/${id}`);
    } catch (e) {
      req.flash("error", "Ha habido un problema al actualizar tu comentario");
      res.redirect(`/products/${id}`);
    }
  } catch (e) {
    res.status(404).render("error/error", { status: "404" });
  }
});
module.exports = router;
