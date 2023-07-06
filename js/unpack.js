"use strict";

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

    const lzma_header = {
        props: (2n * 5n + 0n) * 9n + 3n,
        dict_size: 0x10000n,
        unpack_size: BigInt(kpack_header.unpack_size),
        zero: 0n,
    };

    while (lzma_header.dict_size < lzma_header.unpack_size) {
        lzma_header.dict_size <<= 1n;
    }

    const packed_data = new DataView(kpack_data.buffer, KPACK_PACKED_DATA_OFFSET);
    const lzma_data = new DataView(new ArrayBuffer(packed_data.byteLength + LZMA_HEADER_SIZE));

    lzma_data.setUint8(0, Number(lzma_header.props));
    lzma_data.setUint32(1, Number(lzma_header.dict_size), true);
    lzma_data.setBigUint64(5, lzma_header.unpack_size, true);
    lzma_data.setUint8(13, Number(lzma_header.zero));

    // Byte swap
    let tmp = packed_data.getUint32(0, true);
    packed_data.setUint32(0, tmp, false);

    const packed_data_array = new Uint8Array(packed_data.buffer, packed_data.byteOffset, packed_data.byteLength);
    lzma_data.setUint8Array(LZMA_HEADER_SIZE, packed_data_array);

    let unpack_array = LZMA.decompress(new Uint8Array(lzma_data.buffer));
    return new DataView(unpack_array.buffer);
}
