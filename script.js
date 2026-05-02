// ==========================================
// --- المتغيرات العامة والحالة ---
// ==========================================
let docMode = 'login';
let patMode = 'login';
let bookingOpen = true; 
let currentFilter = 'الكل';
const daysOfWeek = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

// تحميل البيانات من LocalStorage
let patients = [];

function savePatientsData() {
    localStorage.setItem('healthhub_clinic_patients', JSON.stringify(patients));
}

function isValidNationalID(id) {
    return /^\d{14}$/.test(String(id).trim());
}

// ==========================================
// --- إدارة التبويبات (Tabs) ---
// ==========================================
function switchDocTab(mode) {
    docMode = mode;
    const regFields = document.getElementById('doc-register-fields');
    const confirmGroup = document.getElementById('doc-confirm-group');
    const submitBtn = document.getElementById('doc-submit-btn');
    
    document.getElementById('doc-reg-tab')?.classList.toggle('active', mode === 'register');
    document.getElementById('doc-login-tab')?.classList.toggle('active', mode === 'login');

    if (mode === 'register') {
        regFields?.classList.remove('hidden');
        confirmGroup?.classList.remove('hidden');
        if (submitBtn) submitBtn.textContent = 'إنشاء حساب طبيب';
    } else {
        regFields?.classList.add('hidden');
        confirmGroup?.classList.add('hidden');
        if (submitBtn) submitBtn.textContent = 'تسجيل الدخول';
    }
}

function switchPatTab(mode) {
    patMode = mode;
    const regFields = document.getElementById('pat-register-fields');
    const confirmGroup = document.getElementById('pat-confirm-group');
    const submitBtn = document.getElementById('pat-submit-btn');

    document.getElementById('pat-reg-tab')?.classList.toggle('active', mode === 'register');
    document.getElementById('pat-login-tab')?.classList.toggle('active', mode === 'login');

    if (mode === 'register') {
        regFields?.classList.remove('hidden');
        confirmGroup?.classList.remove('hidden');
        if (submitBtn) submitBtn.textContent = 'إنشاء حساب مريض';
    } else {
        regFields?.classList.add('hidden');
        confirmGroup?.classList.add('hidden');
        if (submitBtn) submitBtn.textContent = 'تسجيل الدخول';
    }
}

// ==========================================
// --- نظام الدخول والأمان ---
// ==========================================

// فورم الطبيب
document.getElementById('doc-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('doc-nid').value.trim();
    const pass = document.getElementById('doc-password').value.trim();

    if (!isValidNationalID(id)) return alert("الرقم القومي يجب أن يكون 14 رقماً");

    if (docMode === 'register') {
        const name = document.getElementById('doc-name').value.trim();
        const specialty = document.getElementById('doc-specialty').value;
        const confirmPass = document.getElementById('doc-confirm-password').value.trim();

        if (!name || !specialty) return alert("يرجى إكمال كافة البيانات");
        if (pass !== confirmPass) return alert("كلمات السر غير متطابقة!");

        try {
            const response = await fetch('http://localhost:3000/auth/register-doctor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, specialty, nationalId: id, password: pass })
            });
            const data = await response.text();
            if (response.ok) {
                alert("تم إنشاء حساب الطبيب بنجاح! يمكنك الآن تسجيل الدخول.");
                switchDocTab('login');
            } else {
                alert(data);
            }
        } catch (err) {
            alert("خطأ في الاتصال بالسيرفر");
        }
    } else {
        try {
            const response = await fetch('http://localhost:3000/auth/doctor-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nationalId: id, password: pass })
            });
            const data = await response.json();
            if (data.success) {
                localStorage.setItem('currentDoctorName', data.name);
                localStorage.setItem('currentDoctorId', data.id);
                if (data.specialty) localStorage.setItem('currentDoctorSpecialty', data.specialty);
                showDashboard(data.name);
            } else {
                alert(data.message || "بيانات الدخول غير صحيحة");
            }
        } catch (err) {
            alert("خطأ في الاتصال بالسيرفر");
        }
    }
});

// فورم المريض
document.getElementById('pat-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('pat-nid').value.trim();
    const pass = document.getElementById('pat-password').value.trim();

    if (!isValidNationalID(id)) return alert("الرقم القومي يجب أن يكون 14 رقماً");

    if (patMode === 'register') {
        const name = document.getElementById('pat-name').value.trim();
        const phone = document.getElementById('pat-phone').value.trim();
        const confirmPass = document.getElementById('pat-confirm-password').value.trim();

        if (!name || !phone) return alert("يرجى إدخال الاسم ورقم الهاتف");
        if (pass !== confirmPass) return alert("كلمات السر غير متطابقة!");

        try {
            const response = await fetch('http://localhost:3000/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, nationalId: id, password: pass })
            });
            const data = await response.text();
            if (response.ok) {
                alert("تم إنشاء حساب المريض بنجاح");
                switchPatTab('login');
            } else {
                alert(data);
            }
        } catch (err) {
            alert("خطأ في الاتصال بالسيرفر");
        }
    } else {
        try {
            const response = await fetch('http://localhost:3000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nationalId: id, password: pass })
            });
            const data = await response.json();
            if (data.message === "success") {
                alert("مرحباً بك يا " + data.user.name);
                localStorage.setItem('userName', data.user.name);
                localStorage.setItem('userId', data.user.id);
                window.location.href = 'patient.html';
            } else {
                alert("الرقم القومي أو كلمة السر غير صحيحة");
            }
        } catch (err) {
            alert("خطأ في الاتصال بالسيرفر");
        }
    }
});

