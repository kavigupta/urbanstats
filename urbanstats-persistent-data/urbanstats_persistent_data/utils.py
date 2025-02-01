from typing import List


def corrects_to_bytes(corrects: List[bool]) -> bytes:
    result = []
    for i in range(0, len(corrects), 8):
        byte = 0
        for j in range(8):
            if i + j < len(corrects) and corrects[i + j]:
                byte |= 1 << j
        result.append(byte)
    return bytes(result)
