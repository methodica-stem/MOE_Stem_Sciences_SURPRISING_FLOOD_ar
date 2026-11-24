/* review-layer.js — REVIEW VERSION ONLY: the button that shows or hides the proposed-translation layer. */
(function () {
  var b = document.getElementById('rl-toggle');
  if (!b) return;
  b.addEventListener('click', function () {
    var off = document.body.classList.toggle('rl-off');
    b.setAttribute('aria-pressed', off ? 'false' : 'true');
    b.textContent = off
      ? 'طبقة اقتراحات الترجمة للمراجعة: مخفيّة (اضغطوا للإظهار)'
      : 'طبقة اقتراحات الترجمة للمراجعة: ظاهرة (اضغطوا للإخفاء)';
  });
})();
