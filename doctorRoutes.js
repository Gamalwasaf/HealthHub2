const express = require('express');
const router = express.Router();
const doctorCtrl = require('../controllers/doctorController');

router.get('/appointments', doctorCtrl.getAppointments);
router.get('/doctors', doctorCtrl.getAllDoctors);
router.post('/update-price', doctorCtrl.updatePrice);
router.post('/update-profile', doctorCtrl.updateProfile);
router.post('/change-password', doctorCtrl.changePassword);
router.get('/patients', doctorCtrl.getDoctorPatients);
router.post('/upload-pic', doctorCtrl.uploadDoctorPic);

// حذف موعد مريض واحد فقط
router.delete('/appointment/:appointmentId', doctorCtrl.deletePatientAppointment);

// روشتة
router.post('/send-prescription', doctorCtrl.sendPrescription);
router.get('/prescriptions', doctorCtrl.getPatientPrescriptions);

// تقييم الدكتور
router.post('/rate', doctorCtrl.rateDoctor);

// حالة الحجوزات (مفتوح/مغلق) - يُخزن في ذاكرة السيرفر
let bookingSettings = { bookingOpen: true, weeklySchedule: {} };

router.get('/booking-status', (req, res) => {
    res.json(bookingSettings);
});

router.post('/booking-status', (req, res) => {
    const { bookingOpen, weeklySchedule } = req.body;
    if (typeof bookingOpen !== 'undefined') bookingSettings.bookingOpen = bookingOpen;
    if (weeklySchedule) bookingSettings.weeklySchedule = weeklySchedule;
    res.json({ success: true, ...bookingSettings });
});

module.exports = router;
