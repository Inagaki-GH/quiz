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
    questionTimeLeft: 0,
    isGameOver: false,
    gameOverReason: null,
    questionTimer: null,
    completedQuestions: 0,
    comboCount: 0,
    codeTestPassed: false  // コードテスト通過フラグ
};

function showScreen(screenId) {
    // タイマー表示制御
    const timerElement = document.getElementById('question-timer');
    if (screenId === 'quiz-screen') {
        timerElement.classList.remove('hidden');
    } else {
        timerElement.classList.add('hidden');
    }
    
    // 現在の画面をフェードアウト
    const currentScreen = document.querySelector('.screen:not(.hidden)');
    if (currentScreen) {
        anime({
            targets: currentScreen,
            opacity: 0,
            scale: 0.95,
            duration: 400,
            easing: 'easeOutQuad',
            complete: () => {
                currentScreen.classList.add('hidden');
                // 新しい画面をフェードイン
                const newScreen = document.getElementById(screenId);
                newScreen.classList.remove('hidden');
                anime({
                    targets: newScreen,
                    opacity: [0, 1],
                    scale: [0.95, 1],
                    duration: 500,
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
            scale: [0.95, 1],
            duration: 500,
            easing: 'easeOutQuad'
        });
    }
}

async function startChapter(chapterId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/chapter/${chapterId}`, {
            headers: { 'X-Quiz-Origin': 'quiz-app' }
        });
        
        currentChapter = response.data;
        currentMissions = currentChapter.missions;
        currentMissionIndex = 0;
        totalScore = 0;
        
        console.log('Chapter loaded:', currentChapter);
        console.log('Missions:', currentMissions);
        
        // ゲーム状態初期化
        gameState = {
            wrongAnswers: 0,
            questionTimeLeft: 0,
            isGameOver: false,
            gameOverReason: null,
            questionTimer: null,
            completedQuestions: 0,
            comboCount: 0,
            codeTestPassed: false
        };
        
        updateGameStatus();
        updateComboDisplay();
        updateTotalScore();
        updateProgress();
        showQuestion();
        showScreen('quiz-screen');
    } catch (error) {
        console.error('API Error:', error);
        alert('章の読み込みに失敗しました。');
    }
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
        showResult({ correct: false });
    }
}

function updateTimerDisplay() {
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
        }, 600);
    }
}

function updateTotalScore(newScore = null) {
    if (newScore !== null) {
        // カウントアップアニメーション
        anime({
            targets: { score: totalScore },
            score: newScore,
            duration: 1200,
            easing: 'easeOutQuad',
            update: function(anim) {
                const currentScore = Math.floor(anim.animatables[0].target.score);
                document.getElementById('total-score').textContent = currentScore;
            },
            complete: function() {
                totalScore = newScore;
            }
        });
    } else {
        document.getElementById('total-score').textContent = totalScore;
    }
}

function showQuestion() {
    if (gameState.isGameOver) return;
    
    const mission = currentMissions[currentMissionIndex];
    console.log('Showing question:', currentMissionIndex, mission);
    console.log('Mission type:', mission.type);
    console.log('Mission has options:', !!mission.options);
    
    // コードテストフラグをリセット
    gameState.codeTestPassed = false;
    
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
        duration: 1200,
        easing: 'linear',
        update: function(anim) {
            questionElement.textContent = mission.question.substring(0, Math.floor(anim.progress * mission.question.length / 100));
        }
    });
    
    // 問題タイプに応じて表示切り替え
    console.log('Checking mission type...');
    if (mission.type === 'code') {
        console.log('Showing code question');
        showCodeQuestion(mission);
    } else if (mission.type === 'input') {
        console.log('Showing input question');
        showInputQuestion(mission);
    } else {
        console.log('Showing multiple choice question');
        showMultipleChoiceQuestion(mission);
    }
    
    selectedAnswer = null;
    document.getElementById('submit-btn').disabled = true;
}

function showMultipleChoiceQuestion(mission) {
    console.log('showMultipleChoiceQuestion called with:', mission);
    
    if (!mission.options || !Array.isArray(mission.options)) {
        console.error('Mission options not found or not an array:', mission.options);
        alert('問題の選択肢が見つかりません。');
        return;
    }
    
    document.getElementById('options-container').classList.remove('hidden');
    document.getElementById('input-container').classList.add('hidden');
    document.getElementById('code-container').classList.add('hidden');
    document.getElementById('test-btn').classList.add('hidden');
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    mission.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option';
        button.textContent = `${index + 1}. ${option}`;
        button.onclick = () => selectAnswer(index);
        button.style.opacity = '0';
        button.style.transform = 'translateY(20px)';
        optionsContainer.appendChild(button);
    });
    
    // 選択肢を順番にアニメーション表示
    anime({
        targets: '.option',
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 400,
        delay: anime.stagger(150, {start: 1400}),
        easing: 'easeOutQuad'
    });
}

function showInputQuestion(mission) {
    document.getElementById('options-container').classList.add('hidden');
    document.getElementById('input-container').classList.remove('hidden');
    document.getElementById('code-container').classList.add('hidden');
    document.getElementById('test-btn').classList.add('hidden');
    
    const inputElement = document.getElementById('answer-input');
    inputElement.value = '';
    
    // 入力欄をアニメーション表示
    anime({
        targets: inputElement,
        opacity: [0, 1],
        scale: [0.9, 1],
        duration: 500,
        delay: 1400,
        easing: 'easeOutQuad',
        complete: () => {
            inputElement.focus();
        }
    });
    
    inputElement.oninput = () => {
        selectedAnswer = inputElement.value.trim();
        document.getElementById('submit-btn').disabled = selectedAnswer === '';
    };
    
    inputElement.onkeypress = (e) => {
        if (e.key === 'Enter' && selectedAnswer !== '') {
            submitAnswer();
        }
    };
}

function showCodeQuestion(mission) {
    document.getElementById('options-container').classList.add('hidden');
    document.getElementById('input-container').classList.add('hidden');
    document.getElementById('code-container').classList.remove('hidden');
    document.getElementById('test-btn').classList.remove('hidden');
    
    const codeEditor = document.getElementById('code-editor');
    codeEditor.value = mission.template || '';
    
    // コードエディタをアニメーション表示
    anime({
        targets: codeEditor,
        opacity: [0, 1],
        scale: [0.9, 1],
        duration: 500,
        delay: 1400,
        easing: 'easeOutQuad',
        complete: () => {
            codeEditor.focus();
        }
    });
    
    codeEditor.oninput = () => {
        selectedAnswer = codeEditor.value.trim();
        // コード問題では常に無効化（テスト通過が必要）
        document.getElementById('submit-btn').disabled = true;
        gameState.codeTestPassed = false;
    };
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
        scale: [1, 1.02, 1],
        duration: 400,
        easing: 'easeOutQuad'
    });
    
    selectedAnswer = answerIndex;
    document.getElementById('submit-btn').disabled = false;
}

// コードテスト実行機能（Chrome対応版）
async function runTests() {
    const mission = currentMissions[currentMissionIndex];
    const userCode = document.getElementById('code-editor').value;
    
    if (!userCode.trim()) {
        alert('コードを入力してください');
        return;
    }
    
    try {
        const testResults = await runMissionTests(userCode, mission);
        displayTestResults(testResults);
    } catch (error) {
        console.error('Test execution error:', error);
        alert('テスト実行中にエラーが発生しました: ' + error.message);
    }
}

async function runMissionTests(userCode, mission) {
    const { funcName, tests } = mission;
    
    try {
        // Chrome対応：より安全なコード実行方法
        let userFunc;
        try {
            // exportsオブジェクトを作成
            const exports = {};
            
            // ユーザーコードを実行
            const codeToExecute = userCode + `; if (typeof exports.${funcName} === 'function') { return exports.${funcName}; } else { throw new Error('関数が定義されていません'); }`;
            const funcConstructor = new Function('exports', codeToExecute);
            userFunc = funcConstructor(exports);
            
            if (typeof userFunc !== 'function') {
                throw new Error(`${funcName}関数が正しく定義されていません`);
            }
        } catch (e) {
            throw new Error('コードの構文エラー: ' + e.message);
        }
        
        const results = tests.map(({args, expected}, index) => {
            try {
                console.log(`Test ${index + 1}: args=${JSON.stringify(args)}, expected=${JSON.stringify(expected)}`);
                
                const output = userFunc.apply(null, args);
                console.log(`Test ${index + 1}: output=${JSON.stringify(output)}`);
                
                // より厳密な比較
                const pass = deepEqual(output, expected);
                
                return { args, expected, output, pass };
            } catch (e) {
                console.error(`Test ${index + 1} error:`, e);
                return { args, expected, output: null, pass: false, error: e.message };
            }
        });
        
        const success = results.every(r => r.pass);
        console.log('Test results:', results);
        console.log('All tests passed:', success);
        
        return { success, results };
    } catch (error) {
        console.error('Mission test error:', error);
        throw error;
    }
}

// 深い比較関数（Chrome対応）
function deepEqual(a, b) {
    if (a === b) return true;
    
    if (a == null || b == null) return a === b;
    
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i])) return false;
        }
        return true;
    }
    
    if (typeof a === 'object' && typeof b === 'object') {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        for (let key of keysA) {
            if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false;
        }
        return true;
    }
    
    return false;
}

function handleIncorrectAnswer() {
    clearInterval(gameState.questionTimer);
    gameState.wrongAnswers++;
    gameState.comboCount = 0;
    updateGameStatus();
    updateComboDisplay();
    
    if (gameState.wrongAnswers >= 3) {
        gameOver('mistakes', '3回間違えました');
    } else {
        showResult({ correct: false });
    }
}

function displayTestResults(testResults) {
    // テスト結果の表示を簡素化
    const testResultsDiv = document.getElementById('test-results');
    const testOutput = document.getElementById('test-output');
    
    testOutput.innerHTML = '';
    
    // 結果のサマリーのみ表示
    const summary = document.createElement('div');
    summary.className = `test-summary ${testResults.success ? 'pass' : 'fail'}`;
    
    if (testResults.success) {
        summary.innerHTML = `
            <div><strong>✅ 全テスト成功</strong></div>
            <div>すべてのテストケースが正常に実行されました</div>
        `;
        gameState.codeTestPassed = true;
        selectedAnswer = document.getElementById('code-editor').value;
        document.getElementById('submit-btn').disabled = false;
    } else {
        const failedCount = testResults.results.filter(r => !r.pass).length;
        summary.innerHTML = `
            <div><strong>❌ テスト失敗</strong></div>
            <div>${failedCount}個のテストケースが失敗しました</div>
        `;
        gameState.codeTestPassed = false;
        document.getElementById('submit-btn').disabled = true;
    }
    
    testOutput.appendChild(summary);
    testResultsDiv.classList.remove('hidden');
}

async function submitAnswer() {
    if (selectedAnswer === null || selectedAnswer === '' || gameState.isGameOver) return;
    
    const mission = currentMissions[currentMissionIndex];
    
    // コード問題の場合は自動テスト実行
    if (mission.type === 'code' && !gameState.codeTestPassed) {
        try {
            const testResults = await runMissionTests(selectedAnswer, mission);
            if (!testResults.success) {
                // テスト失敗時は即座に不正解として処理
                handleIncorrectAnswer();
                return;
            }
            gameState.codeTestPassed = true;
        } catch (error) {
            console.error('Test execution error:', error);
            handleIncorrectAnswer();
            return;
        }
    }
    
    clearInterval(gameState.questionTimer);
    
    const answerData = {
        chapterId: currentChapter.chapterId,
        missionId: mission.id,
        answer: selectedAnswer,
        timestamp: questionStartTime,
        type: mission.type || 'choice'
    };
    
    try {
        const response = await axios.post(`${API_BASE_URL}/answer`, answerData, {
            headers: { 'X-Quiz-Origin': 'quiz-app' }
        });
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
        
        // コンボボーナス: 基本点 × min(コンボ数, 10)
        const comboMultiplier = Math.min(gameState.comboCount, 10);
        const comboBonus = result.correct ? baseScore * (comboMultiplier - 1) : 0;
        const totalEarned = baseScore + timeBonus + comboBonus;
        
        updateTotalScore(totalScore + totalEarned);
        updateComboDisplay();
        
        showResult({ correct: result.correct });
    } catch (error) {
        console.error('API Error:', error);
        alert('回答の送信に失敗しました。API URLを確認してください。');
    }
}

function showResult(result) {
    if (gameState.isGameOver) return;
    
    const title = result.correct ? '正解！' : '不正解';
    document.getElementById('result-title').textContent = title;
    
    // 正解時の特別演出
    if (result.correct) {
        anime({
            targets: '#result-title',
            scale: [1, 1.2, 1],
            rotate: [0, 5, -5, 0],
            duration: 800,
            easing: 'easeOutElastic(1, .8)'
        });
    }
    
    console.log('Current mission index:', currentMissionIndex);
    console.log('Total missions:', currentMissions.length);
    
    const isLastQuestion = currentMissionIndex >= currentMissions.length - 1;
    document.getElementById('next-btn').classList.toggle('hidden', isLastQuestion);
    document.getElementById('finish-btn').classList.toggle('hidden', !isLastQuestion);
    
    showScreen('result-screen');
}

function nextQuestion() {
    if (gameState.isGameOver) return;
    
    currentMissionIndex++;
    console.log('Moving to next question:', currentMissionIndex, 'of', currentMissions.length);
    
    updateProgress();
    
    if (currentMissionIndex >= currentMissions.length) {
        console.log('All questions completed, showing game over');
        gameOver('cleared', 'おめでとうございます！全問クリア！');
    } else {
        console.log('Showing next question');
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
    
    clearInterval(gameState.questionTimer);
    
    document.getElementById('gameover-reason').textContent = message;
    document.getElementById('final-score').querySelector('span').textContent = totalScore;
    document.getElementById('final-stats').textContent = 
        `正解数: ${gameState.completedQuestions} | 最大コンボ: ${gameState.comboCount}`;
    
    if (reason === 'cleared') {
        // クリア時の紙吹雪
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#FF6B6B', '#4CAF50', '#2196F3']
        });
        
        document.getElementById('gameover-title').textContent = 'ゲームクリア！!';
        document.getElementById('gameover-screen').classList.add('cleared');
        
        // タイトルアニメーション
        anime({
            targets: '#gameover-title',
            scale: [0.8, 1.1, 1],
            duration: 1000,
            easing: 'easeOutElastic(1, .8)'
        });
    }
    
    showScreen('gameover-screen');
}

function restartGame() {
    resetGameState();
    if (currentChapter) {
        startChapter(currentChapter.chapterId);
    }
}

function backToMenu() {
    resetGameState();
    updateProgress();
    showScreen('chapter-select');
}

function resetGameState() {
    clearInterval(gameState.questionTimer);
    
    // ゲーム状態完全リセット
    currentMissionIndex = 0;
    totalScore = 0;
    gameState = {
        wrongAnswers: 0,
        questionTimeLeft: 0,
        isGameOver: false,
        gameOverReason: null,
        questionTimer: null,
        completedQuestions: 0,
        comboCount: 0,
        codeTestPassed: false
    };
    
    // UI状態リセット
    updateGameStatus();
    updateComboDisplay();
    updateTotalScore();
    document.getElementById('question-timer').classList.remove('timer-warning');
    document.getElementById('gameover-screen').classList.remove('cleared');
    document.getElementById('test-results').classList.add('hidden');
}

function updateProgress() {
    const progress = document.getElementById('progress');
    const newValue = currentMissionIndex;
    const maxValue = currentMissions.length || 4;
    
    console.log('Updating progress:', newValue, '/', maxValue);
    
    // プログレスバーのアニメーション
    anime({
        targets: progress,
        value: newValue,
        max: maxValue,
        duration: 600,
        easing: 'easeOutQuad'
    });
}