// game.js – für game.html
(() => {
    const TOLERANCE_PERCENT = 5;
    const SLICE_MIN = 0.3;
    const SLICE_MAX = 1.0;
    const REFERENCE_MIN_DISTANCE = 0.2;
    const SLIDER_MIN = 0;
    const SLIDER_MAX = 1000;

    const questionEl = document.getElementById('question');
    const sliderEl = document.getElementById('slider');
    const refContainer = document.getElementById('ref-labels');
    const checkBtn = document.getElementById('checkBtn');
    const helpBtn = document.getElementById('helpBtn');
    const solutionBtn = document.getElementById('solutionBtn');
    const feedbackEl = document.getElementById('feedback');
    const backBtn = document.getElementById('backBtn');
    const scoreEl = document.getElementById('score');

    let rangeMin;
    let rangeMax;
    let viewMin;
    let viewMax;
    let targetNumber;
    let refValues = [];
    let attempts = 0;
    let solutionShown = false;

    let hits = Number(localStorage.getItem('hits') || 0);
    let medals = Number(localStorage.getItem('medals') || 0);

    function init() {
        rangeMin = Number(localStorage.getItem('rangeMin'));
        rangeMax = Number(localStorage.getItem('rangeMax'));

        sliderEl.min = SLIDER_MIN;
        sliderEl.max = SLIDER_MAX;
        sliderEl.step = 1;

        renderScore();
        newTask();

        checkBtn.addEventListener('click', checkAnswer);
        helpBtn.addEventListener('click', addHelpReference);
        solutionBtn.addEventListener('click', showSolution);

        backBtn.addEventListener('click', () => {
            localStorage.removeItem('hits');
            localStorage.removeItem('medals');
            window.location.href = 'index.html';
        });

        // Bei Größenänderung bleiben die Zahlen gleich, aber ihre Pixelpositionen
        // werden passend zur neuen Sliderbreite neu berechnet.
        window.addEventListener('resize', () => {
            window.requestAnimationFrame(drawReferences);
        });
    }

    function newTask() {
        attempts = 0;
        solutionShown = false;
        hideExtraButtons();
        feedbackEl.textContent = '';

        targetNumber = randomInt(rangeMin, rangeMax);

        const totalLength = rangeMax - rangeMin;
        const sliceFactor = randomFloat(SLICE_MIN, SLICE_MAX);
        const viewLength = Math.max(1, Math.round(totalLength * sliceFactor));

        const minStart = Math.max(rangeMin, targetNumber - viewLength);
        const maxStart = Math.min(rangeMax - viewLength, targetNumber);

        viewMin = randomInt(minStart, maxStart);
        viewMax = viewMin + viewLength;

        refValues = [];

        while (refValues.length < 2) {
            const candidate = randomInt(viewMin, viewMax);

            if (candidate === targetNumber) {
                continue;
            }

            const farEnough = refValues.every(
                value => Math.abs(value - candidate) >= viewLength * REFERENCE_MIN_DISTANCE
            );

            if (farEnough) {
                refValues.push(candidate);
            }
        }

        questionEl.textContent = `Wo befindet sich die Zahl ${targetNumber}?`;

        // Der feste Sliderwertebereich sorgt dafür, dass die Zuordnung
        // zwischen Schieberposition und Zahlenwert bei Resize gleich bleibt.
        sliderEl.value = Math.round((SLIDER_MIN + SLIDER_MAX) / 2);

        drawReferences();
    }

    /*
     * Ermittelt die horizontale Pixelposition eines Zahlenwerts.
     * Die äußersten möglichen Thumb-Mittelpunkte liegen jeweils eine
     * halbe Thumb-Breite vom Rand des Input-Elements entfernt.
     */
    function getSliderPositionForValue(value) {
        const sliderRect = sliderEl.getBoundingClientRect();
        const labelsRect = refContainer.getBoundingClientRect();
        const thumbSize = parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue('--thumb-size')
        ) || 20;

        const ratio = (value - viewMin) / (viewMax - viewMin);
        const thumbRadius = thumbSize / 2;
        const usableTrackWidth = Math.max(0, sliderRect.width - thumbSize);

        return (
            sliderRect.left -
            labelsRect.left +
            thumbRadius +
            ratio * usableTrackWidth
        );
    }

    function drawReferences() {
        refContainer.innerHTML = '';

        refValues.forEach(value => {
            const label = document.createElement('span');
            label.textContent = formatNumber(value);
            label.style.left = `${getSliderPositionForValue(value)}px`;
            refContainer.appendChild(label);
        });

        if (solutionShown) {
            drawSolutionMarker();
        }
    }

    function drawSolutionMarker() {
        const sliderRect = sliderEl.getBoundingClientRect();
        const labelsRect = refContainer.getBoundingClientRect();

        const marker = document.createElement('div');
        marker.className = 'solution-marker';
        marker.style.left = `${getSliderPositionForValue(targetNumber)}px`;
        marker.style.top = `${sliderRect.top - labelsRect.top + sliderRect.height / 2}px`;

        refContainer.appendChild(marker);
    }

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }

    function formatNumber(number) {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
    }

    function checkAnswer() {
        const sliderRatio =
            (Number(sliderEl.value) - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN);

        const guessedNumber = Math.round(
            viewMin + sliderRatio * (viewMax - viewMin)
        );

        const sortedRefs = [...refValues].sort((a, b) => a - b);
        const [a, b] = sortedRefs;

        const inSameSegment =
            (guessedNumber >= a && guessedNumber <= b &&
                targetNumber >= a && targetNumber <= b) ||
            (guessedNumber < a && targetNumber < a) ||
            (guessedNumber > b && targetNumber > b);

        const tolerance =
            (viewMax - viewMin) * (TOLERANCE_PERCENT / 100);

        const closeEnough =
            Math.abs(guessedNumber - targetNumber) <= tolerance;

        if (inSameSegment && closeEnough) {
            handleSuccess();
        } else {
            handleFailure();
        }
    }

    function handleSuccess() {
        hits += 1;

        if (hits >= 10) {
            hits = 0;
            medals += 1;
        }

        localStorage.setItem('hits', hits);
        localStorage.setItem('medals', medals);
        renderScore();

        feedbackEl.innerHTML =
            '<span style="color:#27ae60;font-weight:bold;">✓ Richtig! Bravo!</span>';

        playSuccessSound();
        setTimeout(newTask, 1700);
    }

    function handleFailure() {
        attempts += 1;
        feedbackEl.innerHTML =
            '<span style="color:#c0392b;">Der Schieber ist noch nicht am richtigen Ort! Versuch es nochmals!</span>';

        if (attempts >= 2) {
            solutionBtn.classList.remove('hidden');
        }
    }

    /*
     * Fügt einen zusätzlichen Referenzwert aus dem sichtbaren Ausschnitt hinzu.
     * Da der Wert direkt aus viewMin bis viewMax gewählt wird, können bei
     * Zahlenräumen mit negativen Zahlen auch negative Hilfswerte entstehen.
     */
    function addHelpReference() {
        const candidates = [];

        for (let value = viewMin; value <= viewMax; value += 1) {
            if (value !== targetNumber && !refValues.includes(value)) {
                candidates.push(value);
            }
        }

        if (candidates.length === 0) {
            return;
        }

        const extra = candidates[randomInt(0, candidates.length - 1)];
        refValues.push(extra);
        drawReferences();
    }

    function showSolution() {
        solutionShown = true;
        drawReferences();
        solutionBtn.classList.add('hidden');
    }

    function renderScore() {
        const icons = '⭐'.repeat(hits) + '🏅'.repeat(medals);
        scoreEl.textContent = icons;
    }

    function hideExtraButtons() {
        solutionBtn.classList.add('hidden');
    }

    // Erfolgston über Web Audio, ohne externe Audiodatei.
    function playSuccessSound() {
        try {
            const AudioContextClass =
                window.AudioContext || window.webkitAudioContext;

            if (!AudioContextClass) {
                return;
            }

            const audioContext = new AudioContextClass();

            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            const now = audioContext.currentTime;

            [659.25, 783.99, 987.77].forEach((frequency, index) => {
                const oscillator = audioContext.createOscillator();
                const gain = audioContext.createGain();
                const startTime = now + index * 0.11;

                oscillator.type = 'sine';
                oscillator.frequency.value = frequency;

                gain.gain.setValueAtTime(0.0001, startTime);
                gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);

                oscillator.connect(gain);
                gain.connect(audioContext.destination);

                oscillator.start(startTime);
                oscillator.stop(startTime + 0.2);
            });
        } catch (error) {
            // Der Ton ist optional; das Spiel bleibt auch ohne Audio nutzbar.
        }
    }

    init();
})();
