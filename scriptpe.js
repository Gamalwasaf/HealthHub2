/**
 * HealthHub - Patient Portal Logic (Fixed V5 Final)
 */

// 1. البيانات الأساسية
const doctors = [];
let selectedDoctor = null;
let recentSearches = JSON.parse(localStorage.getItem('recentDocs') || '[]');
let bookingStatus = { bookingOpen: true }; // يتحدث من السيرفر عند التحميل

// 2. التشغيل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    loadUserData();
    await fetchBookingStatus();
    await fetchDoctors();
    loadAppointments();
    displayRecent();
    setupEventListeners();
});

async function fetchBookingStatus() {
    try {
        const res = await fetch('http://localhost:3000/doctor/booking-status');
        if (res.ok) bookingStatus = await res.json();
    } catch (err) {
        console.warn("تعذر جلب حالة الحجز:", err);
    }
}

async function fetchDoctors() {
    const container = document.getElementById('doctors-cards');
    // استخدام عنوان IP المحلي لضمان الوصول للسيرفر من المتصفح
    const API_URL = 'http://127.0.0.1:3000/doctor/doctors';
    
    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error('فشل الاتصال بالسيرفر');
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data)) {
            throw new Error('بيانات غير صالحة من السيرفر');
        }

        // تحويل البيانات لتناسب الشكل المتوقع في الفرونت إند
        const formattedDoctors = data.map(d => ({
            id: d.id,
            name: d.name,
            spec: d.specialty,
            rating: parseFloat(d.rating) || 0,
            rating_count: d.rating_count || 0,
            price: d.price || 200,
            profile_pic: d.profile_pic || null
        }));
        
        doctors.length = 0;
        doctors.push(...formattedDoctors);
        displayDoctors(doctors);
        
    } catch (err) {
        console.error("خطأ في جلب الأطباء:", err);
        if (container) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 20px; background: #fff5f5; border-radius: 10px; border: 1px solid #feb2b2;">
                    <p style="color: #c53030; font-weight: bold; margin-bottom: 10px;">⚠️ تعذر جلب الأطباء من قاعدة البيانات</p>
                    <p style="font-size: 14px; color: #742a2a;">تأكد من تشغيل السيرفر (Node.js) على جهازك.</p>
                    <button onclick="fetchDoctors()" style="margin-top: 10px; padding: 8px 15px; background: #c53030; color: white; border: none; border-radius: 5px; cursor: pointer;">إعادة المحاولة</button>
                </div>
            `;
        }
    }
}

// 3. إدارة بيانات المستخدم والصورة والثيم
function loadUserData() {
    const name = localStorage.getItem('userName');
    const nameDisplay = document.getElementById('patient-name-display');
    if (nameDisplay) {
        nameDisplay.innerText = (name && name !== "undefined" && name !== "null") ? name : "المريض العزيز";
    }

    const age = localStorage.getItem('userAge');
    const blood = localStorage.getItem('userBlood');
    const disease = localStorage.getItem('userDisease');
    document.getElementById('display-age').innerText = (age && age !== "null" && age !== "") ? age : "اضغط للتعديل";
    document.getElementById('display-blood').innerText = (blood && blood !== "null" && blood !== "") ? blood : "اضغط للتعديل";
    document.getElementById('display-disease').innerText = (disease && disease !== "null" && disease !== "") ? disease : "اضغط للتعديل";

    const patientId = localStorage.getItem('userId');
    const imgDisplay = document.getElementById('profile-img-display');
    const picKey = `patPhoto_${patientId}`;

    // 1) عرض فوري من localStorage
    const cached = localStorage.getItem(picKey);
    if (cached && imgDisplay) imgDisplay.src = cached;

    // 2) جلب من السيرفر في الخلفية (لو شغال)
    if (patientId) {
        fetch(`http://localhost:3000/patient/profile/${patientId}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (!data) return;
                if (data.profile_pic) {
                    localStorage.setItem(picKey, data.profile_pic);
                    if (imgDisplay) imgDisplay.src = data.profile_pic;
                }
                if (data.age)        { localStorage.setItem('userAge', data.age);         document.getElementById('display-age').innerText = data.age; }
                if (data.blood_type) { localStorage.setItem('userBlood', data.blood_type); document.getElementById('display-blood').innerText = data.blood_type; }
                if (data.diseases)   { localStorage.setItem('userDisease', data.diseases); document.getElementById('display-disease').innerText = data.diseases; }
                if (data.name)       { localStorage.setItem('userName', data.name); if (nameDisplay) nameDisplay.innerText = data.name; }
            })
            .catch(err => console.warn('تعذر جلب بيانات المريض من السيرفر:', err));
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // ضغط الصورة قبل الرفع
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
        const maxSize = 600;
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else       { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);

        const base64Image = canvas.toDataURL('image/jpeg', 0.8);
        const patientId = localStorage.getItem('userId');
        const picKey = `patPhoto_${patientId}`;

        // عرض فوري
        document.getElementById('profile-img-display').src = base64Image;

        // رفع للسيرفر
        if (patientId) {
            try {
                const resp = await fetch('http://localhost:3000/patient/upload-pic', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ patient_id: parseInt(patientId), profile_pic: base64Image })
                });
                const data = await resp.json();
                if (resp.ok && data.success) {
                    // نجح — نحفظ في localStorage
                    localStorage.setItem(picKey, base64Image);
                } else {
                    localStorage.removeItem(picKey);
                    console.warn('فشل حفظ صورة المريض في السيرفر:', data);
                }
            } catch (err) {
                // السيرفر مش شغال — نحفظ محلياً
                localStorage.setItem(picKey, base64Image);
                console.warn('السيرفر مش شغال، الصورة محفوظة محلياً:', err);
            }
        }
    };
    img.src = url;
}

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

