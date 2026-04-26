document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

const state = {
    students: [],
    activeIndex: -1
};

function initApp() {
    // Set default date in picker
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
    
    // Also update modal date if it's open
    const cardDate = document.getElementById('cardDate');
    if (cardDate) cardDate.textContent = formattedDate;
};

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
    
    // Set inputs to current values if any
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
        today: { 
            lesson: null, lessonEval: null, 
            revision: null, revisionEval: null 
        },
        history: []
    };
    
    state.students.push(newStudent);
    saveToLocal();
    renderStudentList();
    selectStudent(state.students.length - 1);
};

// Data Management
window.setEvaluation = function(type, val) {
    if (state.activeIndex === -1) return alert('الرجاء اختيار طالب أولاً');
    const student = state.students[state.activeIndex];
    
    if (type === 'lesson') {
        const input = document.getElementById('lessonInput');
        student.today.lesson = input.value;
        student.today.lessonEval = val;
    } else {
        const input = document.getElementById('revisionInput');
        student.today.revision = input.value;
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

    const lessonText = student.today.lesson 
        ? `${student.today.lesson} (${student.today.lessonEval || 'بدون تقييم'})` 
        : 'لم يبدأ';
    const revisionText = student.today.revision 
        ? `${student.today.revision} (${student.today.revisionEval || 'بدون تقييم'})` 
        : 'لم يبدأ';

    lessonVal.textContent = lessonText;
    revisionVal.textContent = revisionText;
    
    [lessonVal, revisionVal].forEach(el => {
        el.style.animation = 'none';
        el.offsetHeight;
        el.style.animation = 'fadeIn 0.5s';
    });
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
        lesson: student.today.lesson,
        lessonEval: student.today.lessonEval,
        revision: student.today.revision,
        revisionEval: student.today.revisionEval
    };

    if (!student.history) student.history = [];
    student.history.unshift(record);
    
    // Clear today
    student.today = { lesson: null, lessonEval: null, revision: null, revisionEval: null };
    document.getElementById('lessonInput').value = '';
    document.getElementById('revisionInput').value = '';
    
    saveToLocal();
    selectStudent(state.activeIndex);
    alert('تم حفظ الإنجاز في السجل بنجاح! ✅');
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
                <span>📚 الدرس: ${item.lesson || '---'} [${item.lessonEval || 'بدون'}]</span>
                <span>🔄 المراجعة: ${item.revision || '---'} [${item.revisionEval || 'بدون'}]</span>
            </div>
        </div>
    `).join('');
}

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
    const dateText = document.getElementById('currentDate').textContent;
    
    document.getElementById('displayStudentName').textContent = student.name;
    document.getElementById('displayLesson').textContent = student.today.lesson || 'لم يتم تسجيل درس';
    document.getElementById('displayLessonEval').textContent = student.today.lessonEval ? `التقييم: ${student.today.lessonEval}` : '';
    document.getElementById('displayRevision').textContent = student.today.revision || 'لم يتم تسجيل مراجعة';
    document.getElementById('displayRevisionEval').textContent = student.today.revisionEval ? `التقييم: ${student.today.revisionEval}` : '';
    
    document.getElementById('cardDate').textContent = dateText;
    document.getElementById('shareModal').style.display = 'flex';
};

window.closeModal = function() {
    document.getElementById('shareModal').style.display = 'none';
};

window.shareToWhatsApp = function() {
    const student = state.students[state.activeIndex];
    const dateText = document.getElementById('currentDate').textContent;
    
    const text = `
📖 *تقرير الإنجاز اليومي*
📅 التاريخ: ${dateText}
👤 الطالب: ${student.name}
-------------------------
📚 الدرس الجديد: ${student.today.lesson || '---'}
🏆 تقييم الدرس: ${student.today.lessonEval || '---'}
-------------------------
🔄 المراجعة: ${student.today.revision || '---'}
🏆 تقييم المراجعة: ${student.today.revisionEval || '---'}
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
📚 الدرس: ${student.today.lesson || '---'} (${student.today.lessonEval || '---'})
🔄 المراجعة: ${student.today.revision || '---'} (${student.today.revisionEval || '---'})
    `.trim();

    navigator.clipboard.writeText(reportText).then(() => {
        alert('تم نسخ التقرير بنجاح!');
    });
};

window.downloadCardAsImage = function() {
    const card = document.getElementById('achievementCard');
    const studentName = state.students[state.activeIndex].name;
    
    // Create image
    html2canvas(card, {
        scale: 2, // Higher quality
        backgroundColor: '#f0fdf4'
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `إنجاز_${studentName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
};
