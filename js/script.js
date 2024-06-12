function htmlColor(color) {
    return color.startsWith('#') ? color : `#${color}`;
}

function toHex(value) {
    return value.toString(16).padStart(6, '0');
}

function loadStructureTheme(structure) {
    const active = document.querySelector('.window.active');
    const activeInner = active.querySelector('.inner');
    const inactive = document.querySelector('.window.inactive');
    const inactiveInner = inactive.querySelector('.inner');

    const applyStyles = (element, styles) => {
        Object.keys(styles).forEach(key => {
            element.style[key] = styles[key];
        });
    };

    applyStyles(active, {
        borderColor: htmlColor(structure.active.outer),
        backgroundColor: htmlColor(structure.active.frame)
    });
    applyStyles(activeInner, {
        borderColor: htmlColor(structure.active.inner),
        backgroundColor: htmlColor(structure.dtp.work)
    });
    applyStyles(inactive, {
        borderColor: htmlColor(structure.inactive.outer),
        backgroundColor: htmlColor(structure.inactive.frame)
    });
    applyStyles(inactiveInner, {
        borderColor: htmlColor(structure.inactive.inner),
        backgroundColor: htmlColor(structure.dtp.work)
    });

    document.querySelectorAll('.title').forEach(item => {
        item.style.color = htmlColor(structure.dtp.window_title);
    });

    structure.bitmap.forEach(item => {
        let element = item.type ? active : inactive;
        let panel = element.querySelector('.panel');
        let button = element.querySelector('.button');
        let left = element.querySelector('.left');
        if (item.kind === 3) {
            applyStyles(panel, {
                backgroundImage: `url(${item.base64})`,
                height: `${item.height}px`
            });
        } else if (item.kind === 2) {
            applyStyles(button, {
                backgroundImage: `url(${item.base64})`,
                height: `${item.height}px`,
                width: `${item.width}px`,
                right: '-1px'
            });
        } else if (item.kind === 1) {
            applyStyles(left, {
                backgroundImage: `url(${item.base64})`,
                height: `${item.height}px`,
                width: `${item.width}px`,
                left: '-1px'
            });
        }
    });

    structure.button.forEach(item => {
        let inactiveButton = item.type === 1 ? inactive.querySelector('.min') : inactive.querySelector('.close');
        let activeButton = item.type === 1 ? active.querySelector('.min') : active.querySelector('.close');
        applyStyles(activeButton, {
            top: `${item.top}px`,
            right: `${-structure.margin.left + structure.margin.right + item.left}px`,
            height: `${item.height}px`,
            width: `${item.width}px`
        });
        applyStyles(inactiveButton, {
            top: `${item.top}px`,
            right: `${-structure.margin.left + structure.margin.right + item.left}px`,
            height: `${item.height}px`,
            width: `${item.width}px`
        });
    });

    document.querySelectorAll('.window button').forEach(item => {
        applyStyles(item, {
            backgroundColor: htmlColor(structure.dtp.work_button),
            color: htmlColor(structure.dtp.work_button_text)
        });
    });

    document.querySelectorAll('.window span').forEach(item => {
        item.style.color = htmlColor(structure.dtp.work_text);
    });
}
function readSkin() {
    const SKIN_MAGIC = 0x4E494B53; // 'SKIN'
    const KPACK_MAGIC = 0x4B43504B; // 'KPACK'

    const file = document.getElementById('file-input').files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        let skinBytes = e.target.result;
        let skinData = new DataView(skinBytes);
        let skinObj = {};

        let magic = skinData.getUint32(0, true);
        if (magic === KPACK_MAGIC) {
            try {
                skinData = unpack(skinData);
            } catch (error) {
                alert(`Unpacking error: ${error}`);
                return;
            }
        }

        magic = skinData.getUint32(0, true);
        if (magic !== SKIN_MAGIC) {
            alert('The uploaded file is not a skin!');
            return;
        }

        skinObj.version = skinData.getUint32(4, true);

        const params = skinData.getUint32(8, true),
            buttons = skinData.getUint32(12, true),
            bitmaps = skinData.getUint32(16, true);

        const parseMargins = (offset) => ({
            right: skinData.getUint16(offset + 4, true),
            left: skinData.getUint16(offset + 6, true),
            bottom: skinData.getUint16(offset + 8, true),
            top: skinData.getUint16(offset + 10, true)
        });

        const parseColors = (offset) => ({
            inner: toHex(skinData.getUint32(offset + 12, true)),
            outer: toHex(skinData.getUint32(offset + 16, true)),
            frame: toHex(skinData.getUint32(offset + 20, true))
        });

        const parseDTP = (offset) => ({
            size: skinData.getUint32(offset + 36, true),
            taskbar: toHex(skinData.getUint32(offset + 40, true)),
            taskbar_text: toHex(skinData.getUint32(offset + 44, true)),
            work_dark: toHex(skinData.getUint32(offset + 48, true)),
            work_light: toHex(skinData.getUint32(offset + 52, true)),
            window_title: toHex(skinData.getUint32(offset + 56, true)),
            work: toHex(skinData.getUint32(offset + 60, true)),
            work_button: toHex(skinData.getUint32(offset + 64, true)),
            work_button_text: toHex(skinData.getUint32(offset + 68, true)),
            work_text: toHex(skinData.getUint32(offset + 72, true)),
            work_graph: toHex(skinData.getUint32(offset + 76, true))
        });

        skinObj.margin = parseMargins(params);
        skinObj.active = parseColors(params);
        skinObj.inactive = parseColors(params + 12);
        skinObj.dtp = parseDTP(params);

        const parseButtons = (offset) => {
            let buttons = [];
            while (skinData.getUint32(offset, true) !== 0) {
                buttons.push({
                    type: skinData.getUint32(offset, true),
                    left: skinData.getInt16(offset + 4, true),
                    top: skinData.getInt16(offset + 6, true),
                    width: skinData.getUint16(offset + 8, true),
                    height: skinData.getUint16(offset + 10, true)
                });
                offset += 12;
            }
            return buttons;
        };

        const parseBitmaps = (offset) => {
            let bitmaps = [];
            while (skinData.getUint32(offset, true) !== 0) {
                let kind = skinData.getUint16(offset, true);
                let type = skinData.getUint16(offset + 2, true);
                let posbm = skinData.getUint32(offset + 4, true);
                let width = skinData.getUint32(posbm, true);
                let height = skinData.getUint32(posbm + 4, true);

                let canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                let ctx = canvas.getContext("2d");
                let canvasData = ctx.getImageData(0, 0, width, height);

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        let i = (x + y * width) * 3;
                        let bb = skinData.getUint8(posbm + 8 + i);
                        let gg = skinData.getUint8(posbm + 8 + i + 1);
                        let rr = skinData.getUint8(posbm + 8 + i + 2);

                        let pixelIndex = (x + y * width) * 4;
                        canvasData.data[pixelIndex] = rr;
                        canvasData.data[pixelIndex + 1] = gg;
                        canvasData.data[pixelIndex + 2] = bb;
                        canvasData.data[pixelIndex + 3] = 255;
                    }
                }
                ctx.putImageData(canvasData, 0, 0);

                bitmaps.push({
                    kind,
                    type,
                    width,
                    height,
                    base64: canvas.toDataURL()
                });
                offset += 8;
            }
            return bitmaps;
        };

        skinObj.button = parseButtons(buttons);
        skinObj.bitmap = parseBitmaps(bitmaps);

        loadStructureTheme(skinObj);
        document.querySelectorAll('.window').forEach(window => window.style.display = 'block');
    };

    reader.readAsArrayBuffer(file);
}