// ==========================================
// --- إعدادات المواعيد والسعر ---
// ==========================================
function generateScheduleInputs() {
    const container = document.getElementById('weekly-schedule-inputs');
    if(!container) return;
    const saved = JSON.parse(localStorage.getItem('weeklySchedule')) || {};
    const savedPrice = localStorage.getItem('clinicPrice') || '';
    
    const priceInput = document.getElementById('clinic-price');
    if (priceInput) priceInput.value = savedPrice;

    let html = "";
    daysOfWeek.forEach(day => {
        const isClosed = saved[day]?.isClosed || false;
        html += `
            <div class="day-row" id="row-${day}" style="display:flex; align-items:center; gap:10px; margin-bottom:8px; padding:8px; border-radius:8px; border: 1px solid #eee; background:${isClosed ? '#fff1f0' : 'white'}">
                <strong style="width:80px">${day}</strong>
                <div id="inputs-${day}" style="display:flex; gap:5px; opacity:${isClosed?0.5:1}; pointer-events:${isClosed?'none':'all'}">
                    <input type="time" id="start-${day}" value="${saved[day]?.start || '09:00'}">
                    <span>إلى</span>
                    <input type="time" id="end-${day}" value="${saved[day]?.end || '17:00'}">
                </div>
                <label style="margin-right:auto;"><input type="checkbox" id="closed-${day}" onchange="toggleDayStatus('${day}')" ${isClosed?'checked':''}> مغلق</label>
            </div>`;
    });
    container.innerHTML = html;
}

async function updateDoctorPrice() {
    const doctorId = localStorage.getItem('currentDoctorId');
    const priceInput = document.getElementById('clinic-price');
    const price = priceInput ? priceInput.value.trim() : "";
    
    if (!price || !doctorId) {
        console.error("بيانات ناقصة:", { doctorId, price });
        return alert("يرجى إدخال السعر أولاً");
    }

    try {
        const response = await fetch('http://127.0.0.1:3000/doctor/update-price', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                doctorId: parseInt(doctorId), 
                price: parseInt(price) 
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                localStorage.setItem('clinicPrice', price);
                alert("تم تحديث سعر الكشف بنجاح في قاعدة البيانات ✅");
            } else {
                alert("فشل تحديث السعر: " + (data.message || "خطأ غير معروف"));
            }
        } else {
            const errorText = await response.text();
            alert("خطأ من السيرفر: " + errorText);
        }
    } catch (err) {
        console.error("خطأ في الاتصال:", err);
        alert("خطأ في الاتصال بالسيرفر، تأكد من تشغيله على بورت 3000.");
    }
}

function toggleDayStatus(day) {
    const isClosed = document.getElementById(`closed-${day}`).checked;
    const inputs = document.getElementById(`inputs-${day}`);
    const row = document.getElementById(`row-${day}`);
    if (inputs) {
        inputs.style.opacity = isClosed ? 0.5 : 1;
        inputs.style.pointerEvents = isClosed ? 'none' : 'all';
    }
    if (row) row.style.backgroundColor = isClosed ? '#fff1f0' : 'white';
}

async function saveWeeklySchedule() {
    const schedule = {};
    daysOfWeek.forEach(day => {
        schedule[day] = {
            start: document.getElementById(`start-${day}`).value,
            end: document.getElementById(`end-${day}`).value,
            isClosed: document.getElementById(`closed-${day}`).checked
        };
    });
    localStorage.setItem('weeklySchedule', JSON.stringify(schedule));

    try {
        await fetch('http://localhost:3000/doctor/booking-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weeklySchedule: schedule })
        });
    } catch (err) {
        console.warn("تعذر مزامنة الجدول مع السيرفر:", err);
    }
    alert("تم حفظ مواعيد العمل بنجاح!");
}

async function toggleBookingStatus() {
    bookingOpen = !bookingOpen;
    const btn = document.getElementById('toggle-booking-btn');
    const text = document.getElementById('booking-text');
    if(btn) btn.textContent = bookingOpen ? "إيقاف الحجوزات" : "فتح الحجوزات";
    if(btn) btn.className = bookingOpen ? "btn btn-orange" : "btn btn-green";
    if(text) text.innerHTML = `حالة الحجز الآن: ${bookingOpen ? "🟢 مفتوح" : "🔴 مغلق"}`;

    try {
        await fetch('http://localhost:3000/doctor/booking-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingOpen })
        });
    } catch (err) {
        console.warn("تعذر مزامنة حالة الحجز مع السيرفر:", err);
    }
}

function toggleScheduleList() {
    const scheduleContainer = document.getElementById('weekly-schedule-inputs');
    const toggleBtn = document.getElementById('toggle-schedule-btn');
    if (scheduleContainer.classList.contains('hidden')) {
        scheduleContainer.classList.remove('hidden');
        toggleBtn.textContent = 'إخفاء القائمة';
    } else {
        scheduleContainer.classList.add('hidden');
        toggleBtn.textContent = 'عرض القائمة';
    }
}
// ==========================================
// --- إدارة لوحة التحكم (المرضى) ---
// ==========================================
async function fetchDoctorPatients() {
    const doctorId = localStorage.getItem('currentDoctorId');
    if (!doctorId) return;

    try {
        const response = await fetch(`http://localhost:3000/doctor/patients?doctorId=${doctorId}`);
        if (!response.ok) throw new Error('فشل الاتصال بالسيرفر');
        const data = await response.json();

        // نحتفظ بالمرضى المضافين يدوياً (طوارئ / عادي) اللي مش من DB
        const localOnly = patients.filter(p => p.isLocal === true);

        // نجيب مرضى الحجوزات من DB - نخزن كل البيانات الصحية معاهم
        const dbPatients = data.map(p => ({
            id: p.id,                          // patient_id
            appointmentId: p.appointment_id,   // appointment_id للحذف
            name: p.name,
            phone: p.phone || null,
            age: p.age || null,
            blood_type: p.blood_type || null,
            diseases: p.diseases || null,
            type: 'حجز من التطبيق',
            isExamined: p.status === 'examined',
            isLocal: false,
            time: p.appointment_time
        }));

        patients = [...localOnly, ...dbPatients];
        renderPatients();
    } catch (err) {
        console.error("خطأ في جلب مرضى الدكتور:", err);
        renderPatients();
    }
}

