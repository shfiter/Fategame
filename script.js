document.getElementById('draw-btn').addEventListener('click', function() {
    const textarea = document.getElementById('names');
    const namesText = textarea.value.trim();
    
    // 依照換行切分名單，並過濾掉空白行
    const names = namesText.split('\n').map(name => name.trim()).filter(name => name !== '');
    
    if (names.length === 0) {
        alert('請至少輸入一個名字！');
        return;
    }
    
    // 隨機抽選一位
    const randomIndex = Math.floor(Math.random() * names.length);
    const winner = names[randomIndex];
    
    // 顯示結果
    const resultContainer = document.getElementById('result-container');
    const winnerDisplay = document.getElementById('winner-display');
    
    resultContainer.classList.remove('hidden');
    winnerDisplay.textContent = winner;
});