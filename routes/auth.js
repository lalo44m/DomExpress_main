const nodemailer = require('nodemailer');
const Recaptcha = require('google-recaptcha');
const express = require("express");
const router = express.Router();
const User = require("../models/user");
const passport = require("passport");
const previousUrl = require("../middlewares/previousUrl");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const isLoggedIn=require("../middlewares/isLoggedIn")
const currentUrl = require("../middlewares/currentUrl");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname,"/uploads/users"));
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString().replace(/:/g, '-')+ file.originalname);
  },
});

const upload = multer({ storage: storage });

const recaptcha = new Recaptcha({ secret: '6LcLr5slAAAAAMi5S06BGPrd9Rv7W' });


const validarActivo= async(req,res,next)=>{
  const {id} = req.params;
  await User.find(id, {verificado: false}, (error, result)=> {
    if (req.user.verificado == false) {
      req.logout();
    }
  })
}

//Correo 
var transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
  user: 'domotiquexperience@gmail.com',
  pass: 'ekon jdmf fdwi btzt'
  }
});




router.post("/register", upload.single("image"), async (req, res) => {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    let oData = req.body

    const userObj = new User({
      username: req.body.username,
      email: req.body.email,
      telefono: req.body.telefono,
      codePass: 0,
      codeNuevo: code,
      nombreCompleto: req.body.nombreCompleto
    });

    let file;
    try {
      file = path.join(__dirname,"/uploads/users/" + req.file.filename);
      userObj.image = {
        data:  fs.readFileSync(file),
        contentType: "image/png",
      };
      
    } catch (e) {
      userObj.image = null;
    }

            // ********   VALIDACION reCAPCHA
            // const recaptchaToken = oData['g-recaptcha-response'];
            // let secret = "6LefrZwlAAAAAHcdRiK3lzMKfNBcD5l5Vckulx_i ";
    
            // const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${recaptchaToken}`;
            // const response = await fetch(url, {
            //   method: 'POST'
            // });
            // const data = await response.json();
    
            // ************
    

    const mailOptions = {
      from: 'domotiquexperience@gmail.com',
      to: userObj.email,
      subject: `VERIFICA TU CUENTA - @${userObj.username}`,
      text: "Viviendo la innovación en cada rincón",
      html: `
      <h1>Bienvenido a DomXpress</h1>
      <h2>Te damos la bienvenida: ${userObj.nombreCompleto}</h2>
      <p>Tu codigo de verificación es: ${userObj.codeNuevo}</p>
      <p>Este código es fundamental para acceder por primera vez a la aplicación.</p>
      <img src="../images/logo.svg" alt="Imagen de DomXpress">`
    };

    await User.find({email: userObj.email}, async function (error, result) {
      if (result == undefined || result == null || result[0] == null) {
        if (req.body.password == req.body.pwd2) {  
          const enviarEmail = transporter.sendMail(mailOptions, function(error, info){
          if (error) {
            console.log(error);
          } else {
            console.log('Email enviado: ' + info.response);
          }   
          });
  
          User.register(userObj, req.body.password);
          enviarEmail;
          req.flash("login", "Usuario registrado correctamente, inicie sesión para continuar");
          req.flash("login", "Se ha enviado un correo electrónico que contiene el código de acceso necesario para acceder.");
          res.redirect("/login");

          }else{
            req.flash("error","Las contraseñas no coinciden");
            res.redirect("/register")
          };
      }else{
        if (userObj.email == result[0].email) {
          req.flash("register","El correo ya existe")
          res.redirect("/register")    
        } else {

        }
      }
        });
  } catch (err) {
    console.log(err)
    req.flash("register", "La dirección de correo electrónico o el nombre de usuario que ha proporcionado ya están en uso.");
    res.redirect("/register");
  }
});

