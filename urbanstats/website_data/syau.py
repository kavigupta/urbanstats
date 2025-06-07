import re
import unicodedata
from typing import Counter, Iterator, Set

from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles


def syau_regions():
    return [x.meta["type"] for x in shapefiles.values() if x.include_in_syau]


def compute_relevant(all_names, fn, limit):
    all_chunks = [chunk for name in all_names for chunk in computeMatchChunks(name)]

    component = Counter(x for c in all_chunks for x in fn(c))
    return [
        name
        for name, count in sorted(component.items(), key=lambda x: x[1], reverse=True)
        if count > limit
    ]


def strip_suffix(name: str, suffixes: Set[str]) -> str:
    """
    Strip the suffixes from a name. This is used to normalize the names in the database.
    """
    for i, name_i in enumerate(name):
        if name_i != " ":
            continue
        suffix = name[i + 1 :]
        if suffix in suffixes:
            return name[:i]
    return name


# Copy of
# export function normalize(a: string, handlePunctuation = true): string {
#     a = a.toLowerCase()
#     a = a.normalize('NFD')
#     a = a.replace(/[\u0300-\u036f]/g, '')
#     if (handlePunctuation) {
#         a = a.replace(/[,\(\)\[\]]/g, '')
#         a = a.replaceAll('-', ' ')
#     }
#     return a
# }
def normalize(a: str, handle_punctuation: bool = True) -> str:
    a = a.lower()
    a = unicodedata.normalize("NFD", a)
    a = re.sub(r"[\u0300-\u036f]", "", a)
    if handle_punctuation:
        a = re.sub(r"[,\(\)\[\]]", "", a)
        a = a.replace("-", " ")
    return a


# Copy of
# export function onlyKeepAlpanumeric(s: string): string {
#     // remove all non-alphanumeric characters
#     return s.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
# }
def only_keep_alphanumeric(s: str) -> str:
    # remove all non-alphanumeric characters
    s = re.sub(r"[^a-zA-Z0-9 ]", "", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


# Copy of
# function computeMatchChunks(longname: string): MatchChunks {
#     longname = normalize(longname, false)
#     // split longname by comma and take the first part
#     longname = longname.split(',')[0]
#     // remove portions in parentheses and brackets
#     longname = longname.replace(/\(.*\)/g, '')
#     longname = longname.replace(/\[.*\]/g, '')
#     // split longname by -
#     const longnameParts = longname.split(/[-/]/).map(s => onlyKeepAlpanumeric(s).trim())
#     // check if query is equal to any part of the longname
#     return longnameParts
# }


def computeMatchChunks(longname: str) -> list[str]:
    longname = normalize(longname, False)
    # split longname by comma and take the first part
    longname = longname.split(",")[0]
    # remove portions in parentheses and brackets
    longname = re.sub(r"\(.*\)", "", longname)
    longname = re.sub(r"\[.*\]", "", longname)
    # split longname by -
    longname_parts = re.split(r"[-/]", longname)
    longname_parts = [s.strip() for s in longname_parts]
    longname_parts = [only_keep_alphanumeric(s) for s in longname_parts]
    return longname_parts


def get_prefixes(name: str) -> Iterator[str]:
    """
    Get the prefixes of a name. Assume it has already been normalized.
    """
    for i, name_i in enumerate(name):
        if name_i == " ":
            yield name[:i]


def get_suffixes(name: str) -> Iterator[str]:
    return (prefix[::-1] for prefix in get_prefixes(name[::-1]))


def get_suffixes_from_table(table):
    suffixes = compute_relevant(table.longname, get_suffixes, limit=10)
    return suffixes
