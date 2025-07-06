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

async function showScreen(screenId) {
    // 章選択画面では章一覧を動的読み込み
    if (screenId === 'chapter-select') {
        // 初期表示時は既に読み込み済みの場合がある
        const existingButtons = document.querySelectorAll('#chapter-select button');
        if (existingButtons.length === 0) {
            await loadChaptersList();
        }
    }
    
    // タイマー表示制御（問題回答中のみ表示）
    const timerElement = document.getElementById('question-timer');
    if (screenId !== 'quiz-screen') {
        timerElement.style.display = 'none';
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
        console.log('=== START CHAPTER DEBUG ===');
        console.log('Starting chapter:', chapterId);
        console.log('API_BASE_URL:', API_BASE_URL);
        
        const response = await axios.get(`${API_BASE_URL}/chapter/${chapterId}`, {
            headers: { 'X-Quiz-Origin': 'quiz-app' }
        });
        
        console.log('API Response:', response.data);
        
        currentChapter = response.data;
        
        // ゲーム設定を取得して問題数を制限
        let questionsPerChapter = 4; // デフォルト値
        try {
            console.log('Fetching config from:', `${API_BASE_URL}/config`);
            const configResponse = await axios.get(`${API_BASE_URL}/config`, {
                headers: { 'X-Quiz-Origin': 'quiz-app' }
            });
            console.log('Config response:', configResponse.data);
            gameConfig = configResponse.data;
            questionsPerChapter = gameConfig.gameplay?.questionsPerChapter || 4;
            console.log('Game config loaded:', gameConfig);
            console.log('Questions per chapter:', questionsPerChapter);
        } catch (error) {
            console.warn('Failed to load config, using default 4 questions:', error.message);
            questionsPerChapter = 4;
        }
        
        // 問題をシャッフルして指定数だけ選択
        const allMissions = currentChapter.missions || [];
        console.log('Total available missions:', allMissions.length);
        console.log('Will select:', questionsPerChapter, 'questions');
        
        const shuffledMissions = [...allMissions];
        
        // Fisher-Yates shuffle algorithm for proper randomization
        for (let i = shuffledMissions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledMissions[i], shuffledMissions[j]] = [shuffledMissions[j], shuffledMissions[i]];
        }
        
        currentMissions = shuffledMissions.slice(0, questionsPerChapter);
        console.log('Selected questions:', currentMissions.map(m => m.id));
        console.log('Final mission count:', currentMissions.length);
        
        currentMissionIndex = 0;
        totalScore = 0;
        
        console.log('Chapter loaded:', currentChapter);
        console.log('Missions array:', currentMissions);
        console.log('Missions count:', currentMissions.length);
        
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
        
        if (!currentMissions || currentMissions.length === 0) {
            console.error('No missions found in chapter!');
            alert('この章には問題が登録されていません。');
            await showScreen('chapter-select');
            return;
        }
        
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
    console.log('startQuestionTimer called with:', timeLimit);
    clearInterval(gameState.questionTimer);
    gameState.questionTimeLeft = timeLimit;
    
    // タイマー表示を確実に有効化
    const timerElement = document.getElementById('question-timer');
    if (timerElement) {
        timerElement.style.display = 'flex';
        timerElement.style.visibility = 'visible';
        timerElement.classList.remove('hidden');
        console.log('Timer element made visible in startQuestionTimer');
    } else {
        console.error('Timer element not found in startQuestionTimer!');
    }
    
    console.log('Timer initialized with:', gameState.questionTimeLeft, 'seconds');
    updateTimerDisplay(); // 初期表示
    
    gameState.questionTimer = setInterval(() => {
        gameState.questionTimeLeft--;
        console.log('Timer tick:', gameState.questionTimeLeft);
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
    document.getElementById('question-timer').style.display = 'none';
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
    const timeElement = document.getElementById('question-time');
    if (timeElement) {
        timeElement.textContent = gameState.questionTimeLeft;
        console.log('Timer display updated to:', gameState.questionTimeLeft);
    } else {
        console.error('question-time element not found!');
    }
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



function updateTotalScore(newScore = null, addedPoints = null) {
    if (newScore !== null) {
        // 加算ポイントを表示
        if (addedPoints && addedPoints > 0) {
            showScorePopup(addedPoints);
        }
        
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

function showScorePopup(points) {
    const scoreDisplay = document.getElementById('total-score-display');
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = `+${points}`;
    
    scoreDisplay.appendChild(popup);
    
    // 2秒後に削除
    setTimeout(() => {
        if (popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
    }, 2000);
}

function showQuestion() {
    if (gameState.isGameOver) return;
    
    const mission = currentMissions[currentMissionIndex];
    console.log('=== SHOW QUESTION DEBUG ===');
    console.log('Current mission index:', currentMissionIndex);
    console.log('Total missions:', currentMissions.length);
    console.log('Mission object:', mission);
    
    if (!mission) {
        console.error('Mission is undefined! Check currentMissions array');
        console.log('currentMissions:', currentMissions);
        return;
    }
    
    console.log('Mission type:', mission.type);
    console.log('Mission has options:', !!mission.options);
    console.log('Mission question:', mission.question);
    
    // コードテストフラグをリセット
    gameState.codeTestPassed = false;
    
    // テスト結果表示をリセット
    document.getElementById('test-results').classList.add('hidden');
    
    questionStartTime = Date.now();
    
    // タイマー表示とリセット
    const timerElement = document.getElementById('question-timer');
    console.log('Timer element found:', !!timerElement);
    console.log('Timer element classes before:', timerElement?.className);
    
    if (timerElement) {
        // hiddenクラスを確実に削除
        timerElement.classList.remove('timer-warning', 'hidden');
        timerElement.style.display = 'flex';
        timerElement.style.visibility = 'visible';
        timerElement.style.opacity = '1';
        timerElement.style.zIndex = '9999';
        timerElement.style.position = 'fixed';
        timerElement.style.bottom = '30px';
        timerElement.style.right = '30px';
        timerElement.style.width = '80px';
        timerElement.style.height = '80px';
        timerElement.style.borderRadius = '50%';
        timerElement.style.backgroundColor = '#8B4513';
        timerElement.style.color = 'white';
        timerElement.style.alignItems = 'center';
        timerElement.style.justifyContent = 'center';
        console.log('Timer element classes after:', timerElement.className);
        const computedStyle = window.getComputedStyle(timerElement);
        console.log('=== TIMER DEBUG INFO ===');
        console.log('display:', computedStyle.display);
        console.log('visibility:', computedStyle.visibility);
        console.log('opacity:', computedStyle.opacity);
        console.log('position:', computedStyle.position);
        console.log('zIndex:', computedStyle.zIndex);
        console.log('bottom:', computedStyle.bottom);
        console.log('right:', computedStyle.right);
        console.log('width:', computedStyle.width);
        console.log('height:', computedStyle.height);
        console.log('backgroundColor:', computedStyle.backgroundColor);
        console.log('Element rect:', timerElement.getBoundingClientRect());
        console.log('Parent element:', timerElement.parentElement?.tagName);
        console.log('Is element in viewport?', timerElement.offsetParent !== null);
    }
    
    // タイプ別タイムリミットを取得
    const timeLimit = getTimeLimitForType(mission.type);
    console.log('Timer setup - timeLimit:', timeLimit, 'for type:', mission.type);
    startQuestionTimer(timeLimit);
    
    // 質問テキストを表示
    const questionElement = document.getElementById('question-text');
    const processedQuestion = parseMarkdown(mission.question);
    
    console.log('Setting question HTML:', processedQuestion);
    questionElement.innerHTML = processedQuestion;
    
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
    
    // HTML問題の場合は汎用テストを使用
    if (mission.type === 'code' && !funcName) {
        return await runGenericTests(userCode, tests);
    }
    
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

// 汎用テスト実行関数
async function runGenericTests(userCode, tests) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(userCode, 'text/html');
        
        const results = tests.map((test, index) => {
            try {
                let pass = false;
                let output = null;
                
                switch (test.check) {
                    case 'hasElement':
                        const elements = doc.querySelectorAll(test.selector);
                        pass = elements.length > 0;
                        output = elements.length;
                        break;
                        
                    case 'textContent':
                        const element = doc.querySelector(test.selector);
                        output = element?.textContent?.trim() || '';
                        pass = output === test.expected;
                        break;
                        
                    case 'textIncludes':
                        const el = doc.querySelector(test.selector);
                        output = el?.textContent || '';
                        pass = output.includes(test.expected);
                        break;
                        
                    case 'attribute':
                        const attrEl = doc.querySelector(test.selector);
                        output = attrEl?.getAttribute(test.attribute) || '';
                        pass = output === test.expected;
                        break;
                        
                    case 'elementCount':
                        const countEls = doc.querySelectorAll(test.selector);
                        output = countEls.length;
                        pass = output === test.expected;
                        break;
                        
                    default:
                        pass = false;
                        output = 'Unknown test type';
                }
                
                return { 
                    args: [test.selector], 
                    expected: test.expected, 
                    output, 
                    pass,
                    description: test.description
                };
            } catch (e) {
                return { 
                    args: [test.selector], 
                    expected: test.expected, 
                    output: null, 
                    pass: false, 
                    error: e.message,
                    description: test.description
                };
            }
        });
        
        const success = results.every(r => r.pass);
        return { success, results };
    } catch (error) {
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
    document.getElementById('question-timer').style.display = 'none';
    
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
        
        updateTotalScore(totalScore + totalEarned, totalEarned);
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

async function backToMenu() {
    // ゲーム終了画面の状態をクリア
    document.getElementById('gameover-screen').classList.remove('cleared');
    document.getElementById('gameover-title').textContent = 'GAME OVER';
    
    resetGameState();
    updateProgress();
    await showScreen('chapter-select');
    
    // カテゴリ選択画面に戻る
    backToCategorySelection();
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
    document.getElementById('gameover-title').textContent = 'GAME OVER';
    document.getElementById('test-results').classList.add('hidden');
    
    // 結果画面のリセット
    document.getElementById('result-title').textContent = '';
    document.getElementById('gameover-reason').textContent = '';
    document.getElementById('final-score').querySelector('span').textContent = '0';
    document.getElementById('final-stats').textContent = '';
}

async function loadChaptersList() {
    console.log('Loading chapters list...');
    try {
        const response = await axios.get(`${API_BASE_URL}/chapters`, {
            headers: { 'X-Quiz-Origin': 'quiz-app' }
        });
        
        console.log('Chapters response:', response.data);
        
        // 各章のカテゴリ情報を詳細表示
        if (response.data.chapters) {
            console.log('=== CHAPTER CATEGORIES DEBUG ===');
            response.data.chapters.forEach(ch => {
                console.log(`${ch.chapterId}: category=${ch.category || 'NONE'}, title=${ch.title}`);
            });
        }
        
        const chaptersContainer = document.querySelector('#chapter-select');
        
        // 既存のコンテンツを削除（h2以外）
        chaptersContainer.querySelectorAll(':not(h2)').forEach(el => el.remove());
        
        if (response.data.chapters && response.data.chapters.length > 0) {
            displayCategorySelection(response.data.chapters, chaptersContainer);
            console.log(`Generated category selection from ${response.data.chapters.length} chapters`);
        } else {
            console.warn('No chapters found, using fallback');
            createFallbackChapters(chaptersContainer);
        }
    } catch (error) {
        console.error('Failed to load chapters:', error);
        const chaptersContainer = document.querySelector('#chapter-select');
        createFallbackChapters(chaptersContainer);
    }
}

let allChapters = [];
let gameConfig = null;

// HTMLエスケープ関数
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// マークダウンパーシング関数
function parseMarkdown(text) {
    console.log('Original text:', text);
    
    let result = text
        // コードブロックを先に処理（HTMLエスケープあり）
        .replace(/```([\w]*)?\n([\s\S]*?)```/g, function(match, lang, code) {
            return '<pre><code class="language-' + (lang || '') + '">' + escapeHtml(code) + '</code></pre>';
        })
        // インラインコード
        .replace(/`([^`]+)`/g, function(match, code) {
            return '<code>' + escapeHtml(code) + '</code>';
        })
        // 改行を<br>に変換
        .replace(/\n/g, '<br>');
    
    console.log('Parsed result:', result);
    return result;
}

function getTimeLimitForType(questionType) {
    if (gameConfig && gameConfig.timing && gameConfig.timing.timeLimitByType) {
        return gameConfig.timing.timeLimitByType[questionType] || gameConfig.timing.defaultTimeLimit || 30;
    }
    return 30; // フォールバック
}

function displayCategorySelection(chapters, container) {
    allChapters = chapters;
    
    console.log('=== CATEGORY SELECTION DEBUG ===');
    console.log('Total chapters received:', chapters.length);
    
    // カテゴリ別にグループ化
    const categories = {};
    chapters.forEach(chapter => {
        const category = chapter.category || 'other';
        console.log(`Chapter ${chapter.chapterId} -> category: ${category}`);
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(chapter);
    });
    
    console.log('Categories found:', Object.keys(categories));
    Object.keys(categories).forEach(cat => {
        console.log(`${cat}: ${categories[cat].length} chapters`);
    });
    
    // カテゴリ名のマッピング
    const categoryNames = {
        'basic': '📚 基本編',
        'frontend': '🌐 フロントエンド',
        'backend': '💾 バックエンド',
        'database': '🗄️ データベース',
        'infrastructure': '☁️ インフラ',
        'other': '📚 その他'
    };
    
    // カテゴリの表示順序
    const categoryOrder = ['basic', 'frontend', 'backend', 'database', 'infrastructure', 'other'];
    
    categoryOrder.forEach(category => {
        if (!categories[category]) return;
        
        const button = document.createElement('button');
        button.textContent = categoryNames[category] || category;
        button.className = 'category-button';
        button.onclick = () => showChaptersInCategory(category, categoryNames[category]);
        container.appendChild(button);
    });
}

function showChaptersInCategory(category, categoryName) {
    const container = document.querySelector('#chapter-select');
    const h2 = container.querySelector('h2');
    
    // タイトルを更新
    h2.innerHTML = `${categoryName} <button class="back-btn" onclick="backToCategorySelection()">← カテゴリ一覧に戻る</button>`;
    
    // 既存のボタンを削除
    container.querySelectorAll(':not(h2)').forEach(el => el.remove());
    
    // 章ボタンを表示（ステータスフィルタリング）
    const categoryChapters = allChapters
        .filter(ch => ch.category === category && (ch.status !== 'draft'))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    categoryChapters.forEach(chapter => {
        const button = document.createElement('button');
        let title = chapter.title;
        
        // ステータスバッジを追加
        if (chapter.status === 'beta') {
            title += ' 📝β';
            button.style.opacity = '0.8';
        }
        
        button.textContent = title;
        button.onclick = () => startChapter(chapter.chapterId);
        container.appendChild(button);
    });
}

function backToCategorySelection() {
    const container = document.querySelector('#chapter-select');
    const h2 = container.querySelector('h2');
    
    // タイトルを元に戻す
    h2.textContent = 'カテゴリを選択してください';
    
    // 既存のコンテンツを削除
    container.querySelectorAll(':not(h2)').forEach(el => el.remove());
    
    // カテゴリ選択を再表示
    displayCategorySelection(allChapters, container);
}

function createFallbackChapters(container) {
    const fallbackChapters = [
        { chapterId: 'chapter1', title: '第1章: 基本構文' },
        { chapterId: 'chapter2', title: '第2章: 制御構造' },
        { chapterId: 'chapter3', title: '第3章: 関数' },
        { chapterId: 'chapter4', title: '第4章: プログラミング実践' }
    ];
    
    fallbackChapters.forEach(chapter => {
        const button = document.createElement('button');
        button.textContent = chapter.title;
        button.onclick = () => startChapter(chapter.chapterId);
        container.appendChild(button);
    });
    console.log('Created fallback chapter buttons');
}

// ページ読み込み時に章一覧を読み込み
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Page loaded, initializing chapters...');
    await loadChaptersList();
});

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