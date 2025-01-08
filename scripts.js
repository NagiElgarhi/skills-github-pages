// تعيين مسار العامل لـ PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.8.335/pdf.worker.min.js';

let subjects = [];
let cards = {};
let currentCardIndex = 0;

// Load questions from JSON file
fetch('questions.json')
    .then(response => response.json())
    .then(data => {
        data.forEach(subjectData => {
            subjects.push(subjectData.subject);
            cards[subjectData.subject] = subjectData.questions;
        });
        renderSubjects();
        updateSubjectDropdowns();
    })
    .catch(error => console.error('Error loading JSON:', error));

const addSubject = () => {
    const subjectInput = document.getElementById('subjectInput');
    const subject = subjectInput.value.trim();
    if (subject) {
        subjects.push(subject);
        subjectInput.value = '';
        renderSubjects();
        updateSubjectDropdowns();
    }
};

const removeSubject = (index) => {
    const subject = subjects[index];
    delete cards[subject];
    subjects.splice(index, 1);
    renderSubjects();
    updateSubjectDropdowns();
};

const editSubject = (index) => {
    const newSubject = prompt("أدخل اسم المادة الجديد:", subjects[index]);
    if (newSubject) {
        const oldSubject = subjects[index];
        subjects[index] = newSubject;
        if (cards[oldSubject]) {
            cards[newSubject] = cards[oldSubject];
            delete cards[oldSubject];
        }
        renderSubjects();
        updateSubjectDropdowns();
    }
};

const renderSubjects = () => {
    const subjectList = document.getElementById('subjectList');
    subjectList.innerHTML = '';
    subjects.forEach((subject, index) => {
        const li = document.createElement('li');
        li.textContent = subject;
        const editButton = document.createElement('button');
        editButton.textContent = 'تعديل';
        editButton.onclick = () => editSubject(index);
        const removeButton = document.createElement('button');
        removeButton.textContent = 'حذف';
        removeButton.onclick = () => removeSubject(index);
        li.appendChild(editButton);
        li.appendChild(removeButton);
        subjectList.appendChild(li);
    });
};

const updateSubjectDropdowns = () => {
    const subjectDropdown = document.getElementById('subjectDropdownForCards');
    subjectDropdown.innerHTML = '<option value="">اختر مادة</option>';
    subjects.forEach((subject) => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        subjectDropdown.appendChild(option);
    });
};

const selectSubjectForCards = () => {
    const subjectDropdown = document.getElementById('subjectDropdownForCards');
    const selectedSubject = subjectDropdown.value;
    if (selectedSubject) {
        renderCards(selectedSubject);
    }
};

const addCard = () => {
    const subjectDropdown = document.getElementById('subjectDropdownForCards');
    const selectedSubject = subjectDropdown.value;
    const questionInput = document.getElementById('questionInput');
    const answerInput = document.getElementById('answerInput');
    const question = questionInput.value.trim();
    const answer = answerInput.value.trim();
    if (selectedSubject && question && answer) {
        if (!cards[selectedSubject]) {
            cards[selectedSubject] = [];
        }
        cards[selectedSubject].push({ question, answer });
        questionInput.value = '';
        answerInput.value = '';
        renderCards(selectedSubject);
    }
};

const removeCard = (subject, index) => {
    cards[subject].splice(index, 1);
    renderCards(subject);
};

const renderCards = (subject) => {
    const cardList = document.getElementById('cardList');
    cardList.innerHTML = '';
    if (cards[subject]) {
        cards[subject].forEach((card, index) => {
            const li = document.createElement('li');
            li.textContent = `سؤال: ${card.question} - إجابة: ${card.answer}`;
            const removeButton = document.createElement('button');
            removeButton.textContent = 'حذف';
            removeButton.onclick = () => removeCard(subject, index);
            li.appendChild(removeButton);
            cardList.appendChild(li);
        });
    }
};

const flipCard = () => {
    const flashcard = document.getElementById('flashcardCard');
    flashcard.classList.toggle('flipped');
};

const showAnswer = (event) => {
    event.stopPropagation();
    flipCard();
};

const nextCard = () => {
    const subjectDropdown = document.getElementById('subjectDropdownForCards');
    const selectedSubject = subjectDropdown.value;
    if (selectedSubject && cards[selectedSubject]) {
        currentCardIndex = (currentCardIndex + 1) % cards[selectedSubject].length;
        displayCard(selectedSubject);
    }
};

const displayCard = (subject) => {
    const questionText = document.getElementById('questionText');
    const answerText = document.getElementById('answerText');
    const currentCard = cards[subject][currentCardIndex];
    questionText.textContent = currentCard.question;
    answerText.textContent = currentCard.answer;
    if (document.getElementById('flashcardCard').classList.contains('flipped')) {
        flipCard();
    }
};

