const KPACK_PACKED_DATA_OFFSET = 12;
const LZMA_HEADER_SIZE = 14;

function unpack(kpack_data) {
    const kpack_header = {
        magic: kpack_data.getUint32(0, true),
        unpack_size: kpack_data.getUint32(4, true),
        flags: kpack_data.getUint32(8, true),
    };

    if (kpack_header.flags !== 1) {
        throw new Error("Unsupported compression type!");
    }

    let dict_size = 0x10000;
    while (dict_size < kpack_header.unpack_size) {
        dict_size <<= 1;
    }

    const lzma_header_props = (2 * 5 + 0) * 9 + 3;
    const lzma_header_unpack_size = BigInt(kpack_header.unpack_size);

    const packed_data = new DataView(kpack_data.buffer, KPACK_PACKED_DATA_OFFSET);
    const lzma_data = new Uint8Array(packed_data.byteLength + LZMA_HEADER_SIZE);

    lzma_data[0] = lzma_header_props;
    new DataView(lzma_data.buffer).setUint32(1, dict_size, true);
    new DataView(lzma_data.buffer).setBigUint64(5, lzma_header_unpack_size, true);
    lzma_data[13] = 0;

    // Byte swap
    const tmp = packed_data.getUint32(0, true);
    packed_data.setUint32(0, tmp, false);

    lzma_data.set(new Uint8Array(packed_data.buffer, packed_data.byteOffset, packed_data.byteLength), LZMA_HEADER_SIZE);

    const unpack_array = LZMA.decompress(lzma_data);
    return new DataView(new Uint8Array(unpack_array).buffer);
}
