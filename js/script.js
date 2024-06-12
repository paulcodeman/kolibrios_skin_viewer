function readSkin() {
    const file = document.getElementById('file-input').files[0];
    const reader = new FileReader();
    const skin = new SkinLoader();

    reader.onload = (e) => {
        let skinBytes = e.target.result;
        let skinData = new DataView(skinBytes);
        skin.read(skinData);
    };

    file && reader.readAsArrayBuffer(file);
}
