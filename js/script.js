function htmlColor(color) {
  return "#" + color;
}

function loadStructureTheme(structure) {
  var active = document.querySelector('.window.active');
  var activeInner = active.querySelector('.inner');
  active.style.borderColor = htmlColor(structure.active.outer);
  active.style.backgroundColor = htmlColor(structure.active.frame);
  activeInner.style.borderColor = htmlColor(structure.active.inner);
  activeInner.style.backgroundColor = htmlColor(structure.dtp.work);

  var inactive = document.querySelector('.window.inactive');
  var inactiveInner = inactive.querySelector('.inner');
  inactive.style.borderColor = htmlColor(structure.inactive.outer);
  inactive.style.backgroundColor = htmlColor(structure.inactive.frame);
  inactiveInner.style.borderColor = htmlColor(structure.inactive.inner);
  inactiveInner.style.backgroundColor = htmlColor(structure.dtp.work);

  var title_list = document.querySelectorAll('.title');
  title_list.forEach(function (item) {
    item.style.color = htmlColor(structure.dtp.window_title);
  });

  structure.bitmap.forEach(function (item) {
    var element = item.type ? active : inactive;
    var panel = element.querySelector('.panel');
    var button = element.querySelector('.button');
    var left = element.querySelector('.left');
    var title = element.querySelector('.title');
    if (item.kind === 3) {
      panel.style.backgroundImage = "url(" + item.base64 + ')';
      panel.style.height = item.height + 'px';
    } else if (item.kind === 2) {
      button.style.backgroundImage = "url(" + item.base64 + ')';
      button.style.height = item.height + 'px';
      button.style.width = item.width + 'px';
      button.style.right = '-1px';
    } else if (item.kind === 1) {
      left.style.backgroundImage = "url(" + item.base64 + ')';
      left.style.height = item.height + 'px';
      left.style.width = item.width + 'px';
      left.style.left = '-1px';
      //title.style.left = (item.width-1)+'px';
    }
  });

  structure.button.forEach(function (item) {
    var element = item.type === 1 ? inactive : active;
    var minButton = element.querySelector('.min');
    var closeButton = element.querySelector('.close');

    if (item.type === 1) {
      minButton = inactive.querySelector('.min');
    } else {
      closeButton = inactive.querySelector('.close');
    }

    minButton.style.top = item.top + 'px';
    minButton.style.right = -structure.margin.left + structure.margin.right + item.left + 'px';
    minButton.style.height = item.height + 'px';
    minButton.style.width = item.width + 'px';

    closeButton.style.top = item.top + 'px';
    closeButton.style.right = -structure.margin.left + structure.margin.right + item.left + 'px';
    closeButton.style.height = item.height + 'px';
    closeButton.style.width = item.width + 'px';
  });

  var guibutton = document.querySelectorAll('.window button');
  guibutton.forEach(function (item) {
    item.style.backgroundColor = htmlColor(structure.dtp.work_button);
    item.style.color = htmlColor(structure.dtp.work_button_text);
  });

  var guitext = document.querySelectorAll('.window span');
  guitext.forEach(function (item) {
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
      } catch (e) {
        alert('Unpacking error: ' + e);
        return;
      }
    }

    magic = skinData.getUint32(0, true);
    if (magic !== SKIN_MAGIC) {
      alert('The uploaded file is not a skin!');
      return;
    }

    skinObj.version = skinData.getUint32(4, true); // second param - little endian

    let params = skinData.getUint32(8, true),
      buttons = skinData.getUint32(12, true),
      bitmaps = skinData.getUint32(16, true);

    skinObj.margin = {
      right: skinData.getUint16(params + 4, true),
      left: skinData.getUint16(params + 6, true),
      bottom: skinData.getUint16(params + 8, true),
      top: skinData.getUint16(params + 10, true)
    };

    const pad = function (num, len, rdx) {
      num = num.toString(rdx);
      while (num.length < len) num = "0" + num;
      return num;
    };

    const H6 = function (x) {
      return pad(x & 0x00FFFFFF, 6, 16);
    };

    skinObj.active = {
      inner: H6(skinData.getUint32(params + 12, true)),
      outer: H6(skinData.getUint32(params + 16, true)),
      frame: H6(skinData.getUint32(params + 20, true))
    };

    skinObj.inactive = {
      inner: H6(skinData.getUint32(params + 24, true)),
      outer: H6(skinData.getUint32(params + 28, true)),
      frame: H6(skinData.getUint32(params + 32, true))
    };

    skinObj.dtp = {
      size: skinData.getUint32(params + 36, true),
      taskbar: H6(skinData.getUint32(params + 40, true)),
      taskbar_text: H6(skinData.getUint32(params + 44, true)),
      work_dark: H6(skinData.getUint32(params + 48, true)),
      work_light: H6(skinData.getUint32(params + 52, true)),
      window_title: H6(skinData.getUint32(params + 56, true)),
      work: H6(skinData.getUint32(params + 60, true)),
      work_button: H6(skinData.getUint32(params + 64, true)),
      work_button_text: H6(skinData.getUint32(params + 68, true)),
      work_text: H6(skinData.getUint32(params + 72, true)),
      work_graph: H6(skinData.getUint32(params + 76, true))
    };

    skinObj.button = [];
    let pos = buttons;
    while (skinData.getUint32(pos, true) !== 0) {
      let btn = {
        type: skinData.getUint32(pos, true),
        left: skinData.getInt16(pos + 4, true),
        top: skinData.getInt16(pos + 6, true),
        width: skinData.getUint16(pos + 8, true),
        height: skinData.getUint16(pos + 10, true)
      };
      skinObj.button.push(btn);
      pos += 12;
    }

    skinObj.bitmap = [];
    pos = bitmaps;
    while (skinData.getUint32(pos, true) !== 0) {
      let bmp = {
        kind: skinData.getUint16(pos, true),
        type: skinData.getUint16(pos + 2, true),
        width: skinData.getUint32(skinData.getUint32(pos + 4, true), true),
        height: skinData.getUint32(skinData.getUint32(pos + 4, true) + 4, true)
      };

      let size = bmp.width * bmp.height * 3;

      let canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      let ctx = canvas.getContext("2d");
      let canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < bmp.height; y++) {
        for (let x = 0; x < bmp.width; x++) {
          let i = (x + y * bmp.width) * 3;
          let bb = skinData.getUint8(posbm + 8 + i);
          let gg = skinData.getUint8(posbm + 8 + i + 1);
          let rr = skinData.getUint8(posbm + 8 + i + 2);

          i = (x + y * canvas.width) * 4;
          canvasData.data[i] = rr;
          canvasData.data[i + 1] = gg;
          canvasData.data[i + 2] = bb;
          canvasData.data[i + 3] = 255; // Alpha channel
        }
      }

      ctx.putImageData(canvasData, 0, 0);
      bmp.base64 = canvas.toDataURL();
      skinObj.bitmap.push(bmp);
      pos += 8 + size;
    }

    loadStructureTheme(skinObj);
  };

  reader.readAsArrayBuffer(file);
}