router.get('/autocomplete', function(req, res) {
  var rutas = [
    { label: 'Todos los Productos', value: '/bookAll' },
    { label: 'Inicio', value: '/' },
    { label: 'Novedades', value: '/novedades' },
    { label: 'Categorias', value: '/categorias' },
  ];
  res.send(rutas);
});
router.get("/register", 
(req, res, next) => {
  try {
    if (req.isAuthenticated()) {
      req.flash("error", "Ya está conectado");
      let redirect = "/";

      
      res.redirect(redirect);
    } else next();
  } catch (e) {
    console.log(e);
    res.status(404).render("error/error.ejs", { status: "404" });
  }
}, async (req, res) => {
  try {
    res.render("authentication/register");
  } catch (e) {
    console.log(e);
    res.status(404).render("error/errorerror.ejs", { status: "404" });
  }
});

router.get(
  "/login",
  (req, res, next) => {
    try {
      if (req.isAuthenticated()) {
        req.flash("error", "Ya está conectado");
        let redirect = "/";

        
        res.redirect(redirect);
      } else next();
    } catch (e) {
      console.log(e);
      res.status(404).render("error/error.ejs", { status: "404" });
    }
  },
  async (req, res) => {
    try {
      res.render("authentication/login");
    } catch (e) {
      res.status(404).render("error/error.ejs", { status: "404" });
    }
  }
);

router.get("/verificar",previousUrl, isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const data = await User.findById(id);
    res.render("authentication/verificar", {data});
  } catch (err) { 
    console.log(err);
    res.status(404).render("error/error", { status: "404" });
  }
});

router.patch("/verificar/:id", async (req, res) => { //codeNuevo
  try {
    const { id } = req.params;
    const data = req.body.codeNuevo;

    if (data == req.user.codeNuevo) {
      await User.findByIdAndUpdate(id, {verificado: true});
      res.redirect("/");
    } else {
      console.log("Error")
      req.flash("error", "Código de verificación incorrecto");
      res.redirect("/salir")
    }
  } catch (err) {
    console.log(err);
    res.status(404).render("error/error", { status: "404" });
  }
});

router.get("/salir", function (req, res) {
  try {
    req.flash("login", "Usuario desconectado");
    req.logout();
    res.redirect("/login");
  } catch (e) {
    console.log(e);
    res.status(404).render("error/error", { status: "404" });
  }
});

router.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (req, res) => {
    try {
      if (req.user.verificado == false) {
        req.flash("error", `Cuenta no verificada, revise su bandeja de entrada`);
        res.redirect('/verificar')

      } else {
        req.flash("login", `Bienvenido de nuevo "${req.user.username}" `);
        // req.session.requestedUrl ||
        let redirect = req.session.previousUrl || "/"; 
        res.redirect(redirect);
      }
    } catch (e) {
      console.log(e);
      res.status(404).render("error/error", { status: "404" });
    }
  }
);
router.get("/logout", function (req, res) {
  try {
    req.flash("login", "Usuario desconectado");
    req.logout();
    let redirect = req.session.previousUrl || "/";
    res.redirect(redirect);
  } catch (e) {
    console.log(e);
    res.status(404).render("error/error", { status: "404" });
  }
});

//Google Authentication Routes
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  function (req, res) {
    try {
      // Successful authentication, redirect home.
      // let redirect=req.session.requestedUrl || req.session.previousUrl|| '/';
      console.log("Introducido en la autenticación de google");
      let redirect = req.session.previousUrl || "/";
      res.redirect(redirect);
    } catch (e) {
      console.log(e);
      res.status(404).render("error/error", { status: "404" });
    }
  }
);


router.get("/rPass", 
(req, res, next) => {
  try {
    if (req.isAuthenticated()) {
      req.flash("error", "Ya está conectado");
      let redirect = "/";

      
      res.redirect(redirect);
    } else next();
  } catch (e) {
    console.log(e);
    res.status(404).render("error/error", { status: "404" });
  }
}, async (req, res) => {
  try {
    //res.render("authentication/rPass");
    res.render("authentication/rPass");
  } catch (e) {
    console.log("Error en la ruta");
    console.log(e);
    res.status(404).render("error/error", { status: "404" });
  }
});