function renderPatients() {
    const tbody = document.getElementById('patients-table-body');
    if(!tbody) return;

    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || "";
    tbody.innerHTML = "";

    const filtered = patients.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm);
        const matchesFilter = (currentFilter === 'الكل') || (p.type === currentFilter);
        return matchesSearch && matchesFilter;
    });

    filtered.forEach((p, i) => {
        // نستخدم appointmentId للحذف لو موجود، وإلا نستخدم الـ id العادي (للمضافين يدوياً)
        const deleteKey = p.appointmentId ? `appt_${p.appointmentId}` : `local_${p.id}`;
        tbody.innerHTML += `
            <tr class="${p.type === 'طوارئ' ? 'emergency-row' : ''}">
                <td>${i+1}</td>
                <td>${p.name}</td>
                <td style="color:${p.type==='طوارئ'?'red':'#28a745'}">${p.type}</td>
                <td class="actions-cell">
                    ${p.isLocal ? '' : `<button class="action-btn btn-info-patient" onclick="showPatientInfo(${p.id})" title="بيانات المريض" style="background:#e8f4fd; color:#2980b9; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:13px;">
                        <i class="fas fa-id-card"></i>
                    </button>`}
                    <button class="action-btn ${p.isExamined ? 'btn-return' : 'btn-confirm'}" onclick="toggleStatus(${p.id})">
                        ${p.isExamined ? 'إعادة للانتظار' : 'إتمام الكشف'}
                    </button>
                    <button class="action-btn btn-rx" onclick="addPrescription(${p.id})">روشتة</button>
                    <button class="action-btn btn-delete" onclick="deletePatient('${deleteKey}', '${p.name}')">حذف</button>
                </td>
            </tr>`;
    });
    document.getElementById('count-waiting').textContent = patients.filter(x => !x.isExamined).length;
    document.getElementById('count-examined').textContent = patients.filter(x => x.isExamined).length;
}

function addEmergencyPatient() {
    const input = document.getElementById('emergency-name');
    if(!input.value.trim()) return alert("ادخل اسم المريض");
    // إضافة محلية فقط (طوارئ مش في الـ DB) - تُضاف للأعلى ولا ترجع لما نجيب من DB
    patients.unshift({
        id: Date.now(),
        appointmentId: null,
        name: input.value.trim(),
        type: 'طوارئ',
        isExamined: false,
        isLocal: true,
        prescription: ""
    });
    input.value = "";
    renderPatients();
}

function addRegularPatient() {
    const input = document.getElementById('regular-name');
    if(!input.value.trim()) return alert("ادخل اسم المريض");
    // إضافة محلية فقط - تبقى موجودة ولا ترجع لما نجيب من DB
    patients.push({
        id: Date.now(),
        appointmentId: null,
        name: input.value.trim(),
        type: 'حجز عادي',
        isExamined: false,
        isLocal: true,
        prescription: ""
    });
    input.value = "";
    renderPatients();
}

function toggleStatus(id) {
    const p = patients.find(x => x.id === id);
    if(p) p.isExamined = !p.isExamined;
    renderPatients();
}