// Speech Recognition
const startRecognition = (inputType) => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'ar-SA';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (inputType === 'question') {
            document.getElementById('questionInput').value = transcript;
        } else if (inputType === 'answer') {
            document.getElementById('answerInput').value = transcript;
        }
    };

    recognition.start();
};

// Speech Synthesis
const playSound = (textType) => {
    const utterance = new SpeechSynthesisUtterance();
    utterance.lang = 'ar-SA';
    if (textType === 'question') {
        utterance.text = document.getElementById('questionText').textContent;
    } else if (textType === 'answer') {
        utterance.text = document.getElementById('answerText').textContent;
    }
    window.speechSynthesis.speak(utterance);
};

// Function to show the specified container and hide others
const showContainer = (containerId) => {
    const containers = ['mainMenu', 'subjectManagement', 'cardManagement', 'flashcard', 'pdfUpload'];
    containers.forEach(id => {
        document.getElementById(id).style.display = id === containerId ? 'block' : 'none';
    });
};

// Load PDF and extract text
const loadPDF = async () => {
    const fileInput = document.getElementById('pdfInput');
    const file = fileInput.files[0];
    if (!file) {
        console.error('No file selected');
        return;
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;
        let text = '';

        const totalPages = pdf.numPages;
        const textPromises = [];

        for (let i = 1; i <= totalPages; i++) {
            textPromises.push(pdf.getPage(i).then(page => {
                return page.getTextContent().then(content => {
                    const strings = content.items.map(item => item.str);
                    return strings.join('\n') + '\n';
                });
            }));
        }

        const allTexts = await Promise.all(textPromises);
        text = allTexts.join('');
        
        document.getElementById('pdfContent').value = text;
        console.log('PDF text extracted:', text);
    } catch (error) {
        console.error('Error reading PDF:', error);
    }
};

// Analyze text from PDF
const analyzePDF = () => {
    const text = document.getElementById('pdfContent').value;
    const lines = text.split('\n');
    let subjects = [];
    let currentSubject = null;
    let currentQuestions = [];

    lines.forEach(line => {
        if (line.startsWith("مادة:")) {
            if (currentSubject) {
                subjects.push({subject: currentSubject, questions: currentQuestions});
            }
            currentSubject = line.replace("مادة:", "").trim();
            currentQuestions = [];
        } else if (line.startsWith("سؤال:")) {
            const question = line.replace("سؤال:", "").trim();
            const answerIndex = lines.indexOf(line) + 1;
            const answerLine = lines[answerIndex] && lines[answerIndex].startsWith("إجابة:") ? lines[answerIndex] : '';
            const answer = answerLine ? answerLine.replace("إجابة:", "").trim() : '';
            currentQuestions.push({question, answer});
        }
    });

    if (currentSubject) {
        subjects.push({subject: currentSubject, questions: currentQuestions});
    }

    // Display analyzed data in console for debugging
    console.log('Analyzed data:', subjects);

    // Store analyzed data in global variables
    subjects.forEach(subjectData => {
        if (!subjects.includes(subjectData.subject)) {
            subjects.push(subjectData.subject);
            cards[subjectData.subject] = subjectData.questions;
        } else {
            cards[subjectData.subject].push(...subjectData.questions);
        }
    });

    // Update the UI with the new subjects and questions
    renderSubjects();
    updateSubjectDropdowns();
};

// Save analyzed text to JSON
const saveToJson = () => {
    const text = document.getElementById('pdfContent').value;
    const lines = text.split('\n');
    let subjects = [];
    let currentSubject = null;
    let currentQuestions = [];

    lines.forEach(line => {
        if (line.startsWith("مادة:")) {
            if (currentSubject) {
                subjects.push({subject: currentSubject, questions: currentQuestions});
            }
            currentSubject = line.replace("مادة:", "").trim();
            currentQuestions = [];
        } else if (line.startsWith("سؤال:")) {
            const question = line.replace("سؤال:", "").trim();
            const answerIndex = lines.indexOf(line) + 1;
            const answerLine = lines[answerIndex] && lines[answerIndex].startsWith("إجابة:") ? lines[answerIndex] : '';
            const answer = answerLine ? answerLine.replace("إجابة:", "").trim() : '';
            currentQuestions.push({question, answer});
        }
    });

    if (currentSubject) {
        subjects.push({subject: currentSubject, questions: currentQuestions});
    }

    const jsonContent = JSON.stringify(subjects, null, 2);
    const blob = new Blob([jsonContent], {type: "application/json"});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "questions.json";
    link.click();
};

document.addEventListener('DOMContentLoaded', () => {
    renderSubjects();
    updateSubjectDropdowns();
});