router.post("/rPass", async (req, res) => {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
// ********   VALIDACION reCAPCHA
// let oData = req.body
// const recaptchaToken = oData['g-recaptcha-response'];
// let secret = "6LefrZwlAAAAAHcdRiK3lzMKfNBcD5l5Vckulx_i ";

// const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${recaptchaToken}`;
// const response = await fetch(url, {
//   method: 'POST'
// });
// const data = await response.json();

// ************
    const correo  = req.body.email;
    // if (!data.success) {
    //   req.flash("error", "reCAPTCHA invalido, Acaso no eres un humano!");
    //   res.redirect("/rPass");
    // }else{
    await User.find({email: correo}, async function (error, result) {
      if (result == undefined || result == null || result[0] == null) {
        req.flash("error", "El correo no esta registrado a DomXpress")
        res.redirect('/login');
      }else{
      if (correo == result[0].email) {
        const mailOptions = {
            from: 'domotiquexperience@gmail.com',
            to: result[0].email,
            subject: `Recuperar tu Contraseña`,
            html: `
            <h1>Recuperar Constraseña</h1>
            <p>Tu código de recuperación: ${code}</p>
            <p>Con este código podrás recuperar tu contraseña</p>
            <img src="../images/logo.svg">`
          };
  
          const enviarEmail = transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } else {
              console.log('Email enviado: ' + info.response);
            }
      })
        const id = result[0]._id
        const p = await User.findByIdAndUpdate({_id: id}, {$set: {codePass: code}})
        console.log(p, enviarEmail);
        req.flash("Código Enviado, Revisa tu bandeja de entrada")
        res.redirect("/rPass")
      }else{
        console.log(error)
        req.flash("error", "Error")
        res.redirect("/rPass")
      }
      if (error) {
        console.log(error)
        req.flash("error", "Error")
        res.redirect("/rPass")
      }
    }
    })
  // }
  } catch (err) { 
    console.log(err);
    res.flash("error", "Correo inválido");
    res.redirect("/rPass")
  }
});

router.post("/rPassUpdate", async (req, res)=>{
  try {

// ********   VALIDACION reCAPCHA
// let oData = req.body
// const recaptchaToken = oData['g-recaptcha-response'];
// let secret = "6LefrZwlAAAAAHcdRiK3lzMKfNBcD5l5Vckulx_i ";

// const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${recaptchaToken}`;
// const response = await fetch(url, {
//   method: 'POST'
// });
// const data = await response.json();

// ************

    const codigo = req.body.codePass;
    const correo = req.body.email;
    const pass = req.body.password;
    // if (!data.success) {
    //   req.flash("error", "reCAPTCHA invalido, Acaso no eres un humano!");
    //   res.redirect("/rPass");
    // }else{
    await User.find({email: correo}, async function (error, result) {
      if (result == undefined || result == null || result[0] == null) {
        req.flash("error","El correo no esta registrado a DomXpress");
        res.redirect("/rPass")
      } else {
        console.log("Exito");
        if (correo == result[0].email) {
          console.log("El email existe");
          if (codigo == result[0].codePass) {
            console.log("El codigo es correcto");
              if (pass == req.body.pwd2) {
                const mailOptions = {
                  from: 'domotiquexperience@gmail.com',
                  to: result[0].email,
                  subject: `Constraseña restablecida`,
                  html: `
                  <h1>Constraseña reestableciada</h1>
                  <p>Has actualizado la Constraseña</p>
                  <img src="/public/images/logo.svg">`
                };

                const enviarEmail = transporter.sendMail(mailOptions, function(error, info){
                  if (error) {
                    console.log(error);
                  } else {
                    console.log('Email enviado: ' + info.response);
                  }
                });

                console.log("pass correcta");
                await result[0].setPassword(req.body.password);
                await result[0].save();
                enviarEmail;
                console.log(result)
                req.flash("success", "Todo es correcto");
                res.redirect("/login")
              }else{
                req.flash("error","Las Constraseñas no coinciden");
                res.redirect("/rPass")
              };
            }else{
              req.flash("error","Codigo de verificacion incorrecto");
              res.redirect("/rPass")
            }
        } else {
          req.flash("error","Este correo no existe")
          res.redirect("/rPass")
        }
      };
    });
  
  // }
  } catch (error) {
      res.flash("error", "Error de sistema");
      res.redirect("/rPass")
  }
});


module.exports = router;
