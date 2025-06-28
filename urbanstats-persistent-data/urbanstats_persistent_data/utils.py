import typing as t

from pydantic import BeforeValidator


def corrects_to_bytes(corrects: t.List[bool]) -> bytes:
    result = []
    for i in range(0, len(corrects), 8):
        byte = 0
        for j in range(8):
            if i + j < len(corrects) and corrects[i + j]:
                byte |= 1 << j
        result.append(byte)
    return bytes(result)


def from_hex(value: t.Any) -> int:
    return int(value, 16)


Hexadecimal = BeforeValidator(from_hex, json_schema_input_type=str)
