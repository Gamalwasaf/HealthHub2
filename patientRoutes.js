const express = require('express');
const router = express.Router();
const patientCtrl = require('../controllers/patientController');

router.post('/book', patientCtrl.bookAppointment);
router.post('/register', patientCtrl.registerPatient);
router.get('/appointments/:patientId', patientCtrl.getPatientAppointments);
router.delete('/cancel/:appointmentId', patientCtrl.cancelAppointment);

// بيانات الملف الصحي
router.post('/update-profile', patientCtrl.updateProfile);
router.get('/profile/:patientId', patientCtrl.getPatientProfile);

// رفع صورة المريض
router.post('/upload-pic', patientCtrl.uploadProfilePic);
router.post('/change-password', patientCtrl.changePassword);

module.exports = router;
