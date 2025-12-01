let currentQuestion = 0;
let score = 0;
let questions = [];
let correctCount = 0;
let wrongCount = 0;
let allQuestionsData = [];

const startScreen = document.getElementById('startScreen');
const quizScreen = document.getElementById('quizScreen');
const resultScreen = document.getElementById('resultScreen');
const loading = document.getElementById('loading');
const error = document.getElementById('error');

const quizForm = document.getElementById('quizForm');
const questionCounter = document.getElementById('questionCounter');
const scoreDisplay = document.getElementById('score');
const progressFill = document.getElementById('progressFill');
const questionText = document.getElementById('questionText');
const answersContainer = document.getElementById('answersContainer');
const nextButton = document.getElementById('nextButton');

const finalScore = document.getElementById('finalScore');
const correctAnswers = document.getElementById('correctAnswers');
const wrongAnswers = document.getElementById('wrongAnswers');
const percentage = document.getElementById('percentage');
const restartButton = document.getElementById('restartButton');
const errorMessage = document.getElementById('errorMessage');
const errorButton = document.getElementById('errorButton');

quizForm.addEventListener('submit', startQuiz);
nextButton.addEventListener('click', nextQuestion);
restartButton.addEventListener('click', restart);
errorButton.addEventListener('click', () => {
    error.style.display = 'none';
    showScreen('start');
});

loadQuestionsData();

async function loadQuestionsData() {
    try {
        const response = await fetch('questions.json');
        if (!response.ok) {
            throw new Error('Fragen konnten nicht geladen werden');
        }
        allQuestionsData = await response.json();
    } catch (err) {
        console.error('Error loading questions:', err);
        showError('Fehler beim Laden der Fragendatenbank');
    }
}

function startQuiz(e) {
    e.preventDefault();

    const difficulty = document.getElementById('difficulty').value;
    const category = document.getElementById('category').value;
    const amount = parseInt(document.getElementById('amount').value);

    try {
        showLoading();

        const filteredQuestions = allQuestionsData.filter(q =>
            q.difficulty.toLowerCase() === difficulty.toLowerCase() &&
            q.category === category
        );

        if (filteredQuestions.length === 0) {
            throw new Error('Keine Fragen für diese Auswahl verfügbar');
        }

        shuffleArray(filteredQuestions);
        questions = filteredQuestions.slice(0, Math.min(amount, filteredQuestions.length));

        if (questions.length === 0) {
            throw new Error('Keine Fragen für diese Auswahl verfügbar');
        }

        currentQuestion = 0;
        score = 0;
        correctCount = 0;
        wrongCount = 0;

        hideLoading();
        showScreen('quiz');
        displayQuestion();

    } catch (err) {
        hideLoading();
        showError(err.message);
    }
}

function displayQuestion() {
    const question = questions[currentQuestion];

    questionCounter.textContent = `Frage ${currentQuestion + 1} von ${questions.length}`;
    scoreDisplay.textContent = `Punkte: ${score}`;

    const progress = ((currentQuestion + 1) / questions.length) * 100;
    progressFill.style.width = `${progress}%`;

    questionText.innerHTML = decodeHTML(question.question);

    answersContainer.innerHTML = '';

    const allAnswers = [
        { text: question.correct_answer, correct: true },
        ...question.incorrect_answers.map(ans => ({ text: ans, correct: false }))
    ];

    shuffleArray(allAnswers);

    allAnswers.forEach(answer => {
        const button = document.createElement('button');
        button.className = 'answer-btn';
        button.innerHTML = decodeHTML(answer.text);
        button.dataset.correct = answer.correct;
        button.onclick = () => selectAnswer(button, answer.correct);
        answersContainer.appendChild(button);
    });

    nextButton.style.display = 'none';
}

function selectAnswer(button, isCorrect) {
    const buttons = answersContainer.querySelectorAll('.answer-btn');
    buttons.forEach(btn => btn.disabled = true);

    if (isCorrect) {
        button.classList.add('correct');
        score += 10;
        correctCount++;
        scoreDisplay.textContent = `Punkte: ${score}`;
    } else {
        button.classList.add('wrong');
        wrongCount++;
        buttons.forEach(btn => {
            if (btn.dataset.correct === 'true') {
                btn.classList.add('correct');
            }
        });
    }

    nextButton.style.display = 'block';
}

function nextQuestion() {
    currentQuestion++;

    if (currentQuestion < questions.length) {
        displayQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    finalScore.textContent = score;
    correctAnswers.textContent = correctCount;
    wrongAnswers.textContent = wrongCount;

    const percentageValue = Math.round((correctCount / questions.length) * 100);
    percentage.textContent = `${percentageValue}%`;

    showScreen('result');
}

function showScreen(screen) {
    startScreen.classList.remove('active');
    quizScreen.classList.remove('active');
    resultScreen.classList.remove('active');

    if (screen === 'start') {
        startScreen.classList.add('active');
    } else if (screen === 'quiz') {
        quizScreen.classList.add('active');
    } else if (screen === 'result') {
        resultScreen.classList.add('active');
    }
}

function showLoading() {
    loading.style.display = 'flex';
}

function hideLoading() {
    loading.style.display = 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    error.style.display = 'flex';
}

function restart() {
    showScreen('start');
    quizForm.reset();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function decodeHTML(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}