function addPrescription(patientId) {
    const p = patients.find(x => x.id === patientId);
    if (!p) return;

    let modal = document.getElementById('prescription-modal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'prescription-modal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:99999; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(3px);';

    const doctorName = localStorage.getItem('currentDoctorName') || 'الطبيب';
    const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

    // صورة المريض من الـ patients array (متحدّثة من السيرفر)
    const patientPhotoHtml = p.profile_pic
        ? `<img src="${p.profile_pic}" alt="صورة المريض" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #3498db;">`
        : `<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#3498db,#1a73e8);display:flex;align-items:center;justify-content:center;"><i class="fas fa-user" style="color:white;font-size:18px;"></i></div>`;

    modal.innerHTML = `
        <div style="background:#fff;border-radius:20px;width:94%;max-width:580px;box-shadow:0 20px 60px rgba(0,0,0,0.25);direction:rtl;overflow:hidden;font-family:inherit;">

            <!-- هيدر أزرق -->
            <div style="background:linear-gradient(135deg,#1565c0,#0d47a1);padding:20px 24px;display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-stethoscope" style="color:white;font-size:18px;"></i>
                    </div>
                    <div>
                        <div style="color:rgba(255,255,255,0.75);font-size:11px;margin-bottom:2px;">روشتة طبية</div>
                        <div style="color:white;font-size:17px;font-weight:bold;">د. ${doctorName}</div>
                    </div>
                </div>
                <div style="text-align:left;">
                    <div style="color:rgba(255,255,255,0.65);font-size:10px;">التاريخ</div>
                    <div style="color:white;font-size:13px;font-weight:500;">${today}</div>
                </div>
            </div>

            <!-- بيانات المريض بصورته -->
            <div style="padding:14px 24px;background:#f0f6ff;border-bottom:1px solid #dce8f8;display:flex;align-items:center;gap:14px;">
                ${patientPhotoHtml}
                <div style="flex:1;">
                    <div style="font-size:10px;color:#7f8c8d;margin-bottom:2px;">المريض</div>
                    <div style="font-size:15px;font-weight:bold;color:#1a2940;">${p.name}</div>
                    ${p.age ? `<div style="font-size:11px;color:#5a7a9a;margin-top:1px;"><i class="fas fa-birthday-cake" style="margin-left:3px;font-size:10px;"></i>${p.age} سنة${p.blood_type ? ' &nbsp;|&nbsp; <i class="fas fa-tint" style="margin-left:3px;font-size:10px;color:#e74c3c;"></i>' + p.blood_type : ''}</div>` : ''}
                </div>
                <span style="font-size:11px;background:${p.type==='طوارئ'?'#fff0f0':'#eaf5ff'};color:${p.type==='طوارئ'?'#e74c3c':'#2980b9'};padding:4px 10px;border-radius:20px;border:1px solid ${p.type==='طوارئ'?'#f5b7b1':'#aed6f1'};">
                    <i class="fas fa-tag" style="margin-left:4px;font-size:10px;"></i>${p.type}
                </span>
            </div>

            <!-- قسم كتابة الروشتة -->
            <div style="padding:18px 24px;">
                <label style="font-size:13px;font-weight:bold;color:#1a2940;display:block;margin-bottom:8px;">
                    <i class="fas fa-file-prescription" style="color:#e74c3c;margin-left:6px;"></i>محتوى الروشتة
                </label>
                <textarea id="rx-textarea" placeholder="مثال:&#10;• باراسيتامول 500mg — ثلاث مرات يومياً بعد الأكل&#10;• أموكسيسيلين 250mg — مرتين يومياً لمدة 7 أيام&#10;• الراحة التامة وشرب السوائل الكافية"
                    style="width:100%;height:150px;border:2px solid #dce8f8;border-radius:12px;padding:14px;font-size:14px;font-family:inherit;resize:vertical;direction:rtl;outline:none;color:#1a2940;line-height:1.9;box-sizing:border-box;transition:border-color 0.2s;"
                    onfocus="this.style.borderColor='#1565c0'"
                    onblur="this.style.borderColor='#dce8f8'">${p.prescription || ''}</textarea>

                <!-- تاقات سريعة -->
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;">
                    ${['بعد الأكل','قبل النوم','مرة يومياً','مرتين يومياً','3 مرات يومياً','لمدة 7 أيام','لمدة أسبوعين','راحة تامة'].map(t =>
                        `<span onclick="appendToRx(' ${t}')" style="background:#e3f0ff;color:#1565c0;font-size:11px;padding:4px 11px;border-radius:20px;cursor:pointer;white-space:nowrap;border:1px solid #b3d1f5;">${t}</span>`
                    ).join('')}
                </div>
            </div>

            <!-- أزرار -->
            <div style="padding:14px 24px;background:#f0f6ff;border-top:1px solid #dce8f8;display:flex;gap:10px;justify-content:flex-end;">
                <button onclick="closePrescriptionModal()" style="padding:10px 22px;background:#fee2e2;color:#e74c3c;border:none;border-radius:10px;font-size:14px;cursor:pointer;font-weight:bold;">
                    <i class="fas fa-times" style="margin-left:6px;"></i>إلغاء
                </button>
                <button onclick="sendPrescription(${patientId})" style="padding:10px 26px;background:linear-gradient(135deg,#1565c0,#0d47a1);color:white;border:none;border-radius:10px;font-size:14px;cursor:pointer;font-weight:bold;box-shadow:0 4px 12px rgba(13,71,161,0.3);">
                    <i class="fas fa-paper-plane" style="margin-left:6px;"></i>إرسال الروشتة
                </button>
            </div>
        </div>`;

    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closePrescriptionModal(); });
    document.getElementById('rx-textarea').focus();
}

function appendToRx(text) {
    const ta = document.getElementById('rx-textarea');
    if (ta) {
        ta.value += text;
        ta.focus();
    }
}

function closePrescriptionModal() {
    const modal = document.getElementById('prescription-modal');
    if (modal) modal.remove();
}

async function sendPrescription(patientId) {
    const p = patients.find(x => x.id === patientId);
    if (!p) return;

    const rx = document.getElementById('rx-textarea')?.value?.trim();
    if (!rx) return showRxError('⚠️ يرجى كتابة الروشتة أولاً');

    const doctorId = localStorage.getItem('currentDoctorId');
    if (!doctorId) return showRxError('لم يتم التعرف على الطبيب، يرجى تسجيل الدخول مجدداً');

    const sendBtn = document.querySelector('#prescription-modal button:last-child');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-left:6px;"></i>جارٍ الإرسال...'; }

    // مريض محلي (طوارئ/عادي يدوي)
    if (p.isLocal) {
        p.prescription = rx;
        closePrescriptionModal();
        showPrescriptionSuccess('تم حفظ الروشتة محلياً ✅');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/doctor/send-prescription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_id: patientId,
                doctor_id: parseInt(doctorId),
                prescription_text: rx
            })
        });
        const data = await response.json();
        if (data.success) {
            p.prescription = rx;
            closePrescriptionModal();
            showPrescriptionSuccess('✅ تم إرسال الروشتة للمريض بنجاح');
        } else {
            showRxError('❌ فشل إرسال الروشتة: ' + (data.message || 'خطأ غير معروف'));
            if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = '<i class="fas fa-paper-plane" style="margin-left:6px;"></i>إرسال الروشتة'; }
        }
    } catch (err) {
        console.error('خطأ في إرسال الروشتة:', err);
        showRxError('خطأ في الاتصال بالسيرفر');
        if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = '<i class="fas fa-paper-plane" style="margin-left:6px;"></i>إرسال الروشتة'; }
    }
}

