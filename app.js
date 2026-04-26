document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

const state = {
    students: [],
    activeIndex: -1
};

function initApp() {
    updateDate();
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
        
        const lastDate = localStorage.getItem('hifdh_last_date');
        const todayStr = new Date().toLocaleDateString('ar-SA');
        
        if (lastDate !== todayStr) {
            // Auto-archive if date changed (optional, but let's keep it manual for user control)
            localStorage.setItem('hifdh_last_date', todayStr);
        }
    }
}

function saveToLocal() {
    localStorage.setItem('hifdh_students', JSON.stringify(state.students));
}

function updateDate() {
    const dateEl = document.getElementById('currentDate');
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('ar-SA', options);
}

// UI Rendering
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
    document.getElementById('activeStudentPhone').textContent = student.phone ? `📱 ${student.phone}` : 'بدون رقم';
    
    updateSummary();
    renderHistory();
    
    const evalDisplay = document.querySelector('#selectedEval span');
    evalDisplay.textContent = student.today.evaluation || 'لم يتم التقييم';
    
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
        today: { lesson: null, revision: null, evaluation: null },
        history: []
    };
    
    state.students.push(newStudent);
    saveToLocal();
    renderStudentList();
    selectStudent(state.students.length - 1);
};

// History Logic
window.archiveToday = function() {
    if (state.activeIndex === -1) return;
    const student = state.students[state.activeIndex];
    
    if (!student.today.lesson && !student.today.revision) {
        return alert('لا يوجد إنجاز لتسجيله اليوم!');
    }

    const record = {
        date: new Date().toLocaleDateString('ar-SA'),
        lesson: student.today.lesson,
        revision: student.today.revision,
        evaluation: student.today.evaluation
    };

    if (!student.history) student.history = [];
    student.history.unshift(record); // Add to beginning
    
    // Clear today
    student.today = { lesson: null, revision: null, evaluation: null };
    
    saveToLocal();
    selectStudent(state.activeIndex);
    alert('تم حفظ إنجاز اليوم في السجل بنجاح! ✅');
};

function renderHistory() {
    if (state.activeIndex === -1) return;
    const student = state.students[state.activeIndex];
    const historyList = document.getElementById('historyList');
    
    if (!student.history || student.history.length === 0) {
        historyList.innerHTML = '<p class="empty-msg">لا توجد سجلات سابقة لهذا الطالب بعد.</p>';
        return;
    }

    historyList.innerHTML = student.history.map(item => `
        <div class="history-item">
            <span class="history-date">${item.date}</span>
            <div class="history-content">
                <span>📚 الدرس: ${item.lesson || '---'}</span>
                <span>🔄 المراجعة: ${item.revision || '---'}</span>
                <span>🏆 التقييم: ${item.evaluation || '---'}</span>
            </div>
        </div>
    `).join('');
}

// Data Management
window.saveLesson = function() {
    if (state.activeIndex === -1) return alert('الرجاء اختيار طالب أولاً');
    const input = document.getElementById('lessonInput');
    if (input.value.trim() === '') return;
    
    state.students[state.activeIndex].today.lesson = input.value;
    updateSummary();
    saveToLocal();
    input.value = '';
};

window.saveRevision = function() {
    if (state.activeIndex === -1) return alert('الرجاء اختيار طالب أولاً');
    const input = document.getElementById('revisionInput');
    if (input.value.trim() === '') return;
    
    state.students[state.activeIndex].today.revision = input.value;
    updateSummary();
    saveToLocal();
    input.value = '';
};

function updateSummary() {
    if (state.activeIndex === -1) return;
    const student = state.students[state.activeIndex];
    const lessonVal = document.querySelector('#lessonStat .stat-value');
    const revisionVal = document.querySelector('#revisionStat .stat-value');

    lessonVal.textContent = student.today.lesson || 'لم يبدأ';
    revisionVal.textContent = student.today.revision || 'لم يبدأ';
    
    [lessonVal, revisionVal].forEach(el => {
        el.style.animation = 'none';
        el.offsetHeight;
        el.style.animation = 'fadeIn 0.5s';
    });
    checkShareVisibility();
}

window.setEvaluation = function(val) {
    if (state.activeIndex === -1) return alert('الرجاء اختيار طالب أولاً');
    state.students[state.activeIndex].today.evaluation = val;
    document.querySelector('#selectedEval span').textContent = val;
    saveToLocal();
    checkShareVisibility();
};

function checkShareVisibility() {
    const shareSection = document.getElementById('shareSection');
    if (state.activeIndex === -1) {
        shareSection.classList.add('placeholder');
        return;
    }
    
    const student = state.students[state.activeIndex];
    if (student.today.lesson || student.today.revision) {
        shareSection.classList.remove('placeholder');
        shareSection.innerHTML = `
            <div class="share-info">
                <h3>✨ جاهز للمشاركة (${student.name})</h3>
                <p>يمكنك إرسال التقرير لولي الأمر عبر واتساب مباشرة.</p>
                <div class="share-btns">
                    <button class="btn btn-primary" style="margin-top:10px;" onclick="generateShareCard()">عرض البطاقة 👁️</button>
                    <button class="btn btn-secondary" style="margin-top:10px;" onclick="shareToWhatsApp()">إرسال واتساب 💬</button>
                </div>
            </div>
        `;
    }
}

window.generateShareCard = function() {
    const student = state.students[state.activeIndex];
    document.getElementById('displayStudentName').textContent = student.name;
    document.getElementById('displayLesson').textContent = student.today.lesson || 'لم يتم تسجيل درس';
    document.getElementById('displayRevision').textContent = student.today.revision || 'لم يتم تسجيل مراجعة';
    document.getElementById('displayEval').textContent = student.today.evaluation || 'لم يتم التقييم بعد';
    document.getElementById('cardDate').textContent = document.getElementById('currentDate').textContent;
    document.getElementById('shareModal').style.display = 'flex';
};

window.closeModal = function() {
    document.getElementById('shareModal').style.display = 'none';
};

window.shareToWhatsApp = function() {
    const student = state.students[state.activeIndex];
    const text = `
📖 *تقرير الإنجاز اليومي*
📅 التاريخ: ${document.getElementById('currentDate').textContent}
👤 الطالب: ${student.name}
-------------------------
📚 الدرس الجديد: ${student.today.lesson || '---'}
🔄 المراجعة: ${student.today.revision || '---'}
🏆 التقييم: ${student.today.evaluation || '---'}
-------------------------
بإشراف تطبيق مُتابع الحفظ
    `.trim();

    const encodedText = encodeURIComponent(text);
    const whatsappUrl = student.phone 
        ? `https://wa.me/${student.phone}?text=${encodedText}`
        : `https://wa.me/?text=${encodedText}`;
    
    window.open(whatsappUrl, '_blank');
};

window.copyCardContent = function() {
    const student = state.students[state.activeIndex];
    const reportText = `
📖 *تقرير الإنجاز اليومي*
👤 الطالب: ${student.name}
📚 الدرس: ${student.today.lesson || '---'}
🔄 المراجعة: ${student.today.revision || '---'}
🏆 التقييم: ${student.today.evaluation || '---'}
    `.trim();

    navigator.clipboard.writeText(reportText).then(() => {
        alert('تم نسخ التقرير بنجاح!');
    });
};
