"""
Helper functions for handling ACS datasets where every subcategory is a separate column.
"""


def produce_subcategories(prefix, list_of_columns, *, remove_gender):
    def subcategory_dict():
        subcategory = {None: []}
        for x in list_of_columns:
            if x.endswith(":"):
                subcategory[None].append(x)
            else:
                name = x.split("!!")[-1]
                assert name not in subcategory
                subcategory[name] = [x]

        if remove_gender:
            # add Male version to each category
            for key, value in subcategory.items():
                subcategory[key] += [
                    x.replace("Female", "Male") for x in value if "Female" in x
                ]
        return subcategory

    def normalize_name(k):
        if k is None:
            return k
        return prefix + "_" + k.lower().replace(" ", "_")

    def display_dict():
        return {
            normalize_name(k): k + " %" for k in subcategory_dict() if k is not None
        }

    return subcategory_dict(), normalize_name, display_dict()
