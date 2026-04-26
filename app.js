document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

const state = {
    students: [],
    activeIndex: -1
};

function initApp() {
    const datePicker = document.getElementById('achievementDate');
    const today = new Date().toISOString().split('T')[0];
    datePicker.value = today;
    
    updateDateDisplay();
    loadFromLocal();
    registerSW();
    renderStudentList();
    if (state.students.length > 0) {
        selectStudent(0);
    }
}

function registerSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('تم تسجيل Service Worker بنجاح.'))
            .catch(err => console.log('فشل تسجيل Service Worker:', err));
    }
}

function loadFromLocal() {
    const savedStudents = localStorage.getItem('hifdh_students');
    if (savedStudents) {
        state.students = JSON.parse(savedStudents);
    }
}

function saveToLocal() {
    localStorage.setItem('hifdh_students', JSON.stringify(state.students));
}

window.updateDateDisplay = function() {
    const picker = document.getElementById('achievementDate');
    const dateEl = document.getElementById('currentDate');
    const selectedDate = new Date(picker.value);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = selectedDate.toLocaleDateString('ar-SA', options);
    dateEl.textContent = formattedDate;
    const cardDate = document.getElementById('cardDate');
    if (cardDate) cardDate.textContent = formattedDate;
};

function renderStudentList() {
    const listEl = document.getElementById('studentList');
    listEl.innerHTML = '';
    state.students.forEach((student, index) => {
        const chip = document.createElement('div');
        chip.className = `student-chip ${index === state.activeIndex ? 'active' : ''}`;
        chip.textContent = student.name;
        chip.onclick = () => selectStudent(index);
        listEl.appendChild(chip);
    });
}

window.selectStudent = function(index) {
    state.activeIndex = index;
    const student = state.students[index];
    document.getElementById('activeStudentName').textContent = student.name;
    document.getElementById('lessonInput').value = student.today.lesson || '';
    document.getElementById('revisionInput').value = student.today.revision || '';
    updateSummary();
    renderHistory();
    renderStudentList();
    checkShareVisibility();
};

window.showAddStudentPrompt = function() {
    const name = prompt('أدخل اسم الطالب الجديد:');
    if (!name) return;
    const phone = prompt('أدخل رقم واتساب ولي الأمر (مثال: 966500000000):');
    const newStudent = {
        name: name,
        phone: phone || '',
        today: { lesson: null, lessonEval: null, revision: null, revisionEval: null },
        history: []
    };
    state.students.push(newStudent);
    saveToLocal();
    renderStudentList();
    selectStudent(state.students.length - 1);
};

window.setEvaluation = function(type, val) {
    if (state.activeIndex === -1) return alert('الرجاء اختيار طالب أولاً');
    const student = state.students[state.activeIndex];
    if (type === 'lesson') {
        student.today.lesson = document.getElementById('lessonInput').value;
        student.today.lessonEval = val;
    } else {
        student.today.revision = document.getElementById('revisionInput').value;
        student.today.revisionEval = val;
    }
    updateSummary();
    saveToLocal();
    checkShareVisibility();
};

function updateSummary() {
    if (state.activeIndex === -1) return;
    const student = state.students[state.activeIndex];
    const lessonVal = document.querySelector('#lessonStat .stat-value');
    const revisionVal = document.querySelector('#revisionStat .stat-value');
    lessonVal.textContent = student.today.lesson ? `${student.today.lesson} (${student.today.lessonEval || 'بدون'})` : 'لم يبدأ';
    revisionVal.textContent = student.today.revision ? `${student.today.revision} (${student.today.revisionEval || 'بدون'})` : 'لم يبدأ';
}

// History Logic
window.archiveToday = function() {
    if (state.activeIndex === -1) return;
    const student = state.students[state.activeIndex];
    const picker = document.getElementById('achievementDate');
    
    if (!student.today.lesson && !student.today.revision) {
        return alert('لا يوجد إنجاز لتسجيله!');
    }

    const selectedDate = new Date(picker.value);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = selectedDate.toLocaleDateString('ar-SA', options);

    const record = {
        date: formattedDate,
        name: student.name,
        lesson: student.today.lesson,
        lessonEval: student.today.lessonEval,
        revision: student.today.revision,
        revisionEval: student.today.revisionEval
    };

    if (!student.history) student.history = [];
    student.history.unshift(record);
    
    student.today = { lesson: null, lessonEval: null, revision: null, revisionEval: null };
    document.getElementById('lessonInput').value = '';
    document.getElementById('revisionInput').value = '';
    
    saveToLocal();
    selectStudent(state.activeIndex);
    alert('تم حفظ الإنجاز في السجل بنجاح! ✅ يمكنك الآن مشاركته من قائمة السجل بالأسفل.');
};

