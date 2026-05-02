const db = require('../config/db');

exports.register = async (req, res) => {
    const { name, email, password, phone, nationalId } = req.body;
    try {
        const [existing] = await db.query('SELECT * FROM patients WHERE email = ? OR nationalId = ?', [email, nationalId]);
        if (existing.length > 0) {
            return res.status(400).send("البريد الإلكتروني أو الرقم القومي مسجل بالفعل");
        }
        await db.query(
            'INSERT INTO patients (name, email, password, phone, nationalId) VALUES (?, ?, ?, ?, ?)',
            [name, email, password, phone, nationalId]
        );
        res.status(201).send("تم التسجيل بنجاح");
    } catch (err) {
        res.status(500).send("خطأ في التسجيل: " + err.message);
    }
};

exports.login = async (req, res) => {
    const { email, nationalId, password } = req.body;
    let query = 'SELECT * FROM patients WHERE password = ? AND (email = ? OR nationalId = ?)';
    let params = [password, email, nationalId];
    
    try {
        const [user] = await db.query(query, params);
        if (user.length > 0) {
            res.json({ message: "success", user: user[0] });
        } else {
            res.status(401).send("خطأ في البيانات أو كلمة السر");
        }
    } catch (err) {
        res.status(500).send("خطأ في السيرفر: " + err.message);
    }
};

exports.registerDoctor = async (req, res) => {
    const { name, specialty, nationalId, password } = req.body;
    try {
        const [existing] = await db.query('SELECT * FROM doctors WHERE nationalId = ?', [nationalId]);
        if (existing.length > 0) {
            return res.status(400).send("الطبيب مسجل بالفعل");
        }
        await db.query(
            'INSERT INTO doctors (name, specialty, nationalId, password) VALUES (?, ?, ?, ?)',
            [name, specialty, nationalId, password]
        );
        res.status(201).send("تم تسجيل الطبيب بنجاح");
    } catch (err) {
        res.status(500).send("خطأ في التسجيل: " + err.message);
    }
};

exports.doctorLogin = async (req, res) => {
    const { email, nationalId, password } = req.body;
    
    try {
        const [doctor] = await db.query(
            'SELECT * FROM doctors WHERE password = ? AND (email = ? OR nationalId = ?)', 
            [password, email, nationalId]
        );
        
        console.log("النتيجة من الداتا بيز:", doctor);
        
        if (doctor && doctor.length > 0) {
            res.json({ 
                success: true,
                message: "success", 
                name: doctor[0].name, 
                id: doctor[0].id 
            });
        } else {
            res.status(401).json({ 
                success: false,
                message: "بيانات خاطئة" 
            });
        }
    } catch (error) {
        console.error("خطأ في السيرفر:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};