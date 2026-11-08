// main.js – für index.html
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.range-btn');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const min = Number(btn.dataset.min);
            const max = Number(btn.dataset.max);
            localStorage.setItem('rangeMin', min);
            localStorage.setItem('rangeMax', max);
            window.location.href = 'game.html';
        });
    });
});