// 4. نظام الملف الشخصي (تعديل وحفظ)
function toggleEditProfile(isEdit) {
    const viewDiv = document.getElementById('profile-view');
    const editDiv = document.getElementById('profile-edit');
    
    if (isEdit) {
        viewDiv.classList.add('hidden');
        editDiv.classList.remove('hidden');
        
        if(document.getElementById('input-name')) {
            document.getElementById('input-name').value = localStorage.getItem('userName') || "";
        }
        document.getElementById('input-age').value = localStorage.getItem('userAge') || "";
        document.getElementById('input-blood').value = localStorage.getItem('userBlood') || "O+";
        document.getElementById('input-disease').value = localStorage.getItem('userDisease') || "";
    } else {
        viewDiv.classList.remove('hidden');
        editDiv.classList.add('hidden');
    }
}

async function saveProfileData() {
    const newName = document.getElementById('input-name') ? document.getElementById('input-name').value.trim() : null;
    const age = document.getElementById('input-age').value.trim();
    const blood = document.getElementById('input-blood').value;
    const disease = document.getElementById('input-disease').value.trim();

    // السماح بحفظ البيانات حتى لو بعض الحقول فارغة
    if (newName) localStorage.setItem('userName', newName);
    if (age) localStorage.setItem('userAge', age);
    if (blood) localStorage.setItem('userBlood', blood);
    localStorage.setItem('userDisease', disease);

    // تحديث فوري لكل العناصر المعروضة
    const nameDisplay = document.getElementById('patient-name-display');
    if (nameDisplay && newName) nameDisplay.innerText = newName;

    const ageDisplay = document.getElementById('display-age');
    if (ageDisplay) ageDisplay.innerText = age || "غير محدد";

    const bloodDisplay = document.getElementById('display-blood');
    if (bloodDisplay) bloodDisplay.innerText = blood || "غير محدد";

    const diseaseDisplay = document.getElementById('display-disease');
    if (diseaseDisplay) diseaseDisplay.innerText = disease || "لا يوجد";

    // حفظ البيانات في قاعدة البيانات عشان الدكتور يشوفها
    const patientId = localStorage.getItem('userId');
    if (patientId) {
        try {
            const response = await fetch('http://localhost:3000/patient/update-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: parseInt(patientId),
                    name: newName || null,
                    age: age ? (parseInt(age) || null) : null,
                    blood_type: blood || null,
                    diseases: disease || null
                })
            });
            const result = await response.json();
            if (result.success) {
                showToast("✅ تم حفظ بياناتك بنجاح وستظهر للطبيب");
            } else {
                showToast("⚠️ تم الحفظ محلياً فقط، تحقق من الاتصال بالسيرفر");
            }
        } catch (err) {
            console.warn("تعذر حفظ البيانات في السيرفر، محفوظة محلياً فقط:", err);
            showToast("⚠️ تم الحفظ محلياً فقط، تحقق من الاتصال بالسيرفر");
        }
    }

    toggleEditProfile(false);
}

