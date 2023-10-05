//jshint esversion:
import 'dotenv/config'
import express from "express"
import mongoose from "mongoose"
import bodyParser from "body-parser"
import path from "path"
import session from "express-session"
import passport from "passport"
import passportLocalMongoose from "passport-local-mongoose"

const app = express();
const port = 3000;
const __dirname = path.resolve();
const secret = process.env.SECRET;


// Middleware
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
// Setting up our session
app.use(session({
    secret: secret,
    resave: false,
    saveUninitialized: false
}));

// Setting up Passport
app.use(passport.initialize());
app.use(passport.session());

// Database
mongoose.connect("mongodb://127.0.0.1/userDB", {useNewUrlParser: true});
const userSchema = new mongoose.Schema({
    username: String, 
    password: String,
    notes: [{
        title: String,
        content: String,
    }]
});


// Encryption
userSchema.plugin(passportLocalMongoose);
const User = mongoose.model("User", userSchema);


// Passport
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


// Home Route
app.get("/", (req, res) =>{
    if (req.isAuthenticated()) {
        res.render("home.ejs", {currentUser: req.user, currentUrl: req.originalUrl, userNotes: req.user.notes})
    } else {
        res.render("home.ejs", {currentUrl: req.originalUrl});
    }
})


// Login Route
app.get("/login", (req, res) =>{
    res.render("login.ejs", {currentUrl: req.originalUrl});
})

app.post('/login', function(req, res, next) {
    // Username and Password are passed automatically from the post request
    passport.authenticate('local', function(err, user, info) {
      if (err) { return next(err); }
      if (!user) {
        // Authentication failed, render the login view with an error message
        return res.render('login.ejs', { msg: "Wrong password, please try again.", currentUrl: req.originalUrl });
      }
      req.logIn(user, function(err) {
        if (err) { return next(err); }
        // Authentication successful, redirect to the desired route
        return res.redirect('/');
      });
    })(req, res, next);
  });


// Register Route
app.get("/register", (req, res) =>{
    res.render("register.ejs", {currentUrl: req.originalUrl});
})
app.post("/register", (req, res) => {
    User.register({username: req.body.username}, req.body.password).then(()=>{
        passport.authenticate("local")(req,res, function(){
            res.redirect("/login");
        })
    }).catch((err)=>{
            console.log(err)
            res.redirect("/register")
        });
})

// Notes Route
app.get("/notes", (req, res)=>{
    if (req.isAuthenticated()) {
        res.render("notes.ejs", {name: req.user.username, currentUser: req.user, currentUrl: req.originalUrl, userNotes: req.user.notes})
    } else {
        res.redirect("/login")
    }
})


// Logout Route
app.get("/logout", (req, res)=>{
    req.logout(function(err) {
        if(err) {
            console.log(err);
            next();
        }
        else {
            res.redirect("/");
        }
    });
})

// Delete Route
app.get("/notes/:noteId", (req, res) => {
    const userId = req.user._id
    const noteIdToDelete = req.params.noteId

    if (req.isAuthenticated()) {
        User.findById(userId).then((foundUser)=>{
            const noteIndex = foundUser.notes.findIndex((note) => note._id == noteIdToDelete);
            foundUser.notes.splice(noteIndex, 1);
            return foundUser.save();
        }).then(()=>{
            res.redirect("/notes")
        }).catch((err)=>{
            console.log(err);
            res.redirect("/create")
        })
    }
});


// Create Route
app.get("/create", (req, res)=>{
    if (req.isAuthenticated()) {
        res.render("create.ejs", {currentUser: req.user, currentUrl: req.originalUrl})
    } else {
        res.redirect("/login")
    }
})

// Post Note Route
app.post("/create", (req, res)=>{
    if (req.isAuthenticated()) {
        const note = {
            title: req.body.title,
            content: req.body.textarea
        };

        User.findById(req.user._id).then((foundUser)=>{
            foundUser.notes.push(note);
            return foundUser.save();
        }).then(()=>{
            res.redirect("/notes")
        }).catch((err)=>{
            console.log(err);
            res.redirect("/create", {currentUser: req.user})
        })
    }
});


// Port
app.listen(port, ()=>{
    console.log(`Listening on port: ${port}`);
})

