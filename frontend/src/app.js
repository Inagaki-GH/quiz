// API Gateway URL will be set dynamically or replace with actual URL after deployment
const API_BASE_URL = window.API_BASE_URL || 'REPLACE_WITH_ACTUAL_API_GATEWAY_URL';

let currentChapter = null;
let currentMissions = [];
let currentMissionIndex = 0;
let selectedAnswer = null;
let totalScore = 0;
let questionStartTime = 0;

// ゲーム状態
let gameState = {
    wrongAnswers: 0,
    chapterTimeLeft: 0,
    questionTimeLeft: 0,
    isGameOver: false,
    gameOverReason: null,
    chapterTimer: null,
    questionTimer: null,
    completedQuestions: 0,
    comboCount: 0  // 連続正解数
};

function showScreen(screenId) {
    // 現在の画面をフェードアウト
    const currentScreen = document.querySelector('.screen:not(.hidden)');
    if (currentScreen) {
        anime({
            targets: currentScreen,
            opacity: 0,
            translateY: -20,
            duration: 300,
            easing: 'easeOutQuad',
            complete: () => {
                currentScreen.classList.add('hidden');
                // 新しい画面をフェードイン
                const newScreen = document.getElementById(screenId);
                newScreen.classList.remove('hidden');
                anime({
                    targets: newScreen,
                    opacity: [0, 1],
                    translateY: [20, 0],
                    duration: 400,
                    easing: 'easeOutQuad'
                });
            }
        });
    } else {
        // 初回表示
        const newScreen = document.getElementById(screenId);
        newScreen.classList.remove('hidden');
        anime({
            targets: newScreen,
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 400,
            easing: 'easeOutQuad'
        });
    }
}

