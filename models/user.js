var mongoose = require("mongoose");
var passportlocalmongoose = require("passport-local-mongoose");
var UserSchema = new mongoose.Schema({
    fullname: String,
    username: String,
    password: String

});
UserSchema.plugin(passportlocalmongoose);
module.exports = mongoose.model("User", UserSchema);