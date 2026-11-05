(() => {
  'use strict';

  const { questions, portraits, memes } = window.ViKroQuizData;
  const MAX_NOSE_CM = 31;
  const BONUS_STREAK = 3;
  const imagePath = (file) => `./assets/images/${file}`;
  const byId = (id) => document.getElementById(id);
  const ui = {
    screens: ['screen-start', 'screen-quiz', 'screen-result'].map(byId),
    question: byId('question-title'),
    category: byId('question-category'),
    number: byId('question-number'),
    answers: byId('answers'),
    score: byId('score'),
    progress: byId('progress'),
    feedback: byId('feedback'),
    next: byId('next-button'),
    hint: byId('next-hint'),
    portrait: byId('companion-image'),
    caption: byId('companion-caption'),
    nose: byId('nose-value'),
    noseFill: byId('nose-fill'),
    noseProgress: byId('nose-progress'),
    dialog: byId('bonus-dialog'),
    bonusImage: byId('bonus-image'),
    review: byId('answer-review'),
    reviewList: byId('review-list')
  };

  let state;

  function resetState() {
    state = { current: 0, score: 0, streak: 0, selected: null, results: [], bonusIndex: 0, bonusPending: false, bonusOpen: false };
  }

  function showScreen(id) {
    for (const screen of ui.screens) screen.hidden = screen.id !== id;
  }

  function makeIcon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    svg.setAttribute('class', 'icon answer-status');
    svg.setAttribute('aria-hidden', 'true');
    use.setAttribute('href', `#${name}`);
    svg.append(use);
    return svg;
  }

  function noseLength() {
    return Math.round(state.score / questions.length * MAX_NOSE_CM);
  }

  function updateMeter() {
    const length = noseLength();
    ui.score.textContent = state.score;
    ui.nose.textContent = length;
    ui.noseFill.style.width = `${state.score / questions.length * 100}%`;
    ui.noseProgress.setAttribute('aria-valuenow', length);
    ui.noseProgress.setAttribute('aria-valuetext', `${length} из ${MAX_NOSE_CM} см`);
  }

  function updateProgress() {
    const items = questions.map((_, index) => {
      const item = document.createElement('li');
      const result = state.results[index];
      let status = 'ещё нет ответа';
      if (result) {
        item.className = result.correct ? 'is-correct' : 'is-incorrect';
        status = result.correct ? 'верно' : 'ошибка';
      } else if (index === state.current) {
        item.setAttribute('aria-current', 'step');
        status = 'текущий';
      }
      item.setAttribute('aria-label', `Вопрос ${index + 1}: ${status}`);
      item.title = `Вопрос ${index + 1}: ${status}`;
      return item;
    });
    ui.progress.replaceChildren(...items);
  }

  function setPortrait(type, index) {
    const pool = portraits[type];
    ui.portrait.src = imagePath(pool[index % pool.length]);
    const captions = {
      neutral: ['думаем вместе', 'я весь во внимании', 'ну-ка, ну-ка'],
      correct: ['так и знал', 'хороший у тебя нюх', 'носом чую: верно'],
      incorrect: ['бывает и такое', 'я тоже не всё знаю', 'ладно, идём дальше']
    };
    const caption = captions[type][index % captions[type].length];
    ui.caption.textContent = caption;
    ui.portrait.alt = `Борзая: ${caption}`;
  }

  function renderQuestion() {
    if (state.current === questions.length) {
      showResult();
      return;
    }

    const question = questions[state.current];
    state.selected = null;
    ui.number.textContent = String(state.current + 1).padStart(2, '0');
    ui.category.textContent = question.category;
    ui.question.textContent = question.question;
    ui.feedback.replaceChildren();
    ui.feedback.className = 'feedback';
    ui.next.hidden = true;
    ui.next.disabled = false;
    ui.next.firstChild.textContent = state.current === questions.length - 1 ? 'К результатам ' : 'Дальше ';
    ui.hint.textContent = 'Никуда не торопимся';

    const buttons = question.answers.map((answer, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'answer-button';
      const label = document.createElement('span');
      label.className = 'answer-label';
      label.textContent = ['А', 'Б', 'В'][index];
      label.setAttribute('aria-hidden', 'true');
      const copy = document.createElement('span');
      copy.className = 'answer-copy';
      copy.textContent = answer;
      button.append(label, copy);
      button.addEventListener('click', () => selectAnswer(index));
      return button;
    });

    ui.answers.replaceChildren(...buttons);
    updateMeter();
    updateProgress();
    setPortrait('neutral', state.current);
    ui.question.focus();
  }

  function startQuiz() {
    resetState();
    ui.review.open = false;
    ui.reviewList.replaceChildren();
    showScreen('screen-quiz');
    renderQuestion();
  }

  function selectAnswer(selected) {
    if (state.selected !== null || state.bonusOpen || ui.screens[1].hidden) return;
    const question = questions[state.current];
    const correct = selected === question.correct;
    state.selected = selected;
    state.results.push({ selected, correct });

    if (correct) {
      state.score += 1;
      state.streak += 1;
      state.bonusPending = state.streak % BONUS_STREAK === 0;
    } else {
      state.streak = 0;
      state.bonusPending = false;
    }

    Array.from(ui.answers.children).forEach((button, index) => {
      button.disabled = true;
      if (index === question.correct) {
        button.classList.add('is-correct');
        button.append(makeIcon('check'));
        button.setAttribute('aria-label', `${question.answers[index]}. Правильный ответ${correct ? ', твой выбор' : ''}.`);
      } else if (index === selected) {
        button.classList.add('is-incorrect');
        button.append(makeIcon('cross'));
        button.setAttribute('aria-label', `${question.answers[index]}. Твой выбор, неверно.`);
      } else {
        button.classList.add('is-muted');
      }
    });

    const title = document.createElement('strong');
    title.textContent = correct ? 'Верно' : 'Не в этот раз';
    const detail = document.createElement('span');
    detail.textContent = correct ? `Нос вырос до ${noseLength()} см.` : `Правильный ответ: ${question.answers[question.correct]}.`;
    ui.feedback.className = `feedback ${correct ? 'is-correct' : 'is-incorrect'}`;
    ui.feedback.replaceChildren(title, detail);
    ui.hint.textContent = state.bonusPending ? 'Три подряд. Тебе тут кое-что передали.' : `${state.current + 1} из ${questions.length}`;
    ui.next.hidden = false;
    updateMeter();
    updateProgress();
    setPortrait(correct ? 'correct' : 'incorrect', correct ? state.score - 1 : state.current);
    ui.next.focus({ preventScroll: true });
  }

  function advance() {
    state.current += 1;
    renderQuestion();
  }

  function nextQuestion() {
    if (state.selected === null || state.bonusOpen || ui.screens[1].hidden) return;
    if (!state.bonusPending) {
      advance();
      return;
    }
    const meme = memes[state.bonusIndex % memes.length];
    ui.bonusImage.src = imagePath(meme.file);
    ui.bonusImage.alt = meme.alt;
    state.bonusOpen = true;
    ui.next.disabled = true;
    ui.dialog.showModal();
  }

  function closeBonus() {
    if (ui.dialog.open) ui.dialog.close();
  }

  function showResult() {
    showScreen('screen-result');
    byId('result-score').textContent = state.score;
    byId('result-nose').textContent = noseLength();

    const ratio = state.score / questions.length;
    let title, description, portrait;
    if (ratio >= 0.8) {
      title = 'Вот это нюх!';
      description = 'Ты отлично знаешь борзых. Подозреваем, что у тебя самого где-то спрятан длинный нос.';
      portrait = 'image copy 13.png';
    } else if (ratio >= 0.5) {
      title = 'С борзыми на короткой ноге.';
      description = 'Многое уже знакомо, а кое-что оказалось сюрпризом. Ниже можно посмотреть все ответы.';
      portrait = 'image copy 8.png';
    } else {
      title = 'Знакомство состоялось.';
      description = 'Теперь ты знаешь о борзых чуть больше. Можно заглянуть в ответы и попробовать ещё раз.';
      portrait = 'image copy 5.png';
    }

    byId('result-title').textContent = title;
    byId('result-description').textContent = description;
    byId('result-image').src = imagePath(portrait);
    byId('result-image').alt = 'Борзая на память о квизе';
    buildReview();
    byId('result-title').focus();
  }

  function buildReview() {
    const items = questions.map((question, index) => {
      const result = state.results[index];
      const item = document.createElement('li');
      item.className = 'review-item';
      const status = document.createElement('span');
      status.className = `review-status ${result.correct ? 'is-correct' : 'is-incorrect'}`;
      status.textContent = result.correct ? 'Верно' : 'Ошибка';
      const heading = document.createElement('h3');
      heading.textContent = question.question;
      item.append(status, heading);
      if (!result.correct) {
        const selected = document.createElement('p');
        selected.className = 'review-incorrect';
        selected.textContent = `Твой ответ: ${question.answers[result.selected]}`;
        item.append(selected);
      }
      const answer = document.createElement('p');
      answer.className = 'review-correct';
      answer.textContent = `Верный ответ: ${question.answers[question.correct]}`;
      item.append(answer);
      return item;
    });
    ui.reviewList.replaceChildren(...items);
  }

  byId('start-button').addEventListener('click', startQuiz);
  byId('restart-button').addEventListener('click', startQuiz);
  byId('home-button').addEventListener('click', () => {
    resetState();
    showScreen('screen-start');
    byId('intro-title').focus();
  });
  ui.next.addEventListener('click', nextQuestion);
  byId('bonus-close').addEventListener('click', closeBonus);
  byId('bonus-continue').addEventListener('click', closeBonus);
  ui.dialog.addEventListener('close', () => {
    if (!state.bonusOpen) return;
    state.bonusOpen = false;
    state.bonusPending = false;
    state.bonusIndex += 1;
    advance();
  });

  document.querySelectorAll('[data-question-total]').forEach((element) => {
    element.textContent = questions.length;
  });
  resetState();
})();
