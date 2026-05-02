const db = require('../config/db');

exports.dashboard = async (req, res) => {
    const [stats] = await db.query('SELECT COUNT(*) as total FROM appointments');
    res.json({ title: "control ", stats });
};

exports.addDoctor = async (req, res) => {
    const { name, specialty, email, phone, password } = req.body;
    console.log("البيانات المستلمة:", { name, specialty, email, phone, password });
    
    try {
        const [existing] = await db.query('SELECT * FROM doctors WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).send("هذا البريد مسجل بالفعل");
        }
        
        await db.query(
            'INSERT INTO doctors (name, specialty, email, phone, password) VALUES (?, ?, ?, ?, ?)',
            [name, specialty, email, phone, password]
        );
        
        res.status(201).send("تم إضافة الدكتور بنجاح");
    } catch (err) {
        console.error(err);
        res.status(500).send("خطأ في إضافة الدكتور: " + err.message);
    }
};