function showRxError(msg) {
    let err = document.getElementById('rx-error');
    if (!err) {
        err = document.createElement('div');
        err.id = 'rx-error';
        err.style.cssText = 'margin: 0 24px 12px; padding:10px 14px; background:#fff5f5; border:1px solid #fca5a5; border-radius:8px; color:#dc2626; font-size:13px;';
        const modal = document.getElementById('prescription-modal');
        const footer = modal?.querySelector('div:last-child');
        if (footer) modal.querySelector('.flex.gap-10') ? null : footer.before(err);
        else document.getElementById('rx-textarea')?.after(err);
    }
    err.textContent = msg;
}

function showPrescriptionSuccess(msg) {
    let toast = document.getElementById('rx-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'rx-toast';
        toast.style.cssText = 'position:fixed; bottom:30px; left:50%; transform:translateX(-50%); background:#0d47a1; color:#fff; padding:14px 28px; border-radius:12px; font-size:15px; z-index:99999; opacity:0; transition:opacity 0.3s; white-space:nowrap; box-shadow:0 8px 24px rgba(13,71,161,0.35);';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 3500);
}

async function deletePatient(deleteKey, name) {
    if (!confirm(`هل أنت متأكد من حذف المريض "${name}" من القائمة؟`)) return;

    if (deleteKey.startsWith('local_')) {
        // مريض محلي (مضاف يدوياً) - نشيله من الـ array بس
        const localId = parseInt(deleteKey.replace('local_', ''));
        patients = patients.filter(x => x.id !== localId);
        renderPatients();
        return;
    }

    // مريض من DB - نرسل DELETE request بالـ appointmentId
    const appointmentId = deleteKey.replace('appt_', '');
    try {
        const response = await fetch(`http://localhost:3000/doctor/appointment/${appointmentId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (data.success) {
            // نشيله من الـ array المحلية بدون ما نعيد جلب كل المرضى
            patients = patients.filter(x => x.appointmentId !== parseInt(appointmentId));
            renderPatients();
        } else {
            alert("❌ فشل حذف المريض: " + (data.message || "خطأ غير معروف"));
        }
    } catch (err) {
        console.error("خطأ في حذف المريض:", err);
        alert("خطأ في الاتصال بالسيرفر");
    }
}

function setFilter(type) {
    currentFilter = type;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const btnText = btn.textContent.trim();
        btn.classList.toggle('active', btnText === type || (type === 'حجز عادي' && btnText === 'عادي'));
    });
    renderPatients();
}

function filterPatients() {
    renderPatients();
}

function toggleBookingStatus() {
    bookingOpen = !bookingOpen;
    const btn = document.getElementById('toggle-booking-btn');
    const text = document.getElementById('booking-text');
    if(btn) btn.textContent = bookingOpen ? "إيقاف الحجوزات" : "فتح الحجوزات";
    if(btn) btn.className = bookingOpen ? "btn btn-orange" : "btn btn-green";
    if(text) text.innerHTML = `حالة الحجز الآن: ${bookingOpen ? "🟢 مفتوح" : "🔴 مغلق"}`;
}

// ==========================================
// --- السجل وإنهاء اليوم ---
// ==========================================
function confirmEndDay() {
    if(patients.length === 0) return alert("لا يوجد مرضى لليوم!");
    if(confirm("هل تريد إنهاء اليوم وحفظ السجل؟ سيتم مسح قائمة اليوم ونقلها للأرشيف.")) {
        let history = JSON.parse(localStorage.getItem('clinicHistory')) || [];
        history.push({ 
            date: new Date().toLocaleString('ar-EG'), 
            count: patients.length,
            data: [...patients] 
        });
        localStorage.setItem('clinicHistory', JSON.stringify(history));
        patients = []; 
        renderPatients();
        alert("تم أرشفة بيانات اليوم بنجاح.");
    }
}

function showHistory() {
    document.getElementById('doc-dashboard-section').classList.add('hidden');
    document.getElementById('history-section').classList.remove('hidden');
    const content = document.getElementById('history-content');
    let history = JSON.parse(localStorage.getItem('clinicHistory')) || [];
    
    if(history.length === 0) {
        content.innerHTML = "<p style='text-align:center; padding:20px;'>لا يوجد سجلات سابقة بعد.</p>";
        return;
    }

    content.innerHTML = history.reverse().map(h => `
        <div style="border:1px solid #ddd; border-radius:10px; margin-bottom:15px; padding:15px; background:#fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <h4 style="color:#17a2b8; margin-top:0;">📅 التاريخ: ${h.date}</h4>
            <p><strong>عدد الحالات:</strong> ${h.count}</p>
            <details>
                <summary style="cursor:pointer; color:#007bff;">عرض قائمة المرضى</summary>
                <ul style="margin-top:10px; padding-right:20px;">
                    ${h.data.map(p => `<li>${p.name} - <small>${p.type}</small> ${p.prescription ? `<br><i style="color:gray;">روشتة: ${p.prescription}</i>` : ''}</li>`).join('')}
                </ul>
            </details>
        </div>
    `).join('');
}

function hideHistory() {
    document.getElementById('history-section').classList.add('hidden');
    document.getElementById('doc-dashboard-section').classList.remove('hidden');
}

// ==========================================
// --- بيانات المريض (للدكتور) ---
// ==========================================
function renderPatientInfoModal(p) {
    const bloodColor = { 'A+':'#e74c3c','A-':'#c0392b','B+':'#e67e22','B-':'#d35400','AB+':'#8e44ad','AB-':'#6c3483','O+':'#27ae60','O-':'#1e8449' };
    const bColor = bloodColor[p.blood_type] || '#3498db';
    const photoHtml = p.profile_pic
        ? `<img src="${p.profile_pic}" alt="صورة المريض" style="width:70px; height:70px; border-radius:50%; object-fit:cover; border:3px solid #3498db; margin-bottom:10px;">`
        : `<div style="width:70px; height:70px; border-radius:50%; background:linear-gradient(135deg,#3498db,#2980b9); display:inline-flex; align-items:center; justify-content:center; margin-bottom:10px;"><i class="fas fa-user" style="color:white; font-size:30px;"></i></div>`;
    return `
        <div style="text-align:center; margin-bottom:20px;">
            ${photoHtml}
            <h3 style="margin:0; color:#2c3e50; font-size:18px;">${p.name || '—'}</h3>
            ${p.phone ? `<p style="color:#7f8c8d; font-size:13px; margin:4px 0;"><i class="fas fa-phone"></i> ${p.phone}</p>` : ''}
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:16px;">
            <div style="background:#f0f4ff; border-radius:10px; padding:12px; text-align:center;">
                <i class="fas fa-birthday-cake" style="color:#3498db; font-size:18px; margin-bottom:6px; display:block;"></i>
                <div style="font-size:11px; color:#7f8c8d; margin-bottom:4px;">العمر</div>
                <div style="font-weight:bold; color:#2c3e50; font-size:16px;">${p.age ? p.age + ' سنة' : '—'}</div>
            </div>
            <div style="background:#fff5f0; border-radius:10px; padding:12px; text-align:center;">
                <i class="fas fa-tint" style="color:${bColor}; font-size:18px; margin-bottom:6px; display:block;"></i>
                <div style="font-size:11px; color:#7f8c8d; margin-bottom:4px;">فصيلة الدم</div>
                <div style="font-weight:bold; color:${bColor}; font-size:16px;">${p.blood_type || '—'}</div>
            </div>
            <div style="background:#f0fff4; border-radius:10px; padding:12px; text-align:center;">
                <i class="fas fa-id-badge" style="color:#27ae60; font-size:18px; margin-bottom:6px; display:block;"></i>
                <div style="font-size:11px; color:#7f8c8d; margin-bottom:4px;">رقم المريض</div>
                <div style="font-weight:bold; color:#27ae60; font-size:14px;">#${p.id}</div>
            </div>
        </div>
        <div style="background:#fefefe; border:1px solid #e9ecef; border-radius:10px; padding:14px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <i class="fas fa-heartbeat" style="color:#e74c3c;"></i>
                <span style="font-weight:bold; color:#2c3e50; font-size:14px;">الأمراض المزمنة / الملاحظات</span>
            </div>
            <p style="color:#555; font-size:13px; line-height:1.8; margin:0; white-space:pre-wrap;">${p.diseases || 'لم يتم إدخال بيانات بعد'}</p>
        </div>
        ${(!p.age && !p.blood_type && !p.diseases) ? `
        <div style="margin-top:12px; background:#fffbeb; border:1px solid #fcd34d; border-radius:8px; padding:10px; text-align:center; font-size:12px; color:#92400e;">
            <i class="fas fa-info-circle"></i> المريض لم يكمل بياناته الصحية بعد
        </div>` : ''}
    `;
}

async function showPatientInfo(patientId) {
    let modal = document.getElementById('patient-info-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'patient-info-modal';
        modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9999; justify-content:center; align-items:center;';
        modal.innerHTML = `
            <div id="patient-info-box" style="background:#fff; border-radius:16px; padding:28px; max-width:420px; width:90%; box-shadow:0 10px 40px rgba(0,0,0,0.2); position:relative; font-family:inherit; direction:rtl;">
                <button onclick="closePatientInfoModal()" style="position:absolute; top:12px; left:12px; background:#fee2e2; color:#ef4444; border:none; border-radius:50%; width:32px; height:32px; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center;">&times;</button>
                <div id="patient-info-content">
                    <div style="text-align:center; padding:30px; color:#bdc3c7;">
                        <i class="fas fa-spinner fa-spin fa-2x"></i>
                        <p style="margin-top:10px;">جاري تحميل بيانات المريض...</p>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closePatientInfoModal(); });
    }

    modal.style.display = 'flex';

    // اعرض البيانات المخزنة فوراً لو موجودة
    const cachedPatient = patients.find(p => p.id === patientId && !p.isLocal);
    if (cachedPatient) {
        document.getElementById('patient-info-content').innerHTML = renderPatientInfoModal(cachedPatient);
    }

    // جيب أحدث البيانات من السيرفر في الخلفية
    try {
        const res = await fetch(`http://localhost:3000/patient/profile/${patientId}`);
        if (!res.ok) throw new Error('فشل جلب البيانات');
        const p = await res.json();

        // تحديث البيانات المخزنة في الـ array
        const idx = patients.findIndex(pt => pt.id === patientId);
        if (idx !== -1) {
            patients[idx] = { ...patients[idx], phone: p.phone, age: p.age, blood_type: p.blood_type, diseases: p.diseases, profile_pic: p.profile_pic || null };
        }

        const contentEl = document.getElementById('patient-info-content');
        if (contentEl) contentEl.innerHTML = renderPatientInfoModal(p);

    } catch (err) {
        if (!cachedPatient) {
            document.getElementById('patient-info-content').innerHTML = `
                <div style="text-align:center; padding:30px; color:#e74c3c;">
                    <i class="fas fa-exclamation-circle fa-2x" style="margin-bottom:10px;"></i>
                    <p>تعذر تحميل بيانات المريض</p>
                    <button onclick="showPatientInfo(${patientId})" style="margin-top:10px; padding:8px 16px; background:#3498db; color:white; border:none; border-radius:8px; cursor:pointer;">إعادة المحاولة</button>
                </div>`;
        }
    }
}


