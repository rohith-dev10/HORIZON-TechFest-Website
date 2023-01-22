const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const users = require("../models/userModel");
const teams = require("../models/teamModel");
const events = require("../models/eventModel");
const fetchuser = require("../middleware/FetchUser");
var upload = require('../Middleware/Multer');

const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
const JWT_SECRET = 'iiitv-icd';


const { isValidObjectId, mailRegex, isValid, teamnameRegex } = require("../validators/validations");


// ROUTE 1: Create a User using: POST "/api/createuser". No login required
router.post('/signupuser',[
	body('name', 'Enter a valid Last name').isLength({ min: 3 }),
    body('email', 'Enter a valid email').isEmail(),
    body('number', 'Enter a valid Mobile').isLength({ min: 9 }),
    body('password', 'Password must be atleast 5 characters').isLength({ min: 5 }),
    body('institute', 'institute name must be atleast 5 letters').isLength({ min: 5 }),
], upload.single("proof"), async (req, res) => {
	// If there are errors, return Bad request and the errors
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}
	console.log(req.body.name);
	
	if (req.file) {

		var filepath = req.file.originalname;
		console.log(filepath);

	}
	try {
		// Check whether the user with this email exists already
		let user = await users.findOne({ email: req.body.email });
		if (user) {
			return res.status(400).json({ error: "Sorry a user with this email already exists" })
		}
		const salt = await bcrypt.genSalt(10);
		const secPass = await bcrypt.hash(req.body.password, salt);

		// Create a new user
		user = await users.create({

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
		console.error(error.message+"fghjkdfghj");
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
		return res.status(400).json({ errors: errors.array() });
	}
	const { email, password } = req.body;

	try {
		let success = false;
		// Check whether the user with this email exists already
		let user = await users.findOne({ email });
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




router.get("/userdashboard", fetchuser, async (req, res) => {
	const userid = req.user.id;

	try {
		const user = await users.findOne({ _id: userid });

		var participation = user.participation;
		var indpart = [];
		var teampart = [];

		for (var i = 0; i < participation.length; i++) {
			var part = {};
			var participate = participation[i];
			const event = await events.findOne({ _id: participate.eventid });
			var status;

			var evedt = event.eventdate;
			var eveenddt = event.eventenddate;
			var nowdt = new Date();
			var ed = new Date(evedt);
			var eed = new Date(eveenddt);
			var nd = new Date(nowdt);
			if (ed.setHours(0, 0, 0, 0) > nd.setHours(0, 0, 0, 0)) {
				status = "Upcoming";
			}
			ed = new Date(evedt);
			nd = new Date(nowdt);
			if (ed.setHours(0, 0, 0, 0) == nd.setHours(0, 0, 0, 0)) {
				ed = new Date(evedt);
				nd = new Date(nowdt);
				if (ed > nd) {
					status = "Today";
				}
			}
			nd = new Date(nowdt);
			if (eed < nd) {
				status = "Completed";
			}
			status = !status ? "Ongoing" : status;

			delete evedt, eveenddt, nowdt, ed, eed, nd;

			part["eventname"] = event.eventname;
			part["eventstatus"] = status;
			part["description"] = event.eventdescription;

			if (participate.teamname != "") {
				const team = await teams.findOne({ _id: participate.teamid });
				part["teamname"] = team.teamname;
				part["leader"] = team.leader.name;
				part["members"] = [];
				for (let j = 0; j < team.emails.length; j++) {
					if (team.emails[j].name != user.name) part.members.push(team.emails[j].name);
				}
				teampart.push(part);
			}
			else indpart.push(part);
		}

		return res.send({status:true, name: user.name, indpart, teampart, });
	}
	catch (error) {
		console.error(error.message);
		return res.send({status:false,message:"Internal Server Error"});
	}
})


router.post("/eventregister/:eventid", fetchuser, async (req, res) => {
	const userid = req.user.id;
	const eventid = req.params.eventid;

	if (!isValidObjectId(eventid)) {
		return res.send({ status: false, message: "Please provide a valid event id" });
	}

	try {
		const event = await events.findOne({ _id: eventid });
		const user = await users.findOne({ _id: userid });

		if(!user){
			return res.send({ status: false, message: "Error" });
		}
		if (!event) {
			return res.send({ status: false, message: "Please provide a valid event id" });
		}

		let us = await users.findOne({ _id: mongoose.Types.ObjectId(userid), "participation.eventid": mongoose.Types.ObjectId(eventid) });
		if (us) {
			return res.send({ status: false, message: "You are Already Registered in this event" });
		}

		var teamname = "";
		var teamid;
		var emails = [];
		var team;

		if (event.eventtype == "team") {
			let body = req.body;

			if (!isValid(body.teamname)) {
				return res.send({ status: false, message: "Team Name cannot be Empty" });
			}
			if (!teamnameRegex(body.teamname)) {
				return res.send({ status: false, message: "Not a valid Team Name" });
			}

			teamname = body.teamname;
			delete body["teamname"];
			delete body["leaderemail"];
			var usrarr = [];
			for (var key in body) {

				if (!isValid(body[key])) {
					return res.send({ status: false, message: "Email Field cannot be empty" });
				}
				if (!mailRegex(body[key])) {
					return res.send({ status: false, message: "Enter a valid Email" });
				}
				console.log("i");
				let usr = await users.findOne({ email: body[key] });
				
				if (!usr) return res.send({ status: false, message: `${key} is not Registered` });
				
				let us = await users.findOne({ _id: mongoose.Types.ObjectId(usr.id), "participation.eventid": mongoose.Types.ObjectId(eventid) });
				if (us) {
					return res.send({ status: false, message: `${usr.name} is Already Registered in this event` });
				}
				usrarr.push(usr);
			}
			console.log("m",user.email);
			team = await teams.create({
				eventid: eventid,
				teamname: teamname,
				emails: emails,
				leader: {
					email: user.email,
					name: user.name
				}
			});
			console.log("j");
			teamid = team._id;
			for (var i = 0; i < usrarr.length; i++) {
				let usr = usrarr[i];
				var participation = usr.participation;
				const participate = {
					_id: new mongoose.Types.ObjectId(),
					eventid: new mongoose.Types.ObjectId(eventid),
					eventname: event.eventname,
					teamid: teamid,
					teamname: teamname
				};
				participation = [...participation, participate];
				
				usr.set({ participation: participation });
				await usr.save();
				
				emails.push({ email: usr.email, name: usr.name });
				delete body["email" + (i + 1)];
			}
			team.set({ emails: emails });
			await team.save();
		}
		var participation = user.participation;
		const participate = {
			_id: new mongoose.Types.ObjectId(),
			eventid: new mongoose.Types.ObjectId(eventid),
			eventname: event.eventname,
			teamid: teamid,
			teamname: teamname
		};
		participation = [...participation, participate];
		
		user.set({ participation: participation });
		await user.save();
		
		event.set({ participants: event.participants + 1 });
		await event.save();
		
		return res.send({ status: true, message: "Registration Successfull" });
	}
	catch (error) {
		console.error(error.message);
		return res.send({status:false,message:"Check the details you have entered or it may be caused due to Internal Server Error"});
	}
})

module.exports = router;