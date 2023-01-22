const express = require('express');
const User = require('../models/userModel');

var upload = require('../middleware/Multer');

const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');


const JWT_SECRET = 'iiitv-icd';

// ROUTE 1: Create a User using: POST "/api/createuser". No login required
router.post('/signupuser', upload.single("image"), [
  body('name', 'Enter a valid Last name').isLength({ min: 3 }),
  body('email', 'Enter a valid email').isEmail(),
  body('number', 'Enter a valid Mobile').isLength({ min: 9 }),
  body('password', 'Password must be atleast 5 characters').isLength({ min: 5 }),
  body('institute', 'institute name must be atleast 5 letters').isLength({ min: 5 }),
], async (req, res) => {
  // If there are errors, return Bad request and the errors
  console.log("  Hr0");
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({errors: errors.array() });
  }
  if(req.file){

	console.log("  Hr");
	// console.log(req.file.path+"  Hr");
	console.log("  Hr");
    var filepath = req.file.path;

  }
  try {
    // Check whether the user with this email exists already
    let user = await User.findOne({ email: req.body.email });
    if (user) {
      return res.status(400).json({ error: "Sorry a user with this email already exists" })
    }
    const salt = await bcrypt.genSalt(10);
    const secPass = await bcrypt.hash(req.body.password, salt);

    // Create a new user
    user = await User.create({
      name: req.body.name,
      email: req.body.email,
      number: req.body.number,
      institute: req.body.institute,
      password: secPass,
      image: filepath
    });
    const data = {
      user: {
        id: user.id
      }
    }
    const authtoken = jwt.sign(data, JWT_SECRET);
    console.log(authtoken);
    let success = true;

    // res.json(user)
    res.json({ success, authtoken })
    console.log("Signed up");


  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
})


router.post('/loginuser', [
  body('email', 'Enter a valid email').isEmail(),
  body('password', 'Password must be atleast 5 characters').isLength({ min: 5 }),
], async (req, res) => {
  // If there are errors, return Bad request and the errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({errors: errors.array() });
  }
  const { email, password} = req.body;

  try {
    let success = false;
    // Check whether the user with this email exists already
    let user = await User.findOne({ email });
    if (!user) {
      success = false
      return res.status(400).json({ error: "Please try to login with correct credentials" });
    }

    const passwordCompare = await bcrypt.compare(password, user.password);
    if (!passwordCompare) {
      success = false
      return res.status(400).json({ success, error: "Please try to login with correct credentials" });
    }
console.log("loggedin")
    const data = {
      user: {
        id: user.id
      }
    }
    const authtoken = jwt.sign(data, JWT_SECRET);
    console.log(authtoken);
    success = true;
    res.json({ success, authtoken })

  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
})

module.exports = router;