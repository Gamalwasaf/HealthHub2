const db = require('../config/db');

exports.getAppointments = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM appointments');
        res.json(rows);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

exports.getAllDoctors = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT d.id, d.name, d.specialty, d.price, d.profile_pic,
                   ROUND(COALESCE(AVG(r.stars), 0), 1) as rating,
                   COUNT(r.id) as rating_count
            FROM doctors d
            LEFT JOIN ratings r ON d.id = r.doctor_id
            GROUP BY d.id
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// رفع صورة الدكتور
exports.uploadDoctorPic = async (req, res) => {
    const { doctor_id, profile_pic } = req.body;
    if (!doctor_id || !profile_pic) return res.status(400).json({ success: false, message: "بيانات ناقصة" });
    try {
        await db.query('UPDATE doctors SET profile_pic = ? WHERE id = ?', [profile_pic, doctor_id]);
        res.json({ success: true, message: "تم رفع الصورة بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// تحديث اسم وتخصص الدكتور
// تغيير كلمة سر الدكتور
exports.changePassword = async (req, res) => {
    const { doctor_id, old_password, new_password } = req.body;
    if (!doctor_id || !old_password || !new_password)
        return res.status(400).json({ success: false, message: "بيانات ناقصة" });
    try {
        const [rows] = await db.query('SELECT password FROM doctors WHERE id = ?', [doctor_id]);
        if (!rows.length) return res.status(404).json({ success: false, message: "الدكتور غير موجود" });
        if (rows[0].password !== old_password)
            return res.status(401).json({ success: false, message: "كلمة السر الحالية غير صحيحة" });
        await db.query('UPDATE doctors SET password = ? WHERE id = ?', [new_password, doctor_id]);
        res.json({ success: true, message: "تم تغيير كلمة السر بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateProfile = async (req, res) => {
    const { doctor_id, name, specialty } = req.body;
    if (!doctor_id || !name || !specialty) return res.status(400).json({ success: false, message: "بيانات ناقصة" });
    try {
        await db.query('UPDATE doctors SET name = ?, specialty = ? WHERE id = ?', [name, specialty, doctor_id]);
        res.json({ success: true, message: "تم تحديث البيانات بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updatePrice = async (req, res) => {
    const { doctorId, price } = req.body;
    try {
        await db.query('UPDATE doctors SET price = ? WHERE id = ?', [price, doctorId]);
        res.json({ success: true, message: "تم تحديث السعر بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getDoctorPatients = async (req, res) => {
    const { doctorId } = req.query;
    if (!doctorId) return res.status(400).json({ success: false, message: "doctorId مطلوب" });
    try {
        const [rows] = await db.query(
            `SELECT p.id, p.name, p.phone, p.age, p.blood_type, p.diseases,
                    a.id as appointment_id, a.status, a.appointment_time
             FROM appointments a
             JOIN patients p ON a.patient_id = p.id
             WHERE a.doctor_id = ?
             ORDER BY a.appointment_time ASC`,
            [doctorId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// حذف مريض واحد فقط (إلغاء موعده)
exports.deletePatientAppointment = async (req, res) => {
    const { appointmentId } = req.params;
    if (!appointmentId) return res.status(400).json({ success: false, message: "appointmentId مطلوب" });
    try {
        await db.query('DELETE FROM appointments WHERE id = ?', [appointmentId]);
        res.json({ success: true, message: "تم حذف الموعد بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// إرسال روشتة للمريض
exports.sendPrescription = async (req, res) => {
    const { patient_id, doctor_id, prescription_text } = req.body;
    if (!patient_id || !doctor_id || !prescription_text) {
        return res.status(400).json({ success: false, message: "بيانات ناقصة" });
    }
    try {
        await db.query(
            `INSERT INTO prescriptions (patient_id, doctor_id, prescription_text, created_at)
             VALUES (?, ?, ?, NOW())`,
            [patient_id, doctor_id, prescription_text]
        );
        res.json({ success: true, message: "تم إرسال الروشتة بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// جلب روشتات مريض معين
exports.getPatientPrescriptions = async (req, res) => {
    const { patient_id } = req.query;
    if (!patient_id) return res.status(400).json({ success: false, message: "patient_id مطلوب" });
    try {
        const [rows] = await db.query(
            `SELECT pr.id, pr.prescription_text, pr.created_at, d.name as doctor_name, d.id as doctor_id, d.specialty as doctor_specialty, d.profile_pic as doctor_pic,
                    (SELECT stars FROM ratings WHERE patient_id = ? AND doctor_id = d.id AND prescription_id = pr.id LIMIT 1) as my_rating
             FROM prescriptions pr
             JOIN doctors d ON pr.doctor_id = d.id
             WHERE pr.patient_id = ?
             ORDER BY pr.created_at DESC`,
            [patient_id, patient_id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// إضافة تقييم
exports.rateDoctor = async (req, res) => {
    const { patient_id, doctor_id, prescription_id, stars } = req.body;
    if (!patient_id || !doctor_id || !stars) {
        return res.status(400).json({ success: false, message: "بيانات ناقصة" });
    }
    if (stars < 1 || stars > 5) {
        return res.status(400).json({ success: false, message: "التقييم يجب أن يكون بين 1 و 5" });
    }
    try {
        // تحقق هل قيّم من قبل لنفس الروشتة
        const [existing] = await db.query(
            'SELECT id FROM ratings WHERE patient_id = ? AND doctor_id = ? AND prescription_id = ?',
            [patient_id, doctor_id, prescription_id]
        );
        if (existing.length > 0) {
            // تحديث التقييم الموجود
            await db.query(
                'UPDATE ratings SET stars = ? WHERE patient_id = ? AND doctor_id = ? AND prescription_id = ?',
                [stars, patient_id, doctor_id, prescription_id]
            );
        } else {
            await db.query(
                'INSERT INTO ratings (patient_id, doctor_id, prescription_id, stars) VALUES (?, ?, ?, ?)',
                [patient_id, doctor_id, prescription_id, stars]
            );
        }
        res.json({ success: true, message: "تم حفظ تقييمك بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