function showToast(msg) {
    let toast = document.getElementById('save-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'save-toast';
        toast.style.cssText = 'position:fixed; bottom:30px; left:50%; transform:translateX(-50%); background:#2c3e50; color:#fff; padding:12px 24px; border-radius:10px; font-size:14px; z-index:99999; opacity:0; transition:opacity 0.3s; white-space:nowrap;';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

// 5. نظام البحث وفلترة الأطباء
function displayDoctors(list) {
    const container = document.getElementById('doctors-cards');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = '<p class="empty-state">لم يتم العثور على أطباء حالياً.</p>';
        return;
    }

    container.innerHTML = list.map(doc => `
        <div class="doctor-card scale-animation" style="background: white; padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: center;">
            <div class="doc-info">
                ${doc.profile_pic
                    ? `<img src="${doc.profile_pic}" alt="صورة الدكتور ${doc.name}" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:3px solid #3498db; margin-bottom:15px;">`
                    : `<i class="fas fa-user-md fa-3x" style="color: #3498db; margin-bottom: 15px; display:block;"></i>`
                }
                <h4 style="margin-bottom: 5px; color: #2c3e50;">${doc.name}</h4>
                <p class="spec-tag" style="background: #e1f5fe; color: #039be5; padding: 4px 12px; border-radius: 20px; display: inline-block; font-size: 13px; margin-bottom: 10px;">${doc.spec}</p>
                <div class="rating" style="margin-bottom: 10px;">
                    ${doc.rating_count > 0
                        ? '<i class="fas fa-star" style="color:#f1c40f"></i>'.repeat(Math.floor(doc.rating))
                          + (doc.rating % 1 >= 0.5 ? '<i class="fas fa-star-half-alt" style="color:#f1c40f"></i>' : '')
                          + `<span style="color: #7f8c8d; font-size: 13px; margin-right: 4px;">${doc.rating} (${doc.rating_count} تقييم)</span>`
                        : '<i class="far fa-star" style="color:#ccc"></i>'.repeat(5)
                          + '<span style="color: #aaa; font-size: 12px; margin-right: 4px;">لا يوجد تقييم بعد</span>'
                    }
                </div>
                <p class="price" style="font-size: 15px; color: #27ae60;">كشف: <b>${doc.price === 0 ? 'مجاني' : doc.price + ' ج.م'}</b></p>
            </div>
            <button id="book-btn-${doc.id}" onclick="checkAndBook(${doc.id}, this)" style="width: 100%; margin-top: 15px; padding: 10px; background: #3498db; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">
                <i class="fas fa-calendar-plus"></i> احجز الآن
            </button>
        </div>
    `).join('');
}

function filterDoctors() {
    const searchTerm = document.getElementById('doctor-search').value.toLowerCase();
    const filtered = doctors.filter(doc => 
        doc.name.toLowerCase().includes(searchTerm) || doc.spec.toLowerCase().includes(searchTerm)
    );

    displayDoctors(filtered);
}

function displayRecent() {
    const container = document.getElementById('recent-list');
    if (!container) return;
    container.innerHTML = recentSearches.map(doc => `
        <span class="search-tag" onclick="quickSearch('${doc.name}')" style="background: #f1f2f6; padding: 5px 12px; border-radius: 15px; font-size: 12px; cursor: pointer;">
            <i class="fas fa-history"></i> ${doc.name}
        </span>
    `).join('');
}

function quickSearch(name) {
    const searchInput = document.getElementById('doctor-search');
    if (searchInput) {
        searchInput.value = name;
        filterDoctors();
    }
}

// 6. نظام الحجز (Modal)

// التحقق real-time من حالة الحجز قبل فتح المودال
async function checkAndBook(docId, btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

    try {
        const res = await fetch('http://localhost:3000/doctor/booking-status');
        if (res.ok) {
            const status = await res.json();
            bookingStatus = status;
        }
    } catch (err) {
        console.warn("تعذر جلب حالة الحجز:", err);
    }

    if (!bookingStatus.bookingOpen) {
        // الحجز مغلق — حدّث شكل الزر وأبلغ المريض
        btn.disabled = true;
        btn.style.background = '#e0e0e0';
        btn.style.color = '#999';
        btn.style.cursor = 'not-allowed';
        btn.innerHTML = '<i class="fas fa-lock"></i> الحجز مغلق حالياً';
        alert("⛔ الحجوزات متوقفة حالياً من قِبل الطبيب، يرجى المحاولة لاحقاً.");
        return;
    }

    // الحجز مفتوح — أعد الزر لحالته وافتح المودال
    btn.disabled = false;
    btn.style.background = '#3498db';
    btn.style.color = 'white';
    btn.style.cursor = 'pointer';
    btn.innerHTML = '<i class="fas fa-calendar-plus"></i> احجز الآن';
    openBookingModal(docId);
}

function openBookingModal(docId) {
    selectedDoctor = doctors.find(d => d.id === docId);
    const modal = document.getElementById('booking-modal');
    const details = document.getElementById('modal-details');
    const today = new Date().toISOString().split('T')[0];

    const actions = document.querySelector('.modal-actions');
    if (actions) actions.style.display = 'flex';
    
    details.innerHTML = `
        <div class="modal-booking-info">
            <i class="fas fa-hospital-user fa-3x" style="color: #3498db; margin-bottom:15px;"></i>
            <h4>تأكيد الحجز مع ${selectedDoctor.name}</h4>
            <div class="date-input-group" style="margin-top: 15px;">
                <label style="display: block; margin-bottom: 5px;">تاريخ الزيارة:</label>
                <input type="date" id="booking-date" min="${today}" value="${today}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
}

async function confirmBooking() {
    const date = document.getElementById('booking-date').value;
    const patientId = localStorage.getItem('userId');
    if (!date || !patientId) return alert("يرجى تسجيل الدخول أولاً");
    if (!selectedDoctor) return alert("يرجى اختيار طبيب أولاً");

    // --- التحقق من حالة الحجوزات والجدول الأسبوعي ---
    try {
        const statusRes = await fetch('http://localhost:3000/doctor/booking-status');
        if (statusRes.ok) {
            const settings = await statusRes.json();

            // تحقق من إيقاف الحجوزات كلياً
            if (!settings.bookingOpen) {
                return alert("⛔ الحجوزات متوقفة حالياً، يرجى المحاولة لاحقاً");
            }

            // تحقق من الجدول الأسبوعي
            const daysMap = { 0: "الأحد", 1: "الاثنين", 2: "الثلاثاء", 3: "الأربعاء", 4: "الخميس", 5: "الجمعة", 6: "السبت" };
            const selectedDate = new Date(date);
            const dayName = daysMap[selectedDate.getDay()];
            const daySchedule = settings.weeklySchedule?.[dayName];

            if (daySchedule && daySchedule.isClosed) {
                return alert(`⛔ يوم ${dayName} مغلق، يرجى اختيار يوم آخر`);
            }
        }
    } catch (err) {
        console.warn("تعذر التحقق من جدول الحجز:", err);
        // لو السيرفر مش شغال نكمل عادي
    }

    try {
        const response = await fetch('http://localhost:3000/patient/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_id: patientId,
                doctor_id: selectedDoctor.id,
                appointment_time: date
            })
        });

        if (response.ok) {
            const bookingResult = await response.json();
            // حفظ الموعد في مواعيدي مع appointment_id الحقيقي من DB
            const appointments = JSON.parse(localStorage.getItem('myAppointments') || '[]');
            appointments.push({
                id: bookingResult.appointment_id,
                doctorName: selectedDoctor.name,
                doctorSpec: selectedDoctor.spec,
                doctorId: selectedDoctor.id,
                date: date,
                status: 'قيد الانتظار'
            });
            localStorage.setItem('myAppointments', JSON.stringify(appointments));

            // حفظ في البحث الأخير
            if (!recentSearches.find(d => d.id === selectedDoctor.id)) {
                recentSearches.unshift({ id: selectedDoctor.id, name: selectedDoctor.name });
                if (recentSearches.length > 5) recentSearches.pop();
                localStorage.setItem('recentDocs', JSON.stringify(recentSearches));
            }

            showSuccessUI();
        } else {
            alert("فشل الحجز، يرجى المحاولة مرة أخرى");
        }
    } catch (err) {
        console.error("خطأ في الحجز:", err);
        alert("خطأ في الاتصال بالسيرفر");
    }
}

