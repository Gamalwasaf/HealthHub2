const db = require('../config/db');

exports.bookAppointment = async (req, res) => {
    const { patient_id, doctor_id, appointment_time } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO appointments (patient_id, doctor_id, appointment_time, status) VALUES (?, ?, ?, "pending")',
            [patient_id, doctor_id, appointment_time]
        );
        res.json({ success: true, appointment_id: result.insertId, message: "Appointment Booked: Pending" });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

exports.cancelAppointment = async (req, res) => {
    const appointmentId = parseInt(req.params.appointmentId);
    const patient_id = parseInt(req.body.patient_id);
    if (!appointmentId) return res.status(400).json({ success: false, message: "appointmentId مطلوب" });
    if (!patient_id) return res.status(400).json({ success: false, message: "patient_id مطلوب" });
    try {
        const [rows] = await db.query(
            'SELECT id FROM appointments WHERE id = ? AND patient_id = ?',
            [appointmentId, patient_id]
        );
        if (rows.length === 0) {
            return res.status(403).json({ success: false, message: "غير مصرح بهذا الإجراء" });
        }
        await db.query('DELETE FROM appointments WHERE id = ?', [appointmentId]);
        res.json({ success: true, message: "تم إلغاء الموعد بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPatientAppointments = async (req, res) => {
    const patient_id = parseInt(req.params.patientId);
    if (!patient_id) return res.status(400).json({ success: false, message: "patientId مطلوب" });
    try {
        const [rows] = await db.query(
            `SELECT a.id, a.appointment_time, a.status, d.name as doctorName, d.specialty as doctorSpec, d.id as doctorId
             FROM appointments a
             JOIN doctors d ON a.doctor_id = d.id
             WHERE a.patient_id = ?
             ORDER BY a.appointment_time DESC`,
            [patient_id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.registerPatient = async (req, res) => {
    const { name, email, password, phone } = req.body;
    try {
        await db.query(
            'INSERT INTO patients (name, email, password, phone) VALUES (?, ?, ?, ?)',
            [name, email, password, phone]
        );
        res.status(201).send("تم تسجيل الحساب بنجاح");
    } catch (err) {
        res.status(500).send("خطأ في الداتا بيز: " + err.message);
    }
};

// تحديث بيانات الملف الصحي للمريض
exports.updateProfile = async (req, res) => {
    const { patient_id, name, age, blood_type, diseases } = req.body;
    if (!patient_id) return res.status(400).json({ success: false, message: "patient_id مطلوب" });
    try {
        await db.query(
            'UPDATE patients SET name = COALESCE(NULLIF(?, ""), name), age = ?, blood_type = ?, diseases = ? WHERE id = ?',
            [name || null, age || null, blood_type || null, diseases || null, patient_id]
        );
        res.json({ success: true, message: "تم تحديث البيانات بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// جلب بيانات مريض معين (للدكتور)
exports.getPatientProfile = async (req, res) => {
    const patient_id = parseInt(req.params.patientId);
    if (!patient_id) return res.status(400).json({ success: false, message: "patientId مطلوب" });
    try {
        const [rows] = await db.query(
            'SELECT id, name, phone, age, blood_type, diseases, profile_pic FROM patients WHERE id = ?',
            [patient_id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: "المريض غير موجود" });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// رفع صورة المريض
exports.uploadProfilePic = async (req, res) => {
    const { patient_id, profile_pic } = req.body;
    if (!patient_id || !profile_pic) return res.status(400).json({ success: false, message: "بيانات ناقصة" });
    try {
        await db.query('UPDATE patients SET profile_pic = ? WHERE id = ?', [profile_pic, patient_id]);
        res.json({ success: true, message: "تم رفع الصورة بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// تغيير كلمة سر المريض
exports.changePassword = async (req, res) => {
    const { patient_id, old_password, new_password } = req.body;
    if (!patient_id || !old_password || !new_password)
        return res.status(400).json({ success: false, message: "بيانات ناقصة" });
    try {
        const [rows] = await db.query('SELECT password FROM patients WHERE id = ?', [patient_id]);
        if (!rows.length) return res.status(404).json({ success: false, message: "المريض غير موجود" });
        if (rows[0].password !== old_password)
            return res.status(401).json({ success: false, message: "كلمة السر الحالية غير صحيحة" });
        await db.query('UPDATE patients SET password = ? WHERE id = ?', [new_password, patient_id]);
        res.json({ success: true, message: "تم تغيير كلمة السر بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