function renderHistory() {
    if (state.activeIndex === -1) return;
    const student = state.students[state.activeIndex];
    const historyList = document.getElementById('historyList');
    
    if (!student.history || student.history.length === 0) {
        historyList.innerHTML = '<p class="empty-msg">لا توجد سجلات سابقة لهذا الطالب بعد.</p>';
        return;
    }

    historyList.innerHTML = student.history.map((item, index) => `
        <div class="history-item">
            <div class="history-header-row">
                <span class="history-date">${item.date}</span>
                <button class="btn-history-share" onclick="shareFromHistory(${index})">مشاركة 📤</button>
            </div>
            <div class="history-content">
                <span>📚 الدرس: ${item.lesson || '---'} [${item.lessonEval || 'بدون'}]</span>
                <span>🔄 المراجعة: ${item.revision || '---'} [${item.revisionEval || 'بدون'}]</span>
            </div>
        </div>
    `).join('');
}

// Unified Sharing Logic
window.shareFromHistory = function(index) {
    const student = state.students[state.activeIndex];
    const item = student.history[index];
    openShareOptions(item, item.date);
};

function openShareOptions(data, dateText) {
    // Populate Modal
    document.getElementById('displayStudentName').textContent = state.students[state.activeIndex].name;
    document.getElementById('displayLesson').textContent = data.lesson || '---';
    document.getElementById('displayLessonEval').textContent = data.lessonEval ? `التقييم: ${data.lessonEval}` : '';
    document.getElementById('displayRevision').textContent = data.revision || '---';
    document.getElementById('displayRevisionEval').textContent = data.revisionEval ? `التقييم: ${data.revisionEval}` : '';
    document.getElementById('cardDate').textContent = dateText;
    
    // Custom button for WhatsApp in Modal
    const modalContent = document.querySelector('.share-btns-modal');
    modalContent.innerHTML = `
        <button class="btn btn-primary share-final-btn" onclick="copyGeneric('${encodeURIComponent(JSON.stringify(data))}', '${dateText}')">نسخ النص 📋</button>
        <button class="btn btn-secondary share-final-btn" onclick="downloadCardAsImage()">تحميل صورة 🖼️</button>
        <button class="btn btn-whatsapp share-final-btn" onclick="whatsappGeneric('${encodeURIComponent(JSON.stringify(data))}', '${dateText}')">واتساب 💬</button>
    `;

    document.getElementById('shareModal').style.display = 'flex';
}

window.whatsappGeneric = function(dataJson, dateText) {
    const data = JSON.parse(decodeURIComponent(dataJson));
    const student = state.students[state.activeIndex];
    const text = `
📖 *تقرير إنجاز*
📅 التاريخ: ${dateText}
👤 الطالب: ${student.name}
-------------------------
📚 الدرس الجديد: ${data.lesson || '---'}
🏆 تقييم الدرس: ${data.lessonEval || '---'}
-------------------------
🔄 المراجعة: ${data.revision || '---'}
🏆 تقييم المراجعة: ${data.revisionEval || '---'}
-------------------------
بإشراف تطبيق مُتابع الحفظ
    `.trim();
    const encodedText = encodeURIComponent(text);
    const whatsappUrl = student.phone ? `https://wa.me/${student.phone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
};

window.copyGeneric = function(dataJson, dateText) {
    const data = JSON.parse(decodeURIComponent(dataJson));
    const student = state.students[state.activeIndex];
    const text = `📖 تقرير إنجاز الطالب: ${student.name}\n📅 التاريخ: ${dateText}\n📚 الدرس: ${data.lesson || '---'} (${data.lessonEval || '---'})\n🔄 المراجعة: ${data.revision || '---'} (${data.revisionEval || '---'})`;
    navigator.clipboard.writeText(text).then(() => alert('تم النسخ!'));
};

function checkShareVisibility() {
    const shareSection = document.getElementById('shareSection');
    if (state.activeIndex === -1) return shareSection.classList.add('placeholder');
    
    const student = state.students[state.activeIndex];
    if (student.today.lesson || student.today.revision) {
        shareSection.classList.remove('placeholder');
        shareSection.innerHTML = `
            <div class="share-info">
                <h3>✨ إنجاز جديد (${student.name})</h3>
                <p>يمكنك مشاركة إنجاز اليوم أو حفظه في السجل بالأسفل.</p>
                <div class="share-btns">
                    <button class="btn btn-primary" onclick="openShareOptions(state.students[state.activeIndex].today, document.getElementById('currentDate').textContent)">مشاركة الإنجاز 🚀</button>
                    <button class="btn btn-secondary" onclick="archiveToday()">حفظ في السجل 💾</button>
                </div>
            </div>
        `;
    }
}

window.closeModal = function() { document.getElementById('shareModal').style.display = 'none'; };

window.downloadCardAsImage = function() {
    const card = document.getElementById('achievementCard');
    html2canvas(card, { scale: 2, backgroundColor: '#f0fdf4' }).then(canvas => {
        const link = document.createElement('a');
        link.download = `إنجاز_${state.students[state.activeIndex].name}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
};