function closePatientInfoModal() {
    const modal = document.getElementById('patient-info-modal');
    if (modal) modal.style.display = 'none';
}


async function showDashboard(name) {
    const displayEl = document.getElementById('doc-name-display');
    if(displayEl) displayEl.textContent = name;

    // عرض التخصص المحفوظ
    const specialty = localStorage.getItem('currentDoctorSpecialty');
    const specEl = document.getElementById('doc-specialty-display');
    if (specEl && specialty) specEl.textContent = specialty;

    // تعبئة اسم وتخصص جنب الصورة في الشاشة الرئيسية
    const photoName = document.getElementById('photo-section-name');
    const photoSpec = document.getElementById('photo-section-specialty');
    if (photoName) photoName.textContent = name;
    if (photoSpec && specialty) photoSpec.textContent = specialty;

    // تعبئة حقول التعديل
    const editName = document.getElementById('edit-doctor-name');
    const editSpec = document.getElementById('edit-doctor-specialty');
    if (editName) editName.value = name;
    if (editSpec && specialty) editSpec.value = specialty;
    document.getElementById('doctor-auth-section')?.classList.add('hidden');
    document.getElementById('patient-auth-section')?.classList.add('hidden');
    document.getElementById('doc-dashboard-section')?.classList.remove('hidden');
    loadDoctorPhoto();
    await fetchDoctorPatients();
}

