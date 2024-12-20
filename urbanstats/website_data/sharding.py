def shard_bytes(longname):
    """translation of links.ts::shardBytes"""
    bytes_ = longname.encode("utf-8")
    hash_ = 0
    for b in bytes_:
        hash_ = (hash_ * 31 + b) & 0xFFFFFFFF
    string = ""
    for _ in range(4):
        string += hex(hash_ & 0xF)[2:]
        hash_ >>= 4
    return string[0:2], string[2:3]


def create_filename(x, ext):
    x = x.replace("/", " slash ")
    a, b = shard_bytes(x)
    return f"{a}/{b}/{x}." + ext
