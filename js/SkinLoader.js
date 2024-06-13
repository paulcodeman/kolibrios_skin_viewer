class SkinLoader {
    constructor() {
        this.SKIN_MAGIC = 0x4E494B53; // 'SKIN'
        this.KPACK_MAGIC = 0x4B43504B; // 'KPCK'
        this.name = 'theme.skn';

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

        object.querySelectorAll('button').forEach(item => {
            this.applyStyles(item, {
                backgroundColor: this.htmlColor(structure.dtp.work_button),
                color: this.htmlColor(structure.dtp.work_button_text)
            });
        });

        object.querySelectorAll('span').forEach(item => {
            item.style.color = this.htmlColor(structure.dtp.work_text);
        });
    }

    loadStructureTheme(structure) {
        document.querySelectorAll('.window').forEach(w => {
            let title = w.querySelector('.title');
            title.style.color = this.htmlColor(structure.dtp.window_title);
            title.style.left = `${structure.margin.left}px`;
            this.loadWindowStructureTheme(w, structure);
        });
    }

    parseMargins(skinData, offset) {
        return {
            height: skinData.getUint32(offset, true),
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

    base64ToUint8Array(base64) {
        const binaryString = atob(base64.split(',')[1]);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    base64ToRGBArray(base64) {
        const img = new Image();
        img.src = base64;

        // Создаем canvas и контекст
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Устанавливаем размер canvas равным размеру изображения
        canvas.width = img.width;
        canvas.height = img.height;

        // Рисуем изображение на canvas
        ctx.drawImage(img, 0, 0);

        // Получаем данные изображения
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;

        // Создаем массив RGB
        const rgbArray = [];
        for (let i = 0; i < data.length; i += 4) {
            const rr = data[i];
            const gg = data[i + 1];
            const bb = data[i + 2];
            rgbArray.push(bb, gg, rr);
        }

        return rgbArray;
    }

    save(structure) {
        // Allocate 1MB of memory initially
        const skinData = new Uint8Array(1024 * 1024);
        const dataView = new DataView(skinData.buffer);
        let offset = 0;

        // Write the magic number 'SKIN'
        dataView.setUint32(offset, this.SKIN_MAGIC, true);
        offset += 4;

        // Skin version (set to 1)
        dataView.setUint32(offset, 1, true);
        offset += 4;

        // Offsets for params, buttons, and bitmaps (placeholders for now)
        const paramsOffset = offset;
        offset += 12;

        // Write margins
        dataView.setUint32(offset, structure.margin.height, true);
        offset += 4;
        dataView.setUint16(offset, structure.margin.right, true);
        dataView.setUint16(offset + 2, structure.margin.left, true);
        dataView.setUint16(offset + 4, structure.margin.bottom, true);
        dataView.setUint16(offset + 6, structure.margin.top, true);
        offset += 8;

        // Write colors for active state
        dataView.setUint32(offset, parseInt(structure.active.inner.replace('#', ''), 16), true);
        dataView.setUint32(offset + 4, parseInt(structure.active.outer.replace('#', ''), 16), true);
        dataView.setUint32(offset + 8, parseInt(structure.active.frame.replace('#', ''), 16), true);
        offset += 12;

        // Write colors for inactive state
        dataView.setUint32(offset, parseInt(structure.inactive.inner.replace('#', ''), 16), true);
        dataView.setUint32(offset + 4, parseInt(structure.inactive.outer.replace('#', ''), 16), true);
        dataView.setUint32(offset + 8, parseInt(structure.inactive.frame.replace('#', ''), 16), true);
        offset += 12;

        // Write DTP
        dataView.setUint32(offset, structure.dtp.size, true);
        dataView.setUint32(offset + 4, parseInt(structure.dtp.taskbar.replace('#', ''), 16), true);
        dataView.setUint32(offset + 8, parseInt(structure.dtp.taskbar_text.replace('#', ''), 16), true);
        dataView.setUint32(offset + 12, parseInt(structure.dtp.work_dark.replace('#', ''), 16), true);
        dataView.setUint32(offset + 16, parseInt(structure.dtp.work_light.replace('#', ''), 16), true);
        dataView.setUint32(offset + 20, parseInt(structure.dtp.window_title.replace('#', ''), 16), true);
        dataView.setUint32(offset + 24, parseInt(structure.dtp.work.replace('#', ''), 16), true);
        dataView.setUint32(offset + 28, parseInt(structure.dtp.work_button.replace('#', ''), 16), true);
        dataView.setUint32(offset + 32, parseInt(structure.dtp.work_button_text.replace('#', ''), 16), true);
        dataView.setUint32(offset + 36, parseInt(structure.dtp.work_text.replace('#', ''), 16), true);
        dataView.setUint32(offset + 40, parseInt(structure.dtp.work_graph.replace('#', ''), 16), true);
        offset += 44;

        // Write buttons
        const buttonsOffset = offset;
        structure.button.forEach(button => {
            dataView.setUint32(offset, button.type, true);
            dataView.setInt16(offset + 4, button.left, true);
            dataView.setInt16(offset + 6, button.top, true);
            dataView.setUint16(offset + 8, button.width, true);
            dataView.setUint16(offset + 10, button.height, true);
            offset += 12;
        });
        dataView.setUint32(offset, 0, true); // End of button list
        offset += 4;

        // Write bitmaps
        const bitmapsOffset = offset;
        let bitmapPointer = [];
        structure.bitmap.forEach(bitmap => {
            // Write kind, type, and bitmap data offset
            dataView.setUint16(offset, bitmap.kind, true);
            dataView.setUint16(offset + 2, bitmap.type, true);
            bitmapPointer[bitmapPointer.length] = offset + 4; // Offset to bitmap data
            offset += 8;
        });
        dataView.setUint32(offset, 0, true); // End of bitmap list
        offset += 4;

        let position = 0;
        structure.bitmap.forEach(bitmap => {
            dataView.setUint32(bitmapPointer[position++], offset, true); // Set bitmap pointer data

            // Decode base64 to Uint8Array
            let imageData = this.base64ToRGBArray(bitmap.base64);

            // Write image width and height
            dataView.setUint32(offset, bitmap.width, true);
            dataView.setUint32(offset + 4, bitmap.height, true);
            offset += 8;

            // Write pixel data
            skinData.set(imageData, offset);
            offset += imageData.length;
        });

        // Update offsets in the header
        dataView.setUint32(paramsOffset, paramsOffset + 12, true);
        dataView.setUint32(paramsOffset + 4, buttonsOffset, true);
        dataView.setUint32(paramsOffset + 8, bitmapsOffset, true);

        let packData;
        try {
            const kpacker = new KPacker();
            packData = skinData.slice(0, offset); // slice data
            packData = kpacker.pack(new DataView(packData.buffer)); // compress data
        } catch (error) {
            alert(`Packing error: ${error}`);
            return;
        }

        // Create Blob and download link
        const blob = new Blob([packData], { type: 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', this.name);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    read(skinData) {
        let skinObj = {};

        let magic = skinData.getUint32(0, true);
        if (magic === this.KPACK_MAGIC) {
            try {
                const kpacker = new KPacker();
                skinData = kpacker.unpack(skinData);
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

        let createSetter = (obj) => {
            for (let prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    let _value = obj[prop];
                    if (typeof _value === 'object' && _value !== null) {
                        _value = createSetter(_value);
                    }
                    Object.defineProperty(obj, prop, {
                        set: (value) => {
                            if (typeof value === 'object' && value !== null) {
                                value = createSetter(value);
                            }
                            _value = value;
                            this.loadStructureTheme(skinObj);
                        },
                        get: () => {
                            return _value;
                        }
                    });
                }
            }
            return obj;
        }

        skinObj = createSetter(skinObj);

        this.loadStructureTheme(skinObj);
        document.querySelectorAll('.window').forEach(window => window.style.display = 'block');

        return skinObj;
    }
}