// ==========================================
// --- صورة الدكتور في لوحة العيادة ---
// ==========================================
async function loadDoctorPhoto() {
    const doctorId = localStorage.getItem('currentDoctorId');
    if (!doctorId) return;
    const imgEl = document.getElementById('doctor-clinic-photo');
    const removeBtn = document.getElementById('remove-doctor-photo-btn');
    const key = `docPhoto_${doctorId}`;

    // 1) عرض فوري من localStorage لو موجودة
    const cached = localStorage.getItem(key);
    if (cached && imgEl) {
        imgEl.src = cached;
        if (removeBtn) removeBtn.style.display = 'inline-flex';
    }

    // 2) محاولة جلب أحدث صورة من السيرفر في الخلفية (لو شغال)
    try {
        const res = await fetch(`http://localhost:3000/doctor/doctors`);
        if (!res.ok) return;
        const allDocs = await res.json();
        const me = allDocs.find(d => d.id === parseInt(doctorId));
        if (me && me.profile_pic) {
            // تحديث localStorage بالصورة الأحدث من السيرفر
            localStorage.setItem(key, me.profile_pic);
            if (imgEl) imgEl.src = me.profile_pic;
            if (removeBtn) removeBtn.style.display = 'inline-flex';
        } else if (!cached) {
            if (imgEl) imgEl.src = 'https://via.placeholder.com/80';
            if (removeBtn) removeBtn.style.display = 'none';
        }
    } catch (err) {
        console.warn('تعذر جلب صورة الدكتور من السيرفر (محملة من localStorage):', err);
    }
}

function handleDoctorPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // ضغط الصورة قبل الرفع عشان تعدي حد الـ 10mb
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
        // تصغير لأقصى 600px مع الحفاظ على النسبة
        const maxSize = 600;
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else       { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);

        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        const doctorId = localStorage.getItem('currentDoctorId');
        const key = `docPhoto_${doctorId}`;

        // عرض فوري
        document.getElementById('doctor-clinic-photo').src = base64;
        const removeBtn = document.getElementById('remove-doctor-photo-btn');
        if (removeBtn) removeBtn.style.display = 'inline-flex';

        // رفع للسيرفر
        try {
            const resp = await fetch('http://localhost:3000/doctor/upload-pic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ doctor_id: parseInt(doctorId), profile_pic: base64 })
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                // نجح — نحفظ في localStorage
                localStorage.setItem(key, base64);
            } else {
                // فشل — نحذف الـ cache عشان refresh ييجي بالصح من السيرفر
                localStorage.removeItem(key);
                console.warn('فشل حفظ الصورة في السيرفر:', data);
            }
        } catch (err) {
            // السيرفر مش شغال — نحفظ محلياً عشان الصورة تفضل
            localStorage.setItem(key, base64);
            console.warn('السيرفر مش شغال، الصورة محفوظة محلياً:', err);
        }
    };
    img.src = url;
}

async function removeDoctorPhoto() {
    const doctorId = localStorage.getItem('currentDoctorId');
    const key = `docPhoto_${doctorId}`;
    localStorage.removeItem(key);
    document.getElementById('doctor-clinic-photo').src = 'https://via.placeholder.com/80';
    const removeBtn = document.getElementById('remove-doctor-photo-btn');
    if (removeBtn) removeBtn.style.display = 'none';
    try {
        await fetch('http://localhost:3000/doctor/upload-pic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ doctor_id: parseInt(doctorId), profile_pic: null })
        });
    } catch (err) { console.warn('تعذر حذف الصورة من السيرفر:', err); }
}


