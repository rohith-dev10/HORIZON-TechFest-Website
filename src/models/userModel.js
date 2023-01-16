const mongoose = require('mongoose');
const ObjectID = mongoose.Types.ObjectId;

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    number: {
        type: Number,
    },
    institute: {
        type: String,
    },
    password: {
        type: String,
        required: true,
    },
    image: {
        type: String,
    },
    participation: {
        type: [{
            eventid: {
                type:ObjectID,
                required:true
            },
            eventname:{
                type: String,
                required: true,
            },
            teamid: {
                type:ObjectID,
            },
            teamname:{
                type: String
            }
        }],
        default:[]
    }
}, { timestamps: true })

module.exports = mongoose.model('User', UserSchema)