function showSuccessUI() {
    const actions = document.querySelector('.modal-actions');
    if (actions) actions.style.display = 'none';
    
    document.getElementById('modal-details').innerHTML = `
        <div class="success-screen" style="text-align:center; padding: 20px;">
            <i class="fas fa-check-circle fa-5x" style="color: #27ae60; margin-bottom: 15px;"></i>
            <h3 style="color: #2c3e50;">تم الحجز بنجاح!</h3>
            <p style="color: #7f8c8d; margin-bottom: 20px;">تم إرسال طلبك للطبيب، يمكنك متابعة الحالة من قائمة مواعيدي.</p>
            <button class="btn-book" onclick="closeModal(); switchTab('my-appointments', null);" style="width:100%; padding: 12px; background: #3498db; color: white; border: none; border-radius: 10px; cursor: pointer;">إغلاق</button>
        </div>
    `;
}

function closeModal() {
    document.getElementById('booking-modal').classList.add('hidden');
}

// 7. التبويبات والمواعيد
function switchTab(tabName, event) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.remove('hidden');
    
    if (event) {
        event.currentTarget.classList.add('active');
    } else {
        document.querySelectorAll('.nav-item').forEach(n => {
            if (n.getAttribute('onclick').includes(tabName)) n.classList.add('active');
        });
    }

    if (tabName === 'my-appointments') loadAppointments();
    if (tabName === 'my-health') loadPrescriptions();
}