// ==========================================
// --- تعديل ملف الدكتور الشخصي ---
// ==========================================
async function changePassword() {
    const doctorId = localStorage.getItem('currentDoctorId');
    const oldPass = document.getElementById('old-password').value.trim();
    const newPass = document.getElementById('new-password').value.trim();
    const confirmPass = document.getElementById('confirm-new-password').value.trim();
    const msgEl = document.getElementById('change-password-msg');

    if (!oldPass || !newPass || !confirmPass) {
        msgEl.textContent = '⚠️ يرجى ملء جميع الحقول';
        msgEl.style.color = '#e74c3c';
        return;
    }
    if (newPass !== confirmPass) {
        msgEl.textContent = '⚠️ كلمة السر الجديدة غير متطابقة';
        msgEl.style.color = '#e74c3c';
        return;
    }
    if (newPass.length < 4) {
        msgEl.textContent = '⚠️ كلمة السر يجب أن تكون 4 أحرف على الأقل';
        msgEl.style.color = '#e74c3c';
        return;
    }

    try {
        const res = await fetch('http://localhost:3000/doctor/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ doctor_id: parseInt(doctorId), old_password: oldPass, new_password: newPass })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            msgEl.textContent = '✅ تم تغيير كلمة السر بنجاح';
            msgEl.style.color = '#27ae60';
            document.getElementById('old-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-new-password').value = '';
            setTimeout(() => { msgEl.textContent = ''; }, 2500);
        } else {
            msgEl.textContent = '❌ ' + (data.message || 'فشل تغيير كلمة السر');
            msgEl.style.color = '#e74c3c';
        }
    } catch {
        msgEl.textContent = '⚠️ تعذر الاتصال بالسيرفر';
        msgEl.style.color = '#f39c12';
    }
}

function toggleEditProfile() {
    const form = document.getElementById('edit-profile-form');
    const chevron = document.getElementById('edit-profile-chevron');
    const isOpen = form.style.display !== 'none';
    form.style.display = isOpen ? 'none' : 'block';
    if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
}

function toggleDoctorChangePass() {
    const form = document.getElementById('doctor-change-pass-form');
    const chevron = document.getElementById('doctor-pass-chevron');
    const isOpen = form.style.display === 'flex';
    form.style.display = isOpen ? 'none' : 'flex';
    if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
}

async function saveProfileChanges() {
    const doctorId = localStorage.getItem('currentDoctorId');
    const name = document.getElementById('edit-doctor-name').value.trim();
    const specialty = document.getElementById('edit-doctor-specialty').value.trim();
    const msgEl = document.getElementById('edit-profile-msg');

    if (!name || !specialty) { msgEl.textContent = '⚠️ يرجى ملء الاسم والتخصص'; msgEl.style.color = '#e74c3c'; return; }

    try {
        const res = await fetch('http://localhost:3000/doctor/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ doctor_id: parseInt(doctorId), name, specialty })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            localStorage.setItem('currentDoctorName', name);
            localStorage.setItem('currentDoctorSpecialty', specialty);
            const displayEl = document.getElementById('doc-name-display');
            if (displayEl) displayEl.textContent = name;
            const specEl = document.getElementById('doc-specialty-display');
            if (specEl) specEl.textContent = specialty;
            const photoName = document.getElementById('photo-section-name');
            const photoSpec = document.getElementById('photo-section-specialty');
            if (photoName) photoName.textContent = name;
            if (photoSpec) photoSpec.textContent = specialty;
            msgEl.textContent = '✅ تم الحفظ بنجاح';
            msgEl.style.color = '#27ae60';
            setTimeout(() => { msgEl.textContent = ''; toggleEditProfile(); }, 1800);
        } else {
            msgEl.textContent = data.message || '❌ فشل الحفظ';
            msgEl.style.color = '#e74c3c';
        }
    } catch {
        // حفظ محلي فقط لو السيرفر مش شغال
        localStorage.setItem('currentDoctorName', name);
        localStorage.setItem('currentDoctorSpecialty', specialty);
        const displayEl = document.getElementById('doc-name-display');
        if (displayEl) displayEl.textContent = name;
        const specEl = document.getElementById('doc-specialty-display');
        if (specEl) specEl.textContent = specialty;
        msgEl.textContent = '✅ تم الحفظ محلياً (السيرفر غير متاح)';
        msgEl.style.color = '#f39c12';
        setTimeout(() => { msgEl.textContent = ''; toggleEditProfile(); }, 2000);
    }
}

function goToSection(target) {
    document.getElementById('doctor-auth-section')?.classList.add('hidden');
    document.getElementById('patient-auth-section')?.classList.add('hidden');
    document.getElementById('doc-dashboard-section')?.classList.add('hidden');
    
    if(target === 'doctor') {
        const savedDoc = localStorage.getItem('currentDoctorName');
        if(savedDoc) showDashboard(savedDoc);
        else document.getElementById('doctor-auth-section').classList.remove('hidden');
    } else {
        document.getElementById('patient-auth-section').classList.remove('hidden');
    }
}

function logout() { 
    localStorage.clear(); 
    location.reload(); 
}

// ==========================================
// --- نظام الثيم (الوضع الليلي) ---
// ==========================================
function initTheme() {
    const themeBtn = document.getElementById('theme-toggle');
    const body = document.body;
    
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-theme');
        if (themeBtn) themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }

    if (themeBtn) {
        themeBtn.onclick = () => {
            body.classList.toggle('dark-theme');
            const isDark = body.classList.contains('dark-theme');
            themeBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        };
    }
}

// التشغيل الابتدائي
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    const docName = localStorage.getItem('currentDoctorName');
    const docId   = localStorage.getItem('currentDoctorId');
    if(docName) {
        // جلب أحدث بيانات الدكتور (الاسم والتخصص) من السيرفر في الخلفية
        if (docId) {
            fetch('http://localhost:3000/doctor/doctors').then(r => r.json()).then(all => {
                const me = all.find(d => d.id === parseInt(docId));
                if (me) {
                    localStorage.setItem('currentDoctorName', me.name);
                    if (me.specialty) localStorage.setItem('currentDoctorSpecialty', me.specialty);
                }
            }).catch(() => {});
        }
        showDashboard(docName);
    }
    if (document.getElementById('weekly-schedule-inputs')) {
        generateScheduleInputs();
    }
});
