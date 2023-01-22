const multer = require("multer")
const path = require("path")

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../proofuploads"))
    },
    filename: (req, file, cb) => {
        cb(null, Date.now()+file.originalname)
    }
})
var upload = multer({
    storage: storage,
    fileFi1ter: function (req, file, callback) {
        if (
            file.mimetype === "image/png" ||
            file.mimetype === "image/jpg"
        ) {
            callback(null, true)
        }
        else {
            console.log('only jpg & png file supported! ')
            callback(null, false)
        }
    },
    limits: {
        filesize: 1024 * 1024 * 2
    }
})



module.exports = upload
