const API_BASE_URL = 'https://your-api-gateway-url.execute-api.region.amazonaws.com/prod';

let currentChapter = null;
let currentMissions = [];
let currentMissionIndex = 0;
let selectedAnswer = null;
let totalScore = 0;
let questionStartTime = 0;

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
}

async function startChapter(chapterId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/chapter/${chapterId}`);
        currentChapter = response.data;
        currentMissions = currentChapter.missions;
        currentMissionIndex = 0;
        totalScore = 0;
        
        updateProgress();
        showQuestion();
        showScreen('quiz-screen');
    } catch (error) {
        alert('章の読み込みに失敗しました');
    }
}

function showQuestion() {
    const mission = currentMissions[currentMissionIndex];
    questionStartTime = Date.now();
    
    document.getElementById('question-text').textContent = mission.question;
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    mission.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option';
        button.textContent = `${index + 1}. ${option}`;
        button.onclick = () => selectAnswer(index);
        optionsContainer.appendChild(button);
    });
    
    selectedAnswer = null;
    document.getElementById('submit-btn').disabled = true;
}

function selectAnswer(answerIndex) {
    document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
    document.querySelectorAll('.option')[answerIndex].classList.add('selected');
    
    selectedAnswer = answerIndex;
    document.getElementById('submit-btn').disabled = false;
}

async function submitAnswer() {
    if (selectedAnswer === null) return;
    
    const mission = currentMissions[currentMissionIndex];
    const answerData = {
        chapterId: currentChapter.chapterId,
        missionId: mission.id,
        answer: selectedAnswer,
        timestamp: questionStartTime
    };
    
    try {
        const response = await axios.post(`${API_BASE_URL}/answer`, answerData);
        const result = response.data;
        
        totalScore += result.score;
        showResult(result);
    } catch (error) {
        alert('回答の送信に失敗しました');
    }
}

function showResult(result) {
    const title = result.correct ? '正解！' : '不正解';
    const scoreText = `獲得スコア: ${result.score}点`;
    
    document.getElementById('result-title').textContent = title;
    document.getElementById('score-display').textContent = scoreText;
    
    const isLastQuestion = currentMissionIndex >= currentMissions.length - 1;
    document.getElementById('next-btn').classList.toggle('hidden', isLastQuestion);
    document.getElementById('finish-btn').classList.toggle('hidden', !isLastQuestion);
    
    showScreen('result-screen');
}

function nextQuestion() {
    currentMissionIndex++;
    updateProgress();
    showQuestion();
    showScreen('quiz-screen');
}

function finishQuiz() {
    alert(`クイズ完了！総スコア: ${totalScore}点`);
    currentMissionIndex = 0;
    updateProgress();
    showScreen('chapter-select');
}

function updateProgress() {
    const progress = document.getElementById('progress');
    progress.value = currentMissionIndex;
    progress.max = currentMissions.length || 4;
}