
CREATE DATABASE IF NOT EXISTS healthhub_db;
USE healthhub_db;

-- جدول المرضى
CREATE TABLE IF NOT EXISTS patients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    email VARCHAR(255),
    password VARCHAR(255),
    phone VARCHAR(20),
    nationalId VARCHAR(14) UNIQUE,
    profile_pic MEDIUMTEXT DEFAULT NULL
);

-- جدول الأطباء
CREATE TABLE IF NOT EXISTS doctors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    specialty VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    password VARCHAR(255),
    nationalId VARCHAR(14) UNIQUE,
    price INT DEFAULT 200,
    profile_pic MEDIUMTEXT DEFAULT NULL
);

-- جدول المواعيد
CREATE TABLE IF NOT EXISTS appointments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT,
    doctor_id INT,
    appointment_time DATETIME,
    status VARCHAR(50),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

-- جدول الروشتات
CREATE TABLE IF NOT EXISTS prescriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    prescription_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

-- جدول التقييمات (جديد)
CREATE TABLE IF NOT EXISTS ratings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    prescription_id INT NOT NULL,
    stars TINYINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
    UNIQUE KEY unique_rating (patient_id, doctor_id, prescription_id)
);
