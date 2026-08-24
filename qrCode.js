(function () {
    const container = document.querySelector('#qrcode');
    const botaoDownload = document.querySelector('#baixar-qrcode');

    if (!container || !botaoDownload) return;

    if (!window.QRCode) {
        container.textContent = 'Não foi possível carregar o QR Code.';
        botaoDownload.disabled = true;
        return;
    }

    new QRCode(container, {
        text: window.location.href,
        width: 180,
        height: 180,
        colorDark: '#263238',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
    });

    botaoDownload.addEventListener('click', () => {
        const imagem = container.querySelector('img');
        const canvas = container.querySelector('canvas');
        const link = document.createElement('a');
        link.download = 'qrcode-laia.png';
        link.href = canvas ? canvas.toDataURL('image/png') : imagem.src;
        link.click();
    });
})();