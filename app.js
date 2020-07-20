var express = require("express");
var dotenv = require('dotenv').config();
var app = express();
var methodOverride = require("method-override");
var bodyparser = require("body-parser");
var passport = require("passport");
var LocalStrategy = require("passport-local");
var mongoose = require("mongoose");
var Blog = require("./models/blog");
var User = require("./models/user");
var Comment = require("./models/comment");
var multer = require('multer');
var storage = multer.diskStorage({
    filename: function (req, file, callback) {
        callback(null, Date.now() + file.originalname);
    }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter })

var cloudinary = require('cloudinary');
const blog = require("./models/blog");
cloudinary.config({
    cloud_name: 'ritikvyas',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


//  APP CONFIG
mongoose.connect("mongodb://localhost/restful_blog_app", { useNewUrlParser: true, useUnifiedTopology: true });
app.use(express.static("public")); //to serve our custom style-sheet
app.use(bodyparser.urlencoded({ extended: true })); //it gets the data from the form
app.use(methodOverride("_method")); //used for edit.ejs  HTML only supports GET and POST request in order to use other request like UPDATE, DELETE etc. we use methodoverride
app.locals.moment = require('moment');
//PASSPORT CONFIG
app.use(require('express-session')({
    secret: "This is a secret code",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
});

//  MONGOOSE/MODEL CONFIG



//  RESTFUL ROUTES

app.get("/", (req, res) => {
    res.render("landing.ejs");
});



app.get("/blogs", isLoggedIn, (req, res) => {
    Blog.find({}, (err, blogs) => {
        if (err) {
            console.log("ERROR!!");
        } else {
            res.render("index.ejs", { blogs: blogs });
        }
    });
});


app.get("/blogs/new", isLoggedIn, (req, res) => {
    res.render("new.ejs");
});

app.post("/blogs", upload.single('image'), (req, res) => {
    cloudinary.v2.uploader.upload(req.file.path, function (err, result) {
        // add cloudinary url for the image to the blog object under image property
        req.body.blog.image = result.secure_url;
        req.body.blog.imageId = result.public_id;
        Blog.create(req.body.blog, (err, blog) => {
            if (err) {
                req.render("new.ejs");
            } else {
                blog.author.id = req.user._id;
                blog.author.username = req.user.username;
                blog.save();
                res.redirect("/blogs/" + blog.id);
            }
        });
    });
});

app.get("/blogs/:id", (req, res) => {
    Blog.findById(req.params.id).populate("comments").exec((err, foundBlog) => {
        if (err) {
            res.redirect("/blogs");
        } else {
            console.log(foundBlog);
            res.render("show.ejs", { blog: foundBlog });
        }
    });
});







app.get("/blogs/:id/edit", userBlogOwnership, (req, res) => {
    Blog.findById(req.params.id, (err, foundBlog) => {
        if (err) {
            res.redirect("/blogs");
        } else {
            res.render("edit.ejs", { blog: foundBlog });
        }
    });
});


app.put("/blogs/:id", userBlogOwnership, upload.single('image'), (req, res) => {
    Blog.findByIdAndUpdate(req.params.id, req.body.blog, async function (err, blog) {
        if (err) {
            // req.flash("error", err.message);
            res.redirect("back");
        } else {
            if (req.file) {
                try {
                    await cloudinary.v2.uploader.destroy(blog.imageId);
                    var result = await cloudinary.v2.uploader.upload(req.file.path);
                    blog.imageId = result.public_id;
                    blog.image = result.secure_url;
                } catch (err) {
                    //req.flash("error", err.message);
                    return res.redirect("back");
                }
            }
            blog.title = req.body.blog.title;
            blog.body = req.body.blog.body;
            blog.save();
            //req.flash("success", "Successfully Updated!");
            res.redirect("/blogs/" + blog._id);
        }
    });
});


// BLOG DELETE
app.delete("/blogs/:id", userBlogOwnership, (req, res) => {
    Blog.findById(req.params.id, async function (err, blog) {
        if (err) {
            // req.flash("error", err.message);
            return res.redirect("back");
        }
        try {
            await cloudinary.v2.uploader.destroy(blog.imageId);
            blog.remove();
            //req.flash('success', 'Blog deleted successfully!');
            res.redirect('/blogs');
        } catch (err) {
            if (err) {
                //req.flash("error", err.message);
                return res.redirect("back");
            }
        }
    });
});


//Profile route
app.get("/:id/profile", isLoggedIn, (req, res) => {

    User.findById(req.params.id, function (err, foundUser) {
        if (err) {
            //req.flash("error", "Something went wrong.");
            return res.redirect("/");
        }
        Blog.find().where('author.id').equals(foundUser._id).exec(function (err, blogs) {
            if (err) {
                //req.flash("error", "Something went wrong.");
                return res.redirect("/");
            }
            res.render("profile.ejs", { user: foundUser, blogs: blogs });
        })
    });
});





//Settings Route
app.get("/settings", (req, res) => {
    res.render("settings.ejs");
});


//Comment Route
app.get("/blogs/:id", (req, res) => {

    if (err) {
        console.log("err");
    } else {
        res.render("show.ejs")
    }
});

app.post("/blogs/:id", isLoggedIn, (req, res) => {
    Blog.findById(req.params.id, (err, blog) => {
        if (err) {
            console.log(err)
        } else {
            Comment.create(req.body.comment, (err, comment) => {
                if (err) {
                    console.log(err)
                } else {
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    comment.save();
                    blog.comments.push(comment);
                    blog.save();
                    res.redirect("/blogs/" + blog._id);
                }
            });
        }
    });

});

//DELETE COMMENT
app.delete("/blogs/:id/:comment_id", isLoggedIn, (req, res) => {
    Comment.findByIdAndDelete(req.params.comment_id, (err, blog) => {
        if (err) {
            res.redirect("back");
        } else {
            res.redirect("/blogs/" + req.params._id);
        }
    });
});



// app.get("blogs/:id", (req, res) => {
//     Commnet.findById(req.params.id, (err, blog) => {
//         if (err) {
//             res.redirect("/blogs");
//         } else {
//             console.log(req.body.comment);
//         }
//     });
// });


//Auth Route
app.get("/register", isNotLoggedIn, (req, res) => {
    res.render("register.ejs");
})

app.post("/register", (req, res) => {
    var newUser = new User({ fullname: req.body.fullname, username: req.body.username })
    User.register(newUser, req.body.password, (err, user) => {
        if (err) {
            console.log(err);
            return res.render("register.ejs");
        }
        passport.authenticate("local")(req, res, () => {
            res.redirect("/login");
        })
    })
});



//Login Route
app.get("/login", isNotLoggedIn, (req, res) => {
    res.render("login.ejs");
})

app.post("/login", passport.authenticate("local",
    {
        successRedirect: "/blogs/home",
        failureRedirect: "/login"
    }), (req, res) => {

    });

//LOGOUT
app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");

});



//MIDDLEWARE

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.redirect("/login");
    }
}

function isNotLoggedIn(req, res, next) {
    if (!req.isAuthenticated()) {
        return next();
    } else {
        //req.flash("error", "You are already logged in");
        res.redirect("/blogs");
    };
};


function userBlogOwnership(req, res, next) {
    if (req.isAuthenticated()) {
        Blog.findById(req.params.id, (err, foundBlog) => {
            if (err) {
                res.redirect("back");
            } else {
                if (foundBlog.author.id.equals(req.user.id)) {
                    next();
                } else {
                    res.redirect("back");
                }
            }
        });
    } else {
        res.redirect("back");
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("YelpCamp Server started at port " + PORT));
