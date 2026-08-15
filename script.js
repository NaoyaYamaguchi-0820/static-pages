(() => {
  const BASE_URL = "https://www.irasutoya.com/2014/03/blog-post_869.html";
  const LOAD_TIMEOUT_MS = 7000;

  const frameBox = document.getElementById("frameBox");
  const quizFrame = document.getElementById("quizFrame");
  const loading = document.getElementById("loading");
  const fallback = document.getElementById("fallback");
  const answerBtn = document.getElementById("answerBtn");
  const nextBtn = document.getElementById("nextBtn");
  const answerBanner = document.getElementById("answerBanner");
  const openDirect = document.getElementById("openDirect");

  let loadTimer = null;

  function randomUrl() {
    const seed = Date.now().toString(36) + Math.random().toString(36).slice(2);
    return `${BASE_URL}?m=1&_r=${seed}#random`;
  }

  function loadNewQuiz() {
    const url = randomUrl();

    // reset UI state
    frameBox.classList.remove("revealed");
    answerBanner.hidden = true;
    answerBtn.disabled = true;
    fallback.hidden = true;
    loading.hidden = false;
    frameBox.hidden = false;

    openDirect.href = url;
    quizFrame.src = url;

    clearTimeout(loadTimer);
    loadTimer = setTimeout(() => {
      // the frame never told us it finished loading (e.g. blocked embedding)
      loading.hidden = true;
      frameBox.hidden = true;
      fallback.hidden = false;
    }, LOAD_TIMEOUT_MS);
  }

  quizFrame.addEventListener("load", () => {
    clearTimeout(loadTimer);
    loading.hidden = true;
    answerBtn.disabled = false;
  });

  answerBtn.addEventListener("click", () => {
    frameBox.classList.add("revealed");
    answerBanner.hidden = false;
    answerBtn.disabled = true;
  });

  nextBtn.addEventListener("click", loadNewQuiz);

  loadNewQuiz();
})();
