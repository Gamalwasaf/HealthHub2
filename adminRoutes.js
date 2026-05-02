

const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController');

router.get('/dashboard', adminCtrl.dashboard);
router.post('/add-doctor', adminCtrl.addDoctor); 

module.exports = router;