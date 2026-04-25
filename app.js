document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    updateDate();
    loadFromLocal();
    registerSW();
    console.log('مُتابع الحفظ: تم تحميل البيانات بنجاح.');
}

function registerSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('تم تسجيل Service Worker بنجاح.'))
            .catch(err => console.log('فشل تسجيل Service Worker:', err));
    }
}

function loadFromLocal() {
    const savedName = localStorage.getItem('studentName');
    if (savedName) {
        state.today.name = savedName;
        document.getElementById('studentNameInput').value = savedName;
    }
    
    const savedToday = localStorage.getItem('todayData');
    if (savedToday) {
        const data = JSON.parse(savedToday);
        // Only load if it's the same day
        if (data.date === new Date().toLocaleDateString('ar-SA')) {
            state.today = { ...state.today, ...data };
            updateSummary();
            if (state.today.evaluation) {
                document.querySelector('#selectedEval span').textContent = state.today.evaluation;
            }
            checkShareVisibility();
        }
    }
}

function saveToLocal() {
    state.today.date = new Date().toLocaleDateString('ar-SA');
    localStorage.setItem('studentName', state.today.name);
    localStorage.setItem('todayData', JSON.stringify(state.today));
}

function updateDate() {
    const dateEl = document.getElementById('currentDate');
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('ar-SA', options);
}

// State Management (Simple)
const state = {
    today: {
        name: '',
        lesson: null,
        revision: null,
        evaluation: null
    }
};

window.updateStudentName = function() {
    state.today.name = document.getElementById('studentNameInput').value;
    saveToLocal();
    console.log('اسم الطالب:', state.today.name);
};

// Global functions for buttons
window.saveLesson = function() {
    const input = document.getElementById('lessonInput');
    if (input.value.trim() === '') return;
    
    state.today.lesson = input.value;
    updateSummary();
    saveToLocal();
    input.value = ''; // clear input
    console.log('تم حفظ الدرس:', state.today.lesson);
};

window.saveRevision = function() {
    const input = document.getElementById('revisionInput');
    if (input.value.trim() === '') return;
    
    state.today.revision = input.value;
    updateSummary();
    saveToLocal();
    input.value = ''; // clear input
    console.log('تم حفظ المراجعة:', state.today.revision);
};

// Global helper to update UI summary
function updateSummary() {
    const lessonVal = document.querySelector('#lessonStat .stat-value');
    const revisionVal = document.querySelector('#revisionStat .stat-value');

    lessonVal.textContent = state.today.lesson || 'لم يبدأ';
    revisionVal.textContent = state.today.revision || 'لم يبدأ';
    
    // Animate the update
    [lessonVal, revisionVal].forEach(el => {
        el.style.animation = 'none';
        el.offsetHeight; // trigger reflow
        el.style.animation = 'fadeIn 0.5s';
    });
    // Check if we can show the share section
    checkShareVisibility();
}

window.setEvaluation = function(val) {
    state.today.evaluation = val;
    const display = document.querySelector('#selectedEval span');
    display.textContent = val;
    saveToLocal();
    console.log('تم تحديد التقييم:', val);
    checkShareVisibility();
};

function checkShareVisibility() {
    const shareSection = document.getElementById('shareSection');
    if (state.today.lesson || state.today.revision) {
        shareSection.classList.remove('placeholder');
        shareSection.innerHTML = `
            <div class="share-info">
                <h3>✨ جاهز للمشاركة</h3>
                <p>لقد أتممت إنجاز اليوم. يمكنك الآن مشاركة تقريرك مع ولي أمرك.</p>
                <button class="btn btn-primary" style="margin-top:15px; width:100%" onclick="generateShareCard()">مشاركة الإنجاز 🚀</button>
            </div>
        `;
    }
}

window.generateShareCard = function() {
    if (!state.today.name) {
        alert('يرجى كتابة اسم الطالب أولاً في الأعلى.');
        return;
    }

    // Populate Card
    document.getElementById('displayStudentName').textContent = state.today.name;
    document.getElementById('displayLesson').textContent = state.today.lesson || 'لم يتم تسجيل درس';
    document.getElementById('displayRevision').textContent = state.today.revision || 'لم يتم تسجيل مراجعة';
    document.getElementById('displayEval').textContent = state.today.evaluation || 'لم يتم التقييم بعد';
    document.getElementById('cardDate').textContent = document.getElementById('currentDate').textContent;

    // Show Modal
    document.getElementById('shareModal').style.display = 'flex';
};

window.closeModal = function() {
    document.getElementById('shareModal').style.display = 'none';
};

window.copyCardContent = function() {
    const reportText = `
📖 *تقرير الإنجاز اليومي*
📅 التاريخ: ${document.getElementById('currentDate').textContent}
👤 الطالب: ${state.today.name}
-------------------------
📚 الدرس الجديد: ${state.today.lesson || '---'}
🔄 المراجعة: ${state.today.revision || '---'}
🏆 التقييم: ${state.today.evaluation || '---'}
-------------------------
بإشراف تطبيق مُتابع الحفظ
    `.trim();

    navigator.clipboard.writeText(reportText).then(() => {
        alert('تم نسخ التقرير بنجاح! يمكنك الآن لصقه في واتساب لولي الأمر.');
    }).catch(err => {
        console.error('فشل النسخ:', err);
    });
};