async function startChapter(chapterId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/chapter/${chapterId}`);
        currentChapter = response.data;
        currentMissions = currentChapter.missions;
        currentMissionIndex = 0;
        totalScore = 0;
        
        // ゲーム状態初期化
        gameState = {
            wrongAnswers: 0,
            chapterTimeLeft: currentChapter.chapterTimeLimit,
            questionTimeLeft: 0,
            isGameOver: false,
            gameOverReason: null,
            chapterTimer: null,
            questionTimer: null,
            completedQuestions: 0,
            comboCount: 0
        };
        
        updateGameStatus();
        updateComboDisplay();
        startChapterTimer();
        updateProgress();
        showQuestion();
        showScreen('quiz-screen');
    } catch (error) {
        console.error('API Error:', error);
        alert('章の読み込みに失敗しました。API URLを確認してください。');
    }
}

function startChapterTimer() {
    clearInterval(gameState.chapterTimer);
    gameState.chapterTimer = setInterval(() => {
        gameState.chapterTimeLeft--;
        updateTimerDisplay();
        
        if (gameState.chapterTimeLeft <= 10) {
            document.getElementById('chapter-timer').classList.add('timer-warning');
        }
        
        if (gameState.chapterTimeLeft <= 0) {
            gameOver('timeout', '章の制限時間が終了しました');
        }
    }, 1000);
}

function startQuestionTimer(timeLimit) {
    clearInterval(gameState.questionTimer);
    gameState.questionTimeLeft = timeLimit;
    
    gameState.questionTimer = setInterval(() => {
        gameState.questionTimeLeft--;
        updateTimerDisplay();
        
        if (gameState.questionTimeLeft <= 10) {
            document.getElementById('question-timer').classList.add('timer-warning');
        }
        
        if (gameState.questionTimeLeft <= 0) {
            handleTimeUp();
        }
    }, 1000);
}

function handleTimeUp() {
    clearInterval(gameState.questionTimer);
    gameState.wrongAnswers++;
    gameState.comboCount = 0; // コンボリセット
    updateGameStatus();
    updateComboDisplay();
    
    if (gameState.wrongAnswers >= 3) {
        gameOver('mistakes', '3回間違えました');
    } else {
        const mission = currentMissions[currentMissionIndex];
        showResult({ 
            correct: false, 
            baseScore: 0, 
            timeBonus: 0, 
            comboBonus: 0,
            totalScore: 0,
            correctAnswer: mission.correctAnswer 
        });
    }
}

function updateTimerDisplay() {
    const chapterMin = Math.floor(gameState.chapterTimeLeft / 60);
    const chapterSec = gameState.chapterTimeLeft % 60;
    document.getElementById('chapter-time').textContent = `${chapterMin}:${chapterSec.toString().padStart(2, '0')}`;
    document.getElementById('question-time').textContent = gameState.questionTimeLeft;
}

function updateGameStatus() {
    const hearts = '❤️'.repeat(3 - gameState.wrongAnswers) + '💔'.repeat(gameState.wrongAnswers);
    document.getElementById('lives').textContent = hearts;
}

function updateComboDisplay() {
    document.getElementById('combo-count').textContent = gameState.comboCount;
    
    if (gameState.comboCount > 0) {
        document.getElementById('combo-display').classList.add('combo-animation');
        setTimeout(() => {
            document.getElementById('combo-display').classList.remove('combo-animation');
        }, 500);
    }
}

function showQuestion() {
    if (gameState.isGameOver) return;
    
    const mission = currentMissions[currentMissionIndex];
    questionStartTime = Date.now();
    
    // タイマーリセット
    document.getElementById('question-timer').classList.remove('timer-warning');
    startQuestionTimer(mission.timeLimit);
    
    // 質問テキストをタイプライター効果で表示
    const questionElement = document.getElementById('question-text');
    questionElement.textContent = '';
    anime({
        targets: questionElement,
        innerHTML: [0, mission.question.length],
        duration: 1000,
        easing: 'linear',
        update: function(anim) {
            questionElement.textContent = mission.question.substring(0, Math.floor(anim.progress * mission.question.length / 100));
        }
    });
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    mission.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option';
        button.textContent = `${index + 1}. ${option}`;
        button.onclick = () => selectAnswer(index);
        button.style.opacity = '0';
        button.style.transform = 'translateX(-20px)';
        optionsContainer.appendChild(button);
    });
    
    // 選択肢を順番にアニメーション表示
    anime({
        targets: '.option',
        opacity: [0, 1],
        translateX: [-20, 0],
        duration: 300,
        delay: anime.stagger(100, {start: 1200}),
        easing: 'easeOutQuad'
    });
    
    selectedAnswer = null;
    document.getElementById('submit-btn').disabled = true;
}

function selectAnswer(answerIndex) {
    if (gameState.isGameOver) return;
    
    // 既存の選択を解除
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected');
        anime.remove(opt);
    });
    
    // 新しい選択をアニメーション
    const selectedOption = document.querySelectorAll('.option')[answerIndex];
    selectedOption.classList.add('selected');
    
    anime({
        targets: selectedOption,
        scale: [1, 1.05, 1],
        duration: 300,
        easing: 'easeOutQuad'
    });
    
    selectedAnswer = answerIndex;
    document.getElementById('submit-btn').disabled = false;
}

async function submitAnswer() {
    if (selectedAnswer === null || gameState.isGameOver) return;
    
    clearInterval(gameState.questionTimer);
    
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
        
        // 新しいスコア計算
        const baseScore = result.correct ? 100 : 0;
        const timeBonus = result.correct ? Math.max(0, gameState.questionTimeLeft * 2) : 0;
        
        if (result.correct) {
            gameState.comboCount++;
            gameState.completedQuestions++;
        } else {
            gameState.wrongAnswers++;
            gameState.comboCount = 0; // コンボリセット
            updateGameStatus();
            
            if (gameState.wrongAnswers >= 3) {
                gameOver('mistakes', '3回間違えました');
                return;
            }
        }
        
        const comboBonus = result.correct ? gameState.comboCount * 10 : 0;
        const totalEarned = baseScore + timeBonus + comboBonus;
        
        totalScore += totalEarned;
        updateComboDisplay();
        
        showResult({
            correct: result.correct,
            baseScore: baseScore,
            timeBonus: timeBonus,
            comboBonus: comboBonus,
            totalScore: totalEarned,
            correctAnswer: result.correctAnswer
        });
    } catch (error) {
        console.error('API Error:', error);
        alert('回答の送信に失敗しました。API URLを確認してください。');
    }
}

function showResult(result) {
    if (gameState.isGameOver) return;
    
    const title = result.correct ? '正解！' : '不正解';
    
    document.getElementById('result-title').textContent = title;
    
    // スコア詳細表示
    document.getElementById('base-score').textContent = `基本点: ${result.baseScore}点`;
    document.getElementById('time-bonus').textContent = `時間ボーナス: +${result.timeBonus}点`;
    document.getElementById('combo-bonus').textContent = `コンボボーナス: +${result.comboBonus}点`;
    document.getElementById('total-earned').textContent = `獲得: ${result.totalScore}点`;
    
    // スコアのカウントアップアニメーション
    anime({
        targets: { score: 0 },
        score: result.totalScore,
        duration: 1000,
        easing: 'easeOutQuad',
        update: function(anim) {
            const currentScore = Math.floor(anim.animatables[0].target.score);
            document.getElementById('total-earned').textContent = `獲得: ${currentScore}点`;
        }
    });
    
    const isLastQuestion = currentMissionIndex >= currentMissions.length - 1;
    document.getElementById('next-btn').classList.toggle('hidden', isLastQuestion);
    document.getElementById('finish-btn').classList.toggle('hidden', !isLastQuestion);
    
    showScreen('result-screen');
}

function nextQuestion() {
    if (gameState.isGameOver) return;
    
    currentMissionIndex++;
    updateProgress();
    
    if (currentMissionIndex >= currentMissions.length) {
        gameOver('cleared', 'おめでとうございます！全問クリア！');
    } else {
        showQuestion();
        showScreen('quiz-screen');
    }
}

function finishQuiz() {
    gameOver('cleared', 'おめでとうございます！全問クリア！');
}

function gameOver(reason, message) {
    gameState.isGameOver = true;
    gameState.gameOverReason = reason;
    
    clearInterval(gameState.chapterTimer);
    clearInterval(gameState.questionTimer);
    
    document.getElementById('gameover-reason').textContent = message;
    document.getElementById('final-score').querySelector('span').textContent = totalScore;
    document.getElementById('final-stats').textContent = 
        `正解数: ${gameState.completedQuestions} | 最大コンボ: ${gameState.comboCount} | 残りライフ: ${3 - gameState.wrongAnswers}`;
    
    if (reason === 'cleared') {
        // クリア時の紙吹雪のみ
        confetti({
            particleCount: 200,
            spread: 100,
            origin: { y: 0.5 }
        });
        document.getElementById('gameover-title').textContent = 'クリア！';
        document.querySelector('#gameover-screen').style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
    }
    
    showScreen('gameover-screen');
}

function restartGame() {
    // ゲーム状態リセット
    currentMissionIndex = 0;
    totalScore = 0;
    gameState = {
        wrongAnswers: 0,
        chapterTimeLeft: 0,
        questionTimeLeft: 0,
        isGameOver: false,
        gameOverReason: null,
        chapterTimer: null,
        questionTimer: null,
        completedQuestions: 0,
        comboCount: 0
    };
    
    if (currentChapter) {
        startChapter(currentChapter.chapterId);
    }
}

function backToMenu() {
    clearInterval(gameState.chapterTimer);
    clearInterval(gameState.questionTimer);
    
    // リセット
    currentMissionIndex = 0;
    totalScore = 0;
    gameState = {
        wrongAnswers: 0,
        chapterTimeLeft: 0,
        questionTimeLeft: 0,
        isGameOver: false,
        gameOverReason: null,
        chapterTimer: null,
        questionTimer: null,
        completedQuestions: 0,
        comboCount: 0
    };
    
    updateProgress();
    showScreen('chapter-select');
}

function updateProgress() {
    const progress = document.getElementById('progress');
    const newValue = currentMissionIndex;
    const maxValue = currentMissions.length || 4;
    
    // プログレスバーのアニメーション
    anime({
        targets: progress,
        value: newValue,
        max: maxValue,
        duration: 500,
        easing: 'easeOutQuad'
    });
}