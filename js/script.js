class SkinManager {
    constructor() {
        this.structureTheme = null;
        this.skin = new SkinLoader();
    }

    read() {
        const file = document.getElementById('file-input').files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            const skinBytes = e.target.result;
            const skinData = new DataView(skinBytes);
            this.skin.name = file.name;
            this.structureTheme = this.skin.read(skinData);
            this.loadProperties(this.structureTheme);
        };

        if (file) {
            reader.readAsArrayBuffer(file);
        }
    }

    save() {
        if (this.structureTheme && this.skin) {
            this.skin.save(this.structureTheme);
        }
    }

    getNestedAttribute(path, obj, set = null) {
        const attributes = path.split('.');
        const lastAttr = attributes.pop();

        const target = attributes.reduce((acc, attr) => {
            if (acc !== undefined && acc !== null) {
                return acc[attr];
            }
            return undefined;
        }, obj);

        if (target && lastAttr) {
            if (set !== null) {
                target[lastAttr] = set;
            } else {
                return target[lastAttr];
            }
        }
    }

    genFields(object, selector) {
        const fieldColor = document.querySelector('.field-color.d-none');
        const fieldInteger = document.querySelector('.field-integer.d-none');
        const container = document.querySelector(selector);

        for (let prop in object) {
            let value = object[prop];
            let field;

            if (typeof value !== 'number') {
                field = fieldColor.cloneNode(true);
                const color = field.querySelector('[type=color]');
                const text = field.querySelector('[type=text]');
                const label = field.querySelector('label');

                label.innerText = prop + ':';
                color.value = '#' + value;
                text.value = '#' + value;

                text.oninput = color.oninput = function() {
                    this.value = this.value.toUpperCase();
                    this.checkValidity() ? this.classList.remove('is-invalid') : this.classList.add('is-invalid')
                }

                color.oninput = text.oninput = text.onchange = color.onchange = function() {
                    if (this.checkValidity()) {
                        object[prop] = this.value.substring(1);
                        text.value = this.value;
                        color.value = this.value;
                    }
                }
            } else {
                field = fieldInteger.cloneNode(true);
                const text = field.querySelector('[type=number]');
                const label = field.querySelector('label');

                label.innerText = prop + ':';
                text.value = value;

                text.oninput = function() {
                    this.value = this.value.toUpperCase();
                    this.checkValidity() ? this.classList.remove('is-invalid') : this.classList.add('is-invalid')
                }

                text.oninput = text.onchange = function() {
                    if (this.checkValidity()) {
                        object[prop] = this.value;
                    }
                }
            }

            field.classList.remove('d-none');
            container.appendChild(field);
        }
    }

    loadProperties(structure) {
        document.querySelectorAll('.field-color:not(.d-none), .field-integer:not(.d-none)').forEach(element => {
            element.remove();
        });

        this.genFields(structure.params.dtp, '#dtp');
        this.genFields(structure.params.active, '#active');
        this.genFields(structure.params.inactive, '#inactive');
        this.genFields(structure.params.margin, '#margin');
        this.genFields(structure.buttons[0], '#close');
        this.genFields(structure.buttons[1], '#min');

        document.querySelector('.col-md-2').classList.add('d-md-block');
        document.querySelector('.col-12').classList.add('col-md-10');
    }
}

let skinManager = new SkinManager();

