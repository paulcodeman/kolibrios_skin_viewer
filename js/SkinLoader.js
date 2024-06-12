class SkinLoader {
    constructor() {
        this.SKIN_MAGIC = 0x4E494B53; // 'SKIN'
        this.KPACK_MAGIC = 0x4B43504B; // 'KPACK'

        // Создаем кеш для изображений, чтобы не загружать их несколько раз
        this.imageCache = {};
    }

    htmlColor(color) {
        return color.startsWith('#') ? color : `#${color}`;
    }

    toHex(value) {
        return value.toString(16).padStart(6, '0');
    }

    applyStyles(element, styles) {
        Object.keys(styles).forEach(key => {
            element.style[key] = styles[key];
        });
    }

    // Функция для загрузки изображения с кешированием
    loadImage(base64) {
        if (base64 in this.imageCache) {
            return this.imageCache[base64];
        } else {
            let img = new Image();
            img.src = base64;
            this.imageCache[base64] = img;
            return img;
        }
    }

    loadWindowStructureTheme(object, structure) {
        const active = object;
        const status = object.dataset.status ?? 'active';
        const activeInner = active.querySelector('.inner');

        this.applyStyles(active, {
            borderColor: this.htmlColor(structure[status].outer),
            backgroundColor: this.htmlColor(structure[status].frame)
        });
        this.applyStyles(activeInner, {
            borderColor: this.htmlColor(structure[status].inner),
            backgroundColor: this.htmlColor(structure.dtp.work)
        });

        structure.bitmap.forEach(item => {
            if (item.type == (status == 'active')) {
                let panel = active.querySelector('.panel');
                let button = active.querySelector('.button');
                let left = active.querySelector('.left');

                // Используем кешированное изображение
                let img = this.loadImage(item.base64);

                if (item.kind === 3) {
                    this.applyStyles(panel, {
                        backgroundImage: `url(${img.src})`,
                        height: `${item.height}px`
                    });
                } else if (item.kind === 2) {
                    this.applyStyles(button, {
                        backgroundImage: `url(${img.src})`,
                        height: `${item.height}px`,
                        width: `${item.width}px`,
                        right: '-1px'
                    });
                } else if (item.kind === 1) {
                    this.applyStyles(left, {
                        backgroundImage: `url(${img.src})`,
                        height: `${item.height}px`,
                        width: `${item.width}px`,
                        left: '-1px'
                    });
                }
            }
        });

        structure.button.forEach(item => {
            if (item.type === 1) {
                let activeButton = active.querySelector('.min');
                this.applyStyles(activeButton, {
                    top: `${item.top}px`,
                    right: `${-structure.margin.left + structure.margin.right + item.left}px`,
                    height: `${item.height}px`,
                    width: `${item.width}px`
                });
            } else {
                let activeButton = active.querySelector('.close');
                this.applyStyles(activeButton, {
                    top: `${item.top}px`,
                    right: `${-structure.margin.left + structure.margin.right + item.left}px`,
                    height: `${item.height}px`,
                    width: `${item.width}px`
                });
            }
        });

        object.querySelectorAll('.window button').forEach(item => {
            this.applyStyles(item, {
                backgroundColor: this.htmlColor(structure.dtp.work_button),
                color: this.htmlColor(structure.dtp.work_button_text)
            });
        });

        object.querySelectorAll('.window span').forEach(item => {
            item.style.color = this.htmlColor(structure.dtp.work_text);
        });
    }

    loadStructureTheme(structure) {
        document.querySelectorAll('.window').forEach(w => {
            this.loadWindowStructureTheme(w, structure);
            w.querySelectorAll('.title').forEach(item => {
                item.style.color = this.htmlColor(structure.dtp.window_title);
                item.style.left = `${structure.margin.left}px`;
            });
        });
    }

    parseMargins(skinData, offset) {
        return {
            right: skinData.getUint16(offset + 4, true),
            left: skinData.getUint16(offset + 6, true),
            bottom: skinData.getUint16(offset + 8, true),
            top: skinData.getUint16(offset + 10, true)
        };
    }

    parseColors(skinData, offset) {
        return {
            inner: this.toHex(skinData.getUint32(offset + 12, true)),
            outer: this.toHex(skinData.getUint32(offset + 16, true)),
            frame: this.toHex(skinData.getUint32(offset + 20, true))
        };
    }

    parseDTP(skinData, offset) {
        return {
            size: skinData.getUint32(offset + 36, true),
            taskbar: this.toHex(skinData.getUint32(offset + 40, true)),
            taskbar_text: this.toHex(skinData.getUint32(offset + 44, true)),
            work_dark: this.toHex(skinData.getUint32(offset + 48, true)),
            work_light: this.toHex(skinData.getUint32(offset + 52, true)),
            window_title: this.toHex(skinData.getUint32(offset + 56, true)),
            work: this.toHex(skinData.getUint32(offset + 60, true)),
            work_button: this.toHex(skinData.getUint32(offset + 64, true)),
            work_button_text: this.toHex(skinData.getUint32(offset + 68, true)),
            work_text: this.toHex(skinData.getUint32(offset + 72, true)),
            work_graph: this.toHex(skinData.getUint32(offset + 76, true))
        };
    }

    parseButtons(skinData, offset) {
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
    }

    parseBitmaps(skinData, offset) {
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
    }

    read(skinData) {
        let skinObj = {};

        let magic = skinData.getUint32(0, true);
        if (magic === this.KPACK_MAGIC) {
            try {
                const unpacker = new KPacker();
                skinData = unpacker.unpack(skinData);
            } catch (error) {
                alert(`Unpacking error: ${error}`);
                return;
            }
        }

        magic = skinData.getUint32(0, true);
        if (magic !== this.SKIN_MAGIC) {
            alert('The uploaded file is not a skin!');
            return;
        }

        skinObj.version = skinData.getUint32(4, true);

        const params = skinData.getUint32(8, true),
            buttons = skinData.getUint32(12, true),
            bitmaps = skinData.getUint32(16, true);

        skinObj.margin = this.parseMargins(skinData, params);
        skinObj.active = this.parseColors(skinData, params);
        skinObj.inactive = this.parseColors(skinData, params + 12);
        skinObj.dtp = this.parseDTP(skinData, params);
        skinObj.button = this.parseButtons(skinData, buttons);
        skinObj.bitmap = this.parseBitmaps(skinData, bitmaps);

        this.loadStructureTheme(skinObj);
        document.querySelectorAll('.window').forEach(window => window.style.display = 'block');
    }
}
