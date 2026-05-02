const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');

router.post('/register', authCtrl.register);
router.post('/register-doctor', authCtrl.registerDoctor);
router.post('/login', authCtrl.login);
router.post('/doctor-login', authCtrl.doctorLogin);

module.exports = router;