async function loadPrescriptions() {
    const container = document.getElementById('prescriptions-list');
    const patientId = localStorage.getItem('userId');
    if (!patientId || !container) return;

    container.innerHTML = `
        <div style="text-align:center; padding: 40px; color: #bdc3c7;">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p style="margin-top: 10px;">جاري تحميل الروشتات...</p>
        </div>`;

    try {
        const response = await fetch(`http://localhost:3000/doctor/prescriptions?patient_id=${patientId}`);
        if (!response.ok) throw new Error('فشل الاتصال');
        const data = await response.json();

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding: 40px; color: #7f8c8d;">
                    <i class="fas fa-file-medical fa-3x" style="color: #dfe6e9; margin-bottom: 15px;"></i>
                    <p>لا توجد روشتات حتى الآن.</p>
                </div>`;
            return;
        }

        container.innerHTML = data.map(rx => {
            const currentRating = rx.my_rating || 0;
            const starsHtml = [1,2,3,4,5].map(star => `
                <i class="fa${star <= currentRating ? 's' : 'r'} fa-star"
                   style="cursor:pointer; color:${star <= currentRating ? '#f1c40f' : '#ddd'}; font-size:22px; margin:0 3px; transition:color 0.15s;"
                   onclick="rateDoctor(${rx.doctor_id}, ${rx.id}, ${star})"
                   title="${star} نجوم"></i>
            `).join('');

            const docPhotoHtml = rx.doctor_pic
                ? `<img src="${rx.doctor_pic}" alt="د. ${rx.doctor_name}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.5);">`
                : `<div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;"><i class="fas fa-user-md" style="color:white;font-size:22px;"></i></div>`;

            const dateStr = new Date(rx.created_at).toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' });

            return `
            <div style="background:#fff;border-radius:16px;margin-bottom:22px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);direction:rtl;">

                <!-- هيدر الدكتور بالصورة -->
                <div style="background:linear-gradient(135deg,#1565c0,#0d47a1);padding:16px 20px;display:flex;align-items:center;gap:14px;">
                    ${docPhotoHtml}
                    <div style="flex:1;">
                        <div style="color:rgba(255,255,255,0.7);font-size:10px;margin-bottom:2px;">الطبيب المعالج</div>
                        <div style="color:white;font-size:16px;font-weight:bold;">د. ${rx.doctor_name}</div>
                        ${rx.doctor_specialty ? `<div style="color:rgba(255,255,255,0.7);font-size:12px;margin-top:2px;">${rx.doctor_specialty}</div>` : ''}
                    </div>
                    <div style="text-align:left;">
                        <div style="color:rgba(255,255,255,0.6);font-size:10px;">تاريخ الروشتة</div>
                        <div style="color:white;font-size:12px;font-weight:500;margin-top:2px;">${dateStr}</div>
                    </div>
                </div>

                <!-- جسم الروشتة -->
                <div style="padding:18px 20px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                        <div style="width:32px;height:32px;border-radius:8px;background:#fff0f0;display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-file-prescription" style="color:#e74c3c;font-size:14px;"></i>
                        </div>
                        <span style="font-size:13px;font-weight:bold;color:#1a2940;">الروشتة الطبية</span>
                    </div>
                    <div style="background:#f8faff;border:1px solid #dce8f8;border-radius:12px;padding:16px;white-space:pre-wrap;font-size:14px;color:#1a2940;line-height:2;font-family:inherit;">${rx.prescription_text}</div>
                </div>

                <!-- قسم التقييم -->
                <div style="padding:14px 20px;background:#f8faff;border-top:1px solid #eef2f8;">
                    <div style="font-size:12px;color:#7f8c8d;margin-bottom:8px;">
                        <i class="fas fa-star" style="color:#f1c40f;margin-left:4px;"></i>
                        ${currentRating > 0 ? `تقييمك للدكتور: ${currentRating}/5 — يمكنك تغييره` : 'قيّم هذا الطبيب:'}
                    </div>
                    <div id="stars-rx-${rx.id}" style="direction:ltr;display:inline-block;">${starsHtml}</div>
                </div>
            </div>`;
        }).join('');

    } catch (err) {
        console.error("خطأ في جلب الروشتات:", err);
        container.innerHTML = `
            <div style="text-align:center; padding: 40px; background: #fff5f5; border-radius: 10px;">
                <i class="fas fa-exclamation-triangle fa-2x" style="color: #e74c3c; margin-bottom: 10px;"></i>
                <p style="color: #c53030;">تعذر تحميل الروشتات، تأكد من تشغيل السيرفر.</p>
                <button onclick="loadPrescriptions()" style="margin-top: 10px; padding: 8px 15px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    إعادة المحاولة
                </button>
            </div>`;
    }
}
async function loadAppointments() {
    const list = document.getElementById('active-list');
    const patientId = localStorage.getItem('userId');
    if (!patientId || !list) return;

    list.innerHTML = '<div style="text-align:center; padding: 20px; color: #7f8c8d;">جاري التحميل...</div>';

    try {
        // نجيب المواعيد من DB مباشرة عشان تكون متزامنة دايماً (حتى لو الدكتور حذف موعد)
        const response = await fetch(`http://localhost:3000/patient/appointments/${patientId}`);
        const appointments = await response.json();

        // نحدث localStorage بالبيانات الحديثة من DB
        localStorage.setItem('myAppointments', JSON.stringify(appointments.map(a => ({
            id: a.id,
            doctorName: a.doctorName,
            doctorSpec: a.doctorSpec,
            doctorId: a.doctorId,
            date: a.appointment_time,
            status: a.status === 'pending' ? 'قيد الانتظار' : a.status
        }))));

        if (appointments.length === 0) {
            list.innerHTML = '<div class="empty-state" style="text-align:center; padding: 40px; color: #7f8c8d;">لا توجد حجوزات حالية.</div>';
            return;
        }

        list.innerHTML = appointments.map(app => `
            <div class="appointment-card" style="background: white; padding: 15px; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <div class="app-info">
                    <h5 style="margin-bottom: 5px;">${app.doctorName}</h5>
                    <p style="font-size: 13px; color: #7f8c8d;"><i class="far fa-calendar-alt"></i> ${app.appointment_time}</p>
                    <span class="status-badge" style="font-size: 11px; background: #e8f5e9; color: #2e7d32; padding: 2px 8px; border-radius: 10px;">${app.status === 'pending' ? 'قيد الانتظار' : app.status}</span>
                </div>
                <button onclick="cancelApp(${app.id})" style="background: #fee2e2; color: #ef4444; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer;"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');
    } catch (err) {
        console.error("خطأ في تحميل الحجوزات:", err);
        // fallback على localStorage لو السيرفر مش شغال
        const appointments = JSON.parse(localStorage.getItem('myAppointments') || '[]');
        if (appointments.length === 0) {
            list.innerHTML = '<div class="empty-state" style="text-align:center; padding: 40px; color: #7f8c8d;">لا توجد حجوزات حالية.</div>';
            return;
        }
        list.innerHTML = appointments.map(app => `
            <div class="appointment-card" style="background: white; padding: 15px; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <div class="app-info">
                    <h5 style="margin-bottom: 5px;">${app.doctorName}</h5>
                    <p style="font-size: 13px; color: #7f8c8d;"><i class="far fa-calendar-alt"></i> ${app.date}</p>
                    <span class="status-badge" style="font-size: 11px; background: #e8f5e9; color: #2e7d32; padding: 2px 8px; border-radius: 10px;">${app.status}</span>
                </div>
                <button onclick="cancelApp(${app.id})" style="background: #fee2e2; color: #ef4444; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer;"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');
    }
}

async function cancelApp(appointmentId) {
    if (!confirm("إلغاء الموعد؟ سيتم حذفه نهائياً.")) return;
    const patientId = parseInt(localStorage.getItem('userId'));
    if (!patientId) return alert("يرجى تسجيل الدخول أولاً");

    try {
        const response = await fetch(`http://localhost:3000/patient/cancel/${appointmentId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patient_id: patientId })
        });
        const data = await response.json();
        if (data.success) {
            // نحدث localStorage ونعيد التحميل من DB
            let apps = JSON.parse(localStorage.getItem('myAppointments') || '[]');
            apps = apps.filter(a => a.id !== appointmentId);
            localStorage.setItem('myAppointments', JSON.stringify(apps));
            loadAppointments();
        } else {
            alert("❌ فشل إلغاء الموعد: " + (data.message || "خطأ غير معروف"));
        }
    } catch (err) {
        console.error("خطأ في إلغاء الموعد:", err);
        // لو السيرفر مش شغال نشيله من localStorage على الأقل
        let apps = JSON.parse(localStorage.getItem('myAppointments') || '[]');
        apps = apps.filter(a => a.id !== appointmentId);
        localStorage.setItem('myAppointments', JSON.stringify(apps));
        loadAppointments();
    }
}

// 8. إعدادات المستمعين والخروج
function setupEventListeners() {
    window.onclick = (e) => {
        if (e.target === document.getElementById('booking-modal')) closeModal();
    };
}

// ==========================================
// --- نظام التقييم بالنجوم ---
// ==========================================
async function rateDoctor(doctorId, prescriptionId, stars) {
    const patientId = localStorage.getItem('userId');
    if (!patientId) return alert("يرجى تسجيل الدخول أولاً");

    try {
        const response = await fetch('http://localhost:3000/doctor/rate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_id: parseInt(patientId),
                doctor_id: doctorId,
                prescription_id: prescriptionId,
                stars: stars
            })
        });
        const data = await response.json();
        if (data.success) {
            // تحديث النجوم في الواجهة فوراً بدون ريلود
            const container = document.getElementById(`stars-rx-${prescriptionId}`);
            if (container) {
                container.innerHTML = [1,2,3,4,5].map(star => `
                    <i class="fa${star <= stars ? 's' : 'r'} fa-star"
                       style="cursor:pointer; color:${star <= stars ? '#f1c40f' : '#ccc'}; font-size:20px; margin:0 2px;"
                       onclick="rateDoctor(${doctorId}, ${prescriptionId}, ${star})"
                       title="${star} نجوم"></i>
                `).join('');
            }
            // تحديث الرسالة فوق النجوم
            const parent = container ? container.parentElement : null;
            if (parent) {
                const msg = parent.querySelector('p');
                if (msg) msg.innerHTML = `<i class="fas fa-star" style="color: #f1c40f;"></i> تقييمك: ${stars}/5 — شكراً لك! يمكنك تغييره`;
            }
        } else {
            alert("❌ فشل حفظ التقييم: " + (data.message || "خطأ غير معروف"));
        }
    } catch (err) {
        console.error("خطأ في التقييم:", err);
        alert("خطأ في الاتصال بالسيرفر");
    }
}

function logout() {
    if (confirm("تسجيل الخروج؟")) {
        localStorage.clear();
        window.location.href = 'index.html';
    }
}

// ==========================================
// --- تغيير كلمة السر للمريض ---
// ==========================================
function togglePatientChangePass() {
    const form = document.getElementById('patient-change-pass-form');
    const chevron = document.getElementById('patient-pass-chevron');
    const isOpen = form.style.display === 'flex';
    form.style.display = isOpen ? 'none' : 'flex';
    if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
}

async function patientChangePassword() {
    const patientId = localStorage.getItem('userId');
    const oldPass = document.getElementById('pat-old-password').value.trim();
    const newPass = document.getElementById('pat-new-password').value.trim();
    const confirmPass = document.getElementById('pat-confirm-new-password').value.trim();
    const msgEl = document.getElementById('pat-change-pass-msg');

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
        const res = await fetch('http://localhost:3000/patient/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patient_id: parseInt(patientId), old_password: oldPass, new_password: newPass })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            msgEl.textContent = '✅ تم تغيير كلمة السر بنجاح';
            msgEl.style.color = '#27ae60';
            document.getElementById('pat-old-password').value = '';
            document.getElementById('pat-new-password').value = '';
            document.getElementById('pat-confirm-new-password').value = '';
            setTimeout(() => { msgEl.textContent = ''; togglePatientChangePass(); }, 2500);
        } else {
            msgEl.textContent = '❌ ' + (data.message || 'فشل تغيير كلمة السر');
            msgEl.style.color = '#e74c3c';
        }
    } catch {
        msgEl.textContent = '⚠️ تعذر الاتصال بالسيرفر';
        msgEl.style.color = '#f39c12';
    }
}
