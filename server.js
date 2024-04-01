/*
CSC3916 HW2
File: Server.js
Description: Web API scaffolding for Movie API
 */

var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var Movie = require('./Movies');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

function getJSONObjectForMovieRequirement(req) {
    var json = {
        headers: "No headers",
        key: process.env.UNIQUE_KEY,
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
}

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'})
    } else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        user.save(function(err){
            if (err) {
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists.'});
                else
                    return res.json(err);
            }

            res.json({success: true, msg: 'Successfully created new user.'})
        });
    }
});

router.post('/signin', function (req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) {
            res.send(err);
        }

        user.comparePassword(userNew.password, function(isMatch) {
            if (isMatch) {
                var userToken = { id: user.id, username: user.username };
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json ({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, msg: 'Authentication failed.'});
            }
        })
    })
});

router.route('/movies')
    .get(authJwtController.isAuthenticated, (req, res) => {
        Movie.find({}, (err, movie) => {
            if (err) {
                res.status(500).send(err);
            } else {
                res.status(200).json(movie);
            }
        });
    })

    .post(authJwtController.isAuthenticated, (req, res) => {
        if (!req.body.title || !req.body.releaseDate || !req.body.genre || !req.body.actors) {
            return res.status(500).send({msg: 'Error: Missing Information'})
        }
        else {
            var nMovie = new Movie();
            nMovie.title = req.body.title;
            nMovie.releaseDate = req.body.releaseDate;
            nMovie.genre = req.body.genre;
            nMovie.actors = req.body.actors;

            nMovie.save((err) => {
                if (err) {
                    res.status(500).send(err);
                }
                else{
                    res.status(200).send({msg: 'New Movie Successfully Saved'});
                }
            });

        }
    })

router.route('/movies/:title')
    .get(authJwtController.isAuthenticated, (req, res) => {
        Movie.find({title: req.params.title}, (err, movie) => {
                if (req.queries.reviews == true) {
                    Movie.aggregate([
                        {
                          $match: { _id: mongoose.Types.ObjectId(movieId) }
                        },
                        {
                          $lookup: {
                            from: "reviews",
                            localField: "_id",
                            foreignField: "movieID",
                            as: "MovieAndReviews"
                          }
                        }
                      ]).exec(function(err, result) {
                        if (err) {
                          // handle error
                        } else {
                          console.log(result);
                        }
                      });
                      
                }
                if (err) {
                    res.status(500).send(err);
                } else {
                    res.status(200).send(movie);
                }
            });
    })

    .put(authJwtController.isAuthenticated, (req, res) =>{
        Movie.findOneAndUpdate({title: req.params.title}, req.body, {new: true}, (err) => {
            if (err) {
                res.status(500).send(err);
            } else {
                res.status(200).send({msg: 'Movie Successfully Updated'});
            }
        });
    })

    .delete(authController.isAuthenticated, (req, res) => {
        Movie.findOneAndDelete({title: req.params.title}, (err) => {
            if (err) {
                res.status(500).send(err);
            }
            else {
                res.status(200).send({msg: 'Movie Successfully Deleted'})
            }
        });
    })

router.route('/reviews')
    .get(authController.isAuthenticated, (req, res) => {
        Review.find({}, (err, review) => {
            if (err) {
                res.status(500).send(err);
            } else {
                res.status(200).json(review);
            }
        });
    })

    .post(authJwtController.isAuthenticated, (req, res) => {
        if (!req.body.movieID || !req.body.username || !req.body.review || !req.body.rating) {
            return res.status(500).send({msg: 'Error: Missing Information'})
        }
        else {
            var nReview = new Review();
            nReview.movieID = req.body.movieID;
            nReview.username = req.body.username;
            nReview.review = req.body.review;
            nReview.rating = req.body.rating;

            nReview.save((err) => {
                if (err) {
                    res.status(500).send(err);
                }
                else{
                    res.status(200).send({msg: 'Review Created!'});
                }
            });

        }
    })